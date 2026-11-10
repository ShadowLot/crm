# ClientTrack CRM

A small customer relationship management system built as an internship project.
It tracks customers, a sales pipeline and follow-up activities, with a dashboard
that summarises the sales funnel.

## Stack

- **Frontend:** React 19, React Router 7, Vite 8, plain CSS
- **Backend:** Node.js 22, Express 5, better-sqlite3, zod, jsonwebtoken, bcryptjs, helmet, express-rate-limit
- **Database:** SQLite (single file, WAL mode)

## Run locally

```bash
# 1. API server
cd server
cp .env.example .env            # then set a random JWT_SECRET (32+ chars)
npm install
npm run seed                    # creates demo@clienttrack.local / Demo@12345
npm run dev                     # http://localhost:3000

# 2. React client (separate terminal)
cd client
npm install
npm run dev                     # http://localhost:5173  (proxies /api to :3000)
```

## Run tests

```bash
cd server && npm test
```

## Production build

```bash
cd client && npm run build      # outputs client/dist
cd ../server && NODE_ENV=production npm start   # serves API + built client on :3000
```

## Project layout

```
server/
  src/index.js          Express app, middleware, route mounting
  src/db.js             SQLite connection + schema
  src/auth.js           JWT cookie session helpers, requireAuth middleware
  src/validators.js     zod schemas for every request body
  src/routes/*.js       auth, customers, sales, activities, dashboard
  src/seed.js           demo data
  tests/api.test.js     API + security tests (node:test)
client/
  src/App.jsx           session bootstrap + routing
  src/api.js            fetch wrapper, label maps
  src/pages/*.jsx       Login, Dashboard, Customers, Sales, Activities
  src/components/*.jsx  Layout (sidebar), Modal
```

## Security notes

- Passwords hashed with bcrypt (cost 12); constant-time compare on login
- Session JWT stored in an `httpOnly`, `SameSite=Strict` cookie
- Every request body validated with zod; ids validated before use
- All SQL uses prepared statements with bound parameters
- Every query is scoped by `owner_id` so users cannot access each other's records
- `helmet` security headers, rate limiting on auth and general API, 50 kB body limit
- React escapes all rendered values by default (no `dangerouslySetInnerHTML` used)
