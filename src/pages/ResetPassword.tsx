import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'checking' | 'ready' | 'error' | 'success'>('checking');
  const [statusMessage, setStatusMessage] = useState<string>('Validando enlace…');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const recoveryToken = useMemo(() => searchParams.get('code') ?? searchParams.get('token_hash'), [searchParams]);

  useEffect(() => {
    const handleRecoverySession = async () => {
      try {
        // Handle hash fragment tokens (access_token & refresh_token) if present
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (error) throw error;
            // Remove hash from URL to avoid confusion
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          }
        }

        // Handle recovery code via query parameter (password recovery emails)
        if (recoveryToken && searchParams.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(recoveryToken);
          if (error) throw error;
        }

        // Ensure there is an active session before allowing password change
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          throw new Error('El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.');
        }

        setStatus('ready');
        setStatusMessage('');
      } catch (error: any) {
        console.error('Password recovery validation failed', error);
        setStatus('error');
        setStatusMessage(error?.message ?? 'No se pudo validar el enlace de recuperación.');
      }
    };

    handleRecoverySession();
  }, [recoveryToken, searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast({
        title: 'Contraseña demasiado corta',
        description: 'Asegúrate de usar al menos 8 caracteres.',
        variant: 'destructive'
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: 'Las contraseñas no coinciden',
        description: 'Intenta nuevamente.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast({
        title: 'No se pudo actualizar la contraseña',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    setStatus('success');
    toast({
      title: '¡Contraseña actualizada!',
      description: 'Ahora puedes iniciar sesión con tu nueva contraseña.'
    });

    setTimeout(() => navigate('/'), 1500);
  };

  const renderContent = () => {
    if (status === 'checking') {
      return <p className="text-center text-muted-foreground">{statusMessage}</p>;
    }

    if (status === 'error') {
      return (
        <div className="space-y-4 text-center">
          <p className="text-destructive">{statusMessage}</p>
          <Button onClick={() => navigate('/')}>Volver al inicio</Button>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="space-y-4 text-center">
          <p className="text-success">¡Listo! Estamos redirigiéndote al inicio…</p>
          <Button onClick={() => navigate('/')}>Ir al inicio</Button>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar contraseña</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            disabled={submitting}
          />
        </div>
        <Button type="submit" className="w-full bg-gradient-primary" disabled={submitting}>
          {submitting ? 'Actualizando…' : 'Guardar nueva contraseña'}
        </Button>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm shadow-gaming">
        <CardHeader className="space-y-2 text-center">
          <CardTitle>Restablecer contraseña</CardTitle>
          <CardDescription>
            {status === 'ready'
              ? 'Ingresa una nueva contraseña para tu cuenta.'
              : statusMessage || 'Estamos preparando todo…'}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
}
