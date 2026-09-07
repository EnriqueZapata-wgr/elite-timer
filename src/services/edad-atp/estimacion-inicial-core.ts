/**
 * estimacion-inicial-core — la ESTIMACION informativa del punto de partida.
 * Pivote limpio, 7 de septiembre de 2026 (pantalla 5 de la primera sesion).
 *
 * ═══ QUE ES, Y SOBRE TODO QUE NO ES ═══
 * NO es la Edad ATP. La Edad ATP la calcula el motor v2 con cinco areas
 * (labs, composicion, fitness, cognicion, riesgos), pide `body_fat_pct` para
 * que la composicion cuente (ce-service) y la pantalla la habilita a partir de
 * CE 30. Con sexo, edad, talla, peso y una ventana de sueno declarada, la CE
 * se queda muy por debajo de ese umbral, y eso es correcto: no hay con que
 * calcularla.
 *
 * Bajar el umbral habria sido mentir en la otra direccion, asi que este modulo
 * hace otra cosa, mas chica y honesta: toma la edad de calendario y le aplica
 * EL MISMO modulador de habitos que el motor v2 usa como ultimo paso
 * (`computeHabitosModulador`, hoja 7 del Excel maestro), con los pocos habitos
 * que la persona ya declaro. Cero rangos inventados: el unico rango que se usa
 * es el que ya estaba validado contra los cuatro fixtures.
 *
 * Consecuencias que se respetan aguas arriba y aguas abajo:
 *   · Se presenta SIEMPRE como estimacion informativa, con las palabras de
 *     `ETIQUETA_ESTIMACION`.
 *   · JAMAS se guarda en `edad_atp_calculations` ni en ningun lugar donde
 *     alguien pueda confundirla con la Edad ATP medida. Se recalcula cuando se
 *     necesita, que cuesta nada.
 *   · Dice que dato la volveria precisa, y ese dato sale del codigo del motor
 *     (composicion sin `body_fat_pct` vale 0, y los labs pesan 0.4 de la CE),
 *     no de una promesa.
 *
 * ═══ DOS COSAS QUE SE CORRIGIERON EN FRIO EL MISMO 7-SEP-2026 ═══
 *
 * 1. LA VENTANA EN CAMA NO ES SUENO MEDIDO. La pregunta 2 y 3 de la primera
 *    sesion dan la hora de dormirse y la de despertar, o sea TIEMPO EN CAMA.
 *    `scoreSueno` del motor es una escala de DURACION DE SUENO, y meterle el
 *    tiempo en cama la sobreestima de forma sistematica (ocho horas en cama no
 *    son ocho de sueno). Se buscó en el repo un margen de vigilia con fuente y
 *    NO EXISTE: lo unico cercano es `eficiencia_del_sueno` de la matriz v7, que
 *    es un score de wearable pendiente de integrar, no un margen en horas.
 *
 *    Sin fuente no se inventa un margen. Se usa el camino conservador, que es
 *    la unica inferencia que el tiempo en cama SI sostiene: el sueno nunca es
 *    mayor que la ventana. Entonces una ventana MENOR A SEIS HORAS implica
 *    menos de seis horas de sueno, y ahi la escala del motor aplica sin
 *    margen (score 0). Por arriba de seis, el tiempo en cama no determina
 *    cuanto dormiste y NO SE PUNTUA: la palanca queda sin dato y se dice.
 *    Asi la ventana solo puede restar cuando es indiscutible, y nunca regala
 *    un numero mejor del que la persona se gano.
 *
 * 2. EL PISO DEL MOTOR (20 anios) MENTIA A LOS JOVENES. Una persona de 18 con
 *    habitos buenos salia 17.1, se acotaba a 20, y la pantalla le decia "2 por
 *    encima de tu edad de calendario". Con habitos malos salia el mismo 20. De
 *    18 a 21 la estimacion solo podia castigar. Ahora el acotado se REPORTA
 *    (`acotada`) y quien lo pinta no muestra delta: dice que el rango del motor
 *    empieza en 20.
 *
 * Modulo puro: sin react-native y sin supabase.
 */
import { computeHabitosModulador } from '@/src/services/edad-atp/habitos-modulador-service';
import { MOTOR_V2_CAPS } from '@/src/constants/edad-atp-motor-v2-config';
import type { Sex } from '@/src/types/edad-atp-v2';

/** El texto que acompana al numero. Vive aqui para que no se pueda pintar sin el. */
export const ETIQUETA_ESTIMACION = 'Estimación informativa. No es tu Edad ATP.';

/**
 * El único punto donde el tiempo en cama sí dice algo del sueño, y sale de la
 * propia escala del motor (`scoreSueno`: menos de 6 h vale 0). Debajo de esta
 * ventana el sueño es forzosamente menor, así que la escala aplica sin margen.
 * Por arriba no se puntúa. Ver el punto 1 del encabezado.
 */
