// VICE FRAME's editor: wires the page's controls to the cover renderer.
//
// State is one object: the layout, a panel list (each panel holds its photo,
// pan offsets in canvas pixels and a zoom), the grade (0 sunset .. 1 neon),
// the caption words, the export size and the selected panel's index. Every
// control mutates the state and redraws; the canvas is kept at the export
// size, so what you see is pixel-for-pixel what Export PNG writes.

import { panelCount, panelPolygons, pointInPolygon } from './panels.js';
import { drawCover, SIZES } from './render.js';
import { runShotMode } from './shots.js';

const SAMPLE_ORDER = ['pier', 'boulevard', 'beach'];

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const panelLabel = document.getElementById('panel-label');
const zoomSlider = document.getElementById('zoom');
const gradeSlider = document.getElementById('grade');
const titleInput = document.getElementById('title-input');
const subtitleInput = document.getElementById('subtitle-input');

const state = {
  layout: 'triptych',
  panels: [],
  grade: 0.35,
  title: titleInput.value,
  subtitle: subtitleInput.value,
  size: '1080x1080',
  selected: 0,
};

function newPanel() {
  return { img: null, panX: 0, panY: 0, zoom: 1.15 };
}

function ensurePanels() {
  const count = panelCount(state.layout);
  while (state.panels.length < count) state.panels.push(newPanel());
  state.panels.length = count;
  if (state.selected >= count) state.selected = count - 1;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw(clean = false) {
  ensurePanels();
  drawCover(ctx, canvas.width, canvas.height, {
    ...state,
    selected: clean ? -1 : state.selected,
  });
  panelLabel.textContent = `Panel ${state.selected + 1}`;
  zoomSlider.value = String(state.panels[state.selected]?.zoom ?? 1.15);
}

// Fills the panels with the bundled samples, starting at the named one and
// cycling through the rest, keeping each panel's pan and zoom.
async function fillFrom(sampleName) {
  ensurePanels();
  const start = Math.max(0, SAMPLE_ORDER.indexOf(sampleName));
  const order = SAMPLE_ORDER.map((_, i) => SAMPLE_ORDER[(start + i) % SAMPLE_ORDER.length]);
  const loaded = await Promise.all(
    state.panels.map((_, i) => loadImage(`samples/${order[i % order.length]}.jpg`)),
  );
  loaded.forEach((img, i) => {
    state.panels[i].img = img;
  });
  redraw();
}

function setLayout(layout) {
  state.layout = layout;
  document.querySelectorAll('.layout-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.layout === layout);
  });
  ensurePanels();
  redraw();
}

function setSize(sizeKey) {
  if (!SIZES[sizeKey]) return;
  state.size = sizeKey;
  const [w, h] = SIZES[sizeKey];
  canvas.width = w;
  canvas.height = h;
  document.getElementById('size-select').value = sizeKey;
  redraw();
}

function setGrade(t) {
  state.grade = t;
  gradeSlider.value = String(Math.round(t * 100));
  redraw();
}

function setCaption(title, subtitle) {
  state.title = title;
  state.subtitle = subtitle;
  titleInput.value = title;
  subtitleInput.value = subtitle;
  redraw();
}

function selectPanel(index) {
  state.selected = index;
  redraw();
}

// ---- photo sources -------------------------------------------------------

document.getElementById('photo-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  ensurePanels();
  state.panels[state.selected].img = await loadImage(URL.createObjectURL(file));
  status.textContent = `Loaded ${file.name} into panel ${state.selected + 1}.`;
  redraw();
});

document.querySelectorAll('.sample-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    ensurePanels();
    state.panels[state.selected].img = await loadImage(`samples/${btn.dataset.sample}.jpg`);
    status.textContent = `Sample "${btn.dataset.sample}" is in panel ${state.selected + 1}.`;
    redraw();
  });
});

// ---- controls ------------------------------------------------------------

document.querySelectorAll('.layout-btn').forEach((btn) => {
  btn.addEventListener('click', () => setLayout(btn.dataset.layout));
});

zoomSlider.addEventListener('input', () => {
  ensurePanels();
  state.panels[state.selected].zoom = Number.parseFloat(zoomSlider.value);
  redraw();
});

gradeSlider.addEventListener('input', () => {
  state.grade = Number.parseInt(gradeSlider.value, 10) / 100;
  redraw();
});

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  redraw();
});

subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});

document.getElementById('size-select').addEventListener('change', (event) => {
  setSize(event.target.value);
});

document.getElementById('export-btn').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  drawCover(out.getContext('2d'), w, h, { ...state, selected: -1 });
  out.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vice-frame-${state.layout}-${w}x${h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    status.textContent = `Saved vice-frame-${state.layout}-${w}x${h}.png`;
  }, 'image/png');
});

// ---- click to select, drag to pan ----------------------------------------

let drag = null;

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const polygons = panelPolygons(canvas.width, canvas.height, state.layout);
  const hit = polygons.findIndex((polygon) => pointInPolygon(point.x, point.y, polygon));
  if (hit !== -1) selectPanel(hit);
  drag = { x: point.x, y: point.y };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const panel = state.panels[state.selected];
  if (panel) {
    panel.panX += point.x - drag.x;
    panel.panY += point.y - drag.y;
  }
  drag = { x: point.x, y: point.y };
  redraw();
});

canvas.addEventListener('pointerup', () => {
  drag = null;
});

canvas.addEventListener('pointercancel', () => {
  drag = null;
});

// ---- start ---------------------------------------------------------------

const app = { fillFrom, setLayout, setSize, setGrade, setCaption, redraw };
const query = new URLSearchParams(location.search);

if (query.get('shot')) {
  runShotMode(query, app);
} else {
  ensurePanels();
  redraw();
  fillFrom('pier').then(() => {
    status.textContent = 'Samples loaded — click a panel, drag to pan, then export.';
  });
  document.fonts.ready.then(() => redraw());
}
