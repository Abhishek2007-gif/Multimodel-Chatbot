import os
import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Conversation, Message, Attachment
from app.services.providers import get_llm_provider, get_vision_provider
from app.services.safety_service import SafetyService
from app.services.rag_service import RAGService
from app.services.web_search_service import WebSearchService


class LLMService:
    @classmethod
    async def process_chat(
        cls,
        db: AsyncSession,
        session_id: str,
        user_message: str,
        conversation_id: Optional[str] = None,
        enable_web_search: bool = False,
        enable_rag: bool = True,
        emotional_support_mode: bool = False,
        attachment_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Orchestrates safety check, conversation persistence, vision analysis,
        RAG retrieval, web search, and LLM response generation.
        """
        # 1. Safety & Crisis Detection
        is_crisis, crisis_response = SafetyService.check_crisis(user_message)
        if is_crisis:
            # Create or get conversation
            conv = await cls._get_or_create_conversation(db, session_id, conversation_id, user_message)
            user_msg = Message(
                conversation_id=conv.id,
                role="user",
                content=user_message,
                msg_metadata={"safety_flag": "crisis_detected"}
            )
            db.add(user_msg)

            asst_msg = Message(
                conversation_id=conv.id,
                role="assistant",
                content=crisis_response,
                msg_metadata={"safety_flag": "crisis_guidance_provided", "is_crisis": True}
            )
            db.add(asst_msg)
            await db.commit()

            return {
                "conversation_id": conv.id,
                "message_id": asst_msg.id,
                "role": "assistant",
                "content": crisis_response,
                "citations": [],
                "web_sources": [],
                "audio_url": None,
                "created_at": asst_msg.created_at
            }

        # 2. Get or create persistent conversation
        conv = await cls._get_or_create_conversation(db, session_id, conversation_id, user_message)

        # 3. Handle Attachments (Images, Documents, Audio)
        vision_context = ""
        user_attachments = []
        if attachment_ids:
            stmt = select(Attachment).where(Attachment.id.in_(attachment_ids))
            res = await db.execute(stmt)
            user_attachments = list(res.scalars().all())

            for att in user_attachments:
                if att.file_type == "image" and os.path.exists(att.file_path):
                    try:
                        with open(att.file_path, "rb") as f:
                            img_bytes = f.read()
                        v_provider = get_vision_provider()
                        analysis = await v_provider.analyze_image(
                            image_bytes=img_bytes,
                            prompt=user_message,
                            mime_type=att.mime_type
                        )
                        vision_context += f"\n[Attached Image: '{att.file_name}'] Visual Analysis: {analysis}\n"
                    except Exception as e:
                        print(f"[Vision Error] {e}")

        # Save user message
        user_msg = Message(
            conversation_id=conv.id,
            role="user",
            content=user_message,
            msg_metadata={"attachment_ids": [a.id for a in user_attachments]}
        )
        db.add(user_msg)
        await db.flush()

        # Link attachments to this message
        for att in user_attachments:
            att.message_id = user_msg.id

        # 4. RAG Retrieval
        rag_context = ""
        citations = []
        if enable_rag:
            rag_context, citations = await RAGService.search_relevant_chunks(
                db=db,
                session_id=session_id,
                query=user_message
            )

        # 5. Web Search
        web_context = ""
        web_sources = []
        if enable_web_search:
            search_data = await WebSearchService.search(user_message)
            web_sources = search_data.get("results", [])
            web_context = WebSearchService.format_for_prompt(search_data)

        # 6. Automatic AI Image / Video Generation Detection
        media_items = []
        user_lower = user_message.lower()
        if re.search(r"\b(generate|create|draw|make|render)\s+(an?\s+)?image\b", user_lower):
            img_prompt = re.sub(
                r"^.*?\b(generate|create|draw|make|render)\s+(an?\s+)?image\s+(of|about|depicting)?\s*",
                "",
                user_message,
                flags=re.IGNORECASE
            ).strip()
            if not img_prompt:
                img_prompt = user_message
            try:
                from app.services.media_service import MediaService
                media_res = await MediaService.generate_image(prompt=img_prompt)
                media_items.append(media_res)
            except Exception as e:
                print(f"[Media Gen Error] {e}")
        elif re.search(r"\b(generate|create|make|render)\s+(an?\s+)?video\b", user_lower):
            vid_prompt = re.sub(
                r"^.*?\b(generate|create|make|render)\s+(an?\s+)?video\s+(of|about|depicting)?\s*",
                "",
                user_message,
                flags=re.IGNORECASE
            ).strip()
            if not vid_prompt:
                vid_prompt = user_message
            try:
                from app.services.media_service import MediaService
                media_res = await MediaService.generate_video(prompt=vid_prompt)
                media_items.append(media_res)
            except Exception as e:
                print(f"[Media Gen Error] {e}")

        # 7. Assemble System Prompt & Context
        extra_contexts = []
        if vision_context:
            extra_contexts.append(vision_context)
        if rag_context:
            extra_contexts.append(rag_context)
        if web_context:
            extra_contexts.append(web_context)

        system_prompt = SafetyService.get_system_prompt(
            emotional_mode=emotional_support_mode,
            extra_context="\n\n".join(extra_contexts) if extra_contexts else None
        )

        # 7. Fetch Recent Conversation History for Continuity
        hist_stmt = (
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(10)
        )
        hist_res = await db.execute(hist_stmt)
        recent_messages = list(reversed(hist_res.scalars().all()))

        # Format message history for LLM
        messages_payload = []
        for m in recent_messages:
            messages_payload.append({"role": m.role, "content": m.content})

        # Ensure current user message is at the end if not in history yet
        if not messages_payload or messages_payload[-1]["content"] != user_message:
            messages_payload.append({"role": "user", "content": user_message})

        # 8. Generate Completion
        llm = get_llm_provider()
        response_text = await llm.generate(
            messages=messages_payload,
            system_prompt=system_prompt,
            temperature=0.7 if not emotional_support_mode else 0.5
        )

        # 9. Persist Assistant Message
        asst_msg = Message(
            conversation_id=conv.id,
            role="assistant",
            content=response_text,
            msg_metadata={
                "citations": citations,
                "web_sources": web_sources,
                "media": media_items,
                "emotional_mode": emotional_support_mode
            }
        )
        db.add(asst_msg)
        await db.commit()

        return {
            "conversation_id": conv.id,
            "message_id": asst_msg.id,
            "role": "assistant",
            "content": response_text,
            "citations": citations,
            "web_sources": web_sources,
            "media": media_items,
            "audio_url": None,
            "created_at": asst_msg.created_at
        }

    @classmethod
    async def _get_or_create_conversation(
        cls,
        db: AsyncSession,
        session_id: str,
        conversation_id: Optional[str],
        user_message: str
    ) -> Conversation:
        if conversation_id:
            stmt = select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.session_id == session_id
            )
            res = await db.execute(stmt)
            conv = res.scalar_one_or_none()
            if conv:
                conv.updated_at = datetime.now(timezone.utc)
                return conv

        title = user_message[:36] + ("..." if len(user_message) > 36 else "")
        conv = Conversation(session_id=session_id, title=title)
        db.add(conv)
        await db.flush()
        return conv
