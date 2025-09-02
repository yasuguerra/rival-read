import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FindNumberGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

export function FindNumberGame({ onComplete, difficulty = 1, onBack }: FindNumberGameProps) {
  const { user } = useAuth();
  const [level, setLevel] = useState(difficulty);
  const [gameStarted, setGameStarted] = useState(false);
  const [numbersGrid, setNumbersGrid] = useState<number[][]>([]);
  const [targetSequence, setTargetSequence] = useState<number[]>([]);
  const [selectedPath, setSelectedPath] = useState<Array<{row: number, col: number, number: number}>>([]);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [sequencesFound, setSequencesFound] = useState(0);
  const [totalSequences, setTotalSequences] = useState(5);
  const [startTime, setStartTime] = useState<Date | null>(null);

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
        .eq('game_code', 'find_number')
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
          game_code: 'find_number',
          last_level: newLevel,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving level:', error);
    }
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

  const generateGrid = () => {
    const gridSize = Math.min(6 + Math.floor(level / 2), 10); // 6x6 to 10x10
    const sequenceLength = Math.min(3 + Math.floor(level / 3), 6); // 3 to 6 digits
    
    // Initialize grid with random numbers
    const grid: number[][] = Array(gridSize).fill(null).map(() => 
      Array(gridSize).fill(null).map(() => Math.floor(Math.random() * 10))
    );
    
    // Generate target sequence
    const sequence: number[] = Array(sequenceLength).fill(null).map(() => 
      Math.floor(Math.random() * 10)
    );
    
    // Define allowed directions based on level
    let directions = [
      [0, 1],   // horizontal right
      [1, 0],   // vertical down
    ];
    
    if (level >= 3) {
      directions.push([1, 1]);   // diagonal down-right
      directions.push([-1, 1]);  // diagonal up-right
    }
    
    if (level >= 5) {
      directions.push([0, -1]);   // horizontal left
      directions.push([-1, 0]);   // vertical up
      directions.push([-1, -1]);  // diagonal up-left
      directions.push([1, -1]);   // diagonal down-left
    }
    
    // Place the sequence in the grid
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 100) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const startRow = Math.floor(Math.random() * gridSize);
      const startCol = Math.floor(Math.random() * gridSize);
      
      if (canPlaceSequence(grid, sequence, startRow, startCol, direction)) {
        placeSequence(grid, sequence, startRow, startCol, direction);
        placed = true;
      }
      attempts++;
    }
    
    setNumbersGrid(grid);
    setTargetSequence(sequence);
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (!gameStarted) return;
    
    const number = numbersGrid[rowIndex][colIndex];
    const newPath = [...selectedPath, { row: rowIndex, col: colIndex, number }];
    setSelectedPath(newPath);
    
    // Auto-check when sequence is complete
    if (newPath.length === targetSequence.length) {
      setTimeout(() => checkSequence(newPath), 500);
    }
  };

  const checkSequence = (path: Array<{row: number, col: number, number: number}>) => {
    const selectedNumbers = path.map(cell => cell.number);
    const isCorrect = selectedNumbers.every((num, index) => num === targetSequence[index]);
    
    if (isCorrect) {
      setScore(prev => prev + targetSequence.length * 10);
      setSequencesFound(prev => {
        const newFound = prev + 1;
        if (newFound >= totalSequences) {
          // Level up and generate new grid
          const newLevel = Math.min(level + 1, 10);
          setLevel(newLevel);
          saveLevelProgress(newLevel);
          
          setTimeout(() => {
            setSequencesFound(0);
            generateGrid();
          }, 1000);
        } else {
          // Generate new sequence in same grid
          setTimeout(() => {
            generateGrid();
          }, 1000);
        }
        return newFound;
      });
    } else {
      setErrors(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 5));
    }
    
    setSelectedPath([]);
  };

  const clearSelection = () => {
    setSelectedPath([]);
  };

  const handleGameEnd = () => {
    if (!startTime) return;
    
    const duration = (Date.now() - startTime.getTime()) / 1000;
    const accuracy = score > 0 ? Math.min(1, score / (score + errors * 5)) : 0;
    onComplete(score, accuracy, duration);
  };

  const startGame = () => {
    generateGrid();
    setGameStarted(true);
    setScore(0);
    setErrors(0);
    setTimeLeft(60);
    setSequencesFound(0);
    setSelectedPath([]);
    setStartTime(new Date());
  };

  const resetGame = () => {
    setGameStarted(false);
    setScore(0);
    setErrors(0);
    setTimeLeft(60);
    setSequencesFound(0);
    setSelectedPath([]);
    setNumbersGrid([]);
    setTargetSequence([]);
    setStartTime(null);
  };

  const isSelected = (rowIndex: number, colIndex: number) => {
    return selectedPath.some(pos => pos.row === rowIndex && pos.col === colIndex);
  };

  const getSelectionIndex = (rowIndex: number, colIndex: number) => {
    return selectedPath.findIndex(pos => pos.row === rowIndex && pos.col === colIndex);
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
              <h1 className="text-2xl font-bold">Encuentre el Número</h1>
              <p className="text-sm text-muted-foreground">Nivel {level} • Matriz {Math.min(6 + Math.floor(level / 2), 10)}×{Math.min(6 + Math.floor(level / 2), 10)}</p>
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
                    <p className="text-sm text-muted-foreground">Secuencias</p>
                    <p className="text-xl font-bold text-success">{sequencesFound}/{totalSequences}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Puntos</p>
                    <p className="text-xl font-bold text-primary">{score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Errores</p>
                    <p className="text-xl font-bold text-destructive">{errors}</p>
                  </div>
                </div>
              </div>
              <Progress value={(sequencesFound / totalSequences) * 100} className="h-2" />
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            {!gameStarted ? (
              <div className="text-center space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Encuentra la secuencia de números</h2>
                  <p className="text-muted-foreground mb-4">
                    Busca la secuencia mostrada arriba en la matriz.
                    Puede estar en cualquier dirección según tu nivel.
                  </p>
                  <div className="text-sm text-muted-foreground space-y-2 bg-muted/20 p-4 rounded-lg">
                    <p><strong>Nivel {level}:</strong> Secuencias de {Math.min(3 + Math.floor(level / 3), 6)} dígitos</p>
                    <p><strong>Direcciones:</strong> {level < 3 ? 'Horizontal y vertical' : level < 5 ? 'Incluye diagonales' : 'Todas las direcciones'}</p>
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
                {/* Target Sequence */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Busca esta secuencia:</h3>
                  <div className="text-3xl font-bold text-primary bg-primary/10 rounded-lg py-3 px-6 inline-block font-mono">
                    {targetSequence.join(' - ')}
                  </div>
                </div>

                {/* Numbers Grid */}
                <div 
                  className="grid gap-1 mx-auto"
                  style={{ 
                    gridTemplateColumns: `repeat(${numbersGrid[0]?.length || 6}, minmax(0, 1fr))`,
                    maxWidth: '500px'
                  }}
                >
                  {numbersGrid.map((row, rowIndex) =>
                    row.map((number, colIndex) => {
                      const selected = isSelected(rowIndex, colIndex);
                      const selectionIndex = getSelectionIndex(rowIndex, colIndex);
                      
                      return (
                        <Button
                          key={`${rowIndex}-${colIndex}`}
                          variant={selected ? "default" : "outline"}
                          className={`
                            aspect-square font-mono transition-all duration-200 hover:scale-105
                            min-h-[40px] min-w-[40px] touch-manipulation relative
                            ${numbersGrid[0]?.length <= 6 ? 'text-lg' : numbersGrid[0]?.length <= 8 ? 'text-base' : 'text-sm'}
                            ${selected 
                              ? 'bg-primary/20 border-primary text-primary shadow-glow-primary' 
                              : 'bg-card border-border hover:border-primary/50'
                            }
                          `}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                        >
                          {number}
                          {selected && (
                            <span className="absolute -top-2 -right-2 text-xs bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center">
                              {selectionIndex + 1}
                            </span>
                          )}
                        </Button>
                      );
                    })
                  )}
                </div>
                
                {/* Current Selection */}
                {selectedPath.length > 0 && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Secuencia seleccionada:</p>
                    <div className="text-xl font-mono bg-muted/20 rounded px-4 py-2 inline-block">
                      {selectedPath.map(cell => cell.number).join(' - ')}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedPath.length}/{targetSequence.length} números
                    </p>
                  </div>
                )}
                
                <div className="flex justify-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={clearSelection}
                    disabled={selectedPath.length === 0}
                  >
                    Limpiar Selección
                  </Button>
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
              <p>💡 Toca los números en orden para formar la secuencia</p>
              <p>🎯 Las secuencias pueden estar en horizontal, vertical o diagonal</p>
              <p>⚡ El nivel aumenta automáticamente con tu progreso</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}