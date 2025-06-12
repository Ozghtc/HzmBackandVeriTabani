const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

// Yeni proje oluştur
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Proje adı gerekli'
      });
    }

    // Benzersiz API Key oluştur
    const apiKey = `vt_${uuidv4().replace(/-/g, '')}`;
    
    const query = `
      INSERT INTO projects (name, description, api_key, created_at, updated_at, is_active)
      VALUES ($1, $2, $3, NOW(), NOW(), true)
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, description || null, apiKey]);
    const project = result.rows[0];
    
    res.status(201).json({
      message: 'Proje başarıyla oluşturuldu',
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        apiKey: project.api_key,
        createdAt: project.created_at,
        isActive: project.is_active
      }
    });
    
  } catch (error) {
    console.error('Proje oluşturma hatası:', error);
    res.status(500).json({
      error: 'Proje oluşturulamadı',
      message: error.message
    });
  }
});

// Proje bilgilerini getir (API Key ile)
router.get('/info', authenticateApiKey, async (req, res) => {
  try {
    res.json({
      project: {
        id: req.project.project_id,
        name: req.project.project_name,
        description: req.project.description,
        createdAt: req.project.created_at,
        isActive: req.project.is_active
      }
    });
  } catch (error) {
    console.error('Proje bilgisi getirme hatası:', error);
    res.status(500).json({
      error: 'Proje bilgisi alınamadı'
    });
  }
});

// Proje güncelle
router.put('/', authenticateApiKey, async (req, res) => {
  try {
    const { name, description } = req.body;
    const projectId = req.projectId;
    
    const query = `
      UPDATE projects 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, description, projectId]);
    const project = result.rows[0];
    
    res.json({
      message: 'Proje güncellendi',
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        updatedAt: project.updated_at
      }
    });
    
  } catch (error) {
    console.error('Proje güncelleme hatası:', error);
    res.status(500).json({
      error: 'Proje güncellenemedi'
    });
  }
});

// Proje tablolarını listele
router.get('/tables', authenticateApiKey, async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        display_name,
        description,
        fields,
        created_at,
        updated_at
      FROM project_tables 
      WHERE project_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [req.projectId]);
    
    res.json({
      tables: result.rows
    });
    
  } catch (error) {
    console.error('Tablo listesi getirme hatası:', error);
    res.status(500).json({
      error: 'Tablo listesi alınamadı'
    });
  }
});

// Proje istatistikleri
router.get('/stats', authenticateApiKey, async (req, res) => {
  try {
    const tableCountQuery = `
      SELECT COUNT(*) as table_count 
      FROM project_tables 
      WHERE project_id = $1
    `;
    
    const tableCountResult = await pool.query(tableCountQuery, [req.projectId]);
    
    // Her tablodaki kayıt sayısını al
    const tablesQuery = `
      SELECT name 
      FROM project_tables 
      WHERE project_id = $1
    `;
    const tablesResult = await pool.query(tablesQuery, [req.projectId]);
    
    let totalRecords = 0;
    for (const table of tablesResult.rows) {
      try {
        const countQuery = `SELECT COUNT(*) as count FROM "${req.projectId}_${table.name}"`;
        const countResult = await pool.query(countQuery);
        totalRecords += parseInt(countResult.rows[0].count);
      } catch (err) {
        // Tablo yoksa geç
        console.warn(`Tablo sayılamadı: ${table.name}`);
      }
    }
    
    res.json({
      stats: {
        tableCount: parseInt(tableCountResult.rows[0].table_count),
        totalRecords: totalRecords,
        projectId: req.projectId,
        projectName: req.project.project_name
      }
    });
    
  } catch (error) {
    console.error('İstatistik alma hatası:', error);
    res.status(500).json({
      error: 'İstatistikler alınamadı'
    });
  }
});

module.exports = router; 