import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';

const ViewResponses = () => {
  const { formId } = useParams();
  const [responses, setResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [formTitle, setFormTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Method 1: Try the relationship query first
        let respData, respError;
        
        try {
          const result = await supabase
            .from('responses')
            .select('*, users!responses_user_id_fkey(email)')
            .eq('form_id', formId);
          
          respData = result.data;
          respError = result.error;
        } catch (relationshipError) {
          console.log('Relationship query failed, trying separate queries...');
          
          // Method 2: Separate queries if relationship doesn't work
          const { data: responsesOnly, error: responsesError } = await supabase
            .from('responses')
            .select('*')
            .eq('form_id', formId);

          if (responsesError) {
            console.error('Error fetching responses:', responsesError);
            return;
          }

          // Get unique user IDs from responses
          const userIds = [...new Set(responsesOnly
            .map(r => r.user_id)
            .filter(Boolean)
          )];

          let usersData = [];
          if (userIds.length > 0) {
            const { data: users, error: usersError } = await supabase
              .from('users')
              .select('id, email')
              .in('id', userIds);

            if (!usersError && users) {
              usersData = users;
            }
          }

          // Merge user data with responses
          respData = responsesOnly.map(response => ({
            ...response,
            users: usersData.find(u => u.id === response.user_id) || null
          }));
          
          respError = null;
        }

        if (respError) {
          console.error('Error fetching responses:', respError);
          return;
        }

        setResponses(respData || []);

        // Get form title and questions
        const [formResult, questionsResult] = await Promise.all([
          supabase
            .from('forms')
            .select('title')
            .eq('id', formId)
            .single(),
          supabase
            .from('questions')
            .select('*')
            .eq('form_id', formId)
            .order('order_index')
        ]);

        if (formResult.data) setFormTitle(formResult.data.title);
        if (questionsResult.data) setQuestions(questionsResult.data);

      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setLoading(false);
      }
    };

    if (formId) {
      fetchData();
    }
  }, [formId]);

  const getQuestionText = (questionId) => {
    const q = questions.find(q => q.id === questionId);
    return q ? q.question_text : `Question ${questionId}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '30px' }}>
        <p>Loading responses...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px' }}>
      <h2 style={{ marginBottom: '20px' }}>📋 Responses for: {formTitle}</h2>
      
      {responses.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#666',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '2px dashed #ddd'
        }}>
          <p style={{ fontSize: '18px', margin: 0 }}>No responses submitted yet.</p>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>Share your form to start collecting responses!</p>
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Total responses: <strong>{responses.length}</strong>
          </p>
          
          {responses.map((resp, idx) => (
            <div
              key={resp.id || idx}
              style={{
                border: '1px solid #ddd',
                padding: '20px',
                marginBottom: '20px',
                borderRadius: '8px',
                background: '#f9f9f9',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '15px',
                paddingBottom: '10px',
                borderBottom: '1px solid #eee'
              }}>
                <p style={{ margin: 0 }}>
                  <strong>🧑 User:</strong> {resp.users?.email || 'Anonymous'}
                </p>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  <strong>🕒 Submitted:</strong> {new Date(resp.submitted_at).toLocaleString()}
                </p>
              </div>
              
              {resp.answers && Object.keys(resp.answers).length > 0 ? (
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Responses:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {Object.entries(resp.answers).map(([qid, answer], i) => (
                      <li key={i} style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                        <strong style={{ color: '#555' }}>{getQuestionText(qid)}:</strong>
                        <span style={{ marginLeft: '8px' }}>
                          {Array.isArray(answer) ? answer.join(', ') : answer}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ margin: 0, color: '#999', fontStyle: 'italic' }}>
                  No answers provided
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewResponses;