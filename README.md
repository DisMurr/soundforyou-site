# SoundForYou Site

Marketing site and authenticated client portal for SoundForYou, deployed on Cloudflare Pages with Pages Functions, D1, and MailChannels.

## Features
- Responsive marketing pages (`/`, `/services`, `/contact`)
- Contact form protected by Cloudflare Turnstile, delivered through MailChannels
- Authenticated account area backed by D1 database and JWT cookies
- Cloudflare Pages Functions for `/api/register`, `/api/login`, `/api/me`, `/api/logout`, `/api/contact`, `/api/health`
- Modular frontend scripts with Parcel build pipeline

## Project Structure
```
.
├── src/
│   ├── index.html
│   ├── services.html
│   ├── contact.html
│   ├── account.html
│   ├── 404.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js
│   │   └── account-page.js
│   └── assets/
│       └── media/
│           └── logo.svg
├── functions/
│   ├── api/
│   │   ├── contact.js
│   │   ├── health.js
│   │   ├── hello.js
│   │   ├── login.js
│   │   ├── logout.js
│   │   ├── me.js
│   │   └── register.js
│   └── _lib/
│       ├── crypto.js
│       └── jwt.js
├── schema.sql
├── _routes.json
├── wrangler.toml
└── package.json
```

## Getting Started
```bash
npm install
npm run dev
```
This starts Parcel’s dev server on <http://localhost:1234>. Parcel watches all files under `src/`.

To generate an optimized production build:
```bash
npm run build
```
The build output is written to `dist/`.

## Cloudflare Pages Deployment
1. **Project configuration**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Functions directory: `functions`
2. **Production bindings**
   - D1 binding `DB`
   - Environment variables: `JWT_SECRET`, `TURNSTILE_SECRET`, `CONTACT_TO`
3. **Deploy**
   - Push to `main` to trigger the GitHub Actions workflow (requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`).
   - Manual fallback: `npx wrangler pages deploy dist --project-name soundforyou-site`
4. **Verify**
   - `GET /api/health` → JSON with binding checks
   - Visit `/account` to register, log in, view session, and log out

## Running Functions Locally
Create `.dev.vars` with the required secrets, then run:
```bash
npx wrangler pages dev
```
This starts the static site and Pages Functions locally. A local D1 database will be created as needed.

## Database
`schema.sql` defines the D1 schema:
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
Apply the schema to your production D1 database:
```bash
npx wrangler d1 execute <DATABASE_NAME> --file=schema.sql
```

## Testing & Quality
- `npm run lint` – ESLint (ES2021 browser config)
- `npm run format` – Prettier
- Manual checks: Lighthouse, WAVE accessibility audit, `/api/health`

## Troubleshooting
- **API returns HTML/404**: Verify Functions directory is set to `functions` and `_routes.json` is deployed.
- **JWT errors**: Ensure `JWT_SECRET` is set in the environment and consistent across deployments.
- **Turnstile/MailChannels**: Confirm `TURNSTILE_SECRET` and `CONTACT_TO` are set and the site key in `contact.html` matches your Turnstile widget.

## License
MIT