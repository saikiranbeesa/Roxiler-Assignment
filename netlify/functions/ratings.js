const supabase = require('./supabase');
const { jsonResponse, parseBody, verifyToken } = require('./_helpers');

exports.handler = async function(event) {
  try {
    const pathParts = (event.path || '').split('/').filter(Boolean);
    // path like /.netlify/functions/ratings or /.netlify/functions/ratings/:id
    const storeId = pathParts.length >= 2 ? parseInt(pathParts[1], 10) : (event.queryStringParameters && parseInt(event.queryStringParameters.store_id,10));

    if (event.httpMethod === 'POST') {
      const user = verifyToken(event);
      if (!user || user.role !== 'User') return jsonResponse(403, { message: 'Forbidden' });
      const body = parseBody(event);
      const rating = body.rating;
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return jsonResponse(400, { message: 'Invalid rating' });
      const payload = { user_id: user.id, store_id: storeId, rating };
      const { data, error } = await supabase.from('ratings').upsert([payload], { onConflict: 'user_id,store_id' }).select('id');
      if (error) return jsonResponse(400, { message: error.message || error });
      return jsonResponse(200, { ok: true, id: data && data[0] ? data[0].id : null });
    }

    if (event.httpMethod === 'GET') {
      const { data: allRatings, error } = await supabase.from('ratings').select('rating').eq('store_id', storeId);
      if (error) return jsonResponse(500, { message: error.message || error });
      const count = allRatings ? allRatings.length : 0;
      const avg = count ? (allRatings.reduce((s,x)=>s + x.rating, 0)/count).toFixed(2) : null;
      const result = { avg_rating: avg, count };
      const userId = event.queryStringParameters && event.queryStringParameters.user_id ? parseInt(event.queryStringParameters.user_id,10) : null;
      if (userId) {
        const { data: ur, error: uerr } = await supabase.from('ratings').select('rating').eq('store_id', storeId).eq('user_id', userId).single();
        if (uerr && uerr.code !== 'PGRST116') return jsonResponse(500, { message: uerr.message || uerr });
        result.user_rating = ur ? ur.rating : null;
      }
      return jsonResponse(200, result);
    }

    return jsonResponse(405, { message: 'Method not allowed' });
  } catch (err) { return jsonResponse(500, { message: err.message }); }
};
