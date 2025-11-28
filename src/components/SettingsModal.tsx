import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { createOrUpdateGoal, getActiveGoal } from '@/services/firestore/goals';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onUpdated?: () => void;
}

export function SettingsModal({ open, onOpenChange, userId, onUpdated }: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [dailyMinutes, setDailyMinutes] = useState(10);
  const [focusSpeed, setFocusSpeed] = useState(true);
  const [focusComprehension, setFocusComprehension] = useState(true);
  const [targetWPM, setTargetWPM] = useState(250);
  const [darkMode, setDarkMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (open && userId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const load = async () => {
    try {
      setLoading(true);
      const activeGoal = await getActiveGoal(userId);
      if (activeGoal) {
        setDailyMinutes(activeGoal.dailyMinutes);
        setFocusSpeed(activeGoal.focusAreas.includes('speed'));
        setFocusComprehension(activeGoal.focusAreas.includes('comprehension'));
      }
    } catch (e) {
      console.warn('Could not load preferences', e);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!userId) return;
    try {
      setLoading(true);

      // Build focus areas array
      const focusAreas: ('speed' | 'comprehension')[] = [];
      if (focusSpeed) focusAreas.push('speed');
      if (focusComprehension) focusAreas.push('comprehension');

      // Create or update goal in Firestore
      await createOrUpdateGoal(userId, {
        dailyMinutes,
        focusAreas: focusAreas.length > 0 ? focusAreas : ['speed', 'comprehension'], // Default to both
      });

      toast({ title: 'Preferencias guardadas exitosamente' });
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudieron guardar las preferencias', variant: 'destructive' as any });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configuración</DialogTitle>
          <DialogDescription>Establece tu meta diaria y preferencias de entrenamiento.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="grid gap-2">
            <Label>Meta Diaria (minutos)</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
              value={dailyMinutes}
              onChange={e => setDailyMinutes(parseInt(e.target.value))}
            >
              <option value={5}>5 minutos</option>
              <option value={10}>10 minutos</option>
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
            </select>
          </div>

          <div>
            <Label className="mb-2 block">Enfoque de Entrenamiento</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch checked={focusSpeed} onCheckedChange={setFocusSpeed} />
                <Label className="cursor-pointer">Velocidad de lectura</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={focusComprehension} onCheckedChange={setFocusComprehension} />
                <Label className="cursor-pointer">Comprensión lectora</Label>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Objetivo WPM (futuro)</Label>
            <Input type="number" min={100} max={1200} value={targetWPM} onChange={e => setTargetWPM(parseInt(e.target.value) || 0)} disabled />
            <p className="text-xs text-muted-foreground">Próximamente: personalización avanzada</p>
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div>
              <Label className="cursor-pointer">Modo oscuro</Label>
              <p className="text-xs text-muted-foreground">(Próximamente)</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} disabled />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div>
              <Label className="cursor-pointer">Sonidos</Label>
              <p className="text-xs text-muted-foreground">(Próximamente)</p>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} disabled />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={save} disabled={loading} className="bg-gradient-primary">{loading ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
