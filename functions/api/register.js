// /functions/api/register.js
export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      const { email, password, username } = body;

      // Validation (prevents early errors)
      if (!email || !password || !username) {
        return new Response(JSON.stringify({ error: 'Missing email, password, or username' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'Password too short (min 6 chars)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check env.DB (log if missing → common 500 cause)
      if (!env.DB) {
        console.error('ERROR: DB binding not found in env');
        return new Response(JSON.stringify({ error: 'Server config error: Database unavailable' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check JWT_SECRET
      if (!env.JWT_SECRET) {
        console.error('ERROR: JWT_SECRET env var missing');
        return new Response(JSON.stringify({ error: 'Server config error: Auth secret missing' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Hash password (simple SHA-256; use bcrypt for prod if adding lib)
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashedPassword = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      // Check if user exists
      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ?')
        .bind(email.toLowerCase(), username).first();  // Case-insensitive email
      if (existing) {
        return new Response(JSON.stringify({ error: 'User with that email or username already exists' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Insert user
      const result = await env.DB.prepare('INSERT INTO users (email, password, username) VALUES (?, ?, ?) RETURNING id')
        .bind(email.toLowerCase(), hashedPassword, username).run();
      if (!result.success) {
        console.error('DB Insert Error:', result.error);  // Logs SQL failure
        return new Response(JSON.stringify({ error: 'Failed to save user to database' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const insertId = result.meta.last_row_id;  // Get inserted ID

      // Simple JWT (base64 encoded; for prod, use a lib like jose)
      const now = Math.floor(Date.now() / 1000);
      const payload = { userId: insertId, email: email.toLowerCase(), username, iat: now, exp: now + 86400 };  // 1 day expiry
      const tokenPayload = btoa(JSON.stringify(payload));
      const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));  // Unguarded for simplicity; use HS256 with secret for security
      const token = `${header}.${tokenPayload}.`;  // Unsigned for demo; sign below if needed

      // Optional: Sign with JWT_SECRET (uncomment for security)
      // const key = await crypto.subtle.importKey('raw', encoder.encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      // const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(header + '.' + tokenPayload));
      // const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
      // const token = `${header}.${tokenPayload}.${signature}`;

      console.log('Registration success for user:', username);  // Debug log

      return new Response(JSON.stringify({ success: true, token, user: { id: insertId, email: email.toLowerCase(), username } }), {
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': `authToken=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
        }
      });

    } catch (error) {
      console.error('Register Function Error:', error.message, error.stack);  // Logs everything to Cloudflare
      return new Response(JSON.stringify({ error: 'Internal server error: ' + error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