export const VENTANA_QUE_YA_NO_ALCANZA_H = 6;

/**
 * Lo que de verdad se le pasa al modulador como `sueno_h`.
 *
 * Devuelve la ventana SOLO cuando es tan corta que el sueño no puede llegar al
 * primer escalón de la escala; en cualquier otro caso devuelve undefined, o
 * sea "sin dato", que es la respuesta honesta cuando lo único que se sabe es
 * cuánto tiempo estuvo en cama.
 */
export function suenoPuntuableDeLaVentana(horasVentana: number | null): number | undefined {
  if (horasVentana == null || !Number.isFinite(horasVentana)) return undefined;
  return horasVentana < VENTANA_QUE_YA_NO_ALCANZA_H ? horasVentana : undefined;
}

export interface EntradaEstimacion {
  /** Anios cumplidos. Sin esto no hay estimación posible. */
  edadAnios: number | null;
  sexo: Sex | null;
  pesoKg: number | null;
  tallaCm: number | null;
  /** Ventana declarada entre dormirse y despertar, en horas. */
  horasVentanaSueno: number | null;
  /** Horas que se mueve a la semana, declaradas. */
  horasMovimientoSemana: number | null;
}

export type EfectoPalanca = 'a_favor' | 'en_contra' | 'neutro' | 'sin_dato';

export interface PalancaEstimacion {
  clave: 'sueno' | 'movimiento' | 'composicion';
  /** Lo que la persona lee como nombre de la palanca. */
  titulo: string;
  /** El valor tal cual se lee, o null cuando no hay dato (la UI pinta raya). */
  valor: string | null;
  efecto: EfectoPalanca;
  /** Una línea, honesta, sobre qué hace esa palanca aquí. */
  nota: string;
}

export interface EstimacionInicial {
  /** false = no alcanza ni para estimar. `falta` dice qué falta. */
  ok: boolean;
  edadCronologica: number | null;
  /** Años, redondeado. null cuando ok es false. */
  edadEstimada: number | null;
  /**
   * Diferencia contra la edad de calendario. Negativo = más joven.
   * null cuando `acotada` es true: ahí el número ya no es la lectura de los
   * hábitos y restarlo diría algo que nadie calculó.
   */
  delta: number | null;
  /** El multiplicador del modulador de hábitos (0.95 a 1.10). */
  factor: number | null;
  /**
   * true cuando el cap del motor movió el número. Con esto puesto, `delta` NO
   * se pinta: la diferencia contra la edad de calendario dejaría de ser el
   * efecto de los hábitos y pasaría a ser el efecto del piso.
   */
  acotada: boolean;
  /** El índice de masa corporal, cuando hay talla y peso. Es aritmética, no lectura. */
  imc: number | null;
  palancas: PalancaEstimacion[];
  /** Qué dato la volvería precisa, en orden de peso real en el motor. */
  paraSerPrecisa: string[];
  /** Qué falta para poder estimar siquiera. null cuando ok es true. */
  falta: string | null;
}

/** Redondeo a un decimal, para el IMC. */
function unDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * El factor del modulador solo se mueve por tramos (>=80 → 0.95, 60 a 79 →
 * 1.00, 40 a 59 → 1.05, resto → 1.10), así que el efecto de cada palanca se
 * lee de su propio score, no del factor final: con dos palancas presentes el
 * promedio puede quedar neutro aunque una de las dos esté claramente a favor.
 * Los cortes son los del propio modulador; aquí no se inventa ninguno.
 */
function efectoDeScore(score: number | null): EfectoPalanca {
  if (score == null) return 'sin_dato';
  if (score >= 80) return 'a_favor';
  if (score >= 60) return 'neutro';
  return 'en_contra';
}

/**
 * Calcula la estimación. Determinista y sin efectos: la misma entrada da
 * siempre la misma salida.
 *
 * Sin edad no hay número, y se dice: una "edad estimada" sin edad de
 * calendario no sería una estimación, sería un invento.
 */
