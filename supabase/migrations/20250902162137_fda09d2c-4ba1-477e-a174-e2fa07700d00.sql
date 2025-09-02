-- Create user game state table for level persistence
CREATE TABLE public.user_game_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_code TEXT NOT NULL,
  last_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_code)
);

-- Enable RLS
ALTER TABLE public.user_game_state ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own game state" 
ON public.user_game_state 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_game_state_updated_at
BEFORE UPDATE ON public.user_game_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();