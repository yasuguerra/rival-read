import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { recordGameRun } from '@/services/gameRuns';
import { awardXp, computeGameXp } from '@/services/xp';
import { trackEvent } from '@/services/analytics';

interface EvenOddGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

export function EvenOddGame({ onComplete, difficulty = 1, onBack }: EvenOddGameProps) {
  const { user } = useAuth();
  const [level, setLevel] = useState(difficulty);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [numbersGrid, setNumbersGrid] = useState<number[][]>([]);
  const [currentRule, setCurrentRule] = useState<'even' | 'odd'>('even');
  const [foundNumbers, setFoundNumbers] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [targetCount, setTargetCount] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [runStart, setRunStart] = useState<number | null>(null);

  // Load saved level on component mount
  useEffect(() => {
    loadSavedLevel();
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (gameStarted && !gameCompleted && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleGameEnd();
    }
  }, [gameStarted, gameCompleted, timeLeft]);

  const loadSavedLevel = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('user_game_state')
        .select('last_level')
        .eq('user_id', user.id)
        .eq('game_code', 'even_odd')
        .maybeSingle();
      
      if (data?.last_level) {
        setLevel(data.last_level);
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
          game_code: 'even_odd',
          last_level: newLevel,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving level:', error);
    }
  };

  const generateGrid = () => {
    const gridSize = Math.min(6 + Math.floor(level / 2), 9); // 6x6 to 9x9
    const maxNumber = level < 3 ? 99 : level < 6 ? 999 : 9999;
    const grid: number[][] = [];
    
    for (let i = 0; i < gridSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < gridSize; j++) {
        row.push(Math.floor(Math.random() * maxNumber) + 1);
      }
      grid.push(row);
    }
    
    setNumbersGrid(grid);
    
    // Count target numbers
    let count = 0;
    grid.forEach(row => {
      row.forEach(number => {
        if (isNumberMatchingRule(number)) {
          count++;
        }
      });
    });
    setTargetCount(count);
  };

  const isNumberMatchingRule = (number: number) => {
    const isEven = number % 2 === 0;
    return currentRule === 'even' ? isEven : !isEven;
  };

  const handleNumberClick = (number: number, rowIndex: number, colIndex: number) => {
    if (!gameStarted || gameCompleted) return;
    
    const positionKey = `${rowIndex}-${colIndex}`;
    
    if (foundNumbers.has(positionKey)) return;
    
    const isCorrect = isNumberMatchingRule(number);
    
    if (isCorrect) {
      setFoundNumbers(prev => new Set([...prev, positionKey]));
      setScore(prev => prev + 10);
      
      // Check if all targets found
      if (foundNumbers.size + 1 >= targetCount) {
        const newLevel = Math.min(level + 1, 10);
        setLevel(newLevel);
        saveLevelProgress(newLevel);
        setShowLevelUp(true);
        trackEvent(user?.id, 'level_up', { game: 'even_odd', newLevel });
  const levelXp = computeGameXp('even_odd', { score, level: newLevel });
  awardXp(user?.id, levelXp, 'game', { game: 'even_odd', event: 'level_complete' });
        if (level > 1 && level % 3 === 0) {
          setCurrentRule(prev => prev === 'even' ? 'odd' : 'even');
        }
        setTimeout(() => {
          setShowLevelUp(false);
          setFoundNumbers(new Set());
          generateGrid();
        }, 1500);
      }
    } else {
      setErrors(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 5));
      // Penalty: reduce time
      setTimeLeft(prev => Math.max(prev - 2, 0));
    }
  };

  const handleGameEnd = async () => {
    setGameCompleted(true);
  const duration = 45 - timeLeft;
  const accuracyPct = score > 0 ? (score / (score + errors * 5)) * 100 : 0;
    if (user) {
      await recordGameRun({
        userId: user.id,
        gameCode: 'even_odd',
        level,
        score,
    accuracy: accuracyPct,
        durationSec: duration,
        params: { errors }
      });
    }
  const xp = computeGameXp('even_odd', { score, accuracy: accuracyPct, level });
  awardXp(user?.id, xp, 'game', { game: 'even_odd' });
  trackEvent(user?.id, 'game_end', { game: 'even_odd', level, score, accuracy: accuracyPct });
  onComplete(score, accuracyPct, duration);
  };

  const startGame = () => {
    setCurrentRule(Math.random() > 0.5 ? 'even' : 'odd');
    generateGrid();
    setGameStarted(true);
    setGameCompleted(false);
    setFoundNumbers(new Set());
    setScore(0);
    setErrors(0);
    setTimeLeft(45);
    setShowLevelUp(false);
    const t = Date.now();
    setRunStart(t);
    trackEvent(user?.id, 'game_start', { game: 'even_odd', level });
  };

  const resetGame = () => {
    setGameStarted(false);
    setGameCompleted(false);
    setFoundNumbers(new Set());
    setScore(0);
    setErrors(0);
    setTimeLeft(45);
    setNumbersGrid([]);
    setTargetCount(0);
    setShowLevelUp(false);
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
              <h1 className="text-2xl font-bold">Par/Impar</h1>
              <p className="text-sm text-muted-foreground">Nivel {level} • Matriz {Math.min(6 + Math.floor(level / 2), 9)}×{Math.min(6 + Math.floor(level / 2), 9)}</p>
            </div>
          </div>
          
          {gameStarted && !gameCompleted && (
            <div className="text-lg font-mono bg-card/80 px-3 py-1 rounded">
              {timeLeft}s
            </div>
          )}
        </div>

        {/* Game Stats */}
        {gameStarted && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-6">
                  <Badge className={`text-lg px-3 py-1 ${currentRule === 'even' ? 'bg-blue-500' : 'bg-purple-500'} text-white`}>
                    Buscar: {currentRule === 'even' ? 'PARES' : 'IMPARES'}
                  </Badge>
                  <div>
                    <p className="text-sm text-muted-foreground">Puntos</p>
                    <p className="text-xl font-bold text-success">{score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Errores</p>
                    <p className="text-xl font-bold text-destructive">{errors}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Restantes</p>
                    <p className="text-xl font-bold text-primary">{targetCount - foundNumbers.size}</p>
                  </div>
                </div>
              </div>
              <Progress value={(foundNumbers.size / targetCount) * 100} className="h-2" />
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            {!gameStarted ? (
              <div className="text-center space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Encuentra todos los números pares o impares</h2>
                  <p className="text-muted-foreground mb-4">
                    Encuentra rápidamente todos los números que cumplan la regla.
                    Mantén la mirada en el centro y percibe en bloques.
                  </p>
                  <div className="text-sm text-muted-foreground space-y-2 bg-muted/20 p-4 rounded-lg">
                    <p><strong>Regla:</strong> Un número es par si termina en 0, 2, 4, 6 u 8</p>
                    <p><strong>Ejemplo:</strong> 24 = par, 37 = impar</p>
                  </div>
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
                  className="grid gap-1"
                  style={{ 
                    gridTemplateColumns: `repeat(${numbersGrid[0]?.length || 6}, minmax(0, 1fr))`,
                    maxWidth: '600px',
                    margin: '0 auto'
                  }}
                >
                  {numbersGrid.map((row, rowIndex) =>
                    row.map((number, colIndex) => {
                      const positionKey = `${rowIndex}-${colIndex}`;
                      const isFound = foundNumbers.has(positionKey);
                      const isCorrectType = isNumberMatchingRule(number);
                      
                      return (
                        <Button
                          key={positionKey}
                          variant={isFound ? "default" : "outline"}
                          className={`
                            aspect-square font-mono transition-all duration-200 hover:scale-105
                            min-h-[48px] min-w-[48px] touch-manipulation
                            ${numbersGrid[0]?.length <= 6 ? 'text-base' : 'text-sm'}
                            ${isFound 
                              ? 'bg-success/20 border-success text-success' 
                              : 'bg-card border-border hover:border-primary/50'
                            }
                          `}
                          onClick={() => handleNumberClick(number, rowIndex, colIndex)}
                          disabled={isFound || gameCompleted}
                        >
                          {number}
                        </Button>
                      );
                    })
                  )}
                </div>
                {showLevelUp && (
                  <div className="text-center text-success font-semibold animate-pulse">¡Nivel superado! +XP</div>
                )}
                
                <div className="flex justify-center">
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
              <p>💡 Mantén la mirada fija en el centro • Encuentra todos los números objetivo</p>
              <p>🎯 Fijación central - no examines cada número por separado</p>
              <p>⚡ El nivel y la regla cambian automáticamente con tu progreso</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}