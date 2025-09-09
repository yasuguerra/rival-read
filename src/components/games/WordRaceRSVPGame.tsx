import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePersistentGameLevel } from '@/hooks/usePersistentGameLevel';
import { WORD_BANK } from '@/lib/word-bank';
import { updateGameProgress, GAME_IDS } from '@/lib/progress-tracking';

// Keep external props to satisfy GameSession
interface WordRaceRSVPGameProps {
  onComplete: (score: number, accuracy: number, duration: number) => void;
  difficulty?: number; // map to level
  onBack?: () => void;
}

// Running Words configuration
const GAME_CONFIG = {
  levels: {
    1:  { wordsPerLine: 3, wordExposureMs: 350, blocksPerRound: 1, goalRT: 3000 },
    2:  { wordsPerLine: 3, wordExposureMs: 320, blocksPerRound: 1, goalRT: 3000 },
    3:  { wordsPerLine: 4, wordExposureMs: 300, blocksPerRound: 1, goalRT: 2800 },
    4:  { wordsPerLine: 4, wordExposureMs: 280, blocksPerRound: 1, goalRT: 2800 },
    5:  { wordsPerLine: 5, wordExposureMs: 260, blocksPerRound: 1, goalRT: 2500 },
    6:  { wordsPerLine: 5, wordExposureMs: 240, blocksPerRound: 1, goalRT: 2500 },
    7:  { wordsPerLine: 6, wordExposureMs: 220, blocksPerRound: 1, goalRT: 2200 },
    8:  { wordsPerLine: 6, wordExposureMs: 200, blocksPerRound: 1, goalRT: 2200 },
    9:  { wordsPerLine: 7, wordExposureMs: 190, blocksPerRound: 1, goalRT: 2000 },
    10: { wordsPerLine: 7, wordExposureMs: 180, blocksPerRound: 1, goalRT: 2000 },
    11: { wordsPerLine: 8, wordExposureMs: 170, blocksPerRound: 1, goalRT: 1800 },
    12: { wordsPerLine: 8, wordExposureMs: 165, blocksPerRound: 2, goalRT: 1800 },
    13: { wordsPerLine: 8, wordExposureMs: 160, blocksPerRound: 2, goalRT: 1600 },
    14: { wordsPerLine: 9, wordExposureMs: 158, blocksPerRound: 2, goalRT: 1600 },
    15: { wordsPerLine: 9, wordExposureMs: 156, blocksPerRound: 2, goalRT: 1500 },
    16: { wordsPerLine: 9, wordExposureMs: 154, blocksPerRound: 2, goalRT: 1500 },
    17: { wordsPerLine: 9, wordExposureMs: 152, blocksPerRound: 2, goalRT: 1400 },
    18: { wordsPerLine: 9, wordExposureMs: 151, blocksPerRound: 2, goalRT: 1400 },
    19: { wordsPerLine: 9, wordExposureMs: 150, blocksPerRound: 2, goalRT: 1300 },
    20: { wordsPerLine: 9, wordExposureMs: 150, blocksPerRound: 2, goalRT: 1200 }
  }
} as const;

