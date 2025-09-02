-- Insertar los nuevos juegos
INSERT INTO games (name, code, description, skills_json) VALUES 
(
  'Recuerde el Número',
  'number_memory',
  'Durante un corto tiempo se mostrará un número. Hay que recordar y reproducir todos los dígitos con la mayor precisión posible.',
  '{"memory": 0.8, "attention": 0.2}'
),
(
  'Carrera de Palabras RSVP',
  'word_race_rsvp', 
  'En un campo con varias líneas, durante un breve período aparecerán de forma rápida y aleatoria diferentes palabras. La tarea es recordar la última palabra.',
  '{"speed": 0.7, "attention": 0.3}'
),
(
  'Cadena de Palabras',
  'word_chain',
  'Durante un corto tiempo se mostrará una secuencia de palabras aleatorias. El usuario debe leerla, memorizarla y seleccionar las palabras en el mismo orden.',
  '{"memory": 0.6, "attention": 0.4}'
);