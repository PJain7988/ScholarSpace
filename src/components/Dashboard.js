import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, CheckCircle, Clock, Play, Pause, RotateCcw, AlertCircle, Award, Target, Flame, Headphones, Volume2, Settings } from 'lucide-react';
import './Dashboard.css';

const Dashboard = ({ notes, todos, onSwitchTab }) => {
  // Focus Timer Custom Configurations
  const [studyMinutes, setStudyMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  
  // Timer States
  const [timerType, setTimerType] = useState('work'); // 'work', 'break'
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [pomodoroCount, setPomodoroCount] = useState(() => {
    return parseInt(localStorage.getItem('pomodoroCount') || '0', 10);
  });

  // Soothing Ambient focus sound engine
  const [soundPlaying, setSoundPlaying] = useState(false);
  const audioCtxRef = useRef(null);
  const noiseSourceRef = useRef(null);

  const timerRef = useRef(null);
  const totalDuration = timerType === 'work' ? studyMinutes * 60 : breakMinutes * 60;

  // Web Audio Context Synthesizer for pleasant study-end chiming bells
  const playCompletionSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      
      const playChimes = () => {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gain1.gain.setValueAtTime(0.1, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.8);

        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 note
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          osc2.start();
          osc2.stop(ctx.currentTime + 1.2);
        }, 150);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(playChimes);
      } else {
        playChimes();
      }
    } catch (e) {
      console.warn('AudioContext chimes not allowed/supported:', e);
    }
  };

  // Modern programmatical Brown Noise (Study Rain Simulator) Generator
  const toggleAmbientSound = () => {
    try {
      if (soundPlaying) {
        if (noiseSourceRef.current) {
          noiseSourceRef.current.stop();
          noiseSourceRef.current.disconnect();
          noiseSourceRef.current = null;
        }
        setSoundPlaying(false);
      } else {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = audioCtxRef.current || new AudioContext();
        audioCtxRef.current = ctx;

        // Make brown noise buffer programmatically
        const bufferSize = 10 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          // Brownian low-frequency pass filter formula
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; // Gain amplification
        }

        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime); // Smooth out high tones for a rain simulation

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime); // Soothing lower volume

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            source.start();
          });
        } else {
          source.start();
        }
        
        noiseSourceRef.current = source;
        setSoundPlaying(true);
      }
    } catch (e) {
      console.warn('Failed to start ambient synthesizer:', e);
    }
  };

  // Sync timeLeft when durations change
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(totalDuration);
    }
  }, [studyMinutes, breakMinutes, timerType, isRunning, totalDuration]);

  // Main countdown ticking handler
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            playCompletionSound();
            
            if (timerType === 'work') {
              const newCount = pomodoroCount + 1;
              setPomodoroCount(newCount);
              localStorage.setItem('pomodoroCount', newCount.toString());
              setTimerType('break');
              return breakMinutes * 60;
            } else {
              setTimerType('work');
              return studyMinutes * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, timerType, pomodoroCount, studyMinutes, breakMinutes]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(timerType === 'work' ? studyMinutes * 60 : breakMinutes * 60);
  };

  const handleTimerTypeChange = (type) => {
    setIsRunning(false);
    setTimerType(type);
    setTimeLeft(type === 'work' ? studyMinutes * 60 : breakMinutes * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Workspace Statistics
  const totalNotes = notes.length;
  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.status === 'completed' || t.completed).length;

  const totalProgressSum = todos.reduce((acc, t) => {
    if (t.progress !== undefined) return acc + t.progress;
    return acc + (t.status === 'completed' || t.completed ? 100 : 0);
  }, 0);
  const todoCompletionRate = totalTodos === 0 ? 0 : Math.round(totalProgressSum / totalTodos);
  
  const totalWords = notes.reduce((acc, note) => {
    const words = note.content.trim().split(/\s+/).filter(w => w.length > 0).length;
    return acc + words;
  }, 0);

  const categoryCounts = notes.reduce((acc, note) => {
    const cat = note.category || 'General';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const categories = ['Academics', 'Projects', 'Research', 'Coding', 'Personal', 'General'];

  // Pomodoro rounds progress bullets
  const currentRound = (pomodoroCount % 4) + 1;

  const getProductivityInsight = () => {
    if (totalNotes === 0 && totalTodos === 0) {
      return {
        title: "Initialize Workspace",
        desc: "Create your first notebook and task agenda in the sidebar to kickstart your academic dashboard metrics.",
        badge: "Ready",
        color: "#60a5fa"
      };
    }
    if (todoCompletionRate > 80 && pomodoroCount > 0) {
      return {
        title: "Elite Academic Velocity",
        desc: "Outstanding study momentum! You are crushing your goals and maintaining an exceptional completion rate.",
        badge: "Superb",
        color: "#10b981"
      };
    }
    if (totalWords > 500 && todoCompletionRate < 40) {
      return {
        title: "Capture to Action",
        desc: "You have written extensive study notes. Try dividing them into actionable high-priority tasks to execution.",
        badge: "Action Required",
        color: "#f59e0b"
      };
    }
    if (pomodoroCount > 3) {
      return {
        title: "Cognitive Endurance",
        desc: "Awesome focus today! Ensure you take standard breaks between sessions to maximize long-term retention.",
        badge: "High Focus",
        color: "#8b5cf6"
      };
    }
    return {
      title: "Balanced Study Rhythm",
      desc: "Good foundation. Increase your productivity score by completing pending tasks and logging focused Pomodoro sessions.",
      badge: "Normal Pace",
      color: "#a78bfa"
    };
  };

  const insight = getProductivityInsight();

  // SVG parameters
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / totalDuration) * circumference;

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <div className="header-info">
          <h2>Academic Workspace Hub</h2>
          <p>Analytical insights and focus optimization for your studies and engineering projects.</p>
        </div>
        <div className="sync-badge">
          <div className="sync-dot"></div>
          <span>Offline-First (Active Session)</span>
        </div>
      </div>

      {/* Primary Analytics Cards */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => onSwitchTab('notes')}>
          <div className="stat-icon-wrapper blue">
            <BookOpen size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Knowledge Repository</span>
            <h3 className="stat-value">{totalNotes} <span className="stat-unit">notes</span></h3>
            <span className="stat-subtitle">{totalWords} recorded words</span>
          </div>
        </div>

        <div className="stat-card" onClick={() => onSwitchTab('todos')}>
          <div className="stat-icon-wrapper green">
            <CheckCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Task Efficiency</span>
            <h3 className="stat-value">{todoCompletionRate}% <span className="stat-unit">done</span></h3>
            <span className="stat-subtitle">{completedTodos}/{totalTodos} tasks completed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <Flame size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Cognitive Focus</span>
            <h3 className="stat-value">{pomodoroCount} <span className="stat-unit">sessions</span></h3>
            <span className="stat-subtitle">{(pomodoroCount * studyMinutes)} mins deep work logged</span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Section Split */}
      <div className="dashboard-split-layout">
        {/* Left Side: Focus Timer & AI Insights */}
        <div className="split-left">
          <div className="panel focus-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Clock size={18} />
                <h3>Focus & Study Pomodoro</h3>
              </div>
              <div className="timer-header-actions">
                <button 
                  className={`ambient-audio-btn ${soundPlaying ? 'playing' : ''}`}
                  onClick={toggleAmbientSound}
                  title="Toggle Ambient Focus Sounds (Offline Rain Synthesizer)"
                >
                  {soundPlaying ? <Volume2 size={16} /> : <Headphones size={16} />}
                  <span>Rain Noise</span>
                </button>
                <button 
                  className={`settings-toggle-btn ${showSettings ? 'active' : ''}`}
                  onClick={() => setShowSettings(!showSettings)}
                  title="Configure Pomodoro Durations"
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>

            {/* Custom durations sliders config block */}
            {showSettings && (
              <div className="timer-settings-dropdown">
                <h4>Pomodoro Timer Customization</h4>
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Study Session: {studyMinutes} min</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="60" 
                    step="5"
                    value={studyMinutes} 
                    onChange={(e) => {
                      setStudyMinutes(parseInt(e.target.value, 10));
                      resetTimer();
                    }}
                    className="duration-slider"
                  />
                </div>
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Short Break: {breakMinutes} min</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="30" 
                    step="1"
                    value={breakMinutes} 
                    onChange={(e) => {
                      setBreakMinutes(parseInt(e.target.value, 10));
                      resetTimer();
                    }}
                    className="duration-slider"
                  />
                </div>
              </div>
            )}

            {/* Simple Work/Break quick selectors */}
            <div className="timer-pill-selectors-wrapper">
              <div className="timer-pill-selectors">
                <button 
                  className={`pill-btn ${timerType === 'work' ? 'active' : ''}`}
                  onClick={() => handleTimerTypeChange('work')}
                >
                  Study ({studyMinutes}m)
                </button>
                <button 
                  className={`pill-btn ${timerType === 'break' ? 'active' : ''}`}
                  onClick={() => handleTimerTypeChange('break')}
                >
                  Break ({breakMinutes}m)
                </button>
              </div>
            </div>

            <div className="timer-widget">
              <div className="svg-timer-container">
                <svg width="220" height="220" viewBox="0 0 220 220" className="timer-svg">
                  <circle 
                    cx="110" 
                    cy="110" 
                    r={radius} 
                    className="timer-circle-bg" 
                  />
                  <circle 
                    cx="110" 
                    cy="110" 
                    r={radius} 
                    className="timer-circle-progress" 
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset: strokeDashoffset,
                      stroke: timerType === 'work' ? 'var(--accent-primary)' : 'var(--accent-secondary)'
                    }}
                  />
                </svg>
                <div className="timer-text-container">
                  <span className="timer-digits">{formatTime(timeLeft)}</span>
                  <span className="timer-label">{timerType === 'work' ? 'DEEP WORK' : 'SHORT BREAK'}</span>
                </div>
              </div>

              {/* Rounds tally bullet nodes */}
              <div className="rounds-tally-tracker">
                <span className="rounds-label">Session Progress:</span>
                <div className="rounds-bullets">
                  {[1, 2, 3, 4].map((round) => (
                    <div 
                      key={round}
                      className={`round-bullet ${round < currentRound ? 'completed' : round === currentRound && timerType === 'work' && isRunning ? 'active' : 'upcoming'}`}
                      title={round < currentRound ? `Round ${round} completed` : round === currentRound ? `Round ${round} active` : `Round ${round} upcoming`}
                    />
                  ))}
                </div>
                <span className="rounds-count">({currentRound}/4)</span>
              </div>

              <div className="timer-controls">
                <button className="control-btn reset-btn" onClick={resetTimer} title="Reset Timer">
                  <RotateCcw size={18} />
                </button>
                <button 
                  className={`control-btn play-btn ${isRunning ? 'running' : ''}`} 
                  onClick={toggleTimer}
                >
                  {isRunning ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" style={{marginLeft: '2px'}} />}
                </button>
                <div className="control-placeholder"></div>
              </div>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="panel insight-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Target size={18} />
                <h3>Productivity Score & Insights</h3>
              </div>
              <span className="insight-badge" style={{ backgroundColor: `${insight.color}20`, color: insight.color, border: `1px solid ${insight.color}40` }}>
                {insight.badge}
              </span>
            </div>
            <div className="insight-body">
              <div className="insight-icon-container">
                <Award size={32} color={insight.color} />
              </div>
              <div className="insight-content">
                <h4>{insight.title}</h4>
                <p>{insight.desc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Academic Categories distribution & Project Stats */}
        <div className="split-right">
          <div className="panel category-distribution">
            <div className="panel-header">
              <div className="panel-title">
                <BookOpen size={18} />
                <h3>Knowledge Base Distribution</h3>
              </div>
            </div>
            
            <div className="category-bars-list">
              {categories.map(cat => {
                const count = categoryCounts[cat] || 0;
                const percentage = totalNotes === 0 ? 0 : Math.round((count / totalNotes) * 100);
                
                const getColorClass = (c) => {
                  switch(c) {
                    case 'Academics': return 'blue';
                    case 'Projects': return 'purple';
                    case 'Research': return 'orange';
                    case 'Coding': return 'green';
                    case 'Personal': return 'pink';
                    default: return 'gray';
                  }
                };

                return (
                  <div key={cat} className="cat-bar-item">
                    <div className="cat-bar-labels">
                      <div className="cat-name-group">
                        <span className={`cat-bullet ${getColorClass(cat)}`}></span>
                        <span className="cat-name">{cat}</span>
                      </div>
                      <span className="cat-count">{count} {count === 1 ? 'note' : 'notes'} ({percentage}%)</span>
                    </div>
                    <div className="cat-progress-bg">
                      <div 
                        className={`cat-progress-fill ${getColorClass(cat)}`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel syllabus-panel">
            <div className="panel-header">
              <div className="panel-title">
                <AlertCircle size={18} />
                <h3>Recent Activity Logs</h3>
              </div>
            </div>
            <div className="activity-logs">
              {notes.length === 0 && todos.length === 0 ? (
                <div className="no-logs">
                  <p>No activity logs recorded yet. Begin documenting notes or tasks to see your timeline build.</p>
                </div>
              ) : (
                <div className="logs-list">
                  {notes.slice(0, 3).map(note => (
                    <div key={note.id} className="log-row">
                      <span className="log-dot note-dot"></span>
                      <div className="log-text">
                        <strong>Note Edited:</strong> "{note.title || 'Untitled'}" under <em>{note.category || 'General'}</em>
                      </div>
                      <span className="log-time">Recent</span>
                    </div>
                  ))}
                  {todos.slice(0, 3).map(todo => (
                    <div key={todo.id} className="log-row">
                      <span className={`log-dot ${todo.status === 'completed' ? 'completed-dot' : todo.status === 'in-progress' ? 'inprogress-dot' : 'todo-dot'}`}></span>
                      <div className="log-text">
                        <strong>Task Update:</strong> "{todo.text}" is <em>{todo.status === 'completed' ? 'Completed' : todo.status === 'in-progress' ? `In Progress (${todo.progress}%)` : 'Pending'}</em>
                      </div>
                      <span className="log-time">Recent</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
