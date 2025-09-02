import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TwinWordsGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

interface WordPair {
  word1: string;
  word2: string;
  isTarget: boolean; // true if words are different (target), false if identical
  found: boolean;
}

export function TwinWordsGame({ onComplete, difficulty = 1, onBack }: TwinWordsGameProps) {
  const { user } = useAuth();
  const [level, setLevel] = useState(difficulty);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [wordPairs, setWordPairs] = useState<WordPair[]>([]);
  const [pairsRemaining, setPairsRemaining] = useState(0);

  const wordsList = [
    "gato", "perro", "casa", "mesa", "libro", "agua", "fuego", "tierra",
    "cielo", "luna", "sol", "mar", "río", "monte", "valle", "flor",
    "papel", "lápiz", "coche", "avión", "barco", "tren", "música", "baile",
    "amor", "paz", "guerra", "tiempo", "espacio", "vida", "muerte", "salud"
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
        .eq('game_code', 'twin_words')
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
          game_code: 'twin_words',
          last_level: newLevel,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving level:', error);
    }
  };

  const generateWordPairs = () => {
    const gridSize = Math.min(4 + Math.floor(level / 2), 7); // 4x4 to 7x7
    const totalPairs = gridSize * 2; // Each row has 2 words
    const targetPairs = Math.ceil(totalPairs * 0.4); // 40% are different pairs (targets)
    
    const shuffledWords = [...wordsList].sort(() => Math.random() - 0.5);
    const pairs: WordPair[] = [];
    
    // Create target pairs (different words)
    for (let i = 0; i < targetPairs; i++) {
      pairs.push({
        word1: shuffledWords[i * 2],
        word2: shuffledWords[i * 2 + 1],
        isTarget: true,
        found: false
      });
    }
    
    // Create non-target pairs (identical words)
    const remainingPairs = totalPairs - targetPairs;
    for (let i = 0; i < remainingPairs; i++) {
      const word = shuffledWords[targetPairs * 2 + i];
      pairs.push({
        word1: word,
        word2: word,
        isTarget: false,
        found: false
      });
    }
    
    // Shuffle the pairs
    pairs.sort(() => Math.random() - 0.5);
    
    setWordPairs(pairs);
    setPairsRemaining(targetPairs);
  };

  const handlePairClick = (pairIndex: number) => {
    if (!gameStarted || wordPairs[pairIndex].found) return;
    
    const pair = wordPairs[pairIndex];
    
    if (pair.isTarget) {
      // Correct - this is a different pair
      setWordPairs(prev => prev.map((p, i) => 
        i === pairIndex ? { ...p, found: true } : p
      ));
      setScore(prev => prev + 20);
      setPairsRemaining(prev => {
        const newRemaining = prev - 1;
        if (newRemaining === 0) {
          // All target pairs found, level up and generate new pairs
          const newLevel = Math.min(level + 1, 10);
          setLevel(newLevel);
          saveLevelProgress(newLevel);
          setTimeout(() => {
            generateWordPairs();
          }, 500);
          return Math.ceil(Math.min(4 + Math.floor(newLevel / 2), 7) * 2 * 0.4);
        }
        return newRemaining;
      });
    } else {
      // Wrong - this is an identical pair
      setErrors(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 5));
    }
  };

  const handleGameEnd = () => {
    const duration = 60 - timeLeft;
    const accuracy = score > 0 ? Math.min(1, score / (score + errors * 5)) : 0;
    onComplete(score, accuracy, duration);
  };

  const startGame = () => {
    generateWordPairs();
    setGameStarted(true);
    setScore(0);
    setErrors(0);
    setTimeLeft(60);
  };

  const resetGame = () => {
    setGameStarted(false);
    setScore(0);
    setErrors(0);
    setTimeLeft(60);
    setWordPairs([]);
    setPairsRemaining(0);
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
              <h1 className="text-2xl font-bold">Palabras Gemelas</h1>
              <p className="text-sm text-muted-foreground">Nivel {level} • Encuentra los pares NO idénticos</p>
            </div>
          </div>
          
          {gameStarted && (
            <div className="text-lg font-mono bg-card/80 px-3 py-1 rounded">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Encuentra todos los pares de palabras diferentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!gameStarted ? (
              <div className="text-center space-y-4">
                <div>
                  <p className="text-muted-foreground mb-4">
                    Busca los pares de palabras que son DIFERENTES entre sí. 
                    Evita los pares idénticos. Mantén la mirada en el centro y percibe en bloques.
                  </p>
                  <div className="text-sm text-muted-foreground space-y-2 bg-muted/20 p-4 rounded-lg">
                    <p><strong>Objetivo:</strong> Encuentra pares como "gato ↔ perro" (diferentes)</p>
                    <p><strong>Evita:</strong> Pares como "casa ↔ casa" (idénticos)</p>
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
                <div className="flex justify-between items-center text-sm">
                  <span>Puntuación: {score}</span>
                  <span>Pares restantes: {pairsRemaining}</span>
                  <span>Errores: {errors}</span>
                </div>
                
                <Progress value={pairsRemaining === 0 ? 100 : ((Math.ceil(Math.min(4 + Math.floor(level / 2), 7) * 2 * 0.4) - pairsRemaining) / Math.ceil(Math.min(4 + Math.floor(level / 2), 7) * 2 * 0.4)) * 100} />
                
                <div className="grid gap-3">
                  {wordPairs.map((pair, index) => (
                    <button
                      key={index}
                      onClick={() => handlePairClick(index)}
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-200 min-h-[60px]
                        flex justify-between items-center touch-manipulation
                        ${pair.found
                          ? 'bg-success/20 border-success text-success'
                          : 'bg-card border-border hover:border-primary/50'
                        }
                      `}
                      disabled={pair.found}
                    >
                      <span className="font-medium">{pair.word1}</span>
                      <span className="text-2xl">↔</span>
                      <span className="font-medium">{pair.word2}</span>
                    </button>
                  ))}
                </div>
                
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
              <p>💡 Percibe en bloques, evita articular las palabras</p>
              <p>🎯 Fijación central - no desplaces la mirada</p>
              <p>⚡ El nivel aumenta automáticamente cuando encuentres todos los pares</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}