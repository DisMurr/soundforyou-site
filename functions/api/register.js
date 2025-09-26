// /functions/api/register.js
export default {
  async fetch(request, env, ctx) {
    // Deep diagnostics (logs if this prints → Function loads)
    console.log('=== /api/register FUNCTION LOADED & HIT ===');
    console.log('Request Method:', request.method, '(type:', typeof request.method, ')');  // Expect "POST", "string"
    console.log('Full Headers:', JSON.stringify([...request.headers.entries()]));  // Includes Content-Type
    console.log('Bindings Available:', {
      hasDB: !!env.DB,
      dbType: typeof env.DB,
      hasJWT_SECRET: !!env.JWT_SECRET && env.JWT_SECRET.length > 0
    });

    // TEST: Try DB query here (logs if binding works; no crash = good)
    try {
      if (env.DB) {
        const testRow = await env.DB.prepare('SELECT 1 as test').first();
        console.log('D1 Binding Test Passed:', testRow?.test === 1 ? 'OK' : 'Failed');
      } else {
        console.log('D1 Binding Missing - Function will 500 on DB use');
      }
    } catch (dbTestError) {
      console.error('D1 Test Error (early check):', dbTestError.message);
    }

    // Body parse (your 62-byte JSON)
    let body;
    try {
      body = await request.json();
      console.log('Body Parsed Successfully:', body);  // {email, password}
    } catch (e) {
      console.error('Body Parse Error:', e.message);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // TEMP: Bypass method check for testing (comment out after confirming POST)
    // if (request.method !== 'POST') {
    //   console.error('405: Would trigger here, but bypassed for debug. Method was:', request.method);
    //   return new Response(JSON.stringify({ 
    //     error: 'Bypassed method check - confirm if POST reaches here',
    //     method: request.method
    //   }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    // }

    // Re-enable for prod:
    if (request.method !== 'POST') {
      console.error('405 REAL: Expected POST, got', request.method);
      return new Response(JSON.stringify({ 
        error: 'Method Not Allowed: Use POST. (Logs sent to Cloudflare)',
        methodReceived: request.method,
        bindingsOK: !!env.DB
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Allow': 'POST' }
      });
    }

    console.log('Method OK: Proceeding with POST...');

    const { email, password, username = email?.split('@')[0] || 'user' } = body;  // Fallback username

    // Validate
    if (!email || !password || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Invalid email/password' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // JWT_SECRET check (errors here = 500 cause)
    if (!env.JWT_SECRET) {
      console.error('JWT_SECRET Missing - Cannot sign tokens');
      return new Response(JSON.stringify({ error: 'Server config: Auth secret unavailable' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Hash password (tests crypto)
    try {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
      const hashedPassword = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      console.log('Hashing Success (test)');
    } catch (hashError) {
      console.error('Crypto/Hash Error (bindings/compat issue?):', hashError.message);
      return new Response(JSON.stringify({ error: 'Server error: Hashing failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // DB operations (full reg)
    try {
      // Duplicate check
      const existing = await env.DB.prepare('SELECT id FROM users WHERE LOWER(email) = ?').bind(email.toLowerCase()).first();
      if (existing) {
        return new Response(JSON.stringify({ error: 'Email exists' }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }

      // Insert
      const insert = await env.DB.prepare(
        'INSERT INTO users (email, password, username) VALUES (?, ?, ?)'
      ).bind(email.toLowerCase(), hashedPassword, username).run();  // hashedPassword from above

      if (!insert.success) {
        console.error('DB Insert Error:', insert.error);
        return new Response(JSON.stringify({ error: 'Database save failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      const userId = insert.meta.last_row_id;

      // Token (uses JWT_SECRET)
      const payload = { userId, email: email.toLowerCase(), exp: Date.now() / 1000 + 86400 };
      // Simple HMAC (requires compat flags)
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', encoder.encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(payload)));
      const token = btoa(JSON.stringify(payload)) + '.' + btoa(String.fromCharCode(...new Uint8Array(sig)));

      console.log('Registration Complete for:', email);

      return new Response(JSON.stringify({ success: true, token, user: { id: userId, email } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': `authToken=${token}; HttpOnly; Secure; SameSite=Strict` }
      });
    } catch (dbError) {
      console.error('DB/JWT Error in Reg:', dbError);
      return new Response(JSON.stringify({ error: 'Internal error: ' + dbError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
};
