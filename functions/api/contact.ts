/**
 * Contact form endpoint — the only server-side code on the site.
 * Runs as a Cloudflare Pages Function at POST /api/contact.
 *
 * Flow: honeypot → Turnstile verification → validation → Resend e-mail.
 * Nothing is persisted anywhere (GDPR: transient processing only).
 *
 * Required environment variables (Cloudflare Pages → Settings → Variables):
 *   RESEND_API_KEY        — from resend.com (domain renatasiserova.cz verified)
 *   TURNSTILE_SECRET_KEY  — from Cloudflare Turnstile widget
 * Optional:
 *   CONTACT_TO            — recipient override (default: renata.siserova@re-max.cz)
 */

interface Env {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  CONTACT_TO?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

const DEFAULT_TO = 'renata.siserova@re-max.cz';
const FROM = 'Web renatasiserova.cz <web@renatasiserova.cz>';
const MAX_LEN = { name: 200, email: 320, phone: 50, message: 5000 };

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function successHtml(lang: string): Response {
  const cs = lang !== 'en';
  return new Response(
    `<!doctype html><html lang="${cs ? 'cs' : 'en'}"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${cs ? 'Zpráva odeslána' : 'Message sent'}</title>
<body style="font-family:sans-serif;max-width:34rem;margin:15vh auto;padding:0 1rem;color:#111110">
<h1>${cs ? 'Děkuji!' : 'Thank you!'}</h1>
<p>${cs ? 'Vaše zpráva je na cestě. Ozvu se vám co nejdříve.' : 'Your message is on its way. I will get back to you as soon as possible.'}</p>
<p><a href="${cs ? '/kontakt/' : '/en/contact/'}" style="color:#e8340c">${cs ? '← Zpět' : '← Back'}</a></p>
</body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

async function verifyTurnstile(secret: string, token: string, ip: string | null): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip ?? undefined }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;
  const wantsJson = (request.headers.get('Accept') ?? '').includes('application/json');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { ok: false, error: 'bad-request' });
  }

  const field = (name: string, max: number) =>
    String(form.get(name) ?? '')
      .trim()
      .slice(0, max);

  // 1. honeypot — bots fill it, humans never see it. Pretend success.
  if (field('website', 100)) {
    return wantsJson ? json(200, { ok: true }) : successHtml(field('lang', 5));
  }

  // 2. Turnstile (when configured)
  if (env.TURNSTILE_SECRET_KEY) {
    const token = String(form.get('cf-turnstile-response') ?? '');
    const ip = request.headers.get('CF-Connecting-IP');
    if (!token || !(await verifyTurnstile(env.TURNSTILE_SECRET_KEY, token, ip))) {
      return json(400, { ok: false, error: 'turnstile' });
    }
  }

  // 3. validation
  const name = field('name', MAX_LEN.name);
  const email = field('email', MAX_LEN.email);
  const phone = field('phone', MAX_LEN.phone);
  const message = field('message', MAX_LEN.message);
  const subject = field('subject', 300) || 'Poptávka z webu renatasiserova.cz';
  const lang = field('lang', 5);

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: 'validation' });
  }

  // 4. deliver via Resend
  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return json(500, { ok: false, error: 'not-configured' });
  }

  const text = [
    `Jméno: ${name}`,
    `E-mail: ${email}`,
    phone ? `Telefon: ${phone}` : null,
    '',
    message,
    '',
    '—',
    'Odesláno kontaktním formulářem na renatasiserova.cz',
  ]
    .filter((l) => l !== null)
    .join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [env.CONTACT_TO ?? DEFAULT_TO],
      reply_to: email,
      subject: `${subject} — ${name}`,
      text,
    }),
  });

  if (!res.ok) {
    console.error(`Resend error ${res.status}: ${await res.text()}`);
    return json(502, { ok: false, error: 'delivery' });
  }

  return wantsJson ? json(200, { ok: true }) : successHtml(lang);
}
