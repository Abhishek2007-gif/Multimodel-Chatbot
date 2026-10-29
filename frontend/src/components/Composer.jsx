import React, { useState, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  Globe, 
  Heart, 
  X, 
  Loader2,
  Image as ImageIcon,
  FileText,
  Radio,
  Wand2,
  Film
} from 'lucide-react';
import { api } from '../services/api';

export default function Composer({
  onSendMessage,
  loading,
  enableWebSearch,
  setEnableWebSearch,
  emotionalMode,
  setEmotionalMode,
  onNotify,
  onOpenVoiceAssistant,
  onOpenMediaStudio
}) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if ((!text.trim() && attachments.length === 0) || loading) return;

    onSendMessage({
      message: text.trim() || 'Attached files for review.',
      attachment_ids: attachments.map((a) => a.id),
      enable_web_search: enableWebSearch,
      emotional_support_mode: emotionalMode,
    });

    setText('');
    setAttachments([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      try {
        const uploaded = await api.uploadAttachment(file);
        setAttachments((prev) => [...prev, uploaded]);
        if (onNotify) onNotify(`Attached: ${file.name}`);
      } catch (err) {
        if (onNotify) onNotify(`Upload error: ${err.message}`, 'error');
      }
    }
    e.target.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Voice Recording with MediaRecorder
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
      setRecordingSeconds(0);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((track) => track.stop());

          try {
            if (onNotify) onNotify('Transcribing voice note...');
            const result = await api.transcribeAudio(audioBlob);
            if (result && result.text) {
              setText((prev) => (prev ? prev + ' ' + result.text : result.text));
              if (onNotify) onNotify('Voice transcribed successfully!');
            }
          } catch (err) {
            if (onNotify) onNotify(`Voice transcription error: ${err.message}`, 'error');
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setRecordingSeconds(0);
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        if (onNotify) onNotify('Microphone access denied or unavailable.', 'error');
      }
    }
  };

  return (
    <div className="composer-wrapper">
      <div className="composer-card">
        {/* Render Attached Files Preview Chips */}
        {attachments.length > 0 && (
          <div className="attachments-preview">
            {attachments.map((att) => (
              <span key={att.id} className="attachment-chip">
                {att.file_type === 'image' ? <ImageIcon size={13} /> : <FileText size={13} />}
                <span>{att.file_name}</span>
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => removeAttachment(att.id)}
                  title="Remove attachment"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Text Input Area */}
        <textarea
          className="composer-textarea"
          rows={2}
          placeholder={
            isRecording
              ? `Listening... (${recordingSeconds}s) Speak into your microphone...`
              : emotionalMode
              ? "Share what's on your mind... (Empathetic Companion active)"
              : 'Ask a question, upload a document, or share an image...'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        {/* Composer Actions Bar */}
        <div className="composer-actions">
          <div className="composer-left-actions">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              multiple
              onChange={handleFileSelect}
              accept="image/*,audio/*,.pdf,.docx,.txt,.md"
            />
            <button
              type="button"
              className="icon-button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              title="Attach image, audio, or document"
              disabled={loading}
            >
              <Paperclip size={18} />
            </button>

            {/* Audio Voice Input Button */}
            <button
              type="button"
              className={`icon-button ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
              title={isRecording ? 'Stop recording voice' : 'Record voice note'}
              disabled={loading}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Voice Assistant Launch Button */}
            {onOpenVoiceAssistant && (
              <button
                type="button"
                className="badge-toggle"
                style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8', color: '#38bdf8' }}
                onClick={onOpenVoiceAssistant}
                title="Launch Live Voice Assistant"
                disabled={loading}
              >
                <Radio size={13} className="pulse-anim" />
                <span>Voice AI</span>
              </button>
            )}

            {/* AI Image Generation Button */}
            {onOpenMediaStudio && (
              <button
                type="button"
                className="badge-toggle"
                style={{ background: 'rgba(168, 85, 247, 0.15)', borderColor: '#a855f7', color: '#c084fc' }}
                onClick={() => onOpenMediaStudio('image')}
                title="Generate AI Image"
                disabled={loading}
              >
                <Wand2 size={13} />
                <span>Image</span>
              </button>
            )}

            {/* AI Video Generation Button */}
            {onOpenMediaStudio && (
              <button
                type="button"
                className="badge-toggle"
                style={{ background: 'rgba(236, 72, 153, 0.15)', borderColor: '#ec4899', color: '#f472b6' }}
                onClick={() => onOpenMediaStudio('video')}
                title="Generate AI Video"
                disabled={loading}
              >
                <Film size={13} />
                <span>Video</span>
              </button>
            )}

            {/* Web Search Toggle */}
            <button
              type="button"
              className={`badge-toggle ${enableWebSearch ? 'search-active' : ''}`}
              onClick={() => setEnableWebSearch(!enableWebSearch)}
              title="Search the live web for verified facts"
            >
              <Globe size={13} />
              <span>Web Search</span>
            </button>

            {/* Emotional Support Mode Toggle */}
            <button
              type="button"
              className={`badge-toggle ${emotionalMode ? 'support-active' : ''}`}
              onClick={() => setEmotionalMode(!emotionalMode)}
              title="Activate empathetic, non-judgmental companion persona"
            >
              <Heart size={13} />
              <span>Supportive</span>
            </button>
          </div>

          {/* Send Button */}
          <button
            type="button"
            className="btn-send"
            onClick={handleSubmit}
            disabled={loading || (!text.trim() && attachments.length === 0)}
            title="Send message (Enter)"
          >
            {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
