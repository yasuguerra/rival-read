import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Zap, Brain, Target, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { recordGameRun } from '@/services/gameRuns';
import { awardXp, computeGameXp } from '@/services/xp';
import { trackEvent } from '@/services/analytics';
import { toast } from '@/components/ui/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';

// Reutiliza la lógica de WordRaceGame para texto subido
export function UploadedReading() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const state = loc.state as { text?: string } | null;
  const initialText = state?.text || '';

  const difficulty = 1; // future: inferir de usuario
  const baseWPM = 150 + (difficulty * 25);
  const wordsPerChunk = 2; // fijo inicial para texto libre

  const [text] = useState(initialText);
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0); // used if not userControlled
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(baseWPM);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]); // índice elegido por pregunta
  const [showQuestions, setShowQuestions] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{ wpm: number; accuracyPct: number; score: number; duration: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [userControlled] = useState(true); // lectura a ritmo propio (scroll)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0); // 0-1
  const [finishedReading, setFinishedReading] = useState(false);
  const manualStartRef = useRef<number | null>(null);
  // Duración REAL de la lectura (desde Iniciar hasta Finalizar Lectura) en segundos, excluye tiempo de preguntas.
  const [readingDurationSec, setReadingDurationSec] = useState<number | null>(null);

  useEffect(() => {
    if (!initialText) { nav('/'); return; }
    const wordArray = initialText.split(/\s+/).filter(w => w.trim().length > 0);
    setWords(wordArray);
  }, [initialText, nav]);

  const buildAIPrompt = (txt: string) => {
    const truncated = txt.slice(0, 8000);
    return `Genera 5 preguntas de comprensión de opción múltiple sobre el siguiente texto en ESPAÑOL.
Devuelve JSON con: {"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0}]}. Sin explicación extra.
Texto:\n"""${truncated}"""`;
  };

  const generateAIQuestions = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const key = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
      if (!key) throw new Error('Sin API key de OpenAI.');
      const body = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Eres un generador de preguntas de comprensión breve y preciso. Devuelve SOLO JSON.' },
          { role: 'user', content: buildAIPrompt(initialText) }
        ],
        temperature: 0.6,
        max_tokens: 900,
        response_format: { type: 'json_object' }
      } as any;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Error OpenAI');
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const extractJson = (raw: string): any => {
        const fence = raw.match(/```(?:json)?\s*({[\s\S]*?})\s*```/i); if (fence) { try { return JSON.parse(fence[1]); } catch {} }
        const tail = raw.match(/\{[\s\S]*\}$/); if (tail) { try { return JSON.parse(tail[0]); } catch {} }
        const first = raw.indexOf('{'); const last = raw.lastIndexOf('}');
        if (first !== -1 && last !== -1 && last > first) { const slice = raw.slice(first, last+1); try { return JSON.parse(slice); } catch {} }
        throw new Error('JSON no encontrado');
      };
      const parsed = extractJson(content);
      if (!Array.isArray(parsed.questions)) throw new Error('Estructura inválida');
      const qs = parsed.questions.slice(0,5).map((q:any) => ({ question: q.question, options: q.options, correct: q.correctIndex }));
      setQuestions(qs);
      toast({ title: 'Preguntas generadas', description: 'Listas para responder.' });
    } catch (e:any) {
      toast({ title: 'Fallo generando preguntas', description: e.message, variant: 'destructive' as any });
      setQuestions([{ question: 'Tema principal del texto', options: ['Descripción general', 'Publicidad', 'Deporte', 'Receta'], correct: 0 }]);
    } finally {
      setGenerating(false);
      setShowQuestions(true);
    }
  }, [generating, initialText]);

  useEffect(() => {
    if (!isPlaying || currentIndex >= words.length || userControlled) return;
    const intervalMs = (60 / wpm) * 1000 * wordsPerChunk;
    const interval = setInterval(() => {
      setCurrentIndex(prev => Math.min(prev + wordsPerChunk, words.length));
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, words.length, wpm, wordsPerChunk, userControlled]);

  useEffect(() => {
    if (!userControlled && currentIndex >= words.length && words.length > 0 && !showQuestions) {
      setIsPlaying(false);
      setShowQuestions(true);
    }
  }, [currentIndex, words.length, showQuestions, userControlled]);

  const handlePlay = () => {
    if (!startTime) {
      setStartTime(new Date());
      manualStartRef.current = Date.now();
      trackEvent(user?.id, 'game_start', { game: 'uploaded_reading', mode: 'uploaded' });
    }
    if (!userControlled) setIsPlaying(true); // en modo scroll solo cuenta tiempo
    toast({ title: 'Tiempo iniciado', description: 'Lee y pulsa Finalizar al terminar.' });
  };
  const handlePause = () => setIsPlaying(false);
  const handleRestart = () => {
    setCurrentIndex(0); setIsPlaying(false); setStartTime(null); setShowQuestions(false); setCurrentQuestion(0); setAnswers([]); setFinishedReading(false); setQuestions([]);
  };

  const finishReading = () => {
    if (!startTime) {
      toast({ title: 'Primero pulsa Iniciar', description: 'Necesitamos medir tu tiempo.' });
      return;
    }
    // Capturamos duración real de la lectura antes de preguntas
    const durationSec = Math.max(1, Math.floor((Date.now() - startTime.getTime()) / 1000));
    setReadingDurationSec(durationSec);
    setFinishedReading(true);
    generateAIQuestions();
  };

  const handleAnswer = async (i: number) => {
    if (!questions[currentQuestion]) return;
    const isCorrect = i === questions[currentQuestion].correct;
    const newAnswers = [...answers, isCorrect];
    const newSelected = [...selectedIndices, i];
    setAnswers(newAnswers);
    setSelectedIndices(newSelected);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(c => c + 1);
    } else {
      // Finaliza cuestionario -> calcula métricas y muestra resumen
  // Usamos únicamente la duración de lectura (sin tiempo de contestar preguntas)
  const duration = readingDurationSec ?? (startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 60);
  const accuracy = newAnswers.filter(a => a).length / newAnswers.length;
  const accuracyPct = Math.round(accuracy * 100);
  const readingWPM = Math.round(words.length / (duration / 60));
      const score = Math.round(readingWPM * accuracy * 10); // métrica combinada
      setSummaryData({ wpm: readingWPM, accuracyPct, score, duration });

      // Persistencia / XP
      const xp = computeGameXp('word_race', { wpm: readingWPM, accuracy, score, level: difficulty });
      if (user) {
        await recordGameRun({ userId: user.id, gameCode: 'uploaded_reading', level: difficulty, score, accuracy: accuracyPct, durationSec: duration, params: { readingWPM } });
      }
      awardXp(user?.id, xp, 'game', { game: 'uploaded_reading' });
      trackEvent(user?.id, 'wpm_measured', { mode: 'uploaded', wpm: readingWPM });
      trackEvent(user?.id, 'game_end', { game: 'uploaded_reading', score, accuracy: accuracyPct });
      setShowSummary(true);
    }
  };

  const getCurrentChunk = () => currentIndex >= words.length ? '' : words.slice(currentIndex, currentIndex + wordsPerChunk).join(' ');
  const progress = userControlled ? Math.round(scrollProgress * 100) : (words.length ? (currentIndex / words.length) * 100 : 0);
  const estimatedWPM = startTime && currentIndex > 0 ? Math.round((currentIndex / (Date.now() - startTime.getTime())) * 60000) : 0;

  if (!text) return null;

  if (showSummary && summaryData) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-accent" />Resultados de tu Lectura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-lg bg-primary/10">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Velocidad</p>
                <p className="text-2xl font-bold">{summaryData.wpm} <span className="text-sm font-medium">WPM</span></p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Comprensión</p>
                <p className="text-2xl font-bold">{summaryData.accuracyPct}<span className="text-sm font-medium ml-1">%</span></p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Duración</p>
                <p className="text-2xl font-bold">{summaryData.duration}<span className="text-sm font-medium ml-1">s</span></p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
                <p className="text-2xl font-bold">{summaryData.score}</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2"><Brain className="w-4 h-4" />Detalle de Preguntas</h3>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                {questions.map((q, idx) => {
                  const userIdx = selectedIndices[idx];
                  const correctIdx = q.correct;
                  const correct = answers[idx];
                  return (
                    <div key={idx} className="p-3 rounded-md border border-border/40 bg-muted/30 text-sm space-y-2">
                      <p className="font-medium">{idx + 1}. {q.question}</p>
                      <div className="grid gap-1">
                        {q.options.map((opt: string, oIdx: number) => {
                          const isUser = oIdx === userIdx;
                          const isCorrect = oIdx === correctIdx;
                          return (
                            <div key={oIdx} className={
                              'px-2 py-1 rounded flex items-center gap-2 ' +
                              (isCorrect ? 'bg-green-500/20 text-green-600 dark:text-green-400' : isUser ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-transparent')
                            }>
                              <span className="text-xs font-mono w-5">{String.fromCharCode(65 + oIdx)}</span>
                              <span>{opt}</span>
                              {isCorrect && <span className="ml-auto text-xs font-semibold">Correcta</span>}
                              {!isCorrect && isUser && <span className="ml-auto text-xs font-semibold">Tu elección</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">{correct ? '✅ Bien' : '❌ Incorrecta'} — Respuesta correcta: {String.fromCharCode(65 + correctIdx)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-center">
              <Button onClick={() => nav('/', { replace: true })} className="bg-gradient-primary">Volver al Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showQuestions) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-accent" />Comprensión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">{generating ? 'Generando preguntas…' : questions[currentQuestion]?.question}</h3>
            </div>
            <div className="grid gap-3">
              {!generating && questions[currentQuestion]?.options?.map((opt: string, idx: number) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="p-4 h-auto justify-start text-left whitespace-normal break-words w-full flex items-start gap-3 text-sm sm:text-base leading-snug"
                  onClick={() => handleAnswer(idx)}
                  disabled={generating}
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </Button>
              ))}
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Correctas: {answers.filter(a => a).length} de {answers.length}
            </div>
            {readingDurationSec && (
              <div className="text-center text-xs text-muted-foreground">WPM (solo lectura): {Math.round(words.length / (readingDurationSec / 60))}</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => nav('/')}> <ArrowLeft className="w-4 h-4" /> </Button>
            <Zap className="w-5 h-5 text-primary" /> Lectura Subida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap justify-center gap-4">
            <Button onClick={isPlaying ? handlePause : handlePlay} className="bg-gradient-primary">
              {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isPlaying ? 'Pausar' : 'Iniciar'}
            </Button>
            <Button variant="outline" onClick={handleRestart}><RotateCcw className="w-4 h-4 mr-2" />Reiniciar</Button>
          </div>
          {!userControlled && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Velocidad: {wpm} WPM</label>
              <input type="range" min={100} max={500} step={25} value={wpm} onChange={e => setWpm(Number(e.target.value))} className="w-full" />
            </div>
          )}
          <div className="flex justify-center gap-4">
            <Badge variant="outline"><Target className="w-4 h-4 mr-1" />{estimatedWPM} WPM</Badge>
            <Badge variant="outline"><Zap className="w-4 h-4 mr-1" />{currentIndex} / {words.length}</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Progreso</span><span>{Math.round(progress)}%</span></div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="bg-muted/20 rounded-lg p-8 min-h-[200px] flex items-center justify-center">
            <div className="text-left max-w-prose space-y-4 w-full">
              {userControlled ? (
                <div
                  ref={scrollRef}
                  className="text-base leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[50vh] pr-2"
                  onScroll={e => {
                    const el = e.currentTarget;
                    const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
                    setScrollProgress(ratio);
                  }}
                >
                  {text}
                </div>
              ) : (
                <div className="text-3xl font-bold mb-4 min-h-[120px] flex items-center justify-center">{getCurrentChunk() || 'Presiona Iniciar para comenzar'}</div>
              )}
            </div>
          </div>
          {userControlled && !finishedReading && (
            <div className="flex justify-center">
              <Button onClick={finishReading} disabled={!startTime} className="mt-2">
                Finalizar Lectura
              </Button>
            </div>
          )}
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>💡 Lee a tu ritmo. Pulsa "Finalizar Lectura" para generar preguntas con IA.</p>
            <p>🧠 Asegúrate de haber leído todo antes de finalizar.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
