import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase/client';
import { useQuiz } from '../../pages/livequiz/QuizContext';

export default function AdminPage() {
  const {
    session,
    setSession,
    currentQuestion,
    setCurrentQuestion,
    participants,
    setParticipants,
    quizPhase,
    setQuizPhase,
  } = useQuiz();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [pollResults, setPollResults] = useState([]);
  const [participantScores, setParticipantScores] = useState({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const presentationRef = useRef(null);
  const [waitingToStart, setWaitingToStart] = useState(false);

  // Customization defaults (copy from QuestionsPage.js)
  const settingsDefaults = {
    backgroundColor: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
    backgroundGradient: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
    imageUrl: '',
    questionContainerBgColor: '#ffffff',
    textColor: '#222222',
    buttonColor: '#2563eb',
    fontSize: 20,
    fontFamily: 'Inter, Arial, sans-serif',
    borderRadius: 20,
    padding: 32,
    margin: 24,
    alignment: 'center',
    optionLayout: 'vertical',
    shadow: true,
    bold: false,
    italic: false,
  };
  function getSettings(obj) {
    return { ...settingsDefaults, ...(obj || {}) };
  }

  const fetchParticipants = useCallback(async (sessionId) => {
    if (!sessionId) return;
    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId);
    if (error) {
      console.error('Error fetching participants:', error);
      return;
    }
    setParticipants(data || []);
  }, [setParticipants]);

  const fetchQuizzes = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('quizzes').select('*');
      if (error) throw error;
      setQuizzes(data || []);
      if (data && data.length > 0 && !selectedQuizId) {
        setSelectedQuizId(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [selectedQuizId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const fetchQuestions = useCallback(async (quizId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lq_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
      if (data && data.length > 0) {
        setCurrentQuestion(data[0]);
        setCurrentQuestionIndex(0);
      } else {
        setCurrentQuestion(null);
        setCurrentQuestionIndex(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setCurrentQuestion, setCurrentQuestionIndex]);

  useEffect(() => {
    if (selectedQuizId) {
      fetchQuestions(selectedQuizId);
    }
  }, [selectedQuizId, fetchQuestions]);

  useEffect(() => {
    if (!session || !currentQuestion || quizPhase !== 'question') {
      setTimeLeft(0);
      setShowCorrect(false);
      return;
    }
    let interval = null;
    let end;
    if (session.timer_end) {
      end = new Date(session.timer_end);
    } else {
      end = new Date();
      end.setSeconds(end.getSeconds() + (currentQuestion.timer || 20));
    }
    function updateTime() {
      const now = new Date();
      const secondsLeft = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(secondsLeft);
      if (secondsLeft === 0) {
        setShowCorrect(true);
        if (interval) clearInterval(interval);
      }
    }
    updateTime(); // Set initial value
    interval = setInterval(updateTime, 1000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session, currentQuestion, quizPhase]);

  useEffect(() => {
    if (selectedQuizId) {
      fetchQuestions(selectedQuizId);
    }
  }, [selectedQuizId, fetchQuestions]);

  // Fetch and subscribe to participants for the current session
  useEffect(() => {
    if (!session?.id) return;
    fetchParticipants(session.id);
    // Real-time subscription for session_participants (score updates)
    const channel = supabase
      .channel('participants-' + session.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${session.id}` },
        () => fetchParticipants(session.id)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, fetchParticipants]);

  // Always fetch latest participants after each question ends
  useEffect(() => {
    if (showCorrect && session?.id) {
      fetchParticipants(session.id);
    }
  }, [showCorrect, session?.id, fetchParticipants]);

  // Fetch poll results after timer ends
  useEffect(() => {
    async function fetchPollResults() {
      if (!showCorrect || !session?.id || !currentQuestion?.id) {
        setPollResults([]);
        return;
      }
      const { data, error } = await supabase
        .from('live_responses')
        .select('selected_option_index')
        .eq('session_id', session.id)
        .eq('question_id', currentQuestion.id);
      if (error) {
        setPollResults([]);
        return;
      }
      // Count responses per option
      const counts = Array(currentQuestion.options.length).fill(0);
      data.forEach(r => {
        if (typeof r.selected_option_index === 'number') {
          counts[r.selected_option_index]++;
        }
      });
      setPollResults(counts);
    }
    fetchPollResults();
  }, [showCorrect, session?.id, currentQuestion?.id, currentQuestion?.options?.length]);

  // Fetch cumulative scores for all participants after each question and on mount
  useEffect(() => {
    async function fetchAllScores() {
      if (!session?.id || participants.length === 0) return;
      const ids = participants.map(p => p.id);
      const { data, error } = await supabase
        .from('live_responses')
        .select('participant_id, points_awarded')
        .eq('session_id', session.id);
      if (!error && data) {
        const scoreMap = {};
        ids.forEach(pid => {
          scoreMap[pid] = data.filter(r => r.participant_id === pid).reduce((sum, r) => sum + (r.points_awarded || 0), 0);
        });
        setParticipantScores(scoreMap);
      }
    }
    fetchAllScores();
  }, [participants, session?.id, showCorrect]);

  // Show leaderboard after clicking Next (when quizPhase is 'waiting' and not at the end)
  useEffect(() => {
    if (quizPhase === 'waiting' && currentQuestionIndex > 0 && currentQuestionIndex < questions.length) {
      setShowLeaderboard(true);
    } else {
      setShowLeaderboard(false);
    }
  }, [quizPhase, currentQuestionIndex, questions.length]);

  // Presentation Mode: Fullscreen logic (robust)
  useEffect(() => {
    if (presentationMode && presentationRef.current) {
      if (!document.fullscreenElement) {
        presentationRef.current.requestFullscreen?.();
      }
    } else if (!presentationMode && document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    // Clean up on unmount
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.();
    };
  }, [presentationMode]);

  // Allow exiting Presentation Mode with ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (presentationMode && (e.key === 'Escape' || e.key === 'Esc')) {
        setPresentationMode(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentationMode]);

  async function startQuiz() {
    if (!selectedQuizId) {
      setError('Please select a quiz.');
      return;
    }
    try {
      const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data, error } = await supabase
        .from('sessions')
        .insert([
          {
            code: sessionCode,
            is_live: true,
            phase: 'lobby',
            quiz_id: selectedQuizId,
            current_question_id: questions[0]?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setSession(data);
      setQuizPhase('waiting');
      setWaitingToStart(true);
    } catch (err) {
      setError(err.message);
    }
  }

  // Handler for 'Start Quiz' button (after session is created, before first question)
  async function handleStartQuiz() {
    setWaitingToStart(false);
    setPresentationMode(true);
    await startQuestion();
  }

  async function startQuestion() {
    if (!session?.id || !currentQuestion?.id) return;

    try {
      const timerEnd = new Date();
      timerEnd.setSeconds(timerEnd.getSeconds() + (currentQuestion.timer || 20));

      await supabase
        .from('sessions')
        .update({
          phase: 'question',
          timer_end: timerEnd.toISOString(),
          current_question_id: currentQuestion.id,
        })
        .eq('id', session.id);

      setQuizPhase('question');
    } catch (err) {
      setError(err.message);
    }
  }

  async function nextQuestion() {
    if (currentQuestionIndex >= questions.length - 1) {
      await endQuiz();
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setCurrentQuestion(questions[nextIndex]);
    setQuizPhase('waiting');
  }

  async function endQuiz() {
    if (!session?.id) return;

    try {
      await supabase
        .from('sessions')
        .update({
          is_live: false,
          phase: 'ended',
        })
        .eq('id', session.id);

      setQuizPhase('ended');
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeParticipant(participantId) {
    try {
      await supabase
        .from('session_participants')
        .delete()
        .eq('id', participantId);

      await fetchParticipants(session.id);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div
      ref={presentationRef}
      className={`min-h-screen min-w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 font-sans transition-all duration-500 ${presentationMode ? 'fixed inset-0 w-screen h-screen z-50 p-0 m-0 overflow-hidden' : 'px-2 sm:px-4'}`}
      style={presentationMode ? { margin: 0, padding: 0 } : {}}
    >
      {/* Fixed Presentation Mode Top Bar */}
      {presentationMode && (
        <div className="fixed top-0 left-0 w-full z-50 bg-white/90 shadow-md flex items-center justify-between px-8 py-3 gap-4"
          style={{ minHeight: '4.5rem', backdropFilter: 'blur(8px)' }}
        >
          <span className="text-lg md:text-2xl font-bold text-blue-700 tracking-wider">Quiz Code: <span className="text-gray-800">{session?.code}</span></span>
          <span className="text-base md:text-xl font-semibold text-gray-700">Q{currentQuestionIndex + 1} of {questions.length}</span>
          <div className="flex items-center gap-6">
            {quizPhase === 'question' && (
              <div className="flex items-center gap-2 text-purple-700 font-bold text-xl bg-white/80 px-4 py-1 rounded-full shadow">
                <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {timeLeft}s
              </div>
            )}
            <button
              onClick={() => setPresentationMode(false)}
              className="px-5 py-2 bg-gray-700 text-white rounded-lg font-semibold shadow hover:bg-gray-900 transition-all text-base border border-gray-900"
              title="Exit Presentation Mode (ESC)"
            >
              Exit Presentation Mode
            </button>
          </div>
        </div>
      )}
      <div className={`w-full ${presentationMode ? 'h-full flex flex-col justify-center items-center' : 'max-w-4xl mx-auto p-2 sm:p-6'}`}
        style={presentationMode ? { maxWidth: '100vw', maxHeight: '100vh', padding: 0, marginTop: '4.5rem' } : {}}>
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <h1 className="text-3xl font-bold text-blue-700 tracking-tight">Quiz Admin</h1>
          <button
            onClick={() => setPresentationMode(m => !m)}
            className={`px-4 py-2 rounded-lg font-semibold shadow transition-all duration-200 ${presentationMode ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            {presentationMode ? 'Exit Presentation Mode' : 'Presentation Mode'}
          </button>
        </div>

        {/* Quiz Start Flow: After creating session, show code, participant list, and Start Quiz button */}
        {waitingToStart && session ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
            <div className="w-full max-w-lg mx-auto bg-white/80 rounded-xl shadow-lg p-6 animate-fade-in">
              <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">Quiz Lobby</h2>
              <div className="mb-4 text-center">
                <span className="text-lg font-semibold text-gray-800">Quiz Code: <span className="text-blue-700 text-2xl font-bold">{session.code}</span></span>
              </div>
              <div className="mb-6">
                <h3 className="font-bold mb-2 text-lg text-gray-800 text-center">Participants</h3>
                <div className="space-y-2">
                  {participants.length === 0 && <div className="text-gray-500 text-center">No participants yet.</div>}
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded-lg shadow-sm"
                    >
                      <span className="truncate max-w-[10rem] font-medium text-gray-800">{participant.username}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={handleStartQuiz}
                  className="px-8 py-3 bg-green-600 text-white rounded-2xl font-bold text-xl shadow-lg hover:bg-green-700 transition-all"
                  style={{ minWidth: '120px' }}
                >
                  Start Quiz
                </button>
              </div>
            </div>
          </div>
        ) :
        !session ? (
          <div>
            <label className="block mb-2 font-semibold">Select Quiz</label>
            <select
              value={selectedQuizId}
              onChange={e => setSelectedQuizId(e.target.value)}
              className="mb-4 p-3 border rounded-lg w-full text-lg shadow-sm focus:ring-2 focus:ring-blue-300"
            >
              {quizzes.length === 0 && <option value="">No quizzes available</option>}
              {quizzes.map(quiz => (
                <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
              ))}
            </select>
            <button
              onClick={startQuiz}
              disabled={!selectedQuizId}
              className="w-full py-3 rounded-lg bg-blue-500 text-white font-bold text-lg shadow hover:bg-blue-600 disabled:bg-gray-400 transition-all"
            >
              Start New Quiz Session
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Show leaderboard only, hide question/response containers when leaderboard is visible */}
            {showLeaderboard ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
                <div className="w-full max-w-lg mx-auto bg-white/80 rounded-xl shadow-lg p-6 animate-fade-in">
                  <h3 className="text-2xl font-bold text-blue-700 mb-4 text-center">Top 5 Leaderboard</h3>
                  <ol className="space-y-2 mb-6">
                    {participants
                      .map(p => ({ ...p, score: participantScores[p.id] || 0 }))
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 5)
                      .map((p, idx) => (
                        <li key={p.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2 shadow-sm">
                          <span className="font-semibold text-lg text-gray-800">
                            {idx + 1}. {p.username || 'Anonymous'}
                          </span>
                          <span className="font-bold text-blue-700 text-lg">{p.score}</span>
                        </li>
                      ))}
                  </ol>
                  <div className="flex justify-center">
                    <button
                      onClick={startQuestion}
                      className="px-6 py-2 bg-green-500 text-white rounded-lg font-semibold shadow hover:bg-green-600 transition-all text-lg"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : (
            <>
            {/* Presentation Mode Fullscreen Content */}
            {presentationMode ? (
              (() => {
                const settings = getSettings(currentQuestion?.settings);
                let pageBg = settings.backgroundColor || '#f8fafc';
                if (settings.imageUrl) {
                  pageBg = `url(${settings.imageUrl}) center/cover no-repeat, ${settings.backgroundColor || '#f8fafc'}`;
                } else if (settings.backgroundGradient) {
                  pageBg = settings.backgroundGradient;
                }
                return (
                  <div
                    className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center overflow-hidden z-40"
                    style={{
                      background: pageBg,
                      backgroundSize: settings.imageUrl ? 'cover' : undefined,
                      backgroundPosition: settings.imageUrl ? 'center' : undefined,
                    }}
                  >
                    {/* Top bar remains as before */}
                    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[1600px] mx-auto px-0 pt-[5.5rem] pb-0 box-border relative">
                      {/* Question or Results */}
                      {quizPhase === 'question' && timeLeft > 0 ? (
                        <>
                          {/* Question text */}
                          <div className="w-full bg-white/90 rounded-t-3xl shadow-2xl p-10 flex flex-col items-center justify-center"
                            style={{
                              minHeight:'120px',
                              background: settings.questionContainerBgColor || '#ffffff',
                              color: settings.textColor,
                              borderRadius: settings.borderRadius,
                              boxShadow: settings.shadow ? '0 4px 24px 0 rgba(0,0,0,0.10)' : 'none',
                              fontSize: settings.fontSize,
                              fontFamily: settings.fontFamily,
                              textAlign: settings.alignment,
                            }}
                          >
                            <h3 className="font-bold text-4xl md:text-5xl text-gray-900 text-center break-words w-full max-w-5xl" style={{lineHeight:'1.2', fontWeight: settings.bold ? 'bold' : 'normal', fontStyle: settings.italic ? 'italic' : 'normal', color: settings.textColor, fontFamily: settings.fontFamily, fontSize: settings.fontSize}}>{currentQuestion?.question_text}</h3>
                          </div>
                          {/* Options */}
                          <div className="w-full flex-1 flex flex-col items-center justify-center">
                            {currentQuestion?.options && (
                              <div className="w-full flex flex-col items-center justify-center gap-14 mt-14 px-16">
                                {/* 2 options: side by side */}
                                {currentQuestion.options.length === 2 && (
                                  <div className="flex flex-row w-full gap-14">
                                    {currentQuestion.options.map((option, idx) => (
                                      <button key={idx} className="flex-1 py-14 text-3xl md:text-4xl font-semibold rounded-2xl shadow-lg text-white text-center"
                                        style={{
                                          background: settings.buttonColor,
                                          borderRadius: settings.borderRadius,
                                          fontSize: settings.fontSize,
                                          fontFamily: settings.fontFamily,
                                          fontWeight: settings.bold ? 'bold' : 'normal',
                                          fontStyle: settings.italic ? 'italic' : 'normal',
                                          boxShadow: settings.shadow ? '0 2px 8px 0 rgba(0,0,0,0.10)' : 'none',
                                        }}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {/* 3 options: 2 top, 1 bottom */}
                                {currentQuestion.options.length === 3 && (
                                  <div className="flex flex-col w-full gap-10">
                                    <div className="flex flex-row w-full gap-14">
                                      {currentQuestion.options.slice(0,2).map((option, idx) => (
                                        <button key={idx} className="flex-1 py-14 text-3xl md:text-4xl font-semibold rounded-2xl shadow-lg text-white text-center"
                                          style={{
                                            background: settings.buttonColor,
                                            borderRadius: settings.borderRadius,
                                            fontSize: settings.fontSize,
                                            fontFamily: settings.fontFamily,
                                            fontWeight: settings.bold ? 'bold' : 'normal',
                                            fontStyle: settings.italic ? 'italic' : 'normal',
                                            boxShadow: settings.shadow ? '0 2px 8px 0 rgba(0,0,0,0.10)' : 'none',
                                          }}
                                        >
                                          {option}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex flex-row w-full justify-center">
                                      <button className="w-1/2 py-14 text-3xl md:text-4xl font-semibold rounded-2xl shadow-lg text-white text-center"
                                        style={{
                                          background: settings.buttonColor,
                                          borderRadius: settings.borderRadius,
                                          fontSize: settings.fontSize,
                                          fontFamily: settings.fontFamily,
                                          fontWeight: settings.bold ? 'bold' : 'normal',
                                          fontStyle: settings.italic ? 'italic' : 'normal',
                                          boxShadow: settings.shadow ? '0 2px 8px 0 rgba(0,0,0,0.10)' : 'none',
                                        }}
                                      >
                                        {currentQuestion.options[2]}
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {/* 4 options: 2x2 grid */}
                                {currentQuestion.options.length === 4 && (
                                  <div className="grid grid-cols-2 gap-14 w-full">
                                    {currentQuestion.options.map((option, idx) => (
                                      <button key={idx} className="py-14 text-3xl md:text-4xl font-semibold rounded-2xl shadow-lg text-white text-center"
                                        style={{
                                          background: settings.buttonColor,
                                          borderRadius: settings.borderRadius,
                                          fontSize: settings.fontSize,
                                          fontFamily: settings.fontFamily,
                                          fontWeight: settings.bold ? 'bold' : 'normal',
                                          fontStyle: settings.italic ? 'italic' : 'normal',
                                          boxShadow: settings.shadow ? '0 2px 8px 0 rgba(0,0,0,0.10)' : 'none',
                                        }}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Next Button - bottom right, floating */}
                          <div className="fixed bottom-10 right-16 z-50">
                            <button
                              onClick={nextQuestion}
                              className="flex items-center gap-2 px-10 py-5 bg-green-600 text-white rounded-2xl font-bold text-2xl shadow-xl hover:bg-green-700 transition-all border-2 border-green-700"
                              style={{ minWidth: '200px', fontWeight: 700 }}
                            >
                              Next <span className="ml-2 text-3xl">➡</span>
                            </button>
                          </div>
                        </>
                      ) : quizPhase === 'question' && timeLeft === 0 ? (
                        /* Results Screen */
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <div className="w-full bg-white/90 rounded-t-3xl shadow-2xl p-10 flex flex-col items-center justify-center" style={{minHeight:'120px', background: settings.questionContainerBgColor || '#ffffff'}}>
                            <h3 className="font-bold text-4xl md:text-5xl text-gray-900 text-center break-words w-full max-w-5xl mb-8">Results</h3>
                            <div className="w-full flex flex-col items-center justify-center gap-10 mt-6 px-16">
                              {currentQuestion.options.map((option, idx) => {
                                const count = pollResults[idx] || 0;
                                const total = pollResults.reduce((a, b) => a + b, 0) || 1;
                                const percent = Math.round((count / total) * 100);
                                const isCorrect = idx === currentQuestion.correct_answer_index;
                                return (
                                  <div key={idx} className={`flex items-center w-full p-6 rounded-2xl shadow-lg ${isCorrect ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-gray-300'}`}>
                                    <span className={`flex-1 text-2xl md:text-3xl font-semibold ${isCorrect ? 'text-green-700' : 'text-gray-800'}`}>{option}</span>
                                    <div className="w-1/2 mx-4 bg-gray-200 rounded h-8 relative overflow-hidden">
                                      <div
                                        className={`h-8 rounded ${isCorrect ? 'bg-green-400' : 'bg-blue-400'}`}
                                        style={{ width: `${percent}%` }}
                                      ></div>
                                      <span className="absolute left-4 top-1 text-lg text-black font-bold">{count} ({percent}%)</span>
                                    </div>
                                    {isCorrect && <span className="ml-6 text-green-700 font-bold text-3xl">✓</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* Next Button - bottom right, floating */}
                          <div className="fixed bottom-10 right-16 z-50">
                            <button
                              onClick={nextQuestion}
                              className="flex items-center gap-2 px-10 py-5 bg-green-600 text-white rounded-2xl font-bold text-2xl shadow-xl hover:bg-green-700 transition-all border-2 border-green-700"
                              style={{ minWidth: '200px', fontWeight: 700 }}
                            >
                              Next <span className="ml-2 text-3xl">➡</span>
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="bg-gray-100 p-4 rounded-xl shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Session Code: <span className="text-blue-700">{session.code}</span></h2>
                  <p className="text-gray-600">Status: <span className="font-semibold">{quizPhase}</span></p>
                  <p className="text-gray-600">Question: <span className="font-semibold">{currentQuestionIndex + 1} / {questions.length}</span></p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={startQuestion}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold shadow hover:bg-green-600 transition-all"
                    style={{ display: quizPhase === 'waiting' ? 'block' : 'none' }}
                  >
                    Start Question
                  </button>
                  <button
                    onClick={nextQuestion}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold shadow hover:bg-blue-600 transition-all"
                    style={{ display: quizPhase === 'question' ? 'block' : 'none' }}
                  >
                    Next Question
                  </button>
                  <button
                    onClick={endQuiz}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold shadow hover:bg-red-600 transition-all"
                  >
                    End Quiz
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white/80 p-6 rounded-xl shadow-lg mt-6">
              <h3 className="font-bold mb-2 text-xl text-gray-800">Current Question</h3>
              {currentQuestion && (
                <div>
                  <p className="font-bold text-lg text-gray-900 mb-2">{currentQuestion.question_text}</p>
                  <ul className="ml-4 mt-2 space-y-1">
                    {currentQuestion.options.map((option, index) => (
                      <li
                        key={index}
                        className={
                          `${showCorrect && index === currentQuestion.correct_answer_index ? 'text-green-600 font-semibold' : 'text-gray-700'} flex items-center gap-2`
                        }
                      >
                        {option}
                        {showCorrect && index === currentQuestion.correct_answer_index && <span className="ml-2 text-green-600 font-bold">✓</span>}
                      </li>
                    ))}
                  </ul>
                  {quizPhase === 'question' && timeLeft > 0 && (
                    <div className="mt-4 text-xl font-bold text-purple-700 flex items-center gap-2 bg-white/80 px-4 py-1 rounded-full shadow w-fit">
                      <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {timeLeft}s
                    </div>
                  )}
                  {quizPhase === 'question' && timeLeft === 0 && (
                    <div className="mt-4 text-green-700 font-bold">Time's up! Correct answer shown above.</div>
                  )}
                  {showCorrect && pollResults.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-bold mb-2">Poll Results</h4>
                      <div className="space-y-2">
                        {currentQuestion.options.map((option, idx) => {
                          const count = pollResults[idx] || 0;
                          const total = pollResults.reduce((a, b) => a + b, 0) || 1;
                          const percent = Math.round((count / total) * 100);
                          return (
                            <div key={idx} className={`flex items-center ${idx === currentQuestion.correct_answer_index ? 'bg-green-100' : 'bg-gray-100'} rounded p-2`}>
                              <span className="flex-1">
                                {option}
                                {idx === currentQuestion.correct_answer_index && <span className="ml-2 text-green-600 font-bold">✓</span>}
                              </span>
                              <div className="w-1/2 mx-2 bg-gray-200 rounded h-4 relative">
                                <div
                                  className={`h-4 rounded ${idx === currentQuestion.correct_answer_index ? 'bg-green-400' : 'bg-blue-400'}`}
                                  style={{ width: `${percent}%` }}
                                ></div>
                                <span className="absolute left-2 top-0 text-xs text-black">{count} ({percent}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Only show participant list and details if not in presentation mode */}
            {!presentationMode && (
              <div className="mt-8">
                <h3 className="font-bold mb-2 text-lg text-gray-800">Participants <span className="text-blue-700">({participants.length})</span></h3>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded-lg shadow-sm"
                    >
                      <span className="truncate max-w-[10rem] font-medium text-gray-800">{participant.username}</span>
                      <span className="font-bold text-blue-700">{participantScores[participant.id] || 0}</span>
                      <button
                        onClick={() => removeParticipant(participant.id)}
                        className="px-2 py-1 text-red-500 hover:bg-red-100 rounded transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>) /* End of not leaderboard */}
          </div>
        )}
      </div>
    </div>
  );
} 