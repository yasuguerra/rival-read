import { useEffect } from "react";


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

    try {
      const key = `game_level_${userId}_${gameCode}`;
      const savedLevel = localStorage.getItem(key);
      if (savedLevel) {
        setLevel(parseInt(savedLevel, 10));
      }
    } catch (e) {
      console.warn('Error loading level from localStorage', e);
    }
  }, [userId, gameCode, setLevel]);

  // 2) Guardar nivel cuando cambie
  useEffect(() => {
    if (!userId) return;

    try {
      const key = `game_level_${userId}_${gameCode}`;
      localStorage.setItem(key, level.toString());
    } catch (e) {
      console.warn('Error saving level to localStorage', e);
    }
  }, [userId, gameCode, level]);
}
