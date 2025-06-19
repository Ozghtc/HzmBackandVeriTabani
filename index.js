require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();

// ✅ Gelen IP ve Origin için doğru tanıma izin verir
app.set('trust proxy', 1);

// ✅ CORS ayarları - daha sıkı güvenlik
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];

// ✅ CORS Options - daha detaylı
const corsOptions = {
  origin: function (origin, callback) {
    // Geliştirme ortamında origin kontrolünü bypass et
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Production'da sıkı kontrol
    if (!origin) {
      return callback(null, true); // API araçları için
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error(`CORS policy violation: ${origin} not allowed`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // CORS preflight sonuçlarını 10 dakika önbelleğe al
};

// ✅ Origin loglama - daha detaylı
app.use((req, res, next) => {
  console.log('🌐 Gelen origin:', req.headers.origin);
  console.log('📍 IP:', req.ip);
  console.log('🔑 API Key:', req.headers['x-api-key'] ? 'Mevcut' : 'Yok');
  next();
});

// ✅ Güvenlik middleware'leri
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight CORS fix

// ✅ Rate limiting - daha akıllı
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına limit
  message: {
    error: 'Çok fazla istek',
    message: 'Lütfen 15 dakika sonra tekrar deneyin'
  },
  standardHeaders: true, // RateLimit bilgisini header'a ekle
  legacyHeaders: false
});

// API rotalarına rate limit uygula
app.use('/api/', limiter);

// ✅ Body parser ayarları - daha güvenli
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch(e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ PostgreSQL bağlantısı - daha dayanıklı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // maksimum bağlantı sayısı
  idleTimeoutMillis: 30000, // boşta kalma timeout
  connectionTimeoutMillis: 2000, // bağlantı timeout
});

// Veritabanı bağlantı durumunu kontrol et
pool.on('connect', () => {
  console.log('✅ PostgreSQL bağlantısı başarılı');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL hatası:', err.message);
});

// ✅ Ana endpoint - daha bilgilendirici
app.get('/', (req, res) => {
  res.json({
    message: 'HZM Backend Veri Tabanı API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ✅ Health check - daha detaylı
app.get('/health', async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const dbResponseTime = Date.now() - start;
    
    res.json({
      status: 'healthy',
      database: {
        status: 'connected',
        responseTime: `${dbResponseTime}ms`
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: {
        status: 'disconnected',
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ API rotaları
const projectRoutes = require('./routes/projects');
const tableRoutes = require('./routes/tables');
const dataRoutes = require('./routes/data');
const usersRoutes = require('./routes/users');

app.use('/api/projects', projectRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/users', usersRoutes);

// ✅ Hata yönetimi - daha detaylı
app.use((err, req, res, next) => {
  console.error('❌ Hata:', err.stack);
  
  // CORS hatası özel mesajı
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS hatası',
      message: err.message,
      origin: req.headers.origin
    });
  }
  
  res.status(500).json({
    error: 'Sunucu hatası',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Bir şeyler yanlış gitti',
    requestId: req.id // İsteği takip için
  });
});

// ✅ 404 handler - daha bilgilendirici
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint bulunamadı',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ✅ Server'ı başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 HZM Backend Veri Tabanı sunucusu http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 Güvenli modda: ${process.env.NODE_ENV === 'production' ? 'Evet' : 'Hayır'}`);
  console.log(`🌐 İzin verilen originler: ${allowedOrigins.join(', ')}`);
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