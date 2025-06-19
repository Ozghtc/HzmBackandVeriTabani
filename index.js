require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();

// ✅ Gelen IP ve Origin için doğru tanıma izin verir
app.set('trust proxy', 1);

// ✅ CORS ayarları - basitleştirilmiş
const corsOptions = {
  origin: 'https://hzmveritabani.netlify.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'x-api-key'],
  credentials: true
};

// ✅ CORS middleware'ini uygula
app.use(cors(corsOptions));

// ✅ Helmet güvenlik ayarları
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// ✅ Request loglama
app.use((req, res, next) => {
  console.log('\n📡 Yeni İstek:');
  console.log('🌐 Origin:', req.headers.origin);
  console.log('📍 IP:', req.ip);
  console.log('🔑 API Key:', req.headers['x-api-key']);
  console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// ✅ Body parser ayarları
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// ✅ PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ✅ Ana endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'HZM Backend Veri Tabanı API',
    version: '1.0.0',
    status: 'running'
  });
});

// ✅ Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// ✅ API rotaları
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

// ✅ 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint bulunamadı',
    path: req.originalUrl
  });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('❌ Hata:', err);
  res.status(500).json({
    error: 'Sunucu hatası',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Bir şeyler yanlış gitti'
  });
});

// ✅ Server'ı başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 HZM Backend Veri Tabanı sunucusu http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 Güvenli modda: ${process.env.NODE_ENV === 'production' ? 'Evet' : 'Hayır'}`);
  console.log(`🌐 İzin verilen origin: https://hzmveritabani.netlify.app`);
});

// ✅ Graceful shutdown - daha güvenli
process.on('SIGINT', async () => {
  console.log('\n🛑 Sunucu kapatılıyor...');
  await pool.end();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 İşlenmeyen Promise reddi:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Yakalanmayan hata:', error);
  process.exit(1);
});

module.exports = app; 