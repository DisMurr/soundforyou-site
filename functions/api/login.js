import { verifyPassword } from "../_lib/crypto";
import { createJWT, makeSessionCookie, cookie } from "../_lib/jwt";

const COOKIE_NAME = 'session';

export async function onRequestPost({ env, request }) {
  try {
    const { email, password } = await request.json();
    const emailNorm = (email || '').trim().toLowerCase();

    const row = await env.DB.prepare('SELECT id, pw_hash, pw_salt FROM users WHERE email = ?1')
      .bind(emailNorm)
      .first();

    if (!row) return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });

    const ok = await verifyPassword(password || '', row.pw_hash, row.pw_salt);
    if (!ok) return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });

    const token = await createJWT({ sub: row.id, email: emailNorm }, env.JWT_SECRET, 60 * 60 * 24 * 7);
    const headers = cookie(makeSessionCookie(COOKIE_NAME, token, 60 * 60 * 24 * 7));
    return new Response(JSON.stringify({ ok: true }), { headers, headers: { 'content-type': 'application/json', ...headers } });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 });
  }
}
