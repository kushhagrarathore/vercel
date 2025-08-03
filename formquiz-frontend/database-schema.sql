-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_config JSONB DEFAULT '{}',
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quizzes_created INTEGER DEFAULT 0,
  quizzes_completed INTEGER DEFAULT 0,
  achievements INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  customization_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_shared BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  form_url TEXT,
  created_by TEXT,
  current_slide_index INTEGER DEFAULT 0,
  mode TEXT DEFAULT 'static',
  form_id UUID,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_slides_quiz_id ON slides(quiz_id);
CREATE INDEX IF NOT EXISTS idx_slides_slide_index ON slides(slide_index);
CREATE INDEX IF NOT EXISTS idx_slides_session_code ON slides(session_code);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles table
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- Create RLS policies for user_stats table
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stats" ON user_stats
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for quizzes table
CREATE POLICY "Users can view own quizzes" ON quizzes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view published quizzes" ON quizzes
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users can insert own quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for slides table
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

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE)
  );
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update profile when user metadata changes
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    name = COALESCE(NEW.raw_user_meta_data->>'name', profiles.name),
    email = COALESCE(NEW.email, profiles.email),
    email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, profiles.email_verified),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update profile when user metadata changes
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update(); 