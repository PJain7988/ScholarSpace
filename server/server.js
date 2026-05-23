const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to read database
const readDatabase = () => {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // Default template
      const defaultData = { notes: [], todos: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read database:', error);
    return { notes: [], todos: [] };
  }
};

// Helper to write database
const writeDatabase = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to write database:', error);
    return false;
  }
};

// REST API Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    databaseConnected: true
  });
});

// Single payload getter to sync notes and todos in one roundtrip (high efficiency)
app.get('/api/data', (req, res) => {
  const data = readDatabase();
  res.json(data);
});

// Atomic single payload setter
app.post('/api/data', (req, res) => {
  const { notes, todos } = req.body;
  
  if (!Array.isArray(notes) || !Array.isArray(todos)) {
    return res.status(400).json({ error: 'Payload must contain notes and todos arrays' });
  }

  const success = writeDatabase({ notes, todos });
  
  if (success) {
    res.json({ success: true, message: 'Workspace synced successfully' });
  } else {
    res.status(500).json({ error: 'Failed to write data to local database file' });
  }
});

// Error fallback handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🎓 ScholarSpace Academic API Server is active!`);
  console.log(`⚡ Port: http://localhost:${PORT}`);
  console.log(`💾 JSON Database File: ${DB_FILE}`);
  console.log(`==================================================`);
});
