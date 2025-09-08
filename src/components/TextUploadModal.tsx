import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

interface TextUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcess: (content: string) => Promise<void> | void; // futura generación WPM/preguntas
}

export function TextUploadModal({ open, onOpenChange, onProcess }: TextUploadModalProps) {
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxChars = 8000;

  // Configure pdf.js worker once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // With Vite, append ?url to get the URL string to the worker asset
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        if (!cancelled) {
          // Assign the URL for the worker; pdfjs will instantiate it
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (pdfjsLib as any).GlobalWorkerOptions.workerSrc = worker.default;
        }
      } catch (e) {
        // Non-fatal: we'll fallback to main-thread parsing (slow) if needed
        console.warn('Failed to load pdf.js worker', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    try {
      if (file.type === 'text/plain') {
        const text = await file.text();
        setRawText(text.slice(0, maxChars));
      } else if (file.type === 'application/pdf') {
        // Parse PDF text using pdfjs
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 50); // simple guard
        for (let i = 1; i <= maxPages && fullText.length < maxChars; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((it: any) => ('str' in it ? (it as any).str : ''))
            .filter(Boolean) as string[];
          fullText += strings.join(' ') + '\n\n';
        }
        setRawText(fullText.slice(0, maxChars));
      } else {
        setError('Formato no soportado. Usa .txt (PDF próximamente).');
      }
    } catch (err) {
      setError('No se pudo leer el archivo.');
    }
  };

  const cleanText = (text: string) => text.replace(/\s+/g, ' ').trim();

  const handleSubmit = async () => {
    const content = cleanText(rawText);
    if (!content || content.length < 100) {
      setError('Ingresa al menos 100 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onProcess(content);
      toast({ title: 'Texto cargado', description: 'Procesando lectura...' });
      onOpenChange(false);
      setRawText('');
      setFileName('');
    } catch (e) {
      setError('Error procesando el texto.');
      toast({ title: 'Error', description: 'No se pudo procesar el texto', variant: 'destructive' as any });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!loading) onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir Texto</DialogTitle>
          <DialogDescription>
            Pega o sube un archivo .txt (máx {maxChars.toLocaleString()} caracteres). PDF llegará pronto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input type="file" accept=".txt,application/pdf" onChange={handleFile} disabled={loading} />
          {fileName && <p className="text-xs text-muted-foreground">Archivo: {fileName}</p>}
          <Textarea
            value={rawText}
            onChange={e => setRawText(e.target.value.slice(0, maxChars))}
            placeholder="Pega aquí tu texto..."
            className="min-h-[180px]"
            disabled={loading}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{rawText.length} / {maxChars} chars</span>
            {rawText.length >= maxChars && <span className="text-warning">Límite alcanzado</span>}
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || rawText.length < 100} className="bg-gradient-primary">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Procesar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
