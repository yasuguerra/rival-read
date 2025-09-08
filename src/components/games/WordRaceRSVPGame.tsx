import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePersistentGameLevel } from '@/hooks/usePersistentGameLevel';
import { trackEvent } from '@/services/analytics';
import { recordGameRun } from '@/services/gameRuns';
import { computeGameXp, awardXp } from '@/services/xp';

interface WordRaceRSVPGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

const WORD_BANK = [
  'casa', 'perro', 'gato', 'árbol', 'agua', 'fuego', 'tierra', 'cielo', 'luna', 'sol',
  'libro', 'mesa', 'silla', 'ventana', 'puerta', 'flor', 'jardín', 'montaña', 'río', 'mar',
  'tiempo', 'mundo', 'vida', 'amor', 'paz', 'guerra', 'música', 'arte', 'color', 'luz',
  'noche', 'día', 'hora', 'minuto', 'segundo', 'año', 'mes', 'semana', 'trabajo', 'estudio',
  'familia', 'amigo', 'persona', 'niño', 'adulto', 'ciudad', 'país', 'viaje', 'camino', 'coche'
];

export function WordRaceRSVPGame({ onComplete, difficulty = 1, onBack }: WordRaceRSVPGameProps) {
  const { user } = useAuth();
  const [gamePhase, setGamePhase] = useState<'ready' | 'showing' | 'answering' | 'feedback' | 'summary'>('ready');
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [targetWord, setTargetWord] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [level, setLevel] = useState(Math.max(1, Math.floor(difficulty)));
  usePersistentGameLevel({ userId: user?.id, gameCode: 'word_race_rsvp', level, setLevel });

  const getDisplayTimeForLevel = (lvl: number) => Math.max(900 - lvl * 80, 180);
  const getSequenceLengthForLevel = (lvl: number) => Math.min(4 + lvl, 12);

  const [wordDisplayTime, setWordDisplayTime] = useState(getDisplayTimeForLevel(level));
  const [sequenceLength, setSequenceLength] = useState(getSequenceLengthForLevel(level));
  const [streak, setStreak] = useState(0);
  const [sequenceHistory, setSequenceHistory] = useState<Array<{words: string[]; target: string; correct: boolean}>>([]);

  useEffect(() => {
    setWordDisplayTime(getDisplayTimeForLevel(level));
    setSequenceLength(getSequenceLengthForLevel(level));
  }, [level]);

  const maxAttempts = 10;

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
  // Telemetry (reuse game_start semantics for sequence instrumentation)
  trackEvent(user?.id, 'game_start', { game: 'word_race_rsvp', sequenceLength, displayMs: wordDisplayTime });
  }, [sequenceLength, user?.id, wordDisplayTime]);

  const startSequence = useCallback(() => {
    if (attempts === 0) setStartTime(Date.now());
    generateSequence();
    setGamePhase('showing');
  }, [generateSequence, attempts]);

  const showNextWord = useCallback(() => {
    if (currentWordIndex < currentWords.length - 1) {
      setTimeout(() => {
        setCurrentWordIndex(prev => prev + 1);
      }, wordDisplayTime);
    } else {
      setTimeout(() => {
        setGamePhase('answering');
  trackEvent(user?.id, 'level_up', { game: 'word_race_rsvp', sequenceLength, displayMs: wordDisplayTime });
      }, wordDisplayTime);
    }
  }, [currentWordIndex, currentWords.length, wordDisplayTime, user?.id, sequenceLength]);

  const checkAnswer = useCallback((answer: string) => {
    if (gamePhase !== 'answering') return;
    setSelectedAnswer(answer);
    const isCorrect = answer === targetWord;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setSequenceHistory(prev => [...prev, { words: currentWords, target: targetWord, correct: isCorrect }]);
  trackEvent(user?.id, isCorrect ? 'level_up' : 'xp_gain', { game: 'word_race_rsvp', correct: isCorrect, sequenceLength, displayMs: wordDisplayTime });

    if (isCorrect) {
      setScore(prev => prev + 1);
      setStreak(prev => prev + 1);
      setLevel(prev => prev + 1);
    } else {
      setStreak(0);
      setLevel(prev => Math.max(1, prev - 1));
    }

    setGamePhase('feedback');

    setTimeout(() => {
      if (newAttempts >= maxAttempts) {
        const accuracy = newAttempts > 0 ? ( (score + (isCorrect ? 1 : 0)) / newAttempts) * 100 : 0;
        const duration = (Date.now() - startTime) / 1000;
        const xp = computeGameXp('word_race_rsvp' as any, { score: score + (isCorrect ? 1 : 0), accuracy, level });
        if (user) {
          recordGameRun({ userId: user.id, gameCode: 'word_race_rsvp', level, score: score + (isCorrect ? 1 : 0), accuracy, durationSec: duration, params: { attempts: newAttempts } });
          awardXp(user.id, xp, 'game', { game: 'word_race_rsvp' });
        }
        trackEvent(user?.id, 'game_end', { game: 'word_race_rsvp', score: score + (isCorrect ? 1 : 0), accuracy, attempts: newAttempts });
        setGamePhase('summary');
        onComplete(score + (isCorrect ? 1 : 0), accuracy, duration);
      } else {
        setGamePhase('ready');
      }
    }, 1600);
    }, [gamePhase, targetWord, attempts, score, startTime, onComplete, sequenceLength, wordDisplayTime, streak, user, level, currentWords]);

  useEffect(() => {
    if (gamePhase === 'showing' && currentWords.length > 0) {
      showNextWord();
    }
  }, [gamePhase, currentWordIndex, showNextWord, currentWords.length]);

  const progressValue = gamePhase === 'showing'
    ? ((currentWordIndex + 1) / Math.max(1, currentWords.length)) * 100
    : (attempts / maxAttempts) * 100;

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="outline" size="icon" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex-1 text-center">
              <CardTitle className="text-2xl">Carrera de Palabras RSVP</CardTitle>
              <p className="text-sm text-muted-foreground">
                Intento {Math.min(attempts + 1, maxAttempts)} de {maxAttempts} | Secuencia: {sequenceLength} palabras
              </p>
              <p className="text-xs text-muted-foreground">
                Puntuación: {score}/{attempts}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Progress value={progressValue} className="h-2" />
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Observa la secuencia de palabras y recuerda la última.
              </p>
              <Button onClick={startSequence} className="bg-gradient-primary">
                {attempts === 0 ? 'Comenzar' : 'Siguiente'}
              </Button>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Velocidad actual: {Math.round(60000 / wordDisplayTime)} ppm (palabras mostradas por min aprox)</p>
                <p>Tiempo por palabra: {wordDisplayTime} ms • Racha: {streak}</p>
              </div>
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
            <div className="text-center space-y-3">
              <div className={`text-2xl font-bold ${selectedAnswer === targetWord ? 'text-success' : 'text-destructive'}`}> 
                {selectedAnswer === targetWord ? '¡Correcto!' : '¡Incorrecto!'}
              </div>
              <p className="text-sm text-muted-foreground">Secuencia: {currentWords.join(' · ')}</p>
              <p className="text-xs text-muted-foreground">Siguiente secuencia en breve…</p>
            </div>
          )}

          {gamePhase === 'summary' && (
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Resumen</h3>
              <p className="text-muted-foreground text-sm">Precisión: {attempts > 0 ? Math.round((score/attempts)*100) : 0}% • Puntuación: {score}</p>
              <div className="max-h-40 overflow-auto text-left text-xs bg-muted/30 p-3 rounded border border-border/50">
                {sequenceHistory.map((s,i) => (
                  <div key={i} className={`flex justify-between py-0.5 ${s.correct ? 'text-success' : 'text-destructive'}`}> 
                    <span>{i+1}. {s.words.slice(0,-1).join(' ')} → <strong>{s.target}</strong></span>
                    <span>{s.correct ? '✔' : '✖'}</span>
                  </div>
                ))}
              </div>
                <Button onClick={() => { setAttempts(0); setScore(0); setStreak(0); setSequenceHistory([]); setGamePhase('ready'); }}>
                  Reiniciar Sesión
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}