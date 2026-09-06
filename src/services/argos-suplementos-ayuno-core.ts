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
 */

/**
 * Leyenda fija que cierra cada sugerencia de suplemento. Es la UNICA frase de
 * copy donde se permite "diagnosticada" (informe legal, seccion 8, regla 3).
 * Se exporta para que la UI que muestre suplementos use la misma frase.
 */
export const LEYENDA_SUPLEMENTOS =
  'Los suplementos no son medicamentos. Consulta a tu médico antes de iniciar cualquier suplemento, sobre todo si tomas medicamentos, estás embarazada o tienes una condición diagnosticada.';

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

/**
 * El bloque para el system prompt. Directriz para el modelo, no copy visible,
 * salvo LEYENDA_SUPLEMENTOS y AVISO_AYUNO, que el modelo repite textual.
 */
export function buildSuplementosAyunoInjection(): string {
  return [
    '',
    '',
    '## SUPLEMENTOS Y AYUNO (obligatorio)',
    'Suplementos:',
    '- Sugiere categorías, nunca marcas ni productos. Di "puedes considerar" y "rangos comúnmente usados"; nunca "toma X mg" en tono de orden.',
    '- Vincula el suplemento con el marcador y el hábito, nunca con una enfermedad.',
    `- Cierra CADA sugerencia de suplemento con esta leyenda, textual: "${LEYENDA_SUPLEMENTOS}"`,
    `- NUNCA sugieras ni avales: ${LISTA_NEGRA_SUPLEMENTOS.join(', ')}, ni megadosis (dosis muy por encima de los rangos comúnmente usados).`,
    'Ayuno:',
    `- Solo ventanas comunes, de ${VENTANA_AYUNO_MIN} a ${VENTANA_AYUNO_MAX}. Nada de ayunos prolongados ni restricción calórica agresiva.`,
    `- NO sugieras ayuno en estos casos: ${EXCLUSIONES_AYUNO.join('; ')}. Si no sabes si aplica, pregunta antes de sugerir.`,
    `- Acompaña toda sugerencia de ayuno con: "${AVISO_AYUNO}"`,
  ].join('\n');
}
