import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VisualFieldGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

export function VisualFieldGame({ onComplete, difficulty = 1, onBack }: VisualFieldGameProps) {
  const { user } = useAuth();
  const [level, setLevel] = useState(difficulty);
  const [gameStarted, setGameStarted] = useState(false);
  const [charactersGrid, setCharactersGrid] = useState<string[][]>([]);
  const [highlightedPositions, setHighlightedPositions] = useState<Array<{row: number, col: number}>>([]);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showTime, setShowTime] = useState(1000);
  const [currentRound, setCurrentRound] = useState(1);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showingCharacters, setShowingCharacters] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<'equal' | 'different'>('equal');

  // Enhanced character set with similar characters for distractors
  const characterSets = {
    letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    similar: {
      'M': ['N', 'W', 'H'],
      'O': ['Q', 'C', 'G'],
      'I': ['L', 'J', '1'],
      'E': ['F', 'P', 'B'],
      'S': ['5', 'Z'],
      '6': ['9', 'G'],
      '8': ['B', '3']
    }
  };

  // Load saved level on component mount
  useEffect(() => {
    loadSavedLevel();
  }, [user]);

  const loadSavedLevel = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('user_game_state')
        .select('last_level')
        .eq('user_id', user.id)
        .eq('game_code', 'visual_field')
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
          game_code: 'visual_field',
          last_level: newLevel,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving level:', error);
    }
  };

  const getSimilarCharacter = (char: string) => {
    const similar = characterSets.similar[char as keyof typeof characterSets.similar];
    if (similar && similar.length > 0) {
      return similar[Math.floor(Math.random() * similar.length)];
    }
    // Fallback to any character that's different
    const allChars = characterSets.letters + characterSets.numbers;
    let differentChar;
    do {
      differentChar = allChars[Math.floor(Math.random() * allChars.length)];
    } while (differentChar === char);
    return differentChar;
  };

  const generateGrid = () => {
    const gridSize = Math.min(7 + Math.floor(level / 2), 11); // 7x7 to 11x11
    const grid: string[][] = [];
    
    // Fill grid with random characters
    const allChars = characterSets.letters + characterSets.numbers;
    for (let i = 0; i < gridSize; i++) {
      const row: string[] = [];
      for (let j = 0; j < gridSize; j++) {
        row.push(allChars[Math.floor(Math.random() * allChars.length)]);
      }
      grid.push(row);
    }
    
    return grid;
  };

  const generateRound = () => {
    const grid = generateGrid();
    const gridSize = grid.length;
    const center = Math.floor(gridSize / 2);
    
    // Set central character
    const centralChar = (characterSets.letters + characterSets.numbers)[Math.floor(Math.random() * (characterSets.letters + characterSets.numbers).length)];
    grid[center][center] = centralChar;
    
    // Calculate distance based on level (further = harder)
    const distance = Math.min(2 + Math.floor(level / 2), Math.floor(gridSize / 2) - 1);
    const numPeripherals = Math.min(2 + Math.floor(level / 3), 4); // 2 to 4 peripheral characters
    
    const positions: Array<{row: number, col: number}> = [];
    
    // Generate peripheral positions at specified distance
    for (let i = 0; i < numPeripherals; i++) {
      let row, col, attempts = 0;
      do {
        const angle = (i / numPeripherals) * 2 * Math.PI + Math.random() * 0.5; // Spread around circle
        row = center + Math.round(distance * Math.sin(angle));
        col = center + Math.round(distance * Math.cos(angle));
        attempts++;
      } while ((row < 0 || row >= gridSize || col < 0 || col >= gridSize || 
                positions.some(pos => pos.row === row && pos.col === col)) && attempts < 20);
      
      if (attempts < 20) {
        positions.push({ row, col });
      }
    }
    
    // Decide if peripheral characters should be equal or different
    const shouldBeEqual = Math.random() > 0.5;
    setCorrectAnswer(shouldBeEqual ? 'equal' : 'different');
    
    if (shouldBeEqual) {
      // All peripheral characters are the same
      const peripheralChar = (characterSets.letters + characterSets.numbers)[Math.floor(Math.random() * (characterSets.letters + characterSets.numbers).length)];
      positions.forEach(pos => {
        grid[pos.row][pos.col] = peripheralChar;
      });
    } else {
      // Make sure at least one character is different
      const baseChar = (characterSets.letters + characterSets.numbers)[Math.floor(Math.random() * (characterSets.letters + characterSets.numbers).length)];
      positions.forEach((pos, index) => {
        if (index === 0) {
          grid[pos.row][pos.col] = baseChar;
        } else if (index === 1) {
          // Make this one different using similar characters for added difficulty
          grid[pos.row][pos.col] = getSimilarCharacter(baseChar);
        } else {
          // Others can be the same as base or similar
          grid[pos.row][pos.col] = Math.random() > 0.6 ? baseChar : getSimilarCharacter(baseChar);
        }
      });
    }
    
    setCharactersGrid(grid);
    setHighlightedPositions([{ row: center, col: center }, ...positions]);
    
    // Adjust show time based on level
    setShowTime(Math.max(300, 1200 - level * 50)); // 1200ms to 300ms
  };

  const startRound = () => {
    generateRound();
    setShowingCharacters(true);
    
    setTimeout(() => {
      setShowingCharacters(false);
    }, showTime);
  };

  const handleAnswer = (answer: 'equal' | 'different') => {
    if (showingCharacters) return;
    
    const isCorrect = answer === correctAnswer;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (isCorrect) {
      setScore(prev => prev + 10 + level * 2); // More points for higher levels
      
      // Level up every 5 correct answers in a row
      if (newAttempts % 5 === 0 && score > 0) {
        const newLevel = Math.min(level + 1, 10);
        setLevel(newLevel);
        saveLevelProgress(newLevel);
      }
    }
    
    setTimeout(() => {
      const newRound = currentRound + 1;
      setCurrentRound(newRound);
      
      if (newRound > 20) { // 20 rounds per game
        handleGameEnd();
      } else {
        startRound();
      }
    }, 800);
  };

  const handleGameEnd = () => {
    if (!startTime) return;
    
    const duration = (Date.now() - startTime.getTime()) / 1000;
    const accuracy = attempts > 0 ? (score / (attempts * (10 + level * 2))) : 0;
    onComplete(score, accuracy, duration);
  };

  const startGame = () => {
    setScore(0);
    setAttempts(0);
    setCurrentRound(1);
    setStartTime(new Date());
    setGameStarted(true);
    startRound();
  };

  const resetGame = () => {
    setGameStarted(false);
    setScore(0);
    setAttempts(0);
    setCurrentRound(1);
    setShowingCharacters(false);
    setCharactersGrid([]);
    setHighlightedPositions([]);
    setStartTime(null);
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
              <h1 className="text-2xl font-bold">Campo de Visión</h1>
              <p className="text-sm text-muted-foreground">Nivel {level} • Distancia {Math.min(2 + Math.floor(level / 2), 5)}</p>
            </div>
          </div>
        </div>

        {/* Game Stats */}
        {gameStarted && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-6">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Ronda: {currentRound}/20
                  </Badge>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Puntos: {score}
                  </Badge>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Precisión: {attempts > 0 ? Math.round((score / (attempts * (10 + level * 2))) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            {!gameStarted ? (
              <div className="text-center space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Entrenamiento de campo visual</h2>
                  <p className="text-muted-foreground mb-4">
                    Mantén la mirada fija en el centro y usa tu visión periférica
                    para comparar los caracteres resaltados. ¡No muevas los ojos!
                  </p>
                  <div className="text-sm text-muted-foreground space-y-2 bg-muted/20 p-4 rounded-lg">
                    <p><strong>Instrucciones:</strong></p>
                    <p>• Fija la vista en el punto central rojo</p>
                    <p>• Determina si los caracteres amarillos (periféricos) son iguales</p>
                    <p>• El nivel aumenta la distancia y usa caracteres más similares</p>
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
              <div className="space-y-6">
                <div className="text-center">
                  <div className="relative">
                    <div 
                      className="grid gap-1 mx-auto"
                      style={{ 
                        gridTemplateColumns: `repeat(${charactersGrid[0]?.length || 7}, minmax(0, 1fr))`,
                        maxWidth: '500px'
                      }}
                    >
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
                              className={`
                                aspect-square flex items-center justify-center font-mono border transition-all duration-200
                                ${charactersGrid[0]?.length <= 7 ? 'text-base' : 'text-sm'}
                                ${isCentral 
                                  ? 'bg-primary text-white border-primary font-bold shadow-glow-primary' 
                                  : isHighlighted 
                                    ? 'bg-warning text-black border-warning font-bold' 
                                    : showingCharacters
                                      ? 'bg-muted text-muted-foreground border-border'
                                      : 'bg-muted/40 text-muted-foreground/40 border-border'
                                }
                              `}
                            >
                              {showingCharacters || isHighlighted ? char : ''}
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {/* Central fixation point */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                    </div>
                  </div>
                </div>

                {!showingCharacters && (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      ¿Los caracteres amarillos (periféricos) son iguales?
                    </p>
                    <div className="flex justify-center gap-4">
                      <Button 
                        onClick={() => handleAnswer('equal')}
                        className="bg-success hover:bg-success/80 text-white"
                        size="lg"
                      >
                        Iguales
                      </Button>
                      <Button 
                        onClick={() => handleAnswer('different')}
                        className="bg-destructive hover:bg-destructive/80 text-white"
                        size="lg"
                      >
                        Diferentes
                      </Button>
                    </div>
                  </div>
                )}

                {showingCharacters && (
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Mantén la vista en el punto rojo central
                    </p>
                  </div>
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
              <p>👁️ CRÍTICO: No mover los ojos del punto central rojo</p>
              <p>🎯 Usa solo tu visión periférica para comparar caracteres</p>
              <p>⚡ Los niveles altos incluyen caracteres similares (M/N, O/Q, I/1)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
