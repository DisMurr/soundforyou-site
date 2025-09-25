// Lightweight scrypt-based password hashing for Cloudflare Workers/Pages
// Uses @noble/hashes (pure TS) to avoid native deps.
import { scrypt } from "@noble/hashes/scrypt";
import { bytesToBase64, base64ToBytes } from "@noble/hashes/utils";

// Derive a 32-byte key using scrypt
export async function hashPassword(password: string, saltB64?: string) {
  const salt = saltB64 ? base64ToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const N = 1 << 15; // 32768
  const r = 8;
  const p = 1;
  const dkLen = 32;

  const key = scrypt(new TextEncoder().encode(password), salt, { N, r, p, dkLen });
  return {
    hash: bytesToBase64(key),
    salt: bytesToBase64(salt),
  };
}

export async function verifyPassword(password: string, hashB64: string, saltB64: string) {
  const { hash } = await hashPassword(password, saltB64);
  // constant-time-ish compare of base64 strings
  if (hash.length !== hashB64.length) return false;
  let same = 0;
  for (let i = 0; i < hash.length; i++) same |= hash.charCodeAt(i) ^ hashB64.charCodeAt(i);
  return same === 0;
}
