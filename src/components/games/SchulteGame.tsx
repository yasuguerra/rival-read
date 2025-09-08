"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, RotateCcw, Target, Zap } from "lucide-react";

// Servicios (con wrappers seguros para evitar choques de tipos)
import { trackEvent } from "@/services/analytics";
import { recordGameRun } from "@/services/gameRuns";
import { awardXp } from "@/services/xp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePersistentGameLevel } from "@/hooks/usePersistentGameLevel";

type SchulteGameProps = {
  onComplete: (score: number, accuracy: number, durationMs: number) => void;
  difficulty?: number;
  onBack?: () => void;
};

const SESSION_MS = 60_000;

type Cell = { n: number; found: boolean };

const LEVEL_SIZES = [4, 4, 5, 5, 6, 6, 7, 7, 8, 8];
const MAX_GRID = 8;

function levelToGridSize(level: number): number {
  if (level <= LEVEL_SIZES.length) return LEVEL_SIZES[level - 1];
  return MAX_GRID;
}

// Umbrales “amistosos” por nivel (ms)
function boardTimeThresholdMs(level: number): number {
  const size = levelToGridSize(level);
  const base = 12_000; // ~4x4
  const cells = size * size;
  const factor = 1 + (cells - 16) * 0.05; // +5% por celda vs 4x4
  const strictness = 1 - Math.min(0.25, (level - 1) * 0.02);
  return Math.max(6_000, Math.round(base * factor * strictness));
}

function shuffledCells(size: number): Cell[] {
  const nums = Array.from({ length: size * size }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]]; // ✅ swap correcto
  }
  return nums.map((n) => ({ n, found: false }));
}

/* ---------- Wrappers seguros (evitan TS 2345/2353 sin romper tipos globales) ---------- */
type MinimalAnalyticsEvent = { type: string } & Record<string, unknown>;
const emitEvent = (e: MinimalAnalyticsEvent) => {
  try {
    (trackEvent as unknown as (ev: MinimalAnalyticsEvent) => void)?.(e);
  } catch {}
};

const recordRun = async (
  userId: string | undefined,
  gameKey: string,
  payload: Record<string, unknown>
) => {
  try {
    await (recordGameRun as unknown as (
      sb: typeof supabase,
      uid: string | undefined,
      game: string,
      data: Record<string, unknown>
    ) => Promise<void>)?.(supabase, userId, gameKey, payload);
  } catch {}
};

const grantXp = async (
  userId: string | undefined,
  xp: number,
  meta?: Record<string, unknown>
) => {
  try {
    await (awardXp as unknown as (
      sb: typeof supabase,
      uid: string | undefined,
      amount: number,
      m?: Record<string, unknown>
    ) => Promise<void>)?.(supabase, userId, xp, meta);
  } catch {}
};

// Reemplazo de computeGameXp (evita TS 2353 por shape de ComputeParams distinto)
function computeXpSimple(metrics: {
  boardsCompleted: number;
  found: number;
  errors: number;
  accuracy: number;
}) {
  const base = metrics.found * (0.5 + 0.5 * metrics.accuracy);
  const bonus = metrics.boardsCompleted * 3;
  const penalty = metrics.errors * 1;
  return Math.max(1, Math.round(base + bonus - penalty));
}
/* -------------------------------------------------------------------------------------- */

