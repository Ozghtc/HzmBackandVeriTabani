require('dotenv').config();
const { Pool } = require('pg');

// PostgreSQL bağlantısı (Cloud/DO uyumlu)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  try {
    console.log('🗄️  HZM Veri Tabanı başlatılıyor...');
    
    // 1. Projeler tablosu
    const projectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await pool.query(projectsTable);
    console.log('✅ projects tablosu oluşturuldu');
    
    // 2. Proje tabloları meta bilgisi tablosu
    const projectTablesTable = `
      CREATE TABLE IF NOT EXISTS project_tables (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        description TEXT,
        fields JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(project_id, name)
      );
    `;
    
    await pool.query(projectTablesTable);
    console.log('✅ project_tables tablosu oluşturuldu');
    
    // 3. Users tablosu
    const usersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await pool.query(usersTable);
    console.log('✅ users tablosu oluşturuldu');
    
    // 4. İndeksler oluştur
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_projects_api_key ON projects(api_key);',
      'CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active);',
      'CREATE INDEX IF NOT EXISTS idx_project_tables_project_id ON project_tables(project_id);',
      'CREATE INDEX IF NOT EXISTS idx_project_tables_name ON project_tables(name);',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);'
    ];
    
    for (const index of indexes) {
      await pool.query(index);
    }
    console.log('✅ İndeksler oluşturuldu');
    
    // 5. Test verisi ekle (opsiyonel)
    const testProjectQuery = `
      INSERT INTO projects (name, description, api_key, created_at, updated_at)
      SELECT 'Test Projesi', 'Bu bir test projesidir', 'vt_test123demo456789', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM projects WHERE api_key = 'vt_test123demo456789');
    `;
    
    await pool.query(testProjectQuery);
    console.log('✅ Test projesi oluşturuldu (API Key: vt_test123demo456789)');
    
    console.log('\n🎉 Veritabanı başarıyla başlatıldı!');
    console.log('\n📋 Yapılacaklar:');
    console.log('1. .env dosyasında veritabanı bilgilerini güncelle');
    console.log('2. npm install ile bağımlılıkları yükle');
    console.log('3. npm run dev ile sunucuyu başlat');
    console.log('4. Test API Key: vt_test123demo456789');
    
  } catch (error) {
    console.error('❌ Veritabanı başlatma hatası:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Script'i çalıştır
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase }; 