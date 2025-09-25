// Minimal scrypt-like hashing substitute using Web Crypto PBKDF2 as a stopgap.
// Note: For production-grade use, prefer scrypt/argon2 WASM. PBKDF2 here is Workers-compatible.

const enc = new TextEncoder();

async function pbkdf2(password, salt, iterations = 310000, length = 32, hash = 'SHA-256') {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash }, keyMaterial, length * 8);
  return new Uint8Array(bits);
}

function b64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64toBytes(b64str) {
  const bin = atob(b64str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? b64toBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await pbkdf2(password, salt);
  return { hash: b64(key), salt: b64(salt) };
}

export async function verifyPassword(password, hashB64, saltB64) {
  const { hash } = await hashPassword(password, saltB64);
  if (hash.length !== hashB64.length) return false;
  let same = 0;
  for (let i = 0; i < hash.length; i++) same |= hash.charCodeAt(i) ^ hashB64.charCodeAt(i);
  return same === 0;
}