export function estimarPuntoDePartida(entrada: EntradaEstimacion): EstimacionInicial {
  const {
    edadAnios, sexo, pesoKg, tallaCm, horasVentanaSueno, horasMovimientoSemana,
  } = entrada;

  const imc =
    pesoKg != null && tallaCm != null && pesoKg > 0 && tallaCm > 0
      ? unDecimal(pesoKg / ((tallaCm / 100) * (tallaCm / 100)))
      : null;

  // El orden es el del peso real en la CE del motor: la composición vale 0
  // sin porcentaje de grasa y los laboratorios pesan 0.4 de la evaluación.
  const paraSerPrecisa = [
    'Tu porcentaje de grasa corporal',
    'Tus estudios de laboratorio',
  ];

  const palancaSueno: PalancaEstimacion = {
    clave: 'sueno',
    titulo: 'Tu ventana de sueño',
    valor: horasVentanaSueno != null ? `${unDecimal(horasVentanaSueno)} h` : null,
    efecto: 'sin_dato',
    nota:
      'Son las horas que pasas en cama, tal como las declaraste. No es sueño medido, '
      + 'así que solo cuenta cuando ya no alcanzan para dormir 6 horas.',
  };
  const palancaMovimiento: PalancaEstimacion = {
    clave: 'movimiento',
    titulo: 'Lo que te mueves a la semana',
    valor: horasMovimientoSemana != null ? `${unDecimal(horasMovimientoSemana)} h` : null,
    efecto: 'sin_dato',
    nota: 'Horas de actividad a la semana, contando caminatas.',
  };
  const palancaComposicion: PalancaEstimacion = {
    clave: 'composicion',
    titulo: 'Tu composición corporal',
    valor: imc != null ? `Índice de masa corporal ${imc}` : null,
    // Es el único bloque que NO mueve el número: sin porcentaje de grasa el
    // motor le pone cero a la composición, y aquí no se le inventa un peso.
    efecto: 'sin_dato',
    nota: 'Todavía no mueve el número. Con tu porcentaje de grasa entra al cálculo completo.',
  };

  const sinNumero = (falta: string): EstimacionInicial => ({
    ok: false,
    edadCronologica: edadAnios != null && Number.isFinite(edadAnios) && edadAnios > 0 ? edadAnios : null,
    edadEstimada: null,
    delta: null,
    factor: null,
    acotada: false,
    imc,
    palancas: [palancaSueno, palancaMovimiento, palancaComposicion],
    paraSerPrecisa,
    falta,
  });

  if (edadAnios == null || !Number.isFinite(edadAnios) || edadAnios <= 0) {
    return sinNumero('Tu fecha de nacimiento');
  }

  // El motor pide sexo para su input; aquí no cambia el resultado (el
  // modulador de hábitos no lo usa) y por eso su ausencia no bloquea nada.
  const habitos = computeHabitosModulador({
    chronological_age: edadAnios,
    sex: sexo ?? 'male',
    sueno_h: suenoPuntuableDeLaVentana(horasVentanaSueno),
    ejercicio_h_sem: horasMovimientoSemana ?? undefined,
  });

  palancaSueno.efecto = efectoDeScore(habitos.components.sueno?.score_0_100 ?? null);
  palancaMovimiento.efecto = efectoDeScore(habitos.components.ejercicio?.score_0_100 ?? null);

  /**
   * SIN UNA SOLA PALANCA NO HAY ESTIMACIÓN, y esta es la corrección que más
   * importaba. `computeHabitosModulador` normaliza a 60 cuando no hay ningún
   * hábito presente, y 60 devuelve factor 1.00: el resultado salía `ok:true`
   * con delta 0 y la pantalla imprimía "Igual que tu edad de calendario", que
   * es una afirmación que nadie calculó. Pasa de verdad al reanudar en frío,
   * cuando no hay parámetros de URL ni fila de la que leer el horario. `ce` es
   * la fracción de peso con dato presente: en 0, se dice qué falta.
   */
  if (habitos.ce === 0) {
    return sinNumero('Cuánto te mueves a la semana');
  }

  const bruto = edadAnios * habitos.factor;
  const conCap = Math.min(MOTOR_V2_CAPS.max, Math.max(MOTOR_V2_CAPS.min, bruto));
  const edadEstimada = Math.round(conCap);
  // El cap movió el número si lo empujó fuera de lo que dijeron los hábitos.
  const acotada = conCap !== bruto;

  return {
    ok: true,
    edadCronologica: edadAnios,
    edadEstimada,
    delta: acotada ? null : edadEstimada - edadAnios,
    factor: habitos.factor,
    acotada,
    imc,
    palancas: [palancaSueno, palancaMovimiento, palancaComposicion],
    paraSerPrecisa,
    falta: null,
  };
}

/**
 * Años cumplidos a partir de 'AAAA-MM-DD'. null si la fecha no sirve.
 * Se calcula por partes y no con milisegundos para no arrastrar el desfase de
 * los años bisiestos, que en un cumpleaños se nota.
 */
export function edadEnAnios(
  fechaNacimiento: string | null | undefined,
  hoy: string,
): number | null {
  if (typeof fechaNacimiento !== 'string') return null;
  const n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaNacimiento.trim());
  const h = /^(\d{4})-(\d{2})-(\d{2})$/.exec(hoy.trim());
  if (!n || !h) return null;
  let anios = Number(h[1]) - Number(n[1]);
  const mesHoy = Number(h[2]);
  const diaHoy = Number(h[3]);
  const mesNac = Number(n[2]);
  const diaNac = Number(n[3]);
  if (mesHoy < mesNac || (mesHoy === mesNac && diaHoy < diaNac)) anios -= 1;
  if (anios < 0 || anios > 120) return null;
  return anios;
}
