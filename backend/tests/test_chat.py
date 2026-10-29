import pytest


@pytest.mark.asyncio
async def test_chat_message_and_isolation(client):
    session_a = {"X-Session-ID": "session_alpha_1"}
    session_b = {"X-Session-ID": "session_beta_2"}

    # 1. Session A sends a message
    res = await client.post(
        "/api/chat/message",
        json={"message": "Hello from session Alpha", "enable_web_search": False, "enable_rag": False},
        headers=session_a
    )
    assert res.status_code == 200
    data = res.json()
    assert "conversation_id" in data
    assert data["role"] == "assistant"
    conv_id_a = data["conversation_id"]

    # 2. Session A lists conversations and finds its conversation
    list_res_a = await client.get("/api/conversations", headers=session_a)
    assert list_res_a.status_code == 200
    convs_a = list_res_a.json()
    assert any(c["id"] == conv_id_a for c in convs_a)

    # 3. Session B lists conversations and CANNOT see Session A's conversation
    list_res_b = await client.get("/api/conversations", headers=session_b)
    assert list_res_b.status_code == 200
    convs_b = list_res_b.json()
    assert not any(c["id"] == conv_id_a for c in convs_b)

    # 4. Session B cannot fetch Session A's conversation details
    detail_res_b = await client.get(f"/api/conversations/{conv_id_a}", headers=session_b)
    assert detail_res_b.status_code == 404
