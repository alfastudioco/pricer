import { timingSafeEqual } from 'crypto';

// Proxy to the Anthropic Messages API.
// Env vars needed: ANTHROPIC_API_KEY. Optional: AI_PASSWORD — when set, callers must send it
// (typed into the app once; never in the page source). When unset, the route is open.

// Only what the app itself sends gets through
const ALLOWED_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-4-20250514']);
const ALLOWED_BETAS  = new Set(['pdfs-2024-09-25', 'server-side-fallback-2026-07-01']);
const MAX_TOKENS     = 16000;

const passwordOk = (given) => {
  const expected = process.env.AI_PASSWORD;
  if (!expected) return true;
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!passwordOk(req.headers['x-password'])) return res.status(401).json({ error: { type: 'auth_error', message: 'Wrong AI password' } });

  const body = req.body || {};
  if (!ALLOWED_MODELS.has(body.model)) return res.status(400).json({ error: { type: 'invalid_request_error', message: `Model not allowed: ${body.model}` } });
  if (!(body.max_tokens > 0 && body.max_tokens <= MAX_TOKENS)) return res.status(400).json({ error: { type: 'invalid_request_error', message: `max_tokens must be 1–${MAX_TOKENS}` } });

  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };
    const betas = String(req.headers['anthropic-beta'] || '').split(',').map(s => s.trim()).filter(b => ALLOWED_BETAS.has(b));
    if (betas.length) headers['anthropic-beta'] = betas.join(',');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { type: 'proxy_error', message: err.message } });
  }
}
