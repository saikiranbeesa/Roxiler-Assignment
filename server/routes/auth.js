const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// Validations
const nameValidator = body('name').isLength({ min: 20, max: 60 }).withMessage('Name must be 20-60 chars');
const emailValidator = body('email').isEmail().withMessage('Invalid email');
const passwordValidator = body('password').isLength({ min: 8, max: 16 }).matches(/[A-Z]/).matches(/[^A-Za-z0-9]/).withMessage('Password must be 8-16 with 1 uppercase and 1 special char');

router.post('/register', [nameValidator, emailValidator, passwordValidator], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, password, address } = req.body;
  const role = 'User';
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const stmt = db.prepare('INSERT INTO Users (name, email, password_hash, role, address) VALUES (?, ?, ?, ?, ?)');
  stmt.run(name, email, hash, role, address || null, function (err) {
    if (err) return res.status(400).json({ message: err.message });
    const user = { id: this.lastID, name, email, role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user });
  });
});

router.post('/login', [emailValidator, body('password').exists()], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  db.get('SELECT id, name, email, password_hash, role FROM Users WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!row) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = bcrypt.compareSync(password, row.password_hash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user });
  });
});

module.exports = router;
