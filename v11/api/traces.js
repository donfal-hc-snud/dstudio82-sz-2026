import { meters } from '../src/model.js';
import { normalizeRhythm } from '../src/shared-model.js';
import { readGallery, saveTrace } from '../server/gallery-store.js';

const traceId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function validate(body) {
  if (!body || typeof body.id !== 'string' || !traceId.test(body.id)) throw new Error('Invalid trace ID.');
  const s = body.settings;
  if (!s || !Number.isInteger(s.meter) || !meters[s.meter] || typeof s.helix !== 'boolean' || typeof s.startRight !== 'boolean') throw new Error('Invalid curve settings.');
  return { id: body.id, createdAt: Date.now(), settings: {
    meter: s.meter, rhythm: normalizeRhythm(s.rhythm ?? '', s.meter), helix: s.helix, startRight: s.startRight
  }};
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false; // Browsers always send Origin on a cross-document POST.
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

// Best effort: each function instance keeps its own window. It slows scripted
// floods; it is not a security boundary.
const windowMs = 60_000, maxPerWindow = 120, hits = new Map();
function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || 'unknown';
  const at = Date.now();
  const recent = (hits.get(ip) || []).filter(t => at - t < windowMs);
  recent.push(at);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [key, list] of hits) if (at - list.at(-1) >= windowMs) hits.delete(key);
  return recent.length > maxPerWindow;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Server-Time', String(Date.now()));
  if (req.method === 'GET') {
    try {
      const gallery = await readGallery();
      res.setHeader('X-Server-Time', String(Date.now()));
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3');
      return res.status(200).json(gallery);
    } catch { return res.status(503).json({ error: 'Shared gallery temporarily unavailable.' }); }
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'Invalid origin.' });
  if (limited(req)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many records. Your browser will retry.' });
  }
  let trace;
  try {
    if (Number(req.headers['content-length']) > 12000) throw new Error('Input too large.');
    trace = validate(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  } catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const gallery = await saveTrace(trace);
    res.setHeader('X-Server-Time', String(Date.now()));
    return res.status(200).json(gallery);
  } catch { return res.status(503).json({ error: 'Saving delayed. Your browser will retry.' }); }
}
