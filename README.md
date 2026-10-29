# 🌟 SoulSync: Multimodal AI Chatbot & Creative Studio

SoulSync is a full-stack, beginner-friendly personal AI assistant that supports **multimodal perception (text, vision, audio/voice)**, **interactive voice assistant mode with continuous conversational loop**, **generative AI image and video studio**, **multilingual understanding in 50+ languages**, **grounded Retrieval-Augmented Generation (RAG) using PostgreSQL and `pgvector`**, **live web search with verified citations**, **interactive document creation and diff editing**, and an **emotionally supportive companion persona equipped with crisis safeguards**.

---

## 🚀 Key Features

### 1. Interactive Voice Assistant & Multimodal Perception
- **Continuous Voice AI**: Futuristic glowing holographic orb with real-time audio visualizer. Features hands-free continuous conversation (listening -> thinking -> speaking -> auto-listen).
- **Multilingual Speech Recognition & Synthesis**: Whisper STT and natural TTS supporting 50+ global languages with browser speech fallbacks.
- **Vision Understanding**: Upload images (`PNG`, `JPEG`, `WEBP`) and ask questions about diagrams, charts, or scenes.

### 2. AI Media Studio (Image & Video Generation)
- **AI Image Generator**: Generate 8K photorealistic, cinematic, anime, or 3D images powered by DALL-E 3 and Pollinations Flux. Includes aspect ratio control (1:1, 16:9, 9:16) and direct chat insertion.
- **AI Video Generator**: Generate cinematic motion sequences and animations with embedded HTML5 video playback, loop controls, and MP4 downloads.
- **Smart Media Intent Detection**: Naturally ask *"Generate an image of a cybernetic tiger"* or *"Create a video of ocean waves"* directly in the chat to generate media inline!

### 3. Deep Multilingual Understanding (50+ Languages)
- Native conversational fluency across English, Spanish, French, German, Italian, Portuguese, Russian, Mandarin Chinese, Japanese, Korean, Arabic, Hindi, Bengali, Tamil, Telugu, Marathi, Turkish, Vietnamese, Dutch, and more.
- Automatic language detection with culturally accurate tone, idioms, and nuances.
- Multi-language Document Studio translations covering 20+ world languages.

### 2. Grounded RAG Knowledge Base
- Ingest documents in **PDF, DOCX, TXT, and Markdown** format.
- Automatic text extraction, recursive chunking with configurable overlap, and dense vector embeddings.
- Stored and indexed in **PostgreSQL with `pgvector`** using cosine distance operators (`<=>`).
- Grounded answers strictly cite document filenames and chunk indexes.

### 3. Live Web Search with Clickable Citations
- Integrated web search (Tavily API with automatic DuckDuckGo fallback when no API key is set).
- Synthesizes live search snippets into clear answers while clearly separating sourced facts from model commentary.
- Displays clickable source badges with external links.

### 4. Interactive Document Studio (Diff, Edit & Download)
- **Draft from Prompt**: Generate comprehensive documents from prompts.
- **Document Editing Actions**: One-click actions to *Summarize*, *Fix Grammar & Tone*, *Rewrite*, or *Translate* into multiple languages.
- **Visual Diff Viewer**: Side-by-side or unified view highlighting inserted text in green and deleted text in red, preserving unedited text.
- **Multi-Format Export**: Download revised documents directly as **DOCX**, **PDF**, **Markdown**, or **TXT**.

### 5. Emotionally Supportive Persona & Crisis Safeguards
- Empathetic conversational tone that validates emotions before offering practical, manageable coping steps.
- Prohibits clinical diagnoses or claiming to be a therapist.
- **Crisis & Self-Harm Detection**: Immediate trigger of emergency support hotlines (988 Suicide & Crisis Lifeline, Crisis Text Line 741741, findahelpline.com) rather than casual conversation.

### 6. Anonymous Session Isolation
- No user authentication or complex registration required.
- Client generates an anonymous session identifier (`X-Session-ID`), and database queries strictly partition all conversations, messages, and vector embeddings by session.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    subgraph Frontend["React 18 + Vite (localhost:5173)"]
        UI["Chat & Voice Interface"]
        DocStudio["Document Workspace & Diff Viewer"]
        SessionMgr["Anonymous Session Manager (X-Session-ID)"]
    end

    subgraph Backend["FastAPI Server (localhost:8000)"]
        Router["REST Routers (Chat, Documents, Workspace, Search, Audio)"]
        
        subgraph Services["Modular Services"]
            LLMService["LLM Orchestration & Prompt Builder"]
            RAGService["RAG Pipeline (Chunker + Embeddings)"]
            SearchService["Web Search (Tavily + DuckDuckGo)"]
            DocService["Document Extraction, Diff & Exporters"]
            AudioService["Whisper STT & TTS"]
            SafetyService["Support Persona & Crisis Guardrails"]
        end

        subgraph Providers["Provider Abstraction Layer"]
            OpenAI["OpenAI Provider (GPT-4o-mini, Whisper, TTS)"]
            Mock["Offline Mock Provider (Zero-Cost Dev & Testing)"]
        end
    end

    subgraph Storage["Database & File System"]
        DB[("PostgreSQL + pgvector (or SQLite Fallback)")]
        Disk["Local Media Uploads (uploads/)"]
    end

    UI --> Router
    DocStudio --> Router
    SessionMgr -.->|Injects X-Session-ID| Router
    Router --> Services
    Services --> Providers
    Services --> DB
    Services --> Disk
