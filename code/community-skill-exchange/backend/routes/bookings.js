const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Create booking
router.post('/', authMiddleware, async (req, res) => {
  const { service_id, booking_type, start_datetime, end_datetime } = req.body;
  if (!service_id || !booking_type || !start_datetime || !end_datetime)
    return res.status(400).json({ error: 'Missing required fields' });
  try {
    const [cp] = await db.execute('SELECT customer_id FROM customer_profile WHERE user_id=?', [req.user.user_id]);
    if (!cp.length) return res.status(400).json({ error: 'Customer profile required' });
    const [svc] = await db.execute('SELECT * FROM service WHERE service_id=? AND is_active=TRUE', [service_id]);
    if (!svc.length) return res.status(404).json({ error: 'Service not found' });

    const start = new Date(start_datetime);
    const end = new Date(end_datetime);
    const hours = Math.max(1, Math.ceil((end - start) / 3600000));
    const minP = svc[0].min_estimated_price || 0;
    const total_amount = minP * hours;

    const [result] = await db.execute(
      'INSERT INTO booking (service_id, customer_id, booking_type, start_datetime, end_datetime, total_amount) VALUES (?,?,?,?,?,?)',
      [service_id, cp[0].customer_id, booking_type, start_datetime, end_datetime, total_amount]
    );
    // Create pending payment (booking fee)
    await db.execute(
      'INSERT INTO payment (booking_id, amount, payment_method, payment_status, payment_for, paid_by) VALUES (?,?,?,?,?,?)',
      [result.insertId, 5.00, 'card', 'pending', 'booking_fee', 'customer']
    );
    res.json({ message: 'Booking created', booking_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get customer's bookings
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [cp] = await db.execute('SELECT customer_id FROM customer_profile WHERE user_id=?', [req.user.user_id]);
    if (!cp.length) return res.status(400).json({ error: 'No customer profile' });
    const [rows] = await db.execute(
      `SELECT b.*, s.title as service_title, s.min_estimated_price, s.max_estimated_price, s.price_unit,
        u.full_name as provider_name, pp.business_name,
        p.payment_status, p.payment_method,
        r.rating, r.comment
       FROM booking b
       JOIN service s ON s.service_id = b.service_id
       JOIN provider_profile pp ON pp.provider_id = s.provider_id
       JOIN users u ON u.user_id = pp.user_id
       LEFT JOIN payment p ON p.booking_id = b.booking_id
       LEFT JOIN review r ON r.booking_id = b.booking_id
       WHERE b.customer_id=? ORDER BY b.created_at DESC`, [cp[0].customer_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get provider's incoming bookings
router.get('/provider', authMiddleware, async (req, res) => {
  try {
    const [pp] = await db.execute('SELECT provider_id FROM provider_profile WHERE user_id=?', [req.user.user_id]);
    if (!pp.length) return res.status(400).json({ error: 'No provider profile' });
    const [rows] = await db.execute(
      `SELECT b.*, s.title as service_title, u.full_name as customer_name, u.phone,
        p.payment_status, p.payment_method, r.rating
       FROM booking b
       JOIN service s ON s.service_id = b.service_id AND s.provider_id=?
       JOIN customer_profile cp ON cp.customer_id = b.customer_id
       JOIN users u ON u.user_id = cp.user_id
       LEFT JOIN payment p ON p.booking_id = b.booking_id
       LEFT JOIN review r ON r.booking_id = b.booking_id
       ORDER BY b.created_at DESC`, [pp[0].provider_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking status
router.put('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const allowed = ['confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await db.execute('UPDATE booking SET status=? WHERE booking_id=?', [status, req.params.id]);
    // Mark payment as paid when confirmed
    if (status === 'confirmed') {
      await db.execute("UPDATE payment SET payment_status='paid', paid_at=NOW() WHERE booking_id=?", [req.params.id]);
    }
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
