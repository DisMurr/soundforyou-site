# soundforyou-site

Auth (Cloudflare Pages Functions + D1 + JWT cookies)

Endpoints
- POST /api/register — create account
- POST /api/login — sign in (sets HttpOnly session cookie)
- GET /api/me — get the signed-in user (protected)
- POST /api/logout — clear session

Project files
- functions/_lib/crypto.js — PBKDF2-based password hashing (Workers-compatible)
- functions/_lib/jwt.js — HS256 JWT + cookie helpers
- functions/api/register.js — register user
- functions/api/login.js — login + set cookie
- functions/api/me.js — protected user endpoint
- functions/api/logout.js — clear cookie
- _routes.json — route only /api/* to Functions
- schema.sql — D1 schema for users table

Setup (Cloudflare)
1) Create D1 database and table
	- Locally: npx wrangler d1 create my_auth_db
	- Apply schema: npx wrangler d1 execute my_auth_db --file=schema.sql
	- In Pages → Settings → Functions → D1 bindings: add binding DB → my_auth_db
2) Environment variables
	- JWT_SECRET: a long random string (64+ chars)
3) Local dev
	- Create .dev.vars with JWT_SECRET=your-secret
	- Run: npx wrangler pages dev

Usage (front-end)
// register
fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });

// login
fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });

// get current user
fetch('/api/me').then(r => r.json());

// logout
fetch('/api/logout', { method: 'POST' });

Notes
- The crypto helper uses PBKDF2 as a Workers-safe baseline. You can swap to scrypt/argon2 WASM later.
- Cookies are HttpOnly; Secure; SameSite=Lax. JWT lives in the cookie only.