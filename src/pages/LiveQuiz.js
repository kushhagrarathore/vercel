import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function LiveQuiz({ formId }) {
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const channel = supabase
      .channel(`form-${formId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responses' }, (payload) => {
        setResponses((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [formId]);

  return (
    <div>
      <h2>Live Responses</h2>
      {responses.map((res, idx) => (
        <pre key={idx}>{JSON.stringify(res.answers, null, 2)}</pre>
      ))}
    </div>
  );
}
