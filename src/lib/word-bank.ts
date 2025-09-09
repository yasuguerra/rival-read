// Simple word bank for Running Words game
// Extend as needed; keep locale keys stable
export const WORD_BANK = {
  runningWords: {
    es: [
      'casa','perro','gato','árbol','agua','fuego','tierra','cielo','luna','sol',
      'libro','mesa','silla','ventana','puerta','flor','jardín','montaña','río','mar',
      'tiempo','mundo','vida','amor','paz','guerra','música','arte','color','luz',
      'noche','día','hora','minuto','segundo','año','mes','semana','trabajo','estudio',
      'familia','amigo','persona','niño','adulto','ciudad','país','viaje','camino','coche',
      'tren','avión','barco','comida','fruta','verdura','pan','leche','café','té',
      'escuela','colegio','universidad','libertad','salud','mente','cuerpo','fuerza','veloz','lento',
      'feliz','triste','rápido','lento','claro','oscuro','alto','bajo','nuevo','viejo',
      'izquierda','derecha','frente','detrás','dentro','fuera','primero','último','cerca','lejos',
      'pequeño','grande','fácil','difícil','calor','frío','lluvia','viento','nieve','tormenta'
    ],
    en: [
      'house','dog','cat','tree','water','fire','earth','sky','moon','sun',
      'book','table','chair','window','door','flower','garden','mountain','river','sea',
      'time','world','life','love','peace','war','music','art','color','light',
      'night','day','hour','minute','second','year','month','week','work','study',
      'family','friend','person','child','adult','city','country','travel','road','car',
      'train','plane','boat','food','fruit','vegetable','bread','milk','coffee','tea',
      'school','college','university','freedom','health','mind','body','strength','fast','slow',
      'happy','sad','quick','slow','clear','dark','tall','short','new','old',
      'left','right','front','back','inside','outside','first','last','near','far',
      'small','large','easy','hard','heat','cold','rain','wind','snow','storm'
    ]
  }
} as const;

export type LocaleKey = keyof typeof WORD_BANK.runningWords;
