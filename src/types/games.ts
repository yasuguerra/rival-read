export interface GameCompleteExtras {
  /**
   * Nivel de dificultad alcanzado al completar el juego.
   */
  level?: number;
  /**
   * Métricas específicas del juego (por ejemplo WPM, tableros completados, etc.).
   */
  metrics?: Record<string, number>;
  /**
   * Datos adicionales que puedan interesar para auditoría o analítica.
   */
  meta?: Record<string, unknown>;
}

export type GameCompleteHandler = (
  score: number,
  accuracy: number,
  durationSec: number,
  extras?: GameCompleteExtras
) => void;
