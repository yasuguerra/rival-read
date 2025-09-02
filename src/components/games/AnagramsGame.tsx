import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AnagramsGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number;
}

export function AnagramsGame({ onComplete, difficulty = 1 }: AnagramsGameProps) {
  const [gamePhase, setGamePhase] = useState<'ready' | 'playing' | 'feedback'>('ready');
  const [currentWord, setCurrentWord] = useState('');
  const [scrambledWord, setScrambledWord] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [startTime, setStartTime] = useState(0);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const wordsList = [
    // 4-5 letter words
    'casa', 'mesa', 'agua', 'luna', 'gato', 'perro', 'libro', 'papel',
    'verde', 'azul', 'rojo', 'blanco', 'negro', 'grande', 'pequeño',
    // 6-7 letter words for higher difficulty
    'amigos', 'cabeza', 'corazón', 'hermano', 'escuela', 'trabajo',
    'familia', 'ciencia', 'historia', 'música', 'deporte', 'cultura'
  ];

  const scrambleWord = (word: string) => {
    const letters = word.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters.join('');
  };

  const generateAnagrams = (word: string, count: number) => {
    const anagrams = new Set<string>();
    anagrams.add(word); // Correct answer
    
    while (anagrams.size < count) {
      const scrambled = scrambleWord(word);
      if (scrambled !== word) {
        anagrams.add(scrambled);
      }
    }
    
    return Array.from(anagrams);
  };

  const generateRound = useCallback(() => {
    const maxLength = 4 + difficulty;
    const availableWords = wordsList.filter(word => word.length <= maxLength);
    const word = availableWords[Math.floor(Math.random() * availableWords.length)];
    
    const scrambled = scrambleWord(word);
    const anagrams = generateAnagrams(word, 4);
    const shuffledOptions = anagrams.sort(() => Math.random() - 0.5);
    
    setCurrentWord(word);
    setScrambledWord(scrambled);
    setOptions(shuffledOptions);
    setCorrectAnswer(word);
    setTimeLeft(30);
    setRoundStartTime(Date.now());
    setFeedback(null);
  }, [difficulty]);

  const startGame = useCallback(() => {
    setScore(0);
    setAttempts(0);
    setCurrentRound(1);
    setStartTime(Date.now());
    setGamePhase('playing');
    generateRound();
  }, [generateRound]);

  const handleAnswer = (selectedWord: string) => {
    if (gamePhase !== 'playing' || feedback) return;
    
    const isCorrect = selectedWord === correctAnswer;
    const newAttempts = attempts + 1;
    
    setAttempts(newAttempts);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    
    setTimeout(() => {
      if (currentRound >= 10) {
        const duration = (Date.now() - startTime) / 1000;
        const accuracy = (score / newAttempts) * 100;
        onComplete(score, accuracy, duration);
      } else {
        setCurrentRound(prev => prev + 1);
        generateRound();
      }
    }, 1500);
  };

  useEffect(() => {
    if (gamePhase === 'playing' && timeLeft > 0 && !feedback) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !feedback) {
      handleAnswer(''); // Time's up
    }
  }, [gamePhase, timeLeft, feedback]);

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Anagramas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Encuentra la palabra correcta formada por las mismas letras
          </p>
          {gamePhase === 'playing' && (
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="outline">Ronda: {currentRound}/10</Badge>
              <Badge variant="outline">Tiempo: {timeLeft}s</Badge>
              <Badge variant="outline">Puntos: {score}</Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {gamePhase === 'ready' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Reordena mentalmente las letras para formar la palabra correcta.
                Busca patrones de prefijos y sufijos comunes.
              </p>
              <Button onClick={startGame} className="bg-gradient-primary">
                Comenzar
              </Button>
            </div>
          )}

          {gamePhase === 'playing' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Palabra enigmática:</h3>
                <div className="text-4xl font-bold text-primary bg-primary/10 rounded-lg py-4 px-6 inline-block">
                  {scrambledWord.toUpperCase()}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-center font-semibold">Selecciona el anagrama correcto:</h4>
                <div className="grid grid-cols-2 gap-3">
                  {options.map((option, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className={`h-12 text-lg ${
                        feedback === 'correct' && option === correctAnswer
                          ? 'bg-success text-white border-success'
                          : feedback === 'incorrect' && option === correctAnswer
                          ? 'bg-success text-white border-success'
                          : feedback === 'incorrect' && option !== correctAnswer
                          ? 'bg-destructive/10 border-destructive'
                          : ''
                      }`}
                      onClick={() => handleAnswer(option)}
                      disabled={!!feedback}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              {feedback && (
                <div className={`text-center text-lg font-semibold ${
                  feedback === 'correct' ? 'text-success' : 'text-destructive'
                }`}>
                  {feedback === 'correct' ? '¡Correcto!' : '¡Incorrecto!'}
                  {feedback === 'incorrect' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      La respuesta correcta era: {correctAnswer}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}