# Store Rating Server

Run:

```
cd server
npm install
npm run dev
```

Server exposes endpoints under `/api` for auth, users, stores, and ratings.

Seeding sample credentials:

```
node seed.js
```

This will insert three users and example stores. Default seeded credentials:

- Admin: `admin@example.com` / `Admin@123`
- User: `user@example.com` / `User@1234`
- Store Owner: `owner@example.com` / `Owner@1234`

