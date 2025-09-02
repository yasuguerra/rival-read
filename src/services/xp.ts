import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from './analytics';

export async function awardXp(userId: string | undefined, delta: number, source: 'game' | 'streak' | 'rival' | 'bonus' = 'game', meta: Record<string, any> = {}) {
  if (!userId || delta <= 0) return;
  await supabase.from('xp_ledger').insert({
    user_id: userId,
    source,
    delta,
    meta
  });
  trackEvent(userId, 'xp_gain', { delta, source, ...meta });
}

interface ComputeParams {
  score?: number;
  accuracy?: number; // 0..1 or 0..100 variable
  wpm?: number;
  level?: number;
}

export function computeGameXp(gameCode: string, params: ComputeParams) {
  const score = params.score ?? 0;
  const accuracy = params.accuracy ? (params.accuracy > 1 ? params.accuracy / 100 : params.accuracy) : 1;
  const wpm = params.wpm ?? 0;
  const level = params.level ?? 1;
  let base: number;
  switch (gameCode) {
    case 'even_odd':
    case 'find_number':
    case 'schulte':
      base = score / 10 + level * 5; break;
    case 'text_scanning':
      base = 10 + score; break;
    case 'word_race':
    case 'reading_accelerator':
      base = (wpm / 20) * accuracy * 10; break;
    case 'number_memory':
      base = score; break;
    default:
      base = Math.max(5, score / 15);
  }
  return Math.max(5, Math.round(base));
}
