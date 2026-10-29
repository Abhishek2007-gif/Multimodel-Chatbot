import re
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.models import KnowledgeDocument, DocumentChunk
from app.services.embedding_service import EmbeddingService
from app.core.config import settings


class RAGService:
    @staticmethod
    def split_text(text: str, chunk_size: int = None, chunk_overlap: int = None) -> List[str]:
        """
        Split text into overlapping chunks using recursive boundary delimiters.
        """
        chunk_size = chunk_size or settings.RAG_CHUNK_SIZE
        chunk_overlap = chunk_overlap or settings.RAG_CHUNK_OVERLAP

        if not text or not text.strip():
            return []

        # Clean text
        text = re.sub(r"\r\n", "\n", text).strip()

        # Split initially by double newlines, then single newlines, then spaces
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = []
        current_len = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            para_len = len(para)
            if current_len + para_len + 2 <= chunk_size:
                current_chunk.append(para)
                current_len += para_len + 2
            else:
                if current_chunk:
                    joined = "\n\n".join(current_chunk)
                    chunks.append(joined)
                    # Handle overlap by keeping the last portion
                    overlap_chars = joined[-chunk_overlap:] if chunk_overlap > 0 else ""
                    current_chunk = [overlap_chars, para] if overlap_chars else [para]
                    current_len = sum(len(p) for p in current_chunk) + 2
                else:
                    # Paragraph itself is larger than chunk_size, split by words
                    words = para.split(" ")
                    temp_chunk = []
                    temp_len = 0
                    for word in words:
                        if temp_len + len(word) + 1 <= chunk_size:
                            temp_chunk.append(word)
                            temp_len += len(word) + 1
                        else:
                            if temp_chunk:
                                chunks.append(" ".join(temp_chunk))
                            temp_chunk = [word]
                            temp_len = len(word) + 1
                    if temp_chunk:
                        current_chunk = [" ".join(temp_chunk)]
                        current_len = temp_len

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        # Filter out empty or tiny chunks
        return [c.strip() for c in chunks if len(c.strip()) > 15]

    @classmethod
    async def ingest_document(
        cls,
        db: AsyncSession,
        session_id: str,
        title: str,
        file_name: str,
        file_path: str,
        file_size: int,
        extracted_text: str
    ) -> KnowledgeDocument:
        """
        Extract chunks, generate embeddings, and persist document and chunks.
        """
        chunks_text = cls.split_text(extracted_text)
        if not chunks_text:
            chunks_text = [extracted_text[:settings.RAG_CHUNK_SIZE] or "Empty document"]

        # Generate embeddings in batch
        embeddings = await EmbeddingService.get_embeddings(chunks_text)

        # Create KnowledgeDocument
        doc = KnowledgeDocument(
            session_id=session_id,
            title=title or file_name,
            file_name=file_name,
            file_path=file_path,
            file_size=file_size,
            total_chunks=len(chunks_text)
        )
        db.add(doc)
        await db.flush()  # populate doc.id

        # Insert chunks
        for idx, (chunk_text, embedding) in enumerate(zip(chunks_text, embeddings)):
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=idx,
                chunk_text=chunk_text,
                embedding=embedding,
                chunk_metadata={"file_name": file_name, "chunk_index": idx}
            )
            db.add(chunk)

        await db.commit()
        await db.refresh(doc)
        return doc

    @classmethod
    async def search_relevant_chunks(
        cls,
        db: AsyncSession,
        session_id: str,
        query: str,
        top_k: int = None,
        min_similarity: float = None
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Retrieve the top-K chunks for the given query vector.
        Returns (context_text_for_prompt, citations_list).
        """
        top_k = top_k or settings.RAG_TOP_K
        min_similarity = min_similarity if min_similarity is not None else settings.RAG_MIN_SIMILARITY

        if not query or not query.strip():
            return "", []

        query_embedding = await EmbeddingService.get_single_embedding(query)
        if not query_embedding:
            return "", []

        # Check database dialect
        bind = db.get_bind()
        is_postgres = bind.dialect.name == "postgresql"

        scored_chunks: List[Tuple[DocumentChunk, float, str]] = []

        if is_postgres:
            # Native pgvector cosine distance query
            try:
                stmt = (
                    select(
                        DocumentChunk,
                        KnowledgeDocument.file_name,
                        (1.0 - DocumentChunk.embedding.cosine_distance(query_embedding)).label("similarity")
                    )
                    .join(KnowledgeDocument, KnowledgeDocument.id == DocumentChunk.document_id)
                    .where(KnowledgeDocument.session_id == session_id)
                    .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
                    .limit(top_k)
                )
                res = await db.execute(stmt)
                for chunk, fname, sim in res.all():
                    if sim >= min_similarity:
                        scored_chunks.append((chunk, float(sim), fname))
            except Exception as e:
                print(f"[RAG] PostgreSQL pgvector query error: {e}. Falling back to memory calculation.")
                is_postgres = False

        if not is_postgres:
            # Fallback for SQLite / tests: fetch chunks for this session and compute cosine similarity in memory
            stmt = (
                select(DocumentChunk, KnowledgeDocument.file_name)
                .join(KnowledgeDocument, KnowledgeDocument.id == DocumentChunk.document_id)
                .where(KnowledgeDocument.session_id == session_id)
            )
            res = await db.execute(stmt)
            for chunk, fname in res.all():
                chunk_vec = chunk.embedding
                if chunk_vec:
                    sim = EmbeddingService.cosine_similarity(query_embedding, chunk_vec)
                    if sim >= min_similarity:
                        scored_chunks.append((chunk, sim, fname))
            # Sort by similarity descending
            scored_chunks.sort(key=lambda x: x[1], reverse=True)
            scored_chunks = scored_chunks[:top_k]

        if not scored_chunks:
            return "", []

        context_lines = [
            "Context from uploaded documents:",
            "Use ONLY the following document excerpts to answer the question. Cite the specific file and chunk for facts.",
            "If the context below does not contain sufficient information, state clearly: 'The uploaded documents do not contain enough information to answer this question.'\n"
        ]
        citations = []

        for idx, (chunk, score, fname) in enumerate(scored_chunks, 1):
            context_lines.append(f"[{idx}] File: '{fname}', Chunk {chunk.chunk_index} (Relevance: {score:.2f}):\n{chunk.chunk_text}\n")
            citations.append({
                "source_id": chunk.id,
                "file_name": fname,
                "chunk_index": chunk.chunk_index,
                "score": round(score, 3),
                "snippet": chunk.chunk_text[:200] + ("..." if len(chunk.chunk_text) > 200 else "")
            })

        return "\n".join(context_lines), citations

    @classmethod
    async def list_documents(cls, db: AsyncSession, session_id: str) -> List[KnowledgeDocument]:
        stmt = (
            select(KnowledgeDocument)
            .where(KnowledgeDocument.session_id == session_id)
            .order_by(KnowledgeDocument.created_at.desc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @classmethod
    async def delete_document(cls, db: AsyncSession, session_id: str, document_id: str) -> bool:
        stmt = (
            select(KnowledgeDocument)
            .where(
                KnowledgeDocument.id == document_id,
                KnowledgeDocument.session_id == session_id
            )
        )
        res = await db.execute(stmt)
        doc = res.scalar_one_or_none()
        if not doc:
            return False

        await db.delete(doc)
        await db.commit()
        return True
