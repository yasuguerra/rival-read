import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/services/analytics';
import type { GameCompleteHandler, GameCompleteExtras } from '@/types/games';

interface NumberMemoryGameProps {
  onComplete: GameCompleteHandler;
  difficulty?: number;
  onBack?: () => void;
}

export function NumberMemoryGame({ onComplete, difficulty = 1, onBack }: NumberMemoryGameProps) {
  const { user } = useAuth();
  const [level, setLevel] = useState(difficulty);
  const [gamePhase, setGamePhase] = useState<'ready' | 'showing' | 'input' | 'feedback'>('ready');
  const [currentNumber, setCurrentNumber] = useState('');
  const [userInput, setUserInput] = useState('');
  const [digits, setDigits] = useState(4); // Start with 4 digits
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [incorrectStreak, setIncorrectStreak] = useState(0);
  const [showTime, setShowTime] = useState(2000);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [roundStartTime, setRoundStartTime] = useState<Date | null>(null);

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
        .eq('game_code', 'number_memory')
        .maybeSingle();
      
      if (data?.last_level) {
        const savedLevel = data.last_level;
        setLevel(savedLevel);
        setDigits(Math.min(3 + savedLevel, 10)); // 4 to 10 digits
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
          game_code: 'number_memory',
          last_level: newLevel,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving level:', error);
    }
  };

  const generateNumber = (length: number) => {
    let number = '';
    for (let i = 0; i < length; i++) {
      number += Math.floor(Math.random() * 10).toString();
    }
    return number;
  };

  const startRound = () => {
    const number = generateNumber(digits);
    setCurrentNumber(number);
    setUserInput('');
    setGamePhase('showing');
    setRoundStartTime(new Date());
    
    setTimeout(() => {
      setGamePhase('input');
    }, showTime);
  };

  const checkAnswer = () => {
    if (!roundStartTime) return;
    
    const isCorrect = userInput === currentNumber;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (isCorrect) {
      setScore(prev => prev + Math.pow(2, digits - 3)); // Exponential scoring: 2^(digits-3)
      setCorrectAttempts(prev => prev + 1);
      setCorrectStreak(prev => {
        const newStreak = prev + 1;
        setIncorrectStreak(0);
        
        // Level up every 3 correct answers
        if (newStreak % 3 === 0) {
          const newLevel = Math.min(level + 1, 10);
          const newDigits = Math.min(3 + newLevel, 10);
          setLevel(newLevel);
          setDigits(newDigits);
          saveLevelProgress(newLevel);
          // Slightly decrease show time as level increases
          setShowTime(prev => Math.max(prev - 50, 1000));
          trackEvent(user?.id, 'level_up', { game: 'number_memory', newLevel });
        }
        
        return newStreak;
      });
  } else {
      setIncorrectStreak(prev => {
        const newStreak = prev + 1;
        setCorrectStreak(0);
        
        // Level down every 3 incorrect answers
  if (newStreak % 3 === 0) {
          const newLevel = Math.max(level - 1, 1);
          const newDigits = Math.max(3 + newLevel, 4);
          setLevel(newLevel);
          setDigits(newDigits);
          saveLevelProgress(newLevel);
          // Slightly increase show time when level decreases
          setShowTime(prev => Math.min(prev + 100, 3000));
        }
        
        return newStreak;
      });
    }
    
    setGamePhase('feedback');
    
    setTimeout(() => {
      if (newAttempts >= 15) { // 15 attempts per game
        handleGameEnd();
      } else {
        setGamePhase('ready');
      }
    }, 1500);
  };

  const handleGameEnd = async () => {
    if (!startTime) return;
    
    const duration = (Date.now() - startTime.getTime()) / 1000;
    const accuracyFraction = attempts > 0 ? correctAttempts / attempts : 0;
    trackEvent(user?.id, 'game_end', { game: 'number_memory', score, accuracy: accuracyFraction * 100, attempts, level, digits });
    const extras: GameCompleteExtras = {
      level,
      metrics: {
        attempts,
        correctAttempts,
        digits
      }
    };
    onComplete(score, accuracyFraction, duration, extras);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && gamePhase === 'input' && userInput.length === digits) {
      checkAnswer();
    }
  };

  const startGame = () => {
    setScore(0);
    setAttempts(0);
  setCorrectStreak(0);
  setIncorrectStreak(0);
  setCorrectAttempts(0);
    setStartTime(new Date());
    setGamePhase('ready');
    trackEvent(user?.id, 'game_start', { game: 'number_memory', level });
  };

  const resetGame = () => {
    setGamePhase('ready');
    setScore(0);
    setAttempts(0);
    setCorrectStreak(0);
    setIncorrectStreak(0);
    setUserInput('');
    setCurrentNumber('');
    setStartTime(null);
    setRoundStartTime(null);
  };

  // Auto-start rounds when in ready state
  useEffect(() => {
    if (gamePhase === 'ready' && startTime) {
      const timer = setTimeout(() => {
        startRound();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, startTime]);

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
              <h1 className="text-2xl font-bold">Recuerde el Número</h1>
              <p className="text-sm text-muted-foreground">Nivel {level} • {digits} dígitos</p>
            </div>
          </div>
        </div>

        {/* Game Stats */}
        {startTime && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Intento</p>
                    <p className="text-xl font-bold text-primary">{attempts + 1}/15</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Puntos</p>
                    <p className="text-xl font-bold text-success">{score}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Racha</p>
                    <p className="text-xl font-bold text-accent">{correctStreak}</p>
                  </div>
                </div>
              </div>
              <Progress value={(attempts / 15) * 100} className="h-2" />
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            {!startTime ? (
              <div className="text-center space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Entrena tu memoria numérica</h2>
                  <p className="text-muted-foreground mb-4">
                    Memoriza y reproduce secuencias de números con dificultad adaptativa.
                  </p>
                  <div className="text-sm text-muted-foreground space-y-2 bg-muted/20 p-4 rounded-lg">
                    <p><strong>Sistema adaptativo:</strong></p>
                    <p>• +1 dígito cada 3 aciertos consecutivos</p>
                    <p>• -1 dígito cada 3 errores consecutivos</p>
                    <p><strong>XP:</strong> Escala exponencialmente con dificultad (2^(dígitos-3))</p>
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
                {gamePhase === 'ready' && (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">Preparándose para mostrar {digits} dígitos...</p>
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                )}

                {gamePhase === 'showing' && (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">Memoriza este número:</p>
                    <div className="text-5xl font-mono font-bold text-primary py-8 bg-primary/10 rounded-lg">
                      {currentNumber}
                    </div>
                    <Progress value={((showTime - (Date.now() - (roundStartTime?.getTime() || 0))) / showTime) * 100} className="h-2" />
                  </div>
                )}

                {gamePhase === 'input' && (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Escribe el número que acabas de ver ({digits} dígitos):
                    </p>
                    <Input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value.replace(/\D/g, '').slice(0, digits))}
                      onKeyPress={handleKeyPress}
                      className="text-center text-3xl font-mono max-w-xs mx-auto h-16"
                      placeholder="Escribe aquí..."
                      autoFocus
                      maxLength={digits}
                    />
                    <div className="flex gap-2 justify-center">
                      <Button 
                        onClick={checkAnswer}
                        disabled={userInput.length !== digits}
                        className="bg-gradient-primary"
                        size="lg"
                      >
                        Confirmar ({userInput.length}/{digits})
                      </Button>
                      <Button variant="outline" onClick={() => setUserInput('')}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Limpiar
                      </Button>
                    </div>
                  </div>
                )}

                {gamePhase === 'feedback' && (
                  <div className="text-center space-y-4">
                    <div className={`text-3xl font-bold ${
                      userInput === currentNumber ? 'text-success' : 'text-destructive'
                    }`}>
                      {userInput === currentNumber ? '¡Correcto!' : '¡Incorrecto!'}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="bg-muted/20 p-4 rounded-lg">
                        <p><strong>Número correcto:</strong> {currentNumber}</p>
                        <p><strong>Tu respuesta:</strong> {userInput || 'Sin respuesta'}</p>
                        {userInput === currentNumber && (
                          <p className="text-success"><strong>+{Math.pow(2, digits - 3)} XP</strong></p>
                        )}
                      </div>
                    </div>
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
              <p>💡 Estrategias: chunking (agrupa números), repetición mental, asociaciones</p>
              <p>🧠 Memoria inmediata: el tiempo de visualización disminuye con el nivel</p>
              <p>⚡ Sistema adaptativo: la dificultad se ajusta automáticamente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}