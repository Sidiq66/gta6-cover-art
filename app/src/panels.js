// Panel geometry for VICE FRAME covers.
//
// A cover is cut into vertical strips by divider lines that lean as they
// fall: each divider starts a little to the right of where it ends, which
// is what gives the panels their slanted, poster-collage look. The first
// panel is closed by the left edge of the canvas and the last panel by
// the right edge, so the strips always tile the whole frame exactly.

export const LAYOUTS = {
  duo: 2,
  triptych: 3,
  quad: 4,
  penta: 5,
};

// How far a divider travels sideways over the full height of the cover,
// as a fraction of the cover's width, when the editor does not say.
export const DEFAULT_SLANT = 0.06;

export function panelCount(layout) {
  return LAYOUTS[layout] ?? LAYOUTS.triptych;
}

// The interior divider lines of a layout. Each entry is the pair of x
// coordinates where one divider crosses the top and the bottom edge.
export function dividers(width, layout, slant = DEFAULT_SLANT) {
  const n = panelCount(layout);
  const lean = (width * slant) / 2;
  const lines = [];
  for (let i = 1; i < n; i++) {
    const base = (width * i) / n;
    lines.push({ topX: base + lean, bottomX: base - lean });
  }
  return lines;
}

// Every panel's polygon, in order, as [x, y] points running clockwise
// from the panel's top-left corner.
export function panelPolygons(width, height, layout, slant = DEFAULT_SLANT) {
  const edges = [
    { topX: 0, bottomX: 0 },
    ...dividers(width, layout, slant),
    { topX: width, bottomX: width },
  ];
  const panels = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const left = edges[i];
    const right = edges[i + 1];
    panels.push([
      [left.topX, 0],
      [right.topX, 0],
      [right.bottomX, height],
      [left.bottomX, height],
    ]);
  }
  return panels;
}

// A copy of a polygon pulled a few pixels in toward its own centre. A
// photo clipped to the inset shape stops just short of the panel seam,
// leaving a dark gutter that the white seam line is later centred on.
export function insetPolygon(points, inset) {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of points) {
    cx += x;
    cy += y;
  }
  cx /= points.length;
  cy /= points.length;
  return points.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const pull = Math.min(inset, dist) / dist;
    return [x - dx * pull, y - dy * pull];
  });
}

// Axis-aligned bounds of a polygon, with its centre — the cover-fit
// maths in the renderer works in terms of these.
export function polygonBounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

// Even-odd hit test, so the editor can tell which panel a click or a
// drag started in.
export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