```

---

## 📦 Directory Structure

```plaintext
mlchatbot/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings & environment variables
│   │   │   └── security.py         # Session isolation & filename sanitization
│   │   ├── db/
│   │   │   ├── session.py          # Async SQLAlchemy engine & sessionmaker
│   │   │   └── models.py           # Database models (Conversations, Chunks, etc.)
│   │   ├── schemas/                # Pydantic request & response schemas
│   │   ├── routers/                # FastAPI endpoint routers
│   │   ├── services/
│   │   │   ├── providers/          # Model provider abstraction (OpenAI & Mock)
│   │   │   ├── llm_service.py      # LLM orchestration & prompt building
│   │   │   ├── rag_service.py      # Chunking, embeddings & vector retrieval
│   │   │   ├── web_search_service.py # Tavily & DuckDuckGo search
│   │   │   ├── document_service.py # Text parsing, diff engine & file exporters
│   │   │   ├── audio_service.py    # Speech-to-text & speech synthesis
│   │   │   └── safety_service.py   # Empathetic prompt & crisis guardrails
│   │   └── main.py                 # FastAPI application entrypoint
│   ├── alembic/                    # Database migrations
│   ├── tests/                      # Pytest automated test suite (mocked external calls)
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI components (Sidebar, Composer, etc.)
│   │   ├── services/api.js         # Centralized API service layer
│   │   ├── styles/index.css        # Futuristic dark glassmorphic design system
│   │   ├── App.jsx                 # Top-level view switcher
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── sample_data/                    # Sample non-sensitive documents for instant RAG testing
│   ├── company_handbook.txt
│   ├── ai_research_notes.md
│   └── sample_policy.docx
└── README.md
```

---

## 🛠️ Step-by-Step Installation & Setup

### Prerequisites
- **Python**: Version 3.10+ (tested on Python 3.14)
- **Node.js**: Version 20+ (with `npm`)
- **Docker** *(Optional, for PostgreSQL + pgvector)*

---

### Step 1: PostgreSQL with pgvector (Optional for Production)

To run a local PostgreSQL instance with the `pgvector` extension enabled using Docker:

```bash
docker run -d \
  --name soul_pgvector \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=multimodal_chat \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

> **Note for Local Beginners:** The project is pre-configured with an **out-of-the-box SQLite fallback** (`sqlite+aiosqlite:///./multimodal_chat.db`). You can run the entire backend immediately without installing Docker or PostgreSQL! When you are ready for PostgreSQL, simply set `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/multimodal_chat` in `backend/.env`.

---

### Step 2: Backend Setup

1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Activate the virtual environment:
   - **Windows:**
     ```powershell
     .\venv\Scripts\activate
     ```
   - **macOS / Linux:**
     ```bash
     source venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables in `backend/.env`:
   ```env
   # Out-of-the-box zero-cost configuration:
   LLM_PROVIDER=mock
   DATABASE_URL=sqlite+aiosqlite:///./multimodal_chat.db

   # When ready to use live OpenAI models:
   # LLM_PROVIDER=openai
   # OPENAI_API_KEY=sk-...
   ```

5. Run database migrations:
   ```bash
   alembic upgrade head
   ```

6. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Interactive Swagger API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)  
   Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Step 3: Frontend Setup

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit:
   👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🧪 Running Automated Tests

SoulSync includes a complete automated test suite covering all critical workflows: health check, chat persistence, session isolation, RAG chunking and vector retrieval, web search, document editing and downloads, and crisis safety guardrails.

The tests run with **zero paid external API calls** using mocked providers and in-memory test databases:

```bash
cd backend
.\venv\Scripts\pytest -v
```

Expected result:
```
tests/test_chat.py::test_chat_message_and_isolation PASSED               [  9%]
tests/test_health.py::test_health_endpoint PASSED                        [ 18%]
tests/test_media.py::test_image_generation_endpoint PASSED               [ 27%]
tests/test_media.py::test_video_generation_endpoint PASSED               [ 36%]
tests/test_media.py::test_audio_transcription_with_language PASSED       [ 45%]
tests/test_media.py::test_chat_media_intent_detection PASSED             [ 54%]
tests/test_rag.py::test_rag_upload_and_retrieval PASSED                  [ 63%]
tests/test_safety.py::test_crisis_guardrail PASSED                       [ 72%]
tests/test_safety.py::test_emotional_support_mode PASSED                 [ 81%]
tests/test_search.py::test_search_endpoint PASSED                        [ 90%]
tests/test_workspace.py::test_workspace_create_edit_export PASSED        [100%]
============================= 11 passed in 27.90s =============================
```

---

## 📄 Testing Sample Documents (RAG)

Sample documents are included in the `sample_data/` directory:
- `sample_data/company_handbook.txt`: Employee benefits, remote work stipend, vacation days.
- `sample_data/ai_research_notes.md`: Multimodal perception and vector architectures.
- `sample_data/sample_policy.docx`: Word document on data governance and AI ethics.

**To test RAG:**
1. Click **Knowledge** in the sidebar, then click **Upload**.
2. Select any file from `sample_data/` and click **Index Document**.
3. In chat, ask: *"How many vacation days do engineers get according to the company handbook?"*
4. Notice the grounded answer and the collapsible **Document Citations** badge referencing the exact file and chunk index!

---

## 🔒 Security & Privacy

- **API Secrets**: All API keys remain strictly in `backend/.env` and are never exposed to the frontend.
- **Anonymous Sessions**: Sessions are completely isolated via `X-Session-ID`. Distinct browser instances cannot query or view other users' conversations or uploaded documents.
- **Safety Guardrails**: Prompt injection defenses and crisis keyword detection guarantee that sensitive crises are answered with immediate human helpline resources.
#   M u l t i m o d e l - C h a t b o t  
 # Multimodel-Chatbot
