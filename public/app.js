// Pollinate Studio — frontend

const $ = sel => document.querySelector(sel);
const gallery = $('#gallery');
const emptyState = $('#empty-state');
const galleryCount = $('#gallery-count');
const promptEl = $('#prompt');
const generateBtn = $('#generate');
const generateLabel = generateBtn.querySelector('.btn-label');
const generateSpinner = generateBtn.querySelector('.btn-spinner');
const enhanceBtn = $('#enhance-btn');
const busy = $('#busy');
const busyTitle = $('#busy-title');
const busySub = $('#busy-sub');
const busyBarFill = $('#busy-bar-fill');

const PRESETS = {
  boards: 'a smug pepe the frog character, crude hand-drawn boards meme style, MS paint aesthetic, flat colors, wobbly black outline, no shading, plain white background',
  editorial: 'political cartoon, ink and watercolor, a single character at center, captions in hand-lettered all caps around the figure, editorial illustration, off-white background',
  sticker: 'die-cut vinyl sticker, thick clean white border, vibrant flat colors, bold lineart, isolated on plain background, high contrast',
  vaporwave: 'vaporwave aesthetic, pastel pink and cyan gradient, retro grid floor, palm trees, glitch effects, 80s synthwave',
  photoreal: 'photorealistic, cinematic lighting, 85mm portrait lens, shallow depth of field, ultra detailed, professional photography',
  cyberpunk: 'cyberpunk neon scene, rain-soaked street, neon signs reflecting on wet pavement, atmospheric fog, blade runner inspired',
};

document.querySelectorAll('.preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.preset;
    const current = promptEl.value.trim();
    promptEl.value = current ? `${current}, ${PRESETS[key]}` : PRESETS[key];
    promptEl.focus();
  });
});

function toast(msg, type = 'ok') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (type === 'err' ? ' err' : '');
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 3500);
}

function setLoading(on) {
  generateBtn.disabled = on;
  generateLabel.textContent = on ? 'generating…' : 'generate';
  generateSpinner.hidden = !on;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function showBusy(title, sub = 'this can take a minute on first run while the model downloads') {
  busyTitle.textContent = title;
  busySub.textContent = sub;
  busyBarFill.style.width = '0%';
  busy.hidden = false;
}
function setBusyProgress(pct, sub) {
  busyBarFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (sub) busySub.textContent = sub;
}
function hideBusy() { busy.hidden = true; }

function addSkeletons(count) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton';
    sk.dataset.skeleton = '1';
    frag.appendChild(sk);
  }
  gallery.prepend(frag);
}
function removeSkeletons() {
  gallery.querySelectorAll('[data-skeleton]').forEach(n => n.remove());
}

function renderImage(img) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.filename = img.filename;
  card.innerHTML = `
    <img src="/out/${encodeURIComponent(img.filename)}" alt="" loading="lazy" />
    <div class="card-meta">${fmtBytes(img.bytes)}</div>
  `;
  card.addEventListener('click', () => openLightbox(img.filename));
  return card;
}

function updateCount() {
  const count = gallery.querySelectorAll('.card').length;
  galleryCount.textContent = `${count} image${count === 1 ? '' : 's'}`;
  emptyState.hidden = count > 0;
}

async function loadGallery() {
  try {
    const r = await fetch('/api/gallery');
    const { images } = await r.json();
    gallery.innerHTML = '';
    images.forEach(img => gallery.appendChild(renderImage(img)));
    updateCount();
  } catch (e) {
    toast(`gallery failed: ${e.message}`, 'err');
  }
}

async function generate() {
  const prompt = promptEl.value.trim();
  if (!prompt) {
    promptEl.focus();
    toast('prompt is empty', 'err');
    return;
  }
  const [w, h] = $('#size').value.split('x').map(Number);
  const body = {
    prompt,
    n: parseInt($('#n').value, 10) || 1,
    model: $('#model').value,
    width: w,
    height: h,
    seed: $('#seed').value.trim() ? parseInt($('#seed').value, 10) : undefined,
    nologo: $('#nologo').checked,
    enhance: $('#enhance').checked,
  };

  setLoading(true);
  emptyState.hidden = true;
  addSkeletons(body.n);

  try {
    const r = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    removeSkeletons();
    if (data.error) throw new Error(data.error);
    if (data.results?.length) {
      data.results.forEach(img => gallery.prepend(renderImage(img)));
      updateCount();
      toast(`generated ${data.results.length} image${data.results.length === 1 ? '' : 's'}`);
    }
    if (data.errors?.length) toast(`${data.errors.length} failed: ${data.errors[0]}`, 'err');
  } catch (e) {
    removeSkeletons();
    toast(`generate failed: ${e.message}`, 'err');
  } finally {
    setLoading(false);
  }
}

generateBtn.addEventListener('click', generate);
$('#refresh').addEventListener('click', loadGallery);
$('#clear').addEventListener('click', () => { promptEl.value = ''; promptEl.focus(); });
promptEl.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); generate(); }
});

// ── Enhance prompt ─────────────────────────────────────────────────
enhanceBtn.addEventListener('click', async () => {
  const prompt = promptEl.value.trim();
  if (!prompt) { promptEl.focus(); toast('prompt is empty', 'err'); return; }
  enhanceBtn.disabled = true;
  const orig = enhanceBtn.querySelector('.enhance-label').textContent;
  enhanceBtn.querySelector('.enhance-label').textContent = 'enhancing…';
  try {
    const r = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    promptEl.value = data.enhanced;
    promptEl.focus();
    toast('prompt enhanced');
  } catch (e) {
    toast(`enhance failed: ${e.message}`, 'err');
  } finally {
    enhanceBtn.disabled = false;
    enhanceBtn.querySelector('.enhance-label').textContent = orig;
  }
});

