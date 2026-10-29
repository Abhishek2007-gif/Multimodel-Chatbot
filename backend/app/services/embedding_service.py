import math
from typing import List
from app.services.providers import get_embedding_provider


class EmbeddingService:
    @staticmethod
    async def get_embeddings(texts: List[str]) -> List[List[float]]:
        provider = get_embedding_provider()
        return await provider.get_embeddings(texts)

    @staticmethod
    async def get_single_embedding(text: str) -> List[float]:
        provider = get_embedding_provider()
        embeddings = await provider.get_embeddings([text])
        return embeddings[0] if embeddings else []

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two float vectors."""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm_a = math.sqrt(sum(a * a for a in vec1))
        norm_b = math.sqrt(sum(b * b for b in vec2))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return dot_product / (norm_a * norm_b)
