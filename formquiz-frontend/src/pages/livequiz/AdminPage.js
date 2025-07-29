import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase.js';
import { useQuiz } from '../../pages/livequiz/QuizContext';
import { QRCodeSVG } from 'qrcode.react';
import QuestionPreview from './QuestionPreview';
import { useNavigate, useParams } from 'react-router-dom';
// Remove Confetti import
// import Confetti from 'react-confetti';

function useWindowSizeSimple() {
  const isClient = typeof window !== 'undefined';
  const [size, setSize] = React.useState([
    isClient ? window.innerWidth : 0,
    isClient ? window.innerHeight : 0
  ]);
  React.useEffect(() => {
    if (!isClient) return;
    const handleResize = () => setSize([window.innerWidth, window.innerHeight]);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);
  return size;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();
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

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // Fetch quiz and questions on mount
  useEffect(() => {
    async function fetchQuizAndQuestions() {
      setLoading(true);
      setError(null);
      if (!quizId) {
        setError('No quiz ID provided in URL.');
        setLoading(false);
        return;
      }
      // Only fetch from lq_quizzes
      const { data: quizData, error: quizError } = await supabase.from('lq_quizzes').select('*').eq('id', quizId).single();
      if (quizError || !quizData) {
        setError('Quiz not found.');
        setLoading(false);
        return;
      }
      setQuiz(quizData);
      // Only fetch from lq_questions
      const { data: questionsData, error: qError } = await supabase
        .from('lq_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });
      if (qError || !questionsData || questionsData.length === 0) {
        setError('No questions found for this quiz.');
        setLoading(false);
        return;
      }
      setQuestions(questionsData);
      setCurrentQuestion(questionsData[0]);
      setCurrentQuestionIndex(0);
      setLoading(false);
    }
    fetchQuizAndQuestions();
    // eslint-disable-next-line
  }, [quizId]);

  useEffect(() => {
    if (!session || !currentQuestion || quizPhase !== 'question') {
      setTimeLeft(0);
      setShowCorrect(false); // Always reset when not in question phase
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
    setShowCorrect(false); // Reset at the start of each question
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
    if (quizId) {
      // This useEffect is now redundant as quizId is in URL
      // Keeping it for now, but it will be removed if not used elsewhere
    }
  }, [quizId]);

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
        () => {
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
    setParticipants(data || []);
  }

  async function startQuiz() {
    if (!quizId || !questions.length) {
      setError('Quiz or questions not loaded.');
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
            quiz_id: quizId,
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
      if (!showPodium) setShowPodium(true); // Only set if not already true
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
  const [width, height] = useWindowSizeSimple();

  const podiumGradients = [
    'bg-gradient-to-t from-yellow-400 via-yellow-200 to-white', // 1st
    'bg-gradient-to-t from-gray-400 via-gray-200 to-white',     // 2nd
    'bg-gradient-to-t from-amber-500 via-amber-200 to-white',   // 3rd
  ];
  const podiumShadows = [
    'shadow-[0_8px_32px_rgba(255,215,0,0.25)]',
    'shadow-[0_8px_32px_rgba(160,160,160,0.18)]',
    'shadow-[0_8px_32px_rgba(255,191,0,0.18)]',
  ];
  const medalEmojis = ['🥇', '🥈', '🥉'];
  const defaultAvatar = '/logo192.png'; // fallback avatar

  const AnimatedPodiumBar = ({ height, delay, children, ...props }) => (
    <div
      style={{
        height: 0,
        animation: `riseBar 1s ${delay}s forwards`,
        ...props.style,
      }}
      className={props.className}
    >
      <div style={{height: height}} className="flex flex-col items-center justify-end w-full h-full">{children}</div>
      <style>{`
        @keyframes riseBar {
          to { height: ${height}; }
        }
      `}</style>
    </div>
  );

  const renderPodium = () => {
    // Get top 3 participants by score
    const sorted = participants
      .map(p => ({ ...p, score: participantScores[p.id] || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    while (sorted.length < 3) sorted.push(null);
    const heights = ['32vh', '22vh', '16vh']; // slightly reduced for better balance
    const places = ['1st', '2nd', '3rd'];
    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full min-h-screen min-w-screen bg-white/90 p-0 m-0 overflow-hidden" style={{position:'absolute',top:0,left:0}}>
        <h3 className="text-[6vw] sm:text-5xl font-extrabold text-gray-800 mb-8 text-center tracking-wide drop-shadow animate-fade-in">🏆 Podium</h3>
        <div className="flex flex-row items-end justify-center gap-[4vw] w-full mb-8" style={{height:'38vh', alignItems:'flex-end'}}>
          {/* 2nd place */}
          <div className="flex flex-col items-center flex-1 justify-end">
            <div className={`w-[16vw] min-w-[80px] rounded-t-xl ${podiumGradients[1]} ${podiumShadows[1]} flex flex-col items-center justify-end relative transition-all duration-300`} style={{height:heights[1], minHeight:'120px'}}>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[2.5vw] animate-fade-in" style={{animationDelay:'0.7s'}}>{medalEmojis[1]}</span>
              <span className="text-[1.7vw] font-medium text-gray-700 mb-2 truncate max-w-[90%] text-center animate-fade-in" style={{animationDelay:'0.8s'}}>{sorted[1]?.username || '—'}</span>
              <span className="text-[1.7vw] font-semibold text-gray-600 mb-4 animate-fade-in" style={{animationDelay:'0.9s'}}>{sorted[1]?.score ?? '—'}</span>
            </div>
          </div>
          {/* 1st place */}
          <div className="flex flex-col items-center flex-1 justify-end">
            <div className={`w-[20vw] min-w-[100px] rounded-t-xl ${podiumGradients[0]} ${podiumShadows[0]} flex flex-col items-center justify-end border-4 border-yellow-400 relative transition-all duration-300`} style={{height:heights[0], minHeight:'150px'}}>
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-[3vw] animate-fade-in" style={{animationDelay:'0.5s'}}>{medalEmojis[0]}</span>
              <span className="text-[2vw] font-bold text-gray-800 mb-2 truncate max-w-[90%] text-center animate-fade-in" style={{animationDelay:'0.7s'}}>{sorted[0]?.username || '—'}</span>
              <span className="text-[2vw] font-bold text-gray-700 mb-4 animate-fade-in" style={{animationDelay:'0.8s'}}>{sorted[0]?.score ?? '—'}</span>
            </div>
          </div>
          {/* 3rd place */}
          <div className="flex flex-col items-center flex-1 justify-end">
            <div className={`w-[16vw] min-w-[80px] rounded-t-xl ${podiumGradients[2]} ${podiumShadows[2]} flex flex-col items-center justify-end relative transition-all duration-300`} style={{height:heights[2], minHeight:'100px'}}>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[2.5vw] animate-fade-in" style={{animationDelay:'0.9s'}}>{medalEmojis[2]}</span>
              <span className="text-[1.7vw] font-medium text-gray-700 mb-2 truncate max-w-[90%] text-center animate-fade-in" style={{animationDelay:'1.1s'}}>{sorted[2]?.username || '—'}</span>
              <span className="text-[1.7vw] font-semibold text-gray-600 mb-4 animate-fade-in" style={{animationDelay:'1.2s'}}>{sorted[2]?.score ?? '—'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 mt-8">
          <button
            onClick={() => setShowPodium(false)}
            className="px-12 py-5 bg-gray-700 text-white rounded-xl font-bold text-[2vw] shadow hover:bg-gray-800 transition-all"
            style={{minWidth:'200px'}}>
            Close
          </button>
          <button
            onClick={() => navigate(`/admin/${quizId}/summary`)}
            className="px-12 py-5 bg-blue-600 text-white rounded-xl font-bold text-[2vw] shadow hover:bg-blue-800 transition-all"
            style={{minWidth:'200px'}}>
            View Full Summary
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

  // Define a constant for the top bar height
  const TOP_BAR_HEIGHT = '4.5rem';
  function handlePresentationNext() {
    if (quizPhase === 'question' || quizPhase === 'answer_poll') {
      setQuizPhase('leaderboard');
      setShowLeaderboard(true);
      return;
    }
    if (quizPhase === 'leaderboard' || showLeaderboard) {
      if (currentQuestionIndex >= questions.length - 1) {
        setShowLeaderboard(false);
        setShowPodium(true);
        setQuizPhase('podium');
        return;
      }
      // Advance to next question
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      if (session?.id && questions[nextIndex]?.id) {
        const timerEnd = new Date();
        timerEnd.setSeconds(timerEnd.getSeconds() + (questions[nextIndex].timer || 20));
        supabase
          .from('lq_sessions')
          .update({
            current_question_id: questions[nextIndex].id,
            phase: 'question',
            timer_end: timerEnd.toISOString(),
          })
          .eq('id', session.id);
      }
      setQuizPhase('question');
      setShowLeaderboard(false);
      return;
    }
  }

  if (presentationMode && (quizPhase === 'lobby' || waitingToStart)) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-white via-blue-50 to-purple-100 flex flex-col">
        {/* Top Bar: Quiz Code, Start Quiz, Presentation Mode toggle/cross */}
        <div className="fixed top-0 left-0 w-full z-50 bg-white/90 shadow-md flex items-center justify-between px-8 py-3 gap-4"
          style={{ minHeight: TOP_BAR_HEIGHT, height: TOP_BAR_HEIGHT, backdropFilter: 'blur(8px)' }}
        >
          <span className="text-lg md:text-2xl font-bold text-blue-700 tracking-wider">Quiz Code: <span className="text-gray-800">{session?.code}</span></span>
          <div className="flex items-center gap-4">
            <button
              onClick={handleStartQuiz}
              className="bg-green-600 text-white px-6 py-2 rounded-full text-xl font-bold shadow hover:bg-green-700 transition-all"
              style={{ minWidth: '180px' }}
            >
              Start Quiz
            </button>
            {/* Presentation Mode cross/exit */}
            <button
              onClick={() => setPresentationMode(false)}
              className="p-2 bg-gray-700 text-white rounded-lg font-semibold shadow hover:bg-gray-900 transition-all border border-gray-900"
              title="Exit Presentation Mode (ESC)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {/* Main Content */}
        <div className="flex flex-col flex-1 items-center justify-start mt-[6.5rem] w-full pb-8">
          {/* Quiz Title */}
          <div className="text-4xl font-bold text-neutral-800 text-center mb-4" style={{ letterSpacing: 0.5 }}>{quiz?.title ? `Quiz: ${quiz.title}` : 'Quiz'}</div>
          {/* Two-Column Layout - full height/width utilization */}
          <div className="flex flex-row flex-1 w-full max-w-7xl gap-12 justify-center items-stretch px-8" style={{ minHeight: 0 }}>
            {/* Left Column: QR Code & Link */}
            <div className="flex flex-col items-center flex-1 justify-center h-full">
              <div className="flex-1 flex flex-col justify-center items-center w-full">
                <QRCodeSVG
                  value={`${window.location.origin}/quiz/user?code=${session?.code}`}
                  size={480}
                  level="H"
                  includeMargin={true}
                  className="mb-6"
                />
              </div>
              <div className="max-w-xs w-full">
                <div
                  className="text-blue-600 underline text-sm text-center break-all cursor-pointer select-all"
                  onClick={() => handleCopyLink(`${window.location.origin}/quiz/user?code=${session?.code}`)}
                >
                  {`${window.location.origin}/quiz/user?code=${session?.code}`}
                  {copied && <span className="ml-2 text-green-600 font-semibold">Copied!</span>}
                </div>
              </div>
            </div>
            {/* Right Column: Participants */}
            <div className="flex flex-col flex-1 justify-center">
              <div className="text-lg font-semibold mb-2 text-center">Participants ({participants.length})</div>
              <div className="bg-white rounded-xl shadow p-4 flex-1 overflow-y-auto min-h-0"
                   style={{ height: '100%' }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(() => {
                    const maxSlots = 12; // 4x3 grid
                    // Newest participant first, old shift right/down
                    const displayParticipants = [...participants];
                    while (displayParticipants.length < maxSlots) displayParticipants.push(null);
                    return displayParticipants.map((participant, idx) =>
                      participant ? (
                        <div key={participant.id} className="bg-gray-50 rounded-lg shadow p-2 text-center font-medium text-gray-700 truncate">
                          {participant.username}
                        </div>
                      ) : (
                        <div key={"empty-"+idx} className="bg-gray-100 rounded-lg p-2 text-center text-gray-300">&nbsp;</div>
                      )
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
            className="p-3 bg-blue-700 text-white rounded-lg font-semibold shadow hover:bg-blue-900 transition-all border border-blue-900"
            title="Enter Presentation Mode (Fullscreen)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      )}
      {/* Fixed Presentation Mode Top Bar */}
      {presentationMode && !(quizPhase === 'lobby' || waitingToStart) && (
        <div className="fixed top-0 left-0 w-full z-50 bg-white/90 shadow-md flex items-center justify-between px-8 py-3 gap-4"
          style={{ minHeight: TOP_BAR_HEIGHT, height: TOP_BAR_HEIGHT, backdropFilter: 'blur(8px)' }}
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
            {(quizPhase === 'leaderboard' || showLeaderboard || quizPhase === 'question') ? (
              <button
                onClick={handlePresentationNext}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold shadow hover:bg-green-700 transition-all text-base"
                title="Next"
              >
                <span>Next</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            ) : null}
            <button
              onClick={() => setPresentationMode(false)}
              className="p-2 bg-gray-700 text-white rounded-lg font-semibold shadow hover:bg-gray-900 transition-all border border-gray-900"
              title="Exit Presentation Mode (ESC)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <div
        className={`w-full ${presentationMode ? 'h-full flex flex-col justify-center items-center' : 'max-w-4xl mx-auto p-2 sm:p-6'}`}
        style={presentationMode ? { maxWidth: '100vw', maxHeight: '100vh', padding: 0, marginTop: TOP_BAR_HEIGHT, minHeight: `calc(100vh - ${TOP_BAR_HEIGHT})`, boxSizing: 'border-box', overflow: 'auto' } : { marginTop: TOP_BAR_HEIGHT }}>
        {/* Quiz Start Flow: After creating session, show code, participant list, and Start Quiz button */}
        {waitingToStart && session && !presentationMode ? (
          <div className="flex flex-col items-center justify-center min-h-screen w-full p-4">
            <div className="w-full max-w-4xl mx-auto bg-white/90 rounded-2xl shadow-2xl p-8 animate-fade-in relative">
              <h2 className="text-4xl font-bold text-blue-700 mb-8 text-center">Quiz Lobby</h2>
              
              {/* Quiz Code Section */}
              <div className="mb-8 text-center">
                <span className="text-2xl font-semibold text-gray-800">Quiz Code: <span className="text-blue-700 text-5xl font-bold tracking-wider">{session.code}</span></span>
              </div>
              
              {/* QR Code Section - Much Larger */}
              <div className="flex flex-col items-center mb-8 group" title="Click to enlarge QR code">
                <span className="font-semibold text-gray-700 mb-4 text-xl">Join as Participant:</span>
                <QRCodeSVG
                  value={`${window.location.origin}/quiz/user?code=${session.code}`}
                  size={280}
                  level="H"
                  includeMargin={true}
                  className="transition-transform group-hover:scale-105 cursor-pointer shadow-lg"
                  onClick={() => setQrModalOpen(true)}
                />
                <button
                  type="button"
                  className="mt-4 text-sm text-blue-600 underline break-all hover:text-blue-800 focus:outline-none"
                  onClick={() => handleCopyLink(`${window.location.origin}/quiz/user?code=${session.code}`)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  {`${window.location.origin}/quiz/user?code=${session.code}`}
                </button>
                {copied && (
                  <span className="text-green-600 text-sm font-semibold mt-2 animate-fade-in">Copied!</span>
                )}
                <span className="text-sm text-blue-500 mt-2">Click QR to enlarge, link to copy</span>
              </div>
              
              {/* Participants Section */}
              <div className="mb-8">
                <h3 className="font-bold mb-4 text-2xl text-gray-800 text-center">Participants ({participants.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                  {participants.length === 0 && <div className="text-gray-500 text-center col-span-full py-8">No participants yet.</div>}
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg shadow-sm border"
                    >
                      <span className="truncate max-w-[12rem] font-medium text-gray-800">{participant.username}</span>
                      <button
                        onClick={() => removeParticipant(participant.id)}
                        className="px-3 py-1 text-red-500 hover:bg-red-100 rounded transition-all text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Start Quiz Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleStartQuiz}
                  className="px-12 py-4 bg-green-600 text-white rounded-2xl font-bold text-2xl shadow-lg hover:bg-green-700 transition-all"
                  style={{ minWidth: '200px' }}
                >
                  Start Quiz
                </button>
              </div>
              {/* QR Code Modal Overlay */}
              {qrModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setQrModalOpen(false)}>
                  <div className="bg-white rounded-3xl shadow-2xl p-12 flex flex-col items-center relative max-w-md mx-4" onClick={e => e.stopPropagation()}>
                    <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-3xl font-bold" onClick={() => setQrModalOpen(false)} aria-label="Close QR code modal">&times;</button>
                    <h3 className="text-2xl font-bold text-blue-700 mb-6 text-center">Join Quiz</h3>
                    <QRCodeSVG
                      value={`${window.location.origin}/quiz/user?code=${session.code}`}
                      size={400}
                      level="H"
                      includeMargin={true}
                      className="shadow-lg"
                    />
                    <span className="mt-6 text-lg text-gray-700 font-semibold text-center">Scan to join as participant</span>
                    <button
                      type="button"
                      className="mt-4 text-sm text-blue-600 underline break-all hover:text-blue-800 focus:outline-none text-center"
                      onClick={() => handleCopyLink(`${window.location.origin}/quiz/user?code=${session.code}`)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      {`${window.location.origin}/quiz/user?code=${session.code}`}
                    </button>
                    {copied && (
                      <span className="text-green-600 text-sm font-semibold mt-2 animate-fade-in">Copied!</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) :
        !session ? (
          loading ? (
            <div className="p-4">Loading...</div>
          ) : error ? (
            <div className="p-4 text-red-500">Error: {error}</div>
          ) : quiz ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
              <div className="w-full max-w-lg mx-auto bg-white/80 rounded-xl shadow-lg p-6 animate-fade-in relative">
                <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">Quiz: {quiz.title}</h2>
                <div className="mb-4 text-center">
                  <span className="text-lg font-semibold text-gray-800">Ready to start this quiz session?</span>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={startQuiz}
                    className="px-8 py-3 bg-blue-500 text-white rounded-2xl font-bold text-xl shadow-lg hover:bg-blue-600 transition-all"
                    style={{ minWidth: '120px' }}
                  >
                    Start New Quiz Session
                  </button>
                </div>
              </div>
            </div>
          ) : null
        ) : (
          <div className="space-y-8" style={{ width: '100%', marginTop: 0, paddingTop: 0 }}>
            {/* Show leaderboard only, hide question/response containers when leaderboard is visible */}
            {showPodium ? (
              <div style={{ paddingTop: TOP_BAR_HEIGHT, minHeight: `calc(100vh - ${TOP_BAR_HEIGHT})`, boxSizing: 'border-box', width: '100vw', overflow: 'auto' }}>
                {renderPodium()}
              </div>
            ) : (quizPhase === 'leaderboard' || showLeaderboard) ? (
              <div
                className="flex flex-col items-center justify-center w-full min-h-screen min-w-screen bg-white/90 p-0 m-0"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  paddingTop: TOP_BAR_HEIGHT,
                  boxSizing: 'border-box',
                  zIndex: 10, // Lower than menu bar
                  pointerEvents: 'auto',
                }}
              >
                {/* Responsive leaderboard container with scroll if needed */}
                <div
                  className="w-full flex flex-col items-center justify-start animate-fade-in"
                  style={{
                    maxWidth: '900px',
                    margin: '0 auto',
                    width: '100%',
                    flex: 1,
                    maxHeight: 'calc(100vh - 8.5rem)', // 4.5rem menu + 4rem for Next btn
                    overflowY: 'auto',
                    paddingBottom: '2rem',
                  }}
                >
                  <h3 className="text-[6vw] sm:text-5xl font-extrabold text-gray-800 mb-6 text-center tracking-wide drop-shadow" style={{marginTop: 0}}>Leaderboard</h3>
                  <ol className="w-full max-w-5xl mx-auto grid grid-rows-5 gap-4 px-2 sm:px-8">
                    {(() => {
                      const sorted = participants
                        .map(p => ({ ...p, score: participantScores[p.id] || 0 }))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 5);
                      while (sorted.length < 5) sorted.push(null);
                      return sorted.map((p, i) => (
                        <li key={p ? p.id : `empty-${i}`}
                          className={`flex items-center justify-between px-4 py-4 sm:px-8 sm:py-8 rounded-2xl border-4 shadow-lg ${p ? 'bg-gray-50 border-gray-300' : 'bg-gray-100 border-gray-200'} text-lg sm:text-2xl font-bold`}
                          style={{minHeight:'3.5rem'}}
                        >
                          <span className="w-8 sm:w-10 text-center text-gray-500">{i + 1}</span>
                          <span className="flex-1 text-center text-gray-800 truncate max-w-[60vw]">{p ? (p.username || 'Anonymous') : '—'}</span>
                          <span className="w-12 sm:w-20 text-right text-gray-700">{p ? p.score : '—'}</span>
                        </li>
                      ));
                    })()}
                  </ol>
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
                          `${showCorrect && timeLeft === 0 && index === currentQuestion.correct_answer_index ? 'text-green-600 font-semibold' : 'text-gray-700'} flex items-center gap-2`
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
                        {showCorrect && timeLeft === 0 && index === currentQuestion.correct_answer_index && <span className="ml-2 text-green-600 font-bold">✓</span>}
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