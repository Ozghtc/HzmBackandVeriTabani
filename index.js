require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { authenticateApiKey } = require('./middleware/auth');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Log middleware for debugging
app.use((req, res, next) => {
  console.log('Yeni İstek:', {
    path: req.path,
    method: req.method,
    origin: req.headers.origin,
    apiKey: req.headers['x-api-key']
  });
  next();
});

// API Key authentication for /api routes
app.use('/api', authenticateApiKey);

// Users endpoints
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (error) {
    console.error('Kullanıcı listesi hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const result = await pool.query(
      'INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING *',
      [name, email, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Kullanıcı ekleme hatası:', error);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    res.json({ message: 'Kullanıcı silindi', id });
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING *',
      [name, email, role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Kullanıcı güncelleme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı güncellenemedi' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  console.log('CORS: Tüm originlere izin veriliyor');
  console.log('Database URL:', process.env.DATABASE_URL);
}); 