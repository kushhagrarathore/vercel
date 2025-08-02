import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabase.js';
import { useQuiz } from '../../pages/livequiz/QuizContext';
import { useServerTimer } from '../../hooks/useServerTimer';

export default function QuizPage() {
  const { session, setSession } = useQuiz();

  // Add global test functions for debugging
  useEffect(() => {
    window.testQuizTimer = () => {
      console.log('[QuizPage] Test timer function called');
      syncWithServer(true);
    };
    
    window.forceQuizTimerUpdate = () => {
      console.log('[QuizPage] Force timer update called');
      syncWithServer(true);
    };
    
    return () => {
      delete window.testQuizTimer;
      delete window.forceQuizTimerUpdate;
    };
  }, [syncWithServer]);
  const [username, setUsername] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [searchParams] = useSearchParams();
  const [participant, setParticipant] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizPhase, setQuizPhase] = useState('waiting');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timerWarning, setTimerWarning] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(null);
  const [liveScore, setLiveScore] = useState(null);
  const [cumulativeScore, setCumulativeScore] = useState(0);
  const [isRemoved, setIsRemoved] = useState(false);

  // Replace local timer state with server-based timer
  const { timeLeft, isExpired, timerError, syncWithServer } = useServerTimer(
    session?.id, 
    session?.timer_end, 
    quizPhase === 'question'
  );
  
  // Remove old timer states
  // const [timeLeft, setTimeLeft] = useState(0);
  // const [timerTrigger, setTimerTrigger] = useState(0);
  
  // Auto-fill session code from URL query param 'code' on mount
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl && !sessionCode) {
      setSessionCode(codeFromUrl);
    }
    // eslint-disable-next-line
  }, [searchParams]);

  useEffect(() => {
    if (!participant?.id) return;
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [participant?.id]);

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



  // Update timer expiration effect to use server timer
  useEffect(() => {
    if (isExpired && quizPhase === 'question' && selectedAnswer === null) {
      console.log('[QuizPage] Timer expired and no answer submitted');
      setShowCorrect(true);
    }
  }, [isExpired, quizPhase, selectedAnswer]);

  // Show feedback/results screen for 2.5s after answering, before moving to next question or waiting
  useEffect(() => {
    // Only run this logic when the results are meant to be shown and the user had answered.
    if (showCorrect && selectedAnswer !== null) {
      async function fetchScore() {
        if (!participant?.id) return;
        const { data, error } = await supabase
          .from('lq_session_participants')
          .select('score')
          .eq('id', participant.id)
          .single();
        if (!error && data) {
          setLiveScore(data.score);
        }
      }
      fetchScore();
    }
    // The timeout that reset selectedAnswer has been removed. The answer state
    // will now correctly persist until the host moves to the next question.
  }, [showCorrect, selectedAnswer, participant?.id]);

  useEffect(() => {
    if (!participant?.id) return;
    const channel = supabase
      .channel('participant-score-' + participant.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lq_session_participants', filter: `id=eq.${participant.id}` },
        (payload) => {
          if (payload.new && typeof payload.new.score === 'number') {
            setLiveScore(payload.new.score);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [participant?.id]);

  useEffect(() => {
    if (!showCorrect || !participant?.id) return;
    async function fetchScore() {
      const { data, error } = await supabase
        .from('lq_session_participants')
        .select('score')
        .eq('id', participant.id)
        .single();
      if (!error && data) setLiveScore(data.score);
    }
    fetchScore();
  }, [showCorrect, participant?.id]);

  useEffect(() => {
    async function fetchCumulativeScore() {
      if (!participant?.id || !session?.id) return;
      const { data, error } = await supabase
        .from('lq_live_responses')
        .select('points_awarded')
        .eq('participant_id', participant.id)
        .eq('session_id', session.id);
      if (!error && data) {
        const total = data.reduce((sum, r) => sum + (r.points_awarded || 0), 0);
        setCumulativeScore(total);
      }
    }
    fetchCumulativeScore();
  }, [participant?.id, session?.id, showCorrect]);

  function setupRealtimeSubscriptions() {
    if (!session?.id) return () => {};
    const sessionChannel = supabase
      .channel('session-updates-' + session.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lq_sessions', filter: `id=eq.${session.id}` },
        handleSessionUpdate
      )
      .subscribe();

    return () => {
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

    console.log('[QuizPage] Session update received:', {
      phase: sessionData.phase,
      timerEnd: sessionData.timer_end,
      currentQuestionId: sessionData.current_question_id,
      sessionId: sessionData.id
    });

    setSession(sessionData);
    setTimerWarning(false);

    if (sessionData.phase === 'times_up') {
      console.log('[QuizPage] Phase is times_up, showing correct answers.');
      setShowCorrect(true);
    } else {
      setQuizPhase(sessionData.phase);
    }

    console.log('[QuizPage] Local state updated:', {
      currentPhase: quizPhase,
      newPhaseFromServer: sessionData.phase,
      timerEnd: sessionData.timer_end,
      hasTimerEnd: !!sessionData.timer_end,
    });

    // When a new question is sent, reset the UI
    if (sessionData.phase === 'question' && sessionData.current_question_id) {
      const { data: questionData } = await supabase
        .from('lq_questions')
        .select('*')
        .eq('id', sessionData.current_question_id)
        .single();

      if (questionData) {
        setCurrentQuestion(questionData);
        setSelectedAnswer(null);
        setShowCorrect(false);
        setPointsEarned(null);
        
        if (!sessionData.timer_end) {
          console.log('[QuizPage] Warning: No timer_end in session data');
          setTimerWarning(true);
        } else {
          console.log('[QuizPage] Timer end set:', sessionData.timer_end);
        }
      }
    } else if (sessionData.phase !== 'question' && sessionData.phase !== 'times_up') {
      setCurrentQuestion(null);
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

  // Enhanced submitAnswer with re-answering prevention
  async function submitAnswer(selectedOptionIndex) {
    if (!participant?.id || !currentQuestion?.id || selectedAnswer !== null) {
      console.log('[QuizPage] Blocked submitAnswer - already answered or missing data');
      return;
    }
    
    if (isExpired || timeLeft <= 0) {
      console.log('[QuizPage] Blocked submitAnswer because time is up.');
      setError('Time is up! You cannot submit answers after the timer expires.');
      return;
    }

    try {
      // Check if user has already answered this question
      const { data: existingResponse } = await supabase
        .from('lq_live_responses')
        .select('id')
        .eq('session_id', session.id)
        .eq('participant_id', participant.id)
        .eq('question_id', currentQuestion.id)
        .single();

      if (existingResponse) {
        console.log('[QuizPage] Blocked submitAnswer - already answered this question');
        setError('You have already answered this question.');
        return;
      }

      console.log('[QuizPage] Submitting answer:', {
        participantId: participant.id,
        questionId: currentQuestion.id,
        selectedOption: selectedOptionIndex,
        timeLeft
      });

      setSelectedAnswer(selectedOptionIndex);
      setError(null);

      // Calculate if answer is correct
      const isCorrect = selectedOptionIndex === currentQuestion.correct_answer_index;
      const pointsEarned = isCorrect ? 10 : 0;

      // Submit response to database
      const { error: responseError } = await supabase
        .from('lq_live_responses')
        .insert({
          session_id: session.id,
          participant_id: participant.id,
          question_id: currentQuestion.id,
          selected_option_index: selectedOptionIndex,
          is_correct: isCorrect,
          points_awarded: pointsEarned
        });

      if (responseError) {
        console.error('[QuizPage] Response submission error:', responseError);
        setError('Failed to submit answer. Please try again.');
        setSelectedAnswer(null);
        return;
      }

      // Update participant score
      const { error: scoreError } = await supabase
        .from('lq_session_participants')
        .update({ 
          score: participant.score + pointsEarned 
        })
        .eq('id', participant.id);

      if (scoreError) {
        console.error('[QuizPage] Score update error:', scoreError);
      }

      setPointsEarned(pointsEarned);
      setLiveScore(prev => prev + pointsEarned);

      console.log('[QuizPage] Answer submitted successfully:', {
        isCorrect,
        pointsEarned,
        newScore: participant.score + pointsEarned
      });

    } catch (err) {
      console.error('[QuizPage] Submit answer error:', err);
      setError('Failed to submit answer. Please try again.');
      setSelectedAnswer(null);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 font-sans transition-all duration-500 px-2 sm:px-4">
        <div className="flex flex-col items-center justify-center h-72 sm:h-96 w-full max-w-xl bg-white/80 rounded-xl shadow-lg p-4 sm:p-8 animate-fade-in">
          <svg className="w-12 h-12 mb-4 text-blue-400 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-700 text-center">Waiting for host to start the quiz…</h1>
          <div className="text-gray-600 text-lg text-center">You have joined the session. Please wait for the host to begin.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 font-sans transition-all duration-500 px-2 sm:px-4">
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-center w-full max-w-xl">
        <div className="flex flex-col sm:flex-row items-center w-full sm:w-auto">
          <span className="font-bold text-lg text-gray-800 truncate max-w-full">{username}</span>
          <span className="ml-0 sm:ml-4 mt-2 sm:mt-0 px-3 py-1 bg-white/80 rounded-full shadow text-blue-700 font-semibold text-base">Score: {cumulativeScore}</span>
        </div>
        {quizPhase === 'question' && timeLeft > 0 && (
          <div className="flex items-center gap-2 text-xl font-bold text-purple-700 bg-white/80 px-4 py-1 rounded-full shadow mt-2 sm:mt-0">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {timeLeft}s
          </div>
        )}
      </div>

      {/* Waiting for host to start */}
      {participant && session && !['question', 'waiting', 'ended'].includes(quizPhase) && (
        <div className="flex flex-col items-center justify-center
          w-full
          max-w-[95vw] sm:max-w-xl md:max-w-2xl
          min-h-[60vh] sm:min-h-[28rem] md:min-h-[32rem]
          bg-white/80 rounded-xl shadow-lg
          p-4 sm:p-8
          animate-fade-in
          transition-all duration-500">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-blue-700 text-center">Waiting for host to start the quiz…</h1>
          <div className="text-gray-600 text-lg text-center">You have joined the session. Please wait for the host to begin.</div>
        </div>
      )}

      {/* Waiting for next question after answer */}
      {quizPhase === 'question' && selectedAnswer !== null && timeLeft > 0 && (
        <div className="flex flex-col items-center justify-center
          w-full
          max-w-[95vw] sm:max-w-xl md:max-w-2xl
          min-h-[50vh] sm:min-h-[22rem] md:min-h-[26rem]
          bg-white/80 rounded-xl shadow-lg
          p-4 sm:p-8
          animate-fade-in
          transition-all duration-500">
          <div className="text-2xl font-bold mb-2 text-purple-700">{timeLeft}s</div>
          <div className="mb-2 text-lg text-gray-700 text-center">Waiting for the next question...</div>
          <div className="text-blue-700 font-semibold text-lg">Score: {cumulativeScore}</div>
        </div>
      )}

      {/* Question and options */}
      {quizPhase === 'question' && currentQuestion && selectedAnswer === null && (
        <div className="space-y-6
          w-full
          max-w-[95vw] sm:max-w-xl md:max-w-2xl
          min-h-[55vh] sm:min-h-[26rem] md:min-h-[30rem]
          bg-white/80 rounded-xl shadow-lg
          p-4 sm:p-8
          animate-fade-in
          transition-all duration-500">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 transition-all duration-300 text-center break-words">{currentQuestion.question_text}</h2>
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
                     <div className="mt-6 flex justify-center">
             <div className={`flex items-center gap-2 text-xl font-bold px-4 py-1 rounded-full shadow ${
               selectedAnswer !== null ? 'text-green-700 bg-green-100' : timeLeft > 0 ? 'text-purple-700 bg-white/80' : 'text-red-700 bg-red-100'
             }`}>
               <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
               {selectedAnswer !== null ? 'Answered!' : timeLeft > 0 ? `${timeLeft}s` : 'Time\'s up!'}
             </div>
           </div>
        </div>
      )}

      {/* Feedback/Results screen after answering, before moving to next question */}
      {quizPhase === 'question' && currentQuestion && showCorrect && selectedAnswer !== null && (
        <div className="flex flex-col items-center justify-center
          w-full
          max-w-[95vw] sm:max-w-xl md:max-w-2xl
          min-h-[50vh] sm:min-h-[22rem] md:min-h-[26rem]
          bg-white/80 rounded-xl shadow-lg
          p-4 sm:p-8
          animate-fade-in
          transition-all duration-500">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">{selectedAnswer === currentQuestion.correct_answer_index ? 'Correct!' : 'Incorrect'}</h2>
          <div className="mt-4 text-center">
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
        <div className="flex flex-col items-center justify-center
          w-full
          max-w-[95vw] sm:max-w-xl md:max-w-2xl
          min-h-[50vh] sm:min-h-[22rem] md:min-h-[26rem]
          bg-white/80 rounded-xl shadow-lg
          p-4 sm:p-8
          animate-fade-in
          transition-all duration-500">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Time's up!</h2>
          <div className="mt-4 text-gray-600 text-lg">You did not answer in time.</div>
        </div>
      )}

      {/* Waiting for next question phase */}
      {quizPhase === 'waiting' && (
        <div className="flex flex-col items-center justify-center
          w-full
          max-w-[95vw] sm:max-w-xl md:max-w-2xl
          min-h-[50vh] sm:min-h-[22rem] md:min-h-[26rem]
          bg-white/80 rounded-xl shadow-lg
          p-4 sm:p-8
          animate-fade-in
          transition-all duration-500">
          <h2 className="text-2xl font-bold text-blue-700 mb-2 text-center">Waiting for next question...</h2>
        </div>
      )}

      {/* Quiz ended */}
      {quizPhase === 'ended' && (
        <div className="flex flex-col items-center justify-center
          w-full
          max-w-[95vw] sm:max-w-xl md:max-w-2xl
          min-h-[50vh] sm:min-h-[22rem] md:min-h-[26rem]
          bg-white/80 rounded-xl shadow-lg
          p-4 sm:p-8
          animate-fade-in
          transition-all duration-500">
          <h2 className="text-2xl sm:text-3xl font-bold text-green-700 mb-2 text-center">Quiz Ended</h2>
          <p className="mt-2 text-xl font-semibold text-gray-800 text-center">Final Score: {cumulativeScore}</p>
        </div>
      )}

      {timerWarning && (
        <div className="mb-2 text-yellow-600 font-semibold text-center">Warning: Timer was missing from the session. Defaulted to 20 seconds.</div>
      )}

      {error && <div className="mt-4 text-red-500 text-center">{error}</div>}
    </div>
  );
} 