import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, RotateCcw, Target, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/services/analytics';
import { recordGameRun } from '@/services/gameRuns';
import { awardXp, computeGameXp } from '@/services/xp';

interface SchulteGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

interface Cell {
  id: number;
  number: number;
  position: { row: number; col: number };
  found: boolean;
}

export function SchulteGame({ onComplete, difficulty = 1, onBack }: SchulteGameProps) {
  const { user } = useAuth();
  const [level, setLevel] = useState(difficulty);
  const [gridSize, setGridSize] = useState(4); // Start smaller (4x4) for early levels
  const [cells, setCells] = useState<Cell[]>([]);
  const [currentTarget, setCurrentTarget] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [boardsCompleted, setBoardsCompleted] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [foundNumbers, setFoundNumbers] = useState(0);
  const [boardStartTime, setBoardStartTime] = useState<Date | null>(null);

  // Load saved level on component mount
  useEffect(() => {
    loadSavedLevel();
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (gameStarted && !gameCompleted) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleGameEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      intervalRef.current = timer;
      return () => clearInterval(timer);
    }
  }, [gameStarted, gameCompleted]);

  // Map level to grid size with gentler early ramp (levels 1-2:4, 3-4:5, 5-6:6, 7-8:7, 9-10:8)
  const computeGridSize = (lvl: number) => {
    if (lvl < 3) return 4;
    if (lvl < 5) return 5;
    if (lvl < 7) return 6;
    if (lvl < 9) return 7;
    return 8;
  };

  const loadSavedLevel = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('user_game_state')
        .select('last_level')
        .eq('user_id', user.id)
        .eq('game_code', 'schulte')
        .maybeSingle();
      
      if (data?.last_level) {
        const savedLevel = data.last_level;
        setLevel(savedLevel);
        setGridSize(computeGridSize(savedLevel));
      } else {
        // Ensure grid size matches initial level
        setGridSize(computeGridSize(level));
      }
    } catch (error) {
      console.error('Error loading saved level:', error);
    }
  };

  const saveLevelProgress = async (newLevel: number) => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_game_state')
        .upsert({
          user_id: user.id,
          game_code: 'schulte',
          last_level: newLevel,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving level:', error);
    }
  };

  const generateGrid = () => {
    const totalCells = gridSize * gridSize;
    const numbers = Array.from({ length: totalCells }, (_, i) => i + 1);
    
    // Shuffle the numbers
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    const newCells: Cell[] = numbers.map((number, index) => ({
      id: index,
      number,
      position: {
        row: Math.floor(index / gridSize),
        col: index % gridSize
      },
      found: false
    }));
    
    setCells(newCells);
    setCurrentTarget(1);
    setFoundNumbers(0);
    setBoardStartTime(new Date());
  };

  const handleCellClick = (cellNumber: number) => {
    if (!gameStarted || gameCompleted) return;
    
    if (cellNumber === currentTarget) {
      // Correct number found
      setCells(prev => prev.map(cell => 
        cell.number === cellNumber ? { ...cell, found: true } : cell
      ));
      
      const newFoundNumbers = foundNumbers + 1;
      setFoundNumbers(newFoundNumbers);
      setCurrentTarget(prev => prev + 1);
      
      // Check if grid is completed
      if (newFoundNumbers === gridSize * gridSize) {
        handleBoardComplete();
      }
    } else {
      // Wrong number clicked
      setErrors(prev => prev + 1);
    }
  };

  const handleBoardComplete = () => {
    if (!boardStartTime) return;
    
    const boardTime = (Date.now() - boardStartTime.getTime()) / 1000;
    const timeThreshold = Math.max(30 - level * 2, 15); // 30s to 15s threshold
    
    // Level up if completed quickly with 100% accuracy
    if (boardTime < timeThreshold && errors === 0) {
  const newLevel = Math.min(level + 1, 10); // Cap at level 10
  setLevel(newLevel);
  setGridSize(computeGridSize(newLevel));
      saveLevelProgress(newLevel);
      trackEvent(user?.id, 'level_up', { game: 'schulte', newLevel });
    }
    
    setBoardsCompleted(prev => prev + 1);
    
    // Calculate XP for this board
  // Approximate score for XP: favor speed and penalize errors
  const syntheticScore = Math.max(1, Math.round((100 - Math.min(100, boardTime * 3)) - errors * 5));
  const boardXP = computeGameXp('schulte', { level, score: syntheticScore });
  setTotalXP(prev => prev + boardXP);
  awardXp(user?.id, boardXP, 'game', { game: 'schulte', boardTime, level, errors });
    
    // Generate new grid if time remaining
    if (timeLeft > 5) {
      generateGrid();
    } else {
      setGameCompleted(true);
      handleGameEnd();
    }
  };

  const handleGameEnd = async () => {
    if (!startTime) return;
    
    setGameCompleted(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    const duration = 60 - timeLeft; // Total time played
  const accuracyFraction = boardsCompleted > 0 ? 1.0 : foundNumbers / (gridSize * gridSize);
  const accuracyPct = accuracyFraction * 100;
  const score = totalXP;
    try {
      if (user) {
        await recordGameRun({
          userId: user.id,
          gameCode: 'schulte',
          level,
          score,
          accuracy: accuracyPct,
          durationSec: duration,
          params: { boardsCompleted, errors }
        });
      }
      trackEvent(user?.id, 'game_end', { game: 'schulte', score, accuracy: accuracyPct, boardsCompleted, errors, level });
    } catch (e) {
      console.error('Failed to record schulte run', e);
    }
    onComplete(score, accuracyPct, duration);
  };

  const startGame = () => {
    generateGrid();
    setGameStarted(true);
    setGameCompleted(false);
    setErrors(0);
    setStartTime(new Date());
    setTimeLeft(60);
    setFoundNumbers(0);
    setBoardsCompleted(0);
    setTotalXP(0);
  trackEvent(user?.id, 'game_start', { game: 'schulte', level });
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameCompleted(false);
    setErrors(0);
    setStartTime(null);
    setTimeLeft(60);
    setFoundNumbers(0);
    setBoardsCompleted(0);
    setTotalXP(0);
    setBoardStartTime(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  // No specific reset event type in analytics schema; omit or repurpose if added later
  };

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="outline" size="icon" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold">Tabla de Schulte</h1>
              <p className="text-sm text-muted-foreground">Nivel {level} • Tablero {gridSize}×{gridSize}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {gameStarted && !gameCompleted && (
              <div className="text-lg font-mono bg-card/80 px-3 py-1 rounded">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        </div>

        {/* Game Stats */}
        {gameStarted && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Objetivo</p>
                    <p className="text-2xl font-bold text-primary">{currentTarget}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Errores</p>
                    <p className="text-2xl font-bold text-destructive">{errors}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tableros</p>
                    <p className="text-2xl font-bold text-success">{boardsCompleted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">XP</p>
                    <p className="text-2xl font-bold text-accent">{totalXP}</p>
                  </div>
                </div>
              </div>
              <Progress value={(foundNumbers / (gridSize * gridSize)) * 100} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Game Area */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            {!gameStarted ? (
              <div className="text-center space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Encuentra los números en orden</h2>
                  <p className="text-muted-foreground">
                    Toca los números del 1 al {gridSize * gridSize} en orden secuencial.
                    Mantén la mirada en el centro y usa tu visión periférica.
                  </p>
                </div>
                <Button 
                  onClick={startGame}
                  className="bg-gradient-primary hover:shadow-glow-primary transition-all duration-300"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Comenzar Juego
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  className="grid gap-2 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    maxWidth: '400px'
                  }}
                >
                  {cells.map((cell) => (
                    <button
                      key={cell.id}
                      onClick={() => handleCellClick(cell.number)}
                      className={`
                        aspect-square border-2 rounded-lg font-bold transition-all duration-200 hover:scale-105
                        min-h-[48px] min-w-[48px] touch-manipulation
                        ${gridSize <= 5 ? 'text-xl' : gridSize <= 6 ? 'text-lg' : 'text-base'}
                        ${cell.found 
                          ? 'bg-success/20 border-success text-success' 
                          : (level < 4 && cell.number === currentTarget)
                            ? 'bg-primary/20 border-primary text-primary shadow-glow-primary'
                            : 'bg-card border-border hover:border-primary/50'
                        }
                      `}
                      disabled={cell.found}
                    >
                      {cell.number}
                    </button>
                  ))}
                </div>
                
                <div className="flex justify-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={resetGame}
                    className="border-border/50"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reiniciar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>💡 Mantén la mirada en el centro y usa tu visión periférica</p>
              <p>⚡ No muevas los ojos demasiado, percibe todo el campo visual</p>
              <p>🎯 La dificultad aumenta automáticamente con tu rendimiento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}