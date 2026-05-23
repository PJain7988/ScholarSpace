import React, { useState, useEffect } from 'react';
import './App.css';
import NotesList from './components/NotesList';
import NoteEditor from './components/NoteEditor';
import TodoApp from './components/TodoApp';
import Dashboard from './components/Dashboard';
import { Plus, Search, CheckSquare, BookOpen, LayoutDashboard, Cloud, CloudOff, FolderOpen, ArrowUpDown, Sun, Moon, SlidersHorizontal } from 'lucide-react';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'indigo';
  });

  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('themeMode') === 'light';
  });

  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [todos, setTodos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterColor, setFilterColor] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [noteSortBy, setNoteSortBy] = useState('updatedAt'); // 'updatedAt', 'createdAt', 'title'
  
  // Dashboard & Sync States
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'notes', 'todos'
  const [syncStatus, setSyncStatus] = useState('offline'); // 'online', 'syncing', 'offline'

  const [todoStats, setTodoStats] = useState({ pending: 0, inProgress: 0, completed: 0, highPrio: 0 });

  const updateTodoStats = () => {
    try {
      const allTodos = JSON.parse(localStorage.getItem('todos') || '[]');
      const stats = { pending: 0, inProgress: 0, completed: 0, highPrio: 0 };
      allTodos.forEach(t => {
        const isCompleted = t.status === 'completed' || t.completed;
        const isInProgress = t.status === 'in-progress';

        if (isCompleted) stats.completed++;
        else if (isInProgress) stats.inProgress++;
        else stats.pending++;

        if (t.priority === 'high') stats.highPrio++;
      });
      setTodoStats(stats);
      setTodos(allTodos);
    } catch (e) {
      console.warn('Failed to parse todo stats:', e);
    }
  };

  useEffect(() => {
    updateTodoStats();
    window.addEventListener('storage', updateTodoStats);
    return () => window.removeEventListener('storage', updateTodoStats);
  }, []);

  // Apply theme class to body globally
  useEffect(() => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('themeMode', isLightMode ? 'light' : 'dark');
    document.body.className = `theme-${theme}`;
    if (isLightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme, isLightMode]);

  const BACKEND_URL = 'http://localhost:5000/api/data';

  // Load initial local data
  useEffect(() => {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    }
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos));
      } catch (error) {
        console.error('Failed to load todos:', error);
      }
    }
  }, []);

  // Sync state engine
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  // Self-healing Background Sync Engine (Pings node server periodically)
  useEffect(() => {
    let syncInterval;

    const performSync = async () => {
      try {
        setSyncStatus('syncing');
        // Fetch current server state
        const res = await fetch(BACKEND_URL, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (!res.ok) throw new Error('Server returned error status');
        const serverData = await res.json();
        
        // Retrieve local state
        const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
        const localTodos = JSON.parse(localStorage.getItem('todos') || '[]');

        // Smart timestamp merge for Notes
        const mergedNotes = [...localNotes];
        serverData.notes.forEach(sNote => {
          const localIndex = mergedNotes.findIndex(n => n.id === sNote.id);
          if (localIndex === -1) {
            mergedNotes.push(sNote);
          } else {
            // Compare updatedAt timestamp
            const sTime = new Date(sNote.updatedAt || 0).getTime();
            const lTime = new Date(mergedNotes[localIndex].updatedAt || 0).getTime();
            if (sTime > lTime) {
              mergedNotes[localIndex] = sNote;
            }
          }
        });

        // Smart timestamp merge for Todos
        const mergedTodos = [...localTodos];
        serverData.todos.forEach(sTodo => {
          const localIndex = mergedTodos.findIndex(t => t.id === sTodo.id);
          if (localIndex === -1) {
            mergedTodos.push(sTodo);
          } else {
            // Keep completed or prioritize newest changes
            if (sTodo.completed && !mergedTodos[localIndex].completed) {
              mergedTodos[localIndex].completed = true;
            }
          }
        });

        // Set merged data in local state
        setNotes(mergedNotes);
        setTodos(mergedTodos);
        localStorage.setItem('notes', JSON.stringify(mergedNotes));
        localStorage.setItem('todos', JSON.stringify(mergedTodos));
        
        // Trigger page updates for other components through localStorage events
        window.dispatchEvent(new Event('storage'));

        // Push merged state back to server
        await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: mergedNotes, todos: mergedTodos })
        });

        setSyncStatus('online');
      } catch (err) {
        // Fall back peacefully to local-first cache mode
        setSyncStatus('offline');
      }
    };

    // Run immediately and queue interval
    performSync();
    syncInterval = setInterval(performSync, 15000); // Check every 15s

    return () => clearInterval(syncInterval);
  }, []);

  // Handle updates to server in background when offline status is online
  const triggerPushToServer = async (updatedNotes = notes, updatedTodos = todos) => {
    try {
      await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: updatedNotes, todos: updatedTodos })
      });
    } catch (e) {
      setSyncStatus('offline');
    }
  };

  const colors = [
    { name: 'Red', hex: '#ef4444', class: 'red' },
    { name: 'Orange', hex: '#f97316', class: 'orange' },
    { name: 'Yellow', hex: '#eab308', class: 'yellow' },
    { name: 'Green', hex: '#22c55e', class: 'green' },
    { name: 'Blue', hex: '#3b82f6', class: 'blue' },
    { name: 'Purple', hex: '#a855f7', class: 'purple' },
    { name: 'Pink', hex: '#ec4899', class: 'pink' },
  ];

  const categories = ['Academics', 'Projects', 'Research', 'Coding', 'Personal', 'General'];

  const createNewNote = () => {
    const newNote = {
      id: Date.now(),
      title: 'Untitled Note',
      content: '',
      color: 'blue',
      category: 'General',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    setSelectedNote(newNote.id);
    triggerPushToServer(updatedNotes, todos);
  };

  const updateNote = (id, updatedNote) => {
    const updatedNotes = notes.map(note =>
      note.id === id
        ? { ...updatedNote, updatedAt: new Date().toISOString() }
        : note
    );
    setNotes(updatedNotes);
    setSelectedNote(id);
    triggerPushToServer(updatedNotes, todos);
  };

  const deleteNote = (id) => {
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    if (selectedNote === id) {
      setSelectedNote(null);
    }
    triggerPushToServer(updatedNotes, todos);
  };

  // Centralized Todo Handlers
  const addTodo = (text, priority, category, dueDate) => {
    const newTodo = {
      id: Date.now(),
      text,
      status: 'pending',
      progress: 0,
      priority,
      category,
      dueDate: dueDate || null,
      createdAt: new Date().toISOString()
    };
    const updatedTodos = [newTodo, ...todos];
    setTodos(updatedTodos);
    localStorage.setItem('todos', JSON.stringify(updatedTodos));
    triggerPushToServer(notes, updatedTodos);
  };

  const updateTaskStatus = (id, newStatus) => {
    const updatedTodos = todos.map(todo => {
      if (todo.id === id) {
        let newProgress = todo.progress;
        if (newStatus === 'completed') newProgress = 100;
        if (newStatus === 'pending') newProgress = 0;
        if (newStatus === 'in-progress' && (todo.progress === 0 || todo.progress === 100)) {
          newProgress = 50;
        }
        return {
          ...todo,
          status: newStatus,
          progress: newProgress,
          completed: newStatus === 'completed'
        };
      }
      return todo;
    });
    setTodos(updatedTodos);
    localStorage.setItem('todos', JSON.stringify(updatedTodos));
    triggerPushToServer(notes, updatedTodos);
  };

  const updateTaskProgress = (id, newProgress) => {
    const progressVal = parseInt(newProgress, 10);
    const updatedTodos = todos.map(todo => {
      if (todo.id === id) {
        let newStatus = 'in-progress';
        if (progressVal === 100) newStatus = 'completed';
        if (progressVal === 0) newStatus = 'pending';
        return {
          ...todo,
          progress: progressVal,
          status: newStatus,
          completed: newStatus === 'completed'
        };
      }
      return todo;
    });
    setTodos(updatedTodos);
    localStorage.setItem('todos', JSON.stringify(updatedTodos));
    triggerPushToServer(notes, updatedTodos);
  };

  const deleteTodo = (id) => {
    const updatedTodos = todos.filter(todo => todo.id !== id);
    setTodos(updatedTodos);
    localStorage.setItem('todos', JSON.stringify(updatedTodos));
    triggerPushToServer(notes, updatedTodos);
  };

  const clearCompletedTodos = () => {
    const updatedTodos = todos.filter(todo => todo.status !== 'completed');
    setTodos(updatedTodos);
    localStorage.setItem('todos', JSON.stringify(updatedTodos));
    triggerPushToServer(notes, updatedTodos);
  };

  const updateTodoNotes = (id, newNotes) => {
    const updatedTodos = todos.map(todo => {
      if (todo.id === id) {
        return {
          ...todo,
          notes: newNotes
        };
      }
      return todo;
    });
    setTodos(updatedTodos);
    localStorage.setItem('todos', JSON.stringify(updatedTodos));
    triggerPushToServer(notes, updatedTodos);
  };

  // Sorting & Filtering logic for notes in sidebar
  const getSortedNotes = (noteList) => {
    return [...noteList].sort((a, b) => {
      if (noteSortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (noteSortBy === 'createdAt') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesColor = filterColor === 'all' || note.color === filterColor;
    const matchesCategory = filterCategory === 'all' || (note.category || 'General') === filterCategory;
    return matchesSearch && matchesColor && matchesCategory;
  });

  const sortedAndFilteredNotes = getSortedNotes(filteredNotes);
  const currentNote = notes.find(note => note.id === selectedNote);

  // Sync state widget helper
  const renderSyncWidget = () => {
    if (syncStatus === 'online') {
      return (
        <div className="sync-pill online" title="REST API connected. All data synchronized.">
          <Cloud size={14} />
          <span>Sync Active</span>
        </div>
      );
    }
    if (syncStatus === 'syncing') {
      return (
        <div className="sync-pill syncing" title="Syncing workspace details in background...">
          <div className="spinner"></div>
          <span>Syncing...</span>
        </div>
      );
    }
    return (
      <div className="sync-pill offline" title="API offline. Using high-speed LocalStorage Cache.">
        <CloudOff size={14} />
        <span>Local Mode</span>
      </div>
    );
  };

  return (
    <div className="app">
      <div className="app-container">

        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="app-title">
              <div className="app-icon">🎓</div>
              <h1>ScholarSpace</h1>
            </div>
            {renderSyncWidget()}
          </div>

          <div className="sidebar-theme-tuner">
            <span className="theme-tuner-label">Workspace Theme:</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="theme-select"
            >
              <option value="indigo">🌌 Midnight Indigo</option>
              <option value="cyberpunk">👾 Cyberpunk Neon</option>
              <option value="emerald">🌲 Forest Emerald</option>
              <option value="ocean">🌊 Oceanic Teal</option>
            </select>
          </div>

          {/* Core workspace tabs */}
          <div className="app-tabs">
            <button 
              className={`app-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
            </button>
            <button 
              className={`app-tab ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <BookOpen size={14} />
              <span>Study Notes</span>
            </button>
            <button 
              className={`app-tab ${activeTab === 'todos' ? 'active' : ''}`}
              onClick={() => setActiveTab('todos')}
            >
              <CheckSquare size={14} />
              <span>Agenda</span>
            </button>
          </div>

          {activeTab === 'notes' && (
            <div className="sidebar-notes-controls">
              <div className="action-row">
                <button className="create-btn-main" onClick={createNewNote}>
                  <Plus size={16} />
                  <span>Create Note</span>
                </button>
              </div>

              <div className="search-and-filter-row">
                <div className="search-container">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button 
                  className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
                  onClick={() => setShowFilters(!showFilters)}
                  title="Toggle Search Filters"
                  type="button"
                >
                  <SlidersHorizontal size={14} />
                </button>
              </div>

              {showFilters && (
                <div className="sidebar-collapsible-filters">
                  {/* Sidebar sorting */}
                  <div className="sidebar-filter-group">
                    <div className="filter-header-label">
                      <ArrowUpDown size={11} />
                      <span>Sort Notebooks</span>
                    </div>
                    <select 
                      value={noteSortBy} 
                      onChange={(e) => setNoteSortBy(e.target.value)} 
                      className="sidebar-select"
                    >
                      <option value="updatedAt">Last Updated</option>
                      <option value="createdAt">Date Created</option>
                      <option value="title">Alphabetical</option>
                    </select>
                  </div>

                  {/* Sidebar Categories filter */}
                  <div className="sidebar-filter-group">
                    <div className="filter-header-label">
                      <FolderOpen size={11} />
                      <span>Filter by Category</span>
                    </div>
                    <select 
                      value={filterCategory} 
                      onChange={(e) => setFilterCategory(e.target.value)} 
                      className="sidebar-select"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sidebar Colors filter */}
                  <div className="filter-section">
                    <p className="filter-label">Filter by color tag</p>
                    <div className="color-filter">
                      <button
                        className={`filter-btn all-btn ${filterColor === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterColor('all')}
                      >
                        All
                      </button>
                      {colors.map(color => (
                        <button
                          key={color.class}
                          className={`filter-btn color-btn ${filterColor === color.class ? 'active' : ''}`}
                          onClick={() => setFilterColor(color.class)}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <NotesList
                notes={sortedAndFilteredNotes}
                selectedNote={selectedNote}
                onSelectNote={setSelectedNote}
                onDeleteNote={deleteNote}
                colors={colors}
              />
            </div>
          )}
        </aside>

        <main className="main-content">
          <div className="universal-top-bar">
            <div className="active-tab-title">
              {activeTab === 'dashboard' && '🎓 Academic Dashboard'}
              {activeTab === 'notes' && '📚 Research Notebooks'}
              {activeTab === 'todos' && '📅 Agenda Goal Planner'}
            </div>
            <div className="header-actions">
              <button 
                className="theme-mode-toggle-btn"
                onClick={() => setIsLightMode(!isLightMode)}
                title={isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode"}
                type="button"
              >
                {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <Dashboard 
              notes={notes} 
              todos={todos} 
              onSwitchTab={setActiveTab}
            />
          )}

          {activeTab === 'notes' && (
            currentNote ? (
              <NoteEditor
                note={currentNote}
                colors={colors}
                onUpdateNote={updateNote}
              />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📓</div>
                <h2>No Notebook Selected</h2>
                <p>Select an existing study note from the library or create a brand new draft to begin writing.</p>
                <button className="empty-btn" onClick={createNewNote}>
                  <Plus size={18} />
                  <span>Create Study Note</span>
                </button>
              </div>
            )
          )}

          {activeTab === 'todos' && (
            <TodoApp 
              todos={todos}
              addTodo={addTodo}
              updateTaskStatus={updateTaskStatus}
              updateTaskProgress={updateTaskProgress}
              deleteTodo={deleteTodo}
              clearCompletedTodos={clearCompletedTodos}
              updateTodoNotes={updateTodoNotes}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
