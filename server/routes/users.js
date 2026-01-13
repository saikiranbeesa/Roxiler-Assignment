const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const nameValidator = body('name').isLength({ min: 20, max: 60 }).withMessage('Name must be 20-60 chars');
const emailValidator = body('email').isEmail().withMessage('Invalid email');
const passwordValidator = body('password').isLength({ min: 8, max: 16 }).matches(/[A-Z]/).matches(/[^A-Za-z0-9]/).withMessage('Password must be 8-16 with 1 uppercase and 1 special char');

// Admin: list users with filtering & sorting
router.get('/', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const { q, sortBy = 'name', order = 'asc', role } = req.query;
    const allowedSort = ['name','email','address','role','created_at'];
    const col = allowedSort.includes(sortBy) ? sortBy : 'name';

    let builder = supabase.from('users').select('id,name,email,role,address,created_at');
    if (q) builder = builder.or(`name.ilike.%${q}%,email.ilike.%${q}%,address.ilike.%${q}%`);
    if (role) builder = builder.eq('role', role);
    builder = builder.order(col, { ascending: order.toLowerCase() !== 'desc' });

    const { data, error } = await builder;
    if (error) return res.status(500).json({ message: error.message || error });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: create user
router.post('/', authenticateToken, requireRole('Admin'), [nameValidator, emailValidator, passwordValidator, body('role').isIn(['Admin','User','StoreOwner'])], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { name, email, password, role, address } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    const { data, error } = await supabase.from('users').insert([{ name, email, password_hash: hash, role, address }]).select('id,name,email,role');
    if (error) return res.status(400).json({ message: error.message || error });
    res.json(data && data[0] ? data[0] : {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update password (self or admin)
router.put('/:id/password', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (req.user.id !== userId && req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Missing password' });
  const ok = /.{8,16}/.test(password) && /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password);
  if (!ok) return res.status(400).json({ message: 'Password must be 8-16 with 1 uppercase and 1 special char' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const { data, error } = await supabase.from('users').update({ password_hash: hash }).eq('id', userId);
    if (error) return res.status(500).json({ message: error.message || error });
    res.json({ updated: data ? data.length : 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
