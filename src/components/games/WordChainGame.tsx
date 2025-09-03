import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowLeft } from 'lucide-react';

interface WordChainGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

const WORD_BANK = [
  'casa', 'perro', 'gato', 'árbol', 'agua', 'fuego', 'tierra', 'cielo', 'luna', 'sol',
  'libro', 'mesa', 'silla', 'ventana', 'puerta', 'flor', 'jardín', 'montaña', 'río', 'mar',
  'tiempo', 'mundo', 'vida', 'amor', 'paz', 'guerra', 'música', 'arte', 'color', 'luz',
  'noche', 'día', 'hora', 'minuto', 'segundo', 'año', 'mes', 'semana', 'trabajo', 'estudio',
  'familia', 'amigo', 'persona', 'niño', 'adulto', 'ciudad', 'país', 'viaje', 'camino', 'coche',
  'escuela', 'profesor', 'estudiante', 'clase', 'examen', 'nota', 'ejercicio', 'tarea', 'proyecto'
];

export function WordChainGame({ onComplete, difficulty = 1, onBack }: WordChainGameProps) {
  const [gamePhase, setGamePhase] = useState<'ready' | 'showing' | 'selecting' | 'feedback'>('ready');
  const [targetSequence, setTargetSequence] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [showTime, setShowTime] = useState(3000 - (difficulty * 200));
  const [sequenceLength, setSequenceLength] = useState(Math.min(2 + difficulty - 1, 8)); // Start at 2 for level 1

  const generateSequence = useCallback(() => {
    const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
    const sequence = shuffled.slice(0, sequenceLength);
    
    // Generar palabras adicionales para las opciones (sequence + distractores)
    const distractors = shuffled.slice(sequenceLength, sequenceLength + 6);
    const allWords = [...sequence, ...distractors].sort(() => Math.random() - 0.5);
    
    setTargetSequence(sequence);
    setAvailableWords(allWords);
    setSelectedWords([]);
  }, [sequenceLength]);

  const startRound = useCallback(() => {
    generateSequence();
    setGamePhase('showing');
    setStartTime(Date.now());
    
    setTimeout(() => {
      setGamePhase('selecting');
    }, showTime);
  }, [generateSequence, showTime]);

  const selectWord = useCallback((word: string) => {
    // Permitir toggle: si ya está, quitar (ergonomía / deshacer)
    setSelectedWords(prev => {
      if (prev.includes(word)) {
        return prev.filter(w => w !== word);
      }
      // impedir exceder longitud objetivo
      if (prev.length >= targetSequence.length) return prev;
      return [...prev, word];
    });
  }, [targetSequence.length]);

  const removeWord = useCallback((word: string) => {
    setSelectedWords(prev => prev.filter(w => w !== word));
  }, []);

  const checkAnswer = useCallback(() => {
    const isCorrect = selectedWords.length === targetSequence.length &&
                     selectedWords.every((word, index) => word === targetSequence[index]);
    
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (isCorrect) {
      setScore(s => s + 1);
      setSequenceLength(prev => Math.min(prev + 1, 8));
      setShowTime(prev => Math.max(prev - 100, 1500));
    } else {
      setSequenceLength(prev => Math.max(prev - 1, 2));
      setShowTime(prev => Math.min(prev + 200, 4000));
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
    }, 3000);
  }, [selectedWords, targetSequence, attempts, score, startTime, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button variant="outline" size="icon" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <CardTitle className="text-2xl">Cadena de Palabras</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Intento {attempts + 1} de 10 | Secuencia: {sequenceLength} palabras
                </p>
                <p className="text-xs text-muted-foreground">
                  Puntuación: {score}/{attempts}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Memoriza la secuencia de palabras y luego selecciónalas en el mismo orden.
              </p>
              <Button onClick={startRound} className="bg-gradient-primary">
                {attempts === 0 ? 'Comenzar' : 'Siguiente'}
              </Button>
            </div>
          )}

          {gamePhase === 'showing' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Memoriza esta secuencia:</p>
              <div className="flex flex-wrap justify-center gap-3 py-8">
                {targetSequence.map((word, index) => (
                  <Badge key={index} variant="secondary" className="text-lg px-4 py-2">
                    {word}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Mantén la mirada en el centro y percibe toda la secuencia
              </p>
            </div>
          )}

          {gamePhase === 'selecting' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Selecciona las palabras en el mismo orden:
                </p>
              </div>
              
              {/* Palabras seleccionadas */}
              <div className="min-h-[60px] p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-xs text-muted-foreground mb-2">Tu secuencia:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedWords.map((word, index) => (
                    <Badge 
                      key={index} 
                      variant="default" 
                      className="cursor-pointer bg-primary text-primary-foreground"
                      onClick={() => removeWord(word)}
                    >
                      {index + 1}. {word} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                  {selectedWords.length === 0 && (
                    <span className="text-muted-foreground text-sm">
                      Haz clic en las palabras para seleccionarlas...
                    </span>
                  )}
                </div>
              </div>

              {/* Opciones disponibles */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Palabras disponibles:</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {availableWords.map((word, index) => (
                    <Button
                      key={index}
                      variant={selectedWords.includes(word) ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => selectWord(word)}
                      disabled={selectedWords.includes(word)}
                      className="text-sm"
                    >
                      {word}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <Button 
                  onClick={checkAnswer}
                  disabled={selectedWords.length !== targetSequence.length}
                  className="bg-gradient-primary"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Secuencia
                </Button>
              </div>
            </div>
          )}

          {gamePhase === 'feedback' && (
            <div className="text-center space-y-4">
              <div className={`text-2xl font-bold ${
                selectedWords.length === targetSequence.length &&
                selectedWords.every((word, index) => word === targetSequence[index])
                  ? 'text-success' : 'text-destructive'
              }`}>
                {selectedWords.length === targetSequence.length &&
                 selectedWords.every((word, index) => word === targetSequence[index])
                  ? '¡Correcto!' : '¡Incorrecto!'}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Secuencia correcta:</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-1">
                    {targetSequence.map((word, index) => (
                      <Badge key={index} variant="secondary">
                        {index + 1}. {word}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Tu secuencia:</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-1">
                    {selectedWords.map((word, index) => (
                      <Badge 
                        key={index} 
                        variant={word === targetSequence[index] ? "default" : "destructive"}
                      >
                        {index + 1}. {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}