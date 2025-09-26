// /functions/api/register.js
// Handles POST to /api/register (creates user, issues token)

export default {
  async fetch(request, env, ctx) {
    // Deep logging for 405 diagnosis (shows in Cloudflare logs)
    console.log('=== REGISTER FUNCTION HIT ===');
    console.log('Method:', request.method);  // Should be "POST"
    console.log('URL:', request.url);
    console.log('Headers:', Object.fromEntries(request.headers.entries()));  // Includes Content-Type, Length
    console.log('Content-Length:', request.headers.get('content-length'));  // Should be 62

    // Body logging (parse early to see payload)
    let body;
    try {
      if (request.method === 'POST' && request.headers.get('content-type')?.includes('json')) {
        body = await request.json();
        console.log('Parsed Body:', body);  // e.g., {email: "darraghmurray@outlook.ie", password: "VallMurr90!1"}
      } else {
        console.log('No/Invalid body for non-POST or non-JSON');
      }
    } catch (parseError) {
      console.error('Body parse error:', parseError.message);
      body = null;
    }

    // Flexible method check (logs if fails)
    const isPost = request.method === 'POST';
    console.log('Is POST?', isPost);
    if (!isPost) {
      console.error('405 Triggered: Expected POST, got', request.method, '(type:', typeof request.method, ')');
      return new Response(JSON.stringify({
        error: `Method not allowed for registration. Expected POST, got ${request.method || 'undefined'}. Body parsed: ${!!body}`,
        receivedMethod: request.method,
        allowedMethods: ['POST'],
        suggestion: 'Check Function deployment and client fetch.'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Allow': 'POST'
        }
      });
    }

    // Proceed with POST logic (validation, DB, etc.)
    const { email, password } = body || {};
    console.log('Extracted data:', { email, hasPassword: !!password });

    // Validation
    if (!email || !password || password.length < 8) {
      console.log('Validation failed:', { email: !!email, pwLength: password?.length });
      return new Response(JSON.stringify({ error: 'Missing email/password or password <8 chars' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Env/DB checks
    if (!env.DB) {
      console.error('DB binding missing');
      return new Response(JSON.stringify({ error: 'Server config: No database' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    console.log('DB bound, JWT_SECRET present:', !!env.JWT_SECRET);

    // Hash password (SHA-256)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashedPassword = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('Password hashed (shortened):', hashedPassword.substring(0, 10) + '...');

    // Check existing user
    const existing = await env.DB.prepare('SELECT id FROM users WHERE LOWER(email) = ?')
      .bind(email.toLowerCase()).first();
    if (existing) {
      console.log('Duplicate email found');
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert user
    const result = await env.DB.prepare(
      'INSERT INTO users (email, password, username) VALUES (?, ?, ?)'  // Add username if in body
    ).bind(email.toLowerCase(), hashedPassword, body.username || email.split('@')[0]).run();  // Fallback username

    if (!result.success) {
      console.error('DB insert failed:', result.error);
      return new Response(JSON.stringify({ error: 'Failed to save user. Try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = result.meta.last_row_id;
    console.log('User inserted, ID:', userId);

    // Generate token (simple base64; secure with JWT_SECRET)
    const payload = {
      userId,
      email: email.toLowerCase(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400  // 1 day
    };
    const token = btoa(JSON.stringify(payload));  // Base64 for demo
    console.log('Token generated');

    console.log('=== REGISTRATION SUCCESS ===');

    return new Response(JSON.stringify({
      success: true,
      token,
      user: { id: userId, email: email.toLowerCase() }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `authToken=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
