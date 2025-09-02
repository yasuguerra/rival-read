import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NeuronAcceleratorGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
}

export function NeuronAcceleratorGame({ onComplete, difficulty = 1 }: NeuronAcceleratorGameProps) {
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'feedback'>('ready');
  const [currentTask, setCurrentTask] = useState<'stroop' | 'flanker'>('stroop');
  const [stimulus, setStimulus] = useState('');
  const [stimulusColor, setStimulusColor] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [currentTrial, setCurrentTrial] = useState(1);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [trialStartTime, setTrialStartTime] = useState(0);

  const colors = ['rojo', 'azul', 'verde', 'amarillo'];
  const colorClasses = {
    'rojo': 'text-red-500',
    'azul': 'text-blue-500', 
    'verde': 'text-green-500',
    'amarillo': 'text-yellow-500'
  };

  const arrows = ['<<<<', '>>>>', '<<>>', '><><'];
  const directions = ['izquierda', 'derecha'];

  const generateStroopTrial = useCallback(() => {
    const word = colors[Math.floor(Math.random() * colors.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    setStimulus(word);
    setStimulusColor(color);
    setCorrectAnswer(color); // Answer based on color, not word
    setTrialStartTime(Date.now());
  }, []);

  const generateFlankerTrial = useCallback(() => {
    const pattern = arrows[Math.floor(Math.random() * arrows.length)];
    const centerArrow = pattern[2]; // Middle character
    const direction = centerArrow === '<' ? 'izquierda' : 'derecha';
    
    setStimulus(pattern);
    setStimulusColor('');
    setCorrectAnswer(direction);
    setTrialStartTime(Date.now());
  }, []);

  const generateTrial = useCallback(() => {
    const taskType = Math.random() > 0.5 ? 'stroop' : 'flanker';
    setCurrentTask(taskType);
    
    if (taskType === 'stroop') {
      generateStroopTrial();
    } else {
      generateFlankerTrial();
    }
  }, [generateStroopTrial, generateFlankerTrial]);

  const startGame = useCallback(() => {
    setScore(0);
    setAttempts(0);
    setCurrentTrial(1);
    setReactionTimes([]);
    setStartTime(Date.now());
    setGamePhase('playing');
    generateTrial();
  }, [generateTrial]);

  const handleAnswer = (answer: string) => {
    if (gamePhase !== 'playing') return;
    
    const reactionTime = Date.now() - trialStartTime;
    const isCorrect = answer === correctAnswer;
    const newAttempts = attempts + 1;
    
    setAttempts(newAttempts);
    setReactionTimes(prev => [...prev, reactionTime]);
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setTimeout(() => {
      if (currentTrial >= 20) {
        const duration = (Date.now() - startTime) / 1000;
        const accuracy = (score / newAttempts) * 100;
        onComplete(score, accuracy, duration);
      } else {
        setCurrentTrial(prev => prev + 1);
        generateTrial();
      }
    }, 500);
  };

  const getAverageReactionTime = () => {
    if (reactionTimes.length === 0) return 0;
    return Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length);
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Acelerador de Neuronas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ejercicios de control inhibitorio y atención selectiva
          </p>
          {gamePhase === 'playing' && (
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="outline">Trial: {currentTrial}/20</Badge>
              <Badge variant="outline">Puntos: {score}</Badge>
              <Badge variant="outline">TR Promedio: {getAverageReactionTime()}ms</Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Responde rápido pero con precisión. Tendrás tareas de Stroop (color vs palabra)
                y Flanker (dirección de flecha central).
              </p>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Stroop:</strong> Responde el COLOR de la palabra, no lo que dice</p>
                <p><strong>Flanker:</strong> Responde la dirección de la flecha CENTRAL</p>
              </div>
              <Button onClick={startGame} className="bg-gradient-primary">
                Comenzar
              </Button>
            </div>
          )}

          {gamePhase === 'playing' && (
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {currentTask === 'stroop' ? 'Di el COLOR de la palabra' : 'Dirección de la flecha CENTRAL'}
                </p>
                
                <div className="text-6xl font-bold mb-8">
                  {currentTask === 'stroop' ? (
                    <span className={colorClasses[stimulusColor as keyof typeof colorClasses]}>
                      {stimulus.toUpperCase()}
                    </span>
                  ) : (
                    <span className="font-mono">
                      {stimulus}
                    </span>
                  )}
                </div>
              </div>

              {currentTask === 'stroop' && (
                <div className="grid grid-cols-2 gap-4">
                  {colors.map(color => (
                    <Button
                      key={color}
                      onClick={() => handleAnswer(color)}
                      className={`h-12 ${colorClasses[color as keyof typeof colorClasses]} border-2`}
                      variant="outline"
                    >
                      {color.toUpperCase()}
                    </Button>
                  ))}
                </div>
              )}

              {currentTask === 'flanker' && (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleAnswer('izquierda')}
                    className="h-12"
                    variant="outline"
                  >
                    ← IZQUIERDA
                  </Button>
                  <Button
                    onClick={() => handleAnswer('derecha')}
                    className="h-12"
                    variant="outline"
                  >
                    DERECHA →
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}