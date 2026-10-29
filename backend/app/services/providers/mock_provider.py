import re
import math
import hashlib
from typing import List, Dict, Any, Optional
from app.services.providers.base import (
    BaseLLMProvider,
    BaseVisionProvider,
    BaseEmbeddingProvider,
    BaseAudioProvider
)


class MockLLMProvider(BaseLLMProvider):
    async def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        last_user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_msg = m.get("content", "")
                break

        sys_str = (system_prompt or "").lower()

        # 1. Check if RAG context was provided
        if "context from uploaded documents:" in sys_str:
            return (
                f"Based on your uploaded documents, here is the verified information regarding '{last_user_msg}':\n\n"
                "• The documents specify key operational guidelines, procedures, and core definitions.\n"
                "• All details are grounded directly in your uploaded knowledge base files.\n\n"
                "*(Sourced directly from your uploaded Knowledge Base documents)*"
            )

        # 2. Check if Web Search context was provided
        if "live web search results:" in sys_str:
            return (
                f"According to verified live web sources regarding '{last_user_msg}':\n\n"
                "Recent findings confirm significant developments and current information.\n\n"
                "*(Referenced from the verified web sources shown above)*"
            )

        # 3. Check for emotional support mode
        if any(w in sys_str for w in ["warm", "empathetic", "compassionate", "supportive", "active listening"]):
            return (
                "I hear how much is weighing on your mind right now, and it is completely understandable to feel this way. "
                "Please remember that you don't have to carry everything all at once. "
                "Would it help to take one slow, deep breath together, or would you like to talk through one small, manageable step?"
            )

        # 4. Check for document creation
        if "document writer" in sys_str:
            title_text = last_user_msg[:45].strip()
            return (
                f"# {title_text}\n\n"
                "## 1. Executive Summary\n"
                f"This document provides a comprehensive overview and strategic blueprint for {last_user_msg}.\n\n"
                "## 2. Core Objectives & Requirements\n"
                "- **High Reliability**: Ensure deterministic processing and modular architecture.\n"
                "- **User-Centric Design**: Deliver an intuitive, accessible experience across devices.\n"
                "- **Verification & Safety**: Maintain active guardrails and thorough testing coverage.\n\n"
                "## 3. Implementation Roadmap\n"
                "1. **Phase 1**: Initial architecture, data modeling, and prototype verification.\n"
                "2. **Phase 2**: Production rollout, monitoring, and automated feedback loops.\n"
            )

        # 5. Check for document editing
        if "document editor" in sys_str:
            return (
                f"{last_user_msg}\n\n"
                "[Revised: Phrasing, tone, and grammar have been polished for clarity while preserving all original sections.]"
            )

        return (
            f"Hello! I am your AI assistant. I received your message: \"{last_user_msg}\". "
            "How can I help you further with documents, search, or anything else today?"
        )


class MockVisionProvider(BaseVisionProvider):
    async def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
        mime_type: str = "image/jpeg"
    ) -> str:
        return (
            f"[Visual Analysis] The uploaded image ({len(image_bytes)} bytes, {mime_type}) "
            f"appears to be a structured graphic/document. In response to '{prompt}': "
            "The image exhibits clear visual components, labeled sections, and distinct formatting."
        )


class MockEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        results = []
        for text in texts:
            vec = [0.0] * self.dimension

            # Baseline hash component
            h = hashlib.sha256(text.encode("utf-8")).digest()
            for i in range(min(64, self.dimension)):
                vec[i] += (h[i % len(h)] / 255.0) * 0.1

            # Word-level token frequency embedding so matching words yield high cosine similarity
            words = re.findall(r"\w+", text.lower())
            for word in words:
                word_hash = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
                idx = word_hash % self.dimension
                vec[idx] += 1.0

            # Normalize to unit length
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            vec = [x / norm for x in vec]
            results.append(vec)
        return results


class MockAudioProvider(BaseAudioProvider):
    async def transcribe(self, audio_bytes: bytes, filename: str, language: Optional[str] = None) -> str:
        lang_str = f" [Language: {language}]" if language else ""
        return f"This is a simulated transcription of {filename} ({len(audio_bytes)} bytes){lang_str}."

    async def synthesize(self, text: str, voice: str = "alloy") -> bytes:
        # Minimal valid silent MP3 frame bytes
        return b"\xff\xfb\x90d\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00" * 20
