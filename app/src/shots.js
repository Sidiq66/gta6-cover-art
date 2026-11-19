// Fixed scenes for screenshots, driven by the page's query string:
//
//   ?shot=cover&photo=pier&layout=triptych&size=1920x1080&caption=NEON%20SHORES
//     shows only the cover, centred full-height on a dark page.
//   ?shot=editor&photo=boulevard&caption=VICE%20NIGHTS
//     shows the editor with that sample loaded and the caption set.
//
// `photo` names the sample the panels are filled from (samples/<photo>.jpg),
// cycling through the other samples for the remaining panels; `subtitle` and
// `grade` (0..1) are optional. Once the scene is painted — photos decoded,
// the Anton font ready, two frames rendered — window.__shotReady is set.

const DEFAULT_SUBTITLE = 'AN ORIGINAL VICE FRAME COVER';

export async function runShotMode(query, app) {
  const mode = query.get('shot');
  const photo = query.get('photo') ?? 'pier';
  const title = query.get('caption') ?? 'NEON SHORES';
  const subtitle = query.get('subtitle') ?? DEFAULT_SUBTITLE;

  if (mode === 'cover') document.body.classList.add('shot-cover');
  if (query.get('size')) app.setSize(query.get('size'));
  if (query.get('layout')) app.setLayout(query.get('layout'));
  const grade = Number.parseFloat(query.get('grade') ?? '');
  if (Number.isFinite(grade)) app.setGrade(Math.min(1, Math.max(0, grade)));

  await app.fillFrom(photo);
  app.setCaption(title, subtitle);
  await document.fonts.ready;
  app.redraw(mode === 'cover');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
