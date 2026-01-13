const supabase = require('./supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parseBody, jsonResponse, JWT_SECRET } = require('./_helpers');

exports.handler = async function(event) {
  const body = parseBody(event);
  const { email, password } = body;
  if (!email || !password) return jsonResponse(400, { message: 'Missing fields' });
  try {
    const { data, error } = await supabase.from('users').select('id,name,email,password_hash,role').eq('email', email).single();
    if (error) return jsonResponse(400, { message: error.message || error });
    const row = data;
    if (!row) return jsonResponse(400, { message: 'Invalid credentials' });
    const ok = bcrypt.compareSync(password, row.password_hash);
    if (!ok) return jsonResponse(400, { message: 'Invalid credentials' });
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
    return jsonResponse(200, { token, user });
  } catch (err) { return jsonResponse(500, { message: err.message }); }
};
