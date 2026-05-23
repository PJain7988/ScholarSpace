import React from 'react';
import { Trash2, Folder } from 'lucide-react';
import './NotesList.css';

function NotesList({ notes, selectedNote, onSelectNote, onDeleteNote, colors }) {
  const getColorHex = (colorClass) => {
    const color = colors.find(c => c.class === colorClass);
    return color ? color.hex : '#3b82f6';
  };

  const truncateText = (text, maxLength = 80) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="notes-list">
      {notes.length === 0 ? (
        <div className="notes-list-empty">
          <p>No notes found</p>
        </div>
      ) : (
        notes.map(note => (
          <div
            key={note.id}
            className={`note-item ${selectedNote === note.id ? 'active' : ''}`}
            onClick={() => onSelectNote(note.id)}
          >
            <div
              className="note-color-indicator"
              style={{ backgroundColor: getColorHex(note.color) }}
            />
            <div className="note-item-content">
              <div className="note-title-row">
                <h3 className="note-title">{truncateText(note.title, 30)}</h3>
              </div>
              <p className="note-preview">
                {truncateText(note.content || 'No content yet', 60)}
              </p>
              
              <div className="note-meta-badges">
                <span className="note-card-category">
                  <Folder size={10} />
                  {note.category || 'General'}
                </span>
                <span className="note-date">{formatDate(note.updatedAt)}</span>
              </div>
            </div>

            <div className="note-item-footer-actions">
              <button
                className="delete-note-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this note?')) {
                    onDeleteNote(note.id);
                  }
                }}
                title="Delete note"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default NotesList;
