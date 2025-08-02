# Environment Variables Setup Guide

## Problem
You're getting a 500 error with the message: "REACT_APP_GEMINI_API_KEY environment variable is required"

This means the environment variables are not set in your Vercel deployment.

## Solution: Set Environment Variables in Vercel

### Step 1: Get Your API Keys

1. **Google Gemini API Key**:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key

2. **Supabase Credentials**:
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to Settings → API
   - Copy:
     - Project URL (for SUPABASE_URL)
     - `service_role` key (for SUPABASE_SERVICE_KEY)

### Step 2: Set Environment Variables in Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add GEMINI_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY

# Deploy with the new environment variables
vercel --prod
```

#### Option B: Using Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add these variables:
   - **Name**: `GEMINI_API_KEY`
     **Value**: Your Gemini API key
     **Environment**: Production, Preview, Development
   
   - **Name**: `SUPABASE_URL`
     **Value**: Your Supabase project URL
     **Environment**: Production, Preview, Development
   
   - **Name**: `SUPABASE_SERVICE_KEY`
     **Value**: Your Supabase service role key
     **Environment**: Production, Preview, Development

### Step 3: Redeploy
After setting the environment variables, redeploy your application:
```bash
vercel --prod
```

### Step 4: Test
1. Visit your deployed app
2. Go to `/api-test` to test the API endpoints
3. Try the AI quiz generation feature

## Environment Variables Reference

| Variable Name | Description | Example |
|---------------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSyC...` |
| `SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Troubleshooting

### If you still get errors:
1. **Check Vercel Function Logs**:
   - Go to Vercel Dashboard → Your Project → Functions
   - Click on `/api/generate` function
   - Check the logs for detailed error messages

2. **Test Environment Variables**:
   - Visit `/api-test` on your deployed app
   - Check if all environment variables show as `true`

3. **Verify API Keys**:
   - Test your Gemini API key in Google AI Studio
   - Verify your Supabase credentials work

### Common Issues:
- **403 Forbidden**: Check Supabase RLS policies
- **500 Internal Server Error**: Usually missing environment variables
- **406 Not Acceptable**: Content negotiation issues (should be fixed now)

## Security Notes
- Never commit API keys to your repository
- Use environment variables for all sensitive data
- The `service_role` key has admin privileges - keep it secure 