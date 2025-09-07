# Multiplication Table FSRS App Implementation Plan

## Overview
Build a spaced repetition app for memorizing multiplication tables (2-9 × 2-99) using the ts-fsrs library. The app will track response accuracy and speed to optimize learning efficiency.

## Core Requirements
- Present multiplication questions (e.g., "7 × 23")
- Accept typed answers with Enter key submission
- Grade responses based on correctness and speed
- Use FSRS algorithm for optimal scheduling
- Store all data in localStorage (no accounts needed)
- Collect speed distribution for intelligent grading after warmup

## Technical Architecture

### Tech Stack
- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Spaced Repetition**: ts-fsrs library
- **Storage**: localStorage for persistence
- **Build Tools**: Biome for linting/formatting

### Data Models

#### Card Structure
```typescript
interface MultiplicationCard {
  id: string;
  multiplicand: number; // 2-9
  multiplier: number;   // 2-99
  fsrsCard: Card;      // ts-fsrs Card object
}
```

#### Session Data
```typescript
interface SessionData {
  responses: ResponseRecord[];
  speedStats: SpeedStats;
  lastReviewDate: Date;
}

interface ResponseRecord {
  cardId: string;
  answer: number;
  correct: boolean;
  responseTime: number; // milliseconds
  timestamp: Date;
}

interface SpeedStats {
  responses: number[];
  percentiles: { p25: number; p50: number; p75: number; p90: number };
  isWarmedUp: boolean; // true after 50+ responses
}
```

## Implementation Stages

### Stage 1: Foundation & Card Generation
**Goal**: Set up project structure and generate all multiplication cards
**Success Criteria**: 
- 784 cards generated (8 multiplicands × 98 multipliers)
- Cards stored in localStorage with FSRS initialization
- Basic Next.js app structure ready

**Tasks**:
- Install ts-fsrs dependency
- Create card generation utility
- Implement localStorage persistence layer
- Set up basic app layout with Tailwind

**Tests**: Verify 784 cards created with unique IDs and correct math problems

**Status**: Complete

### Stage 2: Core Practice Interface
**Goal**: Create functional question/answer interface
**Success Criteria**:
- Display multiplication questions clearly
- Accept typed numeric answers
- Handle Enter key submission
- Show immediate feedback (correct/incorrect)

**Tasks**:
- Build question display component
- Implement answer input with validation
- Add keyboard event handling
- Create feedback UI states
- Add basic styling with Tailwind

**Tests**: 
- Can display random questions
- Input accepts only numbers
- Enter submits answer
- Feedback shows correctly

**Status**: Not Started

### Stage 3: Response Timing & Grading
**Goal**: Implement accurate response timing and speed-based grading
**Success Criteria**:
- Precise timing from question display to answer submission
- Speed distribution calculation after warmup period
- Integrated FSRS grading based on accuracy + speed

**Tasks**:
- Add high-precision timing (performance.now())
- Implement speed statistics tracking
- Create grading algorithm combining accuracy + speed
- Build warmup phase detection (50+ responses)
- Integrate with FSRS rating system

**Tests**:
- Timing accuracy within 10ms
- Speed percentiles calculated correctly
- Grading reflects both accuracy and speed
- FSRS ratings applied appropriately

**Status**: Not Started

### Stage 4: FSRS Integration & Scheduling
**Goal**: Full spaced repetition scheduling with card selection
**Success Criteria**:
- Cards scheduled using FSRS algorithm
- Due cards presented first
- Card state updated after each response
- Review intervals respect FSRS recommendations

**Tasks**:
- Implement FSRS scheduler integration
- Build card selection algorithm (due cards first)
- Create card state update logic
- Add review scheduling display
- Implement session management

**Tests**:
- Due cards appear before non-due cards
- Card difficulty adjusts based on performance
- Review intervals increase for mastered cards
- All FSRS states (New, Learning, Review, Relearning) work

**Status**: Not Started

### Stage 5: Progress Tracking & Polish
**Goal**: User-friendly progress tracking and app refinement
**Success Criteria**:
- Progress dashboard showing learned/due cards
- Statistics on accuracy and speed trends
- Smooth user experience with loading states
- Responsive design for different screen sizes

**Tasks**:
- Create progress dashboard component
- Add statistics visualization
- Implement loading and error states
- Responsive design improvements
- Performance optimizations
- Add keyboard shortcuts and accessibility

**Tests**:
- Dashboard shows accurate statistics
- All components responsive on mobile/desktop
- Fast loading and smooth interactions
- Keyboard navigation works properly

**Status**: Not Started

## Key Design Decisions

### Question Range
- Multiplicands: 2-9 (focusing on commonly difficult tables)
- Multipliers: 2-99 (practical range for mental math)
- Total: 784 unique multiplication problems

### Grading Algorithm
```typescript
function calculateGrade(correct: boolean, responseTime: number, speedStats: SpeedStats): Rating {
  if (!correct) return Rating.Again;
  
  if (!speedStats.isWarmedUp) {
    return Rating.Good; // Default during warmup
  }
  
  if (responseTime <= speedStats.percentiles.p25) return Rating.Easy;
  if (responseTime <= speedStats.percentiles.p50) return Rating.Good;
  if (responseTime <= speedStats.percentiles.p75) return Rating.Hard;
  return Rating.Again; // Very slow, even if correct
}
```

### Storage Structure
```
localStorage:
├── multiplicationCards: MultiplicationCard[]
├── sessionData: SessionData
└── appSettings: { warmupTarget: 50, ... }
```

### Performance Considerations
- Lazy load cards to prevent UI blocking
- Debounce localStorage writes
- Use React.memo for stable components
- Implement efficient card selection algorithms

## Development Workflow
1. Implement each stage incrementally
2. Test thoroughly before moving to next stage
3. Update this plan as requirements evolve
4. Maintain working app state after each stage
5. Use Biome for consistent code formatting

## Success Metrics
- **Technical**: All tests pass, no console errors, responsive design
- **Educational**: Efficient spaced repetition scheduling, accurate speed-based grading
- **User Experience**: Smooth interactions, clear feedback, progress visibility

---

*This plan will be updated as implementation progresses and requirements are refined.*