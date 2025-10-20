# AGENT.md — Repo Agent Brief

This document tells an automated coding agent (or a human maintainer) exactly how to work on this repository.

The project is a **Next.js 15 + React 19 + Tailwind v4** app that teaches **arithmetic (addition/subtraction) with FSRS** (via `ts-fsrs`) and stores progress **locally (anonymous JSON in localStorage)**. It started as a multiplication trainer and now supports +/− for grades 1–3.

---

## Mission

1. Keep the app **fast, mobile-first, accessible**.
2. Deliver a kid-friendly experience for **addition/subtraction** with graded scheduling using **FSRS**.
3. Preserve **anonymous, local-only storage** with export/import to JSON. No network calls for PII.
4. Maintain clear code and guardrails for future features (difficulty presets, celebrations, etc.).

---

## Tech Stack & Conventions

- **Next.js 15.5** (App Router) with **React 19**
- **TypeScript 5**, **Tailwind v4**, **Biome** for lint/format
- **FSRS** via `ts-fsrs` for review scheduling
- Storage: **localStorage** (JSON), backup/export UI present
- UI dir: `src/app` (pages), `src/components` (UI), `src/lib` (domain logic)
- Commit style: concise, imperative; include scope when useful (e.g., `feat(settings): add grade presets`)
- Lint: `npm run lint` (Biome); Format: `npm run format`

---

## Runbook

```bash
# Install
npm i

# Dev
npm run dev

# Build / Start
npm run build
npm start

# Lint / Format
npm run lint
npm run format
```

Open http://localhost:3000. The app is phone-friendly by design.

---

## Key Files

- `src/lib/types.ts` — **Card types** (ArithmeticCard and legacy MultiplicationCard), helpers:
  - `formatQuestion(card)` → e.g., `8 − 3`
  - `isCorrect(card, answer)`
- `src/lib/cards.ts` — **Deck generation** for +/−, with controls for ranges and non-negative subtraction
- `src/lib/scheduler.ts` — Due checks and FSRS integration
- `src/lib/grading.ts` — Speed-based grading → FSRS `Rating`
- `src/lib/storage.ts` — Settings + deck persistence in localStorage; migration-safe; `regenerateDeck()`
- `src/components/Settings.tsx` — Operation (+/−/mix), min/max, non-negative subtraction
- `src/components/ProgressDashboard.tsx` — Progress UI
- `src/components/StatisticsChart.tsx` — Stats
- `src/components/BackupManager.tsx` — Export/Import JSON backups
- `src/app/page.tsx` — Main study loop (renders question, answer input, feedback, schedules next review)

---

## FSRS Rules (ts-fsrs)

- Each card has an `fsrsCard` from `createEmptyCard()`.
- After each answer, map result to an FSRS `Rating` using `grading.ts` (warmup bypass → "Good").
- Schedule next review via `scheduler.ts` (`isCardDue`, `scheduleNext`). Keep deterministic and testable.

**Never** mutate date fields as strings; on load, convert to `Date`. The storage module handles migrations.

---

## Product Requirements (Grade 1–3)

- **Operations:** Addition, Subtraction, or Mix
- **Ranges:** Configurable `minNumber`–`maxNumber` (default 0–20)
- **Subtraction:** If non-negative toggle is ON, enforce `left >= right`
- **Warmup:** `warmupTarget` correct answers before enabling time-based grading
- **Forecast:** Optional 7-day chart of upcoming reviews
- **Feedback:** Gentle, kid-friendly; avoid negative phrasing

**Accessibility**: Ensure semantic labels, focus states, and high-contrast dark mode.

---

## Guardrails

- **No remote analytics, no PII**. Storage is local only (JSON). Export/import is user-triggered.
- **Offline-friendly**: Avoid breaking when localStorage is empty or corrupted; auto-migrate shapes.
- **Deterministic ID**: Arithmetic cards id format `arith:<op>:<left>:<right>`.

---

## Adding New Features

### 1) Grade Presets
- Add quick buttons in `Settings.tsx`:
  - Grade 1: 0–10, + only, non-negative subtraction irrelevant
  - Grade 2: 0–20, +/− mix, non-negative subtraction ON
  - Grade 3: 0–50 (or 0–99), +/− mix, non-negative subtraction ON

### 2) Celebrations
- On streak milestones or p90 speed improvement, trigger confetti (client-only), respecting `reduced-motion`.
- Keep sounds optional (toggle).

### 3) Difficulty Tuning
- Weighted generation (e.g., more practice near 10/20 boundaries)
- Timed rounds (but preserve accessibility: optional, not forced).

---

## Definition of Done

- All flows work on **mobile** and **desktop**.
- New settings persist and **Regenerate Deck** honors them.
- FSRS state updates correctly after answers; due logic respects current time.
- Lint/format clean; no console errors in dev.
- No network/PII regressions.

---

## Minimal Test Plan

- Fresh launch → deck initializes from settings (default mix, 0–20).
- Switch to **Addition only** → regenerate → only `+` problems appear; answer flow works.
- Switch to **Subtraction only**, **non-negative** ON → no negative results appear.
- Warmup mode: before threshold, all correct = "Good"; after threshold, speed grading kicks in.
- Export → clear storage → Import → state is restored (dates parsed).

---

## Common Pitfalls

- Failing to convert serialized dates on load → scheduling bugs.
- Using `card.multiplicand`/`multiplier` directly in UI → breaks arithmetic mode.
  - Always use `formatQuestion(card)` and `isCorrect(card, answer)`.
- Generating subtraction where `left < right` when non-negative is required.

---

## Quick Code Snippets

**Get active question text**

```ts
import { formatQuestion } from "@/lib/types";
<h1>{formatQuestion(card)}</h1>
```

**Check correctness**

```ts
import { isCorrect } from "@/lib/types";
const correct = isCorrect(card, Number(userAnswer));
```

**Regenerate deck after settings change**

```ts
import { regenerateDeck } from "@/lib/storage";
const cards = regenerateDeck();
```

---

## Issue Labels

- `feat`, `bug`, `ui`, `a11y`, `docs`, `perf`, `refactor`
- `good-first-issue` for contained, low-risk tasks

---

## Contact

This app is intentionally offline-first and anonymous. Discuss changes via PR comments and keep commit messages crisp.
