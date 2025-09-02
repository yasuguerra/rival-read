import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RotateCcw } from 'lucide-react';

interface NumberMemoryGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
}

export function NumberMemoryGame({ onComplete, difficulty = 1 }: NumberMemoryGameProps) {
  const [gamePhase, setGamePhase] = useState<'ready' | 'showing' | 'input' | 'feedback'>('ready');
  const [currentNumber, setCurrentNumber] = useState('');
  const [userInput, setUserInput] = useState('');
  const [currentLevel, setCurrentLevel] = useState(3 + difficulty);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [showTime, setShowTime] = useState(2000);

  const generateNumber = useCallback((length: number) => {
    let number = '';
    for (let i = 0; i < length; i++) {
      number += Math.floor(Math.random() * 10).toString();
    }
    return number;
  }, []);

  const startRound = useCallback(() => {
    const number = generateNumber(currentLevel);
    setCurrentNumber(number);
    setUserInput('');
    setGamePhase('showing');
    
    setTimeout(() => {
      setGamePhase('input');
      setStartTime(Date.now());
    }, showTime);
  }, [currentLevel, showTime, generateNumber]);

  const checkAnswer = useCallback(() => {
    const isCorrect = userInput === currentNumber;
    const newAttempts = attempts + 1;
    
    setAttempts(newAttempts);
    
    if (isCorrect) {
      setScore(score + 1);
      setCurrentLevel(prev => Math.min(prev + 1, 12));
      setShowTime(prev => Math.max(prev - 50, 1000));
    } else {
      setCurrentLevel(prev => Math.max(prev - 1, 3));
      setShowTime(prev => Math.min(prev + 100, 3000));
    }
    
    setGamePhase('feedback');
    
    setTimeout(() => {
      if (newAttempts >= 10) {
        const accuracy = (score / newAttempts) * 100;
        const duration = (Date.now() - startTime) / 1000;
        onComplete(score, accuracy, duration);
      } else {
        setGamePhase('ready');
      }
    }, 1500);
  }, [userInput, currentNumber, attempts, score, startTime, onComplete]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && gamePhase === 'input') {
      checkAnswer();
    }
  };

  useEffect(() => {
    if (gamePhase === 'ready' && attempts === 0) {
      startRound();
    }
  }, [gamePhase, attempts, startRound]);

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Recuerde el Número</CardTitle>
          <p className="text-sm text-muted-foreground">
            Intento {attempts + 1} de 10 | Nivel: {currentLevel} dígitos
          </p>
          <p className="text-xs text-muted-foreground">
            Puntuación: {score}/{attempts}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Preparándose...</p>
              <Button onClick={startRound} className="bg-gradient-primary">
                Comenzar
              </Button>
            </div>
          )}

          {gamePhase === 'showing' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Memoriza este número:</p>
              <div className="text-4xl font-mono font-bold text-primary py-8">
                {currentNumber}
              </div>
            </div>
          )}

          {gamePhase === 'input' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Escribe el número que acabas de ver:
              </p>
              <Input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value.replace(/\D/g, ''))}
                onKeyPress={handleKeyPress}
                className="text-center text-2xl font-mono"
                placeholder="Escribe el número..."
                autoFocus
                maxLength={currentLevel}
              />
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={checkAnswer}
                  disabled={userInput.length !== currentLevel}
                  className="bg-gradient-primary"
                >
                  Confirmar
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
              <div className={`text-2xl font-bold ${
                userInput === currentNumber ? 'text-success' : 'text-destructive'
              }`}>
                {userInput === currentNumber ? '¡Correcto!' : '¡Incorrecto!'}
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Número correcto: {currentNumber}</p>
                <p>Tu respuesta: {userInput || 'Sin respuesta'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}