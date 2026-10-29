import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client, session_headers):
    response = await client.get("/api/health", headers=session_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "database" in data
    assert "llm_provider" in data
