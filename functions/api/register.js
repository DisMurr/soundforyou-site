import { hashPassword } from "../_lib/crypto";

export async function onRequestPost({ env, request }) {
  try {
    const { email, password } = await request.json();
    if (typeof email !== 'string' || typeof password !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }
    const emailNorm = email.trim().toLowerCase();
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(emailNorm) || password.length < 8) {
      return new Response(JSON.stringify({ error: 'Invalid email or password too short' }), { status: 400 });
    }

    const { hash, salt } = await hashPassword(password);
    const stmt = env.DB.prepare('INSERT INTO users (email, pw_hash, pw_salt) VALUES (?1, ?2, ?3)');
    try {
      await stmt.bind(emailNorm, hash, salt).run();
    } catch (e) {
      if (String(e.message || e).includes('UNIQUE')) {
        return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 409 });
      }
      throw e;
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 });
  }
}
