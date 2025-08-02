import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabase.js';
import { useQuiz } from '../../pages/livequiz/QuizContext';

export default function QuizPage() {
  const { session, setSession } = useQuiz();

  // Add global test functions for debugging
  React.useEffect(() => {
    window.testQuizTimer = () => {
      if (session?.timer_end) {
        const now = Date.now();
        const timerEnd = new Date(session.timer_end).getTime();
        const remaining = Math.max(0, Math.floor((timerEnd - now) / 1000));
        console.log('[QuizPage] Manual timer test:', {
          now: new Date(now).toISOString(),
          timerEnd: new Date(timerEnd).toISOString(),
          remaining,
          difference: timerEnd - now,
          session: session
        });
        return remaining;
      } else {
        console.log('[QuizPage] No timer_end in session');
        return null;
      }
    };
    
    window.checkQuizDatabaseTimer = async () => {
      if (session?.id) {
        try {
          const { data, error } = await supabase
            .from('lq_sessions')
            .select('timer_end, phase, current_question_id')
            .eq('id', session.id)
            .single();
          
          if (error) {
            console.error('[QuizPage] Error checking database timer:', error);
            return null;
          }
          
          console.log('[QuizPage] Database timer check:', data);
          
          // Calculate remaining time if timer_end exists
          if (data.timer_end) {
            const now = Date.now();
            const timerEnd = new Date(data.timer_end).getTime();
            const remaining = Math.max(0, Math.floor((timerEnd - now) / 1000));
            console.log('[QuizPage] Timer calculation:', {
              now: new Date(now).toISOString(),
              timerEnd: new Date(timerEnd).toISOString(),
              remaining,
              difference: timerEnd - now
            });
          }
          
          return data;
        } catch (err) {
          console.error('[QuizPage] Error in checkQuizDatabaseTimer:', err);
          return null;
        }
      } else {
        console.error('[QuizPage] No session ID for database check');
        return null;
      }
    };
    
    window.forceQuizTimerUpdate = () => {
      console.log('[QuizPage] Manually forcing timer update');
      setTimerTrigger(prev => prev + 1);
    };
    
    window.debugQuizState = () => {
      console.log('[QuizPage] Current state:', {
        session,
        participant,
        currentQuestion,
        quizPhase,
        timeLeft,
        selectedAnswer,
        showCorrect,
        lastQuestionId
      });
    };
    
    window.checkSessionInDatabase = async () => {
      if (session?.id) {
        try {
          const { data, error } = await supabase
            .from('lq_sessions')
            .select('*')
            .eq('id', session.id)
            .single();
          
          console.log('[QuizPage] Database session state:', data);
          return data;
        } catch (err) {
          console.error('[QuizPage] Error checking database:', err);
          return null;
        }
      } else {
        console.log('[QuizPage] No session ID available');
        return null;
      }
    };
    
    window.forceSessionUpdate = async () => {
      if (session?.id) {
        try {
          const { data, error } = await supabase
            .from('lq_sessions')
            .select('*')
            .eq('id', session.id)
            .single();
          
          if (data) {
            console.log('[QuizPage] Manually triggering session update with:', data);
            handleSessionUpdate({ new: data });
          }
        } catch (err) {
          console.error('[QuizPage] Error in forceSessionUpdate:', err);
        }
      }
    };
  }, [session]);
  
  const [username, setUsername] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [searchParams] = useSearchParams();
  const [participant, setParticipant] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizPhase, setQuizPhase] = useState('waiting');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timerWarning, setTimerWarning] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(null);
  const [liveScore, setLiveScore] = useState(null);
  const [cumulativeScore, setCumulativeScore] = useState(0);
  const [isRemoved, setIsRemoved] = useState(false);
  const [timerTrigger, setTimerTrigger] = useState(0);
  const [lastQuestionId, setLastQuestionId] = useState(null); // Track question changes

  // Auto-fill session code from URL query param 'code' on mount
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl && !sessionCode) {
      setSessionCode(codeFromUrl);
    }
    // eslint-disable-next-line
  }, [searchParams]);

  useEffect(() => {
    if (!session?.id) return;
    console.log('[QuizPage] Setting up real-time subscription for session:', session.id);
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [session?.id]);

  // Periodic session check as fallback
  useEffect(() => {
    if (!session?.id || quizPhase !== 'question') return;
    
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('lq_sessions')
          .select('current_question_id, phase, timer_end')
          .eq('id', session.id)
          .single();
        
        if (data && !error) {
          const questionChanged = currentQuestion?.id !== data.current_question_id;
          const phaseChanged = quizPhase !== data.phase;
          
          if (questionChanged || phaseChanged) {
            console.log('[QuizPage] Fallback: Session changed in database:', {
              questionChanged,
              phaseChanged,
              oldQuestionId: currentQuestion?.id,
              newQuestionId: data.current_question_id,
              oldPhase: quizPhase,
              newPhase: data.phase
            });
            handleSessionUpdate({ new: data });
          }
        }
      } catch (err) {
        console.error('[QuizPage] Error in periodic session check:', err);
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, [session?.id, quizPhase, currentQuestion?.id]);

  // Listen for removal event from admin
  useEffect(() => {
    if (!participant?.id) return;
    console.log('[QuizPage] Setting up removal listener for', participant.id);
    const channel = supabase.channel('removal_' + participant.id);
    channel.on('broadcast', { event: 'you_were_removed' }, () => {
      console.log('[QuizPage] Received removal event!');
      setIsRemoved(true);
      supabase.removeAllChannels();
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [participant?.id]);

  // Timer logic using Supabase timer_end as single source of truth
  useEffect(() => {
    console.log('[QuizPage] Timer useEffect triggered:', {
      hasSession: !!session,
      hasCurrentQuestion: !!currentQuestion,
      quizPhase,
      hasTimerEnd: !!session?.timer_end,
      timerEnd: session?.timer_end,
      timerTrigger,
      currentQuestionId: currentQuestion?.id,
      sessionId: session?.id
    });

    // Clear any existing timer immediately
    let interval = null;

    // Don't start timer if:
    // 1. No session or current question
    // 2. Not in question phase
    // 3. No timer_end set
    if (!session || !currentQuestion || quizPhase !== 'question') {
      console.log('[QuizPage] Timer stopped - missing session, question, or wrong phase');
      setTimeLeft(0);
      setShowCorrect(false);
      return () => {
        if (interval) clearInterval(interval);
      };
    }

    // Only proceed if we have a valid timer_end from the database
    if (!session.timer_end) {
      console.log('[QuizPage] Timer stopped - no timer_end in session');
      setTimeLeft(0);
      setShowCorrect(false);
      return () => {
        if (interval) clearInterval(interval);
      };
    }

    // Validate timer_end is a valid date
    const timerEndDate = new Date(session.timer_end);
    if (isNaN(timerEndDate.getTime())) {
      console.error('[QuizPage] Invalid timer_end date:', session.timer_end);
      setTimeLeft(0);
      setShowCorrect(false);
      return () => {
        if (interval) clearInterval(interval);
      };
    }

    console.log('[QuizPage] Starting timer with end time:', timerEndDate.toISOString());
    setShowCorrect(false); // Reset at the start of each question
    
    function updateTime() {
      const now = new Date();
      const secondsLeft = Math.max(0, Math.floor((timerEndDate.getTime() - now.getTime()) / 1000));
      
      console.log('[QuizPage] Timer update:', {
        now: now.toISOString(),
        timerEnd: timerEndDate.toISOString(),
        secondsLeft,
        timeDiff: timerEndDate.getTime() - now.getTime()
      });
      
      setTimeLeft(secondsLeft);
      
      // Timer expired
      if (secondsLeft === 0) {
        console.log('[QuizPage] Timer expired');
        setShowCorrect(true);
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    }
    
    // Set initial value immediately
    updateTime();
    
    // Start the countdown interval
    interval = setInterval(updateTime, 1000);
    
    // Cleanup function to clear interval
    return () => {
      console.log('[QuizPage] Cleaning up timer interval');
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [session?.timer_end, currentQuestion?.id, quizPhase, timerTrigger]);

  // Reset state when question changes or quiz starts
  useEffect(() => {
    if (currentQuestion?.id && currentQuestion.id !== lastQuestionId) {
      console.log('[QuizPage] Question changed, resetting state:', {
        oldId: lastQuestionId,
        newId: currentQuestion.id
      });
      setLastQuestionId(currentQuestion.id);
      setSelectedAnswer(null);
      setShowCorrect(false);
      setPointsEarned(null);
      setTimeLeft(0); // Reset timer display
    }
  }, [currentQuestion?.id, lastQuestionId]);

  // Handle quiz phase changes
  useEffect(() => {
    console.log('[QuizPage] Quiz phase changed:', quizPhase);
    
    switch (quizPhase) {
      case 'lobby':
        // Quiz hasn't started yet - clear timer and reset state
        console.log('[QuizPage] Quiz in lobby - clearing timer');
        setTimeLeft(0);
        setShowCorrect(false);
        setSelectedAnswer(null);
        setCurrentQuestion(null);
        break;
        
      case 'question':
        // Quiz question is active - timer will be handled by the timer useEffect
        console.log('[QuizPage] Quiz question active - timer will start when timer_end is set');
        break;
        
      case 'times_up':
        // Time's up - show correct answers
        console.log('[QuizPage] Time\'s up - showing correct answers');
        setShowCorrect(true);
        setTimeLeft(0);
        break;
        
      case 'leaderboard':
        // Showing leaderboard - clear timer
        console.log('[QuizPage] Showing leaderboard - clearing timer');
        setTimeLeft(0);
        setShowCorrect(false);
        break;
        
      case 'finished':
        // Quiz finished - clear timer and reset state
        console.log('[QuizPage] Quiz finished - clearing timer');
        setTimeLeft(0);
        setShowCorrect(false);
        setSelectedAnswer(null);
        setCurrentQuestion(null);
        break;
        
      default:
        // Unknown phase - clear timer
        console.log('[QuizPage] Unknown phase - clearing timer');
        setTimeLeft(0);
        setShowCorrect(false);
        break;
    }
  }, [quizPhase]);

  // Fetch live score
  useEffect(() => {
    if (!participant?.id) return;
    
    async function fetchScore() {
      try {
        const { data, error } = await supabase
          .from('lq_session_participants')
          .select('score')
          .eq('id', participant.id)
          .single();
        
        if (error) {
          console.error('[QuizPage] Error fetching score:', error);
          return;
        }
        
        setLiveScore(data.score);
      } catch (err) {
        console.error('[QuizPage] Error in fetchScore:', err);
      }
    }
    
    fetchScore();
  }, [participant?.id]);

  // Fetch cumulative score
  useEffect(() => {
    if (!participant?.id) return;
    
    async function fetchCumulativeScore() {
      try {
        const { data, error } = await supabase
          .from('lq_session_participants')
          .select('score')
          .eq('id', participant.id)
          .single();
        
        if (error) {
          console.error('[QuizPage] Error fetching cumulative score:', error);
          return;
        }
        
        setCumulativeScore(data.score || 0);
      } catch (err) {
        console.error('[QuizPage] Error in fetchCumulativeScore:', err);
      }
    }
    
    fetchCumulativeScore();
  }, [participant?.id, liveScore]);

  function setupRealtimeSubscriptions() {
    if (!session?.id) return () => {};
    console.log('[QuizPage] Setting up real-time subscription for session:', session.id);
    
    const sessionChannel = supabase
      .channel('session-updates-' + session.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lq_sessions', filter: `id=eq.${session.id}` },
        (payload) => {
          console.log('[QuizPage] Raw subscription payload:', payload);
          handleSessionUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('[QuizPage] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[QuizPage] Successfully subscribed to session updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[QuizPage] Subscription error');
        }
      });

    return () => {
      console.log('[QuizPage] Cleaning up real-time subscription');
      supabase.removeChannel(sessionChannel);
    };
  }

  async function handleSessionUpdate(payload) {
    console.log('[QuizPage] handleSessionUpdate payload:', payload);
    const sessionData = payload.new;
    if (!sessionData) {
      console.log('[QuizPage] No session data in payload');
      return;
    }
    
    // Check if question has changed
    const questionChanged = currentQuestion?.id !== sessionData.current_question_id;
    
    // Check if this is a quiz start event (phase changes from lobby to question)
    const isQuizStart = quizPhase === 'lobby' && sessionData.phase === 'question';
    
    console.log('[QuizPage] Session update received:', {
      phase: sessionData.phase,
      timerEnd: sessionData.timer_end,
      hasTimerEnd: !!sessionData.timer_end,
      currentQuestionId: sessionData.current_question_id,
      sessionId: sessionData.id,
      oldQuestionId: currentQuestion?.id,
      questionChanged,
      isQuizStart,
      oldPhase: quizPhase
    });
    
    // Update session state
    setSession(sessionData);
    setQuizPhase(sessionData.phase);
    setTimerWarning(false);
    
    // Handle quiz start event
    if (isQuizStart) {
      console.log('[QuizPage] Quiz start event detected!');
      // Reset all state for fresh start
      setSelectedAnswer(null);
      setShowCorrect(false);
      setPointsEarned(null);
      setTimeLeft(0);
      setCurrentQuestion(null);
    }
    
    // Handle question changes
    if (questionChanged) {
      console.log('[QuizPage] Question changed, resetting state');
      setSelectedAnswer(null);
      setShowCorrect(false);
      setPointsEarned(null);
      setTimeLeft(0);
    }
    
    // Force timer re-evaluation when session changes
    // Use a longer delay to ensure session state is fully updated
    setTimeout(() => {
      console.log('[QuizPage] Forcing timer re-evaluation after session update');
      setTimerTrigger(prev => prev + 1);
    }, 200);
    
    // Log session update details
    console.log('[QuizPage] Local state updated:', {
      phase: sessionData.phase,
      timerEnd: sessionData.timer_end,
      hasTimerEnd: !!sessionData.timer_end,
      currentPhase: sessionData.phase,
      questionChanged,
      isQuizStart
    });
    
    if (sessionData.phase === 'question' && sessionData.current_question_id) {
      const { data: questionData } = await supabase
        .from('lq_questions')
        .select('*')
        .eq('id', sessionData.current_question_id)
        .single();
      
      if (questionData) {
        console.log('[QuizPage] New question loaded:', questionData);
        
        setCurrentQuestion(questionData);
        
        // Timer will be handled by the useEffect that watches session.timer_end
        if (!sessionData.timer_end) {
          console.log('[QuizPage] Warning: No timer_end in session data');
          setTimerWarning(true);
        } else {
          console.log('[QuizPage] Timer end set:', sessionData.timer_end);
          // Calculate initial time left for immediate display
          const timerEndDate = new Date(sessionData.timer_end);
          const now = new Date();
          const initialTimeLeft = Math.max(0, Math.floor((timerEndDate.getTime() - now.getTime()) / 1000));
          console.log('[QuizPage] Initial time left:', initialTimeLeft);
          setTimeLeft(initialTimeLeft);
        }
      }
    } else if (sessionData.phase === 'times_up') {
      // Timer has expired, show correct answers
      console.log('[QuizPage] Phase changed to times_up');
      setShowCorrect(true);
      setTimeLeft(0);
    } else if (sessionData.phase === 'lobby') {
      // Quiz in lobby - clear everything
      console.log('[QuizPage] Phase changed to lobby');
      setCurrentQuestion(null);
      setTimeLeft(0);
      setSelectedAnswer(null);
      setShowCorrect(false);
    } else if (sessionData.phase === 'leaderboard') {
      // Showing leaderboard - clear timer but keep question for review
      console.log('[QuizPage] Phase changed to leaderboard');
      setTimeLeft(0);
      setShowCorrect(true);
    } else if (sessionData.phase === 'finished') {
      // Quiz finished - clear everything
      console.log('[QuizPage] Phase changed to finished');
      setCurrentQuestion(null);
      setTimeLeft(0);
      setSelectedAnswer(null);
      setShowCorrect(false);
    } else if (sessionData.phase !== 'question') {
      // Any other phase - clear question and timer
      console.log('[QuizPage] Phase changed to:', sessionData.phase);
      setCurrentQuestion(null);
      setTimeLeft(0);
      setSelectedAnswer(null);
      setShowCorrect(false);
    }
  }

  async function joinQuiz(e) {
    e.preventDefault();
    if (!username || !sessionCode) return;

    try {
      setLoading(true);
      setError("");
      console.log('[joinQuiz] Attempting to join with code:', sessionCode);
      // First, get the session (validate against lq_sessions table and code column)
      const { data: sessionData, error: sessionError } = await supabase
        .from('lq_sessions')
        .select('*')
        .eq('code', sessionCode.toUpperCase())
        .eq('is_live', true)
        .single();

      if (!sessionData || sessionError) {
        console.error('[joinQuiz] Invalid session code or error:', sessionError);
        setError('Invalid session code');
        setLoading(false);
        return;
      }
      setSession(sessionData);
      console.log('[joinQuiz] Session found:', sessionData);

      // Then, create participant
      const { data: participantData, error: participantError } = await supabase
        .from('lq_session_participants')
        .insert([
          {
            session_id: sessionData.id,
            username,
            score: 0,
          },
        ])
        .select()
        .single();

      if (participantError) {
        console.error('[joinQuiz] Error creating participant:', participantError);
        setError('Could not join session. Please try again.');
        setLoading(false);
        return;
      }
      setParticipant(participantData);
      console.log('[joinQuiz] Participant created:', participantData);

      // Get current question if exists
      if (sessionData.current_question_id) {
        const { data: questionData, error: questionError } = await supabase
          .from('lq_questions')
          .select('*')
          .eq('id', sessionData.current_question_id)
          .single();

        if (questionError) {
          console.error('[joinQuiz] Error fetching current question:', questionError);
          setError('Could not load current question.');
          setLoading(false);
          return;
        }
        if (questionData) {
          setCurrentQuestion(questionData);
          // Timer will be handled by the useEffect that watches session.timer_end
          console.log('[joinQuiz] Current question loaded:', questionData);
        }
      }

      setQuizPhase(sessionData.phase);
      console.log('[joinQuiz] Quiz phase set:', sessionData.phase);
    } catch (err) {
      console.error('[joinQuiz] Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(selectedIndex) {
    console.log('[QuizPage] submitAnswer called. isRemoved:', isRemoved);
    if (isRemoved) {
      console.log('[QuizPage] Blocked submitAnswer because user is removed.');
      return;
    }
    if (!participant?.id || !currentQuestion?.id || selectedAnswer !== null) return;

    // Enforce timer restriction - block submission if time is up
    if (session?.timer_end && Date.now() >= new Date(session.timer_end).getTime()) {
      console.log('[QuizPage] Blocked submitAnswer because time is up.');
      setError('Time is up! You cannot submit answers after the timer expires.');
      return;
    }

    try {
      setSelectedAnswer(selectedIndex);
      const isCorrect = selectedIndex === currentQuestion.correct_answer_index;
      const points = isCorrect ? Math.max(100, timeLeft * 10) : 0;
      setPointsEarned(points);

      await supabase.from('lq_live_responses').insert([
        {
          session_id: session.id,
          participant_id: participant.id,
          question_id: currentQuestion.id,
          selected_option_index: selectedIndex,
          is_correct: isCorrect,
          points_awarded: points,
        },
      ]);

      if (isCorrect) {
        // Restore previous update logic: add points to participant.score
        await supabase
          .from('lq_session_participants')
          .update({ score: participant.score + points })
          .eq('id', participant.id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  if (isRemoved) {
    console.log('[QuizPage] Rendering removal UI because isRemoved is true');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-100 to-red-300 font-sans transition-all duration-500 px-2 sm:px-4">
        <div className="flex flex-col items-center justify-center h-72 sm:h-96 w-full max-w-xl bg-white/80 rounded-xl shadow-lg p-4 sm:p-8 animate-fade-in">
          <svg className="w-12 h-12 mb-4 text-red-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-red-700 text-center">You have been removed from the quiz by the admin.</h1>
          <div className="text-gray-600 text-lg text-center">If you believe this was a mistake, please contact the quiz host.</div>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 font-sans transition-all duration-500 px-2 sm:px-4">
        <div className="w-full max-w-md bg-white/80 rounded-xl shadow-lg p-6 sm:p-8 flex flex-col items-center animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-blue-700 text-center">Join Quiz</h1>
          {error && <div className="text-red-500 mb-4 text-center w-full">{error}</div>}
          <form onSubmit={joinQuiz} className="space-y-6 w-full">
            <div>
              <label className="block mb-2 text-gray-700 font-semibold text-base">Session Code</label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-300 text-lg bg-white shadow-sm transition-all"
                placeholder="Enter session code"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block mb-2 text-gray-700 font-semibold text-base">Your Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-300 text-lg bg-white shadow-sm transition-all"
                placeholder="Enter your name"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-blue-500 text-white font-bold text-lg shadow hover:bg-blue-600 disabled:bg-gray-400 transition-all"
              style={{ minHeight: '3rem' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Joining...
                </span>
              ) : 'Join Quiz'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (participant && session && !['question', 'waiting', 'ended'].includes(quizPhase)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 font-sans transition-all duration-500 p-4">
        <div className="h-[95vh] w-[95vw] max-w-2xl flex flex-col items-center justify-center bg-white/80 rounded-xl shadow-lg p-6 sm:p-8 animate-fade-in">
          <svg className="w-12 h-12 mb-4 text-blue-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-700 text-center">Waiting for host to start the quiz…</h1>
          <div className="text-gray-600 text-lg text-center">You have joined the session. Please wait for the host to begin.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 font-sans transition-all duration-500 p-4">
      {/* Main Quiz Container */}
      <div className="h-[95vh] w-[95vw] max-w-4xl flex flex-col bg-white/80 rounded-xl shadow-lg p-4 sm:p-6 overflow-hidden">
        {/* Header with Timer and Score */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 p-2">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <span className="font-bold text-lg text-gray-800 truncate">{username}</span>
            <span className="px-3 py-1 bg-white/90 rounded-full shadow text-blue-700 font-semibold text-base">Score: {cumulativeScore}</span>
          </div>
          {quizPhase === 'question' && (
            <div className="flex items-center gap-2 text-xl font-bold text-purple-700 bg-white/90 px-4 py-2 rounded-full shadow">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {timeLeft > 0 ? `${timeLeft}s` : 'Time\'s up!'}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
          {/* Waiting for host to start */}
          {participant && session && !['question', 'waiting', 'ended'].includes(quizPhase) && (
            <div className="flex flex-col items-center justify-center text-center animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-700">Waiting for host to start the quiz…</h1>
              <div className="text-gray-600 text-lg">You have joined the session. Please wait for the host to begin.</div>
            </div>
          )}

          {/* Waiting for next question after answer */}
          {quizPhase === 'question' && selectedAnswer !== null && timeLeft > 0 && (
            <div className="flex flex-col items-center justify-center text-center animate-fade-in">
              <div className="text-2xl font-bold mb-2 text-purple-700">{timeLeft}s</div>
              <div className="mb-2 text-lg text-gray-700">Waiting for the next question...</div>
              <div className="text-blue-700 font-semibold text-lg">Score: {cumulativeScore}</div>
            </div>
          )}

          {/* Question and options */}
          {quizPhase === 'question' && currentQuestion && selectedAnswer === null && (
            <div className="w-full max-w-2xl space-y-6 animate-fade-in">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center break-words">{currentQuestion.question_text}</h2>
              <div className="grid gap-3 sm:gap-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => submitAnswer(index)}
                    disabled={selectedAnswer !== null || timeLeft <= 0}
                    className={
                      `p-3 sm:p-4 w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm text-base sm:text-lg font-medium transition-all duration-200
                      ${timeLeft > 0 ? 'hover:bg-blue-100 focus:ring-2 focus:ring-blue-300 active:scale-95' : 'opacity-50 cursor-not-allowed'}
                      focus:outline-none`}
                    style={{ transition: 'background 0.2s, transform 0.2s' }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback/Results screen after answering, before moving to next question */}
          {quizPhase === 'question' && currentQuestion && showCorrect && selectedAnswer !== null && (
            <div className="flex flex-col items-center justify-center text-center animate-fade-in">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">{selectedAnswer === currentQuestion.correct_answer_index ? 'Correct!' : 'Incorrect'}</h2>
              <div className="mt-4">
                {selectedAnswer === currentQuestion.correct_answer_index ? (
                  <span className="text-green-600 font-bold text-xl animate-pop">You got it right!</span>
                ) : (
                  <span className="text-red-600 font-bold text-xl animate-pop">The correct answer was: <span className="underline">{currentQuestion.options[currentQuestion.correct_answer_index]}</span></span>
                )}
                <div className="mt-2 text-blue-700 font-semibold text-lg">Points earned: {pointsEarned}</div>
              </div>
            </div>
          )}

          {/* After timer ends, show time's up if user did not answer */}
          {quizPhase === 'question' && currentQuestion && showCorrect && selectedAnswer === null && timeLeft === 0 && (
            <div className="flex flex-col items-center justify-center text-center animate-fade-in">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Time's up!</h2>
              <div className="text-gray-600 text-lg">You did not answer in time.</div>
            </div>
          )}

          {/* Waiting for next question phase */}
          {quizPhase === 'waiting' && (
            <div className="flex flex-col items-center justify-center text-center animate-fade-in">
              <h2 className="text-2xl font-bold text-blue-700 mb-2">Waiting for next question...</h2>
            </div>
          )}

          {/* Quiz ended */}
          {quizPhase === 'ended' && (
            <div className="flex flex-col items-center justify-center text-center animate-fade-in">
              <h2 className="text-2xl sm:text-3xl font-bold text-green-700 mb-2">Quiz Ended</h2>
              <p className="mt-2 text-xl font-semibold text-gray-800">Final Score: {cumulativeScore}</p>
            </div>
          )}
        </div>

        {/* Footer for warnings and errors */}
        <div className="mt-4">
          {timerWarning && (
            <div className="text-yellow-600 font-semibold text-center text-sm">Warning: Timer was missing from the session. Defaulted to 20 seconds.</div>
          )}
          {error && <div className="text-red-500 text-center text-sm">{error}</div>}
        </div>
      </div>
    </div>
  );
} 