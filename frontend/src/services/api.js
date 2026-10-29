// Centralized API Service for Multimodal Chatbot MVP

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Retrieve or generate anonymous session ID stored in browser localStorage
export function getSessionId() {
  let sessionId = localStorage.getItem('multimodal_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('multimodal_session_id', sessionId);
  }
  return sessionId;
}

// Common headers helper
function getHeaders(extraHeaders = {}) {
  return {
    'X-Session-ID': getSessionId(),
    ...extraHeaders,
  };
}

export const api = {
  // --- Health ---
  async checkHealth() {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // --- Conversations ---
  async getConversations() {
    const res = await fetch(`${API_BASE_URL}/api/conversations`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load conversations');
    return res.json();
  },

  async getConversation(id) {
    const res = await fetch(`${API_BASE_URL}/api/conversations/${id}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load conversation details');
    return res.json();
  },

  async deleteConversation(id) {
    const res = await fetch(`${API_BASE_URL}/api/conversations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  },

  // --- Chat Message ---
  async sendMessage({
    message,
    conversation_id = null,
    enable_web_search = false,
    enable_rag = true,
    emotional_support_mode = false,
    attachment_ids = [],
  }) {
    const res = await fetch(`${API_BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        conversation_id,
        message,
        enable_web_search,
        enable_rag,
        emotional_support_mode,
        attachment_ids,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Chat error' }));
      throw new Error(err.detail || 'Failed to send message');
    }
    return res.json();
  },

  // --- File Uploads (Attachments) ---
  async uploadAttachment(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/api/uploads`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  // --- Knowledge Base (RAG) ---
  async getKnowledgeDocuments() {
    const res = await fetch(`${API_BASE_URL}/api/documents`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load knowledge documents');
    return res.json();
  },

  async uploadKnowledgeDocument(file, title = '') {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Indexing failed' }));
      throw new Error(err.detail || 'Failed to index document');
    }
    return res.json();
  },

  async deleteKnowledgeDocument(id) {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  // --- Web Search ---
  async searchWeb(query, max_results = 5) {
    const res = await fetch(`${API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ query, max_results }),
    });
    if (!res.ok) throw new Error('Web search failed');
    return res.json();
  },

  // --- Audio ---
  async transcribeAudio(audioBlob, filename = 'recording.webm', language = null) {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    if (language) {
      formData.append('language', language);
    }

    const res = await fetch(`${API_BASE_URL}/api/audio/transcribe`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error('Transcription failed');
    return res.json();
  },

  async synthesizeSpeech(text, voice = 'alloy') {
    const res = await fetch(`${API_BASE_URL}/api/audio/synthesize`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text, voice }),
    });
    if (!res.ok) throw new Error('Speech synthesis failed');
    return res.blob();
  },

  // --- Media Generation (Image & Video) ---
  async generateImage({ prompt, style = 'cinematic', aspect_ratio = '1:1' }) {
    const res = await fetch(`${API_BASE_URL}/api/media/generate-image`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prompt, style, aspect_ratio }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Image generation failed' }));
      throw new Error(err.detail || 'Image generation failed');
    }
    return res.json();
  },

  async generateVideo({ prompt, duration_seconds = 5, aspect_ratio = '16:9' }) {
    const res = await fetch(`${API_BASE_URL}/api/media/generate-video`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prompt, duration_seconds, aspect_ratio }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Video generation failed' }));
      throw new Error(err.detail || 'Video generation failed');
    }
    return res.json();
  },

  // --- Document Workspace ---
  async createWorkspaceDocument(prompt, title = 'Generated Document', context = '') {
    const res = await fetch(`${API_BASE_URL}/api/workspace/create`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prompt, title, context }),
    });
    if (!res.ok) throw new Error('Failed to create document');
    return res.json();
  },

  async editWorkspaceDocument({
    document_id = null,
    original_content,
    instruction,
    action_type = 'custom',
    target_language = 'English',
  }) {
    const res = await fetch(`${API_BASE_URL}/api/workspace/edit`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        document_id,
        original_content,
        instruction,
        action_type,
        target_language,
      }),
    });
    if (!res.ok) throw new Error('Failed to edit document');
    return res.json();
  },

  getExportDocumentUrl(documentId, format = 'docx') {
    return `${API_BASE_URL}/api/workspace/${documentId}/export?format=${format}`;
  },
};
