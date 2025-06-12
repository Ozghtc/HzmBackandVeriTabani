require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database bağlantısını test et
pool.connect((err, client, done) => {
  if (err) {
    console.error('❌ PostgreSQL bağlantı hatası:', err.message);
  } else {
    console.log('✅ PostgreSQL veritabanına başarıyla bağlandı');
    done();
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'HZM Backend Veri Tabanı API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// API Routes
const projectRoutes = require('./routes/projects');
const tableRoutes = require('./routes/tables');
const dataRoutes = require('./routes/data');

app.use('/api/projects', projectRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/data', dataRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Hata:', err.stack);
  res.status(500).json({
    error: 'Sunucu hatası',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Bir şeyler yanlış gitti'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint bulunamadı',
    path: req.originalUrl
  });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`🚀 HZM Backend Veri Tabanı sunucusu http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Sunucu kapatılıyor...');
  await pool.end();
  process.exit(0);
});

module.exports = app; 