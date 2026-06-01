const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Submit review
router.post('/', authMiddleware, async (req, res) => {
  const { booking_id, reviewed_user_id, rating, comment } = req.body;
  if (!booking_id || !reviewed_user_id || !rating) return res.status(400).json({ error: 'Missing fields' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
  try {
    const [booking] = await db.execute("SELECT * FROM booking WHERE booking_id=? AND status='completed'", [booking_id]);
    if (!booking.length) return res.status(400).json({ error: 'Can only review completed bookings' });
    await db.execute(
      'INSERT INTO review (booking_id, reviewer_id, reviewed_user_id, rating, comment) VALUES (?,?,?,?,?)',
      [booking_id, req.user.user_id, reviewed_user_id, rating, comment || null]
    );
    res.json({ message: 'Review submitted' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Already reviewed' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
