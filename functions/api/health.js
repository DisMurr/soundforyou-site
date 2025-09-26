export async function onRequestGet({ env }) {
  // Quick check to verify env bindings and function execution
  const checks = {
    hasJWTSecret: typeof env.JWT_SECRET === 'string' && env.JWT_SECRET.length > 0,
    hasDB: !!env.DB,
    dbQueryOk: null,
  };

  if (env.DB) {
    try {
      const row = await env.DB.prepare('select 1 as ok').first();
      checks.dbQueryOk = row?.ok === 1;
    } catch {
      checks.dbQueryOk = false;
    }
  }

  return new Response(JSON.stringify({ ok: true, checks }), {
    headers: { 'content-type': 'application/json' }
  });
}
