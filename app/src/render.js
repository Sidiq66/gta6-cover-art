// The cover renderer.
//
// drawCover paints a whole cover — graded photos in slanted panels,
// dark gutters with white seams, a frame, and the caption across the
// lower third — onto any 2D context at any size. The editor preview and
// the exported PNG are this same drawing at different scales, so what
// you see in the page is byte-for-byte the composition you download.

import { panelPolygons, insetPolygon, polygonBounds } from './panels.js';
import { gradePhoto } from './grade.js';

const INK = '#161009'; // caption outline: near-black, slightly warm
const GUTTER = '#0b0b10'; // the dark under every seam and the frame
const SEAM = '#f5f5f7'; // the white seam itself
const CREAM = [247, 232, 195]; // sunset lettering
const PAPER = [255, 255, 255]; // neon lettering, top of the gradient
const PINK = [255, 143, 199]; // neon lettering, foot of the gradient
const ICE = [216, 244, 255]; // neon subtitle

function mix(a, b, t) {
  return a.map((value, i) => Math.round(value + (b[i] - value) * t));
}

function css(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function tracePath(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

// One panel's photograph: graded, clipped to the panel's inset polygon,
// and cover-fitted into the panel's bounds with the panel's own pan
// offsets (fractions of the cover's size) and zoom applied.
function drawPanelPhoto(ctx, state, panel, points) {
  if (!panel.img) return;
  const graded = gradePhoto(panel.img, state.grade);
  const bounds = polygonBounds(points);
  const scale =
    Math.max(bounds.width / graded.width, bounds.height / graded.height) *
    (panel.zoom || 1);
  const dw = graded.width * scale;
  const dh = graded.height * scale;
  const dx = bounds.cx - dw / 2 + (panel.panX || 0) * state.width;
  const dy = bounds.cy - dh / 2 + (panel.panY || 0) * state.height;
  ctx.save();
  tracePath(ctx, insetPolygon(points, Math.max(3, state.width * 0.004)));
  ctx.clip();
  ctx.drawImage(graded, dx, dy, dw, dh);
  ctx.restore();
}

// The borders between panels: a wide dark stroke along each divider
// with a narrower white stroke centred on it, then the frame.
function drawSeams(ctx, width, height, polygons) {
  ctx.save();
  ctx.lineJoin = 'round';
  const passes = [
    { colour: GUTTER, size: Math.max(9, width * 0.008) },
    { colour: SEAM, size: Math.max(3.5, width * 0.0034) },
  ];
  for (const pass of passes) {
    ctx.strokeStyle = pass.colour;
    ctx.lineWidth = pass.size;
    for (let i = 1; i < polygons.length; i++) {
      const top = polygons[i][0];
      const bottom = polygons[i][3];
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      ctx.lineTo(bottom[0], bottom[1]);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = GUTTER;
  ctx.lineWidth = Math.max(8, width * 0.007);
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();
}

// The editor's way of showing which panel is live: a dashed cyan
// outline just inside the panel's edge. Never drawn on exports.
function drawSelection(ctx, points, width) {
  ctx.save();
  ctx.setLineDash([Math.max(8, width * 0.008), Math.max(6, width * 0.006)]);
  ctx.lineWidth = Math.max(2.5, width * 0.0022);
  ctx.strokeStyle = '#3ae2ff';
  tracePath(ctx, insetPolygon(points, Math.max(7, width * 0.007)));
  ctx.stroke();
  ctx.restore();
}

// Pick a title size: a fixed share of the cover's height, shrunk only
// if the words would run wider than the cover can hold.
function fitTitleSize(ctx, title, width, height) {
  let size = Math.round(height * 0.115);
  if (!title) return size;
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  const measured = ctx.measureText(title).width;
  const widest = width * 0.88;
  if (measured > widest) {
    size = Math.max(12, Math.floor(size * (widest / measured)));
  }
  return size;
}

// The caption: a small subtitle riding above a big uppercase title,
// both in Anton, both outlined in ink, the lettering warming or cooling
// with the grade — cream at sunset; white-into-pink with an ice-blue
// subtitle at neon.
async function drawCaption(ctx, state) {
  const { width, height, grade } = state;
  const title = (state.title || '').toUpperCase();
  const subtitle = (state.subtitle || '').toUpperCase();
  if (!title && !subtitle) return;

  // Give Anton a brief chance to arrive, but never let the caption
  // wait on the font machinery: a stalled or failed font load must not
  // cost the cover its lettering, so the wait is raced with a timeout
  // and any failure simply draws with the fallback stack.
  try {
    await Promise.race([
      (async () => {
        await document.fonts.load('100px Anton');
        await document.fonts.ready;
      })(),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // The font did not load; the words still get drawn.
  }

  // A soft dusk pooled at the foot of the cover keeps the lettering
  // legible over bright sand and sky.
  const shade = ctx.createLinearGradient(0, height * 0.6, 0, height);
  shade.addColorStop(0, 'rgba(10, 4, 18, 0)');
  shade.addColorStop(1, 'rgba(10, 4, 18, 0.32)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, height * 0.6, width, height * 0.4);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const titleSize = fitTitleSize(ctx, title, width, height);
  const titleBase = height * 0.955;

  if (subtitle) {
    const subSize = Math.max(13, Math.round(height * 0.033));
    ctx.font = `${subSize}px Anton, 'Arial Narrow', sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.06)}px`;
    } catch {
      // Older engines have no canvas letter-spacing; the words still land.
    }
    ctx.lineWidth = Math.max(2, subSize / 6);
    ctx.strokeStyle = INK;
    ctx.fillStyle = css(mix(CREAM, ICE, grade));
    const subY = title ? titleBase - titleSize * 1.24 : height * 0.93;
    ctx.strokeText(subtitle, width / 2, subY);
    ctx.fillText(subtitle, width / 2, subY);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // Nothing to undo where it was never set.
    }
  }

  if (title) {
    ctx.font = `${titleSize}px Anton, 'Arial Narrow', sans-serif`;
    const fill = ctx.createLinearGradient(0, titleBase - titleSize, 0, titleBase);
    fill.addColorStop(0, css(mix(CREAM, PAPER, grade)));
    fill.addColorStop(1, css(mix(CREAM, PINK, grade)));
    ctx.lineWidth = Math.max(3, titleSize / 9);
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.strokeText(title, width / 2, titleBase);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = titleSize / 10;
    ctx.shadowOffsetY = titleSize / 18;
    ctx.fillStyle = fill;
    ctx.fillText(title, width / 2, titleBase);
  }

  ctx.restore();
}

// state = { width, height, layout, grade, title, subtitle,
//           panels: [{ img, panX, panY, zoom }], selected, showSelection }
export async function drawCover(ctx, state) {
  const { width, height } = state;
  ctx.save();
  ctx.fillStyle = GUTTER;
  ctx.fillRect(0, 0, width, height);
  const polygons = panelPolygons(width, height, state.layout);
  polygons.forEach((points, i) => {
    if (state.panels[i]) drawPanelPhoto(ctx, state, state.panels[i], points);
  });
  drawSeams(ctx, width, height, polygons);
  if (state.showSelection && state.selected >= 0 && polygons[state.selected]) {
    drawSelection(ctx, polygons[state.selected], width);
  }
  ctx.restore();
  await drawCaption(ctx, state);
}
