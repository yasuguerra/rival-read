-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  rival_id UUID,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goals table for daily training objectives
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('speed', 'comp', 'combo')),
  minutes_daily INTEGER NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rivals table for AI companions
CREATE TABLE public.rivals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archetype TEXT NOT NULL DEFAULT 'disciplined' CHECK (archetype IN ('disciplined', 'speedster', 'strategist')),
  skin TEXT NOT NULL DEFAULT 'classic',
  color TEXT NOT NULL DEFAULT '#4F46E5',
  name TEXT NOT NULL DEFAULT 'RivalBot',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rival_states table for real-time XP tracking
CREATE TABLE public.rival_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_accum REAL NOT NULL DEFAULT 0,
  params_json JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create sessions table for training sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('speed', 'comp', 'combo')),
  duration_min INTEGER NOT NULL,
  goal_met BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create games table for available training games
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  skills_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_runs table for individual game performance
CREATE TABLE public.game_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  params_json JSONB DEFAULT '{}',
  score REAL,
  accuracy REAL,
  duration_sec INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create skill_ratings table for adaptive difficulty (Elo system)
CREATE TABLE public.skill_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL CHECK (skill IN ('speed', 'comp', 'attention', 'memory')),
  mu REAL NOT NULL DEFAULT 1200,
  sigma REAL NOT NULL DEFAULT 200,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill)
);

-- Create xp_ledger table for experience points tracking
CREATE TABLE public.xp_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('game', 'streak', 'rival', 'bonus')),
  delta REAL NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create streaks table for consecutive day tracking
CREATE TABLE public.streaks (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  protected_until DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create texts table for user-uploaded reading materials
CREATE TABLE public.texts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source TEXT DEFAULT 'user_upload',
  language TEXT DEFAULT 'en',
  word_count INTEGER,
  storage_path TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reading_tests table for WPM and comprehension measurement
CREATE TABLE public.reading_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_id UUID REFERENCES public.texts(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'normal',
  wpm REAL,
  comp_pct REAL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rival_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_tests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own rival" ON public.rivals
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own rival states" ON public.rival_states
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON public.sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Games are readable by everyone" ON public.games
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own game runs" ON public.game_runs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own skill ratings" ON public.skill_ratings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own XP" ON public.xp_ledger
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own streak" ON public.streaks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own texts" ON public.texts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own reading tests" ON public.reading_tests
  FOR ALL USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rival_states_updated_at
  BEFORE UPDATE ON public.rival_states
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skill_ratings_updated_at
  BEFORE UPDATE ON public.skill_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON public.streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial games data
INSERT INTO public.games (code, name, description, skills_json) VALUES
('schulte', 'Tabla de Schulte', 'Encuentra números/letras en orden usando visión periférica', '{"attention": 0.6, "speed": 0.4}'),
('letter_search', 'Búsqueda de Letras', 'Localiza letras objetivo en una matriz de distractores', '{"attention": 0.7, "speed": 0.3}'),
('word_race', 'Carrera de Palabras', 'Lectura rápida con presentación secuencial', '{"speed": 0.8, "comp": 0.2}'),
('pair_odd', 'Par/Impar', 'Identifica números pares e impares rápidamente', '{"attention": 0.5, "speed": 0.5}'),
('memory_chain', 'Cadena de Palabras', 'Memoriza y reproduce secuencias de palabras', '{"memory": 0.7, "attention": 0.3}'),
('reading_eval', 'Evaluación de Lectura', 'Mide WPM y comprensión con textos reales', '{"speed": 0.4, "comp": 0.6}');

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Lector'));
  
  -- Create default rival
  INSERT INTO public.rivals (user_id, name, archetype)
  VALUES (NEW.id, 'RivalBot', 'disciplined');
  
  -- Create default goal
  INSERT INTO public.goals (user_id, mode, minutes_daily)
  VALUES (NEW.id, 'combo', 10);
  
  -- Initialize skill ratings
  INSERT INTO public.skill_ratings (user_id, skill) VALUES
  (NEW.id, 'speed'),
  (NEW.id, 'comp'),
  (NEW.id, 'attention'),
  (NEW.id, 'memory');
  
  -- Initialize streak
  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  
  -- Initialize today's rival state
  INSERT INTO public.rival_states (user_id, date) VALUES (NEW.id, CURRENT_DATE);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user initialization
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();