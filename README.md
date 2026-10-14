# RiffHero

A lightweight browser guitar trainer in the spirit of Rocksmith: notes fall down a highway, the app listens to your playing through the microphone (YIN pitch detection) and scores you. Pure static files — no build step, no dependencies.

**Play online:** https://difp.github.io/DSV4.1TABS/ (allow microphone access; the mic needs `localhost` or HTTPS).

![RiffHero home screen](docs/screenshots/home.png)

## Features

- Falling tabs with fret numbers, sustain tails, beat and bar lines
- Microphone note recognition: accuracy, combo, S–E grade
- Import Guitar Pro (`.gp`, `.gpx`), MIDI (`.mid`) and native `.json`
- Song catalogs by file or link, with search, sorting and difficulty filter
- Built-in lessons (warm-ups, scales, chords, classics), a chord set from a classic guitar method, and simple public-domain tunes
- A short practice tip from the method is shown under each lesson title (RU/EN)
- Local profile and stats: practice time, accuracy, misses by string and fret, practice calendar, export/import
- "Tip of the day" based on your miss history; "Continue" for recent lessons
- A–B loop, speed 25–150%, metronome, count-in, autoplay
- Light / dark / system theme; Russian and English UI
- Installable PWA, works offline

| Falling notes | Lessons | Profile |
|---|---|---|
| ![Game](docs/screenshots/game.png) | ![Lessons](docs/screenshots/library.png) | ![Profile](docs/screenshots/profile.png) |

Dark theme and the built-in help:

| Dark theme | Help & shortcuts |
|---|---|
| ![Dark](docs/screenshots/dark.png) | ![Help](docs/screenshots/help.png) |

## Getting started

1. Open the page and allow microphone access.
2. Pick a lesson on the **Lessons** tab (or hit **Play** for the selected one).
3. Play along — the app listens and scores every note.

Keyboard: `Space` play/pause · `R` restart · `←/→` choose lesson or seek · `−/+` speed · `[`/`]` set loop A/B · `\` clear loop · `T` switch view · `?` help · `Esc` close/leave.

## Development

- Local: `python3 serve.py` → http://localhost:8000 (no-cache server).
- `?demo=1` in the URL enables autoplay — handy for a demo without a guitar.
- Entry point: `index.html` + `src/main.js`. Engine in `src/engine`, parsers in `src/parsers`, built-in lessons in `src/songs/demos.js`, UI strings in `src/i18n.js`.
- Offline mode is provided by `sw.js` (network-first, cache as fallback).

## Content

Classical and folk pieces are in the public domain; rock and blues patterns are original. Built-in chord exercises follow the progression and order of a public guitar method (warm-up and chromatic exercises → chords Em, Am, A, E, Dm, D, G, C, B7 → chord changes → sequences → arpeggios), and a short practice tip from the method is shown for every lesson.

## Русская версия

Смотрите [README.ru.md](README.ru.md).
