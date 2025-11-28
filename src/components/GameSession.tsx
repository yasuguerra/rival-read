import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Trophy, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { filterImplementedGames } from '@/lib/game-registry';
import { processGameResult } from '@/services/gameResults';
import type { GameCompleteExtras } from '@/types/games';
import { createSession, updateSession } from '@/services/firestore/sessions';
import { updateStreak } from '@/services/firestore/streaks';
import { GAMES_DATA } from '@/lib/game-data';
import SchulteGame from './games/SchulteGame';
import { LetterSearchGame } from './games/LetterSearchGame';
import { WordRaceGame } from './games/WordRaceGame';
import { NumberMemoryGame } from './games/NumberMemoryGame';
import { WordRaceRSVPGame } from './games/WordRaceRSVPGame';
import { WordChainGame } from './games/WordChainGame';
import { TwinWordsGame } from './games/TwinWordsGame';
import { EvenOddGame } from './games/EvenOddGame';
import { AnagramsGame } from './games/AnagramsGame';
import { FindNumberGame } from './games/FindNumberGame';
import { VisualFieldGame } from './games/VisualFieldGame';
import { FindWordsGame } from './games/FindWordsGame';
import { TextScanningGame } from './games/TextScanningGame';
import { ReadingAcceleratorGame } from './games/ReadingAcceleratorGame';
import { NeuronAcceleratorGame } from './games/NeuronAcceleratorGame';

interface GameSessionProps {
  mode: 'speed' | 'comp' | 'combo';
  duration: number;
  onBack: () => void;
  resumeSessionId?: string;
}

interface Game {
  id: string;
  code: string;
  name: string;
  description: string;
  skills_json: any;
}

interface SessionState {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  elapsedMinutes: number;
  currentGameIndex: number;
  games: Game[];
  totalXP: number;
  gamesCompleted: number;
}

