const DEFAULT_NETLIFY = 'https://saikiran-roxiler.netlify.app/.netlify/functions'
const RAW_API_BASE = import.meta.env.VITE_API_BASE || window.__API_BASE__ || DEFAULT_NETLIFY
const API = RAW_API_BASE.endsWith('/') ? RAW_API_BASE.slice(0, -1) : RAW_API_BASE

function buildUrl(path) {
  // Normalize incoming path
  let p = path.startsWith('/') ? path.slice(1) : path;
  if (p.startsWith('api/')) p = p.slice(4);

  const isNetlify = API.includes('/.netlify/functions');
  if (!isNetlify) return API + (path.startsWith('/') ? path : '/' + path);

  // Map auth routes to function names: auth/login -> auth-login
  if (p.startsWith('auth/')) {
    const action = p.split('/')[1];
    return API + '/auth-' + action;
  }

  // Map store ratings helper: /stores/:id/ratings -> /ratings/:id
  const storeRatingsMatch = p.match(/^stores\/(\d+)\/ratings(?:\/.*)?$/);
  if (storeRatingsMatch) {
    return API + '/ratings/' + storeRatingsMatch[1];
  }

  // For other routes keep first segment as function name and preserve rest of path
  const parts = p.split('/');
  const func = parts[0];
  const rest = parts.slice(1).join('/');
  return API + '/' + func + (rest ? '/' + rest : '');
}

export async function post(path, body, token){
  const url = buildUrl(path);
  const res = await fetch(url, {method:'POST', headers: {'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})}, body: JSON.stringify(body)});
  return res.json();
}

export async function get(path, token){
  const url = buildUrl(path);
  const res = await fetch(url, {headers: {...(token?{Authorization:`Bearer ${token}`}:{})}});
  return res.json();
}

export default { post, get }
