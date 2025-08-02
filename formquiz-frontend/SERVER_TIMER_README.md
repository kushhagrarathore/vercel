# Server-Based Timer Implementation

## Overview

This implementation provides a robust, server-based timer system for live quizzes that ensures perfect synchronization across all participants, prevents timer drift, and handles timezone issues.

## Key Features

### 1. Server Time Synchronization
- Uses Supabase RPC function `get_server_time()` to get accurate server time
- Calculates client-server time offset using multiple samples and median calculation
- Prevents timezone mismatches by using UTC timestamps

### 2. Drift Detection and Correction
- Monitors for significant timer drift (>2 seconds)
- Automatically re-syncs when drift is detected
- Periodic re-sync every 15 seconds to maintain accuracy

### 3. Real-Time Updates
- Uses Supabase real-time subscriptions to listen for timer changes
- Immediate synchronization when timer is updated by admin
- Prevents stale session states

### 4. Re-answering Prevention
- Checks if user has already answered before allowing submission
- Prevents submission after timer expires
- Database-level validation using `lq_live_responses` table

## Components

### useServerTimer Hook
**Location:** `src/hooks/useServerTimer.js`

**Purpose:** Provides server-synchronized timer for quiz participants

**Key States:**
- `timeLeft`: Remaining time in seconds
- `isExpired`: Whether timer has expired
- `error`: Any synchronization errors
- `lastServerSync`: Timestamp of last server sync
- `isSyncing`: Whether currently syncing with server

**Key Functions:**
- `syncWithServer(force)`: Syncs client time with server time
- `updateTimer()`: Updates timer display based on server time

### useAdminTimer Hook
**Location:** `src/hooks/useServerTimer.js`

**Purpose:** Provides timer management for quiz administrators

**Key States:**
- `timeLeft`: Remaining time in seconds
- `isExpired`: Whether timer has expired
- `isTimerActive`: Whether timer is currently running
- `isStarting`: Whether timer is being started

**Key Functions:**
- `startTimer(duration)`: Starts a new timer with server-based calculation
- `stopTimer()`: Stops the current timer
- `resetTimer()`: Resets timer state

## Database Schema

### Required Tables
```sql
-- Live quiz questions
CREATE TABLE lq_questions (
    id uuid PRIMARY KEY,
    quiz_id uuid REFERENCES lq_quizzes(id),
    question_text text NOT NULL,
    options text[] NOT NULL,
    correct_answer_index integer NOT NULL,
    timer integer DEFAULT 20,
    -- ... other fields
);

-- Live quiz sessions
CREATE TABLE lq_sessions (
    id uuid PRIMARY KEY,
    quiz_id uuid REFERENCES lq_quizzes(id),
    admin_id uuid REFERENCES users(id),
    code text UNIQUE NOT NULL,
    current_question_id uuid REFERENCES lq_questions(id),
    timer_end timestamp with time zone,
    phase text CHECK (phase IN ('lobby', 'question', 'times_up', 'leaderboard', 'finished')),
    -- ... other fields
);

-- Session participants
CREATE TABLE lq_session_participants (
    id uuid PRIMARY KEY,
    session_id uuid REFERENCES lq_sessions(id),
    user_id uuid REFERENCES users(id),
    username text NOT NULL,
    score integer DEFAULT 0,
    -- ... other fields
);

-- Live responses
CREATE TABLE lq_live_responses (
    id uuid PRIMARY KEY,
    session_id uuid REFERENCES lq_sessions(id),
    participant_id uuid REFERENCES lq_session_participants(id),
    question_id uuid REFERENCES lq_questions(id),
    selected_option_index integer NOT NULL,
    is_correct boolean,
    points_awarded integer DEFAULT 0,
    -- ... other fields
);
```

### Required Functions
```sql
-- Get current server time
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS timestamp with time zone
LANGUAGE sql
AS $$
    SELECT now();
$$;
```

