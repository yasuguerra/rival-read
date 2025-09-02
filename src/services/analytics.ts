import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEventType = 'game_start' | 'game_end' | 'level_up' | 'xp_gain' | 'wpm_measured';

export async function trackEvent(userId: string | undefined, eventType: AnalyticsEventType, meta: Record<string, any> = {}) {
  if (!userId) return;
  // Cast to any until types regenerated including analytics_events
  await (supabase as any).from('analytics_events').insert({
    user_id: userId,
    event_type: eventType,
    meta
  });
}
