/**
 * Config del check-in que SOBREVIVIÓ al retiro del mapa circular (MB-17).
 *
 * emotion-wheel-config.ts murió con la rueda (ver R and D/RETIRO_MAPA_CIRCULAR.md
 * y git para recuperar cualquier pieza), pero estas dos cosas nunca fueron
 * geometría: son copy y datos vivos del check-in. Editables aquí, sin tocar
 * pantallas.
 *
 * Sin imports de react-native → testeable en Vitest node.
 */
import type { EmotionFamily } from './emotions-library';

/**
 * El mecanismo, nombrado en una línea en el aterrizaje (A.6). No es copy
 * motivacional: es Lieberman (2007) — poner el sentimiento en palabras baja
 * la amígdala y sube el prefrontal.
 */
export const NAMING_MECHANISM_LINE =
  'Ponerle nombre a lo que sientes ya bajó algo. No es el trámite antes de la ayuda: es la primera parte de la ayuda.';

// ═══ EL MAPA DEL CUERPO (BodyCheck) ═══
//
// Respaldo: Nummenmaa et al. (PNAS 2014, n=701) — las emociones producen mapas
// corporales consistentes y culturalmente universales. Es la única puerta que
// funciona cuando la persona no tiene palabras, y es lo más ATP posible:
// cuerpo primero, también en emociones.
//
// ⚠️ El mapeo cuerpo→emoción NO es uno a uno. Cada zona ACOTA a un par de
// familias candidatas; jamás diagnostica. El copy dice "suele sentirse así",
// nunca "lo que tienes es".

export interface BodyZone {
  key: string;
  /** Lenguaje de cuerpo, no de clínica. */
  label: string;
  /** Cómo se siente — una línea, segunda persona. */
  detail: string;
  /** Familias candidatas EN ORDEN de probabilidad (Nummenmaa). Máx 3. */
  families: EmotionFamily[];
}

/** Zonas grandes en lenguaje de cuerpo (default del brief, editable aquí). */
export const BODY_ZONES: BodyZone[] = [
  {
    key: 'pecho',
    label: 'Pecho apretado',
    detail: 'Presión en el centro, respiración corta, el corazón se nota.',
    families: ['miedo', 'agobio', 'tristeza'],
  },
  {
    key: 'cabeza',
    label: 'Cabeza y mandíbula',
    detail: 'Mandíbula apretada, sienes cargadas, calor que sube.',
    families: ['ira', 'agobio'],
  },
  {
    key: 'estomago',
    label: 'Estómago y garganta',
    detail: 'Nudo, revoltura, algo que no baja o que quiere salir.',
    families: ['miedo', 'verguenza', 'ira'],
  },
  {
    key: 'apagado',
    label: 'Todo apagado',
    detail: 'Los brazos y las piernas pesan; nada enciende.',
    families: ['desconexion', 'tristeza'],
  },
];
