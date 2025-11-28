"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, RotateCcw, Target, Zap } from "lucide-react";

// Servicios (con wrappers seguros para evitar choques de tipos)
import { trackEvent } from "@/services/analytics";
import { useAuth } from "@/hooks/useAuth";
import { usePersistentGameLevel } from "@/hooks/usePersistentGameLevel";
import type { GameCompleteHandler } from "@/types/games";

type SchulteGameProps = {
  onComplete: GameCompleteHandler;
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

/* ---------- Wrapper de analytics (evita choques de tipos con trackEvent dinámico) ---------- */
type MinimalAnalyticsEvent = { type: string } & Record<string, unknown>;
const emitEvent = (e: MinimalAnalyticsEvent) => {
  try {
    (trackEvent as unknown as (ev: MinimalAnalyticsEvent) => void)?.(e);
  } catch { }
};
/* ----------------------------------------------------------------------------------------- */

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

    onComplete?.(score, accuracy, SESSION_MS / 1000, {
      level,
      metrics: {
        boardsCompleted,
        found: foundCount,
        errors
      }
    });
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

      <Card className="border-border/60 relative overflow-hidden">
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
                <Button onClick={start} type="button" className="bg-gradient-primary">Iniciar</Button>
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
            className="grid gap-2 sm:gap-3 relative"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, touchAction: "manipulation" }}
            role="grid"
            aria-label={`Tabla ${gridSize} por ${gridSize}`}
          >
            {/* Center Focus Dot (Optional visual aid) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            </div>

            {cells.map((cell, idx) => {
              const isNext = cell.n === currentTarget;
              const showCue = showNextCue && isNext; // 👈 solo resalta si boardLevel < 3
              return (
                <button
                  key={`${cell.n}-${idx}`} // Added idx to key to force re-render on shuffle if needed, though n is unique
                  onClick={() => onCellClick(idx)}
                  disabled={cell.found || !running}
                  type="button"
                  className={[
                    "aspect-square select-none rounded-xl border text-center align-middle transition-all duration-200 z-10",
                    "text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold",
                    "flex items-center justify-center shadow-sm",
                    "hover:scale-[1.05] active:scale-95",
                    cell.found
                      ? "bg-muted text-muted-foreground opacity-50 scale-90"
                      : showCue
                        ? "border-primary bg-primary/10 text-primary shadow-glow-primary scale-105"
                        : "bg-card hover:bg-accent/10 hover:border-accent text-foreground",
                    "animate-in zoom-in duration-300"
                  ].join(" ")}
                  style={{ animationDelay: `${idx * 20}ms` }}
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
