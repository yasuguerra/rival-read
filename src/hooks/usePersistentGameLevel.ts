import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type Params = {
  userId?: string;
  gameCode: string;
  level: number;
  setLevel: (n: number) => void;
};

/**
 * Lee el último nivel guardado de `user_game_state` al montar
 * y hace upsert cuando `level` cambia.
 * No toca ninguna otra lógica del juego.
 */
export function usePersistentGameLevel({ userId, gameCode, level, setLevel }: Params) {
  // 1) Cargar nivel guardado
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      type Row = { last_level: number | null };
      const { data, error } = await supabase
        .from("user_game_state")
        .select("last_level")
        .eq("user_id", userId)
        .eq("game_code", gameCode)
        .maybeSingle<Row>();

      if (!cancelled && !error && typeof data?.last_level === "number") {
        setLevel(data.last_level);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, gameCode, setLevel]);

  // 2) Guardar nivel cuando cambie
  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        await supabase
          .from("user_game_state")
          .upsert({
            user_id: userId,
            game_code: gameCode,
            last_level: level,
            updated_at: new Date().toISOString(),
          });
      } catch {
        // silencioso
      }
    })();
  }, [userId, gameCode, level]);
}
