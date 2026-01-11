const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const nameValidator = body('name').isLength({ min: 20, max: 60 }).withMessage('Name must be 20-60 chars');
const emailValidator = body('email').isEmail().withMessage('Invalid email');
const passwordValidator = body('password').isLength({ min: 8, max: 16 }).matches(/[A-Z]/).matches(/[^A-Za-z0-9]/).withMessage('Password must be 8-16 with 1 uppercase and 1 special char');

// Admin: list users with filtering & sorting
router.get('/', authenticateToken, requireRole('Admin'), (req, res) => {
  const { q, sortBy = 'name', order = 'asc', role } = req.query;
  let where = [];
  let params = [];
  if (q) { where.push('(name LIKE ? OR email LIKE ? OR address LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (role) { where.push('role = ?'); params.push(role); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const allowedSort = ['name','email','address','role','created_at'];
  const col = allowedSort.includes(sortBy) ? sortBy : 'name';
  const sql = `SELECT id, name, email, role, address, created_at FROM Users ${whereSql} ORDER BY ${col} ${order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});

// Admin: create user
router.post('/', authenticateToken, requireRole('Admin'), [nameValidator, emailValidator, passwordValidator, body('role').isIn(['Admin','User','StoreOwner'])], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, password, role, address } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare('INSERT INTO Users (name, email, password_hash, role, address) VALUES (?, ?, ?, ?, ?)');
  stmt.run(name, email, hash, role, address || null, function(err) {
    if (err) return res.status(400).json({ message: err.message });
    res.json({ id: this.lastID, name, email, role });
  });
});

// Update password (self or admin)
router.put('/:id/password', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (req.user.id !== userId && req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Missing password' });
  const ok = /.{8,16}/.test(password) && /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password);
  if (!ok) return res.status(400).json({ message: 'Password must be 8-16 with 1 uppercase and 1 special char' });
  const hash = bcrypt.hashSync(password, 10);
  db.run('UPDATE Users SET password_hash = ? WHERE id = ?', [hash, userId], function(err) {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ updated: this.changes });
  });
});

module.exports = router;
