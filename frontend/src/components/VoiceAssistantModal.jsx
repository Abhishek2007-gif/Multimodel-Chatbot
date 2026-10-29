import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Globe, 
  Sparkles, 
  Radio, 
  Layers,
  Check,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Español (Spanish)' },
  { code: 'fr-FR', name: 'Français (French)' },
  { code: 'de-DE', name: 'Deutsch (German)' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)' },
  { code: 'zh-CN', name: '中文 (Mandarin)' },
  { code: 'ja-JP', name: '日本語 (Japanese)' },
  { code: 'ar-SA', name: 'العربية (Arabic)' },
  { code: 'pt-BR', name: 'Português (Portuguese)' },
  { code: 'ru-RU', name: 'Русский (Russian)' },
  { code: 'it-IT', name: 'Italiano (Italian)' },
];

export default function VoiceAssistantModal({
  isOpen,
  onClose,
  activeConversationId,
  onSendMessage,
  onNotify
}) {
  // Assistant states: 'idle' | 'listening' | 'thinking' | 'speaking'
  const [assistantState, setAssistantState] = useState('idle');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastAssistantSpeech, setLastAssistantSpeech] = useState('');
  const [autoListen, setAutoListen] = useState(true);
  const [volumeLevel, setVolumeLevel] = useState(25);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentAudioRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis || null);

  useEffect(() => {
    if (!isOpen) {
      stopAllAudio();
      return;
    }
    // Auto-start listening on open
    startListening();

    return () => {
      stopAllAudio();
    };
  }, [isOpen]);

  // Handle continuous visualizer animation
  useEffect(() => {
    let animId;
    if (assistantState === 'listening' || assistantState === 'speaking') {
      const interval = setInterval(() => {
        setVolumeLevel(Math.floor(Math.random() * 65) + 35);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setVolumeLevel(20);
    }
  }, [assistantState]);

  const stopAllAudio = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause(); } catch (e) {}
    }
    if (synthRef.current) {
      try { synthRef.current.cancel(); } catch (e) {}
    }
    setAssistantState('idle');
  };

  // 1. Start listening via Web Speech Recognition or MediaRecorder fallback
  const startListening = () => {
    stopAllAudio();
    setLiveTranscript('');
    setAssistantState('listening');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      if (selectedLanguage !== 'auto') {
        recognition.lang = selectedLanguage;
      }

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          fallbackMediaRecorder();
        } else {
          setAssistantState('idle');
        }
      };

      recognition.onend = () => {
        if (liveTranscript.trim()) {
          handleVoiceQuery(liveTranscript.trim());
        } else {
          setAssistantState('idle');
        }
      };

      try {
        recognition.start();
      } catch (e) {
        fallbackMediaRecorder();
      }
    } else {
      fallbackMediaRecorder();
    }
  };

  // Fallback MediaRecorder for devices without Web Speech Recognition
  const fallbackMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          setAssistantState('thinking');
          const langCode = selectedLanguage === 'auto' ? null : selectedLanguage.split('-')[0];
          const res = await api.transcribeAudio(audioBlob, 'voice_query.webm', langCode);
          if (res.text && res.text.trim()) {
            setLiveTranscript(res.text.trim());
            handleVoiceQuery(res.text.trim());
          } else {
            setAssistantState('idle');
          }
        } catch (err) {
          if (onNotify) onNotify(`Voice transcription error: ${err.message}`, 'error');
          setAssistantState('idle');
        }
      };

      recorder.start();
      setAssistantState('listening');
    } catch (err) {
      if (onNotify) onNotify('Microphone access denied or not available.', 'error');
      setAssistantState('idle');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // 2. Process query with LLM and speak response
  const handleVoiceQuery = async (queryText) => {
    if (!queryText.trim()) {
      setAssistantState('idle');
      return;
    }

    setAssistantState('thinking');

    try {
      const res = await api.sendMessage({
        conversation_id: activeConversationId,
        message: queryText,
        enable_web_search: false,
        enable_rag: true,
        emotional_support_mode: true, // warm empathetic voice mode
      });

      const replyText = res.content || "I didn't quite catch that, could you repeat?";
      setLastAssistantSpeech(replyText);
      speakResponse(replyText);
    } catch (err) {
      if (onNotify) onNotify(`Voice assistant error: ${err.message}`, 'error');
      setAssistantState('idle');
    }
  };

  // 3. Text to Speech Playback
  const speakResponse = async (text) => {
    setAssistantState('speaking');

    // Clean markdown symbols for natural speech synthesis
    const cleanSpeech = text
      .replace(/[#*`_~\[\]]/g, '')
      .replace(/\n+/g, ' ')
      .slice(0, 700);

    // Try backend TTS API first
    try {
      const audioBlob = await api.synthesizeSpeech(cleanSpeech, 'alloy');
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        handleSpeechFinished();
      };
      audio.onerror = () => {
        playBrowserSynthesis(cleanSpeech);
      };
      audio.play();
    } catch (e) {
      playBrowserSynthesis(cleanSpeech);
    }
  };

  const playBrowserSynthesis = (cleanText) => {
    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (selectedLanguage !== 'auto') {
        utterance.lang = selectedLanguage;
      }
      utterance.onend = () => {
        handleSpeechFinished();
      };
      utterance.onerror = () => {
        handleSpeechFinished();
      };
      synthRef.current.speak(utterance);
    } else {
      handleSpeechFinished();
    }
  };

  const handleSpeechFinished = () => {
    if (autoListen) {
      // Small natural pause before listening again
      setTimeout(() => {
        if (isOpen) startListening();
      }, 750);
    } else {
      setAssistantState('idle');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1200, backdropFilter: 'blur(16px)', background: 'rgba(5, 7, 15, 0.92)' }}>
      <div 
        style={{
          width: '90%',
          maxWidth: '560px',
          background: 'radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.12), rgba(15, 23, 42, 0.95))',
          border: '1px solid var(--border-bright)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.2)',
          padding: '2rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Header Controls */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Radio size={18} color="#38bdf8" className={assistantState !== 'idle' ? 'pulse-anim' : ''} />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc', letterSpacing: '0.5px' }}>
              SoulSync Voice
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Language Selector */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  if (onNotify) onNotify(`Voice language set to: ${e.target.options[e.target.selectedIndex].text}`);
                }}
                className="btn-studio"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </div>

            <button 
              className="icon-button" 
              onClick={() => {
                stopAllAudio();
                onClose();
              }}
              title="Close Voice Assistant"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Central Futuristic Holographic Orb */}
        <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1rem 0' }}>
          {/* Outer glow rings */}
          <div 
            style={{
              position: 'absolute',
              width: `${160 + volumeLevel}px`,
              height: `${160 + volumeLevel}px`,
              borderRadius: '50%',
              background: assistantState === 'listening' 
                ? 'radial-gradient(circle, rgba(56, 189, 248, 0.4), transparent 70%)' 
                : assistantState === 'speaking'
                ? 'radial-gradient(circle, rgba(168, 85, 247, 0.4), transparent 70%)'
                : 'radial-gradient(circle, rgba(99, 102, 241, 0.2), transparent 70%)',
              transition: 'all 0.15s ease-out',
              pointerEvents: 'none'
            }}
          />

          {/* Main animated orb */}
          <div
            onClick={() => {
              if (assistantState === 'listening') stopListening();
              else if (assistantState === 'speaking') stopAllAudio();
              else startListening();
            }}
            style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: assistantState === 'listening'
                ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
                : assistantState === 'thinking'
                ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                : assistantState === 'speaking'
                ? 'linear-gradient(135deg, #a855f7, #ec4899)'
                : 'linear-gradient(135deg, #1e293b, #334155)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 35px rgba(56, 189, 248, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: assistantState === 'listening' ? `scale(${1 + volumeLevel / 350})` : 'scale(1)',
              border: '2px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            {assistantState === 'listening' ? (
              <Mic size={38} color="#fff" />
            ) : assistantState === 'thinking' ? (
              <Sparkles size={38} color="#fff" className="pulse-anim" />
            ) : assistantState === 'speaking' ? (
              <Volume2 size={38} color="#fff" />
            ) : (
              <MicOff size={38} color="#94a3b8" />
            )}
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', marginTop: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {assistantState}
            </span>
          </div>
        </div>

        {/* State Indicator Text */}
        <div style={{ textAlign: 'center', margin: '0.8rem 0 1.25rem', minHeight: '48px', maxWidth: '90%' }}>
          {assistantState === 'listening' && (
            <div style={{ color: '#38bdf8', fontSize: '0.95rem', fontWeight: 600 }}>
              {liveTranscript ? `"${liveTranscript}"` : 'Listening... Speak naturally in any language'}
            </div>
          )}
          {assistantState === 'thinking' && (
            <div style={{ color: '#a855f7', fontSize: '0.95rem', fontWeight: 600 }}>
              SoulSync is thinking...
            </div>
          )}
          {assistantState === 'speaking' && (
            <div style={{ color: '#f472b6', fontSize: '0.88rem', lineHeight: '1.4', maxHeight: '60px', overflowY: 'auto' }}>
              "{lastAssistantSpeech}"
            </div>
          )}
          {assistantState === 'idle' && (
            <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              Tap the orb to start speaking
            </div>
          )}
        </div>

        {/* Bottom Interactive Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', justifyContent: 'center' }}>
          <button
            className={`btn-studio ${autoListen ? 'primary' : ''}`}
            onClick={() => setAutoListen(!autoListen)}
            title="Automatically listen for next question after speaking"
          >
            <Radio size={14} />
            <span>Continuous Mode: {autoListen ? 'ON' : 'OFF'}</span>
          </button>

          {assistantState !== 'idle' && (
            <button
              className="btn-studio"
              style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', color: '#f87171' }}
              onClick={stopAllAudio}
            >
              <VolumeX size={14} />
              <span>Interrupt / Stop</span>
            </button>
          )}

          {assistantState === 'idle' && (
            <button className="btn-studio primary" onClick={startListening}>
              <Mic size={14} />
              <span>Start Speaking</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

