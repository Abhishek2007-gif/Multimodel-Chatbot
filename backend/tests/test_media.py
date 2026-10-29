import pytest


@pytest.mark.asyncio
async def test_image_generation_endpoint(client, session_headers):
    res = await client.post(
        "/api/media/generate-image",
        json={
            "prompt": "Futuristic neon cyber city at night",
            "style": "cinematic",
            "aspect_ratio": "16:9"
        },
        headers=session_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "url" in data
    assert data["media_type"] == "image"
    assert data["aspect_ratio"] == "16:9"


@pytest.mark.asyncio
async def test_video_generation_endpoint(client, session_headers):
    res = await client.post(
        "/api/media/generate-video",
        json={
            "prompt": "Majestic waterfall in a tropical rainforest",
            "duration_seconds": 5,
            "aspect_ratio": "16:9"
        },
        headers=session_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "url" in data
    assert data["media_type"] == "video"
    assert "thumbnail_url" in data


@pytest.mark.asyncio
async def test_audio_transcription_with_language(client):
    fake_audio = b"fake audio byte payload for transcription testing"
    files = {"file": ("test_voice.webm", fake_audio, "audio/webm")}
    data = {"language": "es"}
    res = await client.post("/api/audio/transcribe", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert "text" in res_data
    assert len(res_data["text"]) > 0


@pytest.mark.asyncio
async def test_chat_media_intent_detection(client, session_headers):
    res = await client.post(
        "/api/chat/message",
        json={
            "message": "Please generate an image of a cosmic nebula in deep space",
            "enable_rag": False,
            "enable_web_search": False
        },
        headers=session_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "media" in data
    assert len(data["media"]) > 0
    assert data["media"][0]["media_type"] == "image"

