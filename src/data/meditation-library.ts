/**
 * Biblioteca de meditaciones guiadas por texto con fases.
 */
import type { InterventionType } from '@/src/constants/categories';
import { getCategoryColor } from '@/src/constants/categories';

export interface MeditationPhase {
  startSeconds: number;
  text: string;
  instruction?: string;
}

export interface MeditationTemplate {
  id: string;
  title: string;
  description: string;
  type: 'mindfulness' | 'body_scan' | 'gratitude' | 'visualization' | 'focus' | 'wim_hof' | 'relaxation';
  durationMinutes: number;
  category: InterventionType;
  accentColor: string;
  phases: MeditationPhase[];
  closingMessage: string;
}

const P = getCategoryColor('mind');

export const MEDITATION_LIBRARY: MeditationTemplate[] = [
  // === MINDFULNESS ===
  {
    id: 'mindfulness-5', title: 'Presencia', description: 'Atención a la respiración',
    type: 'mindfulness', durationMinutes: 5, category: 'mind', accentColor: P,
    closingMessage: '5 minutos de presencia. Cada segundo cuenta.',
    phases: [
      { startSeconds: 0, text: 'Cierra los ojos.', instruction: 'Respira profundo 3 veces. Inhala por la nariz, exhala por la boca.' },
      { startSeconds: 30, text: 'Respira con naturalidad.', instruction: 'No intentes controlar nada. Solo observa el aire entrar y salir.' },
      { startSeconds: 60, text: 'Enfócate en la inhalación.', instruction: 'Siente el aire fresco entrando por tu nariz.' },
      { startSeconds: 120, text: 'Enfócate en la exhalación.', instruction: 'Siente el calor del aire al salir. Tu cuerpo se suelta.' },
      { startSeconds: 180, text: 'Si tu mente se fue, está bien.', instruction: 'Sin juzgar, regresa a la respiración. Eso es meditar.' },
      { startSeconds: 240, text: 'Último minuto.', instruction: 'Estás aquí. Estás presente. Eso es suficiente.' },
      { startSeconds: 280, text: 'Suavemente, regresa.', instruction: 'Mueve los dedos. Abre los ojos cuando estés listo.' },
    ],
  },
  {
    id: 'mindfulness-10', title: 'Calma profunda', description: 'Atención plena y soltar',
    type: 'mindfulness', durationMinutes: 10, category: 'mind', accentColor: P,
    closingMessage: '10 minutos de calma. Tu mente te lo agradece.',
    phases: [
      { startSeconds: 0, text: 'Encuentra tu postura.', instruction: 'Espalda recta, hombros sueltos. Cierra los ojos.' },
      { startSeconds: 30, text: 'Tres respiraciones profundas.', instruction: 'Inhala contando 4... exhala contando 6. Tres veces.' },
      { startSeconds: 60, text: 'Deja que la respiración sea natural.', instruction: 'No la controles. Solo obsérvala como un espectador.' },
      { startSeconds: 120, text: 'Nota dónde sientes la respiración.', instruction: '¿En la nariz? ¿El pecho? ¿El abdomen? Ancla tu atención ahí.' },
      { startSeconds: 180, text: 'Los pensamientos van y vienen.', instruction: 'Como nubes en el cielo. Los ves pasar. No te subes a ellos.' },
      { startSeconds: 300, text: 'Escanea tu cuerpo brevemente.', instruction: 'De la cabeza a los pies. ¿Dónde hay tensión? Respira hacia ese lugar.' },
      { startSeconds: 390, text: 'Regresa a la respiración.', instruction: 'Simple. Aire entra, aire sale. Nada más importa ahora.' },
      { startSeconds: 480, text: 'Expande tu atención.', instruction: 'Siente el espacio a tu alrededor. Los sonidos. La temperatura.' },
      { startSeconds: 540, text: 'Último minuto de quietud.', instruction: 'Agradece este momento. No todos se dan el permiso de parar.' },
      { startSeconds: 580, text: 'Suavemente, regresa.', instruction: 'Mueve los dedos, los pies. Abre los ojos. Lleva esta calma contigo.' },
    ],
  },
  {
    id: 'mindfulness-20', title: 'Inmersión total', description: 'Meditación extendida de presencia',
    type: 'mindfulness', durationMinutes: 20, category: 'mind', accentColor: P,
    closingMessage: '20 minutos de inmersión. Eso es disciplina mental real.',
    phases: [
      { startSeconds: 0, text: 'Siéntate cómodo. Cierra los ojos.', instruction: 'Este es tu tiempo. Nada requiere tu atención excepto este momento.' },
      { startSeconds: 30, text: 'Respira profundo 5 veces.', instruction: 'Inhala 4 segundos, exhala 6 segundos. Siente cómo baja tu ritmo.' },
      { startSeconds: 90, text: 'Respiración natural.', instruction: 'Solo observa. Sin controlar. Sin juzgar.' },
      { startSeconds: 180, text: 'Ancla en el abdomen.', instruction: 'Siente cómo sube y baja con cada respiración.' },
      { startSeconds: 300, text: 'Tu mente se irá muchas veces.', instruction: 'Cada vez que regresas, fortaleces tu músculo de atención.' },
      { startSeconds: 420, text: 'Nota las sensaciones.', instruction: 'Hormigueo, calor, presión. Todo es información. Solo observa.' },
      { startSeconds: 540, text: 'Suelta cualquier esfuerzo.', instruction: 'No estás tratando de lograr nada. Solo estás siendo.' },
      { startSeconds: 660, text: 'Espacio entre pensamientos.', instruction: 'Busca el silencio entre un pensamiento y el siguiente. Ahí estás tú.' },
      { startSeconds: 780, text: 'Observa sin nombre.', instruction: 'Los sonidos son solo vibración. Las sensaciones son solo energía.' },
      { startSeconds: 900, text: 'Respira con gratitud.', instruction: 'Por tu cuerpo. Por este momento. Por la decisión de estar aquí.' },
      { startSeconds: 1020, text: 'Expande tu conciencia.', instruction: 'Del cuerpo al cuarto. Del cuarto al mundo. Todo conectado.' },
      { startSeconds: 1100, text: 'Empieza a regresar.', instruction: 'Siente tus manos. Tus pies. El peso de tu cuerpo.' },
      { startSeconds: 1160, text: 'Abre los ojos lentamente.', instruction: 'Lleva esta presencia al resto de tu día.' },
    ],
  },

  // === BODY SCAN ===
  {
    id: 'body-scan-10', title: 'Body scan nocturno', description: 'Relajación progresiva para dormir',
    type: 'body_scan', durationMinutes: 10, category: 'rest', accentColor: P,
    closingMessage: 'Tu cuerpo está listo para descansar. Buenas noches.',
    phases: [
      { startSeconds: 0, text: 'Acuéstate boca arriba.', instruction: 'Brazos a los lados, palmas hacia arriba. Cierra los ojos.' },
      { startSeconds: 30, text: 'Tres respiraciones largas.', instruction: 'Con cada exhala, siente cómo tu cuerpo se hunde en la cama.' },
      { startSeconds: 60, text: 'Pies y tobillos.', instruction: 'Lleva tu atención a los pies. Siente su peso. Déjalos ir.' },
      { startSeconds: 120, text: 'Pantorrillas y rodillas.', instruction: 'Nota cualquier tensión. Respira hacia ella. Suéltala.' },
      { startSeconds: 180, text: 'Muslos y caderas.', instruction: 'Músculos grandes. Mucha tensión acumulada. Déjala ir.' },
      { startSeconds: 240, text: 'Abdomen y espalda baja.', instruction: 'Siente cómo se expande con cada respiración. Suave. Relajado.' },
      { startSeconds: 320, text: 'Pecho y espalda alta.', instruction: 'Tu corazón late tranquilo. Tu respiración es suave.' },
      { startSeconds: 400, text: 'Manos, brazos, hombros.', instruction: 'Desde las puntas de los dedos hasta los hombros. Todo se suelta.' },
      { startSeconds: 480, text: 'Cuello y mandíbula.', instruction: 'Relaja la mandíbula. Separa los dientes. Suelta la lengua.' },
      { startSeconds: 540, text: 'Cara y cabeza.', instruction: 'Frente suave. Ojos relajados. Cuero cabelludo suelto.' },
      { startSeconds: 580, text: 'Todo el cuerpo, completo.', instruction: 'Un solo organismo relajado. Pesado. En paz. Déjate ir.' },
    ],
  },
  {
    id: 'body-scan-15', title: 'Relajación total', description: 'Body scan profundo de 15 minutos',
    type: 'body_scan', durationMinutes: 15, category: 'rest', accentColor: P,
    closingMessage: 'Relajación total completada. Cada célula de tu cuerpo te lo agradece.',
    phases: [
      { startSeconds: 0, text: 'Posición cómoda.', instruction: 'Acostado o sentado. Lo que sea más cómodo. Cierra los ojos.' },
      { startSeconds: 30, text: 'Respira y suelta.', instruction: '5 respiraciones profundas. Con cada exhala, tu cuerpo pesa más.' },
      { startSeconds: 90, text: 'Pie derecho.', instruction: 'Cada dedo, la planta, el talón. Siente y suelta.' },
      { startSeconds: 150, text: 'Pierna derecha completa.', instruction: 'Pantorrilla, rodilla, muslo. Una ola de relajación sube.' },
      { startSeconds: 220, text: 'Pie izquierdo.', instruction: 'Misma atención. Cada dedo, la planta, el talón.' },
      { startSeconds: 280, text: 'Pierna izquierda completa.', instruction: 'Pantorrilla, rodilla, muslo. Siente la simetría de la relajación.' },
      { startSeconds: 350, text: 'Pelvis y abdomen bajo.', instruction: 'Centro de tu cuerpo. Respira hacia aquí. Expande y suelta.' },
      { startSeconds: 420, text: 'Abdomen y espalda.', instruction: 'Los músculos del core se relajan. No necesitas sostener nada.' },
      { startSeconds: 500, text: 'Pecho y costillas.', instruction: 'Siente tu respiración mover las costillas. Suave. Rítmico.' },
      { startSeconds: 570, text: 'Mano derecha, brazo, hombro.', instruction: 'De los dedos al hombro. Una cascada de relajación.' },
      { startSeconds: 640, text: 'Mano izquierda, brazo, hombro.', instruction: 'Mismo recorrido. Los brazos pesan. Están completamente sueltos.' },
      { startSeconds: 710, text: 'Cuello y garganta.', instruction: 'Lugar de estrés. Respira aquí. Suéltalo todo.' },
      { startSeconds: 770, text: 'Rostro completo.', instruction: 'Mandíbula, mejillas, ojos, frente. Todo suave. Sin esfuerzo.' },
      { startSeconds: 830, text: 'Corona de la cabeza.', instruction: 'Imagina una luz cálida entrando por arriba, llenando todo el cuerpo.' },
      { startSeconds: 870, text: 'Cuerpo completo en paz.', instruction: 'Permanece aquí. Nada que hacer. Nada que arreglar. Solo ser.' },
    ],
  },

  // === GRATITUD ===
  {
    id: 'gratitude-5', title: 'Gratitud', description: '3 cosas por las que agradecer',
    type: 'gratitude', durationMinutes: 5, category: 'mind', accentColor: P,
    closingMessage: 'La gratitud cambia la química de tu cerebro. Literalmente.',
    phases: [
      { startSeconds: 0, text: 'Cierra los ojos. Respira.', instruction: 'Vamos a reconocer lo bueno en tu vida.' },
      { startSeconds: 30, text: 'Primera cosa.', instruction: 'Piensa en algo que salió bien hoy. Puede ser pequeño. Siéntelo.' },
      { startSeconds: 90, text: 'Quédate con esa sensación.', instruction: 'No solo lo pienses. Siente la gratitud en el pecho. Déjala expandirse.' },
      { startSeconds: 120, text: 'Segunda cosa.', instruction: 'Una persona que te importa. Alguien que estuvo ahí. Visualízala.' },
      { startSeconds: 180, text: 'Siente la conexión.', instruction: 'Envíale gratitud mentalmente. Sonríe si quieres.' },
      { startSeconds: 210, text: 'Tercera cosa.', instruction: 'Algo de ti mismo. Un esfuerzo que hiciste. Una decisión que tomaste.' },
      { startSeconds: 270, text: 'Reconócete.', instruction: 'No es ego. Es honestidad. Hiciste algo bien y mereces notarlo.' },
      { startSeconds: 290, text: 'Abre los ojos.', instruction: 'Lleva esta energía contigo. El día se ve diferente desde la gratitud.' },
    ],
  },

  // === VISUALIZACIÓN ===
  {
    id: 'visualization-10', title: 'Visión de futuro', description: 'Visualiza tu mejor versión',
    type: 'visualization', durationMinutes: 10, category: 'mind', accentColor: P,
    closingMessage: 'Lo que visualizas con claridad, tu cerebro lo persigue.',
    phases: [
      { startSeconds: 0, text: 'Cierra los ojos. Relájate.', instruction: 'Tres respiraciones profundas para centrar tu mente.' },
      { startSeconds: 40, text: 'Imagina un año desde hoy.', instruction: 'Todo salió bien. Tus metas se cumplieron. ¿Dónde estás?' },
      { startSeconds: 100, text: '¿Cómo se ve tu cuerpo?', instruction: 'Fuerte. Saludable. Energía alta. Visualízate con detalle.' },
      { startSeconds: 180, text: '¿Cómo te sientes?', instruction: 'Confianza. Claridad. Calma. Siente esas emociones ahora.' },
      { startSeconds: 260, text: '¿Quién está contigo?', instruction: 'Las personas que importan. Visualiza sus rostros. Su energía.' },
      { startSeconds: 340, text: '¿Qué lograste?', instruction: 'El récord, el negocio, la salud, la relación. Lo que sea tuyo.' },
      { startSeconds: 420, text: 'Ahora regresa al hoy.', instruction: '¿Qué acción de HOY te acerca a esa visión?' },
      { startSeconds: 500, text: 'Compromiso.', instruction: 'Repite internamente: Yo soy capaz. Yo estoy en camino. Yo no paro.' },
      { startSeconds: 560, text: 'Abre los ojos.', instruction: 'La visión es clara. Ahora ve y ejecútala.' },
    ],
  },

  // === ENFOQUE ===
  {
    id: 'focus-10', title: 'Enfoque láser', description: 'Concentración profunda pre-trabajo',
    type: 'focus', durationMinutes: 10, category: 'mind', accentColor: P,
    closingMessage: 'Tu mente está afilada. Usa ese enfoque ahora.',
    phases: [
      { startSeconds: 0, text: 'Postura alerta.', instruction: 'Espalda recta, ojos cerrados. No es relajación — es activación mental.' },
      { startSeconds: 30, text: 'Respiración de activación.', instruction: 'Inhala 4 seg, exhala 4 seg. Ritmo constante. 10 ciclos.' },
      { startSeconds: 90, text: 'Define tu intención.', instruction: '¿Qué vas a hacer después de esto? Visualiza la tarea con claridad.' },
      { startSeconds: 150, text: 'Enfoque en un punto.', instruction: 'Imagina un punto de luz en tu frente. Toda tu atención ahí.' },
      { startSeconds: 240, text: 'Los pensamientos son ruido.', instruction: 'No los sigas. Regresa al punto. Una y otra vez.' },
      { startSeconds: 360, text: 'Intensifica.', instruction: 'El punto se hace más brillante. Tu concentración se agudiza.' },
      { startSeconds: 450, text: 'Tu mente es una herramienta.', instruction: 'Tú decides dónde apunta. Ahora mismo apunta a un solo lugar.' },
      { startSeconds: 540, text: 'Prepárate para actuar.', instruction: 'En unos momentos abrirás los ojos y ejecutarás con precisión.' },
      { startSeconds: 580, text: 'Abre los ojos. Ejecuta.', instruction: 'Sin transición. Sin distracción. Ve directo a lo que importa.' },
    ],
  },

  // === WIM HOF ===
  {
    id: 'wim-hof-10', title: 'Wim Hof Breathing', description: '3 rondas de respiración + retención',
    type: 'wim_hof', durationMinutes: 11, category: 'rest', accentColor: P,
    closingMessage: 'Tu cuerpo está oxigenado y activado. Energía pura.',
    phases: [
      { startSeconds: 0, text: 'Posición cómoda.', instruction: 'Sentado o acostado. NUNCA hagas esto en agua o manejando.' },
      { startSeconds: 15, text: 'RONDA 1 — 30 respiraciones.', instruction: 'Inhala profundo por la nariz, exhala corto por la boca. Ritmo constante.' },
      { startSeconds: 20, text: 'Respira... 1, 2, 3...', instruction: 'Pecho y abdomen se expanden completamente. Exhala soltando.' },
      { startSeconds: 100, text: 'Última respiración. RETENCIÓN.', instruction: 'Exhala todo el aire y AGUANTA. No respires. Relájate.' },
      { startSeconds: 105, text: 'Retención 1... aguanta.', instruction: 'Sin aire. Relaja todo el cuerpo. Siente el hormigueo.' },
      { startSeconds: 165, text: 'INHALA profundo. Retén 15 seg.', instruction: 'Llena los pulmones al máximo. Aguanta 15 segundos.' },
      { startSeconds: 185, text: 'RONDA 2 — 30 respiraciones.', instruction: 'Mismo ritmo. Inhala profundo, exhala corto. Más intenso.' },
      { startSeconds: 270, text: 'Última respiración. RETENCIÓN.', instruction: 'Exhala todo. Aguanta. Esta vez intenta más tiempo.' },
      { startSeconds: 275, text: 'Retención 2... aguanta.', instruction: 'Tu cuerpo puede más de lo que crees. Confía.' },
      { startSeconds: 355, text: 'INHALA profundo. Retén 15 seg.', instruction: 'Pulmones llenos. Aprieta. 15 segundos.' },
      { startSeconds: 375, text: 'RONDA 3 — 30 respiraciones.', instruction: 'Última ronda. Dalo todo. Cada respiración cuenta.' },
      { startSeconds: 460, text: 'Última respiración. RETENCIÓN.', instruction: 'La retención más larga. Exhala todo. Suelta. Aguanta.' },
      { startSeconds: 465, text: 'Retención 3... tú puedes.', instruction: 'Más allá de lo cómodo. Ahí es donde creces.' },
      { startSeconds: 555, text: 'INHALA profundo. Retén 15 seg.', instruction: 'Última retención con pulmones llenos. Siente la energía.' },
      { startSeconds: 575, text: 'Exhala. Respira normal.', instruction: 'Lo lograste. 3 rondas completas. Tu cuerpo está despierto.' },
    ],
  },

  // === RESET RÁPIDO ===
  {
    id: 'relax-3', title: 'Reset rápido', description: '3 minutos para resetear el estrés',
    type: 'relaxation', durationMinutes: 3, category: 'rest', accentColor: P,
    closingMessage: '3 minutos. Eso es todo lo que necesitas para resetear.',
    phases: [
      { startSeconds: 0, text: 'Para todo.', instruction: 'Cierra los ojos. Una respiración profunda.' },
      { startSeconds: 15, text: 'Suelta los hombros.', instruction: 'Probablemente están tensos. Déjalos caer.' },
      { startSeconds: 30, text: 'Respiración 4-4.', instruction: 'Inhala 4 segundos. Exhala 4 segundos. Sin prisa.' },
      { startSeconds: 70, text: 'Afloja la mandíbula.', instruction: 'Separa los dientes. Relaja la lengua.' },
      { startSeconds: 100, text: 'Siente tus manos.', instruction: '¿Están apretadas? Ábrelas. Siente la sangre circular.' },
      { startSeconds: 130, text: 'Una respiración más profunda.', instruction: 'La más grande del día. Inhala... y suelta todo.' },
      { startSeconds: 160, text: 'Abre los ojos.', instruction: 'Reseteado. Listo para lo que sigue.' },
    ],
  },
];

/** Tipos con icono y label para la selección */
export const MEDITATION_TYPES: { type: string; label: string; icon: string }[] = [
  { type: 'mindfulness', label: 'Mindfulness', icon: 'leaf-outline' },
  { type: 'body_scan', label: 'Body Scan', icon: 'body-outline' },
  { type: 'gratitude', label: 'Gratitud', icon: 'heart-outline' },
  { type: 'visualization', label: 'Visualización', icon: 'eye-outline' },
  { type: 'focus', label: 'Enfoque', icon: 'flashlight-outline' },
  { type: 'wim_hof', label: 'Wim Hof', icon: 'snow-outline' },
  { type: 'relaxation', label: 'Reset rápido', icon: 'refresh-outline' },
];
