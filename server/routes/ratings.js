const express = require('express');
const router = express.Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.post('/', authenticateToken, requireRole('User'), [body('rating').isInt({ min: 1, max: 5 })], (req, res) => {
  const storeId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { rating } = req.body;
  // upsert: try update first
  db.run('UPDATE Ratings SET rating = ?, created_at = CURRENT_TIMESTAMP WHERE user_id = ? AND store_id = ?', [rating, userId, storeId], function(err) {
    if (err) return res.status(500).json({ message: err.message });
    if (this.changes) return res.json({ updated: true });
    const stmt = db.prepare('INSERT INTO Ratings (user_id, store_id, rating) VALUES (?, ?, ?)');
    stmt.run(userId, storeId, rating, function(err2) {
      if (err2) return res.status(400).json({ message: err2.message });
      res.json({ created: true, id: this.lastID });
    });
  });
});

// Get overall and/or user's rating for a store
router.get('/', (req, res) => {
  const storeId = parseInt(req.params.id, 10);
  const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
  db.get('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM Ratings WHERE store_id = ?', [storeId], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    const result = { avg_rating: row.avg_rating ? Number(row.avg_rating).toFixed(2) : null, count: row.count };
    if (userId) {
      db.get('SELECT rating FROM Ratings WHERE store_id = ? AND user_id = ?', [storeId, userId], (err2, r2) => {
        if (err2) return res.status(500).json({ message: err2.message });
        result.user_rating = r2 ? r2.rating : null;
        res.json(result);
      });
    } else res.json(result);
  });
});

module.exports = router;
