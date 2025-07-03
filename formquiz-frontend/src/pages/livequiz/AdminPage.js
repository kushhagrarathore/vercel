import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useQuiz } from './QuizContext';

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

  useEffect(() => {
    fetchQuestions();
    fetchQuizzes();
    setupRealtimeSubscriptions();
  }, []);

  async function fetchQuestions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
      if (data && data.length > 0) {
        setCurrentQuestion(data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuizzes() {
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
  }

  function setupRealtimeSubscriptions() {
    // Subscribe to participants changes
    const participantsChannel = supabase
      .channel('participants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants' },
        (payload) => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
    };
  }

  async function fetchParticipants() {
    if (!session?.id) return;
    
    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', session.id);

    if (error) {
      console.error('Error fetching participants:', error);
      return;
    }

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
    } catch (err) {
      setError(err.message);
    }
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

      await fetchParticipants();
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
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Quiz Admin</h1>

      {!session ? (
        <div>
          <label className="block mb-2 font-semibold">Select Quiz</label>
          <select
            value={selectedQuizId}
            onChange={e => setSelectedQuizId(e.target.value)}
            className="mb-4 p-2 border rounded w-full"
          >
            {quizzes.length === 0 && <option value="">No quizzes available</option>}
            {quizzes.map(quiz => (
              <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
            ))}
          </select>
          <button
            onClick={startQuiz}
            disabled={!selectedQuizId}
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Start New Quiz Session
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-bold">Session Code: {session.code}</h2>
            <p>Status: {quizPhase}</p>
            <p>Question: {currentQuestionIndex + 1} / {questions.length}</p>
          </div>

          <div className="bg-white p-4 rounded border">
            <h3 className="font-bold mb-2">Current Question</h3>
            {currentQuestion && (
              <div>
                <p>{currentQuestion.question_text}</p>
                <ul className="ml-4 mt-2">
                  {currentQuestion.options.map((option, index) => (
                    <li
                      key={index}
                      className={index === currentQuestion.correct_answer_index ? 'text-green-600' : ''}
                    >
                      {option}
                      {index === currentQuestion.correct_answer_index && ' ✓'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-x-2">
            {quizPhase === 'waiting' && (
              <button
                onClick={startQuestion}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Start Question
              </button>
            )}
            {quizPhase === 'question' && (
              <button
                onClick={nextQuestion}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Next Question
              </button>
            )}
            <button
              onClick={endQuiz}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              End Quiz
            </button>
          </div>

          <div>
            <h3 className="font-bold mb-2">Participants ({participants.length})</h3>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <span>{participant.username}</span>
                  <span>Score: {participant.score}</span>
                  <button
                    onClick={() => removeParticipant(participant.id)}
                    className="px-2 py-1 text-red-500 hover:bg-red-100 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add visible Quiz Page link for copying and opening in new tab */}
          {selectedQuizId && (
            <div className="mb-4">
              <span style={{ fontWeight: 600 }}>Quiz Page Link: </span>
              <a
                href={`/quiz/${selectedQuizId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}
              >
                {window.location.origin + `/quiz/${selectedQuizId}`}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 