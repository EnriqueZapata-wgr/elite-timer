/**
 * lectura-core — LA LECTURA del expediente. Núcleo puro, cero I/O.
 *
 * POR QUÉ EXISTE
 * La app ya muestra datos por todos lados: labs en ATP Labs, composición en Mis
 * Datos, glucosa en su registro, ayunos en Reports. Lo que NO existía era la
 * lectura: qué significan esos datos JUNTOS y cuál manda sobre los demás. En el
 * portal que el dueño entrega a sus clientes de consultoría, esa sección
 * ("cómo se conecta todo en ti") es la que el cliente paga. El resto es
 * inventario.
 *
 * REGLAS DURAS QUE SE RESPETAN AQUÍ
 *   1. Un dato = un lugar. Este módulo NO devuelve tablas de valores para
 *      pintar: devuelve interpretación + la ruta donde ese dato ya vive. Si
 *      alguien quiere ver la serie de ferritina, se va a ATP Labs.
 *   2. Nada de rangos inventados. Cada señal se evalúa contra la matriz V7/V6
 *      (`edad-atp-matriz-v7-v6.ts`) con el MISMO scoring que el motor de Edad
 *      ATP (`score9Bands`). Si un parámetro no tiene banda en la matriz, no
 *      produce señal: se calla.
 *   3. Copy de usuario sin nombre de enfermedad, sin diagnóstico y sin
 *      tratamiento. Las reglas son hábitos y conversaciones, nunca dosis ni
 *      fármacos. Lo que toca a un profesional sale con bandera.
 *   4. Convergencia obligatoria: un cruce NO se enciende con una sola señal.
 *      Un marcador suelto en amarillo no es una lectura, es ruido. Ese es
 *      justo el error que la competencia comete al inflar hallazgos.
 *   5. Estados honestos. Si falta la materia prima se dice qué falta y dónde
 *      conseguirlo. Nunca pantalla en blanco, nunca "Cargando..." eterno.
 */
import { findMatrizParam, functionalBand } from '@/src/constants/edad-atp-matriz-lookup';
import { score9Bands } from '@/src/services/edad-atp/sf-9band-service';
import { aUnidadDeMatriz } from '@/src/constants/lab-unidades-core';
import { getLabParamMeta } from '@/src/components/edad-atp/component-meta';
import type { Sex } from '@/src/types/edad-atp-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Entrada
// ─────────────────────────────────────────────────────────────────────────────

/** De dónde salió cada pieza de la lectura. Se pinta como etiqueta en la card. */
export type FuenteTag = 'labs' | 'cuerpo' | 'quimica' | 'historia' | 'reloj' | 'ciclo';

export const FUENTE_LABEL: Record<FuenteTag, string> = {
  labs: 'Labs',
  cuerpo: 'Cuerpo',
  quimica: 'Química',
  historia: 'Historia',
  reloj: 'Reloj',
  ciclo: 'Ciclo',
};

export interface ComposicionInput {
  pesoKg: number | null;
  grasaPct: number | null;
  musculoKg: number | null;
  visceral: number | null;
  agarreKg: number | null;
  sistolica: number | null;
  diastolica: number | null;
  vo2: number | null;
  pasos: number | null;
  ejercicioMin: number | null;
}

export interface QuimicaInput {
  /** Neurotransmisor dominante del Braverman. Etiqueta cruda de la tabla. */
  dominante: string | null;
  /** Déficit principal del Braverman. Etiqueta cruda de la tabla. */
  deficitPrincipal: string | null;
}

export interface EdadInput {
  cronologica: number | null;
  integral: number | null;
  /** PhenoAge: la edad que dice la sangre. */
  porSangre: number | null;
  /** Edad corporal del motor: la que dice el físico. */
  porFisico: number | null;
}

export interface LecturaSnapshot {
  sexo: Sex;
  /** Último valor por parámetro, clave canónica de la matriz. */
  labs: Record<string, { value: number; measured_at: string; is_stale?: boolean }>;
  composicion: ComposicionInput | null;
  quimica: QuimicaInput | null;
  edad: EdadInput | null;
  /** Nombres de síntomas activos, tal como los escribió la persona. */
  sintomasActivos: string[];
  /** Clave del cronotipo (oso, lobo, león, delfín) si ya lo sacó. */
  cronotipo: string | null;
  /** Fase del ciclo de HOY, si aplica y está registrada. */
  faseCiclo: string | null;
  /** Cuántas categorías de historia clínica tiene contestadas. */
  historiaCategorias: number;
  /** Cuántas intervenciones trae activas en su protocolo. */
  intervencionesActivas: number;
}

