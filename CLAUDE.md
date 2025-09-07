# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application for learning multiplication tables using spaced repetition (FSRS algorithm). The app helps users memorize multiplication problems (2-9 × 2-99) by presenting questions, timing responses, and scheduling reviews based on performance.

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
- **Spaced Repetition**: ts-fsrs library (to be added)
- **Storage**: localStorage for persistence

### Project Structure
```
src/
├── app/
│   ├── layout.tsx    # Root layout with font configuration
│   ├── page.tsx      # Home page (to be converted to practice interface)
│   └── globals.css   # Global styles
```

### Implementation Plan
The project follows a 5-stage implementation plan detailed in `PLAN.md`:
1. Foundation & Card Generation (784 multiplication cards)
2. Core Practice Interface (question/answer UI)  
3. Response Timing & Grading (speed-based assessment)
4. FSRS Integration & Scheduling (spaced repetition)
5. Progress Tracking & Polish (statistics dashboard)

### Data Models (Planned)
- **MultiplicationCard**: Contains math problem + FSRS card state
- **SessionData**: User responses, timing, and speed statistics
- **SpeedStats**: Response time distribution for intelligent grading

### Key Features (To Implement)
- 784 unique multiplication problems (2-9 × 2-99)
- Precision timing using `performance.now()`
- Speed-based grading after 50-response warmup period
- FSRS algorithm for optimal review scheduling
- Complete localStorage persistence (no accounts needed)

### TypeScript Configuration
- Uses `@/*` path mapping for src imports
- Strict mode enabled
- Next.js plugin configured for optimal bundling

### Code Style (Biome)
- 2-space indentation
- Automatic import organization
- React and Next.js recommended rules
- Git integration for staged file checking

## Key Implementation Notes

When working on this project:
- Install `ts-fsrs` dependency before implementing spaced repetition features
- Use `performance.now()` for accurate response timing, not `Date.now()`
- Store all data in localStorage with structured keys (multiplicationCards, sessionData, appSettings)
- Follow the staged implementation plan to maintain working app state
- Test grading algorithm thoroughly during warmup vs post-warmup phases
- Ensure responsive design works on both desktop and mobile devices