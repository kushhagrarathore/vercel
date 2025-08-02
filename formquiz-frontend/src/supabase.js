import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://hkordtjderymgjptoyef.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3JkdGpkZXJ5bWdqcHRveWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNDg3MzAsImV4cCI6MjA2NTYyNDQ3MzB9.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

// Add console warning if environment variables are missing
if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase environment variables not found. Using fallback values. Some features may not work properly.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
