// Gemini (Google AI) content generation service for generating reading passages and questions
// Uses Google's Gemini API with Google Cloud credits

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
  signal?: AbortSignal;
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    throw new Error('Missing VITE_GEMINI_API_KEY. Get your API key from https://makersuite.google.com/app/apikey');
  }

  const level = Math.min(Math.max(opts.level ?? 1, 1), 10);

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `${systemPrompt}\n\n${buildUserPrompt(opts.topic, level)}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 1024,
      responseMimeType: "application/json"
    }
  };

  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: opts.signal
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const json = await res.json();

  // Extract text from Gemini response structure
  const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!responseText) {
    throw new Error('No response from Gemini API');
  }

  // Parse the JSON response
  let parsed: any;
  try {
    // Gemini should return JSON directly since we set responseMimeType
    parsed = JSON.parse(responseText);
  } catch (e) {
    // Try to extract JSON if it's wrapped in markdown
    const match = responseText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in Gemini response');
    try {
      parsed = JSON.parse(match[0]);
    } catch (e2) {
      throw new Error('Invalid JSON from Gemini');
    }
  }

  if (!parsed.passage || !Array.isArray(parsed.questions) || parsed.questions.length !== 4) {
    throw new Error('Malformed content structure from Gemini');
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
    meta: {
      tokensEstimated: json.usageMetadata?.totalTokenCount ?? 0
    }
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
