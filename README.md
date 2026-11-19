# VICE FRAME

An original GTA-style cover art maker that runs entirely in the browser. Give it a photograph and it lays your pictures into the slanted multi-panel poster format — white seams, bold caption lettering, and a colour grade that slides from a warm Vice City sunset to full neon — then exports the finished cover as a PNG to share.

The design, the name and the artwork are all original to this entry; nothing here is a Rockstar Games logo, artwork or font.

## Run it

```
node serve.ts
```

then open <http://localhost:8080>. The server is a few lines of Node's standard library serving the static site in `app/` — there is no build step and the app itself works fully offline from those files.

## What it does

- **Multi-panel layouts** — Triptych (3 panels), Quad (4) and Duo (2), drawn as leaning parallelogram strips divided by dark gutters and white seams.
- **Your photos, or the built-in samples** — open any photo from your device, or start from the three bundled scenes (Pier, Boulevard, Beach). The photo fills the selected panel; click a panel on the cover to select it and drag on the cover to pan its photo, with a per-panel zoom slider.
- **Sunset-to-neon grade** — one slider blends a warm sunset correction and amber-rose wash into a saturated neon look with a magenta-cyan wash. The caption lettering follows the grade: cream at sunset, white-into-pink with an ice-blue subtitle at neon.
- **Caption lettering** — a big uppercase title fitted to the cover's width with a smaller subtitle above it, set in the bundled Anton typeface with a heavy ink outline across the lower third.
- **Post sizes** — export at 1080 × 1080 (square), 1080 × 1350 (portrait) or 1920 × 1080 (wide), downloaded as a PNG rendered at full resolution.

## The samples and the typeface

The three sample photographs in `app/samples/` are AI-generated originals made for this entry. The caption typeface is Anton by Vernon Adams, bundled at `app/fonts/Anton-Regular.ttf` and licensed under the SIL Open Font License 1.1 — the full license text is in `app/fonts/OFL.txt`.

## Layout of the entry

- `app/index.html`, `app/style.css` — the editor page and its dark neon theme.
- `app/src/panels.js` — the slanted panel geometry.
- `app/src/grade.js` — the sunset-to-neon colour grade.
- `app/src/render.js` — the cover renderer (panels, seams, caption).
- `app/src/main.js` — the editor wiring.
- `app/src/shots.js` — fixed `?shot=` scenes the screenshots were taken from.
- `screenshots/` — the cover and editor screenshots.
- `main.ts` — packages `app/` and `screenshots/` and writes the entry's dossier.
- `serve.ts` — the local development server above.

## License

The code in this repository is released under the license in `LICENSE`. The Anton font remains under its own license, above.