export function WordRaceRSVPGame({ onComplete, difficulty = 1, onBack }: WordRaceRSVPGameProps) {
  // Map difficulty->level; persist across sessions
  const { user } = useAuth();
  const [level, setLevel] = useState<number>(Math.max(1, Math.min(20, Math.floor(difficulty))));
  usePersistentGameLevel({ userId: user?.id, gameCode: 'word_race_rsvp', level, setLevel });
  const config = GAME_CONFIG.levels[level as keyof typeof GAME_CONFIG.levels];
  const words = WORD_BANK.runningWords['es'];
  const showLineNumbers = level < 8;
  // Add lines with level: 1 line at L1, up to 5 lines by L17+ (every 4 levels adds a line)
  const linesCount = Math.min(5, 1 + Math.floor((level - 1) / 4));

  // FSM
  const [phase, setPhase] = useState<'idle' | 'showing' | 'question' | 'summary'>('idle');
  const [lines, setLines] = useState<string[][]>([]); // 5 x N
  const [currentLine, setCurrentLine] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  // Stable per-round config to avoid mid-round level changes breaking RSVP
  const roundConfigRef = useRef(config);
  const roundLinesCountRef = useRef(linesCount);

  // Question state
  const [question, setQuestion] = useState<{ askedLine: number; correct: string; choices: string[]; correctIndex: number; askedWordIdx?: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const questionStartTime = useRef<number | null>(null);

  // Session metrics
  const [score, setScore] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [responseTs, setResponseTs] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [startMs, setStartMs] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;
  const [history, setHistory] = useState<Array<{ askedLine: number; correct: string; chosen: string; ok: boolean; lines: string[][] }>>([]);

  const accuracy = totalRounds > 0 ? (correctAnswers / totalRounds) * 100 : 0;

  const generateBlock = useCallback(() => {
    const block: string[][] = [];
    for (let i = 0; i < linesCount; i++) {
      const line: string[] = [];
      for (let j = 0; j < config.wordsPerLine; j++) {
        const w = words[Math.floor(Math.random() * words.length)];
        line.push(w);
      }
      block.push(line);
    }
    return block;
  }, [config.wordsPerLine, words, linesCount]);

  const generateQuestion = useCallback((block: string[][]) => {
    // Level 1: ask for a random word from the single line
    const activeLinesCount = roundLinesCountRef.current ?? block.length;
    if (activeLinesCount === 1) {
      const line = block[0];
      const askedWordIdx = Math.floor(Math.random() * line.length);
      const correct = line[askedWordIdx];
      // Distractors: other words from the same line (not correct), pad with randoms if needed
      const distractorsSet = new Set<string>();
      for (let i = 0; i < line.length; i++) {
        if (i !== askedWordIdx) distractorsSet.add(line[i]);
      }
      while (distractorsSet.size < 3) {
        const w = words[Math.floor(Math.random() * words.length)];
        if (w !== correct) distractorsSet.add(w);
      }
      const distractors = Array.from(distractorsSet).slice(0, 3);
      const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
      return {
        askedLine: 1,
        correct,
        choices: options,
        correctIndex: options.indexOf(correct),
        askedWordIdx
      };
    } else {
      // Higher levels: ask for last word of a random line
      const asked = Math.floor(Math.random() * activeLinesCount);
      const correct = block[asked][block[asked].length - 1];
      const distractorsSet = new Set<string>();
      for (let i = 0; i < activeLinesCount; i++) {
        if (i !== asked) distractorsSet.add(block[i][block[i].length - 1]);
      }
      while (distractorsSet.size < 3) {
        const w = words[Math.floor(Math.random() * words.length)];
        if (w !== correct) distractorsSet.add(w);
      }
      const distractors = Array.from(distractorsSet).slice(0, 3);
      const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
  return {
    askedLine: asked + 1,
        correct,
        choices: options,
        correctIndex: options.indexOf(correct)
      };
    }
  }, [words]);

  const startRound = useCallback(() => {
    if (!startMs) setStartMs(Date.now());
    const block = generateBlock();
    // Freeze current config for this round
    roundConfigRef.current = config;
    roundLinesCountRef.current = linesCount;
    setLines(block);
    setCurrentLine(0);
    setCurrentWordIndex(0);
  setQuestion(null);
    setSelected(null);
    setPhase('showing');
  }, [generateBlock, startMs, config, linesCount]);

  // RSVP display loop
  useEffect(() => {
    if (phase !== 'showing') return;
    // Guard: wait until lines are ready for the current round's config
    const expectedLines = roundLinesCountRef.current;
    const expectedWPL = roundConfigRef.current.wordsPerLine;
    if (lines.length !== expectedLines || lines.some((l) => l.length !== expectedWPL)) return;
    const atLastWord = currentWordIndex >= expectedWPL - 1;
    const atLastLine = currentLine >= expectedLines - 1;
    const timer = setTimeout(() => {
      if (!atLastWord) {
        setCurrentWordIndex((p) => p + 1);
      } else if (!atLastLine) {
        setCurrentLine((p) => p + 1);
        setCurrentWordIndex(0);
      } else {
        // Finished last word of last line -> ask question
        const q = generateQuestion(lines);
        setQuestion(q);
        setPhase('question');
        questionStartTime.current = Date.now();
      }
    }, roundConfigRef.current.wordExposureMs);
    return () => clearTimeout(timer);
  }, [phase, currentLine, currentWordIndex, lines, generateQuestion]);

  const handleAnswer = useCallback((idx: number) => {
    if (selected !== null || !question) return;
    setSelected(idx);
    const rt = questionStartTime.current ? Date.now() - questionStartTime.current : 0;
    const isCorrect = idx === question.correctIndex;

    // score
    const base = config.wordsPerLine;
    const speedBonus = isCorrect ? Math.ceil(Math.max(0, (config.goalRT - rt) / config.goalRT * config.wordsPerLine)) : 0;
    const newStreak = isCorrect ? streak + 1 : 0;
    const streakBonus = isCorrect && newStreak >= 3 ? Math.floor(newStreak / 3) * 2 : 0;
    setScore((s) => s + base + speedBonus + streakBonus);

    setResponseTs((arr) => [...arr, rt]);
    setTotalRounds((r) => r + 1);
    if (isCorrect) setCorrectAnswers((c) => c + 1);
    setStreak(newStreak);
    setStreakBest((b) => Math.max(b, newStreak));
    setAttempts((a) => a + 1);
    setHistory((h) => [...h, { askedLine: question.askedLine, correct: question.correct, chosen: question.choices[idx], ok: isCorrect, lines }]);

    setTimeout(() => {
      // Adaptive level update
      const totalNext = totalRounds + 1;
      const correctNext = correctAnswers + (isCorrect ? 1 : 0);
      const accuracyNext = (correctNext / totalNext) * 100;
      let nextLevel = level;
      if (newStreak >= 3 || accuracyNext >= 80) nextLevel = Math.min(20, level + 1);
      else if (accuracyNext < 50) nextLevel = Math.max(1, level - 1);
      if (nextLevel !== level) setLevel(nextLevel);

      if (attempts + 1 >= maxAttempts) {
        // auto-complete
        const duration = startMs ? Math.round((Date.now() - startMs) / 1000) : 0;
        const meanRT = responseTs.concat([rt]).reduce((a, b) => a + b, 0) / (responseTs.length + 1);
        const wordsProcessed = (totalRounds + 1) * linesCount * config.wordsPerLine;
        const summary = {
          gameId: GAME_IDS.RUNNING_WORDS,
          score: score + base + speedBonus + streakBonus,
          level: nextLevel,
          accuracy: ((correctAnswers + (isCorrect ? 1 : 0)) / (totalRounds + 1)) * 100,
          extras: {
            wordsPerLine: config.wordsPerLine,
            wordExposureMs: config.wordExposureMs,
            totalRounds: totalRounds + 1,
            meanRT,
            responseTs: responseTs.concat([rt]),
            streakBest: Math.max(streakBest, newStreak),
            wordsProcessed
          }
        } as any;
        updateGameProgress(GAME_IDS.RUNNING_WORDS, summary);
        onComplete(summary.score, summary.accuracy, duration);
        setPhase('summary');
      } else {
        // next round
        startRound();
      }
    }, 1200);
  }, [question, selected, config, streak, startRound, attempts, startMs, responseTs, totalRounds, score, level, correctAnswers, streakBest, lines, linesCount]);

  // Start on enter from host screen
  useEffect(() => {
    if (phase === 'idle') return;
  }, [phase]);

  // Derived view state
  const progress = phase === 'showing'
    ? (((currentLine * (roundConfigRef.current.wordsPerLine || 1)) + currentWordIndex) / ((roundLinesCountRef.current || 1) * (roundConfigRef.current.wordsPerLine || 1))) * 100
    : (attempts / maxAttempts) * 100;
  const wordsProcessed = totalRounds * linesCount * config.wordsPerLine;

  // Stable counts for rendering to avoid flicker/mismatch on mid-round level changes
  const renderLinesCount = phase === 'showing' ? (roundLinesCountRef.current || lines.length) : linesCount;
  const renderWordsPerLine = phase === 'showing' ? (roundConfigRef.current.wordsPerLine || config.wordsPerLine) : config.wordsPerLine;

  // Finish helper
  const complete = useCallback(() => {
    const duration = startMs ? Math.round((Date.now() - startMs) / 1000) : 0;
    const meanRT = responseTs.length ? responseTs.reduce((a, b) => a + b, 0) / responseTs.length : 0;
    const summary = {
      gameId: GAME_IDS.RUNNING_WORDS,
      score,
      level,
      accuracy,
      extras: {
        wordsPerLine: config.wordsPerLine,
        wordExposureMs: config.wordExposureMs,
        totalRounds,
        meanRT,
        responseTs,
        streakBest,
        wordsProcessed
      }
    };
    updateGameProgress(GAME_IDS.RUNNING_WORDS, summary as any);
    onComplete(score, accuracy, duration);
    setPhase('summary');
  }, [accuracy, config.wordExposureMs, config.wordsPerLine, level, responseTs, score, startMs, streakBest, totalRounds, wordsProcessed, onComplete]);

  // UI
  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="outline" size="icon" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex-1 text-center">
              <CardTitle className="text-2xl">Running Words</CardTitle>
              <p className="text-sm text-muted-foreground">Nivel {level} • {config.wordsPerLine} palabras/línea • {config.wordExposureMs}ms</p>
              <p className="text-xs text-muted-foreground">Puntuación: {score} • Precisión: {Math.round(accuracy)}%</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {phase === 'idle' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Memoriza palabras en {linesCount} {linesCount === 1 ? 'línea' : 'líneas'}. Luego responde la última palabra de una línea al azar.</p>
              <Button className="bg-gradient-primary" onClick={() => { startRound(); }}>
                Comenzar
              </Button>
            </div>
          )}

      {phase === 'showing' && (
            <div className="space-y-4">
        {Array.from({ length: renderLinesCount }, (_, i) => (
                <div key={i} className="flex items-center justify-center gap-2 h-10 sm:h-12">
                  {showLineNumbers && (
                    <span className="w-6 text-xs sm:w-8 sm:text-sm text-muted-foreground text-right">{i + 1}.</span>
                  )}
    <div className="flex gap-3 min-w-0 flex-1 justify-center">
          {Array.from({ length: renderWordsPerLine }, (_, j) => {
                      const state = i < currentLine || (i === currentLine && j < currentWordIndex)
                        ? 'past'
                        : i === currentLine && j === currentWordIndex
                        ? 'active'
                        : 'future';
                      return (
                        <span
                          key={j}
                          className={`text-base sm:text-lg font-medium transition-opacity duration-100 ${
                            state === 'active' ? 'opacity-100 text-primary font-bold' : state === 'past' ? 'opacity-60' : 'opacity-20'
                          }`}
                        >
    {lines[i]?.[j] ?? ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {phase === 'question' && question && (
            <div className="text-center space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold">
                {linesCount === 1
                  ? `¿Cuál fue la palabra número ${question.askedWordIdx !== undefined ? question.askedWordIdx + 1 : '?'} de la línea?`
                  : `¿Cuál fue la última palabra de la línea ${question.askedLine}?`}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                {question.choices.map((opt, idx) => {
                  const isCorrect = idx === question.correctIndex;
                  const isSelected = selected === idx;
                  return (
                    <Button
                      key={idx}
                      variant={selected === null ? 'outline' : isCorrect ? 'default' : isSelected ? 'destructive' : 'outline'}
                      className={`${selected !== null && isCorrect ? 'bg-green-100 border-green-500 text-green-800' : ''}`}
                      disabled={selected !== null}
                      onClick={() => handleAnswer(idx)}
                    >
                      {String.fromCharCode(65 + idx)}. {opt}
                    </Button>
                  );
                })}
              </div>
              {selected !== null && (
                <div className="text-sm text-muted-foreground">
                  {selected === question.correctIndex ? '¡Correcto!' : 'Incorrecto'}
                </div>
              )}
              <div className="text-xs text-muted-foreground">Intento {Math.min(attempts + 1, maxAttempts)} de {maxAttempts}</div>
            </div>
          )}

          {phase === 'summary' && (
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Resumen</h3>
              <p className="text-muted-foreground text-sm">Precisión: {totalRounds > 0 ? Math.round((correctAnswers/totalRounds)*100) : 0}% • Puntuación: {score}</p>
              <div className="max-h-40 overflow-auto text-left text-xs bg-muted/30 p-3 rounded border border-border/50">
                {history.map((h,i) => (
                  <div key={i} className={`flex justify-between py-0.5 ${h.ok ? 'text-success' : 'text-destructive'}`}>
                    <span>{i+1}. L{h.askedLine} → <strong>{h.correct}</strong></span>
                    <span>{h.ok ? '✔' : '✖'} {h.chosen}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => { setScore(0); setAttempts(0); setTotalRounds(0); setCorrectAnswers(0); setResponseTs([]); setStreak(0); setStreakBest(0); setHistory([]); setPhase('idle'); setStartMs(null); }}>Reiniciar</Button>
                {onBack && <Button variant="outline" onClick={onBack}>Volver</Button>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}