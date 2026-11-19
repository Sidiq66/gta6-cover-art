// VICE FRAME — hand-in program for the gta6-cover-art-01 bounty.
//
// The entry itself is the static web app under app/: VICE FRAME, a cover
// maker that slices photos into slanted, white-bordered panels (triptych,
// quad or duo), grades them from sunset to neon, sets a caption in Anton
// across the lower third and exports the result as a PNG. It runs entirely
// offline from those files; this program only delivers it. It copies app/
// and screenshots/ into the output directory and writes dossier.json there
// with buildDossier from the vendored make.fun library, under the scorer's
// own caps.
//
// Run it the way the grader does, or locally with an output override:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`app, screenshots and dossier.json written to ${outputDir}`);
