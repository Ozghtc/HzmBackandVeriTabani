const pool = require('../config/database');

// API Key doğrulama middleware'i
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'API Key gerekli',
        message: 'x-api-key header\'ında API Key gönderin'
      });
    }

    // API Key formatını kontrol et (vt_ ile başlamalı)
    if (!apiKey.startsWith('vt_')) {
      return res.status(401).json({
        error: 'Geçersiz API Key formatı',
        message: 'API Key "vt_" ile başlamalıdır'
      });
    }

    // Veritabanından API Key'i kontrol et
    const query = `
      SELECT p.*, p.id as project_id, p.name as project_name
      FROM projects p 
      WHERE p.api_key = $1 AND p.is_active = true
    `;
    
    const result = await pool.query(query, [apiKey]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Geçersiz API Key',
        message: 'API Key bulunamadı veya deaktif'
      });
    }

    // Proje bilgilerini request'e ekle
    req.project = result.rows[0];
    req.projectId = result.rows[0].project_id;
    
    next();
  } catch (error) {
    console.error('API Key doğrulama hatası:', error);
    res.status(500).json({
      error: 'Yetkilendirme hatası',
      message: 'Sunucu hatası'
    });
  }
};

// Proje sahibi kontrolü (opsiyonel, admin işlemleri için)
const requireProjectOwner = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.projectId;
    
    if (req.projectId !== parseInt(projectId)) {
      return res.status(403).json({
        error: 'Yetkisiz erişim',
        message: 'Bu projeye erişim yetkiniz yok'
      });
    }
    
    next();
  } catch (error) {
    console.error('Proje sahibi kontrolü hatası:', error);
    res.status(500).json({
      error: 'Yetkilendirme hatası'
    });
  }
};

module.exports = {
  authenticateApiKey,
  requireProjectOwner
}; 