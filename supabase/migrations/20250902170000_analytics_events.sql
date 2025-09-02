-- Analytics events table for minimal telemetry (game_start, game_end, level_up, xp_gain, wpm_measured)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  meta JSONB DEFAULT '{}'
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own analytics events" ON public.analytics_events
  FOR ALL USING (auth.uid() = user_id);

-- Optional index for querying by user/time
CREATE INDEX IF NOT EXISTS analytics_events_user_ts_idx ON public.analytics_events(user_id, event_ts DESC);
