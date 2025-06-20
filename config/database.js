require('dotenv').config();
const { Pool } = require('pg');

const internalDbUrl = "postgresql://postgres:QuYdBaYimhhZySgITuTAUuYPWGjLizVt@postgres.railway.internal:5432/railway";

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

module.exports = pool; 