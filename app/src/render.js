// Draws a whole VICE FRAME cover onto a 2D canvas context.
//
// Passes, back to front: a near-black ground; each panel's graded photo,
// clipped to the panel's slanted polygon; every panel's border (a dark outer
// stroke under a white one, so neighbouring panels share a clean white seam);
// a dusk scrim along the bottom; and the caption lettering in Anton, the
// subtitle above a big outlined title across the lower third.

import { panelPolygons, polygonBounds } from './panels.js';
import { gradedPhotoCanvas, applyGradeOverlay } from './grade.js';

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const GROUND = '#07070c';
const OUTLINE = '#05050a';

function tracePolygon(ctx, polygon) {
  ctx.beginPath();
  ctx.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i += 1) ctx.lineTo(polygon[i][0], polygon[i][1]);
  ctx.closePath();
}

function drawPanelPhoto(ctx, polygon, panel, grade) {
  const box = polygonBounds(polygon);
  ctx.save();
  tracePolygon(ctx, polygon);
  ctx.clip();
  if (panel && panel.img) {
    const graded = gradedPhotoCanvas(panel.img, box.w, box.h, panel.panX, panel.panY, panel.zoom, grade);
    ctx.drawImage(graded, box.x, box.y);
  } else {
    const fill = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
    fill.addColorStop(0, '#241b3f');
    fill.addColorStop(1, '#0d0a1a');
    ctx.fillStyle = fill;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  applyGradeOverlay(ctx, box, grade);
  ctx.restore();
}

function drawBorders(ctx, polygons, width) {
  const white = Math.max(6, Math.round(width * 0.0075));
  for (const polygon of polygons) {
    tracePolygon(ctx, polygon);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = white + Math.max(5, Math.round(width * 0.005));
    ctx.stroke();
  }
  for (const polygon of polygons) {
    tracePolygon(ctx, polygon);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = white;
    ctx.stroke();
  }
}

function drawSelection(ctx, polygons, selected, width) {
  if (selected < 0 || selected >= polygons.length) return;
  tracePolygon(ctx, polygons[selected]);
  ctx.save();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = Math.max(3, width * 0.0035);
  ctx.setLineDash([width * 0.014, width * 0.009]);
  ctx.stroke();
  ctx.restore();
}

// The largest Anton size, at most startSize, at which text fits maxWidth.
function fitFontSize(ctx, text, startSize, maxWidth) {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${size}px Anton, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size *= 0.94;
  }
  return size;
}

function drawCaption(ctx, width, height, state) {
  const title = (state.title ?? '').trim();
  const subtitle = (state.subtitle ?? '').trim();
  if (!title && !subtitle) return;

  const scrim = ctx.createLinearGradient(0, height * 0.6, 0, height);
  scrim.addColorStop(0, 'rgba(4, 4, 10, 0)');
  scrim.addColorStop(0.55, 'rgba(4, 4, 10, 0.38)');
  scrim.addColorStop(1, 'rgba(4, 4, 10, 0.66)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, height * 0.6, width, height * 0.4);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  try {
    ctx.letterSpacing = '2px';
  } catch {
    // Older engines have no canvas letterSpacing; the lettering still reads.
  }

  const titleSize = fitFontSize(ctx, title.toUpperCase(), height * 0.118, width * 0.92);
  const titleBaseline = height * 0.925;

  if (subtitle) {
    const subSize = fitFontSize(ctx, subtitle.toUpperCase(), height * 0.042, width * 0.86);
    ctx.font = `${subSize}px Anton, sans-serif`;
    ctx.fillStyle = state.grade < 0.5 ? '#ffe3c2' : '#d9f9ff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.12;
    ctx.shadowOffsetY = subSize * 0.05;
    ctx.fillText(subtitle.toUpperCase(), width / 2, titleBaseline - titleSize * 1.22);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  if (title) {
    ctx.font = `${titleSize}px Anton, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = titleSize * 0.16;
    ctx.strokeText(title.toUpperCase(), width / 2, titleBaseline);
    const fill = ctx.createLinearGradient(0, titleBaseline - titleSize, 0, titleBaseline);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, state.grade < 0.5 ? '#ffd9a8' : '#ffc7e6');
    ctx.fillStyle = fill;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = titleSize * 0.07;
    ctx.shadowOffsetY = titleSize * 0.035;
    ctx.fillText(title.toUpperCase(), width / 2, titleBaseline);
  }
  ctx.restore();
}

// state: { layout, panels: [{img, panX, panY, zoom}], grade, title, subtitle,
//          selected } — selected is a panel index, or -1 for none (exports and
//          cover screenshots draw with no selection marker).
export function drawCover(ctx, width, height, state) {
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, width, height);

  const polygons = panelPolygons(width, height, state.layout);
  polygons.forEach((polygon, i) => drawPanelPhoto(ctx, polygon, state.panels[i], state.grade));
  drawBorders(ctx, polygons, width);
  drawCaption(ctx, width, height, state);
  drawSelection(ctx, polygons, state.selected ?? -1, width);
}
