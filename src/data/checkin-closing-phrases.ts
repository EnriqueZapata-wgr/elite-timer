/**
 * Frase al cierre del check-in (MB-14 · Pieza 3).
 *
 * Una sola frase, corta, que refuerza o replantea lo que la persona acaba de
 * nombrar. Tres reglas que NO se rompen:
 *
 *  1. SIN nombre de autor. Ni Séneca, ni Marco Aurelio, ni nadie: la frase se
 *     sostiene sola. Igual que el journal desde MB-12 — toda voz en la app es
 *     de ATP.
 *  2. CONTEXTUAL, no aleatoria: un banco por cuadrante, y dentro del cuadrante
 *     rotación determinista por fecha local (la misma frase todo el día).
 *  3. Con señal de crisis NO hay frase, de ningún tipo. El gate vive en
 *     checkin.tsx con isCrisisOrigin (emotion-navigation-core): el tramo A de
 *     MB-12 existe para que a alguien en crisis no se le reencuadre nada.
 *
 * Tono: del cuerpo y de la experiencia, no del aula. Sin jerga, sin tarjeta
 * motivacional, y nada que se pueda leer como reclamo por estar mal.
 * COPY editable — Enrique ajusta aquí sin tocar pantalla.
 *
 * Sin imports de react-native → testeable en Vitest node.
 */
import type { QuadrantKey } from './emotions-library';
import { fnv1a } from '../services/emotion-plane-core';

export const CLOSING_PHRASES: Record<QuadrantKey, readonly string[]> = {
  // ── Alta energía · Desagradable (enojo, ansiedad, estrés, miedo) ──
  high_unpleasant: [
    'No tienes que resolver nada con el pulso arriba. Primero baja, luego decide.',
    'Esto es energía buscando salida. Nombrarla ya le quitó un grado.',
    'Ninguna ola se queda arriba para siempre. Esta también baja.',
    'Tu cuerpo está reaccionando para cuidarte. No está roto.',
    'Lo intenso pide urgencia. Casi nada la merece de verdad.',
    'Puedes sentir esto con todo el cuerpo y aun así no actuar desde aquí.',
    'Respirar lento no cambia el problema. Cambia la cabeza con la que lo miras.',
    'Hoy el cuerpo habló fuerte. Escucharlo ya fue hacer algo.',
    'No eres tú contra lo que sientes. Es una señal, y ya la leíste.',
  ],
  // ── Baja energía · Desagradable (tristeza, cansancio, soledad) ──
  // El banco más delicado: nada que suene a exigencia de mejorar.
  low_unpleasant: [
    'No todo lo que pesa se carga hoy. Con nombrarlo alcanza por ahora.',
    'Estar así no es fallar. Es estar así, y también se registra.',
    'Lo que sientes tiene permiso de estar. No hay prisa por moverlo.',
    'El cansancio no se discute con la mente. Se le da descanso.',
    'Hoy es un punto del mapa, no el mapa entero.',
    'No necesitas explicarlo todo hoy. Nombrarlo ya fue suficiente.',
    'También esto se mueve, aunque desde adentro parezca quieto.',
    'Los días grises también cuentan tu historia completa.',
    'Ir lento sigue siendo ir. Hoy tocaba este paso.',
  ],
  // ── Alta energía · Agradable (entusiasmo, motivación, vitalidad) ──
  high_pleasant: [
    'Esta energía es real. Dale una dirección antes de que se disperse.',
    'Guarda una foto mental de esto. Sirve para los días que no.',
    'Lo que hiciste para llegar aquí se puede repetir. Tómale nota.',
    'La energía alta rinde más cuando eliges una sola cosa.',
    'Disfrutarlo también cuenta. No todo lo bueno hay que invertirlo.',
    'Hoy hay combustible. Elige a qué dárselo.',
    'Nota dónde lo sientes en el cuerpo. Así lo reconoces cuando vuelva.',
    'Viento a favor. Es buen día para eso que pide un empujón.',
  ],
  // ── Baja energía · Agradable (calma, paz, presencia) ──
  low_pleasant: [
    'La calma también se entrena. Hoy entrenaste.',
    'Quédate aquí un momento más. No hay nada que alcanzar ahora mismo.',
    'Nota cómo respira el cuerpo cuando nada lo persigue.',
    'Esto también es rendimiento: un sistema que sabe bajar.',
    'La paz no hace ruido. Por eso conviene registrarla a propósito.',
    'Memoriza esta sensación. Es tu punto de regreso.',
    'Desde aquí se decide mejor. Si algo espera respuesta, este es el momento.',
    'No pasa nada. Y eso, hoy, es una buena noticia.',
  ],
};

/**
 * La frase del día para un cuadrante: rotación determinista por fecha local
 * (YYYY-MM-DD). Mismo día + mismo cuadrante → misma frase, siempre. La semilla
 * incluye el cuadrante para que los bancos no roten en fase.
 */
export function closingPhraseForDate(quadrant: QuadrantKey, dateKey: string): string {
  const bank = CLOSING_PHRASES[quadrant];
  return bank[fnv1a(`${dateKey}:${quadrant}`) % bank.length];
}
