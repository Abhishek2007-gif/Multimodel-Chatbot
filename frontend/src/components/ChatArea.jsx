import React, { useEffect, useRef } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Layers, 
  Globe, 
  Heart, 
  FileCode, 
  Trash2, 
  Bot 
} from 'lucide-react';
import MessageBubble from './MessageBubble';

export default function ChatArea({
  conversation,
  messages,
  loading,
  onSendMessage,
  emotionalMode,
  setEmotionalMode,
  onOpenKnowledgeModal,
  knowledgeDocCount,
  onClearChat,
}) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom whenever messages change or loading state toggles
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSuggestionClick = (promptText, options = {}) => {
    if (options.emotionalMode !== undefined) {
      setEmotionalMode(options.emotionalMode);
    }
    onSendMessage({
      message: promptText,
      enable_web_search: options.enableWebSearch || false,
      emotional_support_mode: options.emotionalMode || false,
    });
  };

  return (
    <div className="main-view">
      {/* Top Header */}
      <header className="top-nav">
        <div className="nav-title-group">
          <Bot size={20} color="#38bdf8" />
          <h1 className="current-title">
            {conversation ? conversation.title : 'New Conversation'}
          </h1>
        </div>

        <div className="nav-actions">
          {/* Knowledge Docs Count Badge */}
          <button
            className="btn-studio"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
            onClick={onOpenKnowledgeModal}
            title="Manage RAG Knowledge Base"
          >
            <Layers size={13} color="#38bdf8" />
            <span>{knowledgeDocCount} Docs Indexed</span>
          </button>

          {/* Supportive Mode Badge Indicator */}
          {emotionalMode && (
            <div className="badge-toggle support-active" style={{ cursor: 'default' }}>
              <Heart size={12} />
              <span>Empathetic Companion</span>
            </div>
          )}

          {/* Clear Current Chat Button */}
          {messages.length > 0 && (
            <button 
              className="icon-button" 
              onClick={onClearChat}
              title="Clear current conversation"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Message List or Welcome Hero */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-hero">
            <div className="hero-icon">
              <Sparkles size={32} />
            </div>
            <h2 className="hero-title">How can I assist you today?</h2>
            <p className="hero-subtitle">
              Your multimodal companion. Ask questions about images and documents, search the live web, 
              collaborate on document drafting, or just talk through your day.
            </p>

            <div className="prompt-suggestions">
              <div
                className="suggestion-card"
                onClick={() =>
                  handleSuggestionClick('Summarize the key takeaways from the documents in the knowledge base.', {
                    enableWebSearch: false,
                  })
                }
              >
                <div className="suggestion-header">
                  <Layers size={15} />
                  <span>RAG Knowledge Retrieval</span>
                </div>
                <div className="suggestion-desc">
                  Ask grounded questions about your uploaded PDFs, DOCX, or text files with strict citations.
                </div>
              </div>

              <div
                className="suggestion-card"
                onClick={() =>
                  handleSuggestionClick('What are the latest breakthroughs in multimodal artificial intelligence this year?', {
                    enableWebSearch: true,
                  })
                }
              >
                <div className="suggestion-header">
                  <Globe size={15} />
                  <span>Live Web Search</span>
                </div>
                <div className="suggestion-desc">
                  Fetch real-time information from the web with clickable source references.
                </div>
              </div>

              <div
                className="suggestion-card"
                onClick={() =>
                  handleSuggestionClick('I have been feeling really stressed and overwhelmed with deadlines lately.', {
                    emotionalMode: true,
                  })
                }
              >
                <div className="suggestion-header">
                  <Heart size={15} color="#ec4899" />
                  <span style={{ color: '#ec4899' }}>Empathetic Listening</span>
                </div>
                <div className="suggestion-desc">
                  A compassionate, non-judgmental space to reflect, breathe, and find small manageable steps.
                </div>
              </div>

              <div
                className="suggestion-card"
                onClick={() =>
                  handleSuggestionClick('Draft a modern, structured project proposal for an AI customer support platform.', {})
                }
              >
                <div className="suggestion-header">
                  <FileCode size={15} />
                  <span>Document Drafting</span>
                </div>
                <div className="suggestion-desc">
                  Generate comprehensive documents and inspect or edit them in the side-by-side Document Studio.
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="message-row assistant">
            <div className="avatar assistant-avatar">
              <Bot size={20} />
            </div>
            <div className="message-card" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Thinking and formulating response...
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span className="dot dot-1" />
                <span className="dot dot-2" />
                <span className="dot dot-3" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
