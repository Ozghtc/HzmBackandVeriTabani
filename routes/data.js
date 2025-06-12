const express = require('express');
const pool = require('../config/database');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

// Tabloya veri ekle
router.post('/:tableName', authenticateApiKey, async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = req.body;
    
    // Tablo varlığını kontrol et
    const tableQuery = `
      SELECT * FROM project_tables 
      WHERE project_id = $1 AND name = $2
    `;
    const tableResult = await pool.query(tableQuery, [req.projectId, tableName]);
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Tablo bulunamadı'
      });
    }
    
    const table = tableResult.rows[0];
    const fields = JSON.parse(table.fields);
    const fullTableName = `${req.projectId}_${tableName}`;
    
    // Veriyi doğrula
    const validatedData = {};
    for (const field of fields) {
      if (field.required && (data[field.name] === undefined || data[field.name] === null)) {
        return res.status(400).json({
          error: `Zorunlu alan eksik: ${field.name}`
        });
      }
      
      if (data[field.name] !== undefined) {
        // Tip dönüşümü ve doğrulama
        switch (field.type) {
          case 'number':
            if (data[field.name] !== null && isNaN(data[field.name])) {
              return res.status(400).json({
                error: `${field.name} sayı olmalıdır`
              });
            }
            validatedData[field.name] = data[field.name] !== null ? Number(data[field.name]) : null;
            break;
          case 'boolean':
            validatedData[field.name] = Boolean(data[field.name]);
            break;
          case 'date':
            if (data[field.name] && !isNaN(Date.parse(data[field.name]))) {
              validatedData[field.name] = new Date(data[field.name]);
            } else if (data[field.name] !== null) {
              return res.status(400).json({
                error: `${field.name} geçerli bir tarih olmalıdır`
              });
            }
            break;
          case 'json':
            if (typeof data[field.name] === 'object') {
              validatedData[field.name] = JSON.stringify(data[field.name]);
            } else {
              validatedData[field.name] = data[field.name];
            }
            break;
          default:
            validatedData[field.name] = data[field.name];
        }
      }
    }
    
    // Insert sorgusu oluştur
    const columns = Object.keys(validatedData);
    const values = Object.values(validatedData);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const insertQuery = `
      INSERT INTO "${fullTableName}" (${columns.map(col => `"${col}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, values);
    
    res.status(201).json({
      message: 'Veri başarıyla eklendi',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Veri ekleme hatası:', error);
    res.status(500).json({
      error: 'Veri eklenemedi',
      message: error.message
    });
  }
});

// Tablo verilerini listele
router.get('/:tableName', authenticateApiKey, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 50, sort = 'id', order = 'DESC', search } = req.query;
    
    // Tablo varlığını kontrol et
    const tableQuery = `
      SELECT * FROM project_tables 
      WHERE project_id = $1 AND name = $2
    `;
    const tableResult = await pool.query(tableQuery, [req.projectId, tableName]);
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Tablo bulunamadı'
      });
    }
    
    const fullTableName = `${req.projectId}_${tableName}`;
    const offset = (page - 1) * limit;
    
    // Arama sorgusu oluştur
    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;
    
    if (search) {
      const fields = JSON.parse(tableResult.rows[0].fields);
      const textFields = fields.filter(field => field.type === 'text');
      
      if (textFields.length > 0) {
        const searchConditions = textFields.map(field => {
          const condition = `"${field.name}" ILIKE $${paramIndex}`;
          queryParams.push(`%${search}%`);
          paramIndex++;
          return condition;
        });
        whereClause = `WHERE ${searchConditions.join(' OR ')}`;
      }
    }
    
    // Toplam kayıt sayısı
    const countQuery = `SELECT COUNT(*) as total FROM "${fullTableName}" ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Verileri getir
    const dataQuery = `
      SELECT * FROM "${fullTableName}" 
      ${whereClause}
      ORDER BY "${sort}" ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const dataResult = await pool.query(dataQuery, [...queryParams, limit, offset]);
    
    res.json({
      data: dataResult.rows,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Veri listeleme hatası:', error);
    res.status(500).json({
      error: 'Veriler listelenemedi',
      message: error.message
    });
  }
});

// Tek veri getir
router.get('/:tableName/:id', authenticateApiKey, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    
    // Tablo varlığını kontrol et
    const tableQuery = `
      SELECT * FROM project_tables 
      WHERE project_id = $1 AND name = $2
    `;
    const tableResult = await pool.query(tableQuery, [req.projectId, tableName]);
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Tablo bulunamadı'
      });
    }
    
    const fullTableName = `${req.projectId}_${tableName}`;
    
    const query = `SELECT * FROM "${fullTableName}" WHERE id = $1`;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Kayıt bulunamadı'
      });
    }
    
    res.json({
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Veri getirme hatası:', error);
    res.status(500).json({
      error: 'Veri getirilemedi'
    });
  }
});

