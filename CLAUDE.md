# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **fully implemented** Next.js 15 application for learning multiplication tables using spaced repetition (FSRS algorithm). The app helps users memorize multiplication problems (2-9 × 2-99) by presenting questions, timing responses, and scheduling reviews based on performance. All core features are complete and working.

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
│   ├── layout.tsx           # Root layout with font configuration
│   ├── page.tsx             # Main practice interface (completed)
│   └── globals.css          # Global styles
├── components/
│   ├── ProgressDashboard.tsx    # Modal showing learning progress
│   └── StatisticsChart.tsx      # Daily performance trends
└── lib/
    ├── types.ts             # TypeScript definitions
    ├── cards.ts             # 784 card generation logic
    ├── storage.ts           # localStorage persistence
    ├── scheduler.ts         # FSRS card scheduling
    └── grading.ts           # Speed-based rating system
```

### Implementation Status
✅ **All 5 stages completed:**
1. **Foundation & Card Generation**: 784 multiplication cards with FSRS integration
2. **Core Practice Interface**: Full question/answer UI with keyboard shortcuts
3. **Response Timing & Grading**: Precision timing with speed-based assessment
4. **FSRS Integration & Scheduling**: Complete spaced repetition system
5. **Progress Tracking & Polish**: Statistics dashboard and performance analytics

### Data Models (Implemented)
- **MultiplicationCard**: Contains math problem (2-9 × 2-99) + FSRS card state
- **SessionData**: User responses, timing, speed statistics, and session tracking
- **SpeedStats**: Response time percentiles for intelligent grading (25th, 50th, 75th, 90th)
- **ResponseRecord**: Individual response with timing, accuracy, and timestamp
- **AppSettings**: Configuration including warmup target (default: 50 responses)

### Key Features (Fully Implemented)
- ✅ 784 unique multiplication problems (2-9 × 2-99)
- ✅ Precision timing using `performance.now()`
- ✅ Speed-based grading with warmup period (50 responses)
- ✅ Full FSRS algorithm implementation for optimal scheduling
- ✅ Complete localStorage persistence (no accounts needed)
- ✅ Progress dashboard with detailed statistics
- ✅ Daily performance trends and analytics
- ✅ Responsive design for desktop and mobile
- ✅ Keyboard shortcuts (Ctrl/Cmd+P for progress, Ctrl/Cmd+S for stats)
- ✅ Card state tracking (New, Learning, Review, Relearning)
- ✅ Upcoming review schedule display (7-day forecast)
- ✅ Real-time feedback with FSRS ratings (Again, Hard, Good, Easy)

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

#### FSRS Integration (src/lib/scheduler.ts)
- **Card Selection**: Prioritizes due cards by state (New → Learning → Relearning → Review)
- **Scheduling Algorithm**: Uses ts-fsrs for optimal review intervals
- **Statistics Tracking**: Real-time card state distribution and upcoming reviews

#### Speed-Based Grading (src/lib/grading.ts)
- **Warmup Phase**: First 50 responses use default "Good" rating
- **Speed Percentiles**: Calculates 25th, 50th, 75th, 90th percentiles for grading
- **Rating Logic**: 
  - Incorrect → Again
  - ≤ 25th percentile → Easy
  - ≤ 50th percentile → Good  
  - ≤ 75th percentile → Hard
  - \> 75th percentile → Again (too slow)

#### Data Persistence (src/lib/storage.ts)
- **multiplicationCards**: 784 cards with FSRS state
- **sessionData**: Response history, speed stats, session tracking
- **appSettings**: User preferences (warmup target: 50)
- **Date Serialization**: Handles Date objects in localStorage correctly

#### User Interface Features
- **Modal System**: Progress dashboard and statistics with Escape key support
- **Keyboard Navigation**: Enter to submit/continue, Ctrl/Cmd+P/S for modals
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: User-friendly error messages with dismiss option
- **Loading States**: Smooth transitions and loading indicators

## Development Guidelines

### Code Patterns
- **React Hooks**: Extensive use of useState, useEffect, useCallback
- **TypeScript**: Strict typing with proper interface definitions
- **Error Boundaries**: Graceful error handling throughout the application
- **Performance**: Optimized re-renders with proper dependency arrays

### Key Implementation Notes

When working on this project:
- ✅ `ts-fsrs` dependency already installed and integrated
- ✅ Uses `performance.now()` for accurate response timing
- ✅ localStorage structured with keys: multiplicationCards, sessionData, appSettings
- ✅ All stages implemented and working
- ✅ Grading algorithm handles warmup vs post-warmup phases correctly
- ✅ Responsive design works on both desktop and mobile devices

### Architectural Decisions
- **Single Page Application**: All functionality in one cohesive interface
- **No Backend Required**: Complete client-side implementation with localStorage
- **Progressive Enhancement**: Works without JavaScript for basic functionality
- **Accessibility**: Proper ARIA labels, keyboard navigation, and screen reader support