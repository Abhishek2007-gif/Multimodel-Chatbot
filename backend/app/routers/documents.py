import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import get_session_id, sanitize_filename
from app.core.config import settings
from app.schemas.document import KnowledgeDocumentResponse
from app.services.document_service import DocumentService
from app.services.rag_service import RAGService

router = APIRouter(prefix="/api/documents", tags=["Knowledge Base & RAG"])


@router.post("/upload", response_model=KnowledgeDocumentResponse)
async def upload_knowledge_document(
    file: UploadFile = File(...),
    title: str = Form(None),
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and index a document (PDF, DOCX, TXT, MD) into the RAG knowledge base.
    Extracts text, computes embeddings, and stores chunks in PostgreSQL with pgvector.
    """
    # 1. Validate file extension and size
    filename = sanitize_filename(file.filename or "document.txt")
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = [".pdf", ".docx", ".doc", ".txt", ".md", ".markdown"]

    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    # Read content and enforce size limit
    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # 2. Save file locally
    session_upload_dir = os.path.join(settings.UPLOAD_DIR, session_id)
    os.makedirs(session_upload_dir, exist_ok=True)
    file_id = uuid.uuid4().hex[:10]
    saved_path = os.path.join(session_upload_dir, f"{file_id}_{filename}")

    with open(saved_path, "wb") as f:
        f.write(content)

    # 3. Extract text
    try:
        extracted_text = DocumentService.extract_text_from_file(
            file_path=saved_path,
            mime_type=file.content_type or "application/octet-stream",
            file_name=filename
        )
    except Exception as e:
        # Cleanup file if extraction fails
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Text extraction failed: {str(e)}"
        )

    # 4. Ingest and vectorize into RAG knowledge base
    try:
        doc = await RAGService.ingest_document(
            db=db,
            session_id=session_id,
            title=title or filename,
            file_name=filename,
            file_path=saved_path,
            file_size=len(content),
            extracted_text=extracted_text
        )
        return KnowledgeDocumentResponse(
            id=doc.id,
            title=doc.title,
            file_name=doc.file_name,
            file_size=doc.file_size,
            total_chunks=doc.total_chunks,
            created_at=doc.created_at
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Knowledge base indexing failed: {str(e)}"
        )


@router.get("", response_model=List[KnowledgeDocumentResponse])
async def list_knowledge_documents(
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db)
):
    """List all knowledge base documents for the current anonymous session."""
    docs = await RAGService.list_documents(db, session_id)
    return [
        KnowledgeDocumentResponse(
            id=d.id,
            title=d.title,
            file_name=d.file_name,
            file_size=d.file_size,
            total_chunks=d.total_chunks,
            created_at=d.created_at
        ) for d in docs
    ]


@router.delete("/{document_id}")
async def delete_knowledge_document(
    document_id: str,
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a knowledge base document and all its embedded vector chunks."""
    deleted = await RAGService.delete_document(db, session_id, document_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return {"status": "success", "message": "Document and all vector chunks deleted."}
