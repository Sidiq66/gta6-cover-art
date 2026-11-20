// Fixed scenes the entry screenshots are taken from.
//
// ?shot=cover&photo=<name>&layout=<layout>&size=<WxH>&caption=<text>
// strips the page down to the cover alone (the stylesheet does that off
// the shot-cover body class): the named sample fills the first panel and
// the remaining samples follow it in their usual order, wrapping around
// a quad or penta. Optional scene dressing: &subtitle=<text>,
// &grade=<0..1> parks the sunset-to-neon slider, &preset=<id> applies a
// Look preset instead, and &texture=<0..1>, &slant=<0..0.12>,
// &titleScale=<0.7..1.3> and &tracking=<0..0.3> set the finish and the
// lettering.
//
// ?shot=editor&photo=<name>&caption=<text> leaves the editor standing
// with the samples loaded and the caption set, one panel selected.
//
// Both scenes raise window.__shotReady once the cover has genuinely
// been painted, so a screenshot is never taken of a half-loaded page.

export const SAMPLE_ORDER = [
  'driver',
  'diva',
  'skyline',
  'pier',
  'boulevard',
  'beach',
];

export function samplePath(name) {
  return `samples/${name}.jpg`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

export function loadSample(name) {
  return loadImage(samplePath(name));
}

// Which sample each panel starts from when a scene names one photo:
// that photo first, then the rest in order, wrapping as needed.
export function panelSamples(startName, count) {
  const start = Math.max(0, SAMPLE_ORDER.indexOf(startName));
  const names = [];
  for (let i = 0; i < count; i++) {
    names.push(SAMPLE_ORDER[(start + i) % SAMPLE_ORDER.length]);
  }
  return names;
}

function signalReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}

// Runs whichever scene the URL asks for, driving the editor through the
// small facade main.js hands over. Resolves true when a scene ran and
// false for an ordinary visit, in which case nothing here has touched
// the page.
export async function runShotScene(params, editor) {
  const shot = params.get('shot');
  if (shot !== 'cover' && shot !== 'editor') return false;

  const photo = params.get('photo') || 'driver';
  const caption = params.get('caption');
  const grade = params.get('grade');

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    editor.setShowSelection(false);
  }
  if (params.get('layout')) editor.setLayout(params.get('layout'));
  if (params.get('size')) editor.setSize(params.get('size'));
  if (caption !== null) editor.setTitle(caption);
  if (params.get('subtitle') !== null) {
    editor.setSubtitle(params.get('subtitle'));
  }
  if (params.get('preset')) editor.applyPreset(params.get('preset'));
  if (grade !== null && !Number.isNaN(parseFloat(grade))) {
    editor.setGrade(parseFloat(grade));
  }
  const dressing = [
    ['texture', editor.setTexture],
    ['slant', editor.setSlant],
    ['titleScale', editor.setTitleScale],
    ['tracking', editor.setTracking],
  ];
  for (const [name, apply] of dressing) {
    const value = params.get(name);
    if (value !== null && !Number.isNaN(parseFloat(value))) {
      apply(parseFloat(value));
    }
  }

  const names = panelSamples(photo, editor.panelCount());
  const images = await Promise.all(names.map(loadSample));
  images.forEach((img, i) => editor.setPanelPhoto(i, img));
  editor.selectPanel(0);
  await editor.render();
  signalReady();
  return true;
}
