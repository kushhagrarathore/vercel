import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase.js';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import QuestionPreview from './QuestionPreview';
import ResultsPoll from '../../components/livequiz/ResultsPoll';
import FinalPodium from '../../components/livequiz/FinalPodium';

export default function AdminPage() {
  const navigate = useNavigate();
  const { quizId } = useParams();

  // Local state for this component
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantScores, setParticipantScores] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pollResults, setPollResults] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // --- Data Fetching and Subscriptions ---

  // Memoize fetch functions to prevent unnecessary re-renders in useEffect
  const fetchQuizAndQuestions = useCallback(async () => {
    setLoading(true);
    const { data: quizData, error: quizError } = await supabase.from('lq_quizzes').select('*').eq('id', quizId).single();
    if (quizError || !quizData) {
      setError('Quiz not found.');
      setLoading(false);
      return;
    }
    setQuiz(quizData);

    const { data: questionsData, error: qError } = await supabase.from('lq_questions').select('*').eq('quiz_id', quizId).order('created_at', { ascending: true });
    if (qError || !questionsData || questionsData.length === 0) {
      setError('No questions found for this quiz.');
      setQuestions([]);
      setLoading(false);
      return;
    }
    setQuestions(questionsData);
    setLoading(false);
  }, [quizId]);

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

  // --- Server Time Sync ---
  const syncServerTime = useCallback(async () => {
    try {
      const start = Date.now();
      const { data, error } = await supabase.rpc('get_server_time');
      if (!error && data) {
        const end = Date.now();
        const roundTrip = end - start;
        const serverTime = new Date(data).getTime();
        const estimatedServerTime = serverTime + (roundTrip / 2);
        const offset = estimatedServerTime - end;
        setServerTimeOffset(offset);
        console.log('Server time synced, offset:', offset, 'ms');
      }
    } catch (err) {
      console.warn('Could not sync server time:', err);
    }
  }, []);

  // Get synchronized time
  const getSyncedTime = useCallback(() => {
    return Date.now() + serverTimeOffset;
  }, [serverTimeOffset]);

  useEffect(() => {
    fetchQuizAndQuestions();
    syncServerTime(); // Sync server time on mount
  }, [fetchQuizAndQuestions, syncServerTime]);

  useEffect(() => {
    if (!session?.id) return;

    fetchParticipants(session.id); // Initial fetch

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

  // --- Improved Timer Logic with Server Sync ---
  useEffect(() => {
    if (!session?.timer_end || session.phase !== 'question') {
      setTimeLeft(0);
      return;
    }

    const timerEndDate = new Date(session.timer_end);
    const interval = setInterval(() => {
      const syncedNow = getSyncedTime();
      const secondsLeft = Math.max(0, Math.floor((timerEndDate.getTime() - syncedNow) / 1000));
      setTimeLeft(secondsLeft);
      
      // Auto-advance to results when timer hits 0
      if (secondsLeft === 0 && session.phase === 'question') {
        handlePresentationNext();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, getSyncedTime]);

  // --- Poll Results Fetching ---
  useEffect(() => {
    if (session?.phase === 'results' && session.current_question_id) {
      fetchPollResults(session.id, session.current_question_id);
    }
  }, [session?.phase, session?.current_question_id, fetchPollResults]);

  // --- Core State Machine Logic ---

  async function startSession() {
    if (!quizId || questions.length === 0) return;
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error: insertError } = await supabase
      .from('lq_sessions')
      .insert({
        code: sessionCode,
        quiz_id: quizId,
        phase: 'lobby',
        is_live: true,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSession(data);
  }

  async function handlePresentationNext() {
    if (!session?.id) return;

    let nextPhase = '';
    let updatePayload = {};

    switch (session.phase) {
      case 'lobby':
        // Start the quiz with the first question
        nextPhase = 'question';
        setCurrentQuestionIndex(0);
        const firstQuestion = questions[0];
        const syncedNow = getSyncedTime();
        updatePayload = {
          phase: nextPhase,
          current_question_id: firstQuestion.id,
          timer_end: new Date(syncedNow + (firstQuestion.timer || 20) * 1000).toISOString(),
        };
        break;

      case 'question':
        // Question time is over, now show results
        nextPhase = 'results';
        updatePayload = { phase: nextPhase };
        break;

      case 'results':
        // After showing results, show the leaderboard
        nextPhase = 'leaderboard';
        updatePayload = { phase: nextPhase };
        break;

      case 'leaderboard':
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex >= questions.length) {
          // End of quiz
          nextPhase = 'ended';
          updatePayload = { phase: nextPhase, is_live: false };
        } else {
          // Go to the next question
          nextPhase = 'question';
          setCurrentQuestionIndex(nextIndex);
          const nextQuestion = questions[nextIndex];
          const syncedNow = getSyncedTime();
          updatePayload = {
            phase: nextPhase,
            current_question_id: nextQuestion.id,
            timer_end: new Date(syncedNow + (nextQuestion.timer || 20) * 1000).toISOString(),
          };
        }
        break;

      default:
        return; // No action for 'ended' or other phases
    }

    console.log('Advancing to phase:', nextPhase, 'from:', session.phase, 'question index:', currentQuestionIndex);

    const { data, error: updateError } = await supabase
      .from('lq_sessions')
      .update(updatePayload)
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
    } else {
      setSession(data); // Update local session state with the new truth from DB
    }
  }

  // --- Dynamic Button Text and State ---
  const getButtonText = () => {
    switch (session?.phase) {
      case 'lobby':
        return 'Start Quiz';
      case 'question':
        return timeLeft > 0 ? `Show Results (${timeLeft}s)` : 'Show Results';
      case 'results':
        return 'Show Leaderboard';
      case 'leaderboard':
        return currentQuestionIndex >= questions.length - 1 ? 'Finish Quiz' : 'Next Question';
      default:
        return 'Next';
    }
  };

  const isButtonDisabled = () => {
    return session?.phase === 'question' && timeLeft > 0;
  };

  // --- UI Rendering ---

  if (loading) return <div className="p-4 text-center">Loading Quiz...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

  // Render different views based on session state and phase
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{quiz?.title}</h2>
          <button onClick={startSession} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition">
            Start New Quiz Session
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md p-4 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold">{quiz?.title}</h1>
          <p className="text-gray-600">Session Code: <span className="font-bold text-blue-600">{session.code}</span></p>
          <p className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="font-semibold">Phase: {session.phase}</span>
          {session.phase === 'question' && timeLeft > 0 && (
            <span className="text-lg font-bold text-red-600">Time: {timeLeft}s</span>
          )}
          <button 
            onClick={handlePresentationNext} 
            disabled={isButtonDisabled()}
            className={`px-6 py-2 rounded-lg font-semibold shadow transition ${
              isButtonDisabled() 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {getButtonText()}
          </button>
        </div>
      </div>

      <div className="mt-24">
        {session.phase === 'lobby' && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-4">Lobby</h2>
            <div className="flex justify-center mb-8">
              <QRCodeSVG value={`${window.location.origin}/quiz/live/${session.code}`} size={256} />
            </div>
            <h3 className="text-xl font-semibold">Participants ({participants.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {participants.map(p => <div key={p.id} className="bg-white p-2 rounded shadow text-center">{p.username}</div>)}
            </div>
          </div>
        )}

        {session.phase === 'question' && currentQuestion && (
          <div>
            <QuestionPreview question={currentQuestion} customizations={getSettings(currentQuestion.settings)} />
          </div>
        )}

        {session.phase === 'results' && currentQuestion && (
          <div>
            <ResultsPoll 
              question={currentQuestion} 
              responses={pollResults} 
              totalParticipants={participants.length} 
            />
          </div>
        )}

        {session.phase === 'leaderboard' && (
           <div className="text-center">
             <h2 className="text-3xl font-bold mb-4">Leaderboard</h2>
              <ol className="space-y-2 max-w-md mx-auto">
                {participants
                  .map(p => ({ ...p, score: participantScores[p.id] || 0 }))
                  .sort((a, b) => b.score - a.score)
                  .map((p, i) => (
                    <li key={p.id} className="flex justify-between p-3 bg-white rounded shadow">
                      <span>{i + 1}. {p.username}</span>
                      <span className="font-bold">{p.score} pts</span>
                    </li>
                  ))}
              </ol>
           </div>
        )}

        {session.phase === 'ended' && (
          <div>
            <FinalPodium participants={participants} scores={participantScores} />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for settings
function getSettings(obj) {
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
  return { ...settingsDefaults, ...(obj || {}) };
} 