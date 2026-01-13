const supabase = require('./supabase');
const { jsonResponse, parseBody, verifyToken } = require('./_helpers');

exports.handler = async function(event) {
  try {
    if (event.httpMethod === 'GET') {
      const q = event.queryStringParameters && event.queryStringParameters.q;
      const sortBy = (event.queryStringParameters && event.queryStringParameters.sortBy) || 'name';
      const order = (event.queryStringParameters && event.queryStringParameters.order) || 'asc';
      let builder = supabase.from('stores').select('id,name,address,owner_id,created_at');
      if (q) builder = builder.or(`name.ilike.%${q}%,address.ilike.%${q}%`);
      builder = builder.order(sortBy, { ascending: order.toLowerCase() !== 'desc' });
      const { data: stores, error } = await builder;
      if (error) return jsonResponse(500, { message: error.message || error });
      // compute avg for each
      const out = [];
      for (const s of (stores || [])) {
        const { data: ratings } = await supabase.from('ratings').select('rating').eq('store_id', s.id);
        const avg = ratings && ratings.length ? (ratings.reduce((a,b)=>a + b.rating,0)/ratings.length).toFixed(2) : null;
        out.push({ ...s, avg_rating: avg });
      }
      return jsonResponse(200, out);
    }

    if (event.httpMethod === 'POST') {
      const user = verifyToken(event);
      if (!user || user.role !== 'Admin') return jsonResponse(403, { message: 'Forbidden' });
      const body = parseBody(event);
      const { name, address, owner_id } = body;
      const { data, error } = await supabase.from('stores').insert([{ name, address: address || null, owner_id: owner_id || null }]).select('id,name,address,owner_id');
      if (error) return jsonResponse(400, { message: error.message || error });
      return jsonResponse(200, data && data[0] ? data[0] : {});
    }

    return jsonResponse(405, { message: 'Method not allowed' });
  } catch (err) { return jsonResponse(500, { message: err.message }); }
};
