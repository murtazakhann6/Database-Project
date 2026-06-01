const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { adminMiddleware } = require('../middleware/auth');

// Dashboard stats
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [[users]] = await db.execute('SELECT COUNT(*) as count FROM users');
    const [[providers]] = await db.execute("SELECT COUNT(*) as count FROM provider_profile WHERE verification_status='pending'");
    const [[bookings]] = await db.execute('SELECT COUNT(*) as count FROM booking');
    const [[revenue]] = await db.execute("SELECT COALESCE(SUM(amount),0) as total FROM payment WHERE payment_status='paid'");
    res.json({ total_users: users.count, pending_verifications: providers.count, total_bookings: bookings.count, total_revenue: revenue.total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All users
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.*, pp.verification_status, pp.business_name, a.admin_id
       FROM users u
       LEFT JOIN provider_profile pp ON pp.user_id = u.user_id
       LEFT JOIN admin a ON a.user_id = u.user_id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user status
router.put('/users/:id/status', adminMiddleware, async (req, res) => {
  const { status } = req.body;
  try {
    await db.execute('UPDATE users SET status=? WHERE user_id=?', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update provider verification
router.put('/providers/:id/verify', adminMiddleware, async (req, res) => {
  const { verification_status } = req.body;
  try {
    await db.execute('UPDATE provider_profile SET verification_status=? WHERE provider_id=?', [verification_status, req.params.id]);
    res.json({ message: 'Verification updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All bookings
router.get('/bookings', adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT b.*, s.title as service_title, pu.full_name as provider_name, cu.full_name as customer_name,
        p.amount as payment_amount, p.payment_status, p.payment_method
       FROM booking b
       JOIN service s ON s.service_id = b.service_id
       JOIN provider_profile pp ON pp.provider_id = s.provider_id
       JOIN users pu ON pu.user_id = pp.user_id
       JOIN customer_profile cp ON cp.customer_id = b.customer_id
       JOIN users cu ON cu.user_id = cp.user_id
       LEFT JOIN payment p ON p.booking_id = b.booking_id
       ORDER BY b.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify provider by user_id
router.put('/verify-by-user', adminMiddleware, async (req, res) => {
  const { user_id, verification_status } = req.body;
  try {
    await db.execute('UPDATE provider_profile SET verification_status=? WHERE user_id=?', [verification_status, user_id]);
    res.json({ message: 'Verification updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categories CRUD
router.get('/categories', adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM service_category ORDER BY category_name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', adminMiddleware, async (req, res) => {
  const { category_name, description } = req.body;
  try {
    await db.execute('INSERT INTO service_category (category_name, description) VALUES (?,?)', [category_name, description]);
    res.json({ message: 'Category created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/categories/:id', adminMiddleware, async (req, res) => {
  const { category_name, description } = req.body;
  try {
    await db.execute('UPDATE service_category SET category_name=?, description=? WHERE category_id=?', [category_name, description, req.params.id]);
    res.json({ message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/categories/:id', adminMiddleware, async (req, res) => {
  try {
    await db.execute('DELETE FROM service_category WHERE category_id=?', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
