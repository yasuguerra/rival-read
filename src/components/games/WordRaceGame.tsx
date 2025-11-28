import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Zap, Brain, Target, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/services/analytics';
import { usePersistentGameLevel } from '@/hooks/usePersistentGameLevel';
import type { GameCompleteHandler, GameCompleteExtras } from '@/types/games';

interface WordRaceGameProps {
  onComplete: GameCompleteHandler;
  difficulty: number;
  onBack?: () => void;
}

interface Question {
  type: string;
  question: string;
  correct: number;
  options: string[];
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
  const [level, setLevel] = useState<number>(Math.max(1, Math.floor(difficulty)));
  usePersistentGameLevel({ userId: user?.id, gameCode: 'word_race', level, setLevel });
  const baseWPM = 150 + (level * 25); // 150-400 WPM range
  const wordsPerChunk = Math.min(1 + Math.floor(level / 2), 3); // 1-3 words per chunk

  const [text, setText] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(baseWPM);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [canGoBack, setCanGoBack] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  useEffect(() => {
    setWpm(baseWPM);
  }, [baseWPM]);

  const generateQuestions = useCallback((textContent: string): Question[] => {
    const sentences = textContent.split('.').filter(s => s.trim().length > 10);
    // In a real app, these would be dynamically generated or fetched
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

  useEffect(() => { setSelectedAnswer(null); }, [currentQuestion]);

  const handlePlay = () => {
    if (!startTime) {
      setStartTime(new Date());
      trackEvent(user?.id, 'game_start', { game: 'word_race', level });
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
    setSelectedAnswer(answerIndex);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Complete game
      const duration = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 60;
      const accuracy = newAnswers.filter(a => a).length / newAnswers.length;
      const readingWPM = words.length / (duration / 60);
      const score = Math.round(readingWPM * accuracy * 10);
      trackEvent(user?.id, 'wpm_measured', { game: 'word_race', wpm: readingWPM });
      trackEvent(user?.id, 'game_end', { game: 'word_race', score, accuracy: accuracy * 100, level });
      let newLevel = level;
      if (accuracy >= 0.8) newLevel = level + 1;
      else if (accuracy < 0.5) newLevel = Math.max(1, level - 1);
      if (newLevel !== level) setLevel(newLevel);
      const extras: GameCompleteExtras = {
        level,
        metrics: {
          wpm: Math.round(readingWPM),
          correctAnswers: newAnswers.filter(Boolean).length,
          totalQuestions: newAnswers.length
        }
      };
      onComplete(score, accuracy, duration, extras);
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
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card key={`questions-${currentQuestion}`} className="border-border/50 bg-card/80 backdrop-blur-sm w-full max-w-2xl animate-in zoom-in duration-300">
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
                  <h3 className="text-xl font-semibold mb-6 leading-relaxed">
                    {questions[currentQuestion].question}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {questions[currentQuestion].options.map((option: string, index: number) => {
                    const isSelected = selectedAnswer === index;
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        className={`p-6 h-auto text-left justify-start transition-all duration-200 ${isSelected
                            ? 'bg-primary/20 border-primary shadow-glow-primary scale-[1.02]'
                            : 'hover:bg-primary/10 hover:border-primary/50 hover:scale-[1.01]'
                          }`}
                        onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); handleAnswerQuestion(index); }}
                        disabled={selectedAnswer !== null && selectedAnswer !== index}
                      >
                        <span className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mr-4 text-sm font-bold transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                          }`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-lg">{option}</span>
                      </Button>
                    );
                  })}
                </div>

                <div className="text-center text-sm text-muted-foreground mt-4">
                  <p>Respuestas correctas: {answers.filter(a => a).length} de {answers.length}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-4 flex items-center justify-center">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {onBack && (
              <Button variant="outline" size="icon" onClick={onBack} className="mr-2"><ArrowLeft className="w-4 h-4" /></Button>
            )}
            <Zap className="w-5 h-5 text-primary" />
            Carrera de Palabras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Controls */}
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={isPlaying ? handlePause : handlePlay}
              className="bg-gradient-primary min-w-[140px]"
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
          <div className="space-y-2 max-w-md mx-auto">
            <label className="text-sm font-medium flex justify-between">
              <span>Velocidad</span>
              <span className="font-bold text-primary">{wpm} WPM</span>
            </label>
            <input
              type="range"
              min={100}
              max={500}
              step={25}
              value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-4">
            <Badge variant="outline" className="px-3 py-1">
              <Target className="w-4 h-4 mr-2 text-accent" />
              {estimatedWPM} WPM (Est.)
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              <Zap className="w-4 h-4 mr-2 text-primary" />
              {currentIndex} / {words.length} palabras
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progreso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Reading Area */}
          <div className="bg-muted/30 rounded-xl p-12 min-h-[250px] flex items-center justify-center relative overflow-hidden border border-border/50">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
              <div className="w-full h-[1px] bg-foreground"></div>
              <div className="h-full w-[1px] bg-foreground absolute"></div>
            </div>

            <div className="text-center z-10">
              <div className="text-4xl md:text-5xl font-bold mb-8 min-h-[120px] flex items-center justify-center tracking-wide text-foreground">
                {getCurrentChunk() || 'Presiona Reproducir'}
              </div>
              <div className="w-3 h-3 bg-primary rounded-full mx-auto animate-pulse shadow-glow-primary"></div>
            </div>
          </div>

          {/* Tips */}
          <div className="text-center text-sm text-muted-foreground space-y-1 bg-muted/20 p-4 rounded-lg">
            <p>💡 Mantén los ojos fijos en el punto central</p>
            <p>🧠 Evita "pronunciar" las palabras mentalmente</p>
            <p>⚡ Ajusta la velocidad si pierdes el hilo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}