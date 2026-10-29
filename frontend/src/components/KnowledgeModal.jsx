import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Trash2, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { api } from '../services/api';

export default function KnowledgeModal({
  isOpen,
  onClose,
  knowledgeDocs,
  onReloadDocs,
  onNotify
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || uploading) return;

    try {
      setUploading(true);
      if (onNotify) onNotify('Extracting text and generating vector embeddings...');
      const res = await api.uploadKnowledgeDocument(selectedFile, title);
      if (onNotify) onNotify(`Successfully indexed '${res.title}' with ${res.total_chunks} vector chunks!`);
      setSelectedFile(null);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onReloadDocs();
    } catch (err) {
      if (onNotify) onNotify(`Indexing failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, docTitle) => {
    if (!window.confirm(`Delete '${docTitle}' and all its vector embeddings?`)) return;
    try {
      await api.deleteKnowledgeDocument(docId);
      if (onNotify) onNotify(`Deleted '${docTitle}'.`);
      onReloadDocs();
    } catch (err) {
      if (onNotify) onNotify(`Delete error: ${err.message}`, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={20} color="#38bdf8" />
            <h3 className="modal-title">RAG Knowledge Base</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUpload} style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              border: '2px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(0, 0, 0, 0.2)',
              marginBottom: '0.9rem',
            }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.docx,.doc,.txt,.md"
              onChange={handleFileChange}
            />
            <Upload size={32} color="#38bdf8" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            {selectedFile ? (
              <div>
                <p style={{ fontWeight: 600, color: '#f1f5f9' }}>{selectedFile.name}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Click or drop document to index</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                  Supported: PDF, DOCX, TXT, Markdown (Max 15MB)
                </p>
              </div>
            )}
          </div>

          {selectedFile && (
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.9rem' }}>
              <input
                type="text"
                className="composer-card"
                style={{ flex: 1, padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                placeholder="Document Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button className="btn-studio primary" type="submit" disabled={uploading}>
                {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                <span>{uploading ? 'Vectorizing...' : 'Index Document'}</span>
              </button>
            </div>
          )}
        </form>

        {/* List of active documents */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
            Currently Indexed ({knowledgeDocs.length})
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {knowledgeDocs.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1rem' }}>
                No documents currently indexed. Upload one to enable grounded RAG answering.
              </p>
            ) : (
              knowledgeDocs.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <FileText size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {doc.file_name} • {doc.total_chunks} chunks
                      </div>
                    </div>
                  </div>

                  <button
                    className="item-delete-btn"
                    style={{ opacity: 1 }}
                    title="Delete document and chunks"
                    onClick={() => handleDelete(doc.id, doc.title)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
