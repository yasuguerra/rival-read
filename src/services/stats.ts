import { getActiveGoal } from '@/services/firestore/goals';
import { getTotalXp, getTodayXp } from '@/services/firestore/xpLedger';
import { getStreak } from '@/services/firestore/streaks';
import { getTodaySessionMinutes } from '@/services/firestore/sessions';
import { getLatestReadingTest } from '@/services/firestore/readingTests';
import { getTodayRivalXp } from '@/services/firestore/rivalStates';

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

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  if (!userId) throw new Error('Missing user id');

  // Parallel queries to Firestore
  const [
    activeGoal,
    totalXP,
    userXPToday,
    streak,
    todayProgressMin,
    latestTest,
    rivalXPToday,
  ] = await Promise.all([
    getActiveGoal(userId),
    getTotalXp(userId),
    getTodayXp(userId),
    getStreak(userId),
    getTodaySessionMinutes(userId),
    getLatestReadingTest(userId),
    getTodayRivalXp(userId),
  ]);

  return {
    totalXP,
    userXPToday,
    rivalXPToday,
    streak: streak?.count || 0,
    todayGoal: activeGoal?.dailyMinutes || 10,
    todayProgressMin,
    lastWPM: latestTest?.wpm || 0,
    lastComprehension: latestTest?.comprehensionPercent || 0,
  };
}
