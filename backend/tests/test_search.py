import pytest


@pytest.mark.asyncio
async def test_search_endpoint(client, session_headers):
    res = await client.post(
        "/api/search",
        json={"query": "artificial intelligence developments", "max_results": 3},
        headers=session_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert "provider" in data
