export default async function handler(req, res) {
  // Enable CORS for Vercel deployment
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check environment variables
  const envCheck = {
    GEMINI_API_KEY: {
      exists: !!(process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY),
      value: process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || 'NOT_SET',
      length: (process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '').length
    },
    SUPABASE_URL: {
      exists: !!(process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL),
      value: process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'NOT_SET',
      length: (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').length
    },
    SUPABASE_SERVICE_KEY: {
      exists: !!(process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_KEY),
      value: process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_KEY || 'NOT_SET',
      length: (process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_KEY || '').length
    },
    NODE_ENV: process.env.NODE_ENV,
  };

  res.status(200).json({
    success: true,
    message: 'API test endpoint is working',
    timestamp: new Date().toISOString(),
    environment: envCheck,
    method: req.method,
    headers: req.headers,
  });
} 