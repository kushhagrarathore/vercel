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

-- Live Quiz Tables
CREATE TABLE IF NOT EXISTS public.lq_questions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quiz_id uuid,
    question_text text NOT NULL,
    question_type text DEFAULT 'MCQ'::text,
    options text[] NOT NULL,
    correct_answer_index integer NOT NULL,
    order_index integer,
    timer integer DEFAULT 20,
    media text,
    settings jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT lq_questions_pkey PRIMARY KEY (id),
    CONSTRAINT lq_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.lq_quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.lq_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    quiz_id uuid NOT NULL,
    admin_id uuid,
    code text NOT NULL UNIQUE,
    current_question_id uuid,
    current_question_index integer DEFAULT 0,
    is_active boolean DEFAULT true,
    is_live boolean DEFAULT false,
    timer_end timestamp with time zone,
    phase text DEFAULT 'lobby'::text CHECK (phase = ANY (ARRAY['lobby'::text, 'question'::text, 'times_up'::text, 'leaderboard'::text, 'finished'::text])),
    quiz_status text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT lq_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT lq_sessions_current_question_id_fkey FOREIGN KEY (current_question_id) REFERENCES public.lq_questions(id),
    CONSTRAINT fk_lq_sessions_admin FOREIGN KEY (admin_id) REFERENCES public.users(id),
    CONSTRAINT lq_sessions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.lq_quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.lq_session_participants (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL,
    user_id uuid,
    username text NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'removed'::text, 'disconnected'::text])),
    score integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT lq_session_participants_pkey PRIMARY KEY (id),
    CONSTRAINT fk_lq_session_participants_user FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT lq_session_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.lq_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.lq_live_responses (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    session_id uuid NOT NULL,
    participant_id uuid NOT NULL,
    question_id uuid NOT NULL,
    selected_option_index integer NOT NULL,
    is_correct boolean,
    points_awarded integer DEFAULT 0,
    submitted_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lq_live_responses_pkey PRIMARY KEY (id),
    CONSTRAINT lq_live_responses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.lq_sessions(id) ON DELETE CASCADE,
    CONSTRAINT lq_live_responses_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.lq_session_participants(id) ON DELETE CASCADE,
    CONSTRAINT lq_live_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.lq_questions(id) ON DELETE CASCADE
);

-- User Stats Table
CREATE TABLE IF NOT EXISTS public.user_stats (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    total_quizzes_created integer DEFAULT 0,
    total_forms_created integer DEFAULT 0,
    total_responses_received integer DEFAULT 0,
    total_participants integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_stats_pkey PRIMARY KEY (id),
    CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lq_questions_quiz_id ON public.lq_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_lq_sessions_quiz_id ON public.lq_sessions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_lq_sessions_code ON public.lq_sessions(code);
CREATE INDEX IF NOT EXISTS idx_lq_sessions_admin_id ON public.lq_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_lq_session_participants_session_id ON public.lq_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_lq_session_participants_user_id ON public.lq_session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_lq_live_responses_session_id ON public.lq_live_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_lq_live_responses_participant_id ON public.lq_live_responses(participant_id);
CREATE INDEX IF NOT EXISTS idx_lq_live_responses_question_id ON public.lq_live_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.lq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lq_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lq_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lq_live_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lq_questions
CREATE POLICY "Users can view questions for their quizzes" ON public.lq_questions
    FOR SELECT USING (
        quiz_id IN (
            SELECT id FROM public.lq_quizzes WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert questions for their quizzes" ON public.lq_questions
    FOR INSERT WITH CHECK (
        quiz_id IN (
            SELECT id FROM public.lq_quizzes WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update questions for their quizzes" ON public.lq_questions
    FOR UPDATE USING (
        quiz_id IN (
            SELECT id FROM public.lq_quizzes WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete questions for their quizzes" ON public.lq_questions
    FOR DELETE USING (
        quiz_id IN (
            SELECT id FROM public.lq_quizzes WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for lq_sessions
CREATE POLICY "Users can view sessions they created" ON public.lq_sessions
    FOR SELECT USING (admin_id = auth.uid());

CREATE POLICY "Users can insert sessions" ON public.lq_sessions
    FOR INSERT WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Users can update sessions they created" ON public.lq_sessions
    FOR UPDATE USING (admin_id = auth.uid());

CREATE POLICY "Users can delete sessions they created" ON public.lq_sessions
    FOR DELETE USING (admin_id = auth.uid());

-- RLS Policies for lq_session_participants
CREATE POLICY "Users can view participants in their sessions" ON public.lq_session_participants
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM public.lq_sessions WHERE admin_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can join sessions" ON public.lq_session_participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update participants in their sessions" ON public.lq_session_participants
    FOR UPDATE USING (
        session_id IN (
            SELECT id FROM public.lq_sessions WHERE admin_id = auth.uid()
        )
    );

-- RLS Policies for lq_live_responses
CREATE POLICY "Users can view responses in their sessions" ON public.lq_live_responses
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM public.lq_sessions WHERE admin_id = auth.uid()
        )
    );

CREATE POLICY "Participants can submit responses" ON public.lq_live_responses
    FOR INSERT WITH CHECK (true);

-- RLS Policies for user_stats
CREATE POLICY "Users can view their own stats" ON public.user_stats
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own stats" ON public.user_stats
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stats" ON public.user_stats
    FOR UPDATE USING (user_id = auth.uid());

-- Functions for server time and user management
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS timestamp with time zone
LANGUAGE sql
AS $$
    SELECT now();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, name, email, avatar_url)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'name',
        new.email,
        new.raw_user_meta_data->>'avatar_url'
    );
    
    INSERT INTO public.user_stats (user_id)
    VALUES (new.id);
    
    RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET 
        name = new.raw_user_meta_data->>'name',
        email = new.email,
        avatar_url = new.raw_user_meta_data->>'avatar_url',
        updated_at = now()
    WHERE id = new.id;
    
    RETURN new;
END;
$$;

-- Triggers for user management
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update(); 