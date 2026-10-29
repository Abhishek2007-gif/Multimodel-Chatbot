from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint to verify API and database connectivity."""
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "database": db_status,
        "database_url_type": "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql",
        "llm_provider": settings.LLM_PROVIDER if settings.OPENAI_API_KEY else "mock",
        "search_provider": settings.SEARCH_PROVIDER,
        "embedding_model": settings.OPENAI_EMBEDDING_MODEL,
        "env": settings.APP_ENV
    }
