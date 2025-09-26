import { verifyPassword } from "../_lib/crypto.js";
import { createJWT, makeSessionCookie, cookie } from "../_lib/jwt.js";

const COOKIE_NAME = 'session';

export async function onRequestPost({ env, request }) {
  try {
    if (!env.DB) {
      console.error('Login error: D1 binding `DB` is not configured.');
      return new Response(JSON.stringify({ error: 'Service unavailable. Please try again later.' }), {
        status: 503,
        headers: { 'content-type': 'application/json' }
      });
    }

    const { email, password } = await request.json();
    const emailNorm = (email || '').trim().toLowerCase();

    const row = await env.DB.prepare('SELECT id, pw_hash, pw_salt FROM users WHERE email = ?1')
      .bind(emailNorm)
      .first();

    if (!row) return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });

    const ok = await verifyPassword(password || '', row.pw_hash, row.pw_salt);
    if (!ok) return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });

    const token = await createJWT({ sub: row.id, email: emailNorm }, env.JWT_SECRET, 60 * 60 * 24 * 7);
    const setCookie = cookie(makeSessionCookie(COOKIE_NAME, token, 60 * 60 * 24 * 7));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json', ...setCookie }
    });
  } catch (e) {
    console.error('Login error:', e);
    return new Response(JSON.stringify({ error: 'Unexpected error logging in.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
