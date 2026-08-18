/**
 * ARGOS — dónde termina ATP (VOZ-3). Lógica pura, sin red y sin React.
 *
 * EL TURNO QUE ORIGINÓ ESTO. El dueño abrió sus labs y ARGOS le ofreció "armar
 * la lista de preguntas para tu endocrinólogo" y le dijo que un marcador "pide
 * un endocrinólogo". Su reacción: "no me encanta, no nos metemos tan allá".
 *
 * LA CAUSA NO FUE QUE FALTARA LA REGLA. Fue que la regla contraria SÍ estaba
 * escrita. El prompt base pedía, textual: "Deriva con respeto y opciones
 * concretas, no solo 've al médico'; sugiere tipo de especialista, acciones
 * inmediatas". El modelo no improvisó: obedeció. Eso es peor que un olvido,
 * porque significa que el límite nunca se había decidido, solo se había
 * asumido.
 *
 * DÓNDE TERMINA ATP, DICHO DE UNA VEZ:
 *  · ATP educa, te muestra TUS datos y te ayuda a moverte.
 *  · ATP no dirige tu atención médica. No nombra especialidades, no prepara
 *    consultas, no arma agendas clínicas, no lee un marcador como una orden de
 *    ir con alguien.
 *  · Cuando algo excede el alcance, se remite a "tu médico" o "tu profesional
 *    de salud" en general, que es exactamente lo que ya dicen los disclaimers
 *    aprobados. Ni una palabra más.
 *
 * LA ÚNICA EXCEPCIÓN ES LA EMERGENCIA, y no se toca: ante señales de urgencia
 * ARGOS manda a servicios de emergencia (911 en MX) sin esperar confirmación.
 * Un límite de alcance que apagara eso sería el peor cambio de todo el archivo.
 *
 * POR QUÉ VIVE EN LA CAPA DINÁMICA Y NO EN EL PROMPT BASE: el prompt base hoy
 * lo sirve el cerebro desde el servidor, y este run no puede desplegar. Lo que
 * sí viaja por OTA es `dynamicSystem`. Además va DESPUÉS del cerebro en el
 * ensamblado, así que califica lo que el cerebro haya dicho antes.
 */
import { ARGOS_LIMITE_DE_ALCANCE } from '@/src/constants/flags';

/**
 * Las especialidades que ARGOS no nombra. No es una lista para filtrar texto
 * (eso sería otro candado, y de candados venimos): es el ejemplo que le hace
 * entender al modelo de qué clase de palabra estamos hablando.
 */
export const EJEMPLOS_ESPECIALIDAD: readonly string[] = [
  'endocrinólogo', 'cardiólogo', 'gastroenterólogo', 'nefrólogo', 'neurólogo',
  'reumatólogo', 'hematólogo', 'ginecólogo', 'psiquiatra',
];

/** Cómo se remite cuando algo excede el alcance. Copy es-MX, sin nombres propios. */
export const REMISION_GENERICA = 'tu médico o tu profesional de salud';

/**
 * El bloque de alcance para el system prompt. Directriz para el modelo, no copy
 * visible. Devuelve cadena vacía con la bandera apagada, y apagarla revierte el
 * comportamiento exacto de antes sin tocar nada más.
 *
 * Se mantiene CORTO a propósito. Cada token aquí compite con los datos reales
 * del usuario, y un límite que hay que explicar en veinte renglones no es un
 * límite, es un ensayo.
 */
export function buildAlcanceInjection(): string {
  if (!ARGOS_LIMITE_DE_ALCANCE) return '';
  return [
    '',
    '',
    '## DÓNDE TERMINA ATP (obligatorio)',
    'ATP educa, te muestra tus datos y te ayuda a moverte. No dirige tu atención médica.',
    `- NUNCA nombres una especialidad médica (${EJEMPLOS_ESPECIALIDAD.slice(0, 3).join(', ')} y cualquier otra).`,
    '- NUNCA digas que un dato, un síntoma o un marcador "pide" o "requiere" a un especialista.',
    '- NUNCA ofrezcas armar preguntas para una consulta, preparar una cita ni organizar una agenda médica.',
    `- Cuando algo excede lo que ATP hace, remite a ${REMISION_GENERICA}, en general, y regresa a lo que sí puedes: explicar el dato, mostrarlo en la app o proponer una acción.`,
    '- Dilo en UNA línea y sigue. No lo conviertas en el tema de la respuesta.',
    'ÚNICA EXCEPCIÓN: ante señales de emergencia médica, derivas de inmediato a servicios de emergencia (911 en MX), sin esperar confirmación y sin discutir.',
  ].join('\n');
}
