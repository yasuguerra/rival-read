import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EvenOddGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
}

export function EvenOddGame({ onComplete, difficulty = 1 }: EvenOddGameProps) {
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'feedback'>('ready');
  const [numbersGrid, setNumbersGrid] = useState<number[][]>([]);
  const [currentRule, setCurrentRule] = useState<'even' | 'odd'>('even');
  const [foundNumbers, setFoundNumbers] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);

  const generateGrid = useCallback(() => {
    const gridSize = 6 + difficulty;
    const grid: number[][] = [];
    
    for (let i = 0; i < gridSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < gridSize; j++) {
        row.push(Math.floor(Math.random() * 99) + 1);
      }
      grid.push(row);
    }
    
    setNumbersGrid(grid);
  }, [difficulty]);

  const startGame = useCallback(() => {
    generateGrid();
    setFoundNumbers(new Set());
    setScore(0);
    setErrors(0);
    setStartTime(Date.now());
    setTimeLeft(45);
    setCurrentRule(Math.random() > 0.5 ? 'even' : 'odd');
    setGamePhase('playing');
  }, [generateGrid]);

  const isNumberMatchingRule = (number: number) => {
    const isEven = number % 2 === 0;
    return currentRule === 'even' ? isEven : !isEven;
  };

  const handleNumberClick = (number: number, rowIndex: number, colIndex: number) => {
    if (gamePhase !== 'playing') return;
    
    const positionKey = `${rowIndex}-${colIndex}`;
    
    if (foundNumbers.has(positionKey)) return;
    
    const isCorrect = isNumberMatchingRule(number);
    
    if (isCorrect) {
      setFoundNumbers(prev => new Set([...prev, positionKey]));
      setScore(prev => prev + 1);
      
      // Switch rule every 5 correct answers in higher difficulties
      if (difficulty > 1 && score > 0 && (score + 1) % 5 === 0) {
        setCurrentRule(prev => prev === 'even' ? 'odd' : 'even');
      }
    } else {
      setErrors(prev => prev + 1);
      // Penalty: reduce time
      setTimeLeft(prev => Math.max(prev - 2, 0));
    }
  };

  useEffect(() => {
    if (gamePhase === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 || (gamePhase === 'playing' && foundNumbers.size >= 20)) {
      const duration = (Date.now() - startTime) / 1000;
      const accuracy = (score / (score + errors)) * 100;
      onComplete(score, accuracy, duration);
    }
  }, [gamePhase, timeLeft, score, errors, startTime, foundNumbers.size, onComplete]);

  const getAllMatchingNumbers = () => {
    const matching: { number: number; row: number; col: number }[] = [];
    numbersGrid.forEach((row, rowIndex) => {
      row.forEach((number, colIndex) => {
        if (isNumberMatchingRule(number)) {
          matching.push({ number, row: rowIndex, col: colIndex });
        }
      });
    });
    return matching;
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Par/Impar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Encuentra todos los números {currentRule === 'even' ? 'pares' : 'impares'}
          </p>
          {gamePhase === 'playing' && (
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="outline">Tiempo: {timeLeft}s</Badge>
              <Badge variant="outline">Puntos: {score}</Badge>
              <Badge variant="outline">Errores: {errors}</Badge>
              <Badge className={`${currentRule === 'even' ? 'bg-blue-500' : 'bg-purple-500'} text-white`}>
                Buscar: {currentRule === 'even' ? 'PARES' : 'IMPARES'}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Encuentra rápidamente todos los números que cumplan la regla.
                Mantén la mirada en el centro y percibe en bloques.
              </p>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Regla:</strong> Un número es par si termina en 0, 2, 4, 6 u 8</p>
                <p><strong>Ejemplo:</strong> 24 = par, 37 = impar</p>
              </div>
              <Button onClick={startGame} className="bg-gradient-primary">
                Comenzar
              </Button>
            </div>
          )}

          {gamePhase === 'playing' && (
            <div className="space-y-4">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${numbersGrid[0]?.length || 6}, 1fr)` }}>
                {numbersGrid.map((row, rowIndex) =>
                  row.map((number, colIndex) => {
                    const positionKey = `${rowIndex}-${colIndex}`;
                    const isFound = foundNumbers.has(positionKey);
                    const isCorrectType = isNumberMatchingRule(number);
                    
                    return (
                      <Button
                        key={positionKey}
                        variant={isFound ? "default" : "outline"}
                        className={`h-10 text-xs font-mono ${
                          isFound 
                            ? 'bg-success text-white' 
                            : isCorrectType 
                              ? 'hover:bg-primary/20' 
                              : 'hover:bg-destructive/20'
                        }`}
                        onClick={() => handleNumberClick(number, rowIndex, colIndex)}
                        disabled={isFound}
                      >
                        {number}
                      </Button>
                    );
                  })
                )}
              </div>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Mantén la mirada fija en el centro • Encuentra {getAllMatchingNumbers().length} números {currentRule === 'even' ? 'pares' : 'impares'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}