// /functions/api/register.js
export default {
  async fetch(request, env, ctx) {
    // Immediate log (confirms Function executes — if missing in Dashboard, file not deployed)
    console.log('=== /api/register EXECUTING ===');
    console.log('Method received:', request.method);  // Must print "POST"
    console.log('Env bindings:', { hasDB: !!env.DB, hasJWT: !!env.JWT_SECRET });

    // Parse body (your payload)
    let body;
    try {
      body = await request.json();
      console.log('Body:', body);  // {"email":..., "password":...}
    } catch (e) {
      console.error('Body parse fail:', e);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { email, password } = body;

    // Validation (matches your JS: email trim, pw >=8)
    if (!email || !password || password.length < 8) {
      console.log('Validation fail:', { email: !!email, pwLen: password?.length });
      return new Response(JSON.stringify({ error: 'Email required, password min 8 chars' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // DB check (from wrangler.toml)
    if (!env.DB) {
      console.error('No DB binding (check wrangler.toml)');
      return new Response(JSON.stringify({ error: 'Server setup error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Hash password (nodejs_compat)
    let hashed;
    try {
      const encoder = new TextEncoder();
      const hash = await crypto.subtle.digest('SHA-256', encoder.encode(password));
      hashed = btoa(String.fromCharCode(...new Uint8Array(hash)));
      console.log('Hash OK');
    } catch (cryptoErr) {
      console.error('Crypto fail (check compat flags):', cryptoErr);
      return new Response(JSON.stringify({ error: 'Internal hash error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // DB insert
    try {
      // Check duplicate
      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
      if (existing) {
        return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }

      // Save
      const insert = await env.DB.prepare('INSERT INTO users (email, password) VALUES (?, ?)')
        .bind(email.toLowerCase(), hashed)  // Fixed: use hashed instead of hashedPassword
        .run();
      const userId = insert.meta.last_row_id;
      console.log('User created ID:', userId);

      // Simple token (no JWT lib)
      const token = btoa(JSON.stringify({ userId, email, exp: Date.now() + 86400000 }));
      console.log('Success: Token issued');

      return new Response(JSON.stringify({ success: true, token, user: { email } }), {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': `authToken=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`
        }
      });
    } catch (dbErr) {
      console.error('DB error:', dbErr.message);
      return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
};
