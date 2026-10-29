import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Image as ImageIcon, 
  Film, 
  Download, 
  Share2, 
  Loader2, 
  Send, 
  Wand2, 
  Layers, 
  Play, 
  Maximize2 
} from 'lucide-react';
import { api } from '../services/api';

const IMAGE_STYLES = [
  'Cinematic',
  'Photorealistic',
  'Anime & Manga',
  'Cyberpunk Neon',
  '3D Pixar Style',
  'Fantasy Oil Painting',
  'Dark Synthwave',
  'Minimalist Vector'
];

const SAMPLE_IMAGE_PROMPTS = [
  'Futuristic neon cyber city street at night with glowing holographic signs',
  'Majestic crystal dragon perched on a mountain peak surrounded by aurora borealis',
  'Cozy warm coffee shop in Tokyo during autumn evening rain, cinematic lighting',
  'Cute robot botanist tending to glowing bioluminescent alien flowers in space'
];

const SAMPLE_VIDEO_PROMPTS = [
  'Cinematic drone fly-through of a tropical emerald waterfall in dense misty jungle',
  'Starfield hyperspace warp speed jump into a colorful glowing cosmic nebula',
  'Slow-motion ocean waves crashing against black volcanic rock at golden hour sunset',
  'Futuristic autonomous supercar driving through neon-lit rainy Tokyo highway'
];

