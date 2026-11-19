// VICE FRAME — the hand-in program for the gta6-cover-art-01 entry.
//
// The entry itself is the static site under app/: plain HTML, CSS and
// ES modules that a desktop browser runs entirely offline. This
// program packages it for the judges. It copies app/ and screenshots/
// into the output directory and writes dossier.json there — the
// summary of the entry the vendored make.fun library builds under the
// competition's own size caps.
//
// Run it the way the grader does, with the output pointed at a scratch
// folder:  MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), {
    recursive: true,
  });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`VICE FRAME packaged into ${outDir}`);
