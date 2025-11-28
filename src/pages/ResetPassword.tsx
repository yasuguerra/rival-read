import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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

  // Firebase uses 'oobCode' for password reset
  const oobCode = useMemo(() => searchParams.get('oobCode'), [searchParams]);

  useEffect(() => {
    if (!oobCode) {
      setStatus('error');
      setStatusMessage('El enlace de recuperación no es válido.');
      return;
    }
    // Firebase validates the code when we try to confirm, or we can verify it before.
    // For simplicity, we assume it's ready if present.
    setStatus('ready');
    setStatusMessage('');
  }, [oobCode]);

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

    if (!oobCode) return;

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('success');
      toast({
        title: '¡Contraseña actualizada!',
        description: 'Ahora puedes iniciar sesión con tu nueva contraseña.'
      });
      setTimeout(() => navigate('/'), 1500);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
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
