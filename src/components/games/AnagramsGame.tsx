import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AnagramsGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

export function AnagramsGame({ onComplete, difficulty = 1, onBack }: AnagramsGameProps) {
  const { user } = useAuth();
  const [level, setLevel] = useState(difficulty);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [scrambledWord, setScrambledWord] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  // Used to force remount of option buttons every round so no residual styles persist
  const [roundId, setRoundId] = useState(0);
  
  // When round changes, ensure no element keeps focus (mobile purple highlight)
  useEffect(() => {
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }, 0);
  }, [roundId]);

  const wordsByLength = {
    4: ['casa', 'mesa', 'agua', 'luna', 'gato', 'perro', 'libro', 'papel', 'verde', 'azul', 'rojo', 'amor'],
    5: ['blanco', 'negro', 'grande', 'pequeño', 'cielo', 'tierra', 'fuego', 'viento'],
    6: ['amigos', 'cabeza', 'escuela', 'trabajo', 'familia', 'música', 'deporte'],
    7: ['corazón', 'hermano', 'ciencia', 'historia', 'cultura'],
    8: ['montaña', 'medicina', 'universo', 'naturaleza']
  };

  // Load saved level on component mount
  useEffect(() => {
    loadSavedLevel();
  }, [user]);

  // Timer effect
  useEffect(() => {
    if (gameStarted && timeLeft > 0 && !feedback) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !feedback) {
      handleAnswer(''); // Time's up
    }
  }, [gameStarted, timeLeft, feedback]);

  const loadSavedLevel = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('user_game_state')
        .select('last_level')
        .eq('user_id', user.id)
        .eq('game_code', 'anagrams')
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
          game_code: 'anagrams',
          last_level: newLevel,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving level:', error);
    }
  };

  const scrambleWord = (word: string) => {
    const letters = word.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    const scrambled = letters.join('');
    return scrambled === word ? scrambleWord(word) : scrambled; // Ensure it's different
  };

  const generateWrongOptions = (word: string, count: number) => {
    const options = new Set<string>();
    const allWords = Object.values(wordsByLength).flat();
    
    // Add some scrambled versions that are NOT the original word
    while (options.size < count) {
      let wrongOption;
      if (Math.random() > 0.5) {
        // Create a scrambled version that's not the original
        wrongOption = scrambleWord(word);
        // Make sure it's different from the original word
        if (wrongOption === word) continue;
      } else {
        // Use a word of similar length
        const similarLengthWords = allWords.filter(w => 
          Math.abs(w.length - word.length) <= 1 && w !== word
        );
        if (similarLengthWords.length > 0) {
          wrongOption = similarLengthWords[Math.floor(Math.random() * similarLengthWords.length)];
        } else {
          wrongOption = scrambleWord(word);
        }
      }
      
      options.add(wrongOption);
    }
    
    return Array.from(options);
  };
  const generateRound = () => {
    const wordLength = Math.min(4 + Math.floor(level / 2), 8);
    const optionsCount = Math.min(3 + Math.floor(level / 3), 6);
    const availableWords = Object.entries(wordsByLength)
      .filter(([length]) => parseInt(length) === wordLength)
      .flatMap(([, w]) => w);
    const allWordsFlat = Object.values(wordsByLength).flat();
    const selectedWord = (availableWords.length > 0
      ? availableWords[Math.floor(Math.random() * availableWords.length)]
      : allWordsFlat[Math.floor(Math.random() * allWordsFlat.length)]) || 'casa';
    setCurrentWord(selectedWord);
    const scrambled = scrambleWord(selectedWord);
    const wrongOptions = generateWrongOptions(selectedWord, optionsCount - 1);
    const allOptions = [selectedWord, ...wrongOptions].sort(() => Math.random() - 0.5);
    setScrambledWord(scrambled);
    setOptions(allOptions);
    setCorrectAnswer(selectedWord);
    setFeedback(null);
    setSelectedIndex(null);
  setRoundId(prev => prev + 1); // advance round key
  };

  const handleAnswer = (selectedWord: string, idx?: number) => {
    if (feedback) return;
    if (typeof idx === 'number') setSelectedIndex(idx);
    
    const isCorrect = selectedWord === correctAnswer;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      setScore(prev => prev + correctAnswer.length * 5); // More points for longer words
    } else {
      setErrors(prev => prev + 1);
    }
    
    setTimeout(() => {
      setRoundsCompleted(prev => {
        const newRounds = prev + 1;
        
        // Check if should level up (every 5 correct answers)
        if (isCorrect && (score + correctAnswer.length * 5) % 50 === 0) {
          const newLevel = Math.min(level + 1, 10);
          setLevel(newLevel);
          saveLevelProgress(newLevel);
        }
        
        if (timeLeft <= 5) {
          // Game ending
          handleGameEnd();
        } else {
          // Generate new round
          generateRound();
        }
        
        return newRounds;
      });
    }, 1500);
  };
  const handleGameEnd = () => {
    if (!startTime) return;
    const duration = (Date.now() - startTime.getTime()) / 1000;
    const accuracy = roundsCompleted > 0 ? Math.min(1, score / (score + errors * 10)) : 0;
    onComplete(score, accuracy, duration);
  };

  const startGame = () => {
    generateRound();
    setGameStarted(true);
    setScore(0);
    setErrors(0);
    setTimeLeft(60);
    setRoundsCompleted(0);
    setStartTime(new Date());
  };

  const resetGame = () => {
    setGameStarted(false);
    setScore(0);
    setErrors(0);
    setTimeLeft(60);
    setRoundsCompleted(0);
    setFeedback(null);
    setSelectedIndex(null);
    setCurrentWord('');
    setScrambledWord('');
    setOptions([]);
    setCorrectAnswer('');
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
              <h1 className="text-2xl font-bold">Anagramas</h1>
              <p className="text-sm text-muted-foreground">Nivel {level} • Palabras de {Math.min(4 + Math.floor(level / 2), 8)} letras</p>
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
                    <p className="text-sm text-muted-foreground">Rondas</p>
                    <p className="text-xl font-bold text-primary">{roundsCompleted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Puntos</p>
                    <p className="text-xl font-bold text-success">{score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Errores</p>
                    <p className="text-xl font-bold text-destructive">{errors}</p>
                  </div>
                </div>
              </div>
              <Progress value={(60 - timeLeft) / 60 * 100} className="h-2" />
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            {!gameStarted ? (
              <div className="text-center space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Encuentra la palabra correcta</h2>
                  <p className="text-muted-foreground mb-4">
                    Reordena mentalmente las letras para formar la palabra correcta.
                    Busca patrones de prefijos y sufijos comunes.
                  </p>
                  <div className="text-sm text-muted-foreground space-y-2 bg-muted/20 p-4 rounded-lg">
                    <p><strong>Objetivo:</strong> Identifica el anagrama correcto en 60 segundos</p>
                    <p><strong>Estrategia:</strong> Prueba permutaciones por prefijos/sufijos</p>
                    <p><strong>Nivel {level}:</strong> Palabras de {Math.min(4 + Math.floor(level / 2), 8)} letras</p>
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
                {/* Scrambled Word */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Palabra enigmática:</h3>
                  <div className="text-4xl font-bold text-primary bg-primary/10 rounded-lg py-4 px-6 inline-block">
                    {scrambledWord.toUpperCase()}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <h4 className="text-center font-semibold">Selecciona el anagrama correcto:</h4>
                  <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    {options.map((option, index) => {
                      const stateClasses = feedback
                        ? (option === correctAnswer
                            ? 'bg-success/20 border-success text-success'
                            : index === selectedIndex && feedback === 'incorrect'
                              ? 'bg-destructive/20 border-destructive text-destructive'
                              : 'opacity-60')
                        : 'bg-background border-border/40 text-foreground hover:bg-muted/40';
                      return (
                        <Button
                          key={`${roundId}-${index}`}
                          variant="outline"
                          className={`h-12 text-lg font-medium transition-all duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-0 ${stateClasses}`}
                          onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); handleAnswer(option, index); }}
                          disabled={!!feedback}
                        >
                          {option}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Feedback */}
                {feedback && (
                  <div className={`text-center text-lg font-semibold transition-all duration-300 ${
                    feedback === 'correct' ? 'text-success' : 'text-destructive'
                  }`}>
                    {feedback === 'correct' ? '¡Correcto!' : '¡Incorrecto!'}
                    {feedback === 'incorrect' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        La respuesta correcta era: <strong>{correctAnswer}</strong>
                      </p>
                    )}
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
              <p>💡 Busca patrones comunes: prefijos como "des-", "pre-", sufijos como "-ción", "-mente"</p>
              <p>🎯 Detecta bigramas y trigramas frecuentes en español</p>
              <p>⚡ El nivel aumenta automáticamente cada 50 puntos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}