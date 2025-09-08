import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { usePersistentGameLevel } from '@/hooks/usePersistentGameLevel';
import { recordGameRun } from '@/services/gameRuns';
import { awardXp, computeGameXp } from '@/services/xp';
import { trackEvent } from '@/services/analytics';

interface TextScanningGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
  onBack?: () => void;
}

export function TextScanningGame({ onComplete, difficulty: initialDifficulty = 1, onBack }: TextScanningGameProps) {
  const { user } = useAuth();
  const [level, setLevel] = useState<number>(Math.max(1, Math.floor(initialDifficulty)));
  usePersistentGameLevel({ userId: user?.id, gameCode: 'text_scanning', level, setLevel });
  const difficulty = level;

  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'feedback'>('ready');
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [textContent, setTextContent] = useState('');
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90); // Single session timer
  const [currentRound, setCurrentRound] = useState(1);

  const sampleTexts = [
    `La lectura rápida es una habilidad fundamental en la era de la información. Permite procesar grandes cantidades de texto de manera eficiente, mejorando la comprensión y retención. Las técnicas incluyen expandir el campo visual, reducir la subvocalización y aumentar la velocidad de reconocimiento de patrones. La práctica constante desarrolla estas capacidades naturalmente.`,
    
    `El cerebro humano procesa información visual a una velocidad extraordinaria. La corteza visual puede identificar objetos en milisegundos, mientras que la memoria de trabajo mantiene activa la información relevante. Los ejercicios de atención selectiva mejoran estos procesos cognitivos fundamentales.`,
    
    `La tecnología moderna demanda nuevas formas de leer y procesar información. Los dispositivos digitales han cambiado nuestros patrones de lectura, requiriendo adaptación y entrenamiento específico. La velocidad de lectura se puede incrementar significativamente con métodos apropiados.`
  ];

  const generateRound = useCallback(() => {
    const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    const words = text.split(/\s+/).filter(word => word.length > 3);
    
    // Select target words to find
    const numTargets = 2 + difficulty;
    const selectedWords = [];
    
    for (let i = 0; i < numTargets; i++) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      const cleanWord = randomWord.replace(/[.,;:!?]/g, '').toLowerCase();
      if (!selectedWords.includes(cleanWord)) {
        selectedWords.push(cleanWord);
      }
    }
    
    setTargetWords(selectedWords);
    setTextContent(text);
  setFoundWords(new Set());
  // Keep global timer independent of rounds
  }, [difficulty, currentRound]);

  const startGame = useCallback(() => {
    setScore(0);
    setErrors(0);
    setCurrentRound(1);
    setStartTime(Date.now());
    setGamePhase('playing');
    generateRound();
    trackEvent(user?.id, 'game_start', { game: 'text_scanning', difficulty });
  }, [generateRound, difficulty, user?.id]);

  const highlightText = () => {
    let highlightedText = textContent;
    
    targetWords.forEach(word => {
      if (foundWords.has(word)) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        highlightedText = highlightedText.replace(regex, `<mark class="bg-success text-white">$&</mark>`);
      }
    });
    
    return highlightedText;
  };

  const handleWordClick = (clickedWord: string) => {
    const cleanWord = clickedWord.replace(/[.,;:!?]/g, '').toLowerCase();
    
    if (targetWords.includes(cleanWord) && !foundWords.has(cleanWord)) {
      setFoundWords(prev => new Set([...prev, cleanWord]));
      setScore(prev => prev + 1);
      
      if (foundWords.size + 1 >= targetWords.length) {
        setTimeout(() => {
          if (currentRound >= 5) {
            // Wait for user to finish via button or auto finalize
            setGamePhase('feedback');
          } else {
            setCurrentRound(prev => prev + 1);
            generateRound();
          }
        }, 1000);
      }
    } else if (!targetWords.includes(cleanWord)) {
      setErrors(prev => prev + 1);
      // Penalty: reduce time
      setTimeLeft(prev => Math.max(prev - 3, 0));
    }
  };

  useEffect(() => {
    if (gamePhase === 'playing' && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setGamePhase('feedback');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gamePhase, timeLeft]);

  const finalizeGame = async () => {
    const duration = (Date.now() - startTime) / 1000;
    const accuracyPct = score > 0 ? (score / (score + errors)) * 100 : 0;
    try {
      if (user) {
        await recordGameRun({
          userId: user.id,
          gameCode: 'text_scanning',
          level: difficulty,
          score,
          accuracy: accuracyPct,
          durationSec: duration,
          params: { errors, rounds: currentRound }
        });
      }
      const xp = computeGameXp('text_scanning', { score, accuracy: accuracyPct, level: difficulty });
      awardXp(user?.id, xp, 'game', { game: 'text_scanning' });
      trackEvent(user?.id, 'game_end', { game: 'text_scanning', score, accuracy: accuracyPct });
    } catch (e) {
      console.error('Failed to finalize text scanning game', e);
    }
    if (accuracyPct >= 80) {
      setLevel(prev => prev + 1);
    } else if (accuracyPct < 50) {
      setLevel(prev => Math.max(1, prev - 1));
    }
    onComplete(score, accuracyPct, duration);
  };

  const renderClickableText = () => {
    return textContent.split(/\s+/).map((word, index) => {
      const cleanWord = word.replace(/[.,;:!?]/g, '').toLowerCase();
      const isTarget = targetWords.includes(cleanWord);
      const isFound = foundWords.has(cleanWord);
      
      return (
        <span
          key={index}
          className={`cursor-pointer px-1 rounded ${
            isFound 
              ? 'bg-success text-white' 
              : isTarget 
                ? 'hover:bg-primary/20' 
                : 'hover:bg-muted'
          }`}
          onClick={() => handleWordClick(word)}
        >
          {word}{' '}
        </span>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Buscar en el Texto</CardTitle>
          <p className="text-sm text-muted-foreground">
            Encuentra las palabras objetivo en el texto lo más rápido posible
          </p>
          {onBack && (
            <div className="absolute left-4 top-4">
              <Button variant="outline" size="icon" onClick={onBack} aria-label="Volver">
                ←
              </Button>
            </div>
          )}
          {gamePhase === 'playing' && (
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="outline">Ronda: {currentRound}/5</Badge>
              <Badge variant="outline">Tiempo: {timeLeft}s</Badge>
              <Badge variant="outline">Encontradas: {foundWords.size}/{targetWords.length}</Badge>
              <Badge variant="outline">Errores: {errors}</Badge>
            </div>
          )}
          {gamePhase === 'feedback' && (
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="outline">Rondas: {currentRound}</Badge>
              <Badge variant="outline">Puntuación: {score}</Badge>
              <Badge variant="outline">Errores: {errors}</Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Lee rápidamente el texto y encuentra las palabras objetivo.
                Usa tu visión periférica y evita leer palabra por palabra.
              </p>
              <Button onClick={startGame} className="bg-gradient-primary">
                Comenzar
              </Button>
            </div>
          )}

          {gamePhase === 'playing' && (
            <div className="space-y-6">
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-center">Palabras a encontrar:</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {targetWords.map(word => (
                    <Badge 
                      key={word}
                      variant={foundWords.has(word) ? "default" : "outline"}
                      className={foundWords.has(word) ? "bg-success" : ""}
                    >
                      {word}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border/50">
                <div className="text-base leading-relaxed text-justify">
                  {renderClickableText()}
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>Haz clic en las palabras para seleccionarlas • Evita leer palabra por palabra</p>
              </div>
            </div>
          )}

          {gamePhase === 'feedback' && (
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Resumen</h3>
              <p className="text-muted-foreground">Has encontrado {score} palabras con {errors} errores.</p>
              <div className="flex justify-center gap-2">
                <Button onClick={finalizeGame} className="bg-gradient-primary">Finalizar</Button>
                <Button variant="outline" onClick={startGame}>Reiniciar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}