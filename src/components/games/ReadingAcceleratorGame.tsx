import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { recordGameRun } from '@/services/gameRuns';
import { awardXp, computeGameXp } from '@/services/xp';
import { trackEvent } from '@/services/analytics';
import { ArrowLeft } from 'lucide-react';

interface ReadingAcceleratorGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

export function ReadingAcceleratorGame({ onComplete, difficulty = 1, onBack }: ReadingAcceleratorGameProps) {
  const { user } = useAuth();
  const [gamePhase, setGamePhase] = useState<'ready' | 'reading' | 'questions' | 'feedback'>('ready');
  const [currentText, setCurrentText] = useState('');
  const [currentPosition, setCurrentPosition] = useState(0);
  const [wordsPerMinute, setWordsPerMinute] = useState(200);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<Array<{question: string, options: string[], correct: number}>>([]);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);

  const sampleTexts = [
    {
      content: `La velocidad de lectura es una habilidad que se puede desarrollar con práctica constante. El cerebro humano es capaz de procesar información visual mucho más rápido de lo que normalmente leemos. Las técnicas de lectura rápida incluyen la expansión del campo visual, la reducción de la subvocalización y el entrenamiento en reconocimiento de patrones. Los lectores expertos pueden alcanzar velocidades de 500 a 1000 palabras por minuto manteniendo una comprensión adecuada.`,
      questions: [
        {
          question: "¿Cuál es la velocidad que pueden alcanzar los lectores expertos?",
          options: ["200-400 ppm", "500-1000 ppm", "1000-1500 ppm", "300-600 ppm"],
          correct: 1
        },
        {
          question: "¿Qué técnicas menciona el texto para lectura rápida?",
          options: ["Solo expansión visual", "Expansión visual, reducir subvocalización y reconocimiento de patrones", "Solo reconocimiento de patrones", "Solo reducir subvocalización"],
          correct: 1
        }
      ]
    },
    {
      content: `La atención es un recurso cognitivo limitado que debe ser gestionado eficientemente. En la era digital, enfrentamos una sobrecarga constante de información que fragmenta nuestra capacidad de concentración. Los estudios neurocientíficos demuestran que el entrenamiento en atención selectiva puede mejorar significativamente el rendimiento cognitivo. La práctica de ejercicios específicos fortalece las redes neuronales responsables del control atencional.`,
      questions: [
        {
          question: "¿Qué característica tiene la atención según el texto?",
          options: ["Es ilimitada", "Es un recurso limitado", "No se puede gestionar", "Solo funciona en digital"],
          correct: 1
        },
        {
          question: "¿Qué pueden fortalecer los ejercicios específicos?",
          options: ["La memoria", "Las redes neuronales del control atencional", "La velocidad", "La creatividad"],
          correct: 1
        }
      ]
    }
  ];

  const words = currentText.split(/\s+/).filter(word => word.length > 0);
  const highlightRange = 3 + difficulty; // Number of words to highlight

  const startGame = useCallback(() => {
    const textData = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    setCurrentText(textData.content);
    setQuestions(textData.questions);
    setUserAnswers([]);
    setCurrentQuestion(0);
    setScore(0);
    setCurrentPosition(0);
    setWordsPerMinute(180 + difficulty * 40); // Increase WPM with difficulty
    setStartTime(Date.now());
    setGamePhase('reading');
    trackEvent(user?.id, 'game_start', { game: 'reading_accelerator', wpm: 180 + difficulty * 40, level: difficulty });
  }, [difficulty, user?.id]);

  const calculateReadingProgress = () => {
    return (currentPosition / words.length) * 100;
  };

  const renderHighlightedText = () => {
    return words.map((word, index) => {
      const isHighlighted = index >= currentPosition && index < currentPosition + highlightRange;
      const isPassed = index < currentPosition;
      
      return (
        <span
          key={index}
          className={`${
            isHighlighted 
              ? 'bg-primary text-white px-1 rounded' 
              : isPassed 
                ? 'text-muted-foreground' 
                : ''
          }`}
        >
          {word}{' '}
        </span>
      );
    });
  };

  const handleAnswer = async (answerIndex: number) => {
    const newAnswers = [...userAnswers, answerIndex];
    setUserAnswers(newAnswers);
    
    if (questions[currentQuestion].correct === answerIndex) {
      setScore(prev => prev + 1);
    }
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // All questions answered
      const duration = (Date.now() - startTime) / 1000;
      const accuracy = (score / questions.length) * 100;
      // Compute WPM based on words shown and total time in minutes
      const wpm = Math.round(words.length / (duration / 60));
      // XP calculation
      const xp = computeGameXp('reading_accelerator', { wpm, accuracy, score, level: difficulty });
      try {
        if (user) {
          await recordGameRun({
            userId: user.id,
            gameCode: 'reading_accelerator',
            level: difficulty,
            score,
            accuracy,
            durationSec: duration,
            params: { wpm }
          });
        }
        awardXp(user?.id, xp, 'game', { game: 'reading_accelerator', wpm });
        trackEvent(user?.id, 'wpm_measured', { game: 'reading_accelerator', wpm, level: difficulty });
        trackEvent(user?.id, 'game_end', { game: 'reading_accelerator', score, accuracy, wpm, level: difficulty });
      } catch (e) {
        console.error('Failed to record reading accelerator results', e);
      }
      onComplete(score, accuracy, duration);
    }
  };

  useEffect(() => {
    if (gamePhase === 'reading' && currentPosition < words.length) {
      const intervalMs = (60 / wordsPerMinute) * 1000;
      
      const timer = setTimeout(() => {
        if (currentPosition + highlightRange >= words.length) {
          setGamePhase('questions');
        } else {
          setCurrentPosition(prev => prev + 1);
        }
      }, intervalMs);
      
      return () => clearTimeout(timer);
    }
  }, [gamePhase, currentPosition, words.length, wordsPerMinute, highlightRange]);

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center relative">
          {onBack && (
            <div className="absolute left-4 top-4">
              <Button variant="outline" size="icon" onClick={onBack} aria-label="Volver">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
          <CardTitle className="text-2xl">Acelerador de Lectura</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sigue la iluminación y lee a velocidad acelerada
          </p>
          {gamePhase === 'reading' && (
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="outline">Velocidad: {wordsPerMinute} PPM</Badge>
              <Badge variant="outline">Progreso: {Math.round(calculateReadingProgress())}%</Badge>
            </div>
          )}
          {gamePhase === 'questions' && (
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="outline">Pregunta: {currentQuestion + 1}/{questions.length}</Badge>
              <Badge variant="outline">Puntos: {score}</Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Sigue la iluminación que se mueve por el texto. No te detengas
                aunque sientas que no captaste todo. Esto entrena tu velocidad de lectura.
              </p>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Velocidad:</strong> {180 + difficulty * 40} palabras por minuto</p>
                <p><strong>Objetivo:</strong> Mantener el ritmo y comprender lo esencial</p>
              </div>
              <Button onClick={startGame} className="bg-gradient-primary">
                Comenzar Lectura
              </Button>
            </div>
          )}

          {gamePhase === 'reading' && (
            <div className="space-y-6">
              <Progress value={calculateReadingProgress()} className="h-3" />
              
              <div className="bg-card p-6 rounded-lg border border-border/50 min-h-[300px]">
                <div className="text-lg leading-relaxed text-justify">
                  {renderHighlightedText()}
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Sigue la iluminación azul • No regresses • Mantén el ritmo</p>
              </div>
            </div>
          )}

          {gamePhase === 'questions' && currentQuestion < questions.length && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-4">
                  {questions[currentQuestion].question}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questions[currentQuestion].options.map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 text-left"
                      onClick={() => handleAnswer(index)}
                    >
                      <span className="font-semibold mr-2">{String.fromCharCode(65 + index)})</span>
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}