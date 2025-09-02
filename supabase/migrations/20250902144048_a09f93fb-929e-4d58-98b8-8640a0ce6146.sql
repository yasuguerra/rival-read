-- Add 15 new games to the games table

INSERT INTO public.games (name, code, description, skills_json) VALUES
('Palabras Gemelas', 'twin_words', 'El campo está formado por pares de palabras aleatorias. La tarea es encontrar lo más rápido posible todos los pares que consisten de palabras diferentes (no idénticas). Evite desplazar la mirada; perciba en bloques y no articule las palabras. El ejercicio desarrolla la memoria y la concentración de atención.', '{"speed": 0.6, "comp": 0.3, "attention": 0.9, "memory": 0.7}'),

('Campo de Visión', 'visual_field', 'El campo está formado por caracteres aleatorios. La tarea es determinar lo más rápido posible si los caracteres resaltados son iguales y pulsar el botón correspondiente. La mirada debe estar clavada en el punto central. No intente "deslizar" rápidamente la mirada; hay que ver todo el campo a la vez. El ejercicio expande el campo de visión y desarrolla la concentración.', '{"speed": 0.8, "comp": 0.2, "attention": 0.9, "memory": 0.3}'),

('Anagramas', 'anagrams', 'Los anagramas son palabras formadas por las mismas letras pero en una secuencia diferente. La palabra enigmática aparece en la parte superior y varios anagramas candidatos en la zona central. En un tiempo determinado, debes encontrar el anagrama correcto, es decir, el que está formado solo por letras de la palabra enigmática.', '{"speed": 0.5, "comp": 0.8, "attention": 0.6, "memory": 0.5}'),

('Encuentre las Palabras', 'find_words', 'El campo está formado por letras aleatorias. La tarea es encontrar lo más rápido posible todas las palabras ocultas. El ejercicio desarrolla la habilidad de reconocer patrones/"imágenes" y la capacidad de separar lo principal de lo secundario.', '{"speed": 0.7, "comp": 0.6, "attention": 0.8, "memory": 0.4}'),

('Buscar en el Texto', 'text_scanning', 'Las palabras objetivo aparecerán en la parte superior de la pantalla. La tarea es encontrarlas en el texto tan pronto como sea posible. Evite leer palabra por palabra; perciba el texto como un bloque y aproveche al máximo la visión periférica. Este ejercicio permite memorizar la forma visual de las palabras, mejora la concentración en el texto y expande la visión periférica.', '{"speed": 0.9, "comp": 0.5, "attention": 0.8, "memory": 0.4}'),

('Acelerador de Lectura', 'reading_accelerator', 'La tarea es leer un pequeño texto siguiendo con la mirada el área resaltada (la "iluminación"). Trate de no perder esta iluminación, incluso si siente que no tuvo tiempo para leer algo por completo. El ejercicio es provechoso para incrementar la velocidad de lectura y suprimir regresiones (hábito de volver a leer).', '{"speed": 0.9, "comp": 0.7, "attention": 0.6, "memory": 0.3}'),

('Evaluación de Lectura', 'reading_assessment', 'Se ofrecerá un texto breve (o el usuario puede subir su propio texto). Debe ponerse cómodo, relajarse y leer al ritmo habitual, sin prisa, con el fin de entender y recordar lo mejor posible de qué se trata el texto. Una vez leído, se presentarán preguntas de opción múltiple para evaluar la asimilación del contenido.', '{"speed": 0.3, "comp": 0.9, "attention": 0.5, "memory": 0.6}'),

('Acelerador de Neuronas', 'neuron_accelerator', 'Pruebas cortas de control inhibitorio/atencional entre juegos. 30–45 s entre bloques, para resetear foco. El ejercicio mejora la precisión sobre velocidad y luego la velocidad.', '{"speed": 0.7, "comp": 0.3, "attention": 0.9, "memory": 0.4}'),

('Cloze Inteligente', 'smart_cloze', 'Se presentan párrafos con huecos; elegir la palabra correcta entre 4 opciones. 6–10 ítems por bloque; cronómetro y penalización por adivinanza. El ejercicio desarrolla cohesión, inferencia contextual y vocabulario.', '{"speed": 0.4, "comp": 0.9, "attention": 0.6, "memory": 0.5}'),

('Título y Resumen', 'title_gist', 'Tras leer un párrafo, escoger el mejor título entre 3–4 opciones y luego escribir/seleccionar una frase-resumen. Tiempo límite corto; feedback con justificación. El ejercicio desarrolla macroestructura, idea principal y compresión semántica.', '{"speed": 0.5, "comp": 0.9, "attention": 0.7, "memory": 0.6}'),

('Salto Sacádico', 'saccadic_jump', 'Líneas de palabras con anclajes marcados; el usuario debe "saltar" entre anclajes sin detenerse. En móvil, avanzar con swipe o tap; dificultad aumenta la distancia entre anclajes y el ritmo. El ejercicio mejora el control sacádico y reduce regresiones.', '{"speed": 0.8, "comp": 0.4, "attention": 0.8, "memory": 0.3}'),

('Predicción Contextual', 'contextual_prediction', 'Mostrar fragmentos y pedir la siguiente palabra/frase correcta entre opciones. Opciones con distractores plausibles; dificultad incrementa ambigüedad y longitud del contexto. El ejercicio desarrolla predicción, modelado del contexto y fluidez.', '{"speed": 0.6, "comp": 0.8, "attention": 0.6, "memory": 0.5}'),

('Mapa Mental Rápido', 'quick_mind_map', 'Arrastrar y ordenar ideas clave del texto en un esquema correcto. Piezas tipo drag-and-drop; dificultad aumenta número de nodos y similitud entre distractores. El ejercicio desarrolla organización, jerarquía conceptual y transferencia.', '{"speed": 0.4, "comp": 0.8, "attention": 0.7, "memory": 0.7}'),

('Par/Impar', 'even_odd', 'El campo está formado por números aleatorios. La tarea es encontrar consecutivamente todos los números pares e impares, y hacerlo lo más rápido posible. Regla: cuando el último dígito es par (0, 2, 4, 6 u 8), el número entero también es par; de lo contrario, es impar. Trate de no mover mucho los ojos; en vez de examinar cada número por separado, capte bloques enteros con una sola mirada.', '{"speed": 0.8, "comp": 0.2, "attention": 0.9, "memory": 0.4}'),

('Encuentre el Número', 'find_number', 'El campo está formado por números aleatorios. La tarea es encontrar lo más rápido posible la secuencia de números igual a la que aparece en la parte superior de la pantalla. El ejercicio desarrolla el reconocimiento de patrones y mejora la visión periférica.', '{"speed": 0.7, "comp": 0.3, "attention": 0.8, "memory": 0.6}');