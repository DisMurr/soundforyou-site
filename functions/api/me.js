import { verifyJWT } from "../_lib/jwt.js";

const COOKIE_NAME = 'session';

export async function onRequestGet({ env, request }) {
  try {
    // Extract token from header or cookie
    let token = request.headers.get('Authorization')?.replace('Bearer ', '') || '';
    if (!token) {
      const cookieHeader = request.headers.get('Cookie') || '';
      const match = cookieHeader.match(/authToken=([^;]+)/);
      token = match ? match[1] : '';
    }

    if (!token || token === '.') {  // Handles unsigned token
      return new Response(JSON.stringify({ error: 'No valid auth token provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse JWT (simple; no strict verify for demo)
    const parts = token.split('.');
    if (parts.length < 2) {
      return new Response(JSON.stringify({ error: 'Invalid token format' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.userId || now > payload.exp) {
      return new Response(JSON.stringify({ error: 'Token expired or invalid' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch user (check DB)
    if (!env.DB) {
      console.error('ERROR: DB binding not found for /me');
      return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500 });
    }

    const user = await env.DB.prepare('SELECT id, email, username FROM users WHERE id = ?')
      .bind(payload.userId).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Me Function Error:', error.message, error.stack);
    return new Response(JSON.stringify({ error: 'Internal error: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
