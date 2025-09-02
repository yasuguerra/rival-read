import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Trophy, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SchulteGame } from './games/SchulteGame';
import { LetterSearchGame } from './games/LetterSearchGame';
import { WordRaceGame } from './games/WordRaceGame';

interface GameSessionProps {
  mode: 'speed' | 'comp' | 'combo';
  duration: number;
  onBack: () => void;
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

export function GameSession({ mode, duration, onBack }: GameSessionProps) {
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
      initializeSession();
    }
  }, [user]);

  const initializeSession = async () => {
    console.log('initializeSession called');
    
    if (!user) {
      console.log('No user found, returning');
      return;
    }

    try {
      console.log('Initializing session with mode:', mode, 'duration:', duration);
      
      // Create session in database
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          mode,
          duration_min: duration
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw sessionError;
      }

      console.log('Session created:', session);

      // Load available games based on mode
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*');

      if (gamesError) {
        console.error('Games loading error:', gamesError);
        throw gamesError;
      }

      console.log('All games loaded:', games);

      // Only use implemented games
      const implementedGameCodes = ['schulte', 'letter_search', 'word_race'];
      let availableGames = games.filter(game => implementedGameCodes.includes(game.code));

      // Filter games based on training mode
      let filteredGames = availableGames;
      if (mode === 'speed') {
        filteredGames = availableGames.filter(game => {
          const skills = game.skills_json as any;
          return skills.speed && skills.speed > 0.5;
        });
      } else if (mode === 'comp') {
        filteredGames = availableGames.filter(game => {
          const skills = game.skills_json as any;
          return skills.comp && skills.comp > 0.5;
        });
      }

      console.log('Filtered games for mode', mode, ':', filteredGames);

      // Shuffle games for variety
      const shuffledGames = filteredGames.sort(() => Math.random() - 0.5);

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      const newSessionState: SessionState = {
        sessionId: session.id,
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

  const handleGameComplete = async (score: number, accuracy: number, durationSec: number) => {
    if (!sessionState || !currentGame) return;

    try {
      // Save game run
      await supabase
        .from('game_runs')
        .insert({
          session_id: sessionState.sessionId,
          user_id: user!.id,
          game_id: currentGame.id,
          level: 1, // TODO: implement adaptive difficulty
          score,
          accuracy,
          duration_sec: durationSec
        });

      // Calculate XP based on performance
      const baseXP = 10;
      const accuracyBonus = accuracy * 5;
      const speedBonus = Math.max(0, (60 - durationSec) / 10);
      const totalGameXP = Math.round(baseXP + accuracyBonus + speedBonus);

      // Add XP to ledger
      await supabase
        .from('xp_ledger')
        .insert({
          user_id: user!.id,
          source: 'game',
          delta: totalGameXP,
          meta: {
            game_code: currentGame.code,
            score,
            accuracy,
            duration: durationSec
          }
        });

      const updatedState = {
        ...sessionState,
        currentGameIndex: sessionState.currentGameIndex + 1,
        totalXP: sessionState.totalXP + totalGameXP,
        gamesCompleted: sessionState.gamesCompleted + 1
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
        setCurrentGame(sessionState.games[updatedState.currentGameIndex]);
        setIsGameActive(false);
        
        toast({
          title: "¡Bien hecho!",
          description: `+${totalGameXP} XP • ${Math.round(accuracy)}% precisión`,
        });
      }
    } catch (error) {
      console.error('Error saving game result:', error);
    }
  };

  const endSession = async (finalState: SessionState) => {
    try {
      // Update session end time and goal status
      const goalMet = finalState.elapsedMinutes >= duration;
      
      await supabase
        .from('sessions')
        .update({
          ended_at: new Date().toISOString(),
          goal_met: goalMet
        })
        .eq('id', finalState.sessionId);

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

    switch (currentGame.code) {
      case 'schulte':
        return (
          <SchulteGame
            onComplete={handleGameComplete}
            difficulty={1}
          />
        );
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