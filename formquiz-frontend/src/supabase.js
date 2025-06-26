import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkordtjderymgjptoyef.supabase.co'; // replace with your URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3JkdGpkZXJ5bWdqcHRveWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNDg3MzAsImV4cCI6MjA2NTYyNDczMH0.Tl2mpdSC7g_2hwjYLgb9mJBRNwuIPZ2bxQUJ5pcBW0s'; // replace with your anon key

export const supabase = createClient(supabaseUrl, supabaseKey);
