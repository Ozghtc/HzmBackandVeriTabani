const express = require('express');
const pool = require('../config/database');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

// Tüm kullanıcıları listele
router.get('/', authenticateApiKey, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, selected_package FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Kullanıcıları listeleme hatası:', error);
    res.status(500).json({ error: 'Kullanıcılar alınamadı' });
  }
});

// Yeni kullanıcı ekle
router.post('/', authenticateApiKey, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    // Hem camelCase hem snake_case desteği
    const selectedPackage = req.body.selectedPackage || req.body.selected_package || null;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, selected_package) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, selected_package',
      [name, email, password, role, selectedPackage]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Kullanıcı ekleme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı eklenemedi' });
  }
});

// Kullanıcı sil
router.delete('/:id', authenticateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    res.json({ message: 'Kullanıcı silindi', id });
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

// Kullanıcı güncelle
router.put('/:id', authenticateApiKey, async (req, res) => {
  try {
    const { id } = req.params;
    const selectedPackage = req.body.selectedPackage || req.body.selected_package || null;
    const { name, email, password, role } = req.body;

    // Sadece fiyat/paket güncellemesi ise
    if (selectedPackage && !name && !email && !password && !role) {
      const result = await pool.query(
        'UPDATE users SET selected_package = $1 WHERE id = $2 RETURNING id, name, email, role, selected_package',
        [selectedPackage, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
      return res.json(result.rows[0]);
    }

    // Eğer password yoksa, mevcut şifreyi çek ve onu kullan
    let finalPassword = password;
    if (!password) {
      const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [id]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
      finalPassword = userResult.rows[0].password;
    }

    // Diğer alanlar da varsa hepsini güncelle
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, password = $3, role = $4, selected_package = $5 WHERE id = $6 RETURNING id, name, email, role, selected_package',
      [name, email, finalPassword, role, selectedPackage, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Kullanıcı güncelleme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı güncellenemedi' });
  }
});

module.exports = router; 