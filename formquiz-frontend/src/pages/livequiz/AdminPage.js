import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase.js';
import { useQuiz } from '../../pages/livequiz/QuizContext';
import { QRCodeSVG } from 'qrcode.react';
import QuestionPreview from './QuestionPreview';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const navigate = useNavigate();
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
  const [justStartedSession, setJustStartedSession] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Centralized theme/customization defaults
  const settingsDefaults = {
    backgroundColor: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
    backgroundGradient: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
    imageUrl: '',
    questionContainerBgColor: '#ffffff',
    textColor: '#222222',
    buttonColor: '#2563eb',
    fontSize: 32,
    fontFamily: 'Inter, Arial, sans-serif',
    borderRadius: 32,
    padding: 48,
    margin: 32,
    alignment: 'center',
    optionLayout: 'vertical',
    shadow: true,
    bold: false,
    italic: false,
  };
  function getSettings(obj) {
    return { ...settingsDefaults, ...(obj || {}) };
  }

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (selectedQuizId) {
      fetchQuestions(selectedQuizId);
    }
  }, [selectedQuizId]);

  // --- Timer logic: requestAnimationFrame-based, server-synced ---
  const timerAnimationRef = useRef();
  useEffect(() => {
    if (!session || !currentQuestion || quizPhase !== 'question') {
      setTimeLeft(0);
      setShowCorrect(false);
      return;
    }
    let end;
    if (session.timer_end) {
      end = new Date(session.timer_end);
    } else {
      end = new Date();
      end.setSeconds(end.getSeconds() + (currentQuestion.timer || 20));
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
  }, [session, currentQuestion, quizPhase]);

  useEffect(() => {
    if (selectedQuizId) {
      fetchQuestions(selectedQuizId);
    }
  }, [selectedQuizId]);

  // Fetch and subscribe to participants for the current session
  useEffect(() => {
    if (!session?.id) return;

    // Fetch participants immediately when session.id is available
    fetchParticipants(session.id);

    // Subscribe to real-time changes for participants in this session
    const channel = supabase
      .channel('participants-' + session.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lq_session_participants', filter: `session_id=eq.${session.id}` },
        (payload) => {
          console.log('Real-time participant event:', payload);
          fetchParticipants(session.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Clear participants when session ends or is unset
  useEffect(() => {
    if (!session?.id) {
      setParticipants([]);
    }
  }, [session?.id]);

  // Always fetch latest participants after each question ends
  useEffect(() => {
    if (showCorrect && session?.id) {
      fetchParticipants(session.id);
    }
  }, [showCorrect, session?.id]);

  // Fetch poll results after timer ends
  useEffect(() => {
    async function fetchPollResults() {
      if (!showCorrect || !session?.id || !currentQuestion?.id) {
        setPollResults([]);
        return;
      }
      const { data, error } = await supabase
        .from('lq_live_responses')
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
        .from('lq_live_responses')
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

  async function fetchQuestions(quizId) {
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
  }

  async function fetchQuizzes() {
    try {
      const { data, error } = await supabase.from('lq_quizzes').select('*');
      if (error) throw error;
      setQuizzes(data || []);
      if (data && data.length > 0 && !selectedQuizId) {
        setSelectedQuizId(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchParticipants(sessionId) {
    if (!sessionId) return;
    const { data, error } = await supabase
      .from('lq_session_participants')
      .select('*')
      .eq('session_id', sessionId);
    if (error) {
      console.error('Error fetching participants:', error);
      return;
    }
    console.log('Fetched participants:', data);
    setParticipants(data || []);
  }

  async function startQuiz() {
    if (!selectedQuizId) {
      setError('Please select a quiz.');
      return;
    }
    try {
      const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data, error } = await supabase
        .from('lq_sessions')
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
      setJustStartedSession(true);
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
        .from('lq_sessions')
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
    // Show leaderboard after results, before moving to next question
    setShowLeaderboard(true);
    // Wait for admin to click 'Next' on leaderboard before advancing
  }

  // Handler for 'Next' button on leaderboard
  async function handleLeaderboardNext() {
    if (currentQuestionIndex >= questions.length - 1) {
      // Show podium leaderboard after last question
      setShowPodium(true);
      return;
    }
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setCurrentQuestion(questions[nextIndex]);
    // Update lq_sessions with new current_question_id and phase
    if (session?.id && questions[nextIndex]?.id) {
      await supabase
        .from('lq_sessions')
        .update({
          current_question_id: questions[nextIndex].id,
          phase: 'question',
        })
        .eq('id', session.id);
    }
    setQuizPhase('question');
    setShowLeaderboard(false);
  }

  async function endQuiz() {
    if (!session?.id) return;

    try {
      await supabase
        .from('lq_sessions')
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

  // Remove a participant and broadcast removal event
  async function removeParticipant(participantId) {
    try {
      // 1. Broadcast removal event to the participant (await subscription)
      const removalChannel = supabase.channel('removal_' + participantId);
      await removalChannel.subscribe();
      await removalChannel.send({
        type: 'broadcast',
        event: 'you_were_removed',
        payload: { removed: true }
      });
      console.log('[AdminPage] Sent removal event to', participantId);
      // 2. Remove participant from DB
      await supabase
        .from('lq_session_participants')
        .delete()
        .eq('id', participantId);
      // 3. Remove the channel after use
      supabase.removeChannel(removalChannel);
      // 4. Optimistically update UI before refetch
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      // 5. Refetch participants immediately for UI responsiveness
      await fetchParticipants(session.id);
    } catch (err) {
      setError(err.message);
    }
  }

  // Podium state
  const [showPodium, setShowPodium] = useState(false);

  // Podium leaderboard rendering
  const renderPodium = () => {
    // Get top 3 participants by score
    const sorted = participants
      .map(p => ({ ...p, score: participantScores[p.id] || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    // Pad to always have 3 slots
    while (sorted.length < 3) sorted.push(null);
    // Podium heights for 1st, 2nd, 3rd
    const heights = [120, 80, 60];
    const places = ['1st', '2nd', '3rd'];
    const colors = ['bg-yellow-300', 'bg-gray-300', 'bg-amber-400'];
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-12 animate-fade-in border border-gray-200 flex flex-col items-center">
          <h3 className="text-4xl font-extrabold text-gray-800 mb-10 text-center tracking-wide drop-shadow">🏆 Podium</h3>
          <div className="flex flex-row items-end justify-center gap-8 w-full mb-8">
            {/* 2nd place */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-24 h-[${heights[1]}px] rounded-t-xl ${colors[1]} flex flex-col items-center justify-end shadow-md`} style={{height:heights[1], minHeight:heights[1]}}>
                <span className="text-2xl font-bold text-gray-700 mt-2">{places[1]}</span>
                <span className="text-lg font-medium text-gray-700 mb-2">{sorted[1]?.username || '—'}</span>
                <span className="text-lg font-semibold text-gray-600 mb-4">{sorted[1]?.score ?? '—'}</span>
              </div>
            </div>
            {/* 1st place */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-28 h-[${heights[0]}px] rounded-t-xl ${colors[0]} flex flex-col items-center justify-end shadow-lg border-4 border-yellow-400`} style={{height:heights[0], minHeight:heights[0]}}>
                <span className="text-3xl font-extrabold text-yellow-700 mt-2">{places[0]}</span>
                <span className="text-xl font-bold text-gray-800 mb-2">{sorted[0]?.username || '—'}</span>
                <span className="text-xl font-bold text-gray-700 mb-4">{sorted[0]?.score ?? '—'}</span>
              </div>
            </div>
            {/* 3rd place */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-24 h-[${heights[2]}px] rounded-t-xl ${colors[2]} flex flex-col items-center justify-end shadow-md`} style={{height:heights[2], minHeight:heights[2]}}>
                <span className="text-2xl font-bold text-gray-700 mt-2">{places[2]}</span>
                <span className="text-lg font-medium text-gray-700 mb-2">{sorted[2]?.username || '—'}</span>
                <span className="text-lg font-semibold text-gray-600 mb-4">{sorted[2]?.score ?? '—'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowPodium(false)}
            className="mt-8 px-8 py-3 bg-gray-700 text-white rounded-xl font-bold text-xl shadow hover:bg-gray-800 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

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
      {/* Back to Dashboard Button */}
      {!presentationMode && (
        <div className="fixed top-4 left-4 z-40">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-white text-blue-700 border border-blue-700 rounded-lg font-semibold shadow hover:bg-blue-50 transition-all text-base"
            title="Back to Dashboard"
          >
            ← Back to Dashboard
          </button>
        </div>
      )}
      {/* Enter Presentation Mode Button */}
      {!presentationMode && (
        <div className="fixed top-4 right-4 z-40">
          <button
            onClick={() => setPresentationMode(true)}
            className="px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold shadow hover:bg-blue-900 transition-all text-base border border-blue-900"
            title="Enter Presentation Mode (Fullscreen)"
          >
            Enter Presentation Mode
          </button>
        </div>
      )}
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
        {/* Removed redundant Quiz Admin and Exit Presentation Mode from leaderboard area */}
        {/* Quiz Start Flow: After creating session, show code, participant list, and Start Quiz button */}
        {waitingToStart && session && !presentationMode ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
            <div className="w-full max-w-lg mx-auto bg-white/80 rounded-xl shadow-lg p-6 animate-fade-in relative">
              <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">Quiz Lobby</h2>
              <div className="mb-4 text-center">
                <span className="text-lg font-semibold text-gray-800">Quiz Code: <span className="text-blue-700 text-2xl font-bold">{session.code}</span></span>
              </div>
              {/* QR Code for user response page, inside lobby details */}
              <div className="flex flex-col items-center mb-4 group" title="Click to enlarge QR code">
                <span className="font-semibold text-gray-700 mb-2">Join as Participant:</span>
                <QRCodeSVG
                  value={`${window.location.origin}/quiz/user?code=${session.code}`}
                  size={120}
                  level="H"
                  includeMargin={true}
                  className="transition-transform group-hover:scale-105 cursor-pointer"
                  onClick={() => setQrModalOpen(true)}
                />
                <button
                  type="button"
                  className="mt-2 text-xs text-blue-600 underline break-all hover:text-blue-800 focus:outline-none"
                  onClick={() => handleCopyLink(`${window.location.origin}/quiz/user?code=${session.code}`)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  {`${window.location.origin}/quiz/user?code=${session.code}`}
                </button>
                {copied && (
                  <span className="text-green-600 text-xs font-semibold mt-1 animate-fade-in">Copied!</span>
                )}
                <span className="text-xs text-blue-500 mt-1">Click QR to enlarge, link to copy</span>
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
              <div className="flex justify-center">
                <button
                  onClick={handleStartQuiz}
                  className="px-8 py-3 bg-green-600 text-white rounded-2xl font-bold text-xl shadow-lg hover:bg-green-700 transition-all"
                  style={{ minWidth: '120px' }}
                >
                  Start Quiz
                </button>
              </div>
              {/* QR Code Modal Overlay */}
              {qrModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setQrModalOpen(false)}>
                  <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center relative" onClick={e => e.stopPropagation()}>
                    <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl font-bold" onClick={() => setQrModalOpen(false)} aria-label="Close QR code modal">&times;</button>
                    <QRCodeSVG
                      value={`${window.location.origin}/quiz/user?code=${session.code}`}
                      size={320}
                      level="H"
                      includeMargin={true}
                    />
                    <span className="mt-4 text-base text-gray-700 font-semibold text-center">Scan to join as participant</span>
                    <button
                      type="button"
                      className="mt-2 text-xs text-blue-600 underline break-all hover:text-blue-800 focus:outline-none"
                      onClick={() => handleCopyLink(`${window.location.origin}/quiz/user?code=${session.code}`)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      {`${window.location.origin}/quiz/user?code=${session.code}`}
                    </button>
                    {copied && (
                      <span className="text-green-600 text-xs font-semibold mt-1 animate-fade-in">Copied!</span>
                    )}
                  </div>
                </div>
              )}
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
            {showPodium ? renderPodium() : showLeaderboard ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
                <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-12 animate-fade-in border border-gray-200">
                  <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center tracking-wide">Leaderboard</h3>
                  <ol className="space-y-3 mb-8">
                    {(() => {
                      const sorted = participants
                        .map(p => ({ ...p, score: participantScores[p.id] || 0 }))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 5);
                      const rows = [];
                      for (let i = 0; i < 5; i++) {
                        const p = sorted[i];
                        rows.push(
                          <li key={p ? p.id : `empty-${i}`}
                            className={`flex items-center justify-between px-8 py-5 rounded-xl border transition-all ${p ? 'bg-gray-50 border-gray-300' : 'bg-gray-100 border-gray-200'}`}
                            style={{ minHeight: 64 }}
                          >
                            <span className="text-2xl font-bold w-10 text-center text-gray-500">{i + 1}</span>
                            <span className={`flex-1 text-xl font-medium ml-6 ${p ? 'text-gray-800' : 'text-gray-400 italic'}`}>{p ? (p.username || 'Anonymous') : '—'}</span>
                            <span className={`text-xl font-semibold w-20 text-right ${p ? 'text-gray-700' : 'text-gray-300'}`}>{p ? p.score : '—'}</span>
                          </li>
                        );
                      }
                      return rows;
                    })()}
                  </ol>
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={handleLeaderboardNext}
                      className="px-8 py-3 bg-gray-700 text-white rounded-xl font-bold text-xl shadow hover:bg-gray-800 transition-all"
                      style={{ minWidth: '160px' }}
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
                // Leaderboard and podium data
                const leaderboardData = participants
                  .map(p => ({ ...p, score: participantScores[p.id] || 0 }))
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5);
                const podiumData = leaderboardData.slice(0, 3);
                return (
                  <div
                    className="fixed inset-0 w-screen h-screen flex flex-col items-stretch justify-stretch bg-gradient-to-br from-blue-50 to-purple-100"
                    style={{
                      background: pageBg,
                      backgroundSize: settings.imageUrl ? 'cover' : undefined,
                      backgroundPosition: settings.imageUrl ? 'center' : undefined,
                      padding: 0,
                      margin: 0,
                      minHeight: '100vh',
                      minWidth: '100vw',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Edge-to-edge, fullscreen presentation with top bar and all states */}
                    {showPodium ? (
                      <QuestionPreview
                        showTopBar={true}
                        quizCode={session?.code || ''}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={questions.length}
                        onExit={() => setPresentationMode(false)}
                        showPodium={true}
                        podium={podiumData}
                        customizations={settings}
                      />
                    ) : showLeaderboard ? (
                      <QuestionPreview
                        showTopBar={true}
                        quizCode={session?.code || ''}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={questions.length}
                        onExit={() => setPresentationMode(false)}
                        showLeaderboard={true}
                        leaderboard={leaderboardData}
                        customizations={settings}
                      />
                    ) : quizPhase === 'question' && timeLeft === 0 ? (
                      <QuestionPreview
                        showTopBar={true}
                        quizCode={session?.code || ''}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={questions.length}
                        onExit={() => setPresentationMode(false)}
                        showResults={true}
                        pollResults={pollResults}
                        question={currentQuestion}
                        customizations={settings}
                      />
                    ) : quizPhase === 'question' && timeLeft > 0 ? (
                      <QuestionPreview
                        question={currentQuestion}
                        customizations={settings}
                        showTimer={true}
                        timeLeft={timeLeft}
                        showCorrect={showCorrect}
                        showTopBar={true}
                        quizCode={session?.code || ''}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={questions.length}
                        onExit={() => setPresentationMode(false)}
                      />
                    ) : null}
                    {/* Next Button - bottom right, floating */}
                    {quizPhase === 'question' && (
                      <div className="fixed bottom-10 right-16 z-50">
                        <button
                          onClick={nextQuestion}
                          className="flex items-center gap-2 px-10 py-5 bg-green-600 text-white rounded-2xl font-bold text-2xl shadow-xl hover:bg-green-700 transition-all border-2 border-green-700"
                          style={{ minWidth: '200px', fontWeight: 700 }}
                        >
                          Next <span className="ml-2 text-3xl">➡</span>
                        </button>
                      </div>
                    )}
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
                        <span
                          style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            textAlign: 'center',
                            fontSize: 'clamp(16px, 2vw, 24px)',
                            lineHeight: 1.18,
                            width: '100%',
                            maxWidth: '100%',
                            whiteSpace: 'pre-line',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {option}
                        </span>
                        {showCorrect && index === currentQuestion.correct_answer_index && <span className="ml-2 text-green-600 font-bold">✓</span>}
                      </li>
                    ))}
                  </ul>
                  {quizPhase === 'question' && timeLeft > 0 && (
                    <div className="mt-4 text-xl font-bold text-purple-700 bg-white/80 px-4 py-1 rounded-full shadow w-fit">
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
                          const isCorrect = idx === currentQuestion.correct_answer_index;
                          return (
                            <div key={idx} className={`flex items-center justify-center rounded-2xl border-4 shadow-lg text-3xl font-semibold ${isCorrect ? 'bg-green-100 border-green-500' : 'bg-gray-100 border-gray-300'}`}
                              style={{ width: '44vw', maxWidth: '700px', minWidth: '320px', height: '200px', minHeight: '200px', maxHeight: '200px', margin: '0 0.7vw', padding: '8px 18px', overflow: 'hidden' }}
                            >
                                <span className="flex-1 text-center" style={{
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                  textAlign: 'center',
                                  width: '100%',
                                  maxWidth: '100%',
                                  whiteSpace: 'pre-line',
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  lineHeight: 1.18,
                                  fontSize: (() => {
                                    const text = (option || '').toString();
                                    const lines = text.split(/\r?\n| /).reduce((acc, word) => {
                                      if (!acc.length) return [word];
                                      const last = acc[acc.length - 1];
                                      if ((last + ' ' + word).length > 32) acc.push(word);
                                      else acc[acc.length - 1] = last + ' ' + word;
                                      return acc;
                                    }, []);
                                    if (lines.length <= 1) return '2.2rem';
                                    if (lines.length === 2) return '1.7rem';
                                    if (lines.length === 3) return '1.2rem';
                                    return '1rem';
                                  })(),
                                }}>{option}</span>
                              {isCorrect && <span className="ml-2 text-green-600 font-bold">✓</span>}
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