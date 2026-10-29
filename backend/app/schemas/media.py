from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=2000, description="Description of the image to generate")
    style: Optional[str] = Field("cinematic", description="Style preset e.g. cinematic, anime, photorealistic, 3d, fantasy")
    aspect_ratio: Optional[str] = Field("1:1", description="Aspect ratio: 1:1, 16:9, 9:16, 4:3")


class VideoGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=2000, description="Description of the video/motion to generate")
    duration_seconds: Optional[int] = Field(5, ge=1, le=30, description="Length of the video clip in seconds")
    aspect_ratio: Optional[str] = Field("16:9", description="Aspect ratio: 16:9, 9:16, 1:1")


class MediaItemResponse(BaseModel):
    id: str
    url: str
    remote_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    prompt: str
    style: Optional[str] = None
    aspect_ratio: Optional[str] = None
    duration_seconds: Optional[int] = None
    media_type: str  # "image" or "video"
    provider: str
    created_at: str