export const SNAPSHOT_VACIO: LecturaSnapshot = {
  sexo: 'male',
  labs: {},
  composicion: null,
  quimica: null,
  edad: null,
  sintomasActivos: [],
  cronotipo: null,
  faseCiclo: null,
  historiaCategorias: 0,
  intervencionesActivas: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Señales: un valor leído contra su banda funcional
// ─────────────────────────────────────────────────────────────────────────────

export type Estado = 'optimo' | 'aceptable' | 'atencion';
export type Direccion = 'bajo' | 'alto' | 'dentro';

export interface Señal {
  key: string;
  label: string;
  value: number;
  estado: Estado;
  direccion: Direccion;
  fuente: FuenteTag;
  stale: boolean;
}

/**
 * Umbrales de estado: los MISMOS que usa ATP Labs para colorear. score9Bands
 * devuelve 0/25/50/80/100; 100 y 80 son las bandas óptima y aceptable de la
 * matriz. Repetir el criterio aquí con otros números sería un segundo semáforo.
 */
export function estadoDeScore(score: number): Estado {
  if (score >= 80) return score >= 100 ? 'optimo' : 'aceptable';
  if (score >= 50) return 'aceptable';
  return 'atencion';
}

/**
 * Lee un parámetro contra la matriz del sexo. Devuelve null si el parámetro no
 * existe en la matriz o no define banda óptima: preferimos callarnos a inventar
 * un rango.
 */
export function leerParametro(
  sexo: Sex,
  key: string,
  value: number,
  fuente: FuenteTag,
  stale = false,
): Señal | null {
  const param = findMatrizParam(sexo, key);
  if (!param) return null;
  // El valor viene en la unidad en que se guardó, que puede no ser la de la
  // ventana (testosterona total: ng/dL guardado contra ng/mL en la matriz). Se
  // puntúa y se decide la dirección en el espacio de la matriz; lo que se
  // devuelve para pintar sigue siendo el valor tal como lo reportó el estudio.
  const valorEnMatriz = aUnidadDeMatriz(key, value);
  const score = score9Bands(valorEnMatriz, param.bandLimits);
  if (score == null) return null;
  const banda = functionalBand(param);
  let direccion: Direccion = 'dentro';
  if (banda) {
    if (valorEnMatriz < banda.lo) direccion = 'bajo';
    else if (valorEnMatriz > banda.hi) direccion = 'alto';
  }
  // El nombre bonito sale del catálogo clínico; cuando ese catálogo no conoce
  // la clave devuelve un fallback auto-generado (se delata con descripción
  // vacía) que produce cosas como "Fuerza De Agarre". En ese caso manda el
  // nombre de la matriz, que está escrito por una persona.
  const meta = getLabParamMeta(key);
  const label = meta.description ? meta.display_name : param.name;
  return {
    key,
    label,
    value,
    estado: estadoDeScore(score),
    direccion,
    fuente,
    stale,
  };
}

/**
 * Composición corporal traducida a claves de la matriz. El músculo esquelético
 * de la matriz es PORCENTAJE y la báscula guarda kilos: se deriva con el peso
 * del mismo registro, y si falta el peso no se deriva nada.
 */
export function señalesDeComposicion(sexo: Sex, comp: ComposicionInput | null): Señal[] {
  if (!comp) return [];
  const pares: Array<[string, number | null]> = [
    ['grasa_corporal', comp.grasaPct],
    ['grasa_visceral', comp.visceral],
    ['fuerza_de_agarre', comp.agarreKg],
    ['presion_sistolica', comp.sistolica],
    ['presion_diastolica', comp.diastolica],
    ['vo2_estimado', comp.vo2],
    ['pasos_al_dia', comp.pasos],
    ['ejercicio_semanal', comp.ejercicioMin],
  ];
  if (comp.musculoKg != null && comp.pesoKg != null && comp.pesoKg > 0) {
    pares.push(['musculo_esqueletico', (comp.musculoKg / comp.pesoKg) * 100]);
  }
  const out: Señal[] = [];
  for (const [key, v] of pares) {
    if (v == null || !Number.isFinite(v)) continue;
    const s = leerParametro(sexo, key, v, 'cuerpo');
    if (s) out.push(s);
  }
  return out;
}

/** Índice de señales por clave, listo para que las reglas lo consulten. */
export function construirSeñales(snap: LecturaSnapshot): Record<string, Señal> {
  const out: Record<string, Señal> = {};
  for (const [key, v] of Object.entries(snap.labs ?? {})) {
    if (v == null || !Number.isFinite(v.value)) continue;
    const s = leerParametro(snap.sexo, key, v.value, 'labs', Boolean(v.is_stale));
    if (s) out[key] = s;
  }
  // La composición gana sobre el lab con la misma clave: la báscula de hoy es
  // más fresca que el estudio de hace meses para grasa, músculo y presión.
  for (const s of señalesDeComposicion(snap.sexo, snap.composicion)) out[s.key] = s;
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cruces
// ─────────────────────────────────────────────────────────────────────────────

export interface Cruce {
  key: string;
  /** La frase que ordena. Imperativa, en el idioma de la persona. */
  titular: string;
  fuentes: FuenteTag[];
  /** Qué encontramos, armado con los marcadores que sí dispararon. */
  hallazgo: string;
  /** Por qué pasa. */
  logica: string;
  /** Cómo varias señales apuntan al mismo lugar. */
  convergencia: string;
  /** Qué hacer. Hábito o conversación, nunca dosis ni fármaco. */
  regla: string;
  /** Cuando la pieza que sigue es de un profesional, no de la app. */
  bandera: string | null;
  /** Etiquetas legibles de lo que disparó el cruce. */
  senales: string[];
  peso: number;
  fuerza: number;
  /** Dónde vive el dato crudo. La lectura interpreta, no vuelve a listar. */
  destino: { label: string; route: string };
}

type Candidato = { key: string; dir: Direccion | 'fuera' };

interface ReglaCruce {
  key: string;
  peso: number;
  titular: string;
  logica: string;
  convergencia: string;
  regla: string;
  bandera: string | null;
  destino: { label: string; route: string };
  /** Señal que TIENE que estar para que el cruce tenga sentido. */
  ancla?: Candidato;
  /** Señales que suman convergencia. */
  candidatas: Candidato[];
  /** Cuántas señales (ancla incluida) hacen falta. Nunca menos de 2. */
  minimo: number;
  /** Fuentes que no vienen de una señal numérica (química, reloj, ciclo). */
  extra?: (snap: LecturaSnapshot) => { label: string; fuente: FuenteTag }[];
}

/**
 * ¿La señal cumple la dirección que la regla espera?
 *
 * Se exporta porque la ficha por biomarcador decide con ESTE mismo predicado si
 * un marcador fuera de ventana tiene compañía o está solo. Reimplementarlo allá
 * sería tener dos criterios de convergencia que con el tiempo se separan, y la
 * regla de "nunca alarmar por un marcador solo" dejaría de significar lo mismo
 * en dos pantallas de la misma app.
 */
export function cumple(s: Señal | undefined, dir: Direccion | 'fuera'): boolean {
  if (!s) return false;
  if (s.estado === 'optimo') return false;
  if (dir === 'fuera') return s.estado === 'atencion' || s.direccion !== 'dentro';
  return s.direccion === dir;
}

/**
 * EL CATÁLOGO.
 *
 * Cada entrada es un patrón que un clínico funcional reconocería, escrito con
 * las claves que la matriz V7/V6 realmente tiene. Nada de esto nombra una
 * enfermedad ni receta nada: describe un terreno y propone un hábito.
 */
export const REGLAS_CRUCE: ReglaCruce[] = [
  {
    key: 'terreno_inflamatorio',
    peso: 10,
    titular: 'Tu inflamación de fondo es lo primero: ordena todo lo demás.',
    logica:
      'La inflamación crónica de bajo grado no se siente como una molestia concreta, se siente como que todo cuesta más: recuperas lento, duermes mal y tu energía no rinde. Es el terreno sobre el que se monta el resto de tu plan.',
    convergencia:
      'No es un marcador aislado en amarillo. Son varias señales distintas apuntando al mismo terreno, y eso es lo que la convierte en prioridad.',
    regla:
      'Trabaja el terreno antes que los detalles: comida limpia sin ultraprocesados, sol de mañana, sueño con horario fijo y movimiento diario. Antes de perseguir cualquier otro número, baja este piso.',
    bandera: null,
    destino: { label: 'Ver estos marcadores en ATP Labs', route: '/edad-atp/labs' },
    candidatas: [
      { key: 'proteina_c_reactiva_cuantitativa_pcr', dir: 'alto' },
      { key: 'ferritina', dir: 'alto' },
      { key: 'relacion_neutrofilos_linfocitos_nlr', dir: 'alto' },
      { key: 'homocisteina', dir: 'alto' },
      { key: 'vitamina_d', dir: 'bajo' },
      { key: 'acido_urico', dir: 'alto' },
    ],
    minimo: 2,
  },
  {
    key: 'azucar_e_insulina',
    peso: 9,
    titular: 'Tu cuerpo está trabajando de más para manejar el azúcar.',
    logica:
      'Antes de que la glucosa en ayuno se mueva, el cuerpo compensa subiendo insulina. Por eso el patrón se ve primero en los acompañantes: triglicéridos, la relación con HDL y la grasa que se guarda alrededor de los órganos.',
    convergencia:
      'Varias señales del mismo eje se movieron juntas. Cuando pasa eso, no es variación del día: es cómo estás manejando la energía.',
    regla:
      'Orden del plato: verdura y proteína primero, el carbohidrato al final. Caminata de diez minutos después de la comida principal. Baja la densidad de carbohidrato y súbelo solo alrededor del entrenamiento.',
    bandera: null,
    destino: { label: 'Tu glucosa día a día', route: '/glucose-log' },
    candidatas: [
      { key: 'glucosa_en_ayuno', dir: 'alto' },
      { key: 'hba1c', dir: 'alto' },
      { key: 'insulina', dir: 'alto' },
      { key: 'homair', dir: 'alto' },
      { key: 'trigliceridos', dir: 'alto' },
      { key: 'relacion_trigliceridos_hdl', dir: 'alto' },
      { key: 'grasa_visceral', dir: 'alto' },
    ],
    minimo: 2,
  },
  {
    key: 'composicion_manda',
    peso: 9,
    titular: 'Tu composición pesa más que tu química en cómo envejeces.',
    logica:
      'La sangre y el físico cuentan historias distintas, y el físico es el que más predice el ritmo. Músculo y grasa no son estética: son el órgano que más manda sobre tu metabolismo.',
    convergencia:
      'Grasa, músculo y fuerza se leen juntos. Cuando dos o más se mueven en la misma dirección, la palanca está clara y es la más modificable que tienes.',
    regla:
      'Fuerza tres veces por semana como piso, cardio suave de base y proteína suficiente en cada comida. Mídete por la cintura y por lo que levantas, no solo por el peso de la báscula.',
    bandera: null,
    destino: { label: 'Tus medidas', route: '/medidas' },
    candidatas: [
      { key: 'grasa_corporal', dir: 'alto' },
      { key: 'grasa_visceral', dir: 'alto' },
      { key: 'musculo_esqueletico', dir: 'bajo' },
      { key: 'fuerza_de_agarre', dir: 'bajo' },
      { key: 'vo2_estimado', dir: 'bajo' },
    ],
    minimo: 2,
  },
  {
    key: 'vitamina_d_ordena',
    peso: 8,
    titular: 'Tu vitamina D toca más cosas de las que parece.',
    logica:
      'La vitamina D no es solo hueso: participa en defensas, ánimo y en el eje hormonal. Cuando está baja, varios sistemas rinden por debajo al mismo tiempo y cuesta saber cuál es la causa.',
    convergencia:
      'Está baja y además hay otra señal fuera de rango en un sistema que ella toca. Corregir la base suele mover las dos.',
    regla:
      'Sol directo en la piel a media mañana, de forma regular y sin quemarte. Registra tu exposición y vuelve a medir en unos meses para ver si de verdad subió.',
    bandera: 'Si la corrección por sol y comida no la mueve, es tema de consulta.',
    destino: { label: 'Tu ventana de sol', route: '/solar' },
    ancla: { key: 'vitamina_d', dir: 'bajo' },
    candidatas: [
      { key: 't3_libre', dir: 'bajo' },
      { key: 'testosterona_total', dir: 'bajo' },
      { key: 'cortisol_matutino', dir: 'fuera' },
      { key: 'proteina_c_reactiva_cuantitativa_pcr', dir: 'alto' },
      { key: 'magnesio', dir: 'bajo' },
    ],
    minimo: 2,
  },
  {
    key: 'tiroides_conversion',
    peso: 7,
    titular: 'Tu tiroides no pide más estímulo: pide mejor conversión.',
    logica:
      'La hormona que hace el trabajo en el tejido es la forma activa, y para producirla el cuerpo necesita materia prima y poco estrés de fondo. Ver solo la hormona que la ordena cuenta media historia.',
    convergencia:
      'La forma activa quedó por debajo y hay al menos otra señal que participa justo en ese paso. Eso apunta al proceso, no a la glándula.',
    regla:
      'Cuida las piezas que ese paso necesita: comer suficiente, no vivir en déficit calórico permanente, dormir y bajar el estrés de fondo. Lleva esta lectura a tu consulta antes de mover nada.',
    bandera: 'Esta lectura es para tu consulta, no para automedicarse.',
    destino: { label: 'Ver estos marcadores en ATP Labs', route: '/edad-atp/labs' },
    ancla: { key: 't3_libre', dir: 'bajo' },
    candidatas: [
      { key: 'tsh', dir: 'alto' },
      { key: 'ferritina', dir: 'bajo' },
      { key: 'vitamina_d', dir: 'bajo' },
      { key: 'anticuerpos_antitpo', dir: 'alto' },
    ],
    minimo: 2,
  },
  {
    key: 'reloj_y_cortisol',
    peso: 8,
    titular: 'Tu reloj está corrido, y eso te cobra la mañana.',
    logica:
      'El pico de energía de la mañana se sincroniza con luz, temperatura y horarios. Cuando ese pico se aplana, despertar cuesta, el sueño se fragmenta y todo el día se recorre.',
    convergencia:
      'La señal de la mañana y la del sueño se movieron juntas. Cuando eso pasa, la palanca no es dormir más horas: es reordenar el reloj.',
    regla:
      'Luz natural directa en los primeros minutos del día, sin lentes y sin pantalla. Cena temprano y cierra pantallas una hora antes de dormir. Hora fija para levantarte, incluido el fin de semana.',
    bandera: null,
    destino: { label: 'Tu cronotipo', route: '/my-chronotype' },
    candidatas: [
      { key: 'cortisol_matutino', dir: 'fuera' },
      { key: 'energia_al_despertar', dir: 'bajo' },
      { key: 'eficiencia_del_sueno', dir: 'bajo' },
      { key: 'duracion_promedio', dir: 'bajo' },
      { key: 'exposicion_solar_matutina', dir: 'bajo' },
      { key: 'consistencia_de_horario', dir: 'bajo' },
    ],
    minimo: 2,
  },
  {
    key: 'ancla_quimica',
    peso: 7,
    titular: 'Tu ancla está vacía: por eso cuesta apagar.',
    logica:
      'Tu mezcla de fábrica no cambia, pero el desgaste sí. Cuando la parte que da calma y piso se vacía, aparecen la tensión y el sueño que no cierra. Es un estado de hoy, no un rasgo tuyo.',
    convergencia:
      'El déficit de tu evaluación coincide con una señal medible del mismo eje. Cuando la percepción y el número dicen lo mismo, hay poco que discutir.',
    regla:
      'Respiración lenta al final del día, magnesio de tu comida, corte de estimulantes por la tarde y una rutina de bajada antes de dormir. Es de lo que más rápido se nota.',
    bandera: null,
    destino: { label: 'Tu química natural', route: '/tests' },
    candidatas: [
      { key: 'magnesio', dir: 'bajo' },
      { key: 'eficiencia_del_sueno', dir: 'bajo' },
      { key: 'resiliencia_emocional_estres', dir: 'bajo' },
      { key: 'senales_de_fatiga_cronica', dir: 'fuera' },
    ],
    minimo: 2,
    extra: (snap) => {
      const d = (snap.quimica?.deficitPrincipal ?? '').toLowerCase();
      if (d.includes('gaba')) return [{ label: 'Déficit principal: GABA', fuente: 'quimica' }];
      if (d.includes('sero')) return [{ label: 'Déficit principal: serotonina', fuente: 'quimica' }];
      return [];
    },
  },
  {
    key: 'carga_cardiovascular',
    peso: 8,
    titular: 'Tu carga cardiovascular pide atención, no alarma.',
    logica:
      'Lo que importa no es un número de colesterol suelto, sino cuántas partículas circulan y qué tan bien las maneja tu metabolismo. Por eso se leen juntos y no por separado.',
    convergencia:
      'Dos o más señales del mismo eje se movieron a la vez. Ahí ya no es ruido de un estudio: es una tendencia que conviene seguir.',
    regla:
      'Cardio suave y sostenido varias veces por semana, grasas de comida real, fibra en cada comida y menos ultraprocesado. Vuelve a medir en unos meses con el mismo laboratorio.',
    bandera: 'Lleva estos marcadores a tu consulta para cerrar la foto.',
    destino: { label: 'Ver estos marcadores en ATP Labs', route: '/edad-atp/labs' },
    candidatas: [
      { key: 'apolipoproteinas_b', dir: 'alto' },
      { key: 'colesterol_ldl', dir: 'alto' },
      { key: 'indice_aterogenico', dir: 'alto' },
      { key: 'relacion_trigliceridos_hdl', dir: 'alto' },
      { key: 'colesterol_hdl', dir: 'bajo' },
      { key: 'presion_sistolica', dir: 'alto' },
      { key: 'sdldl', dir: 'alto' },
    ],
    minimo: 2,
  },
  {
    key: 'hierro_en_equilibrio',
    peso: 6,
    titular: 'Tu hierro no está en su ventana, y el hierro es de los que estorban por los dos lados.',
    logica:
      'El hierro es de los pocos nutrientes donde faltar y sobrar cuestan parecido. Poco y te falta transporte de oxígeno; de más y se guarda donde no debe.',
    convergencia:
      'Varias señales del mismo panel se movieron en la misma dirección. Eso separa un dato flojo de un patrón real.',
    regla:
      'No lo corrijas a ciegas: primero confirma con una segunda medición y revísalo en consulta. Mientras tanto, comida real y nada de suplementar hierro por tu cuenta.',
    bandera: 'El hierro se ajusta con tu profesional, nunca por cuenta propia.',
    destino: { label: 'Ver estos marcadores en ATP Labs', route: '/edad-atp/labs' },
    candidatas: [
      { key: 'ferritina', dir: 'fuera' },
      { key: 'saturacion_de_hierro', dir: 'fuera' },
      { key: 'hierro_serico', dir: 'fuera' },
      { key: 'transferrina', dir: 'fuera' },
      { key: 'hemoglobina', dir: 'fuera' },
      { key: 'capacidad_de_fijacion_de_hierro', dir: 'fuera' },
    ],
    minimo: 2,
  },
  {
    key: 'metilacion_b',
    peso: 6,
    titular: 'Tu homocisteína está pidiendo sus vitaminas del grupo B.',
    logica:
      'La homocisteína sube cuando falta la materia prima que la recicla. Es de las señales más baratas de corregir y de las que más se ignoran.',
    convergencia:
      'Subió y además hay un nutriente del mismo proceso por debajo. Las dos señales cuentan la misma historia.',
    regla:
      'Hoja verde, huevo y proteína animal de calidad en tu comida. Vuelve a medirla en unos meses para ver si se movió con esto antes de agregar nada.',
    bandera: null,
    destino: { label: 'Ver estos marcadores en ATP Labs', route: '/edad-atp/labs' },
    ancla: { key: 'homocisteina', dir: 'alto' },
    candidatas: [
      { key: 'folato_acido_folico', dir: 'bajo' },
      { key: 'vitamina_b12', dir: 'bajo' },
    ],
    minimo: 2,
  },
];

/** Nombres legibles de las señales que dispararon, sin repetir. */
function etiquetasDe(señales: Señal[]): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const s of señales) {
    const dir = s.direccion === 'bajo' ? 'por debajo' : s.direccion === 'alto' ? 'por arriba' : 'fuera de su ventana';
    const txt = `${s.label} ${dir}`;
    if (vistos.has(txt)) continue;
    vistos.add(txt);
    out.push(txt);
  }
  return out;
}

