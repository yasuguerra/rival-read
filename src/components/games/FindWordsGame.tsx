import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FindWordsGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

export function FindWordsGame({ onComplete, difficulty = 1, onBack }: FindWordsGameProps) {
  const { user } = useAuth();
  const [level, setLevel] = useState(difficulty);
  const [gameStarted, setGameStarted] = useState(false);
  const [lettersGrid, setLettersGrid] = useState<string[][]>([]);
  const [hiddenWords, setHiddenWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Array<{row: number, col: number}>>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [startTime, setStartTime] = useState(0);

  const wordsList = [
    'GATO', 'CASA', 'MESA', 'AGUA', 'LUNA', 'PERRO', 'LIBRO', 'PAPEL',
    'VERDE', 'AZUL', 'ROJO', 'SOL', 'MAR', 'PAN', 'AMOR', 'PAZ',
    'FLOR', 'CIELO', 'TIERRA', 'FUEGO', 'VIENTO', 'MONTAÑA',
    'RIO', 'VALLE', 'MONTE', 'LAGO', 'NIEVE', 'LLUVIA'
  ];

  // Load saved level on component mount
  useEffect(() => {
    loadSavedLevel();
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (gameStarted && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleGameEnd();
    }
  }, [gameStarted, timeLeft]);

  const loadSavedLevel = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('user_game_state')
        .select('last_level')
        .eq('user_id', user.id)
        .eq('game_code', 'find_words')
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
          game_code: 'find_words',
          last_level: newLevel,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving level:', error);
    }
  };

  const canPlaceWord = (grid: string[][], word: string, row: number, col: number, direction: number[]) => {
    const gridSize = grid.length;
    
    for (let i = 0; i < word.length; i++) {
      const newRow = row + i * direction[0];
      const newCol = col + i * direction[1];
      
      if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize) {
        return false;
      }
      
      // Check if cell is empty or contains the same letter
      if (grid[newRow][newCol] !== '' && grid[newRow][newCol] !== word[i]) {
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

  const generateGrid = () => {
    const gridSize = Math.min(8 + Math.floor(level / 2), 12); // 8x8 to 12x12
    const numWords = Math.min(3 + level, 8); // 4 to 8 words
    
    // Initialize empty grid
    const grid: string[][] = Array(gridSize).fill(null).map(() => 
      Array(gridSize).fill('')
    );
    
    // Select words for this level
    const selectedWords = wordsList.slice(0, numWords);
    const placedWords: string[] = [];
    
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [-1, 1],  // diagonal up-right
    ];
    
    // Place each word
    selectedWords.forEach(word => {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 100) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * gridSize);
        const col = Math.floor(Math.random() * gridSize);
        
        if (canPlaceWord(grid, word, row, col, direction)) {
          placeWord(grid, word, row, col, direction);
          placedWords.push(word);
          placed = true;
        }
        attempts++;
      }
    });
    
    // Fill empty cells with random letters
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (grid[i][j] === '') {
          grid[i][j] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }
    
    setLettersGrid(grid);
    setHiddenWords(placedWords);
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (!gameStarted) return;
    
    const cellExists = selectedCells.find(cell => cell.row === rowIndex && cell.col === colIndex);
    
    if (cellExists) {
      // Remove cell if already selected
      setSelectedCells(prev => prev.filter(cell => !(cell.row === rowIndex && cell.col === colIndex)));
    } else {
      // Add cell to selection
      setSelectedCells(prev => [...prev, { row: rowIndex, col: colIndex }]);
    }
  };

  const submitWord = () => {
    if (selectedCells.length === 0) return;
    
    const selectedLetters = selectedCells.map(pos => lettersGrid[pos.row][pos.col]).join('');
    const reversedLetters = selectedLetters.split('').reverse().join('');
    
    // Check if word exists (forward or backward)
    const foundWord = hiddenWords.find(word => 
      word === selectedLetters || word === reversedLetters
    );
    
    if (foundWord && !foundWords.has(foundWord)) {
      setFoundWords(prev => new Set([...prev, foundWord]));
      setScore(prev => prev + foundWord.length * 10);
      
      // Check if all words found
      if (foundWords.size + 1 >= hiddenWords.length) {
        // Level up and generate new grid
        const newLevel = Math.min(level + 1, 10);
        setLevel(newLevel);
        saveLevelProgress(newLevel);
        
        setTimeout(() => {
          setFoundWords(new Set());
          generateGrid();
        }, 1000);
      }
    }
    
    setSelectedCells([]);
  };

  const clearSelection = () => {
    setSelectedCells([]);
  };

  const handleGameEnd = () => {
    const duration = (Date.now() - startTime) / 1000;
    const accuracy = hiddenWords.length > 0 ? foundWords.size / hiddenWords.length : 0;
    onComplete(score, accuracy, duration);
  };

  const startGame = () => {
    generateGrid();
    setGameStarted(true);
    setFoundWords(new Set());
    setSelectedCells([]);
    setScore(0);
    setStartTime(Date.now());
    setTimeLeft(120);
  };

  const resetGame = () => {
    setGameStarted(false);
    setFoundWords(new Set());
    setSelectedCells([]);
    setScore(0);
    setTimeLeft(120);
    setLettersGrid([]);
    setHiddenWords([]);
  };

  const isSelected = (rowIndex: number, colIndex: number) => {
    return selectedCells.some(pos => pos.row === rowIndex && pos.col === colIndex);
  };

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="outline" size="icon" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold">Encuentre las Palabras</h1>
              <p className="text-sm text-muted-foreground">Nivel {level} • Sopa de letras {Math.min(8 + Math.floor(level / 2), 12)}×{Math.min(8 + Math.floor(level / 2), 12)}</p>
            </div>
          </div>
          
          {gameStarted && (
            <div className="text-lg font-mono bg-card/80 px-3 py-1 rounded">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Game Stats */}
        {gameStarted && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Encontradas</p>
                    <p className="text-xl font-bold text-success">{foundWords.size}/{hiddenWords.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Puntos</p>
                    <p className="text-xl font-bold text-primary">{score}</p>
                  </div>
                </div>
              </div>
              <Progress value={(foundWords.size / hiddenWords.length) * 100} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                {!gameStarted ? (
                  <div className="text-center space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Busca las palabras ocultas</h2>
                      <p className="text-muted-foreground mb-4">
                        Busca las palabras ocultas en la matriz de letras.
                        Pueden estar en cualquier dirección: horizontal, vertical o diagonal.
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
                      className="grid gap-1 mx-auto"
                      style={{ 
                        gridTemplateColumns: `repeat(${lettersGrid[0]?.length || 8}, minmax(0, 1fr))`,
                        maxWidth: '500px'
                      }}
                    >
                      {lettersGrid.map((row, rowIndex) =>
                        row.map((letter, colIndex) => {
                          const selected = isSelected(rowIndex, colIndex);
                          
                          return (
                            <Button
                              key={`${rowIndex}-${colIndex}`}
                              variant={selected ? "default" : "outline"}
                              className={`
                                aspect-square font-mono transition-all duration-200 hover:scale-105
                                min-h-[32px] min-w-[32px] touch-manipulation
                                ${lettersGrid[0]?.length <= 8 ? 'text-sm' : 'text-xs'}
                                ${selected ? 'bg-primary/20 border-primary text-primary' : 'bg-card border-border'}
                              `}
                              onClick={() => handleCellClick(rowIndex, colIndex)}
                            >
                              {letter}
                            </Button>
                          );
                        })
                      )}
                    </div>
                    
                    <div className="flex justify-center gap-2">
                      <Button onClick={submitWord} disabled={selectedCells.length === 0}>
                        Enviar Palabra
                      </Button>
                      <Button variant="outline" onClick={clearSelection}>
                        Limpiar
                      </Button>
                      <Button variant="outline" onClick={resetGame}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reiniciar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {gameStarted && (
            <div className="space-y-4">
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Palabras a encontrar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {hiddenWords.map(word => (
                      <div 
                        key={word}
                        className={`p-2 rounded text-sm transition-all duration-200 ${
                          foundWords.has(word) 
                            ? 'bg-success/20 border border-success text-success line-through' 
                            : 'bg-muted border border-border'
                        }`}
                      >
                        {word}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {selectedCells.length > 0 && (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Palabra seleccionada</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded font-mono text-lg">
                      {selectedCells.map(pos => lettersGrid[pos.row][pos.col]).join('')}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Tips */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>💡 Las palabras pueden estar en cualquier dirección (horizontal, vertical, diagonal)</p>
              <p>🎯 Selecciona las letras tocándolas y luego presiona "Enviar Palabra"</p>
              <p>⚡ El nivel aumenta automáticamente cuando encuentres todas las palabras</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}