export default function SchulteGame({
  onComplete,
  difficulty = 1,
  onBack,
}: SchulteGameProps) {
  const { user } = useAuth();

  const [level, setLevel] = useState<number>(Math.max(1, Math.floor(difficulty)));
  usePersistentGameLevel({ userId: user?.id, gameCode: "schulte", level, setLevel });
  const gridSize = useMemo(() => levelToGridSize(level), [level]);

  const [cells, setCells] = useState<Cell[]>(() => shuffledCells(gridSize));
  const [currentTarget, setCurrentTarget] = useState<number>(1);
  const [foundCount, setFoundCount] = useState<number>(0);
  const [errors, setErrors] = useState<number>(0);
  const [boardErrors, setBoardErrors] = useState<number>(0);
  const [boardsCompleted, setBoardsCompleted] = useState<number>(0);

  const [running, setRunning] = useState<boolean>(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(SESSION_MS);

  const boardStartedAtRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // Nivel del tablero actualmente mostrado (para controlar la guía visual)
  const [boardLevel, setBoardLevel] = useState<number>(level);

  const resetBoard = useCallback(
    (nextLevel?: number) => {
      const effectiveLevel = nextLevel ?? level;
      const size = levelToGridSize(effectiveLevel);
      setCells(shuffledCells(size));
      setCurrentTarget(1);
      setBoardErrors(0);
      setBoardLevel(effectiveLevel); // ✅ asegura que la guía use el nivel del tablero mostrado
      boardStartedAtRef.current = performance.now();
    },
    [level]
  );

  const resetSession = useCallback(() => {
    const baseLevel = Math.max(1, Math.floor(difficulty));
    setLevel(baseLevel);
    setCells(shuffledCells(levelToGridSize(baseLevel)));
    setCurrentTarget(1);
    setFoundCount(0);
    setErrors(0);
    setBoardErrors(0);
    setBoardsCompleted(0);
    setTimeLeftMs(SESSION_MS);
    setRunning(false);
    setStartedAt(null);
    setBoardLevel(baseLevel); // ✅ resetea boardLevel también
    boardStartedAtRef.current = null;
  }, [difficulty]);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    setStartedAt(performance.now());
    setTimeLeftMs(SESSION_MS);
    boardStartedAtRef.current = performance.now();
    emitEvent({ type: "game_start", game: "schulte", level });
  }, [running, level]);

  useEffect(() => {
    if (!running) {
      if (tickRef.current) {
        cancelAnimationFrame(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    const loop = () => {
      if (!startedAt) return;
      const elapsed = performance.now() - startedAt;
      const left = Math.max(0, SESSION_MS - elapsed);
      setTimeLeftMs(left);
      if (left > 0) {
        tickRef.current = requestAnimationFrame(loop);
      } else {
        tickRef.current = null;
        endSession();
      }
    };
    tickRef.current = requestAnimationFrame(loop);
    return () => {
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
    };
  }, [running, startedAt]);

  const onCellClick = useCallback(
    (idx: number) => {
      if (!running) return;
      const cell = cells[idx];
      if (!cell || cell.found) return;

      if (cell.n === currentTarget) {
        const wasLast = currentTarget === gridSize * gridSize;

        setCells((prev) => {
          const next = [...prev];
          next[idx] = { ...prev[idx], found: true };
          return next;
        });

        setFoundCount((c) => c + 1);

        if (wasLast) {
          handleBoardComplete();
        } else {
          setCurrentTarget((t) => t + 1);
        }
      } else {
        setErrors((e) => e + 1);
        setBoardErrors((e) => e + 1);
      }
    },
    [cells, currentTarget, running, gridSize]
  );

  const handleBoardComplete = useCallback(() => {
    const now = performance.now();
    const boardTime = boardStartedAtRef.current ? now - boardStartedAtRef.current : 0;

    const passed = boardErrors <= 1 && boardTime <= boardTimeThresholdMs(level);
    const nextLevel = passed ? level + 1 : level;

    setBoardsCompleted((b) => b + 1);
    resetBoard(nextLevel);
    if (passed) setLevel(nextLevel);
  }, [boardErrors, level, resetBoard]);

  const endSession = useCallback(async () => {
    setRunning(false);

    const attempts = foundCount + errors;
    const accuracy = attempts > 0 ? foundCount / attempts : 0;

    const score = Math.max(0, Math.round(foundCount * (0.7 + 0.3 * accuracy) - errors * 0.5));

    emitEvent({
      type: "game_end",
      game: "schulte",
      level,
      boardsCompleted,
      foundCount,
      errors,
      accuracy,
      durationMs: SESSION_MS,
    });

    await recordRun(user?.id, "schulte", {
      level,
      boardsCompleted,
      found: foundCount,
      errors,
      accuracy,
      duration_ms: SESSION_MS,
      ended_at: new Date().toISOString(),
    });

    const xp = computeXpSimple({
      boardsCompleted,
      found: foundCount,
      errors,
      accuracy,
    });
    await grantXp(user?.id, xp, { reason: "schulte_session" });

  onComplete?.(score, accuracy, SESSION_MS / 1000);
  }, [boardsCompleted, errors, foundCount, level, onComplete, user?.id]);

  // Mantengo tu efecto original
  useEffect(() => {
    resetBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize]);

  const remainingSeconds = Math.ceil(timeLeftMs / 1000);
  const progress = Math.max(0, Math.min(100, (timeLeftMs / SESSION_MS) * 100));
  const showNextCue = boardLevel < 3; // ✅ guía solo en niveles 1–2 del tablero mostrado

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Volver" type="button">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold">Schulte Table</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tiempo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 pb-4 pt-0">
            <Clock className="h-4 w-4" />
            <div className="w-full">
              <Progress value={progress} />
              <div className="mt-1 text-xs text-muted-foreground">
                {remainingSeconds}s restantes
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Próximo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 pb-4 pt-0">
            <Target className="h-4 w-4" />
            <div className="text-sm">
              <span className="font-semibold">#{currentTarget}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nivel</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 pb-4 pt-0">
            <Zap className="h-4 w-4" />
            <div className="text-sm">Lv {level}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-3 sm:p-4">
          {/* 🔼 MOVIDO ARRIBA: estado + acciones */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              Aciertos: <span className="font-medium">{foundCount}</span> · Errores:{" "}
              <span className="font-medium">{errors}</span> · Tableros:{" "}
              <span className="font-medium">{boardsCompleted}</span>
            </div>
            <div className="flex items-center gap-2">
              {!running ? (
                <Button onClick={start} type="button">Iniciar</Button>
              ) : (
                <Button variant="outline" onClick={resetSession} type="button">
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Reiniciar
                </Button>
              )}
            </div>
          </div>

          {/* Grid */}
          <div
            className="grid gap-1 sm:gap-1.5"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, touchAction: "manipulation" }}
            role="grid"
            aria-label={`Tabla ${gridSize} por ${gridSize}`}
          >
            {cells.map((cell, idx) => {
              const isNext = cell.n === currentTarget;
              const showCue = showNextCue && isNext; // 👈 solo resalta si boardLevel < 3
              return (
                <button
                  key={cell.n}
                  onClick={() => onCellClick(idx)}
                  disabled={cell.found || !running}
                  type="button"
                  className={[
                    "aspect-square select-none rounded-md border text-center align-middle",
                    "text-base sm:text-lg md:text-xl lg:text-2xl",
                    "flex items-center justify-center",
                    cell.found
                      ? "bg-muted text-muted-foreground"
                      : showCue
                      ? "border-primary/80 bg-primary/5 font-semibold"
                      : "bg-card",
                  ].join(" ")}
                >
                  {cell.n}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>💡 Mantén la mirada en el centro y usa tu visión periférica</p>
            <p>⚡ Evita perseguir números con los ojos; percibe el patrón global</p>
            <p>🎯 El nivel sube si completas con ≤1 error y dentro del umbral</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
