// Cloudflare Pages Advanced Mode Worker
// Routes /api/* to the existing handlers from functions/api/* and serves static assets via ASSETS.

import * as hello from './functions/api/hello.js';
import * as health from './functions/api/health.js';
import * as me from './functions/api/me.js';
import * as register from './functions/api/register.js';
import * as login from './functions/api/login.js';
import * as logout from './functions/api/logout.js';
import * as contact from './functions/api/contact.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    // Helper to call a Pages Function-style handler
    const call = async (mod, kind) => {
      const handler = mod?.[kind];
      if (typeof handler !== 'function') return new Response('Not Implemented', { status: 501 });
      // Minimal context compatible with onRequest{Get,Post}
      return handler({ env, request });
    };

    // API routing
    if (pathname.startsWith('/api/')) {
      // Simple exact-route matching
      if (pathname === '/api/hello' && method === 'GET') return call(hello, 'onRequestGet');
      if (pathname === '/api/health' && method === 'GET') return call(health, 'onRequestGet');
      if (pathname === '/api/me' && method === 'GET') return call(me, 'onRequestGet');
      if (pathname === '/api/register' && method === 'POST') return call(register, 'onRequestPost');
      if (pathname === '/api/login' && method === 'POST') return call(login, 'onRequestPost');
      if (pathname === '/api/logout' && method === 'POST') return call(logout, 'onRequestPost');
      if (pathname === '/api/contact' && method === 'POST') return call(contact, 'onRequestPost');

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Static asset fallback
    return env.ASSETS.fetch(request);
  }
};
