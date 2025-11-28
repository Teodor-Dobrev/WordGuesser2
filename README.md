# Word Guesser 2

A modern React + TypeScript remake of the classic Word Guesser desktop game. Players enter their name, pick a language (English or Bulgarian), choose a timer (1–5 minutes in 30 second steps), and hunt for words on a 10×10 board using mouse drags or keyboard typing. Guessed words immediately show their point value and (for English) a cached dictionary definition, and round results are recorded in a local leaderboard grouped by timer length.

## Key Features

- **Open authentication** – simple name gate persisted in `localStorage` so players can jump right back in.
- **Smart selection engine** – click, drag, or type to build paths. Keyboard input tracks every possible branch so words such as `PHONE` can be typed even when duplicate letters surround the cursor.
- **Timer controls** – 1 to 5 minutes (30 second steps) with Start, Stop (with confirmation), and Restart (confirm, placed on the right to avoid accidents).
- **Dual-language support** – switch between English and Bulgarian letter supplies; dictionary files can be dropped in without rebuilding.
- **Definitions cache** – English definitions are fetched from `dictionaryapi.dev`, stored once per word, and reused across rounds.
- **Guessed words panel** – shows live list of answers with their points and definitions.
- **End-of-game stats + leaderboard** – a dedicated modal for guessed words/definitions, followed by a leaderboard window scoped to the round’s timer. All leaderboard data lives in `localStorage`.

## Getting Started

```bash
npm install
npm run dev
```

- Development server: <http://localhost:5173>
- Production build: `npm run build`
- Preview build: `npm run preview`

## Dictionaries

Source word lists live in `src/assets/dictionaries/` and are baked into the
build as static text assets, so the app always has access to the full data set.
Required filenames:

- `english.txt` – one Latin word per line.
- `bulgarian.txt` – one Cyrillic word per line.

Update those files and rebuild if you want to ship a different dictionary.

## Controls & Shortcuts

- **Mouse/Touch** – click to select, drag to extend selection with forgiving hit detection. Clicking the last letter again backtracks.
- **Keyboard** – with a letter selected, type to extend in every viable direction. Backspace removes the last letter, Escape clears the whole path, Enter submits a guess.
- **Guess button / Enter** – validates against the current language dictionary, awards points, and fetches a definition once per English word.

## Leaderboard & Definitions Cache

- Leaderboard entries are stored in `localStorage` under `wordguesser:leaderboard` and grouped by timer length. Only the top 20 scores per bucket are kept.
- Dictionary definitions are cached under `wordguesser:definitions` using the entire API payload so future rounds never re-download the same word.

## Project Structure Highlights

- `src/features/auth/NameGate.tsx` – lightweight name entry gate.
- `src/features/game/` – main gameplay UI, grid rendering, selection logic, scoring helpers.
- `src/features/leaderboard/` & `src/features/stats/` – modal dialogs and storage helpers.
- `src/services/` – dictionary loader and definitions cache.
- `src/assets/dictionaries/` – source word lists bundled with the app (with optional overrides in `public/dictionaries/`).

Feel free to tailor the styling or add new power-ups, but the core gameplay loop and storage strategy are ready to roll.
