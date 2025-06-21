require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

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
  console.log('API Request Received:', {
    path: req.path,
    method: req.method,
    origin: req.headers.origin
  });
  next();
});

// PostgreSQL connection pool
const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ PostgreSQL veritabanına başarıyla bağlandı.');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL bağlantı hatası:', err.stack);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Load Routes
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
  console.log(`🚀 Server ${PORT} portunda çalışıyor.`);
  console.log('🔒 CORS Origins:', allowedOrigins);
  console.log('🌐 Database URL Status:', dbUrl ? 'Defined' : '!!! UNDEFINED !!!');
  console.log('✅ Railway deployment için hazır!');
}); 