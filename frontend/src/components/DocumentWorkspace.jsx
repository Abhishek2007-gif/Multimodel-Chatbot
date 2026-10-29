import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  FileEdit, 
  Sparkles, 
  Download, 
  Languages, 
  CheckCircle, 
  AlignLeft, 
  RotateCcw, 
  Eye, 
  Columns, 
  FileText,
  Loader2,
  Send
} from 'lucide-react';
import { api } from '../services/api';

export default function DocumentWorkspace({ onNotify }) {
  const [docId, setDocId] = useState(null);
  const [title, setTitle] = useState('New Document');
  const [originalContent, setOriginalContent] = useState('');
  const [revisedContent, setRevisedContent] = useState('');
  const [diffChunks, setDiffChunks] = useState([]);
  const [versionNumber, setVersionNumber] = useState(1);
  const [loading, setLoading] = useState(false);

  // Studio modes: 'split' | 'diff' | 'preview'
  const [viewMode, setViewMode] = useState('split');
  const [customInstruction, setCustomInstruction] = useState('');
  const [createPrompt, setCreatePrompt] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('Spanish');
  const [isCreatingOpen, setIsCreatingOpen] = useState(false);

  // 1. Create document draft from prompt
  const handleCreateDraft = async (e) => {
    if (e) e.preventDefault();
    if (!createPrompt.trim() || loading) return;

    try {
      setLoading(true);
      if (onNotify) onNotify('Generating draft with AI...');
      const res = await api.createWorkspaceDocument(
        createPrompt.trim(),
        title.trim() || 'AI Generated Document'
      );
      setDocId(res.document_id);
      setTitle(res.title);
      setOriginalContent(res.original_content);
      setRevisedContent(res.revised_content);
      setDiffChunks(res.diff_chunks || []);
      setVersionNumber(res.version_number);
      setIsCreatingOpen(false);
      setCreatePrompt('');
      if (onNotify) onNotify('Document draft created successfully!');
    } catch (err) {
      if (onNotify) onNotify(`Failed to create draft: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Perform revision actions
  const handleEditAction = async (actionType, instructionText = '') => {
    const contentToEdit = revisedContent || originalContent;
    if (!contentToEdit.trim()) {
      if (onNotify) onNotify('Please enter or generate document content first.', 'error');
      return;
    }

    let instruction = instructionText;
    if (actionType === 'summarize') instruction = 'Summarize this document';
    if (actionType === 'grammar') instruction = 'Fix grammar, spelling, and phrasing';
    if (actionType === 'rewrite') instruction = 'Rewrite and polish for professional tone and flow';
    if (actionType === 'translate') instruction = `Translate document to ${selectedLanguage}`;

    try {
      setLoading(true);
      if (onNotify) onNotify(`Applying ${actionType}...`);
      const res = await api.editWorkspaceDocument({
        document_id: docId,
        original_content: contentToEdit,
        instruction,
        action_type: actionType,
        target_language: selectedLanguage,
      });

      setDocId(res.document_id);
      setOriginalContent(contentToEdit);
      setRevisedContent(res.revised_content);
      setDiffChunks(res.diff_chunks || []);
      setVersionNumber(res.version_number);
      if (actionType === 'custom') setCustomInstruction('');
      if (onNotify) onNotify(`Revision v${res.version_number} applied!`);
    } catch (err) {
      if (onNotify) onNotify(`Revision failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 3. Export document
  const handleExport = (format) => {
    if (!docId) {
      if (onNotify) onNotify('Please create or save a revision before exporting.', 'error');
      return;
    }
    const url = api.getExportDocumentUrl(docId, format);
    window.open(url, '_blank');
  };

  return (
    <div className="workspace-container">
      {/* Top Workspace Toolbar */}
      <div className="workspace-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
          <FileEdit size={20} color="#38bdf8" />
          <input
            type="text"
            className="input-field"
            style={{ fontWeight: 600, fontSize: '0.95rem', padding: '0.4rem 0.6rem', maxWidth: '320px' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document Title"
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            Version {versionNumber}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="workspace-actions-group">
          <button
            className="btn-studio"
            onClick={() => setIsCreatingOpen(!isCreatingOpen)}
            title="Generate new draft from prompt"
          >
            <Sparkles size={14} color="#a855f7" />
            <span>AI Draft</span>
          </button>

          <button
            className="btn-studio"
            disabled={loading || (!originalContent && !revisedContent)}
            onClick={() => handleEditAction('summarize')}
            title="Executive Summary"
          >
            <AlignLeft size={14} />
            <span>Summarize</span>
          </button>

          <button
            className="btn-studio"
            disabled={loading || (!originalContent && !revisedContent)}
            onClick={() => handleEditAction('grammar')}
            title="Fix grammar & tone"
          >
            <CheckCircle size={14} color="#34d399" />
            <span>Fix Grammar</span>
          </button>

          <button
            className="btn-studio"
            disabled={loading || (!originalContent && !revisedContent)}
            onClick={() => handleEditAction('rewrite')}
            title="Rewrite for flow and clarity"
          >
            <RotateCcw size={14} />
            <span>Polish</span>
          </button>

          {/* Translation selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <select
              className="btn-studio"
              style={{ padding: '0.4rem 0.5rem', cursor: 'pointer' }}
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="Spanish">Spanish (Español)</option>
              <option value="French">French (Français)</option>
              <option value="German">German (Deutsch)</option>
              <option value="Italian">Italian (Italiano)</option>
              <option value="Portuguese">Portuguese (Português)</option>
              <option value="Russian">Russian (Русский)</option>
              <option value="Mandarin Chinese">Chinese (中文)</option>
              <option value="Japanese">Japanese (日本語)</option>
              <option value="Korean">Korean (한국어)</option>
              <option value="Arabic">Arabic (العربية)</option>
              <option value="Hindi">Hindi (हिन्दी)</option>
              <option value="Bengali">Bengali (বাংলা)</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
              <option value="Turkish">Turkish (Türkçe)</option>
              <option value="Vietnamese">Vietnamese (Tiếng Việt)</option>
              <option value="Dutch">Dutch (Nederlands)</option>
              <option value="Polish">Polish (Polski)</option>
              <option value="Indonesian">Indonesian (Bahasa)</option>
            </select>
            <button
              className="btn-studio"
              disabled={loading || (!originalContent && !revisedContent)}
              onClick={() => handleEditAction('translate')}
              title={`Translate to ${selectedLanguage}`}
            >
              <Languages size={14} />
              <span>Translate</span>
            </button>
          </div>

          {/* Export Dropdown / Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              className="btn-studio primary"
              disabled={!docId}
              onClick={() => handleExport('docx')}
              title="Download as Microsoft Word (.docx)"
            >
              <Download size={14} />
              <span>DOCX</span>
            </button>
            <button
              className="btn-studio"
              disabled={!docId}
              onClick={() => handleExport('pdf')}
              title="Download as PDF (.pdf)"
            >
              <Download size={14} />
              <span>PDF</span>
            </button>
            <button
              className="btn-studio"
              disabled={!docId}
              onClick={() => handleExport('md')}
              title="Download as Markdown (.md)"
            >
              <FileText size={14} />
              <span>MD</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Draft Creator Banner Modal */}
      {isCreatingOpen && (
        <form
          onSubmit={handleCreateDraft}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-bright)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            className="input-field"
            style={{ flex: 1 }}
            placeholder="Describe what document you want to create (e.g. 'Software Architecture Design for Cloud Chatbot')..."
            value={createPrompt}
            onChange={(e) => setCreatePrompt(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-studio primary" disabled={loading || !createPrompt.trim()}>
            {loading ? <Loader2 size={15} className="spinner" /> : <Sparkles size={15} />}
            <span>Generate</span>
          </button>
          <button type="button" className="btn-studio" onClick={() => setIsCreatingOpen(false)}>
            Cancel
          </button>
        </form>
      )}

      {/* View Switcher Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            className={`btn-studio ${viewMode === 'split' ? 'primary' : ''}`}
            onClick={() => setViewMode('split')}
          >
            <Columns size={13} />
            <span>Split View</span>
          </button>
          <button
            className={`btn-studio ${viewMode === 'diff' ? 'primary' : ''}`}
            onClick={() => setViewMode('diff')}
          >
            <Sparkles size={13} />
            <span>Diff Viewer</span>
          </button>
          <button
            className={`btn-studio ${viewMode === 'preview' ? 'primary' : ''}`}
            onClick={() => setViewMode('preview')}
          >
            <Eye size={13} />
            <span>Markdown Preview</span>
          </button>
        </div>

        {/* Custom Edit Instruction Input */}
        <div style={{ display: 'flex', gap: '0.4rem', maxWidth: '420px', flex: 1, justifyContent: 'flex-end' }}>
          <input
            type="text"
            className="input-field"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
            placeholder="Custom revision instruction..."
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customInstruction.trim()) {
                e.preventDefault();
                handleEditAction('custom', customInstruction.trim());
              }
            }}
          />
          <button
            className="btn-studio"
            disabled={loading || !customInstruction.trim() || (!originalContent && !revisedContent)}
            onClick={() => handleEditAction('custom', customInstruction.trim())}
          >
            <Send size={13} />
          </button>
        </div>
      </div>

      {/* Main Panes Display */}
      {viewMode === 'split' && (
        <div className="workspace-panes">
          {/* Left: Original / Editable Draft */}
          <div className="workspace-pane">
            <div className="pane-header">
              <span>Original Draft / Working Buffer</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {originalContent.length} chars
              </span>
            </div>
            <div className="pane-content" style={{ padding: 0 }}>
              <textarea
                className="pane-textarea"
                style={{ padding: '1rem' }}
                placeholder="Write or paste your initial draft here, or click 'AI Draft' above..."
                value={originalContent}
                onChange={(e) => setOriginalContent(e.target.value)}
              />
            </div>
          </div>

          {/* Right: Revised Output */}
          <div className="workspace-pane">
            <div className="pane-header">
              <span>Revised Document (v{versionNumber})</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                {revisedContent.length} chars
              </span>
            </div>
            <div className="pane-content" style={{ padding: 0 }}>
              <textarea
                className="pane-textarea"
                style={{ padding: '1rem' }}
                placeholder="Revised output from AI will appear here..."
                value={revisedContent}
                onChange={(e) => setRevisedContent(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'diff' && (
        <div className="workspace-pane" style={{ flex: 1, overflow: 'hidden' }}>
          <div className="pane-header">
            <span>Visual Diff Comparison</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Green = Inserted | Red = Deleted
            </span>
          </div>
          <div className="pane-content" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
            {diffChunks.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '3rem 1rem' }}>
                No diff available yet. Apply a revision to see visual differences.
              </div>
            ) : (
              diffChunks.map((chunk, idx) => {
                if (chunk.type === 'insert') {
                  return <span key={idx} className="diff-insert">{chunk.text}</span>;
                }
                if (chunk.type === 'delete') {
                  return <span key={idx} className="diff-delete">{chunk.text}</span>;
                }
                return <span key={idx} className="diff-equal">{chunk.text}</span>;
              })
            )}
          </div>
        </div>
      )}

      {viewMode === 'preview' && (
        <div className="workspace-pane" style={{ flex: 1, overflow: 'hidden' }}>
          <div className="pane-header">
            <span>Rendered Markdown Preview</span>
          </div>
          <div className="pane-content markdown-body">
            {revisedContent || originalContent ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {revisedContent || originalContent}
              </ReactMarkdown>
            ) : (
              <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '3rem 1rem' }}>
                Document is empty. Enter or generate text to preview.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
