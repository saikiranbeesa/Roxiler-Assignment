const supabase = require('./supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parseBody, jsonResponse, JWT_SECRET } = require('./_helpers');

exports.handler = async function(event) {
  const body = parseBody(event);
  const { name, email, password, address } = body;
  if (!name || !email || !password) return jsonResponse(400, { message: 'Missing fields' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const { data, error } = await supabase.from('users').insert([{ name, email, password_hash: hash, role: 'User', address }]).select('id,name,email,role');
    if (error) return jsonResponse(400, { message: error.message || error });
    const user = data && data[0] ? { id: data[0].id, name: data[0].name, email: data[0].email, role: data[0].role } : null;
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
    return jsonResponse(200, { token, user });
  } catch (err) { return jsonResponse(500, { message: err.message }); }
};
