import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabase.js';
import { motion, AnimatePresence } from 'framer-motion';
import ResultsPoll from '../../components/livequiz/ResultsPoll';
import FinalPodium from '../../components/livequiz/FinalPodium';

export default function QuizPage() {
  const { code: codeFromUrl } = useParams();
  const [searchParams] = useSearchParams();

  // Component state
  const [username, setUsername] = useState('');
  const [sessionCode, setSessionCode] = useState(codeFromUrl || '');
  const [session, setSession] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRemoved, setIsRemoved] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pollResults, setPollResults] = useState([]);
  const [participantScores, setParticipantScores] = useState({});
  const [participants, setParticipants] = useState([]);

  // --- Real-time Subscription ---

  useEffect(() => {
    if (!session?.id) return;

    const sessionChannel = supabase
      .channel('session-updates-' + session.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lq_sessions', filter: `id=eq.${session.id}` },
        (payload) => {
          console.log('Received session update:', payload.new);
          setSession(payload.new);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [session?.id]);

  // --- Data Fetching and State Resets based on Session Changes ---

  useEffect(() => {
    if (session?.phase === 'question' && session.current_question_id) {
      if (currentQuestion?.id !== session.current_question_id) {
        // New question detected, fetch it and reset state
        setSelectedAnswer(null);
        const fetchQuestion = async () => {
          const { data, error: qError } = await supabase
            .from('lq_questions')
            .select('*')
            .eq('id', session.current_question_id)
            .single();
          if (qError) {
            setError('Could not load question.');
          } else {
            setCurrentQuestion(data);
          }
        };
        fetchQuestion();
      }
    } else {
      // Not in question phase, clear the current question
      setCurrentQuestion(null);
    }
  }, [session, currentQuestion?.id]);

  // --- Timer Logic (Visual Only) ---

  useEffect(() => {
    if (session?.phase !== 'question' || !session.timer_end) {
      setTimeLeft(0);
      return;
    }
    const timerEndDate = new Date(session.timer_end);
    const interval = setInterval(() => {
      const secondsLeft = Math.max(0, Math.floor((timerEndDate.getTime() - Date.now()) / 1000));
      setTimeLeft(secondsLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // --- Fetch Participants and Scores ---

  const fetchParticipants = useCallback(async (sessionId) => {
    if (!sessionId) return;
    const { data, error } = await supabase.from('lq_session_participants').select('*').eq('session_id', sessionId);
    if (!error) setParticipants(data || []);
  }, []);

  const fetchAllScores = useCallback(async (sessionId) => {
    if (!sessionId) return;
    const { data, error } = await supabase.from('lq_live_responses').select('participant_id, points_awarded').eq('session_id', sessionId);
    if (!error && data) {
      const scoreMap = {};
      participants.forEach(p => {
        scoreMap[p.id] = data.filter(r => r.participant_id === p.id).reduce((sum, r) => sum + (r.points_awarded || 0), 0);
      });
      setParticipantScores(scoreMap);
    }
  }, [participants]);

  const fetchPollResults = useCallback(async (sessionId, questionId) => {
    if (!sessionId || !questionId) return;
    const { data, error } = await supabase
      .from('lq_live_responses')
      .select('selected_option_index')
      .eq('session_id', sessionId)
      .eq('question_id', questionId);
    
    if (!error && data) {
      const results = new Array(4).fill(0); // Assuming max 4 options
      data.forEach(response => {
        if (response.selected_option_index !== null) {
          results[response.selected_option_index] = (results[response.selected_option_index] || 0) + 1;
        }
      });
      setPollResults(results);
    }
  }, []);

  useEffect(() => {
    if (!session?.id) return;

    fetchParticipants(session.id);
    fetchAllScores(session.id);

    const participantChannel = supabase
      .channel('participants-' + session.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lq_session_participants', filter: `session_id=eq.${session.id}` }, () => fetchParticipants(session.id))
      .subscribe();

    const scoreChannel = supabase
      .channel('scores-' + session.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lq_live_responses', filter: `session_id=eq.${session.id}` }, () => fetchAllScores(session.id))
      .subscribe();

    return () => {
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(scoreChannel);
    };
  }, [session?.id, fetchParticipants, fetchAllScores]);

  // --- Poll Results Fetching ---
  useEffect(() => {
    if (session?.phase === 'results' && session.current_question_id) {
      fetchPollResults(session.id, session.current_question_id);
    }
  }, [session?.phase, session?.current_question_id, fetchPollResults]);

  // --- User Actions ---

  const handleJoinQuiz = async (e) => {
    e.preventDefault();
    if (!username || !sessionCode) return;
    setLoading(true);
    setError(null);

    const { data: sessionData, error: sessionError } = await supabase
      .from('lq_sessions')
      .select('*')
      .eq('code', sessionCode.toUpperCase())
      .eq('is_live', true)
      .single();

    if (sessionError || !sessionData) {
      setError('Invalid or inactive session code.');
      setLoading(false);
      return;
    }
    setSession(sessionData);

    const { data: participantData, error: participantError } = await supabase
      .from('lq_session_participants')
      .insert({ session_id: sessionData.id, username })
      .select()
      .single();

    if (participantError) {
      setError('Could not join session. Name might be taken.');
      setLoading(false);
    } else {
      setParticipant(participantData);
    }
    setLoading(false);
  };

  const submitAnswer = async (selectedIndex) => {
    if (selectedAnswer !== null || timeLeft <= 0) return;

    setSelectedAnswer(selectedIndex);

    const isCorrect = selectedIndex === currentQuestion.correct_answer_index;
    const points = isCorrect ? Math.round(100 + (timeLeft * 10)) : 0;

    await supabase.from('lq_live_responses').insert({
      session_id: session.id,
      participant_id: participant.id,
      question_id: currentQuestion.id,
      selected_option_index: selectedIndex,
      is_correct: isCorrect,
      points_awarded: points,
    });
  };

  // --- Animation Variants ---
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5
  };

  // --- UI Rendering ---

  // 1. Join Form
  if (!participant) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-screen bg-gray-100"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <form onSubmit={handleJoinQuiz} className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-center">Join Live Quiz</h1>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <div className="mb-4">
            <input 
              type="text" 
              placeholder="Session Code" 
              value={sessionCode} 
              onChange={e => setSessionCode(e.target.value)} 
              className="w-full p-3 border rounded" 
              required 
            />
          </div>
          <div className="mb-6">
            <input 
              type="text" 
              placeholder="Your Name" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="w-full p-3 border rounded" 
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full p-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Joining...' : 'Join'}
          </button>
        </form>
      </motion.div>
    );
  }

  // 2. Main Quiz Views
  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl text-center">
        <AnimatePresence mode="wait">
          {session.phase === 'lobby' && (
            <motion.div
              key="lobby"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <h1 className="text-3xl font-bold text-blue-700">Waiting for the host to start...</h1>
              <p className="text-gray-600 mt-4">You're in! The quiz will begin soon.</p>
            </motion.div>
          )}

          {session.phase === 'question' && currentQuestion && (
            <motion.div
              key="question"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <div className="mb-4 text-2xl font-bold">Time Left: {timeLeft}s</div>
              <h2 className="text-2xl font-bold mb-6">{currentQuestion.question_text}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={() => submitAnswer(index)}
                    disabled={selectedAnswer !== null || timeLeft <= 0}
                    whileHover={{ scale: selectedAnswer === null && timeLeft > 0 ? 1.02 : 1 }}
                    whileTap={{ scale: selectedAnswer === null && timeLeft > 0 ? 0.98 : 1 }}
                    className={`p-4 rounded-lg text-lg font-semibold border-2 transition-all duration-200
                      ${selectedAnswer !== null
                        ? (index === currentQuestion.correct_answer_index ? 'bg-green-200 border-green-400' : index === selectedAnswer ? 'bg-red-200 border-red-400' : 'bg-gray-100')
                        : 'bg-white hover:bg-blue-100 border-gray-300'
                      }`}
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
              {selectedAnswer !== null && (
                <motion.p 
                  className="mt-6 text-xl font-bold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Waiting for next question...
                </motion.p>
              )}
            </motion.div>
          )}

          {session.phase === 'results' && currentQuestion && (
            <motion.div
              key="results"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <ResultsPoll 
                question={currentQuestion} 
                responses={pollResults} 
                totalParticipants={participants.length} 
              />
            </motion.div>
          )}

          {session.phase === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <h1 className="text-3xl font-bold text-blue-700 mb-4">Leaderboard</h1>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <ol className="space-y-2">
                  {participants
                    .map(p => ({ ...p, score: participantScores[p.id] || 0 }))
                    .sort((a, b) => b.score - a.score)
                    .map((p, i) => (
                      <motion.li 
                        key={p.id} 
                        className="flex justify-between p-3 bg-gray-50 rounded shadow"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <span className="font-semibold">{i + 1}. {p.username}</span>
                        <span className="font-bold text-blue-600">{p.score} pts</span>
                      </motion.li>
                    ))}
                </ol>
              </div>
            </motion.div>
          )}

          {session.phase === 'ended' && (
            <motion.div
              key="ended"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <FinalPodium participants={participants} scores={participantScores} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 