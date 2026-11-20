// VICE FRAME's editor.
//
// The state is one cover: a layout, a size, a grade and finish, a
// caption, and one photograph per panel, each with its own pan and
// zoom. The selected panel is where uploads and sample buttons land;
// clicking a panel on the canvas selects it and dragging pans its
// photo. Every change just re-runs the renderer — the preview canvas
// is kept at full export resolution, so the picture on the page is
// the picture you download.

import { drawCover } from './render.js';
import {
  panelPolygons,
  panelCount,
  pointInPolygon,
  DEFAULT_SLANT,
} from './panels.js';
import { lookPreset } from './grade.js';
import { runShotScene, loadSample, SAMPLE_ORDER } from './shots.js';

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const fileInput = document.getElementById('photo-file');
const zoomRange = document.getElementById('zoom');
const gradeRange = document.getElementById('grade');
const slantRange = document.getElementById('slant');
const textureRange = document.getElementById('texture');
const titleInput = document.getElementById('caption-title');
const subtitleInput = document.getElementById('caption-subtitle');
const titleSizeRange = document.getElementById('title-size');
const trackingRange = document.getElementById('tracking');
const sizeSelect = document.getElementById('size');
const exportButton = document.getElementById('export');
const selectedLabel = document.getElementById('selected-panel');

const state = {
  width: 1080,
  height: 1080,
  layout: 'triptych',
  slant: DEFAULT_SLANT,
  grade: 0.38,
  noir: false,
  texture: 0.5,
  preset: 'golden',
  title: 'NEON SHORES',
  subtitle: 'ONE CITY. NO RULES.',
  titleScale: 1,
  tracking: 0.02,
  selected: 0,
  showSelection: true,
  panels: [],
};

function freshPanel(img = null) {
  return { img, panX: 0, panY: 0, zoom: 1 };
}

// Keep the panel list the length the layout wants, preserving the
// photos already placed whenever panels survive a layout change.
function syncPanelCount() {
  const n = panelCount(state.layout);
  while (state.panels.length < n) state.panels.push(freshPanel());
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

async function render() {
  canvas.width = state.width;
  canvas.height = state.height;
  await drawCover(ctx, state);
}

function markActive(buttons, value, attr) {
  buttons.forEach((button) => {
    button.classList.toggle('active', button.dataset[attr] === value);
  });
}

function setLayout(layout) {
  if (!['duo', 'triptych', 'quad', 'penta'].includes(layout)) return;
  state.layout = layout;
  syncPanelCount();
  markActive([...document.querySelectorAll('[data-layout]')], layout, 'layout');
  selectPanel(0);
}

function setSize(key) {
  const size = SIZES[key];
  if (!size) return;
  [state.width, state.height] = size;
  sizeSelect.value = key;
  render();
}

function paintRange(range) {
  const min = parseFloat(range.min);
  const max = parseFloat(range.max);
  const pct = ((parseFloat(range.value) - min) / (max - min)) * 100;
  range.style.setProperty('--fill', `${pct}%`);
}

function setGrade(grade) {
  state.grade = Math.min(1, Math.max(0, grade));
  gradeRange.value = String(state.grade);
  paintRange(gradeRange);
  render();
}

function setSlant(slant) {
  state.slant = Math.min(0.12, Math.max(0, slant));
  slantRange.value = String(state.slant);
  paintRange(slantRange);
  render();
}

function setTexture(texture) {
  state.texture = Math.min(1, Math.max(0, texture));
  textureRange.value = String(state.texture);
  paintRange(textureRange);
  render();
}

function setTitleScale(scale) {
  state.titleScale = Math.min(1.3, Math.max(0.7, scale));
  titleSizeRange.value = String(state.titleScale);
  paintRange(titleSizeRange);
  render();
}

function setTracking(tracking) {
  state.tracking = Math.min(0.3, Math.max(0, tracking));
  trackingRange.value = String(state.tracking);
  paintRange(trackingRange);
  render();
}

function setTitle(title) {
  state.title = title;
  titleInput.value = title;
  render();
}

function setSubtitle(subtitle) {
  state.subtitle = subtitle;
  subtitleInput.value = subtitle;
  render();
}

// A Look preset moves the grade, the finish and the noir tone
// together. Touching any of those controls by hand afterwards drops
// the preset highlight: the cover is the user's own from then on.
function applyPreset(id) {
  const preset = lookPreset(id);
  if (!preset) return;
  state.preset = preset.id;
  state.noir = preset.noir;
  markActive(
    [...document.querySelectorAll('[data-preset]')], preset.id, 'preset',
  );
  setGrade(preset.grade);
  setTexture(preset.texture);
}

function clearPreset() {
  if (!state.preset) return;
  state.preset = null;
  markActive([...document.querySelectorAll('[data-preset]')], '', 'preset');
}

function setShowSelection(show) {
  state.showSelection = show;
  render();
}

function setPanelPhoto(index, img) {
  if (!state.panels[index]) state.panels[index] = freshPanel();
  state.panels[index].img = img;
  state.panels[index].panX = 0;
  state.panels[index].panY = 0;
  state.panels[index].zoom = 1;
  if (index === state.selected) zoomRange.value = '1';
  paintRange(zoomRange);
  render();
}

function selectPanel(index) {
  state.selected = index;
  selectedLabel.textContent = `Panel ${index + 1}`;
  const panel = state.panels[index];
  zoomRange.value = String(panel ? panel.zoom : 1);
  paintRange(zoomRange);
  render();
}

// --- pointer work on the canvas: select, then pan by dragging --------

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return [
    ((event.clientX - rect.left) / rect.width) * state.width,
    ((event.clientY - rect.top) / rect.height) * state.height,
  ];
}

