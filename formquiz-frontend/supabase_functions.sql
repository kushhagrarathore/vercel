-- Server time function for timer synchronization
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS TIMESTAMPTZ
LANGUAGE SQL
AS $$
  SELECT NOW();
$$;

-- Function to get current session state
CREATE OR REPLACE FUNCTION get_session_state(session_id UUID)
RETURNS TABLE(
  id UUID,
  code TEXT,
  quiz_id UUID,
  phase TEXT,
  current_question_id UUID,
  timer_end TIMESTAMPTZ,
  is_live BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
AS $$
  SELECT 
    id,
    code,
    quiz_id,
    phase,
    current_question_id,
    timer_end,
    is_live,
    created_at
  FROM lq_sessions 
  WHERE id = session_id;
$$;

-- Function to get participant count for a session
CREATE OR REPLACE FUNCTION get_participant_count(session_id UUID)
RETURNS INTEGER
LANGUAGE SQL
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM lq_session_participants 
  WHERE session_id = get_participant_count.session_id;
$$;

-- Function to get poll results for a question
CREATE OR REPLACE FUNCTION get_poll_results(session_id UUID, question_id UUID)
RETURNS TABLE(option_index INTEGER, count BIGINT)
LANGUAGE SQL
AS $$
  SELECT 
    selected_option_index::INTEGER as option_index,
    COUNT(*) as count
  FROM lq_live_responses 
  WHERE session_id = get_poll_results.session_id 
    AND question_id = get_poll_results.question_id
    AND selected_option_index IS NOT NULL
  GROUP BY selected_option_index
  ORDER BY selected_option_index;
$$;

-- Function to get participant scores for a session
CREATE OR REPLACE FUNCTION get_participant_scores(session_id UUID)
RETURNS TABLE(participant_id UUID, total_score BIGINT)
LANGUAGE SQL
AS $$
  SELECT 
    participant_id,
    COALESCE(SUM(points_awarded), 0) as total_score
  FROM lq_live_responses 
  WHERE session_id = get_participant_scores.session_id
  GROUP BY participant_id
  ORDER BY total_score DESC;
$$;

-- Grant permissions for the functions
GRANT EXECUTE ON FUNCTION get_server_time() TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_state(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_participant_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_poll_results(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_participant_scores(UUID) TO authenticated; 