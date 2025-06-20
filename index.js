require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const internalDbUrl = "postgresql://postgres:QuYdBaYimhhZySgITuTAUuYPWGjLizVt@postgres.railway.internal:5432/railway";

const app = express();

// Middleware
app.use(express.json());

const allowedOrigins = [
  'https://hzmfrontendveritabani.netlify.app',
  'https://main--hzmveritabani.netlify.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

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

// PostgreSQL connection pool (Cloud/DO uyumlu)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || internalDbUrl,
  ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ PostgreSQL veritabanına bağlandı');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL bağlantı hatası:', err.message);
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Rotaları Yükle
const projectsRouter = require('./routes/projects');
const tablesRouter = require('./routes/tables');
const dataRouter = require('./routes/data');
const usersRouter = require('./routes/users');

app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/tables', tablesRouter);
app.use('/api/v1/data', dataRouter);
app.use('/api/v1/users', usersRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
  console.log('🔒 CORS: İzin verilen originler:', allowedOrigins);
  console.log('📊 Health check endpoints: /health, /healthz');
  console.log('🌐 Database URL:', process.env.DATABASE_URL ? 'Tanımlı' : 'Tanımlı Değil (undefined)');
  console.log('✅ Deployment için hazır!');
}); 