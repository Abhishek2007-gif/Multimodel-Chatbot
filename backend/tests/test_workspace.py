import pytest


@pytest.mark.asyncio
async def test_workspace_create_edit_export(client, session_headers):
    # 1. Create document
    create_res = await client.post(
        "/api/workspace/create",
        json={"prompt": "Draft an introductory overview of multimodal AI systems", "title": "Multimodal AI Overview"},
        headers=session_headers
    )
    assert create_res.status_code == 200
    doc = create_res.json()
    assert doc["title"] == "Multimodal AI Overview"
    assert "revised_content" in doc
    doc_id = doc["document_id"]

    # 2. Edit document
    edit_res = await client.post(
        "/api/workspace/edit",
        json={
            "document_id": doc_id,
            "original_content": doc["revised_content"],
            "instruction": "Fix grammar and improve flow",
            "action_type": "grammar"
        },
        headers=session_headers
    )
    assert edit_res.status_code == 200
    edited = edit_res.json()
    assert "diff_chunks" in edited
    assert len(edited["diff_chunks"]) > 0

    # 3. Export to TXT
    export_txt = await client.get(f"/api/workspace/{doc_id}/export?format=txt", headers=session_headers)
    assert export_txt.status_code == 200
    assert export_txt.headers["content-type"].startswith("text/plain")

    # 4. Export to DOCX
    export_docx = await client.get(f"/api/workspace/{doc_id}/export?format=docx", headers=session_headers)
    assert export_docx.status_code == 200
    assert "wordprocessingml" in export_docx.headers["content-type"]
