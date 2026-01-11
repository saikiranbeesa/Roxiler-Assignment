const bcrypt = require('bcryptjs');
const { db, init } = require('./db');

init();

function runSeed() {
  db.serialize(() => {
    const users = [
      { name: 'Administrator Account Example', email: 'admin@example.com', password: 'Admin@123', role: 'Admin', address: 'Admin HQ' },
      { name: 'Regular User Example Name', email: 'user@example.com', password: 'User@1234', role: 'User', address: 'User Address' },
      { name: 'Store Owner Example Name', email: 'owner@example.com', password: 'Owner@1234', role: 'StoreOwner', address: 'Owner Address' }
    ];

    const insertUser = db.prepare('INSERT OR IGNORE INTO Users (name, email, password_hash, role, address) VALUES (?, ?, ?, ?, ?)');
    users.forEach(u => {
      const hash = bcrypt.hashSync(u.password, 10);
      insertUser.run(u.name, u.email, hash, u.role, u.address);
    });
    insertUser.finalize(() => {
      // Insert a couple of stores owned by the store owner
      db.get('SELECT id FROM Users WHERE email = ?', ['owner@example.com'], (err, ownerRow) => {
        const ownerId = ownerRow ? ownerRow.id : null;
        const insertStore = db.prepare('INSERT OR IGNORE INTO Stores (name, address, owner_id) VALUES (?, ?, ?)');
        insertStore.run('Example Store One', '123 Example St', ownerId);
        insertStore.run('Example Store Two', '456 Example Ave', ownerId);
        insertStore.finalize(() => {
          // Add a rating from the regular user to store 1
          db.get('SELECT id FROM Users WHERE email = ?', ['user@example.com'], (err2, userRow) => {
            db.get('SELECT id FROM Stores WHERE name = ?', ['Example Store One'], (err3, storeRow) => {
              if (userRow && storeRow) {
                const insertRating = db.prepare('INSERT OR IGNORE INTO Ratings (user_id, store_id, rating) VALUES (?, ?, ?)');
                insertRating.run(userRow.id, storeRow.id, 4);
                insertRating.finalize(() => {
                  console.log('Seeding complete. Credentials:');
                  console.log('Admin -> email: admin@example.com password: Admin@123');
                  console.log('User  -> email: user@example.com password: User@1234');
                  console.log('Owner -> email: owner@example.com password: Owner@1234');
                  process.exit(0);
                });
              } else {
                console.log('Seeding complete (partial). Check DB for inserted rows.');
                process.exit(0);
              }
            });
          });
        });
      });
    });
  });
}

runSeed();
