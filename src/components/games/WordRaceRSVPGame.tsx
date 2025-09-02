import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface WordRaceRSVPGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
}

const WORD_BANK = [
  'casa', 'perro', 'gato', 'árbol', 'agua', 'fuego', 'tierra', 'cielo', 'luna', 'sol',
  'libro', 'mesa', 'silla', 'ventana', 'puerta', 'flor', 'jardín', 'montaña', 'río', 'mar',
  'tiempo', 'mundo', 'vida', 'amor', 'paz', 'guerra', 'música', 'arte', 'color', 'luz',
  'noche', 'día', 'hora', 'minuto', 'segundo', 'año', 'mes', 'semana', 'trabajo', 'estudio',
  'familia', 'amigo', 'persona', 'niño', 'adulto', 'ciudad', 'país', 'viaje', 'camino', 'coche'
];

export function WordRaceRSVPGame({ onComplete, difficulty = 1 }: WordRaceRSVPGameProps) {
  const [gamePhase, setGamePhase] = useState<'ready' | 'showing' | 'answering' | 'feedback'>('ready');
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [targetWord, setTargetWord] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [wordDisplayTime, setWordDisplayTime] = useState(800 - (difficulty * 100));
  const [sequenceLength, setSequenceLength] = useState(5 + difficulty);

  const generateSequence = useCallback(() => {
    const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
    const sequence = shuffled.slice(0, sequenceLength);
    const target = sequence[sequence.length - 1]; // La última palabra es el objetivo
    
    // Generar opciones (target + 3 distractores)
    const distractors = shuffled.filter(word => !sequence.includes(word)).slice(0, 3);
    const allOptions = [target, ...distractors].sort(() => Math.random() - 0.5);
    
    setCurrentWords(sequence);
    setTargetWord(target);
    setOptions(allOptions);
    setCurrentWordIndex(0);
    setSelectedAnswer('');
  }, [sequenceLength]);

  const startSequence = useCallback(() => {
    generateSequence();
    setGamePhase('showing');
    setStartTime(Date.now());
  }, [generateSequence]);

  const showNextWord = useCallback(() => {
    if (currentWordIndex < currentWords.length - 1) {
      setTimeout(() => {
        setCurrentWordIndex(prev => prev + 1);
      }, wordDisplayTime);
    } else {
      setTimeout(() => {
        setGamePhase('answering');
      }, wordDisplayTime);
    }
  }, [currentWordIndex, currentWords.length, wordDisplayTime]);

  const checkAnswer = useCallback((answer: string) => {
    setSelectedAnswer(answer);
    const isCorrect = answer === targetWord;
    const newAttempts = attempts + 1;
    
    setAttempts(newAttempts);
    
    if (isCorrect) {
      setScore(score + 1);
      setWordDisplayTime(prev => Math.max(prev - 20, 200));
      setSequenceLength(prev => Math.min(prev + 1, 10));
    } else {
      setWordDisplayTime(prev => Math.min(prev + 50, 1200));
      setSequenceLength(prev => Math.max(prev - 1, 3));
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
    }, 2000);
  }, [targetWord, attempts, score, startTime, onComplete]);

  useEffect(() => {
    if (gamePhase === 'showing' && currentWords.length > 0) {
      showNextWord();
    }
  }, [gamePhase, currentWordIndex, showNextWord, currentWords.length]);

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Carrera de Palabras RSVP</CardTitle>
          <p className="text-sm text-muted-foreground">
            Intento {attempts + 1} de 10 | Secuencia: {sequenceLength} palabras
          </p>
          <p className="text-xs text-muted-foreground">
            Puntuación: {score}/{attempts}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Observa la secuencia de palabras y recuerda la última.
              </p>
              <Button onClick={startSequence} className="bg-gradient-primary">
                {attempts === 0 ? 'Comenzar' : 'Siguiente'}
              </Button>
            </div>
          )}

          {gamePhase === 'showing' && (
            <div className="text-center">
              <div className="h-32 flex items-center justify-center">
                <div className="text-4xl font-bold text-primary animate-pulse">
                  {currentWords[currentWordIndex]}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Palabra {currentWordIndex + 1} de {currentWords.length}
              </div>
            </div>
          )}

          {gamePhase === 'answering' && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                ¿Cuál fue la última palabra que viste?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => checkAnswer(option)}
                    className="py-3 text-lg hover:bg-primary/20"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {gamePhase === 'feedback' && (
            <div className="text-center space-y-4">
              <div className={`text-2xl font-bold ${
                selectedAnswer === targetWord ? 'text-success' : 'text-destructive'
              }`}>
                {selectedAnswer === targetWord ? '¡Correcto!' : '¡Incorrecto!'}
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Última palabra: <strong>{targetWord}</strong></p>
                <p>Tu respuesta: <strong>{selectedAnswer}</strong></p>
                <p>Secuencia completa: {currentWords.join(' → ')}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}