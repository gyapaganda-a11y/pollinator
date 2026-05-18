#!/usr/bin/env node
// Pollinate Studio — local web GUI for pollinations.ai image generation.
// Zero npm dependencies. Just: node server.mjs

import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const OUT_DIR = path.join(__dirname, 'out');
const PUBLIC_DIR = path.join(__dirname, 'public');

await fs.mkdir(OUT_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50).replace(/^-|-$/g, '') || 'untitled';
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

async function serveStatic(req, res, root, urlPath) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, safePath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      return serveStatic(req, res, root, path.join(urlPath, 'index.html'));
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function generateImage({ prompt, model = 'flux', width = 1024, height = 1024, seed, nologo = true, enhance = false }) {
  const useSeed = seed ?? Math.floor(Math.random() * 1e9);
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);
  url.searchParams.set('width', width);
  url.searchParams.set('height', height);
  url.searchParams.set('model', model);
  url.searchParams.set('seed', useSeed);
  if (nologo) url.searchParams.set('nologo', 'true');
  if (enhance) url.searchParams.set('enhance', 'true');

  const upstream = await fetch(url, { headers: { 'User-Agent': 'pollinate-studio/1.0' } });
  if (!upstream.ok) throw new Error(`Pollinations ${upstream.status}: ${upstream.statusText}`);
  const buf = Buffer.from(await upstream.arrayBuffer());

  const filename = `${stamp()}_${slugify(prompt)}_${useSeed}.png`;
  const filepath = path.join(OUT_DIR, filename);
  await fs.writeFile(filepath, buf);
  return { filename, bytes: buf.length, seed: useSeed, prompt, model, width, height };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // API: generate
  if (req.method === 'POST' && url.pathname === '/api/generate') {
    try {
      const body = await readJson(req);
      const { prompt, n = 1, model, width, height, seed, nologo, enhance } = body;
      if (!prompt || typeof prompt !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'prompt required' }));
      }
      const count = Math.min(Math.max(parseInt(n) || 1, 1), 8);
      const results = [];
      const errors = [];
      for (let i = 0; i < count; i++) {
        try {
          const r = await generateImage({ prompt, model, width, height, seed: count === 1 ? seed : undefined, nologo, enhance });
          results.push(r);
        } catch (e) {
          errors.push(e.message);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ results, errors }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // API: enhance prompt via text.pollinations.ai
  if (req.method === 'POST' && url.pathname === '/api/enhance') {
    try {
      const { prompt } = await readJson(req);
      if (!prompt || typeof prompt !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'prompt required' }));
      }
      const messages = [
        {
          role: 'system',
          content: 'You are a prompt enhancer for the Flux image-generation model. Rewrite the user\'s brief prompt as a single vivid paragraph adding specific subject details, composition, lighting, color palette, art style, and quality keywords. Preserve the user\'s core subject and intent exactly. Output ONLY the enhanced prompt as a single paragraph with no preamble, no quotes, no explanation, no markdown.',
        },
        { role: 'user', content: prompt },
      ];
      const upstream = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'pollinate-studio/1.0' },
        body: JSON.stringify({ model: 'openai', messages, temperature: 0.7, max_tokens: 400 }),
      });
      if (!upstream.ok) throw new Error(`text.pollinations.ai ${upstream.status}`);
      const data = await upstream.json();
      const enhanced = (data?.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
      if (!enhanced) throw new Error('Empty enhancement response');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ enhanced, original: prompt }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // API: save derivative (processed image -> back into gallery)
  if (req.method === 'POST' && url.pathname === '/api/save-derivative') {
    try {
      const mimeType = (req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim();
      const origName = String(req.headers['x-source'] || `derivative-${Date.now()}.png`).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const suffix = String(req.headers['x-suffix'] || 'edit').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'edit';
      if (!/^image\//.test(mimeType)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Expected image/* content-type' }));
      }
      const chunks = [];
      let total = 0;
      const max = 50 * 1024 * 1024;
      for await (const chunk of req) {
        total += chunk.length;
        if (total > max) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Too large (max 50MB)' }));
        }
        chunks.push(chunk);
      }
      const buf = Buffer.concat(chunks);
      const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/jpeg' ? 'jpg' : 'webp';
      const base = origName.replace(/\.[^.]+$/, '');
      const filename = `${stamp()}_${base}_${suffix}.${ext}`;
      await fs.writeFile(path.join(OUT_DIR, filename), buf);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ filename, bytes: buf.length }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // API: gallery
  if (req.method === 'GET' && url.pathname === '/api/gallery') {
    try {
      const files = await fs.readdir(OUT_DIR);
      const images = await Promise.all(
        files
          .filter(f => /\.(png|jpe?g|webp)$/i.test(f))
          .map(async f => {
            const st = await fs.stat(path.join(OUT_DIR, f));
            return { filename: f, bytes: st.size, mtime: st.mtimeMs };
          })
      );
      images.sort((a, b) => b.mtime - a.mtime);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ images }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // API: delete
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/image/')) {
    const name = decodeURIComponent(url.pathname.slice('/api/image/'.length));
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
      res.writeHead(400).end('Bad name'); return;
    }
    try {
      await fs.unlink(path.join(OUT_DIR, name));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // Static: generated images
  if (req.method === 'GET' && url.pathname.startsWith('/out/')) {
    return serveStatic(req, res, OUT_DIR, url.pathname.slice('/out/'.length));
  }

  // Static: public UI
  if (req.method === 'GET') {
    const p = url.pathname === '/' ? '/index.html' : url.pathname;
    return serveStatic(req, res, PUBLIC_DIR, p);
  }

  res.writeHead(405).end('Method not allowed');
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Pollinate Studio is live`);
  console.log(`  -> ${url}\n`);
  // Try to open the browser automatically
  const opener = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  import('node:child_process').then(({ exec }) => exec(`${opener} ${url}`)).catch(() => {});
});
