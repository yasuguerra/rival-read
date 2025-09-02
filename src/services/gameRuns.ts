import { supabase } from '@/integrations/supabase/client';
import { TablesInsert } from '@/integrations/supabase/types';

export interface RecordGameRunParams {
  userId: string;
  gameCode: string;
  level: number;
  score: number;
  accuracy: number | null;
  durationSec: number | null;
  params?: Record<string, any>;
}

export async function recordGameRun(params: RecordGameRunParams) {
  // Fetch game id by code (cached minimal query)
  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('code', params.gameCode)
    .maybeSingle();

  if (!game) return { error: new Error('Game not found') };

  const insert: TablesInsert<'game_runs'> = {
    user_id: params.userId,
    game_id: game.id,
    level: params.level,
    score: params.score,
    accuracy: params.accuracy,
    duration_sec: params.durationSec,
    params_json: params.params || null
  };

  const { error } = await supabase.from('game_runs').insert(insert);
  return { error };
}
