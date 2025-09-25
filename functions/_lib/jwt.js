function b64url(input) {
  const str = typeof input === 'string' ? input : btoa(String.fromCharCode(...input));
  return str.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function signHMACSHA256(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

export async function createJWT(payload, secret, expSeconds = 60 * 60 * 24 * 7) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const full = { iat: now, exp: now + expSeconds, ...payload };

  const h = b64url(btoa(JSON.stringify(header)));
  const p = b64url(btoa(JSON.stringify(full)));
  const toSign = `${h}.${p}`;
  const sigRaw = await signHMACSHA256(secret, toSign);
  let bin = '';
  for (const c of sigRaw) bin += String.fromCharCode(c);
  const sig = b64url(btoa(bin));
  return `${toSign}.${sig}`;
}

export async function verifyJWT(token, secret) {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const toSign = `${h}.${p}`;
    const sBytes = Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
    const expected = await signHMACSHA256(secret, toSign);
    if (sBytes.length !== expected.length) return null;
    let same = 0;
    for (let i = 0; i < sBytes.length; i++) same |= sBytes[i] ^ expected[i];
    if (same !== 0) return null;
    const payload = JSON.parse(atob(p.replaceAll('-', '+').replaceAll('_', '/')));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookie(headerValue) {
  return { 'Set-Cookie': headerValue };
}

export function makeSessionCookie(name, value, maxAgeSeconds) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
