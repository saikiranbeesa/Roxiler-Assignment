const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let _client = null;

function loadEnvFromRoot() {
  // look for .env in repo root (two levels up from server folder)
  try {
    const rootEnv = path.join(__dirname, '..', '.env');
    if (fs.existsSync(rootEnv)) {
      const raw = fs.readFileSync(rootEnv, 'utf8');
      raw.split(/\r?\n/).forEach(line => {
        const m = line.match(/^([^=]+)=(.*)$/);
        if (m) {
          const key = m[1].trim();
          let val = m[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      });
    }
  } catch (e) {
    // ignore errors
  }
}

function getClient() {
  if (_client) return _client;
  // ensure env populated
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) loadEnvFromRoot();
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }
  _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return _client;
}

// export proxy so existing code can call `supabase.from(...)` directly
module.exports = new Proxy({}, {
  get(_, prop) {
    const c = getClient();
    const val = c[prop];
    if (typeof val === 'function') return val.bind(c);
    return val;
  }
});
