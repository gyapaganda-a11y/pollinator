# DeepSynthesis Pollinator

> A local-first AI image studio. Generate, enhance, cut backgrounds, upscale — all free, all zero-auth, all running on your machine.

Pollinator is what happens when you stop thinking of AI image generation as a single "type prompt → save PNG" loop and start thinking of it as a workshop. It bundles a fast generation backend with a set of free, locally-running post-processing tools (background removal, upscaling) and a free LLM-powered prompt enhancer — and wraps the whole thing in a stunning local web UI that auto-opens in your browser with one command.

No API keys. No accounts. No telemetry. No rate limits worth worrying about. Built as a tool inside the **DeepSynthesis Engine** by Vincent Couey.

---

## Quick start

### Prerequisites

[Node.js 18 or newer](https://nodejs.org/en/download). If you don't have it, the setup script below opens the download page for you.

### Run it

**Windows**

```bat
setup.bat
```

**macOS / Linux**

```sh
chmod +x setup.sh
./setup.sh
```

Or, if you already have Node installed:

```sh
node server.mjs
```

Pollinator launches at **http://localhost:3000** and auto-opens in your browser. That's it.

---

## Features

### Generate

- **Free, no-auth image generation** through pollinations.ai (Flux, Flux-Realism, Flux-Anime, Flux-3D, Turbo)
- **Batch up to 8 variants per prompt** in a single click, each with its own random seed
- **Reproducible** — every output filename embeds its seed so you can re-roll any past gen exactly
- **Six built-in style presets** — boards meme, editorial cartoon, vinyl sticker, vaporwave, photoreal, cyberpunk — click to inject into your prompt
- **Sizes 512² to 1536×1024** in both portrait and landscape
- **Per-gen seed override** when you want determinism
- **Server-side prompt enhancement** (optional) — pollinations rewrites your prompt before generating
- **Watermark stripping** built in
- **Cmd/Ctrl + Enter** keyboard shortcut from the prompt field

### Enhance

- **One-click prompt enhancer** ✦ rewrites bare prompts into vivid, specific Flux-tuned prompts using a free LLM (`text.pollinations.ai`)
- Goes from `pepe smoking` to `a hand-drawn boards-style pepe the frog, exhaling thick stylized cloud, neon backlight, flat colors, wobbly outline, off-white background, sticker-friendly composition` in one click

### Post-process (runs locally in your browser)

- **Background removal** — segment the subject and produce a transparent PNG. Runs entirely client-side via the BRIA RMBG-1.4 ONNX model. After the first use the model is cached forever in your browser. Perfect for sticker workflows.
- All derivatives land back in the gallery alongside the originals

### Gallery

- **Live persistent gallery** of every generation, organized by timestamp
- **Lightbox preview** — click any thumbnail for a full-resolution view with one-click download, delete, and post-process tools
- **Drag-and-drop ordering by recency** — newest at the top, instantly visible

### Built for shipping

- **Zero npm dependencies** — the entire server runs on Node's standard library
- **Single command launch** — `node server.mjs`
- **Cross-platform** — Windows, macOS, Linux
- **Includes CLI** (`gen.mjs`) for scripting / batch workflows alongside the GUI
- **No telemetry, no analytics, no signup wall** — your prompts and outputs stay on your machine

---

## Models

| model | best for |
|---|---|
| `flux` | general-purpose, default |
| `flux-realism` | photographic outputs |
| `flux-anime` | anime / manga style |
| `flux-3d` | 3D-rendered / Pixar-ish |
| `turbo` | fastest, lower fidelity |

---

## CLI usage

The GUI is the main event, but there's a standalone CLI for scripts and batches.

```sh
# single prompt, 4 variants
node gen.mjs --prompt "pepe the frog holding a sign, sticker art" --n 4

# batch from prompts.txt (one prompt per line, # for comments)
node gen.mjs --file prompts.txt --n 2 --model flux --w 1024 --h 1024
```

| flag | default | notes |
|---|---|---|
| `--prompt "..."` | — | single prompt |
| `--file path` | — | newline-separated prompts |
| `--n N` | 1 | variants per prompt |
| `--model` | `flux` | see model table above |
| `--w` / `--h` | 1024 | dimensions |
| `--seed N` | random | reproducible output |
| `--nologo` | true | strip watermark |
| `--enhance` | false | server-side LLM prompt rewrite |

---

## API endpoints (the server exposes these locally)

| method | path | purpose |
|---|---|---|
| `POST` | `/api/generate` | `{ prompt, n, model, width, height, seed, nologo, enhance }` → generates image(s) |
| `POST` | `/api/enhance` | `{ prompt }` → returns `{ enhanced }` via free LLM |
| `POST` | `/api/save-derivative` | save a processed image back into `out/` |
| `GET` | `/api/gallery` | list all images in `out/` |
| `DELETE` | `/api/image/:filename` | delete an image |
| `GET` | `/out/*` | serve generated images |

---

## File layout

```
pollinator/
├── server.mjs          # local web server (GUI backend)
├── gen.mjs             # standalone CLI (no server needed)
├── public/
│   ├── index.html      # GUI shell
│   ├── styles.css      # visual system
│   ├── app.js          # frontend logic
│   ├── lattice-globe.js  # DeepSynthesis badge animation
│   └── favicon.svg
├── prompts.txt         # sample batch input for CLI
├── out/                # generated images (gitignored)
├── setup.bat           # Windows launcher (checks Node, runs server)
├── setup.sh            # macOS/Linux launcher
├── CHANGELOG.md
├── LICENSE
├── package.json
└── README.md
```

---

## Credits

Generation backend: [pollinations.ai](https://pollinations.ai) — free public image API
Prompt enhancement: [text.pollinations.ai](https://text.pollinations.ai) — free public LLM
Background removal: BRIA RMBG-1.4 via [transformers.js](https://huggingface.co/docs/transformers.js)

---

## License

MIT — see [LICENSE](LICENSE).

---

Built as a node of the **[DeepSynthesis](https://deepsynthesis.org)** Engine by **Vincent Couey**.
