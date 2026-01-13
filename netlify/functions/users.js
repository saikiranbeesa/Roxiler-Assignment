const supabase = require('./supabase');
const { jsonResponse, parseBody, verifyToken } = require('./_helpers');

exports.handler = async function(event) {
  try {
    const user = verifyToken(event);
    if (!user) return jsonResponse(401, { message: 'Not authenticated' });
    if (event.httpMethod === 'GET') {
      // Admin only for listing
      if (user.role !== 'Admin') return jsonResponse(403, { message: 'Forbidden' });
      const q = event.queryStringParameters && event.queryStringParameters.q;
      const sortBy = (event.queryStringParameters && event.queryStringParameters.sortBy) || 'name';
      const order = (event.queryStringParameters && event.queryStringParameters.order) || 'asc';
      let builder = supabase.from('users').select('id,name,email,role,address,created_at');
      if (q) builder = builder.or(`name.ilike.%${q}%,email.ilike.%${q}%,address.ilike.%${q}%`);
      builder = builder.order(sortBy, { ascending: order.toLowerCase() !== 'desc' });
      const { data, error } = await builder;
      if (error) return jsonResponse(500, { message: error.message || error });
      return jsonResponse(200, data || []);
    }

    return jsonResponse(405, { message: 'Method not allowed' });
  } catch (err) { return jsonResponse(500, { message: err.message }); }
};
