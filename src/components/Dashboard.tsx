import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  Brain, 
  Zap, 
  Target, 
  Clock, 
  Trophy, 
  Flame,
  Play,
  BookOpen,
  Settings,
  LogOut
} from 'lucide-react';
import { RivalAvatar } from './RivalAvatar';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, DashboardStats } from '@/services/stats';
import { Suspense, lazy } from 'react';
const SessionSetup = lazy(() => import('./SessionSetup').then(m => ({ default: m.SessionSetup })));
const GamePractice = lazy(() => import('./GamePractice').then(m => ({ default: m.GamePractice })));
import { TextUploadModal } from './TextUploadModal';
import { SettingsModal } from './SettingsModal.tsx';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  const [showGamePractice, setShowGamePractice] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { data: stats, isLoading, isError, refetch } = useQuery<DashboardStats | undefined>({
    queryKey: ['dashboardStats', user?.id],
    queryFn: async () => {
      if (!user?.id) return undefined;
      return fetchDashboardStats(user.id);
    },
    staleTime: 60_000,
  });

  const progressPercentage = stats ? Math.min((stats.todayProgressMin / stats.todayGoal) * 100, 100) : 0;
  const isGoalMet = stats ? stats.todayProgressMin >= stats.todayGoal : false;
  const isRivalWinning = stats ? stats.rivalXPToday > stats.userXPToday : false;

  if (showSessionSetup) {
    return (
      <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Cargando módulo de sesión...</div>}>
        <SessionSetup onBack={() => setShowSessionSetup(false)} />
      </Suspense>
    );
  }

  if (showGamePractice) {
    return (
      <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Cargando práctica...</div>}>
        <GamePractice onBack={() => setShowGamePractice(false)} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Loading / Error States */}
        {isLoading && (
          <div className="text-center py-10 text-muted-foreground">Cargando estadísticas...</div>
        )}
        {isError && (
          <div className="text-center py-10">
            <p className="text-destructive mb-4">No se pudieron cargar las estadísticas.</p>
            <Button onClick={() => refetch()}>Reintentar</Button>
          </div>
        )}
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">¡Hola, {user?.user_metadata?.display_name || 'Lector'}!</h1>
            <p className="text-muted-foreground">¿Listo para entrenar tu mente?</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Daily Progress & Rival */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Goal */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-success" />
                Meta de Hoy
              </CardTitle>
              <CardDescription>
                {stats?.todayProgressMin ?? 0} / {stats?.todayGoal ?? 0} minutos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between items-center">
                <Badge variant={isGoalMet ? "default" : "secondary"} className="bg-gradient-success">
                  {isGoalMet ? '¡Meta Cumplida!' : `${(stats ? Math.max(stats.todayGoal - stats.todayProgressMin, 0) : 0)} min restantes`}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {stats?.streak ?? 0} días
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rival Status */}
          <Card className={`border-border/50 bg-card/80 backdrop-blur-sm ${isRivalWinning ? 'animate-rival-pulse' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-rival-primary" />
                Tu Rival IA
              </CardTitle>
              <CardDescription>
                {stats ? (isRivalWinning ? '¡Te está ganando!' : 'Vas ganando por ahora...') : '---'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <RivalAvatar size="lg" />
                <div className="text-right">
                  <div className="text-2xl font-bold text-rival-primary">{Math.round(stats?.rivalXPToday || 0)} XP</div>
                  <div className="text-sm text-muted-foreground">vs {Math.round(stats?.userXPToday || 0)} tuyos (hoy)</div>
                </div>
              </div>
              {stats && isRivalWinning && (
                <Badge variant="destructive" className="w-full justify-center">
                  ¡Entrena para alcanzarlo!
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold">{Math.round(stats?.lastWPM || 0)}</div>
                  <div className="text-xs text-muted-foreground">WPM</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-accent" />
                <div>
                  <div className="text-2xl font-bold">{Math.round(stats?.lastComprehension || 0)}%</div>
                  <div className="text-xs text-muted-foreground">Comprensión</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" />
                <div>
                  <div className="text-2xl font-bold">{Math.round(stats?.totalXP || 0)}</div>
                  <div className="text-xs text-muted-foreground">XP Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.streak || 0}</div>
                  <div className="text-xs text-muted-foreground">Días seguidos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            onClick={() => setShowSessionSetup(true)}
            className="h-16 bg-gradient-primary hover:shadow-glow-primary transition-all duration-300 text-lg"
          >
            <Play className="w-6 h-6 mr-2" />
            Entrenar Ahora
          </Button>
          
          <Button 
            onClick={() => setShowGamePractice(true)}
            variant="outline" 
            className="h-16 border-border/50 hover:bg-secondary/50 text-lg"
          >
            <Target className="w-6 h-6 mr-2" />
            Práctica Libre
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setShowUpload(true)}
            className="h-16 border-border/50 hover:bg-secondary/50 text-lg"
          >
            <BookOpen className="w-6 h-6 mr-2" />
            Subir Texto
          </Button>
        </div>
  <TextUploadModal
          open={showUpload}
          onOpenChange={setShowUpload}
          onProcess={async (content) => {
      // Navega a modo lectura con state (texto cargado)
      navigate('/lectura-subida', { state: { text: content } });
          }}
        />
        <SettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
          userId={user?.id || ''}
      onUpdated={() => { refetch(); }}
        />
      </div>
    </div>
  );
}