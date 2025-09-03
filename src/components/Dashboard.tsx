import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
import { SessionSetup } from './SessionSetup';
import { GamePractice } from './GamePractice';
import { TextUploadModal } from './TextUploadModal';
import { SettingsModal } from './SettingsModal.tsx';
import { useNavigate } from 'react-router-dom';

interface UserStats {
  totalXP: number;
  streak: number;
  todayGoal: number;
  todayProgress: number;
  lastWPM: number;
  lastComprehension: number;
  rivalXP: number;
}

export function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats>({
    totalXP: 0,
    streak: 0,
    todayGoal: 10,
    todayProgress: 0,
    lastWPM: 0,
    lastComprehension: 0,
    rivalXP: 0
  });
  const [showSessionSetup, setShowSessionSetup] = useState(false);
  const [showGamePractice, setShowGamePractice] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      // Load user goals
      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .single();

      // Load user XP
      const { data: xpData } = await supabase
        .from('xp_ledger')
        .select('delta')
        .eq('user_id', user.id);

      const totalXP = xpData?.reduce((sum, entry) => sum + entry.delta, 0) || 0;

      // Load streak
      const { data: streakData } = await supabase
        .from('streaks')
        .select('count')
        .eq('user_id', user.id)
        .single();

      // Load today's sessions
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySessions } = await supabase
        .from('sessions')
        .select('duration_min')
        .eq('user_id', user.id)
        .gte('started_at', `${today}T00:00:00.000Z`)
        .lt('started_at', `${today}T23:59:59.999Z`);

      const todayProgress = todaySessions?.reduce((sum, session) => sum + session.duration_min, 0) || 0;

      // Load latest reading test
      const { data: latestTest } = await supabase
        .from('reading_tests')
        .select('wpm, comp_pct')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Load rival XP
      const { data: rivalState } = await supabase
        .from('rival_states')
        .select('xp_accum')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      setStats({
        totalXP,
        streak: streakData?.count || 0,
        todayGoal: goals?.minutes_daily || 10,
        todayProgress,
        lastWPM: latestTest?.wpm || 0,
        lastComprehension: latestTest?.comp_pct || 0,
        rivalXP: rivalState?.xp_accum || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = Math.min((stats.todayProgress / stats.todayGoal) * 100, 100);
  const isGoalMet = stats.todayProgress >= stats.todayGoal;
  const isRivalWinning = stats.rivalXP > stats.totalXP;

  if (showSessionSetup) {
    return <SessionSetup onBack={() => setShowSessionSetup(false)} />;
  }

  if (showGamePractice) {
    return <GamePractice onBack={() => setShowGamePractice(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-4xl mx-auto space-y-6">
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
                {stats.todayProgress} / {stats.todayGoal} minutos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-between items-center">
                <Badge variant={isGoalMet ? "default" : "secondary"} className="bg-gradient-success">
                  {isGoalMet ? '¡Meta Cumplida!' : `${stats.todayGoal - stats.todayProgress} min restantes`}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {stats.streak} días
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
                {isRivalWinning ? '¡Te está ganando!' : 'Vas ganando por ahora...'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <RivalAvatar size="lg" />
                <div className="text-right">
                  <div className="text-2xl font-bold text-rival-primary">{Math.round(stats.rivalXP)} XP</div>
                  <div className="text-sm text-muted-foreground">vs {Math.round(stats.totalXP)} tuyos</div>
                </div>
              </div>
              {isRivalWinning && (
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
                  <div className="text-2xl font-bold">{Math.round(stats.lastWPM)}</div>
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
                  <div className="text-2xl font-bold">{Math.round(stats.lastComprehension)}%</div>
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
                  <div className="text-2xl font-bold">{Math.round(stats.totalXP)}</div>
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
                  <div className="text-2xl font-bold">{stats.streak}</div>
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
          onUpdated={() => {
            loadUserStats();
          }}
        />
      </div>
    </div>
  );
}