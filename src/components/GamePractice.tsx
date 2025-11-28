import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Play, Zap, Brain, Target } from 'lucide-react';
import { GAMES_DATA, Game } from '@/lib/game-data';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { filterImplementedGames } from '@/lib/game-registry';
import { processGameResult } from '@/services/gameResults';
import type { GameCompleteExtras } from '@/types/games';
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

interface GamePracticeProps {
  onBack: () => void;
}

export function GamePractice({ onBack }: GamePracticeProps) {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      // TODO: Migrate to Firestore
      // Mock load games
      const gamesData = GAMES_DATA;

      // Solo mostrar juegos implementados
      const availableGames = gamesData ? filterImplementedGames(gamesData) : [];

      setGames(availableGames);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGameIcon = (code: string) => {
    switch (code) {
      case 'schulte':
        return Target;
      case 'letter_search':
        return Zap;
      case 'word_race':
        return Brain;
      case 'number_memory':
        return Brain;
      case 'word_race_rsvp':
        return Zap;
      case 'word_chain':
        return Target;
      default:
        return Play;
    }
  };

  const handlePracticeComplete = async (
    score: number,
    accuracy: number,
    durationSec: number,
    extras?: GameCompleteExtras
  ) => {
    if (!selectedGame) return;

    try {
      const { xpAwarded, normalizedAccuracy } = await processGameResult({
        userId: user?.uid,
        gameCode: selectedGame.code,
        score,
        accuracy,
        durationSec,
        level: extras?.level,
        extras
      });

      toast({
        title: 'Juego completado',
        description: `+${xpAwarded} XP • ${Math.round(normalizedAccuracy * 100)}% precisión`
      });
    } catch (error) {
      console.error('Error recording practice game', error);
      toast({
        title: 'No se pudo guardar el resultado',
        description: 'Revisa tu conexión y vuelve a intentarlo.',
        variant: 'destructive'
      });
    } finally {
      setGameStarted(false);
      setSelectedGame(null);
    }
  };

  const getGameComponent = () => {
    if (!selectedGame) return null;

    const gameProps = {
      onComplete: handlePracticeComplete,
      difficulty: 1,
      onBack: () => {
        setGameStarted(false);
        setSelectedGame(null);
      }
    };

    switch (selectedGame.code) {
      case 'schulte':
        return <SchulteGame {...gameProps} />;
      case 'letter_search':
        return <LetterSearchGame {...gameProps} />;
      case 'word_race':
        return <WordRaceGame {...gameProps} />;
      case 'number_memory':
        return <NumberMemoryGame {...gameProps} />;
      case 'word_race_rsvp':
        return <WordRaceRSVPGame {...gameProps} />;
      case 'word_chain':
        return <WordChainGame {...gameProps} />;
      case 'twin_words':
        return <TwinWordsGame {...gameProps} />;
      case 'even_odd':
        return <EvenOddGame {...gameProps} />;
      case 'anagrams':
        return <AnagramsGame {...gameProps} />;
      case 'find_number':
        return <FindNumberGame {...gameProps} />;
      case 'visual_field':
        return <VisualFieldGame {...gameProps} />;
      case 'find_words':
        return <FindWordsGame {...gameProps} />;
      case 'text_scanning':
        return <TextScanningGame {...gameProps} />;
      case 'reading_accelerator':
        return <ReadingAcceleratorGame {...gameProps} />;
      case 'neuron_accelerator':
        return <NeuronAcceleratorGame {...gameProps} />;
      default:
        return null;
    }
  };

  if (gameStarted && selectedGame) {
    return (
      <div className="min-h-screen bg-gradient-bg">
        {getGameComponent()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="border-border/50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Práctica Libre</h1>
            <p className="text-muted-foreground">Elige el juego que quieres practicar</p>
          </div>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando juegos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => {
              const IconComponent = getGameIcon(game.code);
              const skills = game.skills_json as any;

              return (
                <Card
                  key={game.id}
                  className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-glow-primary transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedGame(game)}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-2">
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{game.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {game.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Skills indicators */}
                    <div className="flex flex-wrap gap-2">
                      {skills.speed > 0.5 && (
                        <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                          Velocidad
                        </span>
                      )}
                      {skills.comp > 0.5 && (
                        <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
                          Comprensión
                        </span>
                      )}
                      {skills.attention > 0.5 && (
                        <span className="px-2 py-1 bg-warning/20 text-warning text-xs rounded-full">
                          Atención
                        </span>
                      )}
                      {skills.memory > 0.5 && (
                        <span className="px-2 py-1 bg-success/20 text-success text-xs rounded-full">
                          Memoria
                        </span>
                      )}
                    </div>

                    <Button
                      className="w-full bg-gradient-primary hover:shadow-glow-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGame(game);
                        setGameStarted(true);
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Jugar Ahora
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {games.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No hay juegos disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}