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

## Deploying to Cloudflare Pages (file-based routing)

1) Ensure structure (Functions at repo root)

```
.
├─ functions/
│  └─ api/
│     ├─ hello.js
│     ├─ health.js
│     ├─ register.js
│     ├─ login.js
│     ├─ me.js
│     └─ logout.js
├─ _routes.json             # { "version":1, "include":["/api/*"] }
├─ wrangler.toml            # compatibility_date, pages_build_output_dir
└─ static files (index.html, etc.)
```

2) Configure Wrangler (repo root)

```
name = "soundforyou-site"
compatibility_date = "2025-09-26"

[pages]
production_branch = "main"

[assets]
directory = "."

pages_build_output_dir = "."
```

3) Cloudflare Pages Project → Settings → Functions
- Toggle ON Functions for Production
- Functions directory: `functions`
- Add D1 binding: name `DB` → select your D1 database
- Add env vars: `JWT_SECRET`, `TURNSTILE_SECRET`, `CONTACT_TO`

4) Deploy
- Local: `wrangler pages dev .` then `wrangler pages deploy`
- Git: push to `main` to auto-deploy

5) Verify
- GET `/api/hello` → 200 JSON
- GET `/api/health` → { ok:true, checks: { hasJWTSecret, hasDB } }
- GET `/api/me` → 401 JSON (until logged in)
- Visit `/account` to register → login → me → logout flow

### Troubleshooting

- 404 for `/api/*`: Functions not enabled on Production, wrong Functions directory, or `_worker.js` overshadowing `/functions`.
- Import errors: Ensure ESM imports include `.js` (e.g., `../_lib/jwt.js`).
- D1 errors: Make sure the binding is `DB`, schema applied, and JWT_SECRET set.