import { recordGameRun } from '@/services/gameRuns';
import { awardXp, computeGameXp } from '@/services/xp';
import type { GameCompleteExtras } from '@/types/games';

export interface ProcessGameResultInput {
  userId?: string;
  gameCode: string;
  sessionId?: string;
  level?: number;
  score: number;
  accuracy: number;
  durationSec: number;
  extras?: GameCompleteExtras;
}

export interface GameResultSummary {
  xpAwarded: number;
  normalizedAccuracy: number;
}

function clampAccuracy(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1 && value <= 100) {
    return value / 100;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export async function processGameResult({
  userId,
  gameCode,
  sessionId,
  level,
  score,
  accuracy,
  durationSec,
  extras
}: ProcessGameResultInput): Promise<GameResultSummary> {
  const normalizedAccuracy = clampAccuracy(accuracy);
  const metrics = extras?.metrics ?? {};
  const effectiveLevel = level ?? extras?.level ?? 1;

  const xp = computeGameXp(gameCode, {
    score,
    accuracy: normalizedAccuracy,
    wpm: metrics.wpm,
    level: effectiveLevel
  });

  if (userId) {
    await recordGameRun({
      userId,
      gameCode,
      level: effectiveLevel,
      score,
      accuracy: normalizedAccuracy,
      durationSec,
      params: Object.keys(metrics).length ? metrics : undefined,
      sessionId
    });

    await awardXp(userId, xp, 'game', {
      ...metrics,
      game_code: gameCode,
      score,
      accuracy: normalizedAccuracy,
      duration_sec: durationSec,
      level: effectiveLevel,
      context: sessionId ? 'session' : 'practice'
    });
  }

  return {
    xpAwarded: xp,
    normalizedAccuracy
  };
}
