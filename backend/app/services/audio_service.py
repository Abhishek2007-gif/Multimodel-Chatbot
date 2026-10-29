from typing import Optional
from app.services.providers import get_audio_provider


class AudioService:
    @staticmethod
    async def transcribe(audio_bytes: bytes, filename: str, language: Optional[str] = None) -> str:
        """Transcribe uploaded audio file using the configured audio provider with optional language code."""
        provider = get_audio_provider()
        return await provider.transcribe(audio_bytes, filename, language=language)

    @staticmethod
    async def synthesize(text: str, voice: str = "alloy") -> bytes:
        """Convert text into audio bytes (MP3) using the configured audio provider."""
        provider = get_audio_provider()
        return await provider.synthesize(text, voice)
