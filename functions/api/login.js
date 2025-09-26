import { verifyPassword } from "../_lib/crypto.js";
import { createJWT, makeSessionCookie, cookie } from "../_lib/jwt.js";

const COOKIE_NAME = 'session';

export async function onRequest(context) {
  const { request, env } = context;
  console.log('=== /api/login EXECUTING ===');
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { email, password } = await request.json();
    const emailNorm = (email || '').trim().toLowerCase();

    if (!email || !password || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!env.DB) {
      console.error('Login error: D1 binding `DB` is not configured.');
      return new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    // Hash the input password
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    const hashed = btoa(String.fromCharCode(...new Uint8Array(hash)));

    // Find user
    const row = await env.DB.prepare('SELECT id, email, password FROM users WHERE email = ?')
      .bind(emailNorm)
      .first();

    if (!row || row.password !== hashed) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Create token
    const token = btoa(JSON.stringify({ userId: row.id, email: row.email, exp: Date.now() + 86400000 }));

    return new Response(JSON.stringify({ success: true, token, user: { email: row.email } }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Set-Cookie': `authToken=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
