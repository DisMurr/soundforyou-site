import { verifyJWT } from "../_lib/jwt.js";

const COOKIE_NAME = 'session';

export async function onRequest(context) {
  const { request, env } = context;
  console.log('=== /api/me EXECUTING ===');
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  // Get token from cookie (set by register)
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/authToken=([^;]+)/);
  const token = match ? match[1] : request.headers.get('Authorization')?.replace('Bearer ', '') || '';

  if (!token) {
    console.log('No token — 401');
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  // Parse token (simple base64)
  try {
    const payload = JSON.parse(atob(token));
    if (Date.now() > payload.exp) {
      return new Response(JSON.stringify({ error: 'Token expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const user = await env.DB.prepare('SELECT id, email, username FROM users WHERE id = ?').bind(payload.userId).first();
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ user }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.log('Token parse fail:', e);
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
};
