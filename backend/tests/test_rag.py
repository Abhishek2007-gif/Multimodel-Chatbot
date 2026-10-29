import io
import pytest


@pytest.mark.asyncio
async def test_rag_upload_and_retrieval(client, session_headers):
    # 1. Upload a text document
    doc_content = (
        "Antigravity Corporation Guidelines:\n"
        "All engineers are eligible for 25 vacation days per year.\n"
        "Flexible working hours start between 8:00 AM and 10:30 AM.\n"
        "Remote work stipends of $1,000 are provided upon onboarding.\n"
    )
    files = {"file": ("guidelines.txt", io.BytesIO(doc_content.encode("utf-8")), "text/plain")}
    data = {"title": "Company Guidelines"}

    upload_res = await client.post("/api/documents/upload", files=files, data=data, headers=session_headers)
    assert upload_res.status_code == 200
    doc_data = upload_res.json()
    assert doc_data["title"] == "Company Guidelines"
    assert doc_data["total_chunks"] >= 1
    doc_id = doc_data["id"]

    # 2. List documents
    list_res = await client.get("/api/documents", headers=session_headers)
    assert list_res.status_code == 200
    docs = list_res.json()
    assert any(d["id"] == doc_id for d in docs)

    # 3. Query chat with RAG enabled
    chat_res = await client.post(
        "/api/chat/message",
        json={"message": "How many vacation days do engineers get?", "enable_rag": True, "enable_web_search": False},
        headers=session_headers
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "citations" in chat_data

    # 4. Delete document
    del_res = await client.delete(f"/api/documents/{doc_id}", headers=session_headers)
    assert del_res.status_code == 200