## Usage Examples

### Participant Timer (QuizPage.js)
```javascript
import { useServerTimer } from '../../hooks/useServerTimer';

export default function QuizPage() {
  const { timeLeft, isExpired, error, syncWithServer } = useServerTimer(
    session?.id, 
    session?.timer_end, 
    quizPhase === 'question'
  );

  // Timer expiration effect
  useEffect(() => {
    if (isExpired && quizPhase === 'question' && selectedAnswer === null) {
      setShowCorrect(true);
    }
  }, [isExpired, quizPhase, selectedAnswer]);

  // Submit answer with validation
  async function submitAnswer(selectedOptionIndex) {
    if (selectedAnswer !== null || isExpired) {
      setError('Cannot submit answer - already answered or time expired');
      return;
    }
    // ... submit logic
  }
}
```

### Admin Timer (AdminPage.js)
```javascript
import { useAdminTimer } from '../../hooks/useServerTimer';

export default function AdminPage() {
  const { 
    timeLeft, 
    isExpired, 
    isTimerActive, 
    startTimer, 
    stopTimer, 
    resetTimer 
  } = useAdminTimer(session?.id);

  // Start question with server timer
  async function startQuestion() {
    resetTimer();
    const timerEnd = await startTimer(currentQuestion.timer || 20);
    
    if (timerEnd) {
      // Update session with timer end
      const { data, error } = await supabase
        .from('lq_sessions')
        .update({
          current_question_id: currentQuestion.id,
          phase: 'question',
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)
        .select()
        .single();
      
      setSession(data);
      setQuizPhase('question');
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Timer Drift**
   - Check console for drift detection logs
   - Verify `get_server_time()` RPC function exists
   - Ensure stable internet connection

2. **Synchronization Errors**
   - Check Supabase connection
   - Verify RLS policies allow access
   - Check browser console for error messages

3. **Re-answering Prevention Not Working**
   - Verify `lq_live_responses` table exists
   - Check RLS policies for insert permissions
   - Ensure participant ID is correctly set

4. **QR Code Issues**
   - Use `/qr-test` route to debug QR generation
   - Check URL format and encoding
   - Verify session codes are valid

### Debug Commands

**Global Test Functions (available in browser console):**
```javascript
// Test timer synchronization
window.testQuizTimer();

// Force timer update
window.forceQuizTimerUpdate();

// Check database timer
window.checkQuizDatabaseTimer();
```

### Logging

The implementation includes comprehensive logging:
- `[useServerTimer]` - Timer synchronization logs
- `[useAdminTimer]` - Admin timer management logs
- `[QuizPage]` - Participant-side logs
- `[AdminPage]` - Admin-side logs

## Performance Considerations

1. **Sync Frequency**: Server sync happens every 15 seconds to balance accuracy and performance
2. **Drift Threshold**: 2-second drift threshold prevents unnecessary re-syncs
3. **Subscription Cleanup**: Real-time subscriptions are properly cleaned up to prevent memory leaks
4. **Multiple Samples**: Uses 3 samples for time offset calculation to improve accuracy

## Security

1. **RLS Policies**: All tables have appropriate Row Level Security policies
2. **Input Validation**: All timer inputs are validated before processing
3. **Error Handling**: Comprehensive error handling prevents information leakage
4. **Session Validation**: Participants can only access their assigned sessions

## Deployment Notes

1. **Vercel**: Ensure `get_server_time()` RPC function is deployed to Supabase
2. **Database**: Run the complete schema migration before deployment
3. **Environment**: Verify Supabase environment variables are correctly set
4. **Build**: Ensure all dependencies are properly installed

## Future Enhancements

1. **WebSocket Fallback**: Add WebSocket fallback for real-time updates
2. **Offline Support**: Add offline timer support with sync on reconnection
3. **Analytics**: Add timer accuracy analytics and reporting
4. **Custom Timers**: Support for custom timer durations per question 