// Veri güncelle
router.put('/:tableName/:id', authenticateApiKey, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const data = req.body;
    
    // Tablo varlığını kontrol et
    const tableQuery = `
      SELECT * FROM project_tables 
      WHERE project_id = $1 AND name = $2
    `;
    const tableResult = await pool.query(tableQuery, [req.projectId, tableName]);
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Tablo bulunamadı'
      });
    }
    
    const table = tableResult.rows[0];
    const fields = JSON.parse(table.fields);
    const fullTableName = `${req.projectId}_${tableName}`;
    
    // Mevcut kaydı kontrol et
    const checkQuery = `SELECT * FROM "${fullTableName}" WHERE id = $1`;
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Kayıt bulunamadı'
      });
    }
    
    // Veriyi doğrula
    const validatedData = {};
    for (const field of fields) {
      if (data[field.name] !== undefined) {
        // Tip dönüşümü
        switch (field.type) {
          case 'number':
            if (data[field.name] !== null && isNaN(data[field.name])) {
              return res.status(400).json({
                error: `${field.name} sayı olmalıdır`
              });
            }
            validatedData[field.name] = data[field.name] !== null ? Number(data[field.name]) : null;
            break;
          case 'boolean':
            validatedData[field.name] = Boolean(data[field.name]);
            break;
          case 'date':
            if (data[field.name] && !isNaN(Date.parse(data[field.name]))) {
              validatedData[field.name] = new Date(data[field.name]);
            } else if (data[field.name] !== null) {
              return res.status(400).json({
                error: `${field.name} geçerli bir tarih olmalıdır`
              });
            }
            break;
          case 'json':
            if (typeof data[field.name] === 'object') {
              validatedData[field.name] = JSON.stringify(data[field.name]);
            } else {
              validatedData[field.name] = data[field.name];
            }
            break;
          default:
            validatedData[field.name] = data[field.name];
        }
      }
    }
    
    if (Object.keys(validatedData).length === 0) {
      return res.status(400).json({
        error: 'Güncellenecek veri bulunamadı'
      });
    }
    
    // Update sorgusu oluştur
    const columns = Object.keys(validatedData);
    const values = Object.values(validatedData);
    const setClause = columns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');
    
    const updateQuery = `
      UPDATE "${fullTableName}" 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [...values, id]);
    
    res.json({
      message: 'Veri başarıyla güncellendi',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Veri güncelleme hatası:', error);
    res.status(500).json({
      error: 'Veri güncellenemedi',
      message: error.message
    });
  }
});

// Veri sil
router.delete('/:tableName/:id', authenticateApiKey, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    
    // Tablo varlığını kontrol et
    const tableQuery = `
      SELECT * FROM project_tables 
      WHERE project_id = $1 AND name = $2
    `;
    const tableResult = await pool.query(tableQuery, [req.projectId, tableName]);
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Tablo bulunamadı'
      });
    }
    
    const fullTableName = `${req.projectId}_${tableName}`;
    
    const deleteQuery = `
      DELETE FROM "${fullTableName}" 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await pool.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Kayıt bulunamadı'
      });
    }
    
    res.json({
      message: 'Veri başarıyla silindi',
      deletedData: result.rows[0]
    });
    
  } catch (error) {
    console.error('Veri silme hatası:', error);
    res.status(500).json({
      error: 'Veri silinemedi'
    });
  }
});

// Toplu veri ekleme
router.post('/:tableName/bulk', authenticateApiKey, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        error: 'data array formatında olmalı ve en az bir kayıt içermelidir'
      });
    }
    
    // Tablo varlığını kontrol et
    const tableQuery = `
      SELECT * FROM project_tables 
      WHERE project_id = $1 AND name = $2
    `;
    const tableResult = await pool.query(tableQuery, [req.projectId, tableName]);
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Tablo bulunamadı'
      });
    }
    
    const table = tableResult.rows[0];
    const fields = JSON.parse(table.fields);
    const fullTableName = `${req.projectId}_${tableName}`;
    
    const insertedData = [];
    const errors = [];
    
    // Her veri için ayrı ayrı işle
    for (let i = 0; i < data.length; i++) {
      try {
        const rowData = data[i];
        const validatedData = {};
        
        // Veriyi doğrula
        for (const field of fields) {
          if (field.required && (rowData[field.name] === undefined || rowData[field.name] === null)) {
            throw new Error(`Zorunlu alan eksik: ${field.name}`);
          }
          
          if (rowData[field.name] !== undefined) {
            // Tip dönüşümü
            switch (field.type) {
              case 'number':
                if (rowData[field.name] !== null && isNaN(rowData[field.name])) {
                  throw new Error(`${field.name} sayı olmalıdır`);
                }
                validatedData[field.name] = rowData[field.name] !== null ? Number(rowData[field.name]) : null;
                break;
              case 'boolean':
                validatedData[field.name] = Boolean(rowData[field.name]);
                break;
              case 'date':
                if (rowData[field.name] && !isNaN(Date.parse(rowData[field.name]))) {
                  validatedData[field.name] = new Date(rowData[field.name]);
                } else if (rowData[field.name] !== null) {
                  throw new Error(`${field.name} geçerli bir tarih olmalıdır`);
                }
                break;
              case 'json':
                if (typeof rowData[field.name] === 'object') {
                  validatedData[field.name] = JSON.stringify(rowData[field.name]);
                } else {
                  validatedData[field.name] = rowData[field.name];
                }
                break;
              default:
                validatedData[field.name] = rowData[field.name];
            }
          }
        }
        
        // Insert işlemi
        const columns = Object.keys(validatedData);
        const values = Object.values(validatedData);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        
        const insertQuery = `
          INSERT INTO "${fullTableName}" (${columns.map(col => `"${col}"`).join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
        
        const result = await pool.query(insertQuery, values);
        insertedData.push(result.rows[0]);
        
      } catch (error) {
        errors.push({
          index: i,
          data: data[i],
          error: error.message
        });
      }
    }
    
    res.status(201).json({
      message: `${insertedData.length} kayıt başarıyla eklendi`,
      inserted: insertedData,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: data.length,
        success: insertedData.length,
        failed: errors.length
      }
    });
    
  } catch (error) {
    console.error('Toplu veri ekleme hatası:', error);
    res.status(500).json({
      error: 'Toplu veri eklenemedi',
      message: error.message
    });
  }
});

module.exports = router; 