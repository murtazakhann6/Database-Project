const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.user_type, u.status, u.created_at,
        pp.provider_id, pp.business_name, pp.occupation, pp.bio, pp.location, pp.experience_years, pp.verification_status,
        cp.customer_id, cp.address
       FROM users u
       LEFT JOIN provider_profile pp ON pp.user_id = u.user_id
       LEFT JOIN customer_profile cp ON cp.user_id = u.user_id
       WHERE u.user_id = ?`, [req.user.user_id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
router.put('/me', authMiddleware, async (req, res) => {
  const { full_name, phone, business_name, occupation, bio, location, experience_years, address } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('UPDATE users SET full_name=?, phone=? WHERE user_id=?', [full_name, phone, req.user.user_id]);
    if (req.user.user_type === 'provider' || req.user.user_type === 'both') {
      await conn.execute(
        'UPDATE provider_profile SET business_name=?, occupation=?, bio=?, location=?, experience_years=? WHERE user_id=?',
        [business_name, occupation, bio, location, experience_years, req.user.user_id]
      );
    }
    if (req.user.user_type === 'customer' || req.user.user_type === 'both') {
      await conn.execute('UPDATE customer_profile SET address=? WHERE user_id=?', [address, req.user.user_id]);
    }
    await conn.commit();
    res.json({ message: 'Profile updated' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
