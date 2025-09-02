import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Zap, Brain, Target, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { recordGameRun } from '@/services/gameRuns';
import { awardXp, computeGameXp } from '@/services/xp';
import { trackEvent } from '@/services/analytics';

interface WordRaceGameProps {
  onComplete: (score: number, accuracy: number, durationSec: number) => void;
  difficulty: number;
  onBack?: () => void;
}

const sampleTexts = [
  "La lectura rápida es una habilidad que se puede desarrollar con práctica constante. Los ejercicios de entrenamiento visual ayudan a expandir el campo de visión y reducir las regresiones durante la lectura.",
  "El cerebro humano tiene una capacidad increíble para procesar información visual. Cuando entrenamos nuestra atención y memoria de trabajo, podemos mejorar significativamente nuestra velocidad de comprensión.",
  "Los videojuegos cognitivos han demostrado ser efectivos para mejorar habilidades como la atención selectiva, la memoria a corto plazo y la velocidad de procesamiento visual.",
  "La tecnología de inteligencia artificial está revolucionando la educación personalizada. Los sistemas adaptativos pueden ajustar la dificultad según el rendimiento individual de cada estudiante.",
  "La neuroplasticidad es la capacidad del cerebro para reorganizarse y formar nuevas conexiones neuronales. Esta característica permite que podamos aprender y mejorar habilidades cognitivas a cualquier edad."
];

