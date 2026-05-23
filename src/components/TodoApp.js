import React, { useState } from 'react';
import { Plus, Trash2, Calendar, AlertCircle, Tag, Search, Filter, ArrowUpDown, Clock, CheckCircle2, Circle } from 'lucide-react';
import './TodoApp.css';

const TodoApp = ({
  todos = [],
  addTodo,
  updateTaskStatus,
  updateTaskProgress,
  deleteTodo,
  clearCompletedTodos,
  updateTodoNotes
}) => {
  const normalizedTodos = (todos || []).map(todo => {
    const status = todo.status || (todo.completed ? 'completed' : 'pending');
    let progress = todo.progress;
    if (progress === undefined) {
      progress = status === 'completed' ? 100 : 0;
    }
    return {
      ...todo,
      status,
      progress
    };
  });

  const [inputValue, setInputValue] = useState('');
  
  // Advanced Task Fields States
  const [taskPriority, setTaskPriority] = useState('medium'); // 'high', 'medium', 'low'
  const [taskCategory, setTaskCategory] = useState('General');
  const [dueDate, setDueDate] = useState('');
  
  // Filtering & Search States
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'in-progress', 'completed'
  const [priorityFilter, setPriorityFilter] = useState('all'); 
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('dateCreated'); 

  const [expandedNotes, setExpandedNotes] = useState({});
  const categories = ['Academics', 'Projects', 'Research', 'Coding', 'Personal', 'General'];

  const toggleNotes = (id) => {
    setExpandedNotes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    addTodo(inputValue.trim(), taskPriority, taskCategory, dueDate);
    setInputValue('');
    setDueDate('');
    setTaskPriority('medium');
    setTaskCategory('General');
  };

  // Due Date status badge logic
  const getDueDateBadge = (dateString, status) => {
    if (!dateString) return null;
    if (status === 'completed') return { text: 'Done', class: 'done-badge' };

    const today = new Date();
    today.setHours(0,0,0,0);
    const targetDate = new Date(dateString);
    targetDate.setHours(0,0,0,0);

    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue (${Math.abs(diffDays)}d ago)`, class: 'overdue-badge' };
    } else if (diffDays === 0) {
      return { text: 'Today', class: 'today-badge' };
    } else if (diffDays === 1) {
      return { text: 'Tomorrow', class: 'tomorrow-badge' };
    } else {
      return { text: `In ${diffDays} days`, class: 'upcoming-badge' };
    }
  };

  // Sorting logic helper
  const getSortedTodos = (taskList) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    
    return [...taskList].sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (sortBy === 'priority') {
        const weightA = priorityWeight[a.priority] || 2;
        const weightB = priorityWeight[b.priority] || 2;
        return weightB - weightA;
      }
      if (sortBy === 'progress') {
        return (b.progress || 0) - (a.progress || 0);
      }
      return b.id - a.id;
    });
  };

  // Filter lists based on all search fields
  const filteredTodos = normalizedTodos.filter(todo => {
    const matchesSearch = todo.text.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filter === 'all' || 
      todo.status === filter;
      
    const matchesPriority = 
      priorityFilter === 'all' || 
      todo.priority === priorityFilter;

    const matchesCategory = 
      categoryFilter === 'all' || 
      (todo.category || 'General') === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const sortedAndFiltered = getSortedTodos(filteredTodos);

  // Advanced Stats Calculation
  const pendingCount = normalizedTodos.filter(t => t.status === 'pending').length;
  const inProgressCount = normalizedTodos.filter(t => t.status === 'in-progress').length;
  const completedCount = normalizedTodos.filter(t => t.status === 'completed').length;

  // Status icon helpers
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="status-icon completed" size={20} />;
      case 'in-progress':
        return <Clock className="status-icon in-progress" size={20} />;
      default:
        return <Circle className="status-icon pending" size={20} />;
    }
  };

  return (
    <div className="todo-container">
      <div className="todo-header">
        <h2>Academic Workspace Planner</h2>
        <p>Manage project deadlines, catalog tasks, and monitor custom completion rates.</p>
      </div>

      {/* Advanced Task Creation Form */}
      <form className="advanced-todo-form" onSubmit={handleFormSubmit}>
        <div className="form-main-row">
          <input 
            type="text" 
            className="todo-input" 
            placeholder="Add new goal (e.g., Code SQLite persistence layer)..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="add-todo-btn">
            <Plus size={18} />
            <span>Add Goal</span>
          </button>
        </div>

        <div className="form-settings-row">
          {/* Priority picker buttons */}
          <div className="setting-group">
            <label>Priority:</label>
            <div className="priority-selectors">
              {['low', 'medium', 'high'].map(p => (
                <button
                  key={p}
                  type="button"
                  className={`prio-pill ${p} ${taskPriority === p ? 'active' : ''}`}
                  onClick={() => setTaskPriority(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Category Picker */}
          <div className="setting-group">
            <label>Category:</label>
            <select 
              value={taskCategory} 
              onChange={(e) => setTaskCategory(e.target.value)}
              className="task-select"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Due date picker */}
          <div className="setting-group">
            <label>Due Date:</label>
            <div className="date-input-wrapper">
              <Calendar size={14} className="calendar-icon" />
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="task-date-input"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Search & Advanced Filters Bar */}
      <div className="todo-filters-bar">
        <div className="search-box">
          <Search size={16} className="search-box-icon" />
          <input 
            type="text" 
            placeholder="Search cataloged goals..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-box-input"
          />
        </div>

        <div className="filters-selectors">
          {/* Sort selection */}
          <div className="select-filter-group">
            <ArrowUpDown size={14} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
              <option value="dateCreated">Newest First</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">High Priority</option>
              <option value="progress">Highest Progress</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="select-filter-group">
            <Tag size={14} />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filter-select">
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div className="select-filter-group">
            <Filter size={14} />
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="filter-select">
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {normalizedTodos.length > 0 && (
        <div className="todo-stats">
          <span>{pendingCount + inProgressCount} active goals remaining</span>
          <div className="filter-tabs">
            <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')} type="button">All</button>
            <button className={`filter-tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')} type="button">Pending</button>
            <button className={`filter-tab ${filter === 'in-progress' ? 'active' : ''}`} onClick={() => setFilter('in-progress')} type="button">In Progress</button>
            <button className={`filter-tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')} type="button">Completed</button>
          </div>
          <button 
            className="clear-btn" 
            onClick={clearCompletedTodos} 
            style={{ visibility: completedCount > 0 ? 'visible' : 'hidden' }}
            type="button"
          >
            Clear completed
          </button>
        </div>
      )}

      {/* Tasks Render List */}
      <div className="todo-list">
        {sortedAndFiltered.map(todo => {
          const badge = getDueDateBadge(todo.dueDate, todo.status);
          
          return (
            <div 
              key={todo.id} 
              className={`todo-item ${todo.status} prio-${todo.priority}`}
            >
              {/* Custom Toggling Status Box */}
              <div 
                className="task-status-trigger"
                onClick={() => {
                  const sequence = { pending: 'in-progress', 'in-progress': 'completed', completed: 'pending' };
                  updateTaskStatus(todo.id, sequence[todo.status || 'pending']);
                }}
                title={`Status: ${todo.status.toUpperCase()} (Click to toggle)`}
              >
                {getStatusIcon(todo.status)}
              </div>
              
              <div className="todo-content-block">
                <span className="todo-text">
                  {todo.text}
                </span>
                
                {/* Visual Individual Progress Slider and Track */}
                <div className="todo-progress-controller">
                  <div className="slider-label-row">
                    <span className="progress-percentage-label">Completion: {todo.progress || 0}%</span>
                    <span className={`status-badge ${todo.status}`}>{todo.status.replace('-', ' ')}</span>
                  </div>
                  <div className="slider-wrapper-row">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      value={todo.progress || 0}
                      onChange={(e) => updateTaskProgress(todo.id, e.target.value)}
                      className="task-progress-slider"
                    />
                    <div className="individual-progress-bar-bg">
                      <div 
                        className={`individual-progress-bar-fill ${todo.status}`}
                        style={{ width: `${todo.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="todo-metadata-row">
                  <span className={`prio-tag ${todo.priority}`}>
                    {todo.priority}
                  </span>
                  
                  <span className="cat-tag">
                    <Tag size={10} />
                    {todo.category || 'General'}
                  </span>

                  {todo.dueDate && (
                    <span className="date-tag">
                      <Calendar size={10} />
                      {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}

                  {badge && (
                    <span className={`date-badge ${badge.class}`}>
                      {badge.text}
                    </span>
                  )}
                </div>

                <div className="task-notes-section">
                  {todo.notes && todo.notes.trim() && (
                    <div className="goal-notes-preview">
                      <div className="goal-notes-preview-header">
                        <span>Work Log Notes:</span>
                      </div>
                      <p className="goal-notes-preview-content">{todo.notes}</p>
                    </div>
                  )}

                  <button 
                    type="button" 
                    className={`task-notes-toggle-btn ${expandedNotes[todo.id] ? 'expanded' : ''}`}
                    onClick={() => toggleNotes(todo.id)}
                  >
                    📝 {todo.notes ? 'Modify Work Notes' : 'Add Work Notes'}
                  </button>
                  {expandedNotes[todo.id] && (
                    <div className="task-notes-editor-box">
                      <textarea
                        className="task-notes-textarea"
                        placeholder="Describe exactly what work was done for this task... (e.g. Completed documentation, ran local sync test.)"
                        value={todo.notes || ''}
                        onChange={(e) => updateTodoNotes(todo.id, e.target.value)}
                      />
                      <div className="notes-char-indicator">
                        {todo.notes ? `${todo.notes.length} characters logged` : '0 characters logged'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <button className="delete-todo-btn" onClick={() => deleteTodo(todo.id)} title="Delete task">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
        
        {sortedAndFiltered.length === 0 && (
          <div className="empty-todos">
            <AlertCircle size={40} />
            <p>No goals matching your filters are currently tracked.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default TodoApp;
