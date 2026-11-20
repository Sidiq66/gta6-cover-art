// The sunset-to-neon colour grade.
//
// gradePhoto(image, grade) hands back an offscreen canvas holding the
// picture with the grade baked in. The grade is a single number: 0 is a
// warm sunset look — soft contrast, a little sepia, an amber-to-rose
// wash — and 1 is the neon look — harder contrast, heavier saturation
// and a magenta-against-cyan wash. Everything in between is a blend of
// the two, driven off the one slider in the editor.

const cache = new Map();

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

// One-click looks: each preset parks the grade slider, the finish
// texture and the noir tone in one move, so a cover is two clicks from
// a photo instead of three sliders deep. The editor's Look row and the
// screenshot scenes both drive the app through these.
export const LOOK_PRESETS = [
  { id: 'sunset', name: 'Sunset', grade: 0.12, texture: 0.35, noir: false },
  { id: 'golden', name: 'Golden', grade: 0.38, texture: 0.5, noir: false },
  { id: 'neon', name: 'Vice Neon', grade: 0.82, texture: 0.55, noir: false },
  { id: 'noir', name: 'Noir', grade: 0.55, texture: 0.7, noir: true },
];

export function lookPreset(id) {
  return LOOK_PRESETS.find((preset) => preset.id === id) || null;
}

// The canvas filter string for a grade: each knob of the base correction
// interpolated between its sunset and neon settings. The noir tone
// pulls most of the colour back out and leans on contrast instead, so
// what colour survives reads as signage against the dark.
export function gradeFilter(grade, noir = false) {
  const g = clamp01(grade);
  let saturate = lerp(1.12, 1.38, g);
  let contrast = lerp(1.05, 1.13, g);
  let brightness = lerp(1.04, 0.99, g);
  const sepia = lerp(0.22, 0.02, g);
  if (noir) {
    saturate *= 0.45;
    contrast *= 1.14;
    brightness *= 0.96;
  }
  return (
    `saturate(${saturate.toFixed(3)}) ` +
    `contrast(${contrast.toFixed(3)}) ` +
    `brightness(${brightness.toFixed(3)}) ` +
    `sepia(${sepia.toFixed(3)})`
  );
}

// The tint washes, laid over the corrected picture in soft light so they
// stain the highlights and shadows without flattening the photo.
function wash(ctx, width, height, grade) {
  const g = clamp01(grade);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';

  if (g < 1) {
    // Sunset: amber light up top sinking into a rose dusk at the foot.
    const sunset = ctx.createLinearGradient(0, 0, 0, height);
    sunset.addColorStop(0, 'rgb(255, 166, 66)');
    sunset.addColorStop(0.55, 'rgb(255, 110, 90)');
    sunset.addColorStop(1, 'rgb(214, 51, 132)');
    ctx.globalAlpha = 0.55 * (1 - g);
    ctx.fillStyle = sunset;
    ctx.fillRect(0, 0, width, height);
  }

  if (g > 0) {
    // Neon: magenta signage on the left against cyan on the right.
    const neon = ctx.createLinearGradient(0, 0, width, 0);
    neon.addColorStop(0, 'rgb(255, 0, 128)');
    neon.addColorStop(0.5, 'rgb(120, 0, 255)');
    neon.addColorStop(1, 'rgb(0, 200, 255)');
    ctx.globalAlpha = 0.5 * g;
    ctx.fillStyle = neon;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

export function gradePhoto(image, grade, noir = false) {
  // Round the grade so dragging the slider reuses nearby cached frames
  // instead of grading the same photograph again for every pixel moved.
  const step = Math.round(clamp01(grade) * 50) / 50;
  const key = `${image.src}|${step}|${noir ? 'noir' : 'colour'}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext('2d');
  ctx.filter = gradeFilter(step, noir);
  ctx.drawImage(image, 0, 0);
  ctx.filter = 'none';
  wash(ctx, canvas.width, canvas.height, step);

  cache.set(key, canvas);
  if (cache.size > 24) cache.clear();
  return canvas;
}
