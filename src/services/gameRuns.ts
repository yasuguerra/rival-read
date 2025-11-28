import { saveGameRun } from '@/services/firestore/gameRuns';

export interface RecordGameRunParams {
  userId: string;
  gameCode: string;
  level: number;
  score: number;
  accuracy: number | null;
  durationSec: number | null;
  params?: Record<string, any>;
  sessionId?: string;
  xpEarned: number; // Add this to match Firestore schema
}

export async function recordGameRun(params: RecordGameRunParams) {
  try {
    await saveGameRun(params.userId, {
      gameCode: params.gameCode,
      level: params.level,
      score: params.score,
      accuracy: params.accuracy || undefined,
      wpm: params.params?.wpm,
      durationSeconds: params.durationSec || undefined,
      xpEarned: params.xpEarned,
      sessionId: params.sessionId,
    });

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
