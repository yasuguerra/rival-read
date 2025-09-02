import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VisualFieldGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
}

export function VisualFieldGame({ onComplete, difficulty = 1 }: VisualFieldGameProps) {
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'feedback'>('ready');
  const [centralChar, setCentralChar] = useState('');
  const [peripheralChar, setPeripheralChar] = useState('');
  const [charactersGrid, setCharactersGrid] = useState<string[][]>([]);
  const [highlightedPositions, setHighlightedPositions] = useState<Array<{row: number, col: number}>>([]);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [showTime, setShowTime] = useState(1000);
  const [currentRound, setCurrentRound] = useState(1);

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const generateGrid = useCallback(() => {
    const gridSize = 7 + difficulty;
    const grid: string[][] = [];
    
    for (let i = 0; i < gridSize; i++) {
      const row: string[] = [];
      for (let j = 0; j < gridSize; j++) {
        row.push(characters[Math.floor(Math.random() * characters.length)]);
      }
      grid.push(row);
    }
    
    return grid;
  }, [difficulty]);

  const generateRound = useCallback(() => {
    const grid = generateGrid();
    const gridSize = grid.length;
    const center = Math.floor(gridSize / 2);
    
    // Set central character
    const centralChar = characters[Math.floor(Math.random() * characters.length)];
    grid[center][center] = centralChar;
    setCentralChar(centralChar);
    
    // Set peripheral characters (2 positions at distance from center)
    const distance = 2 + difficulty;
    const positions: Array<{row: number, col: number}> = [];
    
    // Generate random peripheral positions
    for (let i = 0; i < 2; i++) {
      let row, col;
      do {
        const angle = Math.random() * 2 * Math.PI;
        row = center + Math.round(distance * Math.sin(angle));
        col = center + Math.round(distance * Math.cos(angle));
      } while (row < 0 || row >= gridSize || col < 0 || col >= gridSize || 
               positions.some(pos => pos.row === row && pos.col === col));
      
      positions.push({ row, col });
    }
    
    // Decide if peripheral characters should be equal or different
    const shouldBeEqual = Math.random() > 0.5;
    const peripheralChar = characters[Math.floor(Math.random() * characters.length)];
    
    positions.forEach((pos, index) => {
      if (shouldBeEqual || index === 0) {
        grid[pos.row][pos.col] = peripheralChar;
      } else {
        // Make sure it's different
        let differentChar;
        do {
          differentChar = characters[Math.floor(Math.random() * characters.length)];
        } while (differentChar === peripheralChar);
        grid[pos.row][pos.col] = differentChar;
      }
    });
    
    setPeripheralChar(peripheralChar);
    setCharactersGrid(grid);
    setHighlightedPositions([{ row: center, col: center }, ...positions]);
    setShowTime(Math.max(500, 1500 - difficulty * 100));
  }, [generateGrid, difficulty]);

  const startGame = useCallback(() => {
    setScore(0);
    setAttempts(0);
    setCurrentRound(1);
    setStartTime(Date.now());
    setGamePhase('playing');
    generateRound();
  }, [generateRound]);

  const handleAnswer = (answer: 'equal' | 'different') => {
    if (gamePhase !== 'playing') return;
    
    // Check if peripheral characters are actually equal
    const peripheralChars = highlightedPositions.slice(1).map(pos => 
      charactersGrid[pos.row][pos.col]
    );
    const areEqual = peripheralChars.every(char => char === peripheralChars[0]);
    
    const isCorrect = (areEqual && answer === 'equal') || (!areEqual && answer === 'different');
    const newAttempts = attempts + 1;
    
    setAttempts(newAttempts);
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setTimeout(() => {
      if (currentRound >= 15) {
        const duration = (Date.now() - startTime) / 1000;
        const accuracy = (score / newAttempts) * 100;
        onComplete(score, accuracy, duration);
      } else {
        setCurrentRound(prev => prev + 1);
        generateRound();
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Campo de Visión</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mantén la mirada en el centro y determina si los caracteres periféricos son iguales
          </p>
          {gamePhase === 'playing' && (
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="outline">Ronda: {currentRound}/15</Badge>
              <Badge variant="outline">Puntos: {score}</Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Fija la mirada en el carácter central y usa tu visión periférica
                para comparar los caracteres resaltados. ¡No muevas los ojos!
              </p>
              <Button onClick={startGame} className="bg-gradient-primary">
                Comenzar
              </Button>
            </div>
          )}

          {gamePhase === 'playing' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="relative">
                  <div className="grid gap-1 mx-auto" style={{ 
                    gridTemplateColumns: `repeat(${charactersGrid[0]?.length || 7}, 1fr)`,
                    maxWidth: '400px'
                  }}>
                    {charactersGrid.map((row, rowIndex) =>
                      row.map((char, colIndex) => {
                        const isHighlighted = highlightedPositions.some(
                          pos => pos.row === rowIndex && pos.col === colIndex
                        );
                        const isCentral = highlightedPositions[0]?.row === rowIndex && 
                                         highlightedPositions[0]?.col === colIndex;
                        
                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`h-10 w-10 flex items-center justify-center text-sm font-mono border ${
                              isCentral 
                                ? 'bg-primary text-white border-primary font-bold text-lg' 
                                : isHighlighted 
                                  ? 'bg-warning text-white border-warning font-bold' 
                                  : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {char}
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  ¿Los caracteres amarillos (periféricos) son iguales?
                </p>
                <div className="flex justify-center gap-4">
                  <Button 
                    onClick={() => handleAnswer('equal')}
                    className="bg-success hover:bg-success/80"
                    size="lg"
                  >
                    Iguales
                  </Button>
                  <Button 
                    onClick={() => handleAnswer('different')}
                    className="bg-destructive hover:bg-destructive/80"
                    size="lg"
                  >
                    Diferentes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}