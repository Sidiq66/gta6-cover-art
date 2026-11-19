// Colour grading for VICE FRAME.
//
// The grade slider is one number, t: 0 is a warm sunset grade, 1 is a neon
// grade. A photo is graded in two steps. First it is drawn onto an offscreen
// canvas through a canvas filter (saturation, contrast, brightness), cover-
// fitted to its panel's box with the panel's pan and zoom. Then, while the
// panel's clip is active, applyGradeOverlay blends the tint gradients of the
// two ends of the slider over the photo.

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function tint(r, g, b, a) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

function mixTint(from, to, t) {
  return tint(
    lerp(from[0], to[0], t),
    lerp(from[1], to[1], t),
    lerp(from[2], to[2], t),
    lerp(from[3], to[3], t),
  );
}

// Graded copies are cached per photo: a slider drag re-renders often, and the
// same (photo, box, pan, zoom, grade) rarely needs drawing twice.
const gradedCache = new WeakMap();

function cacheKey(boxW, boxH, panX, panY, zoom, t) {
  return [
    Math.round(boxW),
    Math.round(boxH),
    Math.round(panX),
    Math.round(panY),
    zoom.toFixed(3),
    Math.round(t * 40) / 40,
  ].join('|');
}

// An offscreen canvas of boxW x boxH holding the photo, cover-fitted, panned
// and zoomed, with the grade's filter applied.
export function gradedPhotoCanvas(img, boxW, boxH, panX, panY, zoom, t) {
  let perPhoto = gradedCache.get(img);
  if (!perPhoto) {
    perPhoto = new Map();
    gradedCache.set(img, perPhoto);
  }
  const key = cacheKey(boxW, boxH, panX, panY, zoom, t);
  const cached = perPhoto.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(boxW));
  canvas.height = Math.max(1, Math.round(boxH));
  const g = canvas.getContext('2d');

  const scale = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight) * zoom;
  const drawnW = img.naturalWidth * scale;
  const drawnH = img.naturalHeight * scale;
  const dx = (boxW - drawnW) / 2 + panX;
  const dy = (boxH - drawnH) / 2 + panY;

  g.filter =
    `saturate(${lerp(1.28, 1.6, t).toFixed(3)}) ` +
    `contrast(${lerp(1.07, 1.2, t).toFixed(3)}) ` +
    `brightness(${lerp(1.03, 0.97, t).toFixed(3)})`;
  g.drawImage(img, dx, dy, drawnW, drawnH);
  g.filter = 'none';

  if (perPhoto.size > 60) perPhoto.clear();
  perPhoto.set(key, canvas);
  return canvas;
}

// The tint wash laid over a graded photo, inside the panel's clip: a coloured
// glow at the top, a deep dusk at the bottom, blended sunset -> neon by t.
export function applyGradeOverlay(ctx, box, t) {
  const grad = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  grad.addColorStop(0, mixTint([255, 138, 42, 0.17], [0, 238, 255, 0.15], t));
  grad.addColorStop(0.42, 'rgba(10, 6, 20, 0)');
  grad.addColorStop(1, mixTint([122, 18, 142, 0.3], [255, 0, 148, 0.33], t));
  ctx.fillStyle = grad;
  ctx.fillRect(box.x, box.y, box.w, box.h);
}
