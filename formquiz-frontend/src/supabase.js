import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://hkordtjderymgjptoyef.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3JkdGpkZXJ5bWdqcHRveWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNDg3MzAsImV4cCI6MjA2NTYyNDczMH0.Tl2mpdSC7g_2hwjYLgb9mJBRNwuIPZ2bxQUJ5pcBW0s';

export const supabase = createClient(supabaseUrl, supabaseKey);