export function GameSession({ mode, duration, onBack, resumeSessionId }: GameSessionProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  console.log('GameSession component rendered. User:', user);

  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('GameSession useEffect triggered, user:', user);
    if (user) {
      if (resumeSessionId) {
        resumeExistingSession(resumeSessionId);
      } else {
        initializeSession();
      }
    }
  }, [user, resumeSessionId]);

  const initializeSession = async () => {
    console.log('initializeSession called');

    if (!user) {
      console.log('No user found, returning');
      return;
    }

    try {
      console.log('Initializing session with mode:', mode, 'duration:', duration);

      // Create new session in Firestore
      const sessionId = await createSession(user.uid);
      console.log('Session created in Firestore:', sessionId);

      // Load available games from local data
      const games = GAMES_DATA;
      console.log('All games loaded:', games);

      // Only use implemented games
      let availableGames = filterImplementedGames(games);

      // Filter games based on training mode
      let filteredGames = availableGames;
      if (mode === 'speed') {
        filteredGames = availableGames.filter(game => {
          const skills = game.skills_json as Record<string, number> | null;
          return skills?.speed && skills.speed > 0.5;
        });
      } else if (mode === 'comp') {
        filteredGames = availableGames.filter(game => {
          const skills = game.skills_json as Record<string, number> | null;
          return skills?.comp && skills.comp > 0.5;
        });
      }

      console.log('Filtered games for mode', mode, ':', filteredGames);

      // Shuffle games for variety
      const shuffledGames = filteredGames.sort(() => Math.random() - 0.5);

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      const newSessionState: SessionState = {
        sessionId: sessionId,
        startTime,
        endTime,
        elapsedMinutes: 0,
        currentGameIndex: 0,
        games: shuffledGames,
        totalXP: 0,
        gamesCompleted: 0
      };

      setSessionState(newSessionState);
      setCurrentGame(shuffledGames[0] || null);

      toast({
        title: "¡Sesión iniciada!",
        description: `Tienes ${duration} minutos para entrenar.`,
      });

    } catch (error) {
      console.error('Error initializing session:', error);
      toast({
        title: "Error",
        description: "No se pudo iniciar la sesión",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resumeExistingSession = async (sessionId: string) => {
    // For now, just start a new session since we migrated to Firestore
    // and don't have resume logic wired up yet
    initializeSession();
  };

  const handleGameComplete = async (
    score: number,
    accuracy: number,
    durationSec: number,
    extras?: GameCompleteExtras
  ) => {
    if (!sessionState || !currentGame) return;

    try {
      const { xpAwarded, normalizedAccuracy } = await processGameResult({
        userId: user?.uid,
        gameCode: currentGame.code,
        sessionId: sessionState.sessionId,
        level: extras?.level,
        score,
        accuracy,
        durationSec,
        extras
      });

      const elapsedMinutes = (Date.now() - sessionState.startTime.getTime()) / 60000;

      const updatedState = {
        ...sessionState,
        currentGameIndex: sessionState.currentGameIndex + 1,
        totalXP: sessionState.totalXP + xpAwarded,
        gamesCompleted: sessionState.gamesCompleted + 1,
        elapsedMinutes
      };

      setSessionState(updatedState);

      // Check if session should end
      const now = new Date();
      const shouldEnd = now >= sessionState.endTime ||
        updatedState.currentGameIndex >= sessionState.games.length;

      if (shouldEnd) {
        endSession(updatedState);
      } else {
        // Move to next game
        setCurrentGame(updatedState.games[updatedState.currentGameIndex]);
        setIsGameActive(false);

        toast({
          title: "¡Bien hecho!",
          description: `+${xpAwarded} XP • ${Math.round(normalizedAccuracy * 100)}% precisión`,
        });
      }
    } catch (error) {
      console.error('Error saving game result:', error);
      toast({
        title: 'Error registrando partida',
        description: 'Inténtalo nuevamente, no se guardó el progreso.',
        variant: 'destructive'
      });
    }
  };

  const endSession = async (finalState: SessionState) => {
    try {
      // Update session end time and goal status
      const elapsedMinutes = (Date.now() - finalState.startTime.getTime()) / 60000;
      const goalMet = elapsedMinutes >= duration;

      // Update session in Firestore
      await updateSession(finalState.sessionId, {
        durationMin: Math.round(elapsedMinutes),
        xpEarned: finalState.totalXP,
        goalMet: goalMet,
        gamesPlayed: finalState.games.slice(0, finalState.gamesCompleted).map(g => g.code)
      });

      // Update streak if goal was met
      if (goalMet && user) {
        await updateStreak(user.uid, true);
      }

      toast({
        title: goalMet ? "¡Meta cumplida!" : "Sesión completada",
        description: `${finalState.gamesCompleted} juegos • ${finalState.totalXP} XP ganados`,
      });

      // Go back to dashboard after 2 seconds
      setTimeout(() => {
        onBack();
      }, 2000);

    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const renderCurrentGame = () => {
    if (!currentGame || !isGameActive) return null;

    const gameProps = {
      onComplete: handleGameComplete,
      difficulty: 1,
      onBack: () => setIsGameActive(false)
    };

    switch (currentGame.code) {
      case 'schulte':
        return <SchulteGame {...gameProps} />;
      case 'letter_search':
        return (
          <LetterSearchGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'word_race':
        return (
          <WordRaceGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'number_memory':
        return (
          <NumberMemoryGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'word_race_rsvp':
        return (
          <WordRaceRSVPGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'word_chain':
        return (
          <WordChainGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'twin_words':
        return (
          <TwinWordsGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'even_odd':
        return (
          <EvenOddGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'anagrams':
        return (
          <AnagramsGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'find_number':
        return (
          <FindNumberGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'visual_field':
        return (
          <VisualFieldGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'find_words':
        return (
          <FindWordsGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'text_scanning':
        return (
          <TextScanningGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'reading_accelerator':
        return (
          <ReadingAcceleratorGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      case 'neuron_accelerator':
        return (
          <NeuronAcceleratorGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <p>Juego no implementado: {currentGame.code}</p>
            <Button onClick={() => handleGameComplete(50, 0.5, 30)}>
              Continuar
            </Button>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Preparando sesión...</p>
        </div>
      </div>
    );
  }

  if (!sessionState) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <p>Error cargando sesión</p>
          <Button onClick={onBack}>Volver</Button>
        </div>
      </div>
    );
  }

  const timeLeft = Math.max(0, sessionState.endTime.getTime() - Date.now());
  const minutesLeft = Math.floor(timeLeft / 60000);
  const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
  const progressPercentage = ((duration * 60 - timeLeft / 1000) / (duration * 60)) * 100;

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Session Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Sesión de Entrenamiento</h1>
              <p className="text-muted-foreground">
                Juego {sessionState.currentGameIndex + 1} de {sessionState.games.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Clock className="w-4 h-4 mr-1" />
              {minutesLeft}:{secondsLeft.toString().padStart(2, '0')}
            </Badge>
            <Badge className="text-lg px-3 py-1 bg-gradient-success">
              <Trophy className="w-4 h-4 mr-1" />
              {sessionState.totalXP} XP
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progreso de la sesión</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </CardContent>
        </Card>

        {/* Game Area */}
        {isGameActive ? (
          renderCurrentGame()
        ) : (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {currentGame?.name || 'Juego'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {currentGame?.description || 'Descripción del juego'}
              </p>

              <div className="flex justify-center">
                <Button
                  onClick={() => setIsGameActive(true)}
                  className="bg-gradient-primary hover:shadow-glow-primary transition-all duration-300"
                  size="lg"
                >
                  Comenzar Juego
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}