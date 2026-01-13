const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const supabase = require('./supabase');

function chunkArray(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

async function insertBatch(table, rows) {
  if (!rows.length) return;
  const chunks = chunkArray(rows, 100);
  for (const c of chunks) {
    const { error } = await supabase.from(table).insert(c);
    if (error) console.error(`Insert error for ${table}:`, error.message || error);
    else console.log(`Inserted ${c.length} rows into ${table}`);
  }
}

async function migrate() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment');
    process.exit(1);
  }

  const dbFile = path.join(__dirname, 'data.sqlite');
  const db = new sqlite3.Database(dbFile, sqlite3.OPEN_READONLY, (err) => {
    if (err) return console.error('Could not open sqlite DB:', err.message);
  });

  db.serialize(async () => {
    db.all('SELECT * FROM Users', async (err, users) => {
      if (err) { console.error(err); return; }
      const urows = users.map(u => ({ id: u.id, name: u.name, email: u.email, password_hash: u.password_hash, role: u.role, address: u.address, created_at: u.created_at }));
      await insertBatch('users', urows);

      db.all('SELECT * FROM Stores', async (err2, stores) => {
        if (err2) { console.error(err2); return; }
        const srows = stores.map(s => ({ id: s.id, name: s.name, address: s.address, owner_id: s.owner_id, created_at: s.created_at }));
        await insertBatch('stores', srows);

        db.all('SELECT * FROM Ratings', async (err3, ratings) => {
          if (err3) { console.error(err3); return; }
          const rrows = ratings.map(r => ({ id: r.id, user_id: r.user_id, store_id: r.store_id, rating: r.rating, created_at: r.created_at }));
          await insertBatch('ratings', rrows);

          console.log('Migration finished.');
          console.log('NOTE: If you preserved explicit IDs, update Postgres sequences in Supabase SQL editor:');
          console.log("Run: SELECT setval(pg_get_serial_sequence('users','id'), COALESCE(MAX(id), 1), true) FROM users;");
          console.log("and similar for 'stores' and 'ratings' to avoid sequence conflicts.");
          process.exit(0);
        });
      });
    });
  });
}

migrate();
