const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Get all active services (public)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = `SELECT s.*, sc.category_name, pp.business_name, pp.occupation, pp.verification_status,
        u.full_name, u.user_id,
        COALESCE(AVG(r.rating), 0) as avg_rating, COUNT(r.review_id) as review_count
      FROM service s
      JOIN provider_profile pp ON pp.provider_id = s.provider_id
      JOIN users u ON u.user_id = pp.user_id
      JOIN service_category sc ON sc.category_id = s.category_id
      LEFT JOIN booking b ON b.service_id = s.service_id AND b.status = 'completed'
      LEFT JOIN review r ON r.booking_id = b.booking_id
      WHERE s.is_active = TRUE`;
    const params = [];
    if (category) { query += ' AND s.category_id = ?'; params.push(category); }
    if (search) { query += ' AND (s.title LIKE ? OR s.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' GROUP BY s.service_id ORDER BY avg_rating DESC';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single service with availability
router.get('/:id', async (req, res) => {
  try {
    const [services] = await db.execute(
      `SELECT s.*, sc.category_name, pp.business_name, pp.occupation, pp.bio, pp.location, pp.experience_years, pp.verification_status,
        u.full_name, u.user_id,
        COALESCE(AVG(r.rating), 0) as avg_rating, COUNT(r.review_id) as review_count
       FROM service s
       JOIN provider_profile pp ON pp.provider_id = s.provider_id
       JOIN users u ON u.user_id = pp.user_id
       JOIN service_category sc ON sc.category_id = s.category_id
       LEFT JOIN booking b ON b.service_id = s.service_id AND b.status='completed'
       LEFT JOIN review r ON r.booking_id = b.booking_id
       WHERE s.service_id = ?
       GROUP BY s.service_id`, [req.params.id]
    );
    if (!services.length) return res.status(404).json({ error: 'Not found' });
    const [availability] = await db.execute('SELECT * FROM availability WHERE service_id=?', [req.params.id]);
    const [reviews] = await db.execute(
      `SELECT r.*, u.full_name FROM review r JOIN users u ON u.user_id = r.reviewer_id
       JOIN booking b ON b.booking_id = r.booking_id WHERE b.service_id=? ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json({ ...services[0], availability, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create service (provider only)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.user_type === 'customer') return res.status(403).json({ error: 'Providers only' });
  const { category_id, title, description, min_estimated_price, max_estimated_price, price_unit, booking_type, availability } = req.body;
  if (!title || !category_id || !price_unit || !booking_type) return res.status(400).json({ error: 'Missing required fields' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [pp] = await conn.execute('SELECT provider_id FROM provider_profile WHERE user_id=?', [req.user.user_id]);
    if (!pp.length) return res.status(400).json({ error: 'Provider profile not found' });
    const provider_id = pp[0].provider_id;
    const [svc] = await conn.execute(
      'INSERT INTO service (provider_id, category_id, title, description, min_estimated_price, max_estimated_price, price_unit, booking_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [provider_id, category_id, title, description || null, min_estimated_price || null, max_estimated_price || null, price_unit, booking_type]
    );
    const service_id = svc.insertId;
    if (availability && availability.length) {
      for (const slot of availability) {
        await conn.execute(
          'INSERT INTO availability (service_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
          [service_id, slot.day_of_week, slot.start_time, slot.end_time]
        );
      }
    }
    await conn.commit();
    res.json({ message: 'Service created', service_id });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Update service
router.put('/:id', authMiddleware, async (req, res) => {
  const { title, description, min_estimated_price, max_estimated_price, price_unit, booking_type, is_active, category_id } = req.body;
  try {
    const [pp] = await db.execute('SELECT provider_id FROM provider_profile WHERE user_id=?', [req.user.user_id]);
    if (!pp.length) return res.status(403).json({ error: 'Not a provider' });
    await db.execute(
      'UPDATE service SET title=?, description=?, min_estimated_price=?, max_estimated_price=?, price_unit=?, booking_type=?, is_active=?, category_id=? WHERE service_id=? AND provider_id=?',
      [title, description, min_estimated_price, max_estimated_price, price_unit, booking_type, is_active, category_id, req.params.id, pp[0].provider_id]
    );
    res.json({ message: 'Service updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete service
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [pp] = await db.execute('SELECT provider_id FROM provider_profile WHERE user_id=?', [req.user.user_id]);
    if (!pp.length) return res.status(403).json({ error: 'Not a provider' });
    await db.execute('DELETE FROM service WHERE service_id=? AND provider_id=?', [req.params.id, pp[0].provider_id]);
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get provider's own services
router.get('/my/services', authMiddleware, async (req, res) => {
  try {
    const [pp] = await db.execute('SELECT provider_id FROM provider_profile WHERE user_id=?', [req.user.user_id]);
    if (!pp.length) return res.status(400).json({ error: 'No provider profile' });
    const [rows] = await db.execute(
      `SELECT s.*, sc.category_name, COUNT(b.booking_id) as total_bookings
       FROM service s JOIN service_category sc ON sc.category_id = s.category_id
       LEFT JOIN booking b ON b.service_id = s.service_id
       WHERE s.provider_id=? GROUP BY s.service_id`, [pp[0].provider_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
