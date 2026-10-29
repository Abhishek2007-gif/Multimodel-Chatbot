from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.security import get_session_id
from app.db.models import DocumentVersion
from app.schemas.document import (
    DocumentCreateRequest,
    DocumentEditRequest,
    DocumentEditResponse,
    DiffChunk
)
from app.services.document_service import DocumentService

router = APIRouter(prefix="/api/workspace", tags=["Document Workspace"])


@router.post("/create", response_model=DocumentEditResponse)
async def create_workspace_document(
    payload: DocumentCreateRequest,
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db)
):
    """Generate a new document draft from a user prompt."""
    try:
        content = await DocumentService.create_document(
            prompt=payload.prompt,
            context=payload.context
        )

        doc_version = DocumentVersion(
            session_id=session_id,
            title=payload.title or "Generated Document",
            original_content=content,
            revised_content=content,
            status="draft",
            version_number=1
        )
        db.add(doc_version)
        await db.commit()
        await db.refresh(doc_version)

        return DocumentEditResponse(
            document_id=doc_version.id,
            title=doc_version.title,
            original_content=content,
            revised_content=content,
            diff_chunks=[DiffChunk(type="equal", text=content)],
            version_number=1,
            status="draft"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document: {str(e)}"
        )


@router.post("/edit", response_model=DocumentEditResponse)
async def edit_workspace_document(
    payload: DocumentEditRequest,
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Apply targeted revision (summarize, rewrite, grammar, translate, custom)
    to a document while preserving unchanged text and computing diff.
    """
    try:
        revised = await DocumentService.edit_document(
            original_content=payload.original_content,
            instruction=payload.instruction,
            action_type=payload.action_type,
            target_language=payload.target_language or "English"
        )

        diff = DocumentService.compute_diff(payload.original_content, revised)
        diff_chunks = [DiffChunk(type=c["type"], text=c["text"]) for c in diff]

        doc_id = payload.document_id
        version_num = 1
        title = "Revised Document"

        if doc_id:
            stmt = select(DocumentVersion).where(
                DocumentVersion.id == doc_id,
                DocumentVersion.session_id == session_id
            )
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if existing:
                existing.revised_content = revised
                existing.version_number += 1
                existing.status = "revised"
                version_num = existing.version_number
                title = existing.title
                await db.commit()

        if not doc_id:
            new_doc = DocumentVersion(
                session_id=session_id,
                title="Revised Document",
                original_content=payload.original_content,
                revised_content=revised,
                status="revised",
                version_number=1
            )
            db.add(new_doc)
            await db.commit()
            await db.refresh(new_doc)
            doc_id = new_doc.id

        return DocumentEditResponse(
            document_id=doc_id,
            title=title,
            original_content=payload.original_content,
            revised_content=revised,
            diff_chunks=diff_chunks,
            version_number=version_num,
            status="revised"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to edit document: {str(e)}"
        )


@router.get("/{document_id}/export")
async def export_workspace_document(
    document_id: str,
    format: str = Query("docx", pattern="^(docx|pdf|md|txt)$"),
    session_id: str = Depends(get_session_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Download revised document in .docx, .pdf, .md, or .txt format.
    """
    stmt = select(DocumentVersion).where(
        DocumentVersion.id == document_id,
        DocumentVersion.session_id == session_id
    )
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    content = doc.revised_content or doc.original_content
    file_bytes, mime_type, ext = DocumentService.export_document(
        content=content,
        title=doc.title,
        format_type=format
    )

    clean_filename = f"{doc.title.replace(' ', '_').lower()}.{ext}"
    return Response(
        content=file_bytes,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{clean_filename}"'
        }
    )
