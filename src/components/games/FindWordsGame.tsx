import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FindWordsGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
}

export function FindWordsGame({ onComplete, difficulty = 1 }: FindWordsGameProps) {
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'feedback'>('ready');
  const [lettersGrid, setLettersGrid] = useState<string[][]>([]);
  const [hiddenWords, setHiddenWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Array<{row: number, col: number}>>([]);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);

  const wordsList = [
    'GATO', 'CASA', 'MESA', 'AGUA', 'LUNA', 'PERRO', 'LIBRO', 'PAPEL',
    'VERDE', 'AZUL', 'ROJO', 'SOL', 'MAR', 'PAN', 'AMOR', 'PAZ',
    'FLOR', 'CIELO', 'TIERRA', 'FUEGO', 'VIENTO', 'MONTAÑA'
  ];

  const generateGrid = useCallback(() => {
    const gridSize = 10 + difficulty;
    const grid: string[][] = Array(gridSize).fill(null).map(() => 
      Array(gridSize).fill('')
    );
    
    // Fill with random letters
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        grid[i][j] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
    }
    
    return grid;
  }, [difficulty]);

  const canPlaceWord = (grid: string[][], word: string, row: number, col: number, direction: number[]) => {
    const gridSize = grid.length;
    
    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * direction[0];
      const newCol = col + i * direction[1];
      
      if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize) {
        return false;
      }
    }
    return true;
  };

  const placeWord = (grid: string[][], word: string, row: number, col: number, direction: number[]) => {
    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * direction[0];
      const newCol = col + i * direction[1];
      grid[newRow][newCol] = word[i];
    }
  };

  const placeWordsInGrid = (grid: string[][], words: string[]) => {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [-1, 1],  // diagonal up-right
    ];
    
    words.forEach(word => {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 50) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * grid.length);
        const col = Math.floor(Math.random() * grid.length);
        
        if (canPlaceWord(grid, word, row, col, direction)) {
          placeWord(grid, word, row, col, direction);
          placed = true;
        }
        attempts++;
      }
    });
    
    return grid;
  };

  const startGame = useCallback(() => {
    const numWords = 3 + difficulty;
    const selectedWords = wordsList.slice(0, numWords);
    
    let grid = generateGrid();
    grid = placeWordsInGrid(grid, selectedWords);
    
    setLettersGrid(grid);
    setHiddenWords(selectedWords);
    setFoundWords(new Set());
    setSelectedCells([]);
    setScore(0);
    setStartTime(Date.now());
    setTimeLeft(120);
    setGamePhase('playing');
  }, [generateGrid, difficulty]);

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (gamePhase !== 'playing') return;
    
    const newPath = [...selectedCells, { row: rowIndex, col: colIndex }];
    setSelectedCells(newPath);
  };

  const submitWord = () => {
    if (selectedCells.length === 0) return;
    
    const selectedLetters = selectedCells.map(pos => lettersGrid[pos.row][pos.col]).join('');
    
    if (hiddenWords.includes(selectedLetters) && !foundWords.has(selectedLetters)) {
      setFoundWords(prev => new Set([...prev, selectedLetters]));
      setScore(prev => prev + 1);
    }
    
    setSelectedCells([]);
    
    if (foundWords.size + 1 >= hiddenWords.length) {
      const duration = (Date.now() - startTime) / 1000;
      const accuracy = ((foundWords.size + 1) / hiddenWords.length) * 100;
      onComplete(foundWords.size + 1, accuracy, duration);
    }
  };

  const clearSelection = () => {
    setSelectedCells([]);
  };

  useEffect(() => {
    if (gamePhase === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      const duration = (Date.now() - startTime) / 1000;
      const accuracy = (foundWords.size / hiddenWords.length) * 100;
      onComplete(foundWords.size, accuracy, duration);
    }
  }, [gamePhase, timeLeft, foundWords.size, hiddenWords.length, startTime, onComplete]);

  const isSelected = (rowIndex: number, colIndex: number) => {
    return selectedCells.some(pos => pos.row === rowIndex && pos.col === colIndex);
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Encuentre las Palabras</CardTitle>
          <p className="text-sm text-muted-foreground">
            Busca las palabras ocultas en la sopa de letras
          </p>
          {gamePhase === 'playing' && (
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="outline">Tiempo: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</Badge>
              <Badge variant="outline">Encontradas: {foundWords.size}/{hiddenWords.length}</Badge>
              <Badge variant="outline">Puntos: {score}</Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Busca las palabras ocultas en la matriz de letras.
                Pueden estar en cualquier dirección: horizontal, vertical o diagonal.
              </p>
              <Button onClick={startGame} className="bg-gradient-primary">
                Comenzar
              </Button>
            </div>
          )}

          {gamePhase === 'playing' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="grid gap-1" style={{ 
                  gridTemplateColumns: `repeat(${lettersGrid[0]?.length || 10}, 1fr)`,
                  maxWidth: '500px',
                  margin: '0 auto'
                }}>
                  {lettersGrid.map((row, rowIndex) =>
                    row.map((letter, colIndex) => {
                      const selected = isSelected(rowIndex, colIndex);
                      
                      return (
                        <Button
                          key={`${rowIndex}-${colIndex}`}
                          variant={selected ? "default" : "outline"}
                          className={`h-8 w-8 text-xs font-mono p-0 ${
                            selected ? 'bg-primary text-white' : ''
                          }`}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                        >
                          {letter}
                        </Button>
                      );
                    })
                  )}
                </div>
                
                <div className="flex justify-center gap-2 mt-4">
                  <Button onClick={submitWord} disabled={selectedCells.length === 0}>
                    Enviar Palabra
                  </Button>
                  <Button variant="outline" onClick={clearSelection}>
                    Limpiar
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Palabras a encontrar:</h3>
                  <div className="space-y-1">
                    {hiddenWords.map(word => (
                      <div 
                        key={word}
                        className={`p-2 rounded text-sm ${
                          foundWords.has(word) 
                            ? 'bg-success text-white line-through' 
                            : 'bg-muted'
                        }`}
                      >
                        {word}
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedCells.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Palabra seleccionada:</h4>
                    <div className="p-2 bg-primary/10 rounded">
                      {selectedCells.map(pos => lettersGrid[pos.row][pos.col]).join('')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}