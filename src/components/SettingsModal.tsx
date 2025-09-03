import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onUpdated?: () => void;
}

// This component consolidates early user preferences. Future: move to dedicated 'user_preferences' table
export function SettingsModal({ open, onOpenChange, userId, onUpdated }: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [targetWPM, setTargetWPM] = useState(250);
  const [darkMode, setDarkMode] = useState(true); // placeholder: integrate theme system later
  const [soundEnabled, setSoundEnabled] = useState(true); // for future feedback SFX
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(true); // toggle for forthcoming adaptive engine

  useEffect(() => {
    if (open && userId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const load = async () => {
    try {
      setLoading(true);
      // Load preferences table if exists (defensive)
      // Attempt to load preferences table dynamically; if not present, ignore
      try {
        const { data: prefs, error } = await (supabase as any)
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (!error && prefs) {
          if (prefs.target_wpm) setTargetWPM(prefs.target_wpm);
          if (typeof prefs.dark_mode === 'boolean') setDarkMode(prefs.dark_mode);
          if (typeof prefs.sound_enabled === 'boolean') setSoundEnabled(prefs.sound_enabled);
          if (typeof prefs.adaptive_enabled === 'boolean') setAdaptiveEnabled(prefs.adaptive_enabled);
        }
      } catch (_) {
        // table not ready yet
      }
    } catch (e) {
      console.warn('No se pudieron cargar preferencias aún.', e);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!userId) return;
    try {
      setLoading(true);

      // Upsert preferences (create table if not yet in migrations plan)
      try {
        const { error: upsertErr } = await (supabase as any)
          .from('user_preferences')
          .upsert({
            user_id: userId,
            target_wpm: targetWPM,
            dark_mode: darkMode,
            sound_enabled: soundEnabled,
            adaptive_enabled: adaptiveEnabled,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        if (upsertErr && upsertErr.code === '42P01') {
          toast({ title: 'Tabla faltante', description: 'Crear user_preferences en migración.', variant: 'destructive' as any });
        }
      } catch (_) {
        // ignore if table missing
      }

      toast({ title: 'Preferencias guardadas' });
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
          <DialogDescription>Preferencias personales (la meta diaria se define en Entrenar Ahora).</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="grid gap-2">
            <Label>Objetivo WPM</Label>
            <Input type="number" min={100} max={1200} value={targetWPM} onChange={e => setTargetWPM(parseInt(e.target.value) || 0)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="cursor-pointer">Modo oscuro</Label>
              <p className="text-xs text-muted-foreground">(Placeholder - integrará con theme)</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="cursor-pointer">Sonidos</Label>
              <p className="text-xs text-muted-foreground">Feedback en minijuegos</p>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="cursor-pointer">Adaptatividad</Label>
              <p className="text-xs text-muted-foreground">Ajuste dinámico de dificultad (próximo)</p>
            </div>
            <Switch checked={adaptiveEnabled} onCheckedChange={setAdaptiveEnabled} />
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
