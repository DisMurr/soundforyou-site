// ENV VARS in Cloudflare Pages -> Settings -> Functions -> Environment variables
// CONTACT_TO: destination email, TURNSTILE_SECRET: Turnstile secret
export async function onRequestPost({ request, env }) {
  const form = await request.formData();

  const name = str(form.get('name'));
  const email = str(form.get('email'));
  const message = str(form.get('message'));
  const event_date = str(form.get('event_date'));
  const venue = str(form.get('venue'));
  const audience = str(form.get('audience'));
  const pkg = str(form.get('package'));
  const honey = str(form.get('company')); // honeypot
  const ts = str(form.get('cf-turnstile-response'));

  if (honey) return json({ ok: true }); // bot trap
  if (!name || !email || !message) return json({ ok: false, error: 'Missing required fields' }, 400);

  // Verify Turnstile
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: ts, remoteip: ip })
  }).then(r => r.json());
  if (!verify.success) return json({ ok:false, error:'Captcha failed' }, 400);

  // Determine recipient
  const toEmail = (env.CONTACT_TO || 'frank@soundforyou.ie').trim();

  // Compose email (MailChannels)
  const lines = [
    `Name: ${name}`,
    `Email: ${email}`,
    event_date ? `Event Date: ${event_date}` : '',
    venue ? `Venue: ${venue}` : '',
    audience ? `Guests: ${audience}` : '',
    pkg ? `Package: ${pkg}` : '',
    '',
    'Message:',
    message
  ].filter(Boolean).join('\n');

  const payload = {
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: 'no-reply@soundforyou.ie', name: 'SoundForYou Website' },
    subject: `New enquiry – ${name}`,
    content: [{ type: 'text/plain', value: lines }],
    reply_to: { email, name }
  };

  const sent = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!sent.ok) {
    const detail = await sent.text().catch(() => '');
    return json({ ok:false, error:'Mail send failed', detail }, 500);
  }

  return new Response(thanksHTML(), { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

const str = v => (v || '').toString().trim();
const json = (obj, status=200) => new Response(JSON.stringify(obj), { status, headers:{'content-type':'application/json; charset=utf-8'} });

function thanksHTML(){
  return `<!doctype html><meta charset="utf-8"><title>Thanks</title>
  <style>body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:0;padding:40px;text-align:center;color:#1e3a5f}
  .card{display:inline-block;padding:24px 28px;border:1.5px solid #1e3a5f;border-radius:14px;background:#f7f9fc}</style>
  <div class="card"><h1>Thanks!</h1><p>Your enquiry has been sent. We'll reply shortly.</p>
  <p><a href="/">Back to home</a></p></div>`;
}
