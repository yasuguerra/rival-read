// Minimal progress tracking adapter for games
// Keep API stable: updateGameProgress, GAME_IDS

export const GAME_IDS = {
  RUNNING_WORDS: 'running_words'
} as const;

export type GameId = typeof GAME_IDS[keyof typeof GAME_IDS];

export interface GameProgressSummary {
  gameId: GameId;
  score: number;
  level: number;
  accuracy: number;
  extras?: Record<string, any>;
}

// This can be wired to analytics or Supabase if needed later.
export function updateGameProgress(gameId: GameId, summary: GameProgressSummary) {
  try {
    // Simple console log as placeholder. Do not throw.
    // Consumers expect this to exist and be side-effect safe.
    console.debug('[progress]', gameId, summary);
  } catch {
    // noop
  }
}
