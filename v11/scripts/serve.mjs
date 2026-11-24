import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { meters } from '../src/model.js';
import { appendTrace, emptyGallery, normalizeRhythm } from '../src/shared-model.js';

const dist = process.argv.includes('--dist');
const base = path.resolve(dist ? 'dist' : '.');
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wav': 'audio/wav', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

// In-memory stand-in for api/traces.js, so local runs exercise the shared gallery
// without a Blob token. Records vanish when the server stops.
let gallery = emptyGallery();
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Server-Time': String(Date.now()) });
  res.end(JSON.stringify(body));
};
async function api(req, res) {
  if (req.method === 'GET') return json(res, 200, gallery);
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 12000) return json(res, 400, { error: 'Input too large.' }); }
  try {
    const input = JSON.parse(body), s = input.settings;
    if (!/^[0-9a-f-]{36}$/.test(input.id) || !s || !meters[s.meter] || typeof s.helix !== 'boolean' || typeof s.startRight !== 'boolean') throw new Error('Invalid curve settings.');
    gallery = appendTrace(gallery, { id: input.id, createdAt: Date.now(), settings: { meter: s.meter, rhythm: normalizeRhythm(s.rhythm ?? '', s.meter), helix: s.helix, startRight: s.startRight } });
    return json(res, 200, gallery);
  } catch (error) { return json(res, 400, { error: error.message }); }
}

http.createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name === '/api/traces') return await api(req, res);
    let file = path.resolve(base, '.' + name);
    if (!file.startsWith(base + path.sep) && file !== base) throw Error();
    if ((await stat(file).catch(() => ({ isDirectory: () => false }))).isDirectory()) file += '/index.html';
    if (!dist && ['/vendor/', '/sounds/', '/shaders/', '/fonts/'].some(prefix => name.startsWith(prefix))) file = path.join(base, 'public', name);
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
