import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FindNumberGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
}

export function FindNumberGame({ onComplete, difficulty = 1 }: FindNumberGameProps) {
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'feedback'>('ready');
  const [numbersGrid, setNumbersGrid] = useState<number[][]>([]);
  const [targetSequence, setTargetSequence] = useState<number[]>([]);
  const [selectedPath, setSelectedPath] = useState<Array<{row: number, col: number}>>([]);
  const [foundSequences, setFoundSequences] = useState<number>(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentRound, setCurrentRound] = useState(1);

  const generateGrid = useCallback(() => {
    const gridSize = 8 + difficulty;
    const grid: number[][] = [];
    
    for (let i = 0; i < gridSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < gridSize; j++) {
        row.push(Math.floor(Math.random() * 10));
      }
      grid.push(row);
    }
    
    return grid;
  }, [difficulty]);

  const generateTargetSequence = useCallback(() => {
    const sequenceLength = 3 + difficulty;
    const sequence: number[] = [];
    
    for (let i = 0; i < sequenceLength; i++) {
      sequence.push(Math.floor(Math.random() * 10));
    }
    
    return sequence;
  }, [difficulty]);

  const plantSequenceInGrid = (grid: number[][], sequence: number[]) => {
    const gridSize = grid.length;
    const directions = [
      [0, 1],   // horizontal right
      [1, 0],   // vertical down
      [1, 1],   // diagonal down-right
      [-1, 1],  // diagonal up-right
    ];
    
    // If difficulty > 2, add reverse directions
    if (difficulty > 2) {
      directions.push([0, -1], [-1, 0], [-1, -1], [1, -1]);
    }
    
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    let startRow, startCol;
    let maxAttempts = 50;
    
    do {
      startRow = Math.floor(Math.random() * gridSize);
      startCol = Math.floor(Math.random() * gridSize);
      maxAttempts--;
    } while (maxAttempts > 0 && !canPlaceSequence(grid, sequence, startRow, startCol, direction));
    
    if (maxAttempts > 0) {
      placeSequence(grid, sequence, startRow, startCol, direction);
    }
    
    return grid;
  };

  const canPlaceSequence = (grid: number[][], sequence: number[], startRow: number, startCol: number, direction: number[]) => {
    const gridSize = grid.length;
    
    for (let i = 0; i < sequence.length; i++) {
      const row = startRow + i * direction[0];
      const col = startCol + i * direction[1];
      
      if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
        return false;
      }
    }
    return true;
  };

  const placeSequence = (grid: number[][], sequence: number[], startRow: number, startCol: number, direction: number[]) => {
    for (let i = 0; i < sequence.length; i++) {
      const row = startRow + i * direction[0];
      const col = startCol + i * direction[1];
      grid[row][col] = sequence[i];
    }
  };

  const startNewRound = useCallback(() => {
    const sequence = generateTargetSequence();
    let grid = generateGrid();
    grid = plantSequenceInGrid(grid, sequence);
    
    setNumbersGrid(grid);
    setTargetSequence(sequence);
    setSelectedPath([]);
    setTimeLeft(60 - (currentRound - 1) * 5); // Decrease time each round
  }, [generateGrid, generateTargetSequence, currentRound, difficulty]);

  const startGame = useCallback(() => {
    setScore(0);
    setAttempts(0);
    setFoundSequences(0);
    setCurrentRound(1);
    setStartTime(Date.now());
    setGamePhase('playing');
    startNewRound();
  }, [startNewRound]);

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (gamePhase !== 'playing') return;
    
    const newPath = [...selectedPath, { row: rowIndex, col: colIndex }];
    setSelectedPath(newPath);
    
    if (newPath.length === targetSequence.length) {
      checkSequence(newPath);
    }
  };

  const checkSequence = (path: Array<{row: number, col: number}>) => {
    const selectedSequence = path.map(pos => numbersGrid[pos.row][pos.col]);
    const isCorrect = selectedSequence.every((num, index) => num === targetSequence[index]);
    
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      setFoundSequences(prev => prev + 1);
      
      setTimeout(() => {
        if (currentRound >= 5) {
          const duration = (Date.now() - startTime) / 1000;
          const accuracy = (score / newAttempts) * 100;
          onComplete(score, accuracy, duration);
        } else {
          setCurrentRound(prev => prev + 1);
          startNewRound();
        }
      }, 1000);
    } else {
      setSelectedPath([]);
    }
  };

  const clearSelection = () => {
    setSelectedPath([]);
  };

  useEffect(() => {
    if (gamePhase === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      const duration = (Date.now() - startTime) / 1000;
      const accuracy = attempts > 0 ? (score / attempts) * 100 : 0;
      onComplete(score, accuracy, duration);
    }
  }, [gamePhase, timeLeft, score, attempts, startTime, onComplete]);

  const isSelected = (rowIndex: number, colIndex: number) => {
    return selectedPath.some(pos => pos.row === rowIndex && pos.col === colIndex);
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Encuentre el Número</CardTitle>
          <p className="text-sm text-muted-foreground">
            Encuentra la secuencia en la matriz
          </p>
          {gamePhase === 'playing' && (
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="outline">Ronda: {currentRound}/5</Badge>
              <Badge variant="outline">Tiempo: {timeLeft}s</Badge>
              <Badge variant="outline">Puntos: {score}</Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Busca la secuencia de números mostrada arriba en la matriz.
                Puede estar en cualquier dirección: horizontal, vertical o diagonal.
              </p>
              <Button onClick={startGame} className="bg-gradient-primary">
                Comenzar
              </Button>
            </div>
          )}

          {gamePhase === 'playing' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Busca esta secuencia:</h3>
                <div className="text-3xl font-bold text-primary bg-primary/10 rounded-lg py-3 px-6 inline-block">
                  {targetSequence.join(' - ')}
                </div>
              </div>

              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${numbersGrid[0]?.length || 8}, 1fr)` }}>
                {numbersGrid.map((row, rowIndex) =>
                  row.map((number, colIndex) => {
                    const selected = isSelected(rowIndex, colIndex);
                    const selectionIndex = selectedPath.findIndex(pos => pos.row === rowIndex && pos.col === colIndex);
                    
                    return (
                      <Button
                        key={`${rowIndex}-${colIndex}`}
                        variant={selected ? "default" : "outline"}
                        className={`h-10 w-10 text-sm font-mono p-0 ${
                          selected ? 'bg-primary text-white' : ''
                        }`}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                      >
                        <div className="relative">
                          {number}
                          {selected && (
                            <span className="absolute -top-1 -right-1 text-xs bg-white text-primary rounded-full w-4 h-4 flex items-center justify-center">
                              {selectionIndex + 1}
                            </span>
                          )}
                        </div>
                      </Button>
                    );
                  })
                )}
              </div>
              
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={clearSelection}>
                  Limpiar Selección
                </Button>
                <p className="text-xs text-muted-foreground flex items-center">
                  Seleccionados: {selectedPath.length}/{targetSequence.length}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}