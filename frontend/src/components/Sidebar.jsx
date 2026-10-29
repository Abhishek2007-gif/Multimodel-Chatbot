import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  FileText, 
  Upload, 
  Sparkles, 
  Bot, 
  Layers,
  FileCode,
  ShieldCheck,
  Radio,
  Wand2
} from 'lucide-react';

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  knowledgeDocs,
  onOpenKnowledgeModal,
  onDeleteDoc,
  activeView,
  onSelectView,
  onOpenVoiceAssistant,
  onOpenMediaStudio,
}) {
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'docs'

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-badge">
          <div className="brand-icon">
            <Bot size={18} />
          </div>
          <span>SoulSync AI</span>
        </div>
      </div>

      {/* Primary Action Button */}
      <button 
        className="btn-new-chat" 
        onClick={() => {
          onSelectView('chat');
          onNewChat();
        }}
      >
        <Plus size={16} />
        <span>New Conversation</span>
      </button>

      {/* Navigation View Switcher (Chat vs Document Studio) */}
      <div style={{ padding: '0 1.25rem', marginBottom: '0.5rem', display: 'flex', gap: '0.4rem' }}>
        <button
          className={`btn-studio ${activeView === 'chat' ? 'primary' : ''}`}
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => onSelectView('chat')}
        >
          <MessageSquare size={14} />
          <span>Chat Area</span>
        </button>
        <button
          className={`btn-studio ${activeView === 'workspace' ? 'primary' : ''}`}
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => onSelectView('workspace')}
        >
          <FileCode size={14} />
          <span>Doc Studio</span>
        </button>
      </div>

      {/* Voice Assistant & Media Studio Quick Actions */}
      <div style={{ padding: '0 1.25rem', marginBottom: '0.75rem', display: 'flex', gap: '0.4rem' }}>
        <button
          className="btn-studio"
          style={{ flex: 1, justifyContent: 'center', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
          onClick={onOpenVoiceAssistant}
          title="Launch Live Voice Assistant"
        >
          <Radio size={13} className="pulse-anim" />
          <span>Voice AI</span>
        </button>
        <button
          className="btn-studio"
          style={{ flex: 1, justifyContent: 'center', borderColor: 'rgba(168, 85, 247, 0.4)', color: '#c084fc' }}
          onClick={() => onOpenMediaStudio && onOpenMediaStudio('image')}
          title="AI Image & Video Studio"
        >
          <Wand2 size={13} />
          <span>Media AI</span>
        </button>
      </div>

      {/* Tab Switcher for Sidebar Drawer */}
      <div className="sidebar-nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          <MessageSquare size={14} />
          <span>History ({conversations.length})</span>
        </button>
        <button
          className={`nav-tab ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          <Layers size={14} />
          <span>Knowledge ({knowledgeDocs.length})</span>
        </button>
      </div>

      {/* Tab Content List */}
      <div className="sidebar-list">
        {activeTab === 'chats' ? (
          conversations.length === 0 ? (
            <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No chat history yet.<br />Start a new conversation!
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`sidebar-item ${c.id === activeConversationId && activeView === 'chat' ? 'active' : ''}`}
                onClick={() => {
                  onSelectView('chat');
                  onSelectConversation(c.id);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <MessageSquare size={14} style={{ flexShrink: 0 }} />
                  <span className="sidebar-item-title" title={c.title}>
                    {c.title}
                  </span>
                </div>
                <button
                  className="item-delete-btn"
                  title="Delete conversation"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(c.id);
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )
        ) : (
          <div>
            <div style={{ padding: '0.25rem 0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                RAG Documents
              </span>
              <button
                className="btn-studio"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={onOpenKnowledgeModal}
              >
                <Upload size={12} />
                <span>Upload</span>
              </button>
            </div>

            {knowledgeDocs.length === 0 ? (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                No documents indexed.<br />Upload PDF, DOCX, TXT to enable RAG.
              </div>
            ) : (
              knowledgeDocs.map((doc) => (
                <div key={doc.id} className="sidebar-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <FileText size={14} style={{ flexShrink: 0, color: '#38bdf8' }} />
                    <div style={{ overflow: 'hidden' }}>
                      <div className="sidebar-item-title" title={doc.title}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {doc.total_chunks} chunks
                      </div>
                    </div>
                  </div>
                  <button
                    className="item-delete-btn"
                    title="Delete document and vector embeddings"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDoc(doc.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Session Isolation Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Anonymous Session</span>
        </div>
        <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>Isolated</span>
      </div>
    </aside>
  );
}
