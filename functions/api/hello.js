export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  return new Response(JSON.stringify({ ok: true, path: url.pathname, ts: Date.now() }), {
    headers: { 'content-type': 'application/json' }
  });
}
