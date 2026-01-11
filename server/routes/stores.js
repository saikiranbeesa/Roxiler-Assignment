const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const nameValidator = body('name').isLength({ min: 3, max: 200 }).withMessage('Store name 3-200 chars');
const addressValidator = body('address').isLength({ max: 400 }).withMessage('Address max 400 chars');

// Admin: add store
router.post('/', authenticateToken, requireRole('Admin'), [nameValidator, addressValidator, body('owner_id').optional().isInt()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, address, owner_id } = req.body;
  const stmt = db.prepare('INSERT INTO Stores (name, address, owner_id) VALUES (?, ?, ?)');
  stmt.run(name, address || null, owner_id || null, function(err) {
    if (err) return res.status(400).json({ message: err.message });
    res.json({ id: this.lastID, name, address, owner_id });
  });
});

// Public: list stores with search & sort
router.get('/', (req, res) => {
  const { q, sortBy = 'name', order = 'asc' } = req.query;
  let where = [];
  let params = [];
  if (q) { where.push('(name LIKE ? OR address LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = ['name','address','created_at'];
  const col = allowedSort.includes(sortBy) ? sortBy : 'name';
  const sql = `SELECT s.id, s.name, s.address, s.owner_id,
    (SELECT AVG(rating) FROM Ratings r WHERE r.store_id = s.id) AS avg_rating
    FROM Stores s ${whereSql} ORDER BY ${col} ${order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows.map(r => ({ ...r, avg_rating: r.avg_rating ? Number(r.avg_rating).toFixed(2) : null })));
  });
});

// Store owner: view store details and raters
router.get('/:id/owner-view', authenticateToken, requireRole('StoreOwner'), (req, res) => {
  const storeId = parseInt(req.params.id, 10);
  db.get('SELECT id, name, address, owner_id FROM Stores WHERE id = ?', [storeId], (err, store) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    if (store.owner_id !== req.user.id && req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
    db.all('SELECT u.id as user_id, u.name, u.email, r.rating, r.created_at FROM Ratings r JOIN Users u ON r.user_id = u.id WHERE r.store_id = ?', [storeId], (err2, rows) => {
      if (err2) return res.status(500).json({ message: err2.message });
      const avg = rows.length ? (rows.reduce((s,x)=>s+ x.rating,0)/rows.length).toFixed(2) : null;
      res.json({ store, raters: rows, avg_rating: avg });
    });
  });
});

module.exports = router;
