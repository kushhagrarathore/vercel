import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabase.js';
import { useQuiz } from '../../pages/livequiz/QuizContext';

export default function QuizPage() {
  const { session, setSession } = useQuiz();
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

  // --- Timer logic: requestAnimationFrame-based, server-synced (robust) ---
  const timerAnimationRef = React.useRef();
  useEffect(() => {
    // Only run timer in question phase
    if (quizPhase !== 'question') {
      setTimeLeft(0);
      setShowCorrect(false);
      return;
    }
    // Use session.timer_end if available, else fallback to currentQuestion.timer or 20s
    let end = null;
    if (session && session.timer_end) {
      end = new Date(session.timer_end);
    } else if (currentQuestion && currentQuestion.timer) {
      end = new Date(Date.now() + currentQuestion.timer * 1000);
    } else {
      end = new Date(Date.now() + 20 * 1000);
    }
    function updateTime() {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.floor((end.getTime() - now) / 1000));
      setTimeLeft(secondsLeft);
      if (secondsLeft === 0) {
        setShowCorrect(true);
        return; // Stop animating
      }
      timerAnimationRef.current = requestAnimationFrame(updateTime);
    }
    timerAnimationRef.current = requestAnimationFrame(updateTime);
    return () => {
      if (timerAnimationRef.current) cancelAnimationFrame(timerAnimationRef.current);
    };
  }, [session?.timer_end, quizPhase, currentQuestion?.timer]);

  // Show feedback/results screen for 2.5s after answering, before moving to next question or waiting
  useEffect(() => {
    if (!showCorrect) return;
    if (selectedAnswer !== null) {
      // Refetch participant score after timer ends
      async function fetchScore() {
        if (!participant?.id) return;
        const { data, error } = await supabase
          .from('lq_session_participants')
          .select('score')
          .eq('id', participant.id)
          .single();
        if (!error && data) setLiveScore(data.score);
      }
      fetchScore();
      const timeout = setTimeout(() => {
        setPointsEarned(null);
        setSelectedAnswer(null);
        // Optionally, move to waiting or next question here if needed
      }, 2500); // 2.5s delay before reset
      return () => clearTimeout(timeout);
    }
  }, [showCorrect, selectedAnswer]);

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
    console.log('handleSessionUpdate payload:', payload);
    const sessionData = payload.new;
    if (!sessionData) return;
    // If phase changes to 'question', transition to quiz view
    setQuizPhase(sessionData.phase);
    setTimerWarning(false);
    if (sessionData.phase === 'question' && sessionData.current_question_id) {
      const { data: questionData } = await supabase
        .from('lq_questions')
        .select('*')
        .eq('id', sessionData.current_question_id)
        .single();
      if (questionData) {
        setCurrentQuestion(questionData);
        if (sessionData.timer_end) {
          const end = new Date(sessionData.timer_end);
          const now = new Date();
          let seconds = Math.max(0, Math.floor((end - now) / 1000));
          if (seconds === 0) {
            seconds = questionData.timer || 20;
          }
          setTimeLeft(seconds);
          setShowCorrect(false);
        } else {
          setTimeLeft(questionData.timer || 20);
          setShowCorrect(false);
          setTimerWarning(true);
        }
        setSelectedAnswer(null); // Reset selected answer for new question
      }
    } else if (sessionData.phase !== 'question') {
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
          if (sessionData.timer_end) {
            const end = new Date(sessionData.timer_end);
            const now = new Date();
            setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)));
          }
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
      {quizPhase === 'question' && currentQuestion && timeLeft > 0 && selectedAnswer === null && (
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
                disabled={selectedAnswer !== null}
                className={
                  `p-3 sm:p-4 w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm text-base sm:text-lg font-medium transition-all duration-200
                  hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300
                  active:scale-95`}
                style={{ transition: 'background 0.2s, transform 0.2s' }}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-2 text-xl font-bold text-purple-700 bg-white/80 px-4 py-1 rounded-full shadow">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {timeLeft}s
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