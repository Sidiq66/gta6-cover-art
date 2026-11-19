// Panel geometry for VICE FRAME covers.
//
// A layout is a set of slanted vertical strips that tile the canvas edge to
// edge, the way poster collages slice a scene into leaning panels. Each layout
// is described by where its dividers meet the top edge and the bottom edge of
// the canvas, as fractions of the width: when the two rows differ, the strips
// lean. A panel is the quad between two neighbouring dividers.

const LAYOUTS = {
  triptych: { top: [0.4, 0.71], bottom: [0.31, 0.63] },
  quad: { top: [0.28, 0.53, 0.77], bottom: [0.22, 0.47, 0.71] },
  duo: { top: [0.56], bottom: [0.44] },
};

export function layoutNames() {
  return Object.keys(LAYOUTS);
}

export function panelCount(layout) {
  const spec = LAYOUTS[layout] ?? LAYOUTS.triptych;
  return spec.top.length + 1;
}

// The polygons of a layout on a width x height canvas, left to right.
// Each polygon is four [x, y] points: top-left, top-right, bottom-right,
// bottom-left.
export function panelPolygons(width, height, layout) {
  const spec = LAYOUTS[layout] ?? LAYOUTS.triptych;
  const tops = [0, ...spec.top, 1];
  const bottoms = [0, ...spec.bottom, 1];
  const polygons = [];
  for (let i = 0; i < tops.length - 1; i += 1) {
    polygons.push([
      [tops[i] * width, 0],
      [tops[i + 1] * width, 0],
      [bottoms[i + 1] * width, height],
      [bottoms[i] * width, height],
    ]);
  }
  return polygons;
}

// The axis-aligned box a polygon sits in: photos are cover-fitted to this box
// and then clipped to the polygon itself.
export function polygonBounds(polygon) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Even-odd ray casting hit test, for clicking a panel to select it.
export function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
