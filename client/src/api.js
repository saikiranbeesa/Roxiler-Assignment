const API_BASE = import.meta.env.VITE_API_BASE || window.__API_BASE__ || 'http://localhost:4000'
const API = API_BASE + '/api'

export async function post(path, body, token){
  const res = await fetch(API + path, {method:'POST', headers: {'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})}, body: JSON.stringify(body)});
  return res.json();
}

export async function get(path, token){
  const res = await fetch(API + path, {headers: {...(token?{Authorization:`Bearer ${token}`}:{})}});
  return res.json();
}

export default { post, get }
