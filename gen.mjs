#!/usr/bin/env node
// Pollinations.ai image generator. Zero-auth. Reads prompts.txt (one per line)
// or a single --prompt arg. Outputs PNGs to ./out/.
//
// Usage:
//   node gen.mjs --prompt "pepe the frog holding a sign" --n 4
//   node gen.mjs --file prompts.txt --model flux --w 1024 --h 1024
//
// Flags: --prompt, --file, --n (variants per prompt, default 1),
//        --model (flux|flux-realism|flux-anime|flux-3d|turbo, default flux),
//        --w, --h (default 1024), --seed (default random per image),
//        --nologo (default true), --enhance (default false)

import fs from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? true : arr[i + 1]]);
    return acc;
  }, [])
);

const N = parseInt(args.n ?? 1, 10);
const W = parseInt(args.w ?? 1024, 10);
const H = parseInt(args.h ?? 1024, 10);
const MODEL = args.model ?? 'flux';
const NOLOGO = args.nologo !== 'false';
const ENHANCE = args.enhance === true || args.enhance === 'true';
const OUT_DIR = path.resolve('./out');

await fs.mkdir(OUT_DIR, { recursive: true });

let prompts = [];
if (args.file) {
  const raw = await fs.readFile(args.file, 'utf8');
  prompts = raw.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
} else if (args.prompt) {
  prompts = [args.prompt];
} else {
  console.error('Need --prompt "..." or --file prompts.txt');
  process.exit(1);
}

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50).replace(/^-|-$/g, '');
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

async function fetchOne(prompt, seed) {
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);
  url.searchParams.set('width', W);
  url.searchParams.set('height', H);
  url.searchParams.set('model', MODEL);
  url.searchParams.set('seed', seed);
  if (NOLOGO) url.searchParams.set('nologo', 'true');
  if (ENHANCE) url.searchParams.set('enhance', 'true');

  const res = await fetch(url, { headers: { 'User-Agent': 'pollinations-pipeline/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

let total = 0, ok = 0;
for (const prompt of prompts) {
  for (let i = 0; i < N; i++) {
    total++;
    const seed = Math.floor(Math.random() * 1e9);
    const file = path.join(OUT_DIR, `${stamp()}_${slugify(prompt)}_${seed}.png`);
    try {
      const buf = await fetchOne(prompt, seed);
      await fs.writeFile(file, buf);
      console.log(`OK  ${path.basename(file)}  (${buf.length} bytes)`);
      ok++;
    } catch (e) {
      console.error(`ERR "${prompt}" seed=${seed}: ${e.message}`);
    }
  }
}
console.log(`\nDone: ${ok}/${total} images -> ${OUT_DIR}`);
