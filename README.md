# VICE FRAME

An original multi-panel cover maker in the spirit of GTA-style poster art:
your photos are sliced into slanted, white-bordered panels, graded from a
warm sunset to a hot neon, captioned in bold poster lettering across the
lower third, and exported as a PNG ready to post. No account, no uploads, no
network — the app is plain static files and runs entirely in the browser.

VICE FRAME is an entry for make.fun's
[gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01) bounty. It is
an original work: no Rockstar Games logos, artwork, characters or fonts are
used anywhere in it.

## Run it

```
node serve.ts
```

then open http://localhost:8080 in a desktop browser. (Any static file
server pointed at `app/` works just as well; there is no build step.)

## Features

- **Three panel layouts** — Triptych, Quad and Duo: leaning parallelogram
  strips with white seams on a dark outline, like a poster collage.
- **Your photos or the bundled samples** — open a photo from your machine
  (it never leaves it) or start from the three built-in samples: pier,
  boulevard and beach.
- **Per-panel framing** — click a panel on the cover to select it, drag on
  the cover to pan its photo, and zoom it with the slider.
- **Sunset ↔ Neon grade** — one slider blends the colour grade: saturation
  and contrast through a canvas filter, plus warm-amber-to-magenta tints at
  the sunset end and cyan-to-hot-pink at the neon end.
- **Poster caption** — a title in big outlined Anton lettering across the
  lower third, with a smaller subtitle above it, over a dusk scrim.
- **Three export sizes** — 1080 × 1080 (square post), 1080 × 1350
  (portrait post) and 1920 × 1080 (wide banner), downloaded as a PNG at
  exactly the chosen size.
- **Screenshot scenes** — `?shot=cover` and `?shot=editor` URLs set up
  fixed scenes (photo, layout, size, caption, grade) for taking the
  screenshots in `screenshots/`.

## Notes

- The sample photos under `app/samples/` are AI-generated original images,
  made for this entry and free to use.
- The display font is **Anton** (`app/fonts/Anton-Regular.ttf`), licensed
  under the SIL Open Font License 1.1 — see `app/fonts/OFL.txt`.
- The code is licensed under the terms in the `LICENSE` file at the root of
  this repository.
