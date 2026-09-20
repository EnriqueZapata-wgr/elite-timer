/**
 * ARGOS: reglas de suplementos y ayuno (ATP 3.0, ruta 2.0). Logica pura.
 *
 * POR QUE EXISTE (informe legal, seccion 8). LGS 216 exige que lo que sugiera
 * propiedades sobre un suplemento diga que no es medicamento; el Reglamento de
 * publicidad (arts. 21 y 22) prohibe decir que un suplemento previene, alivia
 * o cura una enfermedad; Google Play veta promover sustancias peligrosas. Para
 * el ayuno no hay norma, pero la practica recomendada es excluir a quien mas
 * riesgo corre y limitar las ventanas a protocolos comunes.
 *
 * POR QUE VIVE EN LA CAPA DINAMICA Y NO EN EL CEREBRO: el cerebro
 * (brain.generated.ts) se genera desde ARGOS-BRAIN y no se edita a mano; lo
 * que si viaja por OTA es `dynamicSystem`, y va DESPUES del cerebro en el
 * ensamblado del proxy, asi que califica lo que el cerebro haya dicho antes.
 * El cerebro v1.22.1 ya prohibe "tratamiento", "curar" y nombrar enfermedad;
 * lo que le faltaba era la leyenda fija, la lista negra y las exclusiones de
 * ayuno. Este bloque agrega exactamente eso, sin repetir lo demas.
 *
 * Se mantiene CORTO a proposito: cada token compite con los datos del usuario.
 *
 * 20-sep-2026, LA EXCEPCION DEL PLAN ELITE. Hasta hoy este bloque le ordenaba
 * a ARGOS hablar de "categorias", decir "puedes considerar", nunca "toma X
 * mg", y cerrar cada mencion con la leyenda; y a la vez el contexto Elite se
 * declaraba "fuente principal para suplementos". Dos ordenes obligatorias que
 * se contradecian sobre un plan que ya firmo el equipo. Ahora hay dos capas:
 * lo que viene del plan del equipo (renglon "Plan de suplementos de tu
 * equipo" en los datos del usuario) se explica como plan de su equipo, con la
 * dosis y el momento que escribio quien firma, sin muletilla y con la leyenda
 * UNA vez al final; todo lo que NO este en ese plan sigue con la regla de
 * siempre. La LGS 216 se cumple igual: la leyenda aparece, solo que una vez.
 *
 * La misma precedencia aplica al ayuno: si la evaluacion Elite fija una
 * ventana de alimentacion (renglon "Ventana de alimentacion" con horas, de
 * argos-elite-detalle-core), esa manda y se explica tal cual; lo de "12:12 a
 * 16:8" es solo para lo que ARGOS sugiera por su cuenta, fuera del plan.
 */

/**
 * Leyenda fija que cierra cada sugerencia de suplemento. Es una leyenda propia
 * de ATP (no es el texto de la LGS 216; la ley pide que se diga que no son
 * medicamentos y eso cumple). 20-sep-2026 (revision en frio, A6): se quito
 * la palabra roja que traia al final (la que atrapa el patron /diagnostic/ de
 * PALABRAS_ROJAS en elite-v3-core.ts); ya no hay excepcion. Se exporta para
 * que la UI que muestre suplementos (evaluacion Elite, modulo de Suplementos)
 * use la misma frase. Sin em dashes.
 */
export const LEYENDA_SUPLEMENTOS =
  'Los suplementos no son medicamentos. Si tomas medicamentos, estás embarazada o tienes una condición de salud, consulta a tu médico antes de empezar.';

/** Sustancias que ARGOS nunca sugiere ni avala (Google Play, informe legal seccion 8). */
export const LISTA_NEGRA_SUPLEMENTOS: readonly string[] = [
  'efedrina', 'yohimbina', 'DMAA', 'SARMs',
];

/** Ventanas de ayuno que ARGOS puede sugerir; fuera de esto no sugiere nada. */
export const VENTANA_AYUNO_MIN = '12:12';
export const VENTANA_AYUNO_MAX = '16:8';

/** A quien ARGOS NO le sugiere ayuno. Copy es-MX para el modelo, no visible. */
export const EXCLUSIONES_AYUNO: readonly string[] = [
  'menores de edad',
  'embarazo o lactancia',
  'diabetes tipo 1 o uso de insulina',
  'antecedentes de trastornos alimentarios',
];

/** Frase que acompaña cualquier sugerencia de ayuno. */
export const AVISO_AYUNO = 'Consulta a tu médico si tomas medicamentos.';

/** Renglon del contexto donde viene el plan (mismo texto que argos-suplementos-plan-core). */
export const RENGLON_PLAN_EQUIPO = 'Plan de suplementos de tu equipo';

/** Renglon del detalle Elite con la ventana del plan (mismo texto que argos-elite-detalle-core). */
export const RENGLON_VENTANA_EQUIPO = 'Ventana de alimentación';

/**
 * El bloque para el system prompt. Directriz para el modelo, no copy visible,
 * salvo LEYENDA_SUPLEMENTOS y AVISO_AYUNO, que el modelo repite textual.
 */
export function buildSuplementosAyunoInjection(): string {
  return [
    '',
    '',
    '## SUPLEMENTOS Y AYUNO (obligatorio)',
    `Del plan de su equipo (renglón "${RENGLON_PLAN_EQUIPO}"):`,
    '- Lo definió su equipo: explícalo así, con nombre, dosis, momento y porqué tal como están escritos ("tu plan dice X mg en la noche porque..."). Sin "puedes considerar", sin cambiar dosis ni agregar nada. Si dice "dosis sin fijar", no la inventes.',
    '- Ahí la leyenda va UNA vez al final de la respuesta, no en cada mención.',
    'Fuera de ese plan:',
    '- Sugiere categorías, no marcas ni productos. Di "puedes considerar" y "rangos comúnmente usados"; nunca "toma X mg" como orden.',
    '- Vincúlalo con el marcador y el hábito, nunca con una enfermedad.',
    `- Cierra CADA sugerencia de suplemento con esta leyenda, textual: "${LEYENDA_SUPLEMENTOS}"`,
    `- NUNCA sugieras ni avales: ${LISTA_NEGRA_SUPLEMENTOS.join(', ')}, ni megadosis.`,
    'Ayuno:',
    // Precedencia igual que en suplementos: la ventana que fijo el equipo manda.
    // El bloque cabe en 1500 caracteres (test); por eso lo de arriba se apreto.
    `- Si su plan fija una ventana (renglón "${RENGLON_VENTANA_EQUIPO}" con horas), esa manda: explícala tal cual, como plan de su equipo. Fuera del plan, solo ventanas comunes, de ${VENTANA_AYUNO_MIN} a ${VENTANA_AYUNO_MAX}. Nada de ayunos prolongados ni restricción calórica agresiva.`,
    `- NO sugieras ayuno en estos casos: ${EXCLUSIONES_AYUNO.join('; ')}. Si no sabes si aplica, pregunta.`,
    `- Toda sugerencia de ayuno lleva: "${AVISO_AYUNO}"`,
  ].join('\n');
}
