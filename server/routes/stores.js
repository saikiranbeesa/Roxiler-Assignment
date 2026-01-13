const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const nameValidator = body('name').isLength({ min: 3, max: 200 }).withMessage('Store name 3-200 chars');
const addressValidator = body('address').isLength({ max: 400 }).withMessage('Address max 400 chars');

// Admin: add store
router.post('/', authenticateToken, requireRole('Admin'), [nameValidator, addressValidator, body('owner_id').optional().isInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { name, address, owner_id } = req.body;
    const { data, error } = await supabase.from('stores').insert([{ name, address: address || null, owner_id: owner_id || null }]).select('id,name,address,owner_id');
    if (error) return res.status(400).json({ message: error.message || error });
    res.json(data && data[0] ? data[0] : {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public: list stores with search & sort
router.get('/', async (req, res) => {
  try {
    const { q, sortBy = 'name', order = 'asc' } = req.query;
    const allowedSort = ['name','address','created_at'];
    const col = allowedSort.includes(sortBy) ? sortBy : 'name';

    let builder = supabase.from('stores').select('id,name,address,owner_id,created_at');
    if (q) builder = builder.or(`name.ilike.%${q}%,address.ilike.%${q}%`);
    builder = builder.order(col, { ascending: order.toLowerCase() !== 'desc' });

    const { data: stores, error } = await builder;
    if (error) return res.status(500).json({ message: error.message || error });

    // for each store, fetch avg rating
    const results = [];
    for (const s of (stores || [])) {
      const { data: ratings, error: rerr } = await supabase.from('ratings').select('rating').eq('store_id', s.id);
      if (rerr) return res.status(500).json({ message: rerr.message || rerr });
      const avg = ratings && ratings.length ? (ratings.reduce((a,b)=>a+ b.rating,0)/ratings.length).toFixed(2) : null;
      results.push({ ...s, avg_rating: avg });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Store owner: view store details and raters
router.get('/:id/owner-view', authenticateToken, requireRole('StoreOwner'), async (req, res) => {
  try {
    const storeId = parseInt(req.params.id, 10);
    const { data: store, error: sErr } = await supabase.from('stores').select('id,name,address,owner_id').eq('id', storeId).single();
    if (sErr) return res.status(500).json({ message: sErr.message || sErr });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    if (store.owner_id !== req.user.id && req.user.role !== 'Admin') return res.status(403).json({ message: 'Forbidden' });

    const { data: rows, error: rErr } = await supabase.from('ratings').select('rating,created_at,user_id').eq('store_id', storeId);
    if (rErr) return res.status(500).json({ message: rErr.message || rErr });

    // fetch user info for raters
    const userIds = [...new Set((rows || []).map(r=>r.user_id))];
    let usersMap = {};
    if (userIds.length) {
      const { data: users } = await supabase.from('users').select('id,name,email').in('id', userIds);
      usersMap = (users || []).reduce((acc,u)=>{ acc[u.id]=u; return acc; }, {});
    }

    const raters = (rows || []).map(r => ({ user_id: r.user_id, name: usersMap[r.user_id]?.name || null, email: usersMap[r.user_id]?.email || null, rating: r.rating, created_at: r.created_at }));
    const avg = raters.length ? (raters.reduce((s,x)=>s+ x.rating,0)/raters.length).toFixed(2) : null;
    res.json({ store, raters, avg_rating: avg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
