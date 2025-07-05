# Gemini AI Setup Guide

## Environment Variables Required

To use the Gemini AI functionality, you need to set up the following environment variables:

### 1. Supabase Configuration
```
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
REACT_APP_SUPABASE_SERVICE_KEY=your_supabase_service_key_here
```

### 2. Google Gemini AI Configuration
```
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
```

## How to Get Your API Keys

### Supabase Keys
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL and API keys

### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

## Features Added

✅ **AI Generation Modal** - Beautiful modal for entering quiz topics
✅ **Gemini Integration** - Generates 4 multiple choice questions per topic
✅ **Quiz Creation Bar** - Special gradient card for AI generation
✅ **API Route** - Production-ready API endpoint for Vercel deployment
✅ **Error Handling** - Comprehensive error handling and user feedback

## How to Use

1. Go to the Dashboard
2. Switch to the "Quizzes" tab
3. Click on the "Generate with AI" card (purple gradient)
4. Enter a topic (e.g., "JavaScript Fundamentals", "World History")
5. Click "Generate Quiz"
6. The AI will create 4 multiple choice questions
7. You'll be redirected to the quiz editor to customize and publish

## Database Schema

The AI-generated quizzes are stored in the following tables:
- `quizzes` - Quiz metadata
- `slides` - Individual questions and options

## Production Deployment

For Vercel deployment, the API route at `/api/generate.js` will handle the AI generation in production, while development uses the direct function call. 