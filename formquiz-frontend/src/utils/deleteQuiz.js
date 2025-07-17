import { supabase } from '../supabase/client'; // Adjust path if needed

export async function deleteLiveQuizCascade(quizId) {
  try {
    // Get questions linked to quiz
    const { data: questions, error: qErr } = await supabase
      .from('lq_questions')
      .select('id')
      .eq('quiz_id', quizId);
    if (qErr) throw new Error('Failed to fetch questions: ' + qErr.message);

    const questionIds = questions.map(q => q.id);

    // Get sessions linked to quiz
    const { data: sessions, error: sErr } = await supabase
      .from('lq_sessions')
      .select('id')
      .eq('quiz_id', quizId);
    if (sErr) throw new Error('Failed to fetch sessions: ' + sErr.message);

    const sessionIds = sessions.map(s => s.id);

    // Delete live responses by question
    if (questionIds.length > 0) {
      const { error: lrqErr } = await supabase
        .from('lq_live_responses')
        .delete()
        .in('question_id', questionIds);
      if (lrqErr) throw new Error('Failed to delete live responses by question: ' + lrqErr.message);
    }

    // Delete live responses by session
    if (sessionIds.length > 0) {
      const { error: lrsErr } = await supabase
        .from('lq_live_responses')
        .delete()
        .in('session_id', sessionIds);
      if (lrsErr) throw new Error('Failed to delete live responses by session: ' + lrsErr.message);
    }

    // Delete session participants
    if (sessionIds.length > 0) {
      const { error: spErr } = await supabase
        .from('lq_session_participants')
        .delete()
        .in('session_id', sessionIds);
      if (spErr) throw new Error('Failed to delete session participants: ' + spErr.message);
    }

    // Delete sessions
    if (sessionIds.length > 0) {
      const { error: sDelErr } = await supabase
        .from('lq_sessions')
        .delete()
        .in('id', sessionIds);
      if (sDelErr) throw new Error('Failed to delete sessions: ' + sDelErr.message);
    }

    // Delete questions
    if (questionIds.length > 0) {
      const { error: qDelErr } = await supabase
        .from('lq_questions')
        .delete()
        .in('id', questionIds);
      if (qDelErr) throw new Error('Failed to delete questions: ' + qDelErr.message);
    }

    // Delete quiz
    const { error: quizDelErr } = await supabase
      .from('lq_quizzes')
      .delete()
      .eq('id', quizId);
    if (quizDelErr) throw new Error('Failed to delete quiz: ' + quizDelErr.message);

    return { success: true };
  } catch (error) {
    console.error('Error deleting quiz cascade:', error.message || error);
    return { success: false, error: error.message || error };
  }
} 