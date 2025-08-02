# Environment Variables Setup for Vercel

## Quick Fix for 403 Error

The 403 error you're seeing is because Supabase environment variables are not configured in Vercel.

### Step 1: Get Your Supabase Keys

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### Step 2: Add to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 3: Redeploy

After adding the environment variables, redeploy your project.

## Optional: AI Features

If you want AI quiz generation to work, also add:

```
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

## Test

After setup, your app should work without 403 errors! 