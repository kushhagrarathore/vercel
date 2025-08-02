import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://hkordtjderymgjptoyef.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Check if we have valid environment variables
if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase environment variables not found. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your Vercel dashboard.');
  console.warn('⚠️ Some features may not work properly without proper Supabase configuration.');
}

// Define the mock client type
const createMockClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: new Error('Supabase not configured') }),
    signIn: () => Promise.resolve({ error: new Error('Supabase not configured') }),
    signUp: () => Promise.resolve({ error: new Error('Supabase not configured') }),
    signOut: () => Promise.resolve({ error: new Error('Supabase not configured') })
  },
  from: () => ({
    select: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
  })
});

// Only create client if we have a valid key
const supabase = supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : createMockClient();

export { supabase };
