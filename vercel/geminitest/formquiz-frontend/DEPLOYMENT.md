# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Supabase Project**: Set up your Supabase project
3. **Google AI API Key**: Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Environment Variables Setup

### 1. Local Development (.env.local)
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### 2. Vercel Environment Variables
In your Vercel dashboard, go to your project settings and add these environment variables:

- `GEMINI_API_KEY`: Your Google Gemini API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key (not anon key)

## Database Setup

### 1. Create the Slides Table
Run this SQL in your Supabase SQL editor:

```sql
-- Create slides table
CREATE TABLE IF NOT EXISTS slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    session_code TEXT,
    slide_index INTEGER NOT NULL,
    question TEXT NOT NULL,
    type TEXT DEFAULT 'multiple',
    options TEXT[] DEFAULT '{}',
    correct_answers INTEGER[] DEFAULT '{}',
    background TEXT DEFAULT '#ffffff',
    text_color TEXT DEFAULT '#000000',
    font_size INTEGER DEFAULT 20,
    font_family TEXT DEFAULT 'Inter, Arial, sans-serif',
    timer_duration INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_slides_quiz_id ON slides(quiz_id);
CREATE INDEX IF NOT EXISTS idx_slides_slide_index ON slides(slide_index);
CREATE INDEX IF NOT EXISTS idx_slides_session_code ON slides(session_code);

-- Enable RLS
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view slides" ON slides
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = slides.quiz_id 
            AND (quizzes.user_id = auth.uid() OR quizzes.is_published = true)
        )
    );

CREATE POLICY "Users can insert slides" ON slides
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = slides.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update slides" ON slides
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = slides.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete slides" ON slides
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = slides.quiz_id 
            AND quizzes.user_id = auth.uid()
        )
    );
```

## Deployment Steps

### 1. Connect to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### 2. Or Deploy via GitHub
1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Vercel will automatically deploy on every push

### 3. Manual Deployment
```bash
# Build the project
npm run build

# Deploy to Vercel
vercel --prod
```

## API Endpoints

### AI Generation Endpoint
- **URL**: `/api/generate`
- **Method**: POST
- **Body**:
  ```json
  {
    "topic": "JavaScript Fundamentals",
    "session_code": "ai_1234567890_abc123"
  }
  ```

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Ensure `GEMINI_API_KEY` is set correctly in Vercel
   - Check that the API key has proper permissions

2. **Database Connection Errors**
   - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
   - Ensure your Supabase project is active

3. **CORS Errors**
   - The API already includes CORS headers for Vercel deployment
   - Check that the API URL is correct in the frontend

4. **Function Timeout**
   - AI generation is set to 30 seconds max duration
   - If timeouts occur, check your Gemini API quota

### Debugging

1. **Check Vercel Function Logs**
   - Go to your Vercel dashboard
   - Navigate to Functions tab
   - Check the logs for `/api/generate`

2. **Test API Locally**
   ```bash
   # Start development server
   npm start
   
   # Test API endpoint
   curl -X POST http://localhost:3000/api/generate \
     -H "Content-Type: application/json" \
     -d '{"topic":"test","session_code":"test123"}'
   ```

## Features After Deployment

✅ **AI Quiz Generation**: Generate quizzes using Gemini AI  
✅ **Customization**: Edit generated quizzes  
✅ **Publishing**: Share quizzes with others  
✅ **Responses**: Collect and view quiz responses  
✅ **Live Mode**: Host live quiz sessions  
✅ **Randomization**: Questions appear in random order for users  

## Support

If you encounter issues:
1. Check the Vercel function logs
2. Verify environment variables are set correctly
3. Ensure database schema is properly set up
4. Test the API endpoint directly 