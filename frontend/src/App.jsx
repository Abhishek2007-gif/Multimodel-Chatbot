import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import Composer from './components/Composer';
import DocumentWorkspace from './components/DocumentWorkspace';
import KnowledgeModal from './components/KnowledgeModal';
import VoiceAssistantModal from './components/VoiceAssistantModal';
import MediaStudioModal from './components/MediaStudioModal';
import { api } from './services/api';

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState([]);
  const [activeView, setActiveView] = useState('chat'); // 'chat' or 'workspace'

  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [emotionalMode, setEmotionalMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isMediaStudioOpen, setIsMediaStudioOpen] = useState(false);
  const [mediaStudioTab, setMediaStudioTab] = useState('image');
  const [toast, setToast] = useState(null); // { message: '', type: 'info' | 'error' }

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load initial conversations and knowledge base documents
  useEffect(() => {
    loadConversations();
    loadKnowledgeDocs();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const loadKnowledgeDocs = async () => {
    try {
      const data = await api.getKnowledgeDocuments();
      setKnowledgeDocs(data);
    } catch (err) {
      console.error('Error loading knowledge documents:', err);
    }
  };

  const handleSelectConversation = async (convId) => {
    setActiveConversationId(convId);
    try {
      setLoading(true);
      const detail = await api.getConversation(convId);
      setCurrentConversation(detail);
      setMessages(detail.messages || []);
    } catch (err) {
      showToast(`Error loading chat: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setCurrentConversation(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await api.deleteConversation(convId);
      showToast('Conversation deleted.');
      if (activeConversationId === convId) {
        handleNewChat();
      }
      loadConversations();
    } catch (err) {
      showToast(`Delete error: ${err.message}`, 'error');
    }
  };

  const handleSendMessage = async ({
    message,
    attachment_ids = [],
    enable_web_search = false,
    emotional_support_mode = false,
  }) => {
    if (!message.trim() && attachment_ids.length === 0) return;

    // Optimistic user message insertion
    const tempUserMsg = {
      id: 'temp_' + Date.now(),
      role: 'user',
      content: message,
      attachments: [],
      msg_metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.sendMessage({
        conversation_id: activeConversationId,
        message,
        attachment_ids,
        enable_web_search,
        enable_rag: true,
        emotional_support_mode,
      });

      // Update active conversation
      if (!activeConversationId) {
        setActiveConversationId(res.conversation_id);
      }

      // Append assistant message
      const asstMsg = {
        id: res.message_id,
        role: 'assistant',
        content: res.content,
        msg_metadata: {
          citations: res.citations,
          web_sources: res.web_sources,
          media: res.media || [],
        },
        attachments: [],
        created_at: res.created_at,
      };

      setMessages((prev) => [...prev, asstMsg]);
      loadConversations();
    } catch (err) {
      showToast(err.message, 'error');
      // Append error message from assistant
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: `⚠️ **Processing Error:** ${err.message}\n\nPlease verify your configuration or check API keys in \`backend/.env\`.`,
          msg_metadata: {},
          attachments: [],
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInsertMedia = ({ message, media_item }) => {
    const userMsg = {
      id: 'media_req_' + Date.now(),
      role: 'user',
      content: message,
      attachments: [],
      msg_metadata: {},
      created_at: new Date().toISOString(),
    };
    const asstMsg = {
      id: 'media_res_' + Date.now(),
      role: 'assistant',
      content: `Here is the ${media_item.media_type} generated for: "${media_item.prompt}"`,
      msg_metadata: {
        media: [media_item],
      },
      attachments: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg, asstMsg]);
    setActiveView('chat');
  };

  return (
    <div className="app-container">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1.5rem',
            zIndex: 1000,
            padding: '0.65rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(99, 102, 241, 0.95)',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.85rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Navigation Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        knowledgeDocs={knowledgeDocs}
        onOpenKnowledgeModal={() => setIsKnowledgeModalOpen(true)}
        onDeleteDoc={async (docId) => {
          await api.deleteKnowledgeDocument(docId);
          showToast('Document deleted.');
          loadKnowledgeDocs();
        }}
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
        onOpenMediaStudio={(tab = 'image') => {
          setMediaStudioTab(tab);
          setIsMediaStudioOpen(true);
        }}
      />

      {/* Main View Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {activeView === 'chat' ? (
          <>
            <ChatArea
              conversation={currentConversation}
              messages={messages}
              loading={loading}
              onSendMessage={handleSendMessage}
              emotionalMode={emotionalMode}
              setEmotionalMode={setEmotionalMode}
              onOpenKnowledgeModal={() => setIsKnowledgeModalOpen(true)}
              knowledgeDocCount={knowledgeDocs.length}
              onClearChat={handleNewChat}
            />
            <Composer
              onSendMessage={handleSendMessage}
              loading={loading}
              enableWebSearch={enableWebSearch}
              setEnableWebSearch={setEnableWebSearch}
              emotionalMode={emotionalMode}
              setEmotionalMode={setEmotionalMode}
              onNotify={showToast}
              onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
              onOpenMediaStudio={(tab = 'image') => {
                setMediaStudioTab(tab);
                setIsMediaStudioOpen(true);
              }}
            />
          </>
        ) : (
          <DocumentWorkspace onNotify={showToast} />
        )}
      </div>

      {/* Knowledge Base Modal */}
      <KnowledgeModal
        isOpen={isKnowledgeModalOpen}
        onClose={() => setIsKnowledgeModalOpen(false)}
        knowledgeDocs={knowledgeDocs}
        onReloadDocs={loadKnowledgeDocs}
        onNotify={showToast}
      />

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        activeConversationId={activeConversationId}
        onSendMessage={handleSendMessage}
        onNotify={showToast}
      />

      {/* Media Studio Modal (Image & Video Generator) */}
      <MediaStudioModal
        isOpen={isMediaStudioOpen}
        onClose={() => setIsMediaStudioOpen(false)}
        initialTab={mediaStudioTab}
        onSendToChat={handleInsertMedia}
        onNotify={showToast}
      />
    </div>
  );
}
