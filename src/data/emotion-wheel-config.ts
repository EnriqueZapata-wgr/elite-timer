/**
 * Configuración de la RUEDA de emociones (MB-10 · Track A) — EL archivo.
 *
 * Toda la jerarquía 6 núcleos → 13 familias → 144 emociones vive AQUÍ y solo
 * aquí. Mover una familia de núcleo es editar una línea de este archivo; la UI
 * y el layout se recalculan solos. Enrique puede vetar cualquier decisión de
 * jerarquía sin tocar código de render.
 *
 * Los seis núcleos son los de Willcox (1982, "The Feeling Wheel"), el
 * instrumento más usado en consulta. Las 13 familias son las de
 * emotions-library (MB-4.1) — no se crean datos: se usan los que hay.
 *
 * Decisión tomada (brief MB-10, revisable): VERGÜENZA cuelga de TRISTEZA.
 * Es donde suele ubicarse en la práctica clínica y evita un séptimo núcleo
 * de 7 emociones. Para moverla: cambiar 'verguenza' de lista. Ya está.
 *
 * Sin imports de react-native → testeable en Vitest node.
 */
import type { EmotionFamily } from './emotions-library';

export type EmotionCore = 'enojo' | 'miedo' | 'tristeza' | 'alegria' | 'fuerza' | 'paz';

export interface CoreConfig {
  key: EmotionCore;
  label: string;
  /** Lado del circumplejo. Manda el orden de energía dentro del arco:
   *  pleasant (derecha, sentido horario hacia abajo) → energía descendente;
   *  unpleasant (izquierda, el horario sigue de abajo hacia arriba) → ascendente.
   *  Así el arco completo mantiene el gradiente alta-energía-arriba del mapa. */
  side: 'pleasant' | 'unpleasant';
  /** Familias del núcleo EN ORDEN de arco (sentido horario desde las 12). */
  families: EmotionFamily[];
}

/**
 * El orden de núcleos recorre la rueda EN SENTIDO HORARIO desde las 12.
 * Respeta la memoria espacial del plano (B.5 · MB-7): agradable a la DERECHA,
 * desagradable a la IZQUIERDA; alta energía arriba, baja abajo.
 * (72 emociones agradables y 72 desagradables: cada mitad es exactamente 180°.)
 */
export const WHEEL_CORES: CoreConfig[] = [
  { key: 'alegria', label: 'Alegría', side: 'pleasant', families: ['energia', 'curiosidad', 'gratitud'] },
  { key: 'fuerza', label: 'Fuerza', side: 'pleasant', families: ['foco'] },
  { key: 'paz', label: 'Paz', side: 'pleasant', families: ['afecto', 'calma'] },
  { key: 'tristeza', label: 'Tristeza', side: 'unpleasant', families: ['desconexion', 'tristeza', 'rechazo', 'verguenza'] },
  { key: 'miedo', label: 'Miedo', side: 'unpleasant', families: ['agobio', 'miedo'] },
  { key: 'enojo', label: 'Enojo', side: 'unpleasant', families: ['ira'] },
];

/** Nombre visible de cada familia (anillo intermedio). */
export const FAMILY_LABELS: Record<EmotionFamily, string> = {
  ira: 'Ira',
  miedo: 'Miedo',
  agobio: 'Agobio',
  verguenza: 'Vergüenza',
  tristeza: 'Tristeza',
  rechazo: 'Rechazo',
  desconexion: 'Desconexión',
  energia: 'Energía',
  foco: 'Foco',
  afecto: 'Afecto',
  calma: 'Calma',
  gratitud: 'Gratitud',
  curiosidad: 'Curiosidad',
};

/**
 * El mecanismo, nombrado en una línea en el aterrizaje (A.6). No es copy
 * motivacional: es Lieberman (2007) — poner el sentimiento en palabras baja
 * la amígdala y sube el prefrontal. Editable aquí, sin tocar la pantalla.
 */
export const NAMING_MECHANISM_LINE =
  'Ponerle nombre a lo que sientes ya bajó algo. No es el trámite antes de la ayuda: es la primera parte de la ayuda.';
