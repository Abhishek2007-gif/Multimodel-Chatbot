import base64
import io
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.services.providers.base import (
    BaseLLMProvider,
    BaseVisionProvider,
    BaseEmbeddingProvider,
    BaseAudioProvider
)
from app.core.config import settings


def get_openai_client() -> AsyncOpenAI:
    if not settings.OPENAI_API_KEY or "your_openai_api_key" in settings.OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY is not configured in .env. "
            "Please provide a valid OpenAI API key or set LLM_PROVIDER=mock in backend/.env for offline testing."
        )
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class OpenAILLMProvider(BaseLLMProvider):
    def __init__(self, model: str = None):
        self.model = model or settings.OPENAI_MODEL

    async def generate(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        client = get_openai_client()
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        response = await client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""


class OpenAIVisionProvider(BaseVisionProvider):
    def __init__(self, model: str = None):
        self.model = model or settings.OPENAI_VISION_MODEL

    async def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
        mime_type: str = "image/jpeg"
    ) -> str:
        client = get_openai_client()
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{base64_image}"

        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt or "Describe this image in detail and answer any user questions."},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            max_tokens=1000,
        )
        return response.choices[0].message.content or ""


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self, model: str = None, dimension: int = None):
        self.model = model or settings.OPENAI_EMBEDDING_MODEL
        self.dimension = dimension or settings.EMBEDDING_DIMENSION

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        client = get_openai_client()
        clean_texts = [t.replace("\n", " ").strip() or " " for t in texts]
        response = await client.embeddings.create(
            model=self.model,
            input=clean_texts,
            dimensions=self.dimension
        )
        return [item.embedding for item in response.data]


class OpenAIAudioProvider(BaseAudioProvider):
    def __init__(self, stt_model: str = None, tts_model: str = None):
        self.stt_model = stt_model or settings.OPENAI_STT_MODEL
        self.tts_model = tts_model or settings.OPENAI_TTS_MODEL

    async def transcribe(self, audio_bytes: bytes, filename: str, language: Optional[str] = None) -> str:
        client = get_openai_client()
        # Wrap bytes in BytesIO with name attribute for multipart
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename or "audio.webm"

        kwargs = {
            "model": self.stt_model,
            "file": audio_file,
        }
        if language:
            kwargs["language"] = language

        transcription = await client.audio.transcriptions.create(**kwargs)
        return transcription.text

    async def synthesize(self, text: str, voice: str = "alloy") -> bytes:
        client = get_openai_client()
        response = await client.audio.speech.create(
            model=self.tts_model,
            voice=voice or settings.OPENAI_TTS_VOICE,
            input=text
        )
        return response.read()
