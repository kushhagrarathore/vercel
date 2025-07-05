import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useQuiz } from './QuizContext';

export default function QuizPage() {
  const { session, setSession } = useQuiz();
  const [username, setUsername] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [participant, setParticipant] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizPhase, setQuizPhase] = useState('waiting');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timerWarning, setTimerWarning] = useState(false);

  useEffect(() => {
    if (!participant?.id) return;
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [participant?.id]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  function setupRealtimeSubscriptions() {
    const sessionChannel = supabase
      .channel('session-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
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
    setQuizPhase(sessionData.phase);
    setTimerWarning(false);
    if (sessionData.current_question_id) {
      const { data: questionData } = await supabase
        .from('questions')
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
            // fallback if timer_end is in the past or now
            seconds = questionData.timer || 20;
          }
          setTimeLeft(seconds);
        } else {
          // fallback: timer_end missing
          setTimeLeft(questionData.timer || 20);
          setTimerWarning(true);
        }
        setSelectedAnswer(null); // Reset selected answer for new question
      }
    } else {
      setCurrentQuestion(null);
      setTimeLeft(0);
      setSelectedAnswer(null);
    }
  }

  async function joinQuiz(e) {
    e.preventDefault();
    if (!username || !sessionCode) return;

    try {
      setLoading(true);
      // First, get the session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', sessionCode.toUpperCase())
        .eq('is_live', true)
        .single();

      if (sessionError) throw new Error('Invalid session code');
      setSession(sessionData);

      // Then, create participant
      const { data: participantData, error: participantError } = await supabase
        .from('session_participants')
        .insert([
          {
            session_id: sessionData.id,
            username,
            score: 0,
          },
        ])
        .select()
        .single();

      if (participantError) throw participantError;
      setParticipant(participantData);

      // Get current question if exists
      if (sessionData.current_question_id) {
        const { data: questionData } = await supabase
          .from('questions')
          .select('*')
          .eq('id', sessionData.current_question_id)
          .single();

        if (questionData) {
          setCurrentQuestion(questionData);
          if (sessionData.timer_end) {
            const end = new Date(sessionData.timer_end);
            const now = new Date();
            setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)));
          }
        }
      }

      setQuizPhase(sessionData.phase);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(selectedIndex) {
    console.log('submitAnswer called with:', selectedIndex);
    if (!participant?.id || !currentQuestion?.id || selectedAnswer !== null) return;

    try {
      setSelectedAnswer(selectedIndex);
      const isCorrect = selectedIndex === currentQuestion.correct_answer_index;
      const points = isCorrect ? Math.max(100, timeLeft * 10) : 0;

      await supabase.from('live_responses').insert([
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
        await supabase
          .from('session_participants')
          .update({ score: participant.score + points })
          .eq('id', participant.id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  if (!participant) {
    return (
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Join Quiz</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={joinQuiz} className="space-y-4">
          <div>
            <label className="block mb-2">Session Code</label>
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter session code"
              required
            />
          </div>
          <div>
            <label className="block mb-2">Your Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter your name"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Joining...' : 'Join Quiz'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <span className="font-bold">{username}</span>
          <span className="ml-2 text-gray-600">Score: {participant.score}</span>
        </div>
        {quizPhase === 'question' && timeLeft > 0 && (
          <div className="text-xl font-bold">
            Time: {timeLeft}s
          </div>
        )}
      </div>

      {quizPhase === 'waiting' && (
        <div className="text-center py-8">
          <h2 className="text-xl font-bold">Waiting for next question...</h2>
        </div>
      )}

      {quizPhase === 'question' && currentQuestion && timeLeft > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{currentQuestion.question_text}</h2>
          <div className="grid gap-4">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => submitAnswer(index)}
                disabled={selectedAnswer !== null}
                className={`p-4 text-left rounded border ${
                  selectedAnswer === null
                    ? 'hover:bg-blue-50'
                    : selectedAnswer === index
                    ? currentQuestion.correct_answer_index === index
                      ? 'bg-green-100 border-green-500'
                      : 'bg-red-100 border-red-500'
                    : currentQuestion.correct_answer_index === index
                    ? 'bg-green-100 border-green-500'
                    : ''
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {quizPhase === 'question' && currentQuestion && timeLeft === 0 && (
        <div className="text-center py-8">
          <h2 className="text-xl font-bold">Time's up! Waiting for next question...</h2>
        </div>
      )}

      {quizPhase === 'ended' && (
        <div className="text-center py-8">
          <h2 className="text-xl font-bold">Quiz Ended</h2>
          <p className="mt-2">Final Score: {participant.score}</p>
        </div>
      )}

      {timerWarning && (
        <div className="mb-2 text-yellow-600 font-semibold">Warning: Timer was missing from the session. Defaulted to 20 seconds.</div>
      )}

      {error && <div className="mt-4 text-red-500">{error}</div>}
    </div>
  );
} 