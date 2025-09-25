import { clearCookie, cookie } from "../_lib/jwt";

const COOKIE_NAME = 'session';

export async function onRequestPost() {
  const headers = cookie(clearCookie(COOKIE_NAME));
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', ...headers } });
}