/** Evalúa una regla contra las señales. Devuelve null si no converge. */
export function evaluarRegla(regla: ReglaCruce, señales: Record<string, Señal>, snap: LecturaSnapshot): Cruce | null {
  if (regla.ancla && !cumple(señales[regla.ancla.key], regla.ancla.dir)) return null;

  const disparadas: Señal[] = [];
  if (regla.ancla) {
    const a = señales[regla.ancla.key];
    if (a) disparadas.push(a);
  }
  for (const c of regla.candidatas) {
    if (c.key === regla.ancla?.key) continue;
    if (cumple(señales[c.key], c.dir)) disparadas.push(señales[c.key]);
  }

  const extras = regla.extra ? regla.extra(snap) : [];
  const fuerza = disparadas.length + extras.length;
  const minimo = Math.max(2, regla.minimo);
  if (fuerza < minimo) return null;

  // Si la regla tiene extra declarado, el extra es obligatorio: sin él, el
  // patrón es otro (el déficit de la química es lo que da sentido al cruce).
  if (regla.extra && extras.length === 0) return null;

  const fuentes = new Set<FuenteTag>();
  for (const s of disparadas) fuentes.add(s.fuente);
  for (const e of extras) fuentes.add(e.fuente);

  const senales = [...etiquetasDe(disparadas), ...extras.map((e) => e.label)];

  return {
    key: regla.key,
    titular: regla.titular,
    fuentes: [...fuentes],
    hallazgo: `${senales.slice(0, 4).join('. ')}.`,
    logica: regla.logica,
    convergencia: regla.convergencia,
    regla: regla.regla,
    bandera: regla.bandera,
    senales,
    peso: regla.peso,
    fuerza,
    destino: regla.destino,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lo que falta para que la lectura sea completa
// ─────────────────────────────────────────────────────────────────────────────

export interface Faltante {
  key: string;
  titulo: string;
  /** Qué se desbloquea al conseguirlo. Nunca un regaño. */
  porque: string;
  accionLabel: string;
  route: string;
}

/** Las seis fuentes que alimentan la lectura, con lo que aporta cada una. */
export function faltantesDe(snap: LecturaSnapshot): Faltante[] {
  const out: Faltante[] = [];
  const nLabs = Object.keys(snap.labs ?? {}).length;

  if (nLabs === 0) {
    out.push({
      key: 'labs',
      titulo: 'No tenemos ningún estudio de sangre tuyo',
      porque: 'Es la fuente que más cruces enciende. Sin ella, tu lectura se queda en lo que percibes y lo que mide tu báscula.',
      accionLabel: 'Subir mis estudios',
      route: '/my-health',
    });
    out.push({
      key: 'labs_guia',
      titulo: 'Y si no sabes qué estudios pedir',
      porque: 'Hay una guía con qué pedir, para qué sirve cada uno y cuánto cuesta aproximadamente.',
      accionLabel: 'Ver la guía de labs',
      route: '/labs-guide',
    });
  } else if (nLabs < 12) {
    out.push({
      key: 'labs_pocos',
      titulo: `Tienes ${nLabs} parámetros: alcanza para empezar, no para cerrar la foto`,
      porque: 'Con un panel más amplio los cruces dejan de ser sospechas y pasan a ser patrones.',
      accionLabel: 'Ver la guía de labs',
      route: '/labs-guide',
    });
  }

  if (!snap.composicion || (snap.composicion.grasaPct == null && snap.composicion.pesoKg == null)) {
    out.push({
      key: 'composicion',
      titulo: 'Falta tu composición corporal',
      porque: 'El físico es lo que más predice el ritmo al que envejeces. Sin grasa, músculo y peso, media lectura se queda fuera.',
      accionLabel: 'Registrar mis medidas',
      route: '/medidas',
    });
  }

  if (!snap.quimica?.deficitPrincipal) {
    out.push({
      key: 'quimica',
      titulo: 'Falta tu química natural',
      porque: 'Es lo que explica por qué te cuesta apagar, o por qué te prende el reto. Se contesta una vez y sirve para siempre.',
      accionLabel: 'Hacer la evaluación',
      route: '/tests',
    });
  }

  if (snap.historiaCategorias === 0) {
    out.push({
      key: 'historia',
      titulo: 'Falta tu historia',
      porque: 'Un número sin contexto se malinterpreta. Tus antecedentes cambian cómo se lee todo lo demás.',
      accionLabel: 'Llenar mi historia clínica',
      route: '/historia-clinica',
    });
  }

  if (!snap.cronotipo) {
    out.push({
      key: 'cronotipo',
      titulo: 'No sabemos a qué hora enciende tu cuerpo',
      porque: 'El reloj ordena tu día completo: a qué hora comes, entrenas y te duermes.',
      accionLabel: 'Descubrir mi cronotipo',
      route: '/my-chronotype',
    });
  }

  if (snap.sexo === 'female' && !snap.faseCiclo) {
    out.push({
      key: 'ciclo',
      titulo: 'Falta tu fase del ciclo',
      porque: 'Tus hormonales cambian según el día del ciclo. Sin la fase, ese panel se puede leer al revés.',
      accionLabel: 'Registrar mi ciclo',
      route: '/cycle',
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// La síntesis: "cómo te leo"
// ─────────────────────────────────────────────────────────────────────────────

function redondea(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/** Baja la primera letra del titular para encajarlo dentro de una frase. */
function enFrase(titular: string): string {
  const sinPunto = titular.replace(/\.$/, '');
  return sinPunto.charAt(0).toLowerCase() + sinPunto.slice(1);
}

/**
 * La síntesis se ARMA, no se inventa: cada frase sale de un dato que existe.
 * Si no hay material, devuelve lista vacía y la pantalla muestra el estado
 * honesto en lugar de una prosa vacía.
 */
export function construirSintesis(snap: LecturaSnapshot, cruces: Cruce[]): string[] {
  const frases: string[] = [];
  const e = snap.edad;

  if (e?.porSangre != null && e?.porFisico != null) {
    const dif = e.porFisico - e.porSangre;
    if (Math.abs(dif) >= 2) {
      const quienManda = dif > 0 ? 'tu físico' : 'tu química';
      frases.push(
        `Tu química interna marca ${redondea(e.porSangre)} años y tu físico ${redondea(e.porFisico)}. La conversación de los próximos meses es ${quienManda}: es la parte más modificable que tienes.`,
      );
    } else {
      frases.push(
        `Tu química interna marca ${redondea(e.porSangre)} años y tu físico ${redondea(e.porFisico)}: van parejos. No hay una mitad arrastrando a la otra.`,
      );
    }
  } else if (e?.integral != null && e?.cronologica != null) {
    const delta = e.integral - e.cronologica;
    const txt =
      delta >= 1
        ? `Hoy tu cuerpo se lee ${redondea(delta)} años por arriba de tu edad real.`
        : delta <= -1
          ? `Hoy tu cuerpo se lee ${redondea(Math.abs(delta))} años por debajo de tu edad real.`
          : 'Hoy tu cuerpo se lee a la par de tu edad real.';
    frases.push(txt);
  }

  if (cruces.length > 0) {
    // Sin coletilla: varios titulares ya cierran con su propia consecuencia y
    // agregar "ordena lo demás" producía la frase dos veces en la misma línea.
    frases.push(`Por encima de todo hay una prioridad: ${enFrase(cruces[0].titular)}.`);
  }
  if (cruces.length > 1) {
    const debajo = cruces.slice(1, 3).map((c) => enFrase(c.titular));
    frases.push(
      debajo.length === 1
        ? `Debajo de eso: ${debajo[0]}.`
        : `Debajo de eso van dos cosas en paralelo: ${debajo[0]}, y ${debajo[1]}.`,
    );
  }
  if (cruces.length > 3) {
    frases.push(`Hay ${cruces.length - 3} lecturas más abajo, en orden de impacto. Se trabajan juntas, no en fila.`);
  }
  if (cruces.length === 0 && Object.keys(snap.labs ?? {}).length > 0) {
    frases.push(
      'Con lo que tenemos hoy no aparece ningún cruce que pida prioridad. Eso es buena noticia, y también significa que hay margen para medir más fino.',
    );
  }

  return frases;
}

// ─────────────────────────────────────────────────────────────────────────────
// La lectura completa
// ─────────────────────────────────────────────────────────────────────────────

export interface Lectura {
  sintesis: string[];
  cruces: Cruce[];
  faltantes: Faltante[];
  /** 0 a 100. Qué tan completa es la materia prima, no qué tan sano estás. */
  completitud: number;
  completitudLabel: string;
  /** Sin ninguna fuente no hay nada que leer: la pantalla arranca en onboarding. */
  vacia: boolean;
}

const FUENTES_TOTALES = 6;

export function completitudDe(snap: LecturaSnapshot): number {
  let n = 0;
  if (Object.keys(snap.labs ?? {}).length >= 8) n += 1;
  else if (Object.keys(snap.labs ?? {}).length > 0) n += 0.5;
  if (snap.composicion && (snap.composicion.grasaPct != null || snap.composicion.pesoKg != null)) n += 1;
  if (snap.quimica?.deficitPrincipal) n += 1;
  if (snap.historiaCategorias > 0) n += 1;
  if (snap.cronotipo) n += 1;
  if (snap.sexo === 'female' ? Boolean(snap.faseCiclo) : snap.sintomasActivos.length > 0) n += 1;
  return Math.round((n / FUENTES_TOTALES) * 100);
}

export function etiquetaCompletitud(pct: number): string {
  if (pct >= 80) return 'Lectura robusta';
  if (pct >= 50) return 'Lectura parcial';
  if (pct > 0) return 'Lectura inicial';
  return 'Sin material todavía';
}

/** El punto de entrada. Todo lo de arriba existe para esta función. */
export function construirLectura(snap: LecturaSnapshot): Lectura {
  const señales = construirSeñales(snap);
  const cruces = REGLAS_CRUCE
    .map((r) => evaluarRegla(r, señales, snap))
    .filter((c): c is Cruce => c !== null)
    .sort((a, b) => b.peso - a.peso || b.fuerza - a.fuerza || a.key.localeCompare(b.key));

  const completitud = completitudDe(snap);
  return {
    sintesis: construirSintesis(snap, cruces),
    cruces,
    faltantes: faltantesDe(snap),
    completitud,
    completitudLabel: etiquetaCompletitud(completitud),
    vacia: completitud === 0,
  };
}
