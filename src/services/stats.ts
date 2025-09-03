import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

export interface DashboardStats {
  totalXP: number;
  streak: number;
  todayGoal: number;
  todayProgressMin: number;
  lastWPM: number;
  lastComprehension: number;
  rivalXPToday: number;
  userXPToday: number;
}

function isoRangeToday(): { start: string; end: string } {
  const now = new Date();
  const start = startOfDay(now).toISOString();
  const end = endOfDay(now).toISOString();
  return { start, end };
}

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  if (!userId) throw new Error('Missing user id');

  const { start, end } = isoRangeToday();

  // Parallel queries
  const [
    goalsQ,
    totalXpQ,
    dailyXpQ,
    streakQ,
    todaySessionsQ,
    latestTestQ,
    rivalStateQ,
  ] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', userId).eq('active', true).single(),
    supabase.from('xp_ledger').select('delta').eq('user_id', userId),
    supabase.from('xp_ledger').select('delta, created_at').eq('user_id', userId).gte('created_at', start).lt('created_at', end),
    supabase.from('streaks').select('count').eq('user_id', userId).single(),
    supabase.from('sessions').select('duration_min, started_at').eq('user_id', userId).gte('started_at', start).lt('started_at', end),
    supabase.from('reading_tests').select('wpm, comp_pct').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('rival_states').select('xp_accum').eq('user_id', userId).gte('date', start.split('T')[0]).lte('date', end.split('T')[0]).single(),
  ]);

  const totalXP = (totalXpQ.data || []).reduce((s, r: any) => s + (r.delta || 0), 0);
  const userXPToday = (dailyXpQ.data || []).reduce((s, r: any) => s + (r.delta || 0), 0);
  const todayProgressMin = (todaySessionsQ.data || []).reduce((s, r: any) => s + (r.duration_min || 0), 0);

  return {
    totalXP,
    userXPToday,
    rivalXPToday: rivalStateQ.data?.xp_accum || 0,
    streak: streakQ.data?.count || 0,
    todayGoal: goalsQ.data?.minutes_daily || 10,
    todayProgressMin,
    lastWPM: latestTestQ.data?.wpm || 0,
    lastComprehension: latestTestQ.data?.comp_pct || 0,
  };
}
