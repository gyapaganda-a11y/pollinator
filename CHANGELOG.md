# Changelog

All notable changes to DeepSynthesis Pollinator.

## [0.1.0] — 2026-05-18

Initial release. Built end-to-end in a single session.

### Added — Generation core
- `gen.mjs` standalone CLI for batch image generation through pollinations.ai (Flux / Turbo family)
- Reproducible filenames embedding timestamp + prompt slug + seed
- Six built-in style preset scaffolds (boards meme, editorial cartoon, vinyl sticker, vaporwave, photoreal, cyberpunk)
- `prompts.txt` batch input format

### Added — Local web server (`server.mjs`)
- Zero-npm-dependency Node HTTP server
- `POST /api/generate` for single-prompt batch generation (up to 8 variants)
- `GET /api/gallery` to list saved images
- `DELETE /api/image/:filename` for cleanup
- `GET /out/*` static serving of generated images
- Auto-opens default browser to `http://localhost:3000` on launch

### Added — Web UI
- Dark-mode visual system with aurora gradient background, film grain overlay, glass panels
- Inter / Space Grotesk / JetBrains Mono typography
- Prompt composer with model / variants / size / seed controls
- Live gallery with masonry layout, hover metadata, shimmer skeletons while generating
- Lightbox preview with one-click download + delete
- Keyboard shortcut Cmd/Ctrl+Enter to generate

### Added — Prompt enhancer
- ✦ enhance button next to the prompt field
- Server-side proxy `POST /api/enhance` to `text.pollinations.ai` free LLM
- Rewrites bare prompts into vivid, Flux-tuned single-paragraph prompts

### Added — Client-side post-processing
- Lazy-loaded `@huggingface/transformers` (transformers.js v3) via CDN
- **Background removal** via BRIA RMBG-1.4 with the `AutoModel` + `AutoProcessor` pattern — runs entirely in the browser, produces transparent PNGs
- `POST /api/save-derivative` endpoint to drop processed images back into the gallery
- Full-screen busy overlay with progress bar during model downloads and inference

### Added — Brand surfaces
- Custom SVG favicon (animated flower / molecule mark)
- Tab title "DeepSynthesis Pollinator"
- Brand mark + tagline "Created by Vincent of DeepSynthesis for free<3"
- Floating bottom-right DeepSynthesis badge with the animated lattice globe (copper dot grid + teal tropic rings + violet pings) linking to deepsynthesis.org

### Added — Distribution
- `setup.bat` / `setup.sh` launchers that detect Node and open the official download page if missing
- `.gitignore` excluding `out/`, `node_modules/`, OS metadata
- `package.json` with `bin` entries for both the GUI (`pollinate-studio`) and CLI (`pollinate`)
- MIT `LICENSE`
- Comprehensive `README.md` with quick-start, features, models, CLI, API reference

### Removed
- Image-to-image (img2img) mode that briefly used Flux Kontext via catbox.moe + pollinations. Removed when end-to-end verification revealed the `kontext` model is paid-only on the free public pollinations endpoint. Will return in a future release via a different free img2img backend.
- Client-side super-resolution (Swin2SR) buttons. Model loaded but inference returned ONNX runtime errors in the current transformers.js v3 + WASM backend combination. Removed pending a more reliable upscaling path (HuggingFace Space client or a different ONNX-stable model).

### Verified
- End-to-end text-to-image generation through pollinations.ai free tier
- Catbox.moe upload helper (later removed alongside img2img)
- pollinations.ai `kontext` model is paid-tier-only (confirmed HTTP 500 + error message)