// ── Lightbox ──────────────────────────────────────────────────────
const lb = $('#lightbox');
const lbImg = $('#lightbox-img');
const lbName = $('#lightbox-name');
const lbDownload = $('#lightbox-download');
let lbCurrent = null;

function openLightbox(filename) {
  lbCurrent = filename;
  lbImg.src = `/out/${encodeURIComponent(filename)}`;
  lbName.textContent = filename;
  lbDownload.href = `/out/${encodeURIComponent(filename)}`;
  lbDownload.download = filename;
  lb.hidden = false;
}
function closeLightbox() { lb.hidden = true; lbCurrent = null; }

$('#lightbox-close').addEventListener('click', closeLightbox);
lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLightbox(); });
$('#lightbox-delete').addEventListener('click', async () => {
  if (!lbCurrent) return;
  if (!confirm(`Delete ${lbCurrent}?`)) return;
  try {
    const r = await fetch(`/api/image/${encodeURIComponent(lbCurrent)}`, { method: 'DELETE' });
    const data = await r.json();
    if (data.error) throw new Error(data.error);
    const card = gallery.querySelector(`[data-filename="${CSS.escape(lbCurrent)}"]`);
    if (card) card.remove();
    updateCount();
    closeLightbox();
    toast('deleted');
  } catch (e) {
    toast(`delete failed: ${e.message}`, 'err');
  }
});

// ── Transformers.js lazy loader (for bg removal + upscaling) ───────
let _tx = null;
async function loadTransformers() {
  if (_tx) return _tx;
  showBusy('loading model toolkit…', 'first run only · about 2-3MB · stays cached');
  try {
    _tx = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2');
    _tx.env.allowLocalModels = false;
    _tx.env.useBrowserCache = true;
    setBusyProgress(20, 'toolkit loaded');
    return _tx;
  } catch (e) {
    hideBusy();
    throw new Error(`failed to load toolkit: ${e && e.message || e}`);
  }
}

async function imgUrlToBlob(url) {
  const r = await fetch(url);
  return r.blob();
}

async function saveDerivative(blob, sourceFilename, suffix) {
  const r = await fetch('/api/save-derivative', {
    method: 'POST',
    headers: {
      'Content-Type': blob.type || 'image/png',
      'X-Source': sourceFilename,
      'X-Suffix': suffix,
    },
    body: blob,
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ── Background removal (briaai/RMBG-1.4 via AutoModel) ────────────
let _bgModel = null;
let _bgProcessor = null;
async function getBgModel() {
  if (_bgModel && _bgProcessor) return { model: _bgModel, processor: _bgProcessor };
  const tx = await loadTransformers();
  showBusy('downloading background removal model…', 'first run · ~44MB · cached afterward');
  const progressCb = p => {
    if (p.status === 'progress' && p.total) {
      const pct = (p.loaded / p.total) * 80 + 20;
      setBusyProgress(pct, `downloading ${p.file || 'model'} · ${Math.round((p.loaded / p.total) * 100)}%`);
    }
  };
  _bgModel = await tx.AutoModel.from_pretrained('briaai/RMBG-1.4', {
    config: { model_type: 'custom' },
    progress_callback: progressCb,
  });
  _bgProcessor = await tx.AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
    config: {
      do_normalize: true,
      do_pad: false,
      do_rescale: true,
      do_resize: true,
      image_mean: [0.5, 0.5, 0.5],
      feature_extractor_type: 'ImageFeatureExtractor',
      image_std: [1, 1, 1],
      resample: 2,
      rescale_factor: 0.00392156862745098,
      return_tensors: '',
      size: { width: 1024, height: 1024 },
    },
    progress_callback: progressCb,
  });
  return { model: _bgModel, processor: _bgProcessor };
}

async function removeBackground() {
  if (!lbCurrent) return;
  const sourceFile = lbCurrent;
  const sourceUrl = `/out/${encodeURIComponent(sourceFile)}`;
  try {
    const tx = await loadTransformers();
    const { model, processor } = await getBgModel();
    showBusy('removing background…', 'segmenting the subject');
    setBusyProgress(82);

    const image = await tx.RawImage.fromURL(sourceUrl);
    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });
    setBusyProgress(92, 'composing transparent PNG');

    const mask = await tx.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image.toCanvas(), 0, 0);
    const pixelData = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < mask.data.length; i++) {
      pixelData.data[4 * i + 3] = mask.data[i];
    }
    ctx.putImageData(pixelData, 0, 0);

    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const saved = await saveDerivative(blob, sourceFile, 'nobg');
    hideBusy();

    gallery.prepend(renderImage({ filename: saved.filename, bytes: saved.bytes }));
    updateCount();
    openLightbox(saved.filename);
    toast('background removed');
  } catch (e) {
    hideBusy();
    const msg = e && (e.message || String(e)) || 'unknown error';
    console.error('bg removal failure:', e);
    toast(`bg removal failed: ${msg}`, 'err');
  }
}

$('#tool-bgremove').addEventListener('click', removeBackground);

loadGallery();
