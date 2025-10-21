# Math Facts FSRS Trainer

This app helps early learners master addition and subtraction facts using the **FSRS spaced repetition** algorithm. Reviews stay **offline** in browser `localStorage`, with optional JSON backup/restore. Grade presets, range controls, difficulty tuning, and optional timed sprints let you tailor the deck for grades 1–3.

### Tech Stack
- Next.js 15 (App Router) + React 19
- TypeScript 5, Tailwind v4, Biome for lint/format
- [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) for scheduling

### Getting Started
```bash
npm install # if dependencies are missing
npm run dev
```

Open `http://localhost:3000` to practice. Development scripts:
- `npm run build` – production build check
- `npm run start` – serve last build
- `npm run lint` – Biome lint + type-aware checks
- `npm run format` – Biome write mode

### Deck & Settings
The **Settings** modal lets you:
- Choose operation mode: Addition, Subtraction, or Mixed
- Set `minNumber`/`maxNumber` ranges (defaults 0–20)
- Toggle non-negative subtraction
- Apply Grade 1–3 presets (auto-regenerates the deck)
- Adjust warmup target, audio, and review forecast
- Boost practice near 10s/20s boundaries with Difficulty Tuning
- Enable optional timed challenges (30–120 seconds) for sprint practice

Click **Regenerate Deck** after changing a deck setting to rebuild cards. Grade presets regenerate automatically.

### Data & Backups
- Cards persist in `localStorage` under the `multiplicationCards` key (legacy name retained for compatibility)
- Session stats and speed percentiles live in `sessionData`
- Settings are stored under `appSettings`
- Use **Download Backup** / **Upload Backup** in Settings to export or import JSON snapshots. Legacy multiplication backups are not compatible with the arithmetic deck.

### Key Files
- `src/lib/types.ts` – card/types helpers (`formatQuestion`, `isCorrect`)
- `src/lib/cards.ts` – deck generation driven by current settings
- `src/lib/storage.ts` – persistence, migrations, `regenerateDeck`
- `src/app/page.tsx` – main study loop, FSRS scoring, UI flow
- `src/components/Settings.tsx` – deck controls, presets, backup UI
- `src/components/CelebrationOverlay.tsx` – reduced-motion-aware confetti overlay
