# Live Quiz Timer Improvements

## Overview
This document outlines the improvements made to the timer functionality in the live quiz system to ensure proper handling of quiz start events, timer resets, and cleanup.

## Key Improvements

### 1. Quiz Start Event Detection
- **QuizPage.js**: Added detection for quiz start events when phase changes from 'lobby' to 'question'
- **LiveQuizParticipant.js**: Enhanced state management for quiz start events
- **Behavior**: When quiz starts, all timers are reset and state is cleared for a fresh start

### 2. Timer Cleanup and Reset
- **Multiple Timer Prevention**: Ensured only one timer interval runs at a time
- **Proper Cleanup**: Added cleanup functions to clear intervals when components unmount or dependencies change
- **State Reset**: Reset timer display and related state when questions change or quiz phases change

### 3. Phase-Based Timer Management
- **Lobby Phase**: Timer is cleared and not displayed
- **Question Phase**: Timer starts countdown from question duration (e.g., 20 seconds)
- **Times Up Phase**: Timer shows 0 and locks submissions
- **Leaderboard Phase**: Timer is cleared but question remains visible for review
- **Finished Phase**: Timer is cleared and all state is reset

### 4. Question Change Handling
- **State Reset**: When a new question loads, all previous state is cleared
- **Timer Reset**: Timer is reset to the new question's duration
- **Answer Reset**: Selected answers and feedback are cleared

### 5. Real-time Database Synchronization
- **Single Source of Truth**: Timer uses `timer_end` from the database as the authoritative time
- **Immediate Updates**: Timer updates immediately when session data changes
- **Fallback Handling**: Graceful handling when timer data is missing or invalid

## Implementation Details

### QuizPage.js Changes
```javascript
// Timer logic with proper cleanup
useEffect(() => {
  let interval = null;
  
  // Clear timer if not in question phase
  if (!session || !currentQuestion || quizPhase !== 'question') {
    setTimeLeft(0);
    setShowCorrect(false);
    return () => {
      if (interval) clearInterval(interval);
    };
  }
  
  // Start countdown timer
  function updateTime() {
    const now = new Date();
    const secondsLeft = Math.max(0, Math.floor((timerEndDate.getTime() - now.getTime()) / 1000));
    setTimeLeft(secondsLeft);
    
    if (secondsLeft === 0) {
      setShowCorrect(true);
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }
  }
  
  updateTime(); // Set initial value
  interval = setInterval(updateTime, 1000);
  
  return () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  };
}, [session?.timer_end, currentQuestion?.id, quizPhase, timerTrigger]);
```

### LiveQuizParticipant.js Changes
```javascript
// Enhanced state management for quiz phases
useEffect(() => {
  if (!liveQuiz) return;
  
  if (liveQuiz.phase === 'question') {
    // Quiz question active - reset state and start timer
    setIsLocked(false);
    setSubmitted(false);
    setFeedback(null);
    
    if (liveQuiz.timer_end) {
      const end = new Date(liveQuiz.timer_end).getTime();
      const now = Date.now();
      const initialTimeLeft = Math.max(0, Math.ceil((end - now + 500) / 1000));
      setTimeLeft(initialTimeLeft);
    }
  } else if (liveQuiz.phase === 'lobby') {
    // Quiz in lobby - clear everything
    setTimeLeft(0);
    setSelectedOption(null);
    setFeedback(null);
    setIsLocked(false);
    setSubmitted(false);
  }
  // ... handle other phases
}, [liveQuiz, slides]);
```

## Benefits

1. **No Stale Timers**: Previous timers are properly cleared before new ones start
2. **Immediate Response**: Timer updates immediately when quiz starts or questions change
3. **Consistent State**: All participants see the same timer state synchronized from the database
4. **Better UX**: Clear visual feedback for different quiz phases
5. **Reliable Countdown**: Timer accurately counts down to zero and triggers appropriate actions

## Testing

To test the timer improvements:

1. **Quiz Start**: Join a quiz in lobby phase, verify timer doesn't run until quiz starts
2. **Question Changes**: Verify timer resets to new duration when questions change
3. **Phase Transitions**: Test transitions between lobby → question → times_up → leaderboard
4. **Multiple Participants**: Ensure all participants see synchronized timer state
5. **Network Issues**: Test behavior when real-time updates are delayed

## Future Enhancements

- Add visual countdown animations
- Implement sound notifications for time warnings
- Add configurable timer durations per question
- Implement pause/resume functionality for hosts 