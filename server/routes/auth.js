const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
const { JWT_SECRET } = require('../middleware/auth');

// Validations
const nameValidator = body('name').isLength({ min: 20, max: 60 }).withMessage('Name must be 20-60 chars');
const emailValidator = body('email').isEmail().withMessage('Invalid email');
const passwordValidator = body('password').isLength({ min: 8, max: 16 }).matches(/[A-Z]/).matches(/[^A-Za-z0-9]/).withMessage('Password must be 8-16 with 1 uppercase and 1 special char');

router.post('/register', [nameValidator, emailValidator, passwordValidator], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { name, email, password, address } = req.body;
    const role = 'User';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const { data, error } = await supabase.from('users').insert([{ name, email, password_hash: hash, role, address }]).select('id,name,email,role');
    if (error) return res.status(400).json({ message: error.message || error });
    const user = data && data[0] ? { id: data[0].id, name: data[0].name, email: data[0].email, role: data[0].role } : null;
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', [emailValidator, body('password').exists()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.from('users').select('id,name,email,password_hash,role').eq('email', email).single();
    if (error) return res.status(400).json({ message: error.message || error });
    const row = data;
    if (!row) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = bcrypt.compareSync(password, row.password_hash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
