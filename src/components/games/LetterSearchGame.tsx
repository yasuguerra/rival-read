import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, Clock, Target, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePersistentGameLevel } from '@/hooks/usePersistentGameLevel';

interface LetterSearchGameProps {
  onComplete: (score: number, accuracy: number, durationSec: number) => void;
  difficulty: number;
  onBack?: () => void;
}

export function LetterSearchGame({ onComplete, difficulty, onBack }: LetterSearchGameProps) {
  const { user } = useAuth();
  const [level, setLevel] = useState(Math.max(1, Math.floor(difficulty)));
  usePersistentGameLevel({ userId: user?.id, gameCode: 'letter_search', level, setLevel });

  const gridSize = Math.min(8 + Math.floor(level), 12); // 8x8 to 12x12
  const targetCount = Math.min(3 + Math.floor(level / 2), 6); // 3-6 targets
  // New: enforce at least 60s duration (before was 30→15). We keep a simple scaling above 60 if needed.
  const gameTimeLimit = 60; // fixed 1 minute per requirement (can later scale with level)
  
  const [grid, setGrid] = useState<string[]>([]);
  const [targetLetters, setTargetLetters] = useState<string[]>([]);
  const [foundTargets, setFoundTargets] = useState<Set<number>>(new Set());
  const [wrongClicks, setWrongClicks] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(gameTimeLimit);
  const [gameEnded, setGameEnded] = useState(false);
  // Incremental score that grows as user finds correct letters
  const [score, setScore] = useState(0);
  // Track number of completed rounds (each time all targets in a grid are found)
  const [rounds, setRounds] = useState(1);

  const generateGame = useCallback(() => {
    // Generate random letters for grid
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const totalCells = gridSize * gridSize;
    
    // Choose target letters
    const targets = [];
    for (let i = 0; i < targetCount; i++) {
      targets.push(letters[Math.floor(Math.random() * letters.length)]);
    }
    
    // Create grid with random letters
    const newGrid = [];
    for (let i = 0; i < totalCells; i++) {
      newGrid.push(letters[Math.floor(Math.random() * letters.length)]);
    }
    
    // Ensure each target letter appears at least once
    targets.forEach((target, index) => {
      const randomIndex = Math.floor(Math.random() * totalCells);
      newGrid[randomIndex] = target;
    });
    
    // Add more instances of target letters
    for (let i = 0; i < targetCount * 2; i++) {
      const randomTarget = targets[Math.floor(Math.random() * targets.length)];
      const randomIndex = Math.floor(Math.random() * totalCells);
      newGrid[randomIndex] = randomTarget;
    }
    
  setGrid(newGrid);
  setTargetLetters(targets);
  // Reset per-round state
  setFoundTargets(new Set());
  }, [gridSize, targetCount]);

  // Initialize game and regenerate on level changes
  useEffect(() => {
    generateGame();
  }, [level, generateGame]);

  // Set start time once when component mounts
  useEffect(() => {
    setStartTime(new Date());
  }, []);

  // Timer effect
  useEffect(() => {
    if (!startTime || gameEnded) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const remaining = Math.max(0, gameTimeLimit - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        endGame();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, gameEnded, gameTimeLimit]);

  const handleCellClick = (index: number) => {
    if (gameEnded) return;

    const letter = grid[index];
    
    if (targetLetters.includes(letter) && !foundTargets.has(index)) {
      // Correct target found
      const newFoundTargets = new Set(foundTargets);
      newFoundTargets.add(index);
      setFoundTargets(newFoundTargets);
      // Increment score immediately (100 pts per correct target like previous final calc base)
      setScore(prev => prev + 100);
      
      // Check if all targets found
      const totalTargetsInGrid = grid.filter(cell => targetLetters.includes(cell)).length;
      if (newFoundTargets.size >= totalTargetsInGrid) {
        // Round complete: start a new one (do not end game, keep timer running)
        setRounds(r => r + 1);
        setLevel(l => l + 1);
        return;
      }
    } else if (!targetLetters.includes(letter)) {
      // Wrong letter clicked
      setWrongClicks(wrongClicks + 1);
    }
  };

  const endGame = () => {
    if (gameEnded) return;
    
    const duration = Math.floor((Date.now() - startTime!.getTime()) / 1000);
    const totalTargetsInGrid = grid.filter(cell => targetLetters.includes(cell)).length;
    const accuracy = totalTargetsInGrid > 0 ? foundTargets.size / totalTargetsInGrid : 0;
  // Final score builds on incremental base plus time bonus minus penalties
  const finalScore = Math.max(0, Math.round(score + (timeLeft * 5) - (wrongClicks * 10)));
    
    setGameEnded(true);
  onComplete(finalScore, accuracy, duration);
  };

  const progress = grid.length > 0 ? (foundTargets.size / grid.filter(cell => targetLetters.includes(cell)).length) * 100 : 0;
  const totalTargetsInGrid = grid.filter(cell => targetLetters.includes(cell)).length;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Búsqueda de Letras {gridSize}×{gridSize}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Target Letters */}
        <div className="text-center space-y-2">
          <p className="text-muted-foreground mb-2">
            Encuentra todas las letras:
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {targetLetters.map((letter, index) => (
              <Badge key={index} variant="outline" className="text-xl px-3 py-1 bg-primary/10">
                {letter}
              </Badge>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-4 flex-wrap">
          <Badge variant="outline">
            <Zap className="w-4 h-4 mr-1" />
            Puntos: {score}
          </Badge>
          <Badge variant="outline">
            Rondas: {rounds - 1}
          </Badge>
          <Badge variant="outline">
            <Target className="w-4 h-4 mr-1" />
            {foundTargets.size} / {totalTargetsInGrid}
          </Badge>
          <Badge variant="outline">
            <Clock className="w-4 h-4 mr-1" />
            {timeLeft}s
          </Badge>
          <Badge variant="outline">
            Errores: {wrongClicks}
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Game Grid */}
        <div className="flex justify-center">
          <div 
            className="grid gap-1 p-2 sm:p-4 rounded-lg bg-muted/20 w-full"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0,1fr))`,
              maxWidth: 'min(90vw, 480px)',
              aspectRatio: '1'
            }}
          >
            {grid.map((letter, index) => {
              const isTarget = targetLetters.includes(letter);
              const isFound = foundTargets.has(index);
              
              return (
                <Button
                  key={index}
                  variant="outline"
                  className={`
                    aspect-square text-[clamp(0.6rem,2vw,0.9rem)] font-bold transition-all duration-200
                    bg-background/40 hover:bg-muted/40 border-border/40
                    ${isFound ? 'opacity-0 pointer-events-none' : ''}
                  `}
                  onClick={() => handleCellClick(index)}
                  disabled={gameEnded}
                >
                  {isFound ? '' : letter}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Tips */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>💡 Mantén la mirada fija en el centro del campo</p>
          <p>⚡ Usa tu visión periférica para detectar patrones</p>
          <p>🎯 Evita mover los ojos demasiado rápido</p>
        </div>
      </CardContent>
    </Card>
  );
}
