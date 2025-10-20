# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project is a **Next.js 15 + React 19** web app that teaches **addition and subtraction facts** using the FSRS spaced-repetition algorithm. Learners can tailor the deck with number ranges, operation modes (addition, subtraction, mixed), and a non-negative subtraction toggle. Reviews are stored **locally in browser storage** (no accounts or PII), with optional JSON backup/import. Grade presets and celebratory feedback keep the experience kid-friendly for grades 1–3.

## Development Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production with Turbopack  
npm run start        # Start production server

# Code Quality
npm run lint         # Run Biome linter
npm run format       # Format code with Biome
```

## Architecture & Key Decisions

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Runtime**: React 19
- **Styling**: Tailwind CSS 4
- **Fonts**: Geist (sans) and Geist Mono 
- **Code Quality**: Biome (linter + formatter)
- **Spaced Repetition**: ts-fsrs library v5.2.3 ✅
- **Storage**: localStorage for persistence

### Project Structure
```
src/
├── app/
│   ├── layout.tsx         # Root layout + metadata
│   ├── page.tsx           # Main practice loop (FSRS, input flow)
│   └── globals.css        # Tailwind + global styles
├── components/
│   ├── Settings.tsx       # Deck settings, grade presets, backup controls
│   ├── ProgressDashboard.tsx
│   └── StatisticsChart.tsx
└── lib/
    ├── types.ts           # ArithmeticCard, helpers (formatQuestion, isCorrect)
    ├── cards.ts           # Deck generation from AppSettings
    ├── storage.ts         # localStorage persistence, migrations, regenerateDeck
    ├── scheduler.ts       # FSRS scheduling helpers
    └── grading.ts         # Warmup-aware grading + ResponseRecord helpers
```

### Implementation Highlights
- Dynamic deck generation for addition/subtraction using `generateArithmeticDeck`
- FSRS scheduling integrated via `ts-fsrs` (`scheduler.ts`, `page.tsx`)
- Warmup-aware grading: responses before the target default to `Good`
- Session persistence fully client-side (localStorage keys retained for compatibility)
- Grade presets (Grades 1–3) wire into deck regeneration with safe defaults
- Accessibility focus: large inputs, keyboard-only flow, respectful celebrations

### Data Models
- **ArithmeticCard**: `{ id: arith:<op>:<left>:<right>, operation, left, right, fsrsCard }`
- **SessionData**: Responses, speed stats percentiles, timestamps, session timing
- **SpeedStats**: Response history + p25/p50/p75/p90 percentiles, warmup flag
- **ResponseRecord**: `{ cardId, answer, correct, responseTime, timestamp }`
- **AppSettings**: `operationMode`, `minNumber`, `maxNumber`, `nonNegativeSubtraction`, warmup target, sound toggle, review forecast toggle

### TypeScript Configuration
- Uses `@/*` path mapping for src imports
- Strict mode enabled
- Next.js plugin configured for optimal bundling

### Code Style (Biome)
- 2-space indentation
- Automatic import organization
- React and Next.js recommended rules
- Git integration for staged file checking

### Core Application Logic

#### FSRS Integration (`src/lib/scheduler.ts`)
- Card selection prioritises due cards, then fresh cards, mirroring FSRS state priorities
- Upcoming review forecast and card-state breakdown used across UI components

#### Speed Grading (`src/lib/grading.ts`)
- Warmup target configurable; before threshold every correct answer → `Good`
- Percentile-driven grading after warmup (Again/Hard/Good/Easy)
- `createResponseRecord` unifies stored response shape

#### Storage (`src/lib/storage.ts`)
- Handles migration from legacy multiplication deck (auto-regenerates arithmetic deck)
- `regenerateDeck` persists new deck, resets session data, honours current AppSettings
- JSON export/import with validation (legacy multiplication backups rejected)

#### UI Flow (`src/app/page.tsx`)
- Displays question via `formatQuestion(card)` and accepts negative answers when needed
- Correction mode requires the child to enter the right answer before proceeding
- Settings modal triggers deck regeneration and manages grade presets & backups
- Keyboard shortcuts: `Enter` to submit/continue, `Ctrl/Cmd+P` (Progress), `Ctrl/Cmd+S` (Stats), `Ctrl/Cmd+B` (Settings)

## Development Guidelines

### Code Patterns
- **React Hooks**: Extensive use of useState, useEffect, useCallback
- **TypeScript**: Strict typing with proper interface definitions
- **Error Boundaries**: Graceful error handling throughout the application
- **Performance**: Optimized re-renders with proper dependency arrays

### Key Implementation Notes

When working on this project:
- **Deck-affecting changes** (operation/range/non-negative) must trigger `regenerateDeck`
- Preserve `formatQuestion`/`isCorrect` helpers whenever manipulating card data
- Maintain localStorage/backups contract; never introduce remote persistence for PII
- Keep celebratory effects optional (`soundEnabled`) and respect prefers-reduced-motion for future visuals
- Ensure new features work on mobile and desktop, and document manual test steps in PRs

### Architectural Decisions
- **Single Page Application**: All functionality in one cohesive interface
- **No Backend Required**: Complete client-side implementation with localStorage
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **Accessibility**: Proper ARIA labels, keyboard navigation, and screen reader support
