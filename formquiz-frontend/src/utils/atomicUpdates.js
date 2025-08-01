import { supabase } from '../supabase.js';

/**
 * Performs an atomic update to the quiz session with retry logic
 * @param {string} sessionId - The session ID
 * @param {Object} updates - The fields to update
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} The updated session data
 */
export const atomicSessionUpdate = async (sessionId, updates, maxRetries = 3) => {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`[atomicSessionUpdate] Attempt ${retryCount + 1} for session ${sessionId}:`, updates);

      const { data, error } = await supabase
        .from('lq_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error(`[atomicSessionUpdate] Database error (attempt ${retryCount + 1}):`, error);
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount - 1)));
        continue;
      }

      console.log(`[atomicSessionUpdate] Successfully updated session ${sessionId}:`, data);
      return data;

    } catch (err) {
      console.error(`[atomicSessionUpdate] Error (attempt ${retryCount + 1}):`, err);
      retryCount++;
      if (retryCount >= maxRetries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount - 1)));
    }
  }

  throw new Error(`Failed to update session ${sessionId} after ${maxRetries} attempts`);
};

/**
 * Advances to the next question with atomic updates
 * @param {string} sessionId - The session ID
 * @param {string} nextQuestionId - The next question ID
 * @param {number} timerDuration - The timer duration in seconds
 * @returns {Promise<Object>} The updated session data
 */
export const advanceToNextQuestion = async (sessionId, nextQuestionId, timerDuration = 20) => {
  const timerEnd = new Date(Date.now() + timerDuration * 1000);

  const updates = {
    current_question_id: nextQuestionId,
    phase: 'question',
    timer_end: timerEnd.toISOString(),
  };

  return await atomicSessionUpdate(sessionId, updates);
};

/**
 * Transitions to leaderboard phase
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} The updated session data
 */
export const transitionToLeaderboard = async (sessionId) => {
  const updates = {
    phase: 'leaderboard',
  };

  return await atomicSessionUpdate(sessionId, updates);
};

/**
 * Ends the quiz session
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} The updated session data
 */
export const endQuizSession = async (sessionId) => {
  const updates = {
    is_live: false,
    phase: 'ended',
  };

  return await atomicSessionUpdate(sessionId, updates);
};

/**
 * Checks if a session is in a stuck state and attempts to recover
 * @param {Object} session - The session object
 * @returns {Promise<boolean>} True if recovery was attempted
 */
export const checkAndRecoverStuckState = async (session) => {
  if (!session?.id || session.phase !== 'question') return false;

  const now = Date.now();
  const timerEnd = session.timer_end ? new Date(session.timer_end).getTime() : 0;

  // If timer has expired but we're still in question phase, force transition
  if (timerEnd > 0 && now > timerEnd + 5000) { // 5 second buffer
    console.log('[checkAndRecoverStuckState] Detected stuck state, attempting recovery');

    try {
      await transitionToLeaderboard(session.id);
      return true;
    } catch (err) {
      console.error('[checkAndRecoverStuckState] Recovery failed:', err);
      return false;
    }
  }

  return false;
};

/**
 * Enhanced recovery mechanism specifically for the fourth question issue
 * @param {Object} session - The session object
 * @param {number} currentQuestionIndex - Current question index
 * @returns {Promise<boolean>} True if recovery was attempted
 */
export const checkAndRecoverFourthQuestionIssue = async (session, currentQuestionIndex) => {
  if (!session?.id || session.phase !== 'question') return false;

  const now = Date.now();
  const timerEnd = session.timer_end ? new Date(session.timer_end).getTime() : 0;

  // Enhanced detection for fourth question issue
  const isFourthQuestion = currentQuestionIndex === 3; // 0-indexed, so 3 is fourth question
  const timerExpired = timerEnd > 0 && now > timerEnd + 3000; // 3 second buffer for fourth question

  if (isFourthQuestion && timerExpired) {
    console.log('[checkAndRecoverFourthQuestionIssue] Detected fourth question stuck state, attempting recovery');

    try {
      // Force transition to leaderboard
      await transitionToLeaderboard(session.id);
      console.log('[checkAndRecoverFourthQuestionIssue] Successfully recovered from fourth question stuck state');
      return true;
    } catch (err) {
      console.error('[checkAndRecoverFourthQuestionIssue] Recovery failed:', err);
      return false;
    }
  }

  return false;
};

/**
 * Validates session state consistency
 * @param {Object} session - The session object
 * @param {Object} currentQuestion - Current question object
 * @returns {Promise<boolean>} True if state is consistent
 */
export const validateSessionState = async (session) => {
  if (!session?.id) return false;

  try {
    const { data, error } = await supabase
      .from('lq_sessions')
      .select('current_question_id, phase, timer_end')
      .eq('id', session.id)
      .single();

    if (error) {
      console.error('[validateSessionState] Error fetching session:', error);
      return false;
    }

    // Check for state inconsistencies
    const hasInconsistentState =
      (session.phase !== data.phase) ||
      (session.current_question_id !== data.current_question_id) ||
      (session.timer_end !== data.timer_end);

    if (hasInconsistentState) {
      console.log('[validateSessionState] Detected state inconsistency:', {
        local: {
          phase: session.phase,
          current_question_id: session.current_question_id,
          timer_end: session.timer_end
        },
        database: {
          phase: data.phase,
          current_question_id: data.current_question_id,
          timer_end: data.timer_end
        }
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error('[validateSessionState] Error:', err);
    return false;
  }
};

/**
 * Forces a session state refresh from database
 * @param {string} sessionId - The session ID
 * @returns {Promise<Object>} The refreshed session data
 */
export const forceSessionRefresh = async (sessionId) => {
  try {
    const { data, error } = await supabase
      .from('lq_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('[forceSessionRefresh] Error:', error);
      throw error;
    }

    console.log('[forceSessionRefresh] Successfully refreshed session:', data);
    return data;
  } catch (err) {
    console.error('[forceSessionRefresh] Error:', err);
    throw err;
  }
}; 