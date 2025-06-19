const pool = require('../config/database');

// API Key doğrulama middleware'i
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      console.log('API Key eksik:', req.headers);
      return res.status(401).json({
        error: 'API Key gerekli',
        message: 'x-api-key header\'ında API Key gönderin'
      });
    }

    // Sabit API Key kontrolü
    const VALID_API_KEY = 'vt_test123demo456789';
    if (apiKey !== VALID_API_KEY) {
      console.log('Geçersiz API Key:', apiKey);
      return res.status(401).json({
        error: 'Geçersiz API Key',
        message: 'API Key geçersiz'
      });
    }

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