const express = require('express');
const pool = require('../config/database');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

// Yeni tablo oluştur
router.post('/', authenticateApiKey, async (req, res) => {
  try {
    const { name, displayName, description, fields } = req.body;
    
    if (!name || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        error: 'Tablo adı ve en az bir alan gerekli',
        message: 'name ve fields (array) parametreleri zorunludur'
      });
    }

    // Tablo adını temizle (sadece harf, rakam ve alt çizgi)
    const cleanTableName = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const fullTableName = `${req.projectId}_${cleanTableName}`;
    
    // Field'ları doğrula
    const validTypes = ['text', 'number', 'boolean', 'date', 'json'];
    for (const field of fields) {
      if (!field.name || !field.type || !validTypes.includes(field.type)) {
        return res.status(400).json({
          error: 'Geçersiz field formatı',
          message: `Her field'da name ve type (${validTypes.join(', ')}) bulunmalıdır`
        });
      }
    }

    // Tablo şemasını veritabanında kaydet
    const insertTableQuery = `
      INSERT INTO project_tables (project_id, name, display_name, description, fields, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    
    const tableResult = await pool.query(insertTableQuery, [
      req.projectId,
      cleanTableName,
      displayName || name,
      description || null,
      JSON.stringify(fields)
    ]);

    // Fiziksel tabloyu oluştur
    let createTableQuery = `CREATE TABLE "${fullTableName}" (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()`;
    
    // Field'ları ekle
    for (const field of fields) {
      let sqlType;
      switch (field.type) {
        case 'text':
          sqlType = 'TEXT';
          break;
        case 'number':
          sqlType = 'NUMERIC';
          break;
        case 'boolean':
          sqlType = 'BOOLEAN';
          break;
        case 'date':
          sqlType = 'TIMESTAMP';
          break;
        case 'json':
          sqlType = 'JSONB';
          break;
        default:
          sqlType = 'TEXT';
      }
      
      createTableQuery += `,\n      "${field.name}" ${sqlType}`;
      
      if (field.required) {
        createTableQuery += ' NOT NULL';
      }
    }
    
    createTableQuery += '\n    )';
    
    await pool.query(createTableQuery);
    
    res.status(201).json({
      message: 'Tablo başarıyla oluşturuldu',
      table: {
        id: tableResult.rows[0].id,
        name: tableResult.rows[0].name,
        displayName: tableResult.rows[0].display_name,
        description: tableResult.rows[0].description,
        fields: JSON.parse(tableResult.rows[0].fields),
        createdAt: tableResult.rows[0].created_at
      }
    });
    
  } catch (error) {
    console.error('Tablo oluşturma hatası:', error);
    res.status(500).json({
      error: 'Tablo oluşturulamadı',
      message: error.message
    });
  }
});

// Tablo bilgilerini getir
router.get('/:tableName', authenticateApiKey, async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const query = `
      SELECT * FROM project_tables 
      WHERE project_id = $1 AND name = $2
    `;
    
    const result = await pool.query(query, [req.projectId, tableName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tablo bulunamadı'
      });
    }
    
    const table = result.rows[0];
    
    res.json({
      table: {
        id: table.id,
        name: table.name,
        displayName: table.display_name,
        description: table.description,
        fields: JSON.parse(table.fields),
        createdAt: table.created_at,
        updatedAt: table.updated_at
      }
    });
    
  } catch (error) {
    console.error('Tablo bilgisi getirme hatası:', error);
    res.status(500).json({
      error: 'Tablo bilgisi alınamadı'
    });
  }
});

// Tablo güncelle (field ekle/çıkar)
router.put('/:tableName', authenticateApiKey, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { displayName, description, fields } = req.body;
    
    // Mevcut tabloyu kontrol et
    const checkQuery = `
      SELECT * FROM project_tables 
      WHERE project_id = $1 AND name = $2
    `;
    const checkResult = await pool.query(checkQuery, [req.projectId, tableName]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Tablo bulunamadı'
      });
    }
    
    const currentTable = checkResult.rows[0];
    const currentFields = JSON.parse(currentTable.fields);
    
    // Eğer fields güncellenmişse, fiziksel tabloyu da güncelle
    if (fields && Array.isArray(fields)) {
      // Yeni field'ları kontrol et
      const validTypes = ['text', 'number', 'boolean', 'date', 'json'];
      for (const field of fields) {
        if (!field.name || !field.type || !validTypes.includes(field.type)) {
          return res.status(400).json({
            error: 'Geçersiz field formatı'
          });
        }
      }
      
      // Field değişikliklerini uygula (sadece yeni field ekleme destekleniyor)
      const fullTableName = `${req.projectId}_${tableName}`;
      const newFields = fields.filter(field => 
        !currentFields.some(current => current.name === field.name)
      );
      
      for (const field of newFields) {
        let sqlType;
        switch (field.type) {
          case 'text': sqlType = 'TEXT'; break;
          case 'number': sqlType = 'NUMERIC'; break;
          case 'boolean': sqlType = 'BOOLEAN'; break;
          case 'date': sqlType = 'TIMESTAMP'; break;
          case 'json': sqlType = 'JSONB'; break;
          default: sqlType = 'TEXT';
        }
        
        const alterQuery = `ALTER TABLE "${fullTableName}" ADD COLUMN "${field.name}" ${sqlType}`;
        await pool.query(alterQuery);
      }
    }
    
    // Tablo meta bilgilerini güncelle
    const updateQuery = `
      UPDATE project_tables 
      SET display_name = COALESCE($1, display_name),
          description = COALESCE($2, description),
          fields = COALESCE($3, fields),
          updated_at = NOW()
      WHERE project_id = $4 AND name = $5
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      displayName,
      description,
      fields ? JSON.stringify(fields) : null,
      req.projectId,
      tableName
    ]);
    
    const updatedTable = result.rows[0];
    
    res.json({
      message: 'Tablo güncellendi',
      table: {
        id: updatedTable.id,
        name: updatedTable.name,
        displayName: updatedTable.display_name,
        description: updatedTable.description,
        fields: JSON.parse(updatedTable.fields),
        updatedAt: updatedTable.updated_at
      }
    });
    
  } catch (error) {
    console.error('Tablo güncelleme hatası:', error);
    res.status(500).json({
      error: 'Tablo güncellenemedi',
      message: error.message
    });
  }
});

// Tabloyu sil
router.delete('/:tableName', authenticateApiKey, async (req, res) => {
  try {
    const { tableName } = req.params;
    const fullTableName = `${req.projectId}_${tableName}`;
    
    // Önce meta bilgiyi sil
    const deleteMetaQuery = `
      DELETE FROM project_tables 
      WHERE project_id = $1 AND name = $2
      RETURNING *
    `;
    
    const result = await pool.query(deleteMetaQuery, [req.projectId, tableName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tablo bulunamadı'
      });
    }
    
    // Fiziksel tabloyu sil
    await pool.query(`DROP TABLE IF EXISTS "${fullTableName}"`);
    
    res.json({
      message: 'Tablo başarıyla silindi',
      deletedTable: result.rows[0].name
    });
    
  } catch (error) {
    console.error('Tablo silme hatası:', error);
    res.status(500).json({
      error: 'Tablo silinemedi',
      message: error.message
    });
  }
});

module.exports = router; 