import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Clock, Zap } from 'lucide-react';

interface SchulteGameProps {
  onComplete: (score: number, accuracy: number, durationSec: number) => void;
  difficulty: number;
}

export function SchulteGame({ onComplete, difficulty }: SchulteGameProps) {
  const gridSize = Math.min(5 + Math.floor(difficulty / 2), 7); // 5x5 to 7x7
  const totalNumbers = gridSize * gridSize;
  
  const [grid, setGrid] = useState<number[]>([]);
  const [currentTarget, setCurrentTarget] = useState(1);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [errors, setErrors] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Generate shuffled grid
  const generateGrid = useCallback(() => {
    const numbers = Array.from({ length: totalNumbers }, (_, i) => i + 1);
    // Fisher-Yates shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
  }, [totalNumbers]);

  // Initialize game
  useEffect(() => {
    setGrid(generateGrid());
    setStartTime(new Date());
  }, [generateGrid]);

  // Timer effect
  useEffect(() => {
    if (!startTime || gameEnded) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, gameEnded]);

  const handleCellClick = (number: number) => {
    if (gameEnded) return;

    if (number === currentTarget) {
      // Correct number
      if (currentTarget === totalNumbers) {
        // Game completed
        const duration = Math.floor((Date.now() - startTime!.getTime()) / 1000);
        const accuracy = Math.max(0, (totalNumbers - errors) / totalNumbers);
        const score = Math.round(1000 / duration * accuracy);
        
        setGameEnded(true);
        onComplete(score, accuracy, duration);
      } else {
        setCurrentTarget(currentTarget + 1);
      }
    } else {
      // Wrong number
      setErrors(errors + 1);
    }
  };

  const progress = ((currentTarget - 1) / totalNumbers) * 100;
  const accuracy = totalNumbers > 0 ? Math.max(0, (currentTarget - 1 - errors) / (currentTarget - 1)) * 100 : 100;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Tabla de Schulte {gridSize}×{gridSize}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            Encuentra los números en orden del 1 al {totalNumbers}
          </p>
          <div className="flex justify-center gap-4">
            <Badge variant="outline" className="text-lg">
              <Target className="w-4 h-4 mr-1" />
              Buscar: {currentTarget}
            </Badge>
            <Badge variant="outline">
              <Clock className="w-4 h-4 mr-1" />
              {elapsedTime}s
            </Badge>
            <Badge variant="outline">
              <Zap className="w-4 h-4 mr-1" />
              {Math.round(accuracy)}%
            </Badge>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span>{currentTarget - 1} / {totalNumbers}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Game Grid */}
        <div className="flex justify-center">
          <div 
            className="grid gap-2 p-4 rounded-lg bg-muted/20"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
              maxWidth: '400px',
              aspectRatio: '1'
            }}
          >
            {grid.map((number, index) => (
              <Button
                key={index}
                variant="outline"
                className={`
                  aspect-square text-lg font-bold transition-all duration-200
                  ${number === currentTarget 
                    ? 'border-primary bg-primary/10 hover:bg-primary/20' 
                    : 'hover:bg-secondary/50'
                  }
                  ${number < currentTarget 
                    ? 'bg-success/20 border-success/50 text-success-foreground opacity-50' 
                    : ''
                  }
                `}
                onClick={() => handleCellClick(number)}
                disabled={gameEnded}
              >
                {number}
              </Button>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>💡 Mantén la mirada en el centro y usa tu visión periférica</p>
          <p>⚡ No muevas los ojos demasiado, percibe todo el campo visual</p>
        </div>
      </CardContent>
    </Card>
  );
}