const express = require('express');
const router = express.Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const supabase = require('../supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.post('/', authenticateToken, requireRole('User'), [body('rating').isInt({ min: 1, max: 5 })], async (req, res) => {
  const storeId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { rating } = req.body;
  try {
    const payload = { user_id: userId, store_id: storeId, rating };
    const { data, error } = await supabase.from('ratings').upsert([payload], { onConflict: 'user_id,store_id' }).select('id');
    if (error) return res.status(400).json({ message: error.message || error });
    res.json({ ok: true, id: data && data[0] ? data[0].id : null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get overall and/or user's rating for a store
router.get('/', async (req, res) => {
  const storeId = parseInt(req.params.id, 10);
  const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
  try {
    const { data: allRatings, error } = await supabase.from('ratings').select('rating').eq('store_id', storeId);
    if (error) return res.status(500).json({ message: error.message || error });
    const count = allRatings ? allRatings.length : 0;
    const avg = count ? (allRatings.reduce((s,x)=>s + x.rating, 0)/count).toFixed(2) : null;
    const result = { avg_rating: avg, count };
    if (userId) {
      const { data: ur, error: uerr } = await supabase.from('ratings').select('rating').eq('store_id', storeId).eq('user_id', userId).single();
      if (uerr && uerr.code !== 'PGRST116') return res.status(500).json({ message: uerr.message || uerr });
      result.user_rating = ur ? ur.rating : null;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