export function WordRaceGame({ onComplete, difficulty, onBack }: WordRaceGameProps) {
  const { user } = useAuth();
  const baseWPM = 150 + (difficulty * 25); // 150-400 WPM range
  const wordsPerChunk = Math.min(1 + Math.floor(difficulty / 2), 3); // 1-3 words per chunk
  
  const [text, setText] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(baseWPM);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [canGoBack, setCanGoBack] = useState(true);

  const generateQuestions = useCallback((textContent: string) => {
    const sentences = textContent.split('.').filter(s => s.trim().length > 10);
    const questionTemplates = [
      {
        type: 'main_topic',
        question: '¿Cuál es el tema principal del texto?',
        correct: 0,
        options: ['Lectura rápida', 'Cocina italiana', 'Historia antigua', 'Deportes extremos']
      },
      {
        type: 'detail',
        question: '¿Qué se menciona sobre el entrenamiento?',
        correct: 1,
        options: ['Es imposible', 'Mejora las habilidades', 'Es muy costoso', 'Solo funciona en niños']
      },
      {
        type: 'comprehension',
        question: 'Según el texto, ¿qué factor es importante para mejorar?',
        correct: 0,
        options: ['La práctica constante', 'La suerte', 'La edad joven', 'El dinero']
      }
    ];

    return questionTemplates.slice(0, 3);
  }, []);

  // Initialize game
  useEffect(() => {
    const selectedText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    setText(selectedText);
    const wordArray = selectedText.split(' ').filter(w => w.trim().length > 0);
    setWords(wordArray);
    setQuestions(generateQuestions(selectedText));
  }, [generateQuestions]);

  // Auto-advance words
  useEffect(() => {
    if (!isPlaying || currentIndex >= words.length) return;

    const intervalMs = (60 / wpm) * 1000 * wordsPerChunk;
    const interval = setInterval(() => {
      setCurrentIndex(prev => Math.min(prev + wordsPerChunk, words.length));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, words.length, wpm, wordsPerChunk]);

  // Check if reading is complete
  useEffect(() => {
    if (currentIndex >= words.length && words.length > 0 && !showQuestions) {
      setIsPlaying(false);
      setShowQuestions(true);
    }
  }, [currentIndex, words.length, showQuestions]);

  const handlePlay = () => {
    if (!startTime) {
      setStartTime(new Date());
      trackEvent(user?.id, 'game_start', { game: 'word_race', difficulty });
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setStartTime(null);
    setShowQuestions(false);
    setCurrentQuestion(0);
    setAnswers([]);
  };

  const handleGoBack = () => {
    if (canGoBack && currentIndex > 0) {
      setCurrentIndex(Math.max(0, currentIndex - wordsPerChunk * 3));
    }
  };

  const handleAnswerQuestion = async (answerIndex: number) => {
    const isCorrect = answerIndex === questions[currentQuestion].correct;
    const newAnswers = [...answers, isCorrect];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Complete game
      const duration = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 60;
  const accuracy = newAnswers.filter(a => a).length / newAnswers.length;
  const accuracyPct = accuracy * 100;
      const readingWPM = words.length / (duration / 60);
      const score = Math.round(readingWPM * accuracy * 10);
      const xp = computeGameXp('word_race', { wpm: readingWPM, accuracy, score, level: difficulty });
      if (user) {
        await recordGameRun({
          userId: user.id,
          gameCode: 'word_race',
          level: difficulty,
            score,
    accuracy: accuracyPct,
            durationSec: duration,
            params: { readingWPM }
        });
      }
      awardXp(user?.id, xp, 'game', { game: 'word_race' });
      trackEvent(user?.id, 'wpm_measured', { game: 'word_race', wpm: readingWPM });
  trackEvent(user?.id, 'game_end', { game: 'word_race', score, accuracy: accuracyPct });
  onComplete(score, accuracyPct, duration);
    }
  };

  const getCurrentChunk = () => {
    if (currentIndex >= words.length) return '';
    return words.slice(currentIndex, currentIndex + wordsPerChunk).join(' ');
  };

  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;
  const estimatedWPM = startTime && currentIndex > 0 
    ? Math.round((currentIndex / (Date.now() - startTime.getTime())) * 60000)
    : 0;

  if (showQuestions) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent" />
            Comprensión - Pregunta {currentQuestion + 1} de {questions.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions[currentQuestion] && (
            <>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">
                  {questions[currentQuestion].question}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {questions[currentQuestion].options.map((option: string, index: number) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="p-4 h-auto text-left justify-start hover:bg-primary/10"
                    onClick={() => handleAnswerQuestion(index)}
                  >
                    <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 text-sm font-bold">
                      {String.fromCharCode(65 + index)}
                    </span>
                    {option}
                  </Button>
                ))}
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Respuestas correctas: {answers.filter(a => a).length} de {answers.length}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {onBack && (
            <Button variant="outline" size="icon" onClick={onBack} className="mr-2"><ArrowLeft className="w-4 h-4" /></Button>
          )}
          <Zap className="w-5 h-5 text-primary" />
          Carrera de Palabras
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={isPlaying ? handlePause : handlePlay}
            className="bg-gradient-primary"
          >
            {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isPlaying ? 'Pausar' : 'Reproducir'}
          </Button>
          
          <Button variant="outline" onClick={handleGoBack} disabled={!canGoBack || currentIndex === 0}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Retroceder
          </Button>
          
          <Button variant="outline" onClick={handleRestart}>
            Reiniciar
          </Button>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Velocidad: {wpm} WPM</label>
          <input
            type="range"
            min={100}
            max={500}
            step={25}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-4">
          <Badge variant="outline">
            <Target className="w-4 h-4 mr-1" />
            {estimatedWPM} WPM
          </Badge>
          <Badge variant="outline">
            <Zap className="w-4 h-4 mr-1" />
            {currentIndex} / {words.length} palabras
          </Badge>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Reading Area */}
        <div className="bg-muted/20 rounded-lg p-8 min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold mb-4 min-h-[120px] flex items-center justify-center">
              {getCurrentChunk() || 'Presiona Reproducir para comenzar'}
            </div>
            <div className="w-2 h-2 bg-primary rounded-full mx-auto animate-pulse"></div>
          </div>
        </div>

        {/* Tips */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>💡 Mantén los ojos fijos en el centro</p>
          <p>🧠 No subvocalices (no "pronuncies" mentalmente)</p>
          <p>⚡ Si pierdes comprensión, reduce la velocidad</p>
        </div>
      </CardContent>
    </Card>
  );
}