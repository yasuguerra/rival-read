import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, RotateCcw } from 'lucide-react';

interface TwinWordsGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
}

export function TwinWordsGame({ onComplete, difficulty = 1 }: TwinWordsGameProps) {
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'feedback'>('ready');
  const [wordsGrid, setWordsGrid] = useState<string[][]>([]);
  const [foundPairs, setFoundPairs] = useState<Set<string>>(new Set());
  const [targetPairs, setTargetPairs] = useState<string[][]>([]);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  const words = [
    'casa', 'árbol', 'sol', 'luna', 'agua', 'fuego', 'tierra', 'aire',
    'gato', 'perro', 'pájaro', 'pez', 'mesa', 'silla', 'libro', 'papel',
    'verde', 'azul', 'rojo', 'blanco', 'negro', 'grande', 'pequeño', 'alto',
    'correr', 'saltar', 'caminar', 'volar', 'nadar', 'leer', 'escribir', 'dibujar'
  ];

  const generateGrid = useCallback(() => {
    const gridSize = 4 + difficulty;
    const grid: string[][] = [];
    const pairs: string[][] = [];
    
    // Generate different word pairs
    for (let i = 0; i < gridSize; i++) {
      const row: string[] = [];
      for (let j = 0; j < gridSize; j += 2) {
        const word1 = words[Math.floor(Math.random() * words.length)];
        let word2 = words[Math.floor(Math.random() * words.length)];
        
        // Ensure words are different
        while (word2 === word1) {
          word2 = words[Math.floor(Math.random() * words.length)];
        }
        
        row.push(word1, word2);
        pairs.push([word1, word2]);
      }
      grid.push(row);
    }
    
    setWordsGrid(grid);
    setTargetPairs(pairs);
  }, [difficulty]);

  const startGame = useCallback(() => {
    generateGrid();
    setFoundPairs(new Set());
    setScore(0);
    setAttempts(0);
    setStartTime(Date.now());
    setTimeLeft(60);
    setGamePhase('playing');
  }, [generateGrid]);

  const handleWordClick = (word: string, rowIndex: number, colIndex: number) => {
    if (gamePhase !== 'playing') return;
    
    const pairKey = `${rowIndex}-${Math.floor(colIndex / 2)}`;
    
    if (foundPairs.has(pairKey)) return;
    
    // Check if this pair contains different words
    const pairWords = wordsGrid[rowIndex].slice(
      Math.floor(colIndex / 2) * 2,
      Math.floor(colIndex / 2) * 2 + 2
    );
    
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (pairWords[0] !== pairWords[1]) {
      setFoundPairs(prev => new Set([...prev, pairKey]));
      setScore(prev => prev + 1);
    }
    
    // Check if all pairs found
    if (foundPairs.size + 1 >= targetPairs.length) {
      const duration = (Date.now() - startTime) / 1000;
      const accuracy = ((score + 1) / newAttempts) * 100;
      onComplete(score + 1, accuracy, duration);
    }
  };

  useEffect(() => {
    if (gamePhase === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      const duration = (Date.now() - startTime) / 1000;
      const accuracy = (score / Math.max(attempts, 1)) * 100;
      onComplete(score, accuracy, duration);
    }
  }, [gamePhase, timeLeft, score, attempts, startTime, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Palabras Gemelas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Encuentra todos los pares de palabras diferentes
          </p>
          {gamePhase === 'playing' && (
            <div className="flex justify-between text-sm">
              <span>Tiempo: {timeLeft}s</span>
              <span>Pares encontrados: {foundPairs.size}/{targetPairs.length}</span>
              <span>Puntuación: {score}</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Busca los pares de palabras que son DIFERENTES entre sí.
                Mantén la mirada en el centro y percibe en bloques.
              </p>
              <Button onClick={startGame} className="bg-gradient-primary">
                Comenzar
              </Button>
            </div>
          )}

          {gamePhase === 'playing' && (
            <div className="space-y-4">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${wordsGrid[0]?.length || 4}, 1fr)` }}>
                {wordsGrid.map((row, rowIndex) =>
                  row.map((word, colIndex) => {
                    const pairKey = `${rowIndex}-${Math.floor(colIndex / 2)}`;
                    const isFound = foundPairs.has(pairKey);
                    
                    return (
                      <Button
                        key={`${rowIndex}-${colIndex}`}
                        variant={isFound ? "default" : "outline"}
                        className={`h-12 text-sm ${isFound ? 'bg-success text-white' : ''}`}
                        onClick={() => handleWordClick(word, rowIndex, colIndex)}
                        disabled={isFound}
                      >
                        {word}
                      </Button>
                    );
                  })
                )}
              </div>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Mantén la mirada fija en el centro y percibe toda la pantalla
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}