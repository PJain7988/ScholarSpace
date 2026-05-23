import React, { useState, useEffect } from 'react';
import { Save, Palette, Clock, Eye, Edit3, Columns, Download, Copy, ChevronDown, Check, FileText } from 'lucide-react';
import './NoteEditor.css';

function NoteEditor({ note, colors, onUpdateNote }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color);
  const [category, setCategory] = useState(note.category || 'General');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  
  // Editor mode: 'write', 'preview', 'split'
  const [editorMode, setEditorMode] = useState('write');
  const [toastMessage, setToastMessage] = useState('');

  const categories = ['Academics', 'Projects', 'Research', 'Coding', 'Personal', 'General'];

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    setCategory(note.category || 'General');
    setIsSaved(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setIsSaved(false);
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setIsSaved(false);
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
    setIsSaved(false);
    setShowColorPicker(false);
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setIsSaved(false);
    setShowCategoryPicker(false);
  };

  const handleSave = () => {
    onUpdateNote(note.id, {
      ...note,
      title: title || 'Untitled Note',
      content,
      color,
      category,
    });
    setIsSaved(true);
    triggerToast('Note successfully saved!');
  };

  const handleBlur = () => {
    if (!isSaved) {
      handleSave();
    }
  };

  // Modern Handlers for file exporter
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    triggerToast('Content copied to clipboard! 📋');
  };

  const downloadAsText = (fileType) => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title.toLowerCase().replace(/\s+/g, '-')}.${fileType}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    triggerToast(`Downloaded successfully as .${fileType}! 💾`);
  };

  const getColorHex = (colorClass) => {
    const colorObj = colors.find(c => c.class === colorClass);
    return colorObj ? colorObj.hex : '#3b82f6';
  };

  const getColorName = (colorClass) => {
    const colorObj = colors.find(c => c.class === colorClass);
    return colorObj ? colorObj.name : 'Blue';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Self-contained high fidelity Markdown compilation engine
  const renderMarkdown = (text) => {
    if (!text) return '<p class="empty-markdown">Start writing in Markdown (e.g., # Header, **bold**, - list) to preview...</p>';
    
    // Step 1: Escape basic HTML tag characters to prevent parsing breaking
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Step 2: Code blocks
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre class="markdown-code-block"><code>${code.trim()}</code></pre>`;
    });

    // Step 3: Inline codes
    html = html.replace(/`([^`]+)`/g, '<code class="markdown-inline-code">$1</code>');

    // Step 4: Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Step 5: Bold & Italics
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Step 6: Blockquotes
    html = html.replace(/^&gt;\s!(.*$)/gim, '<blockquote class="alert-quote">$1</blockquote>');
    html = html.replace(/^&gt;\s(.*$)/gim, '<blockquote>$1</blockquote>');

    // Step 7: Horizontal rules
    html = html.replace(/^---$/gim, '<hr class="markdown-hr" />');

    // Step 8: Task list checkboxes
    html = html.replace(/^\s*-\s*\[x\]\s*(.*$)/gim, '<li class="markdown-task-item checked"><span class="checked-box">✓</span> $1</li>');
    html = html.replace(/^\s*-\s*\[ \]\s*(.*$)/gim, '<li class="markdown-task-item"><span class="empty-box"></span> $1</li>');

    // Step 9: Standard lists
    html = html.replace(/^\s*-\s*(.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\s*\*\s*(.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\s*\d+\.\s*(.*$)/gim, '<li>$1</li>');

    // Wrap lines properly
    const lines = html.split('\n');
    let inList = false;
    
    const processedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('<li>') || trimmed.startsWith('<li ')) {
        if (!inList) {
          inList = true;
          return '<ul class="markdown-list">' + line;
        }
        return line;
      } else {
        let prefix = '';
        if (inList) {
          inList = false;
          prefix = '</ul>';
        }
        if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr') || trimmed === '') {
          return prefix + line;
        }
        return prefix + `<p>${line}</p>`;
      }
    });

    html = processedLines.join('\n');
    if (inList) html += '</ul>';

    return html;
  };

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;

  return (
    <div className="note-editor">
      {/* Toast Alert popup */}
      {toastMessage && <div className="editor-toast">{toastMessage}</div>}

      <div className="editor-header">
        <div className="header-left">
          <input
            type="text"
            className="note-title-input"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleBlur}
            placeholder="Note title..."
            maxLength={100}
          />
          <div className="note-meta-row">
            <div className="note-meta">
              <Clock size={14} />
              <span>{formatDate(note.updatedAt)}</span>
            </div>
            
            {/* Category Dropdown Selection Panel */}
            <div className="category-select-wrapper">
              <button 
                className="category-badge-btn" 
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <span>Category: {category}</span>
                <ChevronDown size={14} />
              </button>
              {showCategoryPicker && (
                <div className="category-dropdown-panel">
                  {categories.map(cat => (
                    <button 
                      key={cat} 
                      className={`cat-dropdown-item ${category === cat ? 'active' : ''}`}
                      onClick={() => handleCategoryChange(cat)}
                    >
                      {cat}
                      {category === cat && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="header-right">
          {/* Workspace split views controllers */}
          <div className="editor-mode-selectors">
            <button 
              className={`mode-btn ${editorMode === 'write' ? 'active' : ''}`}
              onClick={() => setEditorMode('write')}
              title="Edit markdown content"
            >
              <Edit3 size={16} />
              <span>Write</span>
            </button>
            <button 
              className={`mode-btn ${editorMode === 'split' ? 'active' : ''}`}
              onClick={() => setEditorMode('split')}
              title="Split Workspace Pane"
            >
              <Columns size={16} />
              <span>Split</span>
            </button>
            <button 
              className={`mode-btn ${editorMode === 'preview' ? 'active' : ''}`}
              onClick={() => setEditorMode('preview')}
              title="Render HTML Preview"
            >
              <Eye size={16} />
              <span>Preview</span>
            </button>
          </div>

          {/* Color Selector */}
          <div className="color-selector">
            <button
              className="color-picker-btn"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title={`Color: ${getColorName(color)}`}
              style={{ borderColor: getColorHex(color) }}
            >
              <Palette size={18} />
            </button>

            {showColorPicker && (
              <div className="color-picker-panel">
                <div className="color-picker-header">Choose Color</div>
                <div className="color-picker-grid">
                  {colors.map(c => (
                    <button
                      key={c.class}
                      className={`color-option ${color === c.class ? 'active' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => handleColorChange(c.class)}
                      title={c.name}
                    >
                      {color === c.class && <span className="checkmark">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            className={`save-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleSave}
            title={isSaved ? 'Saved' : 'Save note'}
          >
            <Save size={18} />
            <span className="save-status">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      <div
        className="color-bar"
        style={{ backgroundColor: getColorHex(color) }}
      />

      {/* Editor Content Area based on modes */}
      <div className={`editor-wrapper ${editorMode}`}>
        {(editorMode === 'write' || editorMode === 'split') && (
          <textarea
            className="note-content"
            value={content}
            onChange={handleContentChange}
            onBlur={handleBlur}
            placeholder="Start typing your note here (Standard Markdown tags supported)..."
          />
        )}
        
        {(editorMode === 'preview' || editorMode === 'split') && (
          <div 
            className="markdown-preview-pane"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>

      <div className="editor-footer">
        <div className="stats">
          <span className="stat">{wordCount} words</span>
          <span className="stat-separator">•</span>
          <span className="stat">{charCount} characters</span>
        </div>

        {/* Professional Document Exporters Panel */}
        <div className="exporter-controls">
          <button className="export-btn" onClick={copyToClipboard} title="Copy to clipboard">
            <Copy size={14} />
            <span>Copy</span>
          </button>
          <button className="export-btn" onClick={() => downloadAsText('md')} title="Download Markdown file">
            <FileText size={14} />
            <span>.MD</span>
          </button>
          <button className="export-btn" onClick={() => downloadAsText('txt')} title="Download raw plain text">
            <Download size={14} />
            <span>.TXT</span>
          </button>
          <button className="export-btn" onClick={() => window.print()} title="Print Document to PDF">
            <span>PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoteEditor;