let drag = null;

canvas.addEventListener('pointerdown', (event) => {
  const [x, y] = canvasPoint(event);
  const polygons = panelPolygons(
    state.width, state.height, state.layout, state.slant,
  );
  const hit = polygons.findIndex((points) => pointInPolygon(x, y, points));
  if (hit >= 0 && hit !== state.selected) selectPanel(hit);
  const panel = state.panels[state.selected];
  if (!panel) return;
  drag = { x, y, panX: panel.panX, panY: panel.panY };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const [x, y] = canvasPoint(event);
  const panel = state.panels[state.selected];
  panel.panX = drag.panX + (x - drag.x) / state.width;
  panel.panY = drag.panY + (y - drag.y) / state.height;
  render();
});

canvas.addEventListener('pointerup', () => {
  drag = null;
});
canvas.addEventListener('pointercancel', () => {
  drag = null;
});

// --- controls ---------------------------------------------------------

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    const img = await loadSample(button.dataset.sample);
    setPanelPhoto(state.selected, img);
  });
});

document.querySelectorAll('[data-layout]').forEach((button) => {
  button.addEventListener('click', () => setLayout(button.dataset.layout));
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => setPanelPhoto(state.selected, img);
  img.src = url;
});

zoomRange.addEventListener('input', () => {
  const panel = state.panels[state.selected];
  if (panel) panel.zoom = parseFloat(zoomRange.value);
  paintRange(zoomRange);
  render();
});

gradeRange.addEventListener('input', () => {
  clearPreset();
  state.grade = parseFloat(gradeRange.value);
  paintRange(gradeRange);
  render();
});

slantRange.addEventListener('input', () => {
  state.slant = parseFloat(slantRange.value);
  paintRange(slantRange);
  render();
});

textureRange.addEventListener('input', () => {
  clearPreset();
  state.texture = parseFloat(textureRange.value);
  paintRange(textureRange);
  render();
});

document.querySelectorAll('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => applyPreset(button.dataset.preset));
});

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  render();
});

subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  render();
});

titleSizeRange.addEventListener('input', () => {
  state.titleScale = parseFloat(titleSizeRange.value);
  paintRange(titleSizeRange);
  render();
});

trackingRange.addEventListener('input', () => {
  state.tracking = parseFloat(trackingRange.value);
  paintRange(trackingRange);
  render();
});

sizeSelect.addEventListener('change', () => setSize(sizeSelect.value));

exportButton.addEventListener('click', async () => {
  const out = document.createElement('canvas');
  out.width = state.width;
  out.height = state.height;
  await drawCover(out.getContext('2d'), { ...state, showSelection: false });
  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vice-frame-cover.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
});

// --- boot -------------------------------------------------------------

const editor = {
  setLayout,
  setSize,
  setGrade,
  setSlant,
  setTexture,
  setTitleScale,
  setTracking,
  setTitle,
  setSubtitle,
  applyPreset,
  setPanelPhoto,
  selectPanel,
  setShowSelection,
  render,
  panelCount: () => panelCount(state.layout),
};

async function boot() {
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  gradeRange.value = String(state.grade);
  slantRange.value = String(state.slant);
  textureRange.value = String(state.texture);
  titleSizeRange.value = String(state.titleScale);
  trackingRange.value = String(state.tracking);
  markActive(
    [...document.querySelectorAll('[data-preset]')], state.preset, 'preset',
  );
  [gradeRange, slantRange, textureRange, titleSizeRange, trackingRange]
    .forEach(paintRange);
  paintRange(zoomRange);
  syncPanelCount();
  // The opening frame: the first samples spread across the triptych —
  // the driver, the diva and the skyline, one to a panel.
  const openers = SAMPLE_ORDER.slice(0, panelCount(state.layout));
  const images = await Promise.all(openers.map(loadSample));
  images.forEach((img, i) => {
    state.panels[i].img = img;
  });
  await render();
  await runShotScene(new URLSearchParams(location.search), editor);
}

boot();
