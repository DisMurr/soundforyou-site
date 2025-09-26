import { verifyJWT } from "../_lib/jwt.js";

const COOKIE_NAME = 'session';

export async function onRequestGet({ env, request }) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const token = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE_NAME + '='))?.split('=')[1];

  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  if (!env.DB) {
    console.error('Me endpoint error: D1 binding `DB` is not configured.');
    return new Response(JSON.stringify({ error: 'Service unavailable. Please try again later.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload?.sub) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const user = await env.DB.prepare('SELECT id, email, created_at FROM users WHERE id = ?1').bind(payload.sub).first();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    return new Response(JSON.stringify({ user }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    console.error('Me endpoint error:', e);
    return new Response(JSON.stringify({ error: 'Unexpected error fetching account.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
