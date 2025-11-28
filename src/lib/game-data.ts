export interface Game {
    id: string;
    code: string;
    name: string;
    description: string;
    skills_json: {
        speed?: number;
        comp?: number;
        attention?: number;
        memory?: number;
        logic?: number;
        vocabulary?: number;
        vision?: number;
    };
}

export const GAMES_DATA: Game[] = [
    {
        id: '1',
        code: 'schulte',
        name: 'Tabla Schulte',
        description: 'Mejora tu visión periférica y atención encontrando números en orden.',
        skills_json: { speed: 0.8, attention: 0.9, vision: 1.0 }
    },
    {
        id: '2',
        code: 'letter_search',
        name: 'Búsqueda de Letras',
        description: 'Encuentra la letra objetivo lo más rápido posible.',
        skills_json: { speed: 0.7, attention: 1.0 }
    },
    {
        id: '3',
        code: 'word_race',
        name: 'Carrera de Palabras',
        description: 'Lee y comprende palabras a alta velocidad.',
        skills_json: { speed: 1.0, comp: 0.6 }
    },
    {
        id: '4',
        code: 'number_memory',
        name: 'Memoria Numérica',
        description: 'Memoriza secuencias de números cada vez más largas.',
        skills_json: { memory: 1.0, attention: 0.6 }
    },
    {
        id: '5',
        code: 'word_race_rsvp',
        name: 'Lectura RSVP',
        description: 'Lectura rápida visual secuencial.',
        skills_json: { speed: 1.0, attention: 0.8 }
    },
    {
        id: '6',
        code: 'word_chain',
        name: 'Cadena de Palabras',
        description: 'Conecta palabras por su última letra.',
        skills_json: { vocabulary: 0.9, memory: 0.5 }
    },
    {
        id: '7',
        code: 'twin_words',
        name: 'Palabras Gemelas',
        description: 'Identifica si dos palabras son iguales o diferentes.',
        skills_json: { speed: 0.8, attention: 0.8 }
    },
    {
        id: '8',
        code: 'even_odd',
        name: 'Par o Impar',
        description: 'Clasifica números rápidamente.',
        skills_json: { logic: 0.8, speed: 0.7 }
    },
    {
        id: '9',
        code: 'anagrams',
        name: 'Anagramas',
        description: 'Forma palabras con las letras dadas.',
        skills_json: { vocabulary: 1.0, logic: 0.6 }
    },
    {
        id: '10',
        code: 'find_number',
        name: 'Encuentra el Número',
        description: 'Localiza un número específico en una cuadrícula.',
        skills_json: { attention: 1.0, speed: 0.6 }
    },
    {
        id: '11',
        code: 'visual_field',
        name: 'Campo Visual',
        description: 'Expande tu campo de visión.',
        skills_json: { vision: 1.0, attention: 0.7 }
    },
    {
        id: '12',
        code: 'find_words',
        name: 'Sopa de Letras',
        description: 'Encuentra palabras ocultas en la cuadrícula.',
        skills_json: { attention: 0.9, vocabulary: 0.6 }
    },
    {
        id: '13',
        code: 'text_scanning',
        name: 'Escaneo de Texto',
        description: 'Busca información específica en un texto.',
        skills_json: { speed: 0.9, attention: 0.8 }
    },
    {
        id: '14',
        code: 'reading_accelerator',
        name: 'Acelerador de Lectura',
        description: 'Entrenamiento guiado de velocidad de lectura.',
        skills_json: { speed: 1.0 }
    },
    {
        id: '15',
        code: 'neuron_accelerator',
        name: 'Acelerador Neuronal',
        description: 'Ejercicios de agilidad mental.',
        skills_json: { speed: 0.9, logic: 0.8 }
    }
];
