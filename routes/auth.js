const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  const { full_name, email, password, phone, user_type, business_name, occupation, bio, location, experience_years, address } = req.body;
  if (!full_name || !email || !password || !user_type)
    return res.status(400).json({ error: 'Missing required fields' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const hash = await bcrypt.hash(password, 10);
    const [userResult] = await conn.execute(
      'INSERT INTO users (full_name, email, password_hash, phone, user_type) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, hash, phone || null, user_type]
    );
    const userId = userResult.insertId;

    if (user_type === 'provider' || user_type === 'both') {
      await conn.execute(
        'INSERT INTO provider_profile (user_id, business_name, occupation, bio, location, experience_years) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, business_name || null, occupation || null, bio || null, location || null, experience_years || 0]
      );
    }
    if (user_type === 'customer' || user_type === 'both') {
      await conn.execute('INSERT INTO customer_profile (user_id, address) VALUES (?, ?)', [userId, address || null]);
    }
    await conn.commit();
    res.json({ message: 'Registered successfully' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.execute(
      `SELECT u.*, a.admin_id FROM users u LEFT JOIN admin a ON a.user_id = u.user_id WHERE u.email = ?`,
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (user.status === 'blocked') return res.status(403).json({ error: 'Account is blocked' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, user_type: user.user_type, is_admin: !!user.admin_id },
      JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({ token, user: { user_id: user.user_id, full_name: user.full_name, email: user.email, user_type: user.user_type, is_admin: !!user.admin_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