export default function MediaStudioModal({
  isOpen,
  onClose,
  initialTab = 'image',
  onSendToChat,
  onNotify
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'image' | 'video' | 'gallery'
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Cinematic');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [durationSec, setDurationSec] = useState(5);
  const [loading, setLoading] = useState(false);

  const [currentMedia, setCurrentMedia] = useState(null);
  const [gallery, setGallery] = useState([]);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    try {
      setLoading(true);
      if (activeTab === 'image') {
        if (onNotify) onNotify('Generating high-resolution AI image...');
        const res = await api.generateImage({
          prompt: prompt.trim(),
          style: selectedStyle,
          aspect_ratio: aspectRatio,
        });
        setCurrentMedia(res);
        setGallery((prev) => [res, ...prev]);
        if (onNotify) onNotify('Image generated successfully!');
      } else {
        if (onNotify) onNotify('Generating AI video motion clip...');
        const res = await api.generateVideo({
          prompt: prompt.trim(),
          duration_seconds: durationSec,
          aspect_ratio: aspectRatio,
        });
        setCurrentMedia(res);
        setGallery((prev) => [res, ...prev]);
        if (onNotify) onNotify('Video generated successfully!');
      }
    } catch (err) {
      if (onNotify) onNotify(`Generation error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResultToChat = () => {
    if (!currentMedia) return;
    if (onSendToChat) {
      onSendToChat({
        message: `I generated this ${currentMedia.media_type}: "${currentMedia.prompt}"`,
        media_item: currentMedia,
      });
      if (onNotify) onNotify('Inserted into chat conversation!');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wand2 size={20} color="#a855f7" />
            <h3 className="modal-title">AI Media Generation Studio</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            className={`btn-studio ${activeTab === 'image' ? 'primary' : ''}`}
            onClick={() => { setActiveTab('image'); setCurrentMedia(null); }}
          >
            <ImageIcon size={14} />
            <span>Image Studio</span>
          </button>
          <button
            className={`btn-studio ${activeTab === 'video' ? 'primary' : ''}`}
            onClick={() => { setActiveTab('video'); setCurrentMedia(null); }}
          >
            <Film size={14} />
            <span>Video Studio</span>
          </button>
          <button
            className={`btn-studio ${activeTab === 'gallery' ? 'primary' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            <Layers size={14} />
            <span>Gallery ({gallery.length})</span>
          </button>
        </div>

        {/* Studio Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {activeTab !== 'gallery' ? (
            <div>
              {/* Prompt Input Form */}
              <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    {activeTab === 'image' ? 'Image Prompt' : 'Video Scene Description'}
                  </label>
                  <textarea
                    className="pane-textarea"
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem',
                      height: '90px',
                      color: 'var(--text-main)',
                      fontSize: '0.92rem',
                    }}
                    placeholder={
                      activeTab === 'image'
                        ? "Describe the visual in vivid detail (e.g. 'A futuristic cyberpunk laboratory with neon blue holographic displays')..."
                        : "Describe the motion sequence (e.g. 'Drone camera flying over an emerald ocean at golden sunset')..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>

                {/* Prompt Inspiration Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', alignSelf: 'center', marginRight: '0.25rem' }}>
                    Try:
                  </span>
                  {(activeTab === 'image' ? SAMPLE_IMAGE_PROMPTS : SAMPLE_VIDEO_PROMPTS).map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      className="btn-studio"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)' }}
                      onClick={() => setPrompt(sample)}
                    >
                      {sample.length > 40 ? sample.substring(0, 40) + '...' : sample}
                    </button>
                  ))}
                </div>

                {/* Customization Options Bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                  {activeTab === 'image' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.3rem' }}>
                        Style Preset
                      </label>
                      <select
                        className="btn-studio"
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                      >
                        {IMAGE_STYLES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.3rem' }}>
                      Aspect Ratio
                    </label>
                    <select
                      className="btn-studio"
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                    >
                      <option value="16:9">16:9 Landscape</option>
                      <option value="1:1">1:1 Square</option>
                      <option value="9:16">9:16 Portrait / Reel</option>
                      <option value="4:3">4:3 Standard</option>
                    </select>
                  </div>

                  {activeTab === 'video' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.3rem' }}>
                        Duration
                      </label>
                      <select
                        className="btn-studio"
                        value={durationSec}
                        onChange={(e) => setDurationSec(Number(e.target.value))}
                      >
                        <option value={3}>3 Seconds</option>
                        <option value={5}>5 Seconds</option>
                        <option value={8}>8 Seconds</option>
                      </select>
                    </div>
                  )}

                  <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
                    <button
                      type="submit"
                      className="btn-studio primary"
                      disabled={loading || !prompt.trim()}
                      style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
                    >
                      {loading ? <Loader2 size={16} className="spinner" /> : <Sparkles size={16} />}
                      <span>{loading ? 'Creating...' : activeTab === 'image' ? 'Generate Image' : 'Generate Video'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Media Output Result Display */}
              {currentMedia && (
                <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-bright)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#38bdf8' }}>
                      Generated Output ({currentMedia.media_type.toUpperCase()})
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a
                        href={currentMedia.url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="btn-studio"
                        style={{ fontSize: '0.78rem' }}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>
                      {onSendToChat && (
                        <button
                          type="button"
                          className="btn-studio primary"
                          style={{ fontSize: '0.78rem' }}
                          onClick={handleSendResultToChat}
                        >
                          <Send size={13} />
                          <span>Insert in Chat</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {currentMedia.media_type === 'video' ? (
                    <video
                      controls
                      autoPlay
                      loop
                      poster={currentMedia.thumbnail_url}
                      src={currentMedia.url}
                      style={{ width: '100%', maxHeight: '420px', borderRadius: 'var(--radius-sm)', background: '#000' }}
                    />
                  ) : (
                    <img
                      src={currentMedia.url}
                      alt={currentMedia.prompt}
                      style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Gallery Tab */
            <div>
              {gallery.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '3rem 1rem' }}>
                  No media generated in this session yet.<br />Use the Image or Video tabs above to create your first visual!
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  {gallery.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {item.media_type === 'video' ? (
                        <div style={{ position: 'relative', height: '140px', background: '#000' }}>
                          <video src={item.url} poster={item.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: '#fff' }}>
                            VIDEO
                          </div>
                        </div>
                      ) : (
                        <img src={item.url} alt={item.prompt} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                      )}
                      <div style={{ padding: '0.65rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginBottom: '0.5rem', lineHeight: '1.3' }}>
                          {item.prompt.length > 55 ? item.prompt.substring(0, 55) + '...' : item.prompt}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{item.style || item.aspect_ratio}</span>
                          <a href={item.url} download target="_blank" rel="noreferrer" className="icon-button" title="Download">
                            <Download size={13} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

