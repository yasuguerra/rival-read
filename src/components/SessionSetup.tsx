import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Zap, Brain, Target, Clock, Play } from 'lucide-react';
import { GameSession } from './GameSession';

interface SessionSetupProps {
  onBack: () => void;
}

type TrainingMode = 'speed' | 'comp' | 'combo';
type Duration = 5 | 10 | 15 | 30 | 45 | 60;

export function SessionSetup({ onBack }: SessionSetupProps) {
  const [selectedMode, setSelectedMode] = useState<TrainingMode>('combo');
  const [selectedDuration, setSelectedDuration] = useState<Duration>(10);
  const [gameStarted, setGameStarted] = useState(false);

  const modes = [
    {
      id: 'speed' as TrainingMode,
      title: 'Velocidad',
      description: 'Enfócate en leer más rápido',
      icon: Zap,
      color: 'text-primary',
      gradient: 'bg-gradient-primary'
    },
    {
      id: 'comp' as TrainingMode,
      title: 'Comprensión',
      description: 'Mejora tu entendimiento',
      icon: Brain,
      color: 'text-accent',
      gradient: 'bg-gradient-to-br from-accent to-accent/80'
    },
    {
      id: 'combo' as TrainingMode,
      title: 'Combinado',
      description: 'Velocidad + Comprensión',
      icon: Target,
      color: 'text-success',
      gradient: 'bg-gradient-success'
    }
  ];

  const durations: Duration[] = [5, 10, 15, 30, 45, 60];

  const handleStartSession = () => {
    console.log('Starting session with:', { selectedMode, selectedDuration });
    console.log('Setting gameStarted to true...');
    setGameStarted(true);
  };

  console.log('SessionSetup render - gameStarted:', gameStarted, 'selectedMode:', selectedMode, 'selectedDuration:', selectedDuration);

  if (gameStarted) {
    console.log('Rendering GameSession with:', { 
      mode: selectedMode, 
      duration: selectedDuration 
    });
    return (
      <GameSession 
        mode={selectedMode}
        duration={selectedDuration}
        onBack={() => {
          console.log('Going back from GameSession');
          setGameStarted(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Configurar Sesión</h1>
            <p className="text-muted-foreground">Elige tu modo de entrenamiento</p>
          </div>
        </div>

        {/* Mode Selection */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Modo de Entrenamiento</CardTitle>
            <CardDescription>
              Selecciona qué habilidad quieres desarrollar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selectedMode === mode.id;
                
                return (
                  <div
                    key={mode.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'border-primary shadow-glow-primary' 
                        : 'border-border/50 hover:border-border'
                    }`}
                    onClick={() => setSelectedMode(mode.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${mode.gradient} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{mode.title}</h3>
                        <p className="text-sm text-muted-foreground">{mode.description}</p>
                      </div>
                      {isSelected && (
                        <Badge className="bg-primary">
                          Seleccionado
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Duration Selection */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Duración
            </CardTitle>
            <CardDescription>
              ¿Cuánto tiempo quieres entrenar?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {durations.map((duration) => (
                <Button
                  key={duration}
                  variant={selectedDuration === duration ? "default" : "outline"}
                  className={selectedDuration === duration ? "bg-gradient-primary" : ""}
                  onClick={() => setSelectedDuration(duration)}
                >
                  {duration} min
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session Summary */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Resumen de la Sesión</h3>
                <p className="text-sm text-muted-foreground">
                  {modes.find(m => m.id === selectedMode)?.title} • {selectedDuration} minutos
                </p>
              </div>
              <Button 
                onClick={(e) => {
                  console.log('¡Empezar! button clicked!', e);
                  handleStartSession();
                }}
                className="bg-gradient-success hover:shadow-glow-xp transition-all duration-300"
                type="button"
              >
                <Play className="w-4 h-4 mr-2" />
                ¡Empezar!
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}