import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bot, 
  User, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  FileText, 
  Globe, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Image as ImageIcon,
  Sparkles,
  Download,
  Film,
  Play
} from 'lucide-react';
import { api } from '../services/api';

export default function MessageBubble({ message }) {
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState(null);
  const [showCitations, setShowCitations] = useState(false);

  const metadata = message.msg_metadata || {};
  const citations = metadata.citations || [];
  const webSources = metadata.web_sources || [];
  const mediaItems = metadata.media || message.media || [];
  const attachments = message.attachments || [];

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeech = async () => {
    if (isPlayingAudio && audioElement) {
      audioElement.pause();
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);
      // Try backend TTS API first
      const audioBlob = await api.synthesizeSpeech(message.content.slice(0, 800));
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      setAudioElement(audio);

      audio.onended = () => {
        setIsPlayingAudio(false);
      };
      audio.onerror = () => {
        // Fallback to browser Web Speech API
        playBrowserTTS();
      };
      audio.play();
    } catch (e) {
      // Fallback to browser SpeechSynthesis
      playBrowserTTS();
    }
  };

  const playBrowserTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className={`message-row ${message.role}`}>
      <div className={`avatar ${isAssistant ? 'assistant-avatar' : 'user-avatar'}`}>
        {isAssistant ? <Bot size={20} /> : <User size={20} />}
      </div>

      <div className="message-card">
        {/* Render Attachments if any */}
        {attachments.length > 0 && (
          <div style={{ marginBottom: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {attachments.map((att) => (
              <div
                key={att.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.65rem',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                }}
              >
                {att.file_type === 'image' ? <ImageIcon size={14} color="#38bdf8" /> : <FileText size={14} color="#a5b4fc" />}
                <span>{att.file_name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message Content Markdown */}
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* AI Generated Media (Images & Videos) */}
        {mediaItems.length > 0 && (
          <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {mediaItems.map((media, mIdx) => (
              <div
                key={mIdx}
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>
                    {media.media_type === 'video' ? <Film size={15} /> : <ImageIcon size={15} />}
                    <span>{media.media_type === 'video' ? 'AI Generated Video' : 'AI Generated Image'}</span>
                  </div>
                  <a
                    href={media.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="msg-btn"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    title="Download media"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </a>
                </div>

                {media.media_type === 'video' ? (
                  <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#000' }}>
                    <video
                      controls
                      loop
                      poster={media.thumbnail_url}
                      src={media.url}
                      style={{ width: '100%', maxHeight: '420px', display: 'block', borderRadius: 'var(--radius-sm)' }}
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                ) : (
                  <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <img
                      src={media.url}
                      alt={media.prompt || 'Generated AI Image'}
                      style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', display: 'block', borderRadius: 'var(--radius-sm)' }}
                      loading="lazy"
                    />
                  </div>
                )}

                {media.prompt && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Prompt: "{media.prompt}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Citations & RAG Sources */}
        {citations.length > 0 && (
          <div className="sources-section">
            <div 
              className="sources-header" 
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setShowCitations(!showCitations)}
            >
              <FileText size={13} color="#38bdf8" />
              <span>Document Citations ({citations.length})</span>
              {showCitations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </div>

            {showCitations && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.3rem' }}>
                {citations.map((c, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '0.5rem 0.75rem', 
                      background: 'rgba(0, 0, 0, 0.25)', 
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.78rem'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '0.2rem' }}>
                      {c.file_name} (Chunk #{c.chunk_index + 1} • Relevance: {Math.round(c.score * 100)}%)
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                      "{c.snippet}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Web Sources */}
        {webSources.length > 0 && (
          <div className="sources-section">
            <div className="sources-header">
              <Globe size={13} color="#0284c7" />
              <span>Web Sources</span>
            </div>
            <div className="sources-grid">
              {webSources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-badge"
                  title={source.snippet}
                >
                  <ExternalLink size={11} />
                  <span>{source.title.length > 32 ? source.title.substring(0, 32) + '...' : source.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Message Action Bar (Copy, TTS) */}
        {isAssistant && (
          <div className="message-actions">
            <button className="msg-btn" onClick={handleToggleSpeech} title="Read response aloud">
              {isPlayingAudio ? <VolumeX size={13} /> : <Volume2 size={13} />}
              <span>{isPlayingAudio ? 'Stop' : 'Listen'}</span>
            </button>
            <button className="msg-btn" onClick={handleCopy} title="Copy text to clipboard">
              {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
