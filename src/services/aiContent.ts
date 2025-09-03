// Lightweight OpenAI content generation service (client-side). For production,
// migrate to a serverless / edge function to avoid exposing the raw API key.
// Uses fetch to the OpenAI API with gpt-4o-mini for Spanish passages + 4 questions.

export interface GeneratedPassage {
  topic: string;
  passage: string;
  questions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    rationale?: string;
  }>;
  meta: { tokensEstimated: number };
}

interface GenerateOptions {
  topic: string;
  level?: number; // difficulty 1-10
  model?: string; // override model
  signal?: AbortSignal;
}

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

const systemPrompt = `Eres un generador de textos educativos breves en ESPAÑOL.
Produce:
1. Un pasaje (~130-170 palabras) sobre el tema dado, nivelado (1= muy simple, 10 = más complejo) evitando lenguaje ofensivo.
2. EXACTAMENTE 4 preguntas de opción múltiple:
   - Pregunta 1: tema / idea principal.
   - Pregunta 2: detalle específico literal.
   - Pregunta 3: inferencia o implicación.
   - Pregunta 4: vocabulario o significado contextual.
3. Cada pregunta: 4 opciones (A-D), solo una correcta.
4. Devuelve JSON estricto con campos: passage (string), questions: [{question, options[4], correctIndex (0-3)}].
No añadas explicación fuera del JSON.`;

function buildUserPrompt(topic: string, level: number) {
  return `TEMA: ${topic}\nNIVEL: ${level}`;
}

export async function generateReadingPassage(opts: GenerateOptions): Promise<GeneratedPassage> {
  const key = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('Missing VITE_OPENAI_API_KEY');
  }
  const model = opts.model || DEFAULT_MODEL;
  const level = Math.min(Math.max(opts.level ?? 1, 1), 10);

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserPrompt(opts.topic, level) }
    ],
    temperature: 0.8,
    max_tokens: 750,
  };

  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(body),
    signal: opts.signal
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '';

  // Attempt to extract JSON block
  const match = content.match(/\{[\s\S]*\}$/);
  if (!match) throw new Error('No JSON found in model response');
  let parsed: any;
  try { parsed = JSON.parse(match[0]); } catch (e) { throw new Error('Invalid JSON from model'); }

  if (!parsed.passage || !Array.isArray(parsed.questions) || parsed.questions.length !== 4) {
    throw new Error('Malformed content structure');
  }

  const questions = parsed.questions.map((q: any) => ({
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    rationale: q.rationale
  }));

  return {
    topic: opts.topic,
    passage: parsed.passage,
    questions,
    meta: { tokensEstimated: json.usage?.total_tokens ?? 0 }
  };
}

// Simple in-memory cache (session scope)
const cache = new Map<string, GeneratedPassage>();
export async function getOrGeneratePassage(topic: string, level: number): Promise<GeneratedPassage> {
  const key = `${topic.toLowerCase()}::${level}`;
  if (cache.has(key)) return cache.get(key)!;
  const data = await generateReadingPassage({ topic, level });
  cache.set(key, data);
  return data;
}
