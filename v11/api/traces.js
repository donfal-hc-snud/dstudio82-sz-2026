import { parseRhythm, meters } from '../src/model.js';
import { readGallery, saveTrace } from '../server/gallery-store.js';

function validate(body) {
  if (!body || !/^[a-f0-9-]{36}$/.test(body.id)) throw new Error('Invalid trace ID.');
  const s = body.settings;
  if (!s || !Number.isInteger(s.meter) || !meters[s.meter] || typeof s.helix !== 'boolean' || typeof s.startRight !== 'boolean') throw new Error('Invalid curve settings.');
  parseRhythm(s.rhythm, meters[s.meter]);
  return { id: body.id, createdAt: Date.now(), settings: {
    meter: s.meter, rhythm: s.rhythm.trim(), helix: s.helix, startRight: s.startRight
  }};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    try {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3');
      return res.status(200).json(await readGallery());
    } catch { return res.status(503).json({ error: 'Shared gallery temporarily unavailable.' }); }
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Invalid origin.' });
  let trace;
  try {
    if (Number(req.headers['content-length']) > 12000) throw new Error('Input too large.');
    trace = validate(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  } catch (error) { return res.status(400).json({ error: error.message }); }
  try { return res.status(200).json(await saveTrace(trace)); }
  catch { return res.status(503).json({ error: 'Saving delayed. Your browser will retry.' }); }
}
