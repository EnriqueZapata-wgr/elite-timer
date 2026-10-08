/**
 * mi-programa-core (25-sep-2026, APP_ELITE_DX). Logica PURA de la sala MI
 * PROGRAMA: su evaluacion como casa del servicio. Sin react-native ni
 * supabase, para que node la pruebe
 * (`node scripts/run-tests-sin-vitest.js src/services/elite/__tests__/mi-programa-core.test.ts`).
 *
 * Que decide aqui:
 *  1. Que secciones de SU documento tienen contenido. Una fila vacia
 *     ("Genetica" a quien todavia no le llega la segunda entrega, "Quimica
 *     cerebral" sin test) se lee como un hueco del servicio; mejor no
 *     pintarla. La regla copia lo que la pantalla de la evaluacion pinta:
 *     si alla solo saldria el aviso de "sin datos", aqui no hay fila.
 *  2. Las filas de cada bloque (BLOQUES_PROGRAMA) con su segunda linea.
 *     "Tu plan" y "Con tu medico" se muestran siempre (con "En tu
 *     evaluacion" si vienen vacios, como detallePuertas): son el indice de
 *     lo que pago y una puerta que desaparece confunde mas que una vacia.
 *  3. El resumen de arriba: Edad ATP contra edad real, cuantos piden accion
 *     y la version. Solo numeros del documento; lo que falta se omite, nunca
 *     se vuelve cero.
 *  4. Que estudios se ofrecen (Genetica solo con hallazgos) y las filas de
 *     "Tu expediente".
 *  5. Como pasa la pantalla de un estado a otro sin perder lo ya visto, y
 *     a quien se le promete "en preparacion".
 *
 * 25-sep-2026 (revision en frio): las rutas viven aqui (RUTAS_MI_PROGRAMA)
 * para que el test verifique que ninguna es un <Redirect> hacia la sala
 * SALUD, que en la app Elite DX esta fuera del tab bar. Evolucion salio por
 * eso: /salud/evolucion caia en el hub viejo.
 *
 * 8-oct-2026 (nivel 2): el mismo documento puede ser `tipo: 'programa'` (una
 * evaluacion ligera, con secciones vacias, y el mismo plan). Aqui se decide,
 * con la voz del documento (voz-programa-core), lo que ese cliente lee en MI
 * PROGRAMA, en la pantalla del documento, en Genetica, en el mapa funcional
 * y en Suplementos: nunca "Elite", nunca una seccion vacia ni una promesa de
 * algo que no se hizo. Con un documento Elite todo sale letra por letra como
 * antes (lo amarran las pruebas).
 */
import {
  esEliteV3, esPrograma, tipoDeDocumento, validarEliteV3, type EliteEstado, type EliteMarcador, type EliteRango, type EliteV3,
} from './elite-v3-core';
import { formatearFecha, SECCIONES_UI, type SeccionUiKey } from './evaluacion-elite-core';
import { BLOQUES_PROGRAMA, etiquetaSeccion, tituloDeBloque, type BloqueProgramaKey } from './programa-elite-core';
import {
  VOZ_ELITE, vozDe, vozDeDocumento, vozMientras, vozParaTextos, conMayuscula, type VozPrograma,
} from './voz-programa-core';
import { detallePuertas, edadesDeEvaluacion, marcadoresDeEvaluacion } from '@/src/services/hoy/elite-hoy-core';
import type { EdadHero } from '@/src/services/hoy/hero-laboratorios-core';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function hayTexto(s: string | null | undefined): boolean {
  return typeof s === 'string' && s.trim().length > 0;
}

function hayTextos(xs: ReadonlyArray<string> | null | undefined): boolean {
  return Array.isArray(xs) && xs.some(hayTexto);
}

function hayNumero(n: number | null | undefined): boolean {
  return typeof n === 'number' && Number.isFinite(n);
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** "a", "a y b", "a, b y c". */
function unirConY(xs: string[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
}

function totalMarcadoresComentados(e: EliteV3): number {
  return e.marcadores.grupos.reduce((n, g) => n + g.marcadores.length, 0);
}

// ---------------------------------------------------------------------------
// 1. Que secciones tienen contenido en ESTE documento
// ---------------------------------------------------------------------------

/**
 * true si la seccion trae algo que leer en la pantalla de la evaluacion.
 * Decisiones (25-sep-2026, reversibles):
 *  - Marcadores: una `intro` sola no cuenta (alla quedaria la leyenda y
 *    nada mas). Cuentan marcadores o notas.
 *  - Quimica cerebral: `intro` y `cierre` solos no cuentan; son el marco
 *    del test, no el test. Cuentan los puntajes, los ejes o las lecturas.
 *  - Genetica: solo `hallazgos`. Sin hallazgos la pantalla dice que la
 *    genetica llega en la segunda entrega y no pinta el resumen.
 */
export function seccionTieneContenido(e: EliteV3, key: SeccionUiKey): boolean {
  switch (key) {
    // 25-sep-2026 (revision en frio): el `lead` no cuenta; la pantalla lo
    // pinta en la cabecera, no en Inicio. Cuentan los numeros que Inicio
    // dibuja, incluida la duracion del programa.
    case 'inicio': {
      const edades = [e.inicio.edad_cronologica, e.inicio.edad_atp, e.inicio.diferencia_anios];
      // 8-oct-2026 (nivel 2): en un programa la duracion es del plan y ya la
      // dice el encabezado; Inicio solo cuenta si trae alguna edad. Si no,
      // seria una tarjeta de rayas. En Elite la regla no cambia.
      if (esPrograma(e)) return edades.some(hayNumero);
      return [...edades, e.inicio.programa_semanas].some(hayNumero);
    }
    case 'conteo': {
      const c = e.conteo;
      return [c.total_medido, c.piden_accion, c.valores_medidos, c.hallazgos_adn, c.ejes_quimica,
        c.ritmo_envejecimiento_meses, c.calidad_estudio].some(hayNumero) || c.mueven_tu_caso !== null;
    }
    case 'edades': {
      const x = e.edades;
      return [x.real, x.sangre, x.vida, x.atp, x.sf_pct].some(hayNumero) || x.detalle.length > 0;
    }
    case 'sistemas':
      return e.sistemas.length > 0;
    case 'contexto':
      return hayTextos(e.contexto.parrafos) || hayTexto(e.contexto.cita) || hayTextos(e.contexto.antecedentes);
    case 'marcadores':
      return totalMarcadoresComentados(e) > 0 || hayTextos(e.marcadores.notas);
    case 'composicion': {
      const r = e.composicion.reparto;
      const hayReparto = r !== null
        && [r.peso_kg, r.grasa_pct, r.grasa_kg, r.musculo_pct, r.musculo_kg, r.resto_pct, r.resto_kg].some(hayNumero);
      return hayReparto || e.composicion.filas.length > 0;
    }
    case 'braverman': {
      const b = e.braverman;
      return b.naturaleza !== null || b.desgaste !== null || b.ejes.length > 0 || b.lecturas.length > 0;
    }
    case 'genetica':
      return e.genetica.hallazgos.length > 0;
    case 'cruces':
      return e.cruces.hilo !== null || e.cruces.lista.length > 0;
    case 'medico':
      return hayTexto(e.medico.intro) || e.medico.pendientes.length > 0
        || e.medico.fuera_del_tuyo.length > 0 || e.medico.advertencias.length > 0;
    case 'cierre':
      // 25-sep-2026 (revision en frio): el disclaimer tambien se dibuja alla.
      return e.cierre.palancas.length > 0 || hayTexto(e.cierre.vigencia) || hayTexto(e.cierre.firma)
        || hayTexto(e.cierre.disclaimer);
    case 'alimentacion': {
      const a = e.alimentacion;
      const m = a.metas;
      const hayMetas = !!m && [m.proteina_g_dia, m.agua_ml_dia, m.kcal_dia, m.grasa_g_dia, m.carbohidrato_g_dia].some(hayNumero);
      return hayTextos(a.prioriza) || hayTextos(a.evita) || a.horarios.length > 0 || a.ventana !== null
        || hayTextos(a.notas) || hayMetas || (a.comidas?.length ?? 0) > 0;
    }
    case 'suplementos':
      return e.suplementos.length > 0;
    case 'entrenamiento': {
      const x = e.entrenamiento;
      return hayTexto(x.base) || x.sesiones.length > 0 || hayTextos(x.descanso) || hayTextos(x.notas)
        || (x.rutinas?.length ?? 0) > 0;
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// 2. Las filas de cada bloque
// ---------------------------------------------------------------------------

const ETIQUETA_EDAD: ReadonlyArray<{ k: 'real' | 'sangre' | 'vida' | 'atp'; label: string }> = [
  { k: 'real', label: 'real' },
  { k: 'sangre', label: 'sangre' },
  { k: 'vida', label: 'vida' },
  { k: 'atp', label: 'ATP' },
];

/**
 * La segunda linea de una fila, con numeros del documento. null = la fila
 * va sin segunda linea (no se rellena con nada inventado).
 */
export function detalleSeccion(e: EliteV3, key: SeccionUiKey): string | null {
  switch (key) {
    case 'alimentacion':
    case 'suplementos':
    case 'entrenamiento':
      return detallePuertas(e)[key];
    case 'medico': {
      const n = e.medico.pendientes.length;
      // 8-oct-2026 (nivel 2): "En tu programa" si el documento no trae evaluacion.
      return n > 0 ? plural(n, 'pendiente de medir', 'pendientes de medir') : `En ${vozDeDocumento(e).documento}`;
    }
    case 'conteo':
      return hayNumero(e.conteo.total_medido) ? `${e.conteo.total_medido} medidos` : null;
    case 'edades': {
      const presentes = ETIQUETA_EDAD.filter(({ k }) => hayNumero(e.edades[k])).map(({ label }) => label);
      if (presentes.length === 0) return null;
      return `Edad ${unirConY(presentes)}`;
    }
    case 'sistemas':
      return e.sistemas.length > 0 ? `${plural(e.sistemas.length, 'sistema', 'sistemas')}, de peor a mejor` : null;
    case 'marcadores': {
      const n = totalMarcadoresComentados(e);
      return n > 0 ? plural(n, 'marcador comentado', 'marcadores comentados') : null;
    }
    case 'composicion': {
      const n = e.composicion.filas.length;
      return n > 0 ? plural(n, 'medida', 'medidas') : null;
    }
    case 'genetica': {
      const n = e.genetica.hallazgos.length;
      return n > 0 ? plural(n, 'hallazgo', 'hallazgos') : null;
    }
    case 'cruces': {
      const n = e.cruces.lista.length;
      return n > 0 ? plural(n, 'cruce', 'cruces') : null;
    }
    case 'cierre':
      return e.cierre.palancas.length === 3 ? 'Tus tres palancas' : null;
    default:
      return null;
  }
}

/**
 * 25-sep-2026 (revision en frio): Inicio y En numeros ya estan en la
 * tarjeta de resumen (edades, piden accion) y ella enlaza a esas secciones.
 * Repetirlas como filas era decir lo mismo dos veces. Es un filtro de
 * pantalla: BLOQUES_PROGRAMA (y su test de que cada seccion cae en un
 * bloque) no cambia.
 */
export const CUBIERTAS_POR_RESUMEN: readonly SeccionUiKey[] = ['inicio', 'conteo'];

export interface FilaPrograma {
  seccion: SeccionUiKey;
  titulo: string;
  detalle: string | null;
}

export interface BloqueMiPrograma {
  key: BloqueProgramaKey;
  titulo: string;
  filas: FilaPrograma[];
}

/**
 * Los bloques de MI PROGRAMA para este documento, en el orden de
 * BLOQUES_PROGRAMA. En "Tu evaluacion" solo van las secciones con
 * contenido; "Tu plan" y "Con tu medico" siempre. Un bloque que se queda
 * sin filas no se devuelve (hoy no puede pasar: cierre siempre trae sus
 * tres palancas, pero la pantalla no pinta un titulo huerfano).
 *
 * 8-oct-2026 (nivel 2), solo en un documento `tipo: 'programa'`:
 *  - Los titulos salen de la voz (tituloDeBloque): sin evaluacion, el bloque
 *    de la evaluacion se llama "TU PROGRAMA".
 *  - Tu plan y Con tu medico tambien filtran por contenido: una fila "En tu
 *    programa" que abre una seccion vacia es un hueco, y Con tu medico sin
 *    nada no se pinta.
 *  - Tu plan se devuelve aunque se quede sin filas: la pantalla le pone
 *    arriba "Ver mi plan de la semana", que no depende del documento.
 * En Elite el resultado es el de siempre (Tu plan nunca queda vacio ahi).
 */
export function bloquesMiPrograma(e: EliteV3): BloqueMiPrograma[] {
  const voz = vozDeDocumento(e);
  const programa = voz.tipo === 'programa';
  return BLOQUES_PROGRAMA
    .map((b) => ({
      key: b.key,
      titulo: tituloDeBloque(b, voz),
      filas: b.secciones
        .filter((sec) => (b.key === 'evaluacion'
          ? !CUBIERTAS_POR_RESUMEN.includes(sec) && seccionTieneContenido(e, sec)
          : !programa || seccionTieneContenido(e, sec)))
        .map((sec) => ({ seccion: sec, titulo: etiquetaSeccion(sec), detalle: detalleSeccion(e, sec) })),
    }))
    .filter((b) => b.filas.length > 0 || (programa && b.key === 'plan'));
}

// ---------------------------------------------------------------------------
// 3. El resumen de arriba
// ---------------------------------------------------------------------------

/**
 * Cuantos marcadores piden accion, solo si el documento lo sabe: el numero
 * que Enrique escribio en el conteo o, si no lo puso, los `att` que comenta.
 * Sin conteo y sin marcadores comentados no hay de donde contar: null (a
 * diferencia de cuentaPidenAccion, que ahi diria 0).
 */
export function pidenAccionDelDocumento(e: EliteV3): number | null {
  if (hayNumero(e.conteo.piden_accion)) return e.conteo.piden_accion;
  const todos = marcadoresDeEvaluacion(e);
  if (todos.length === 0) return null;
  return todos.filter((m) => m.estado === 'att').length;
}

/**
 * "Versión 2 · toma de mayo 2026 · interpretada por Enrique Zapata". Sin fecha, sin ese tramo.
 * 8-oct-2026 (nivel 2): un programa sin toma de sangre (`fecha_toma` null)
 * cae en el "sin fecha"; y si no trae evaluacion nadie la "interpreto": dice
 * "preparado por", como el PDF (htmlDeEvaluacion).
 */
export function lineaVersion(e: EliteV3): string {
  const partes = [`Versión ${e.version}`];
  if (hayTexto(e.cliente.fecha_toma)) partes.push(`toma de ${formatearFecha(e.cliente.fecha_toma)}`);
  if (hayTexto(e.interpretado_por.evaluacion)) partes.push(`${verboFirma(vozDeDocumento(e))} ${e.interpretado_por.evaluacion}`);
  return partes.join(' · ');
}

/** "interpretada por" (hay evaluacion) o "preparado por" (programa sin evaluacion). */
function verboFirma(voz: Pick<VozPrograma, 'tipo' | 'conDiagnostico'>): string {
  return voz.tipo === 'programa' && !voz.conDiagnostico ? 'preparado por' : 'interpretada por';
}

/**
 * 25-sep-2026 (revision en frio): a donde lleva la fila de edades. Inicio
 * solo dibuja la Edad ATP de `inicio`; si la del resumen salio del respaldo
 * (`edades.atp`), Inicio mostraria la raya y el cliente no veria el numero
 * que toco. Entonces va a Edades.
 */
export function destinoEdad(e: EliteV3): SeccionUiKey {
  return hayNumero(e.inicio.edad_atp) ? 'inicio' : 'edades';
}

/**
 * A donde lleva "N marcadores piden accion": a Marcadores si la seccion
 * tiene contenido; si no, a En numeros cuando el conteo trae el dato; y si
 * el numero salio de los `att` de composicion, a Composicion. null solo
 * cuando no hay numero que pintar.
 */
export function destinoPiden(e: EliteV3): SeccionUiKey | null {
  if (pidenAccionDelDocumento(e) === null) return null;
  if (seccionTieneContenido(e, 'marcadores')) return 'marcadores';
  if (hayNumero(e.conteo.piden_accion)) return 'conteo';
  return 'composicion';
}

export interface ResumenEvaluacion {
  edad: EdadHero | null;
  /** Seccion a la que abre la fila de edades. */
  destinoEdad: SeccionUiKey;
  piden: number | null;
  /** Seccion a la que abre la fila de piden accion (null si no hay fila). */
  destinoPiden: SeccionUiKey | null;
  version: string;
}

export function resumenEvaluacion(e: EliteV3): ResumenEvaluacion {
  return {
    edad: edadesDeEvaluacion(e),
    destinoEdad: destinoEdad(e),
    piden: pidenAccionDelDocumento(e),
    destinoPiden: destinoPiden(e),
    version: lineaVersion(e),
  };
}

// ---------------------------------------------------------------------------
// 4. Tus estudios
// ---------------------------------------------------------------------------

/**
 * Todas las rutas que abre MI PROGRAMA. Ninguna puede ser un <Redirect>
 * hacia /salud (la sala vieja, fuera del tab bar en Elite DX): lo verifica
 * el test leyendo cada archivo de app/. evaluacion-elite y genetica son
 * pantallas reales; /historia-clinica redirige a /tests (el hub de
 * cuestionarios, fuera de /salud), que es a donde la manda el registro.
 *
 * 26-sep-2026 (decision de Enrique: Elite DX es "todo lo de ATP mas su
 * programa"): entran mapa, padecimientos y linea de tiempo, las tres
 * pantallas reales (sin <Redirect>) que solo tenian puerta en el hub de
 * SALUD. /salud/diagnostico es carpeta: la atiende su index.tsx.
 */
export const RUTAS_MI_PROGRAMA = {
  evaluacion: '/salud/evaluacion-elite',
  suplementos: '/supplements',
  labs: '/edad-atp/labs',
  genetica: '/salud/genetica',
  historia: '/historia-clinica',
  sintomas: '/salud/mis-sintomas',
  datos: '/salud/mis-datos',
  ficha: '/salud/ficha-emergencia',
  mapa: '/salud/diagnostico',
  padecimientos: '/salud/padecimientos',
  linea: '/salud/mi-expediente',
  // 7-oct-2026 (Mi plan): la primera fila de TU PLAN. Pantalla real, fuera de
  // /salud; queda bajo el mismo candado que las demas rutas de la sala.
  miPlan: '/mi-plan',
} as const;

/**
 * 7-oct-2026 (Mi plan): la fila que abre TU PLAN. Las tres filas de abajo
 * (alimentacion, suplementos, entrenamiento) son el plan por TEMA, tal como
 * lo escribio Enrique; esta lo muestra por DIA, que es como se vive: que toca
 * hoy, que toca el jueves y que puede mover el cliente. Va primero porque es
 * lo que se consulta a diario. El detalle no promete nada que la pantalla no
 * haga.
 */
export const FILA_PLAN_SEMANA = {
  titulo: 'Ver mi plan de la semana',
  detalle: 'Lo que te toca cada día y qué puedes mover',
  ruta: RUTAS_MI_PROGRAMA.miPlan,
} as const;

export type EstudioKey = 'labs' | 'genetica';

/**
 * Laboratorios siempre (la carga 324 escribe `lab_values` del cliente Elite).
 * Genetica abre por EXISTENCIA de hallazgos en su evaluacion (misma idea que
 * app-registry): sin evaluacion leida, o sin hallazgos, no se ofrece una
 * puerta que abre a "todavia no".
 * 25-sep-2026 (revision en frio): Evolucion salio; /salud/evolucion es un
 * <Redirect> al hub de SALUD, que en Elite DX ya no es parte de la app.
 */
export function estudiosVisibles(e: EliteV3 | null): EstudioKey[] {
  const base: EstudioKey[] = ['labs'];
  return e && e.genetica.hallazgos.length > 0 ? [...base, 'genetica'] : base;
}

export type ExpedienteKey = 'mapa' | 'historia' | 'sintomas' | 'padecimientos' | 'datos' | 'linea' | 'ficha';

export interface FilaExpediente {
  key: ExpedienteKey;
  titulo: string;
  detalle: string;
  ruta: (typeof RUTAS_MI_PROGRAMA)[ExpedienteKey];
}

/**
 * 25-sep-2026 (revision en frio): el expediente se habia quedado sin puerta
 * (vivia solo en el hub de SALUD, oculto en Elite DX). Pantallas reales y
 * sueltas, abiertas para Elite (minTier premium; con VENTA_AL_PUBLICO en
 * false no cierra nada). La ficha va al editor (/salud/ficha-emergencia),
 * no al modo pantalla para un extrano (/ficha-emergencia).
 *
 * 26-sep-2026 ("todo lo de ATP mas su programa"): entran Mi mapa funcional
 * (la sintesis, por eso va primero), Padecimientos y Linea de tiempo. Abiertas
 * para Elite: en el registro son minTier premium, que Elite alcanza, y el
 * mapa deja generar a Elite (esElite). Las segundas lineas dicen lo que cada
 * pantalla pinta. El titulo es "Mi mapa funcional": la palabra de la ruta
 * (diagnostico) no llega al cliente.
 */
export const FILAS_EXPEDIENTE: readonly FilaExpediente[] = [
  { key: 'mapa', titulo: 'Mi mapa funcional', detalle: 'Tus raíces detectadas y su nivel', ruta: RUTAS_MI_PROGRAMA.mapa },
  { key: 'historia', titulo: 'Historia clínica', detalle: 'Tus antecedentes y cuestionarios', ruta: RUTAS_MI_PROGRAMA.historia },
  { key: 'sintomas', titulo: 'Síntomas', detalle: 'Qué sientes, desde cuándo y cuánto', ruta: RUTAS_MI_PROGRAMA.sintomas },
  { key: 'padecimientos', titulo: 'Padecimientos', detalle: 'Tus condiciones y sus episodios', ruta: RUTAS_MI_PROGRAMA.padecimientos },
  { key: 'datos', titulo: 'Tus datos', detalle: 'Labs, composición y signos vitales', ruta: RUTAS_MI_PROGRAMA.datos },
  { key: 'linea', titulo: 'Línea de tiempo', detalle: 'Síntomas, labs y mediciones, mes por mes', ruta: RUTAS_MI_PROGRAMA.linea },
  { key: 'ficha', titulo: 'Ficha de emergencia', detalle: 'Sangre, alergias y a quién llamar', ruta: RUTAS_MI_PROGRAMA.ficha },
];

// ---------------------------------------------------------------------------
// 5. El estado de la pantalla
// ---------------------------------------------------------------------------

/** La forma de leerEvaluacionEliteVigente, copiada para no traer supabase al test. */
export type LecturaParaPrograma =
  | { ok: true; evaluacion: EliteV3 | null }
  | { ok: false; motivo: 'lectura' | 'formato' };

export type MotivoFallo = 'lectura' | 'formato' | 'tope';

export type EstadoMiPrograma =
  | { estado: 'cargando' }
  | { estado: 'error'; motivo: MotivoFallo }
  | { estado: 'sin_evaluacion' }
  | { estado: 'ok'; evaluacion: EliteV3 };

/**
 * Regla 13: un fallo no borra una evaluacion que ya se veia (se sirve lo
 * visto y el siguiente foco reintenta). Una lectura buena siempre gana,
 * aunque llegue despues del tope.
 */
export function siguienteEstado(prev: EstadoMiPrograma, r: LecturaParaPrograma): EstadoMiPrograma {
  if (r.ok) return r.evaluacion ? { estado: 'ok', evaluacion: r.evaluacion } : { estado: 'sin_evaluacion' };
  if (prev.estado === 'ok') return prev;
  return { estado: 'error', motivo: r.motivo };
}

/** Lo que useSubscription sabe, en la forma minima que esta decision necesita. */
export interface NivelParaPrograma {
  esElite: boolean;
  tieneEvaluacionElite: boolean;
  nivelNoSePudoLeer: boolean;
  nivelCargando: boolean;
}

export type CaraSinEvaluacion = 'cargando' | 'en_preparacion' | 'cuenta_no_leida' | 'neutral';

/**
 * 25-sep-2026 (revision en frio): la lectura funciono y no hay evaluacion.
 * "En preparacion con Enrique" es una promesa y solo se le hace a quien la
 * contrato. Copia exacta de app/salud/evaluacion-elite.tsx (A5):
 *  - nivel cargando: se espera (ahi pinta el cargando).
 *  - Elite (nivel o grant) o evaluacion registrada: en preparacion.
 *  - ninguna de las dos y el nivel no se pudo leer: "no se pudo leer tu
 *    cuenta" con Reintentar.
 *  - ninguna de las dos con nivel legible: alla va el candado; aqui una
 *    linea neutra sin promesa (MI PROGRAMA no vende).
 */
export function caraSinEvaluacion(n: NivelParaPrograma): CaraSinEvaluacion {
  if (n.nivelCargando) return 'cargando';
  if (n.esElite || n.tieneEvaluacionElite) return 'en_preparacion';
  if (n.nivelNoSePudoLeer) return 'cuenta_no_leida';
  return 'neutral';
}

/** Vencido el tope solo cae a error lo que seguia cargando; lo demas se queda. */
export function estadoAlVencer(prev: EstadoMiPrograma): EstadoMiPrograma {
  return prev.estado === 'cargando' ? { estado: 'error', motivo: 'tope' } : prev;
}

// ---------------------------------------------------------------------------
// 6. Las palabras de cada pantalla segun el documento (8-oct-2026, nivel 2)
// ---------------------------------------------------------------------------

/**
 * La ceja neutra. Va mientras no se sabe de que nivel es el documento
 * (leyendo, sin documento, no se pudo leer): la de Elite no se le pinta a
 * quien quiza no la tiene, ni medio segundo.
 */
export const CEJA_NEUTRA = 'ATP';

/**
 * La ceja de MI PROGRAMA (arriba de "MI PROGRAMA"). Elite: "ATP ELITE", como
 * siempre. Programa con nombre: el nombre. Programa sin nombre: la neutra
 * ("TU PROGRAMA" encima de "MI PROGRAMA" diria lo mismo dos veces).
 * Revision en frio: sin documento leido decide el nivel (vozMientras): nivel
 * Elite, "ATP ELITE" desde el primer cuadro; cualquier otro, la neutra.
 */
export function cejaMiPrograma(estado: EstadoMiPrograma, tier?: string | null): string {
  if (estado.estado !== 'ok') return vozMientras({ documento: null, tier })?.marca ?? CEJA_NEUTRA;
  const voz = vozDeDocumento(estado.evaluacion);
  if (voz.tipo === 'programa' && !voz.nombre) return CEJA_NEUTRA;
  return voz.marca;
}

/** "tu programa" a "mi programa". */
function enPrimera(documento: string): string {
  return documento.replace(/^tu /, 'mi ');
}

/** El adjetivo con el genero del documento: "completa" (evaluacion) o "completo" (programa). */
function completo(voz: Pick<VozPrograma, 'documento'>): string {
  return voz.documento === 'tu programa' ? 'completo' : 'completa';
}

/** "TU EVALUACIÓN CON ENRIQUE" (Elite, la de siempre) o "TU PROGRAMA CON ENRIQUE". */
export function etiquetaDocumentoConCoach(voz: Pick<VozPrograma, 'documento'>): string {
  return `${voz.documento} con ${NOMBRE_COACH_ELITE}`.toUpperCase();
}

/** Lo que dice el resumen cuando no hay edades: "Tu evaluación está lista" o "Tu programa está listo". */
export function documentoListo(voz: Pick<VozPrograma, 'documento'>): string {
  return voz.documento === 'tu programa' ? 'Tu programa está listo' : 'Tu evaluación está lista';
}

/** La fila que abre el documento completo desde MI PROGRAMA. */
export function filaDocumentoCompleto(voz: Pick<VozPrograma, 'documento'>): { titulo: string; detalle: string } {
  return { titulo: `Ver ${voz.documento} ${completo(voz)}`, detalle: 'Todas las secciones y tu PDF' };
}

/**
 * Las secciones que pinta la pantalla del documento (chips y bloques). En
 * Elite, las quince de siempre (las vacias dicen su aviso, como antes). En
 * un programa, solo las que traen algo: una seccion vacia, o su aviso
 * ("segunda entrega", "sin test"), le habla de algo que no se hizo.
 */
export function seccionesVisiblesEvaluacion(e: EliteV3): SeccionUiKey[] {
  const todas = SECCIONES_UI.map((x) => x.key as SeccionUiKey);
  if (!esPrograma(e)) return todas;
  return todas.filter((k) => seccionTieneContenido(e, k));
}

/**
 * La firma de la cabecera del documento. Elite: "Interpretada por X · toma:
 * fecha", como siempre. Programa: sin toma si no la hubo, y "Preparado por"
 * si no trae evaluacion.
 */
export function lineaFirmaEvaluacion(e: EliteV3): string {
  const quien = e.interpretado_por.evaluacion;
  if (!esPrograma(e)) return `Interpretada por ${quien} · toma: ${formatearFecha(e.cliente.fecha_toma)}`;
  const verbo = conMayuscula(verboFirma(vozDeDocumento(e)));
  return hayTexto(e.cliente.fecha_toma)
    ? `${verbo} ${quien} · toma: ${formatearFecha(e.cliente.fecha_toma)}`
    : `${verbo} ${quien}`;
}

/** El titulo de la cabecera del documento cuando no trae `lead`. Elite: "Tu evaluación Elite", como siempre. */
export function tituloSinLead(voz: VozPrograma): string {
  return voz.tipo === 'programa' && voz.nombre ? voz.nombre : conMayuscula(voz.documentoConMarca);
}

/** Titulo de la pantalla cuando no hay documento ni nivel Elite: la de un programa ("Mi programa completo"). */
export const TITULO_DOCUMENTO_NEUTRO = vozDe({ tipo: 'programa' }).tituloPantalla;

/**
 * El titulo de la pantalla del documento. Con documento, el de su voz. Con
 * el candado (cuenta sin documento ni nivel Elite), el de siempre: ahi se
 * esta vendiendo Elite. Leyendo, sin poder leer o "en preparacion": decide
 * el nivel (vozParaTextos). Nivel Elite, "Mi evaluación Elite" como siempre;
 * otro, el de un programa, sin la marca.
 */
export function tituloPantallaEvaluacion(evaluacion: EliteV3 | null, candado: boolean, tier?: string | null): string {
  if (evaluacion) return vozDeDocumento(evaluacion).tituloPantalla;
  return candado ? VOZ_ELITE.tituloPantalla : vozParaTextos({ documento: null, tier }).tituloPantalla;
}

export interface TextosNoSePudoLeer {
  /** La ceja de la tarjeta: "TU EVALUACIÓN CON ENRIQUE" o "TU PROGRAMA CON ENRIQUE". */
  etiqueta: string;
  /** "No pudimos leer tu evaluación". */
  titulo: string;
  /** "No se pudo leer tu evaluación" (la pantalla del documento). */
  tituloImpersonal: string;
  /** "Tu evaluación sigue guardada." */
  sigueGuardado: string;
  /** La fila existe y esta version de la app no la entiende. */
  formato: string;
  /** "Cargando tu evaluación…" */
  cargando: string;
}

/**
 * 8-oct-2026 (nivel 2, revision en frio): las frases de "no se pudo leer" y
 * "cargando", con el genero del documento. La voz llega de vozParaTextos:
 * con documento leido o nivel Elite, "tu evaluación" (el texto de siempre);
 * si no, "tu programa".
 */
export function textosNoSePudoLeer(voz: Pick<VozPrograma, 'documento'>): TextosNoSePudoLeer {
  const prog = voz.documento === 'tu programa';
  const Doc = conMayuscula(voz.documento);
  return {
    etiqueta: etiquetaDocumentoConCoach(voz),
    titulo: `No pudimos leer ${voz.documento}`,
    tituloImpersonal: `No se pudo leer ${voz.documento}`,
    sigueGuardado: `${Doc} sigue ${prog ? 'guardado' : 'guardada'}.`,
    formato: `${Doc} está ${prog ? 'guardado' : 'guardada'}, pero esta versión de la app no ${prog ? 'lo' : 'la'} entiende. Actualiza la app y vuelve a intentar.`,
    cargando: `Cargando ${voz.documento}…`,
  };
}

/** El enlace "Comparar mis laboratorios" de una version anterior: en un programa, solo si trae marcadores. */
export function ofrecerCompararLaboratorios(e: EliteV3): boolean {
  return !esPrograma(e) || seccionTieneContenido(e, 'marcadores');
}

export interface CaraGenetica {
  titulo: string;
  texto: string;
  cta: string;
}

/**
 * Genetica sin hallazgos. A Elite se le dice lo de siempre: llega en la
 * segunda entrega (es parte de su producto). A un programa no se le promete
 * una entrega que no compro: se le dice, sin vender, que su programa no la
 * incluye y donde esta lo que si tiene.
 */
export function caraGeneticaSinHallazgos(voz: VozPrograma, version: number): CaraGenetica {
  if (voz.tipo !== 'programa') {
    return {
      titulo: 'Tu genética se integra en la segunda entrega (semana 8)',
      texto: `Tu evaluación versión ${version} ya está en la app. Cuando llegue la interpretación genética, aquí la ves por tema, con qué hacer en cada caso.`,
      cta: 'Ver mi evaluación Elite',
    };
  }
  return {
    titulo: `${conMayuscula(voz.documento)} no incluye estudio genético`,
    texto: `Lo que ${NOMBRE_COACH_ELITE} preparó para ti está en ${voz.documento}.`,
    cta: `Ver ${enPrimera(voz.documento)}`,
  };
}

/** El enlace al pie de Genetica con hallazgos. Elite: el de siempre. */
export function enlaceDocumentoCompleto(voz: VozPrograma): string {
  if (voz.tipo !== 'programa') return 'Ver mi evaluación Elite completa';
  return `Ver ${enPrimera(voz.documento)} ${completo(voz)}`;
}

/**
 * La voz que se puede sacar de una fila de functional_dx (el mapa funcional
 * la lee cruda). null si la fila no es un documento. Si el documento no pasa
 * el validador, al menos el tipo y el nombre: con eso ya no se le dice Elite
 * a un programa.
 */
export function vozDeSnapshot(snapshot: unknown): VozPrograma | null {
  if (!esEliteV3(snapshot)) return null;
  const crudo = (snapshot as { elite_v3: unknown }).elite_v3;
  const r = validarEliteV3(crudo);
  if (r.ok) return vozDeDocumento(r.valor);
  const doc = crudo as { tipo?: unknown; inicio?: { programa_nombre?: unknown } };
  const nombre = typeof doc.inicio?.programa_nombre === 'string' ? doc.inicio.programa_nombre : null;
  return vozDe({ tipo: tipoDeDocumento(doc), nombre });
}

/** La frase del mapa funcional cuando su version vigente es el documento. Elite: la de siempre. */
export function resumenVigenteDocumento(voz: VozPrograma): string {
  if (voz.tipo !== 'programa') {
    return 'Tu versión vigente es tu evaluación Elite, interpretada por Enrique. Ábrela abajo para verla completa.';
  }
  return voz.conDiagnostico
    ? `Tu versión vigente es tu evaluación, interpretada por ${NOMBRE_COACH_ELITE}. Ábrela abajo para verla completa.`
    : `Tu versión vigente es tu programa, preparado por ${NOMBRE_COACH_ELITE}. Ábrelo abajo para verlo completo.`;
}

export interface PuertaDocumento {
  titulo: string;
  detalle: string;
  accesibilidad: string;
}

/**
 * La puerta al documento desde el mapa funcional. Elite: la de siempre.
 * Programa: su titulo, sin marca. Sin saber todavia (null: no se pudo leer),
 * una neutra.
 */
export function puertaDocumento(voz: VozPrograma | null): PuertaDocumento {
  if (voz && voz.tipo !== 'programa') {
    return {
      titulo: 'Mi evaluación Elite',
      detalle: 'Tu evaluación interpretada por Enrique: secciones, marcadores, cruces y tus tres palancas',
      accesibilidad: 'Abrir Mi evaluación Elite',
    };
  }
  const titulo = voz ? voz.tituloPantalla : TITULO_DOCUMENTO_NEUTRO;
  const detalle = voz && voz.conDiagnostico
    ? `Tu evaluación y tu plan con ${NOMBRE_COACH_ELITE}, sección por sección`
    : `Lo que ${NOMBRE_COACH_ELITE} preparó para ti, sección por sección`;
  return { titulo, detalle, accesibilidad: `Abrir ${titulo}` };
}

export interface CopyPlanSuplementos {
  /** La linea de la tarjeta "TU PLAN DE ENRIQUE": de donde sale el plan. */
  origen: string;
  /** El enlace al porque. null: no hay documento al que llevar (caeria en un candado). */
  enlace: string | null;
  /** La linea del pie legal. */
  pie: string;
  /** El aviso de solo lectura cuando la membresia vencio. */
  soloLectura: string;
}

/**
 * Las palabras del plan del coach en Suplementos. `lectura` es la del
 * documento vigente (null mientras se lee).
 *  - Documento Elite: el texto de siempre.
 *  - Programa: "tu evaluación" solo si la trae; si no, "tu programa". Nunca
 *    "plan Elite".
 *  - Sin documento (fichas que el coach cargo sin documento), leyendo o sin
 *    poder leer: sin mencionar evaluacion y sin el enlace, que llevaria a un
 *    candado o a una pantalla vacia.
 */
export function copyPlanSuplementos(lectura: LecturaParaPrograma | null, tier?: string | null): CopyPlanSuplementos {
  const c = NOMBRE_COACH_ELITE;
  const registro = 'Aquí registras tus tomas; si algo no te va, díselo y él lo ajusta.';
  const soloLecturaNeutra = 'Tu plan se conserva: lo sigues viendo y registrando tus tomas.';
  // Revision en frio: sin documento leido decide el nivel; nivel Elite lee el
  // texto de siempre (vozMientras da VOZ_ELITE), cualquier otro el neutro.
  const voz = vozMientras({ documento: lectura, tier });
  if (!voz) {
    return {
      origen: `Lo armó ${c} para ti. ${registro}`,
      enlace: null,
      pie: `Este plan lo asignó ${c} y lo ajusta él. Lo que registras aquí es tuyo.`,
      soloLectura: soloLecturaNeutra,
    };
  }
  const desde = voz.documento === 'tu programa' ? 'para tu programa' : 'a partir de tu evaluación';
  return {
    origen: `Lo armó ${c} ${desde}. ${registro}`,
    enlace: `Ver el porqué en ${enPrimera(voz.documento)}`,
    pie: `Este plan lo asignó ${c} ${desde} y lo ajusta él. Lo que registras aquí es tuyo.`,
    soloLectura: voz.tipo === 'programa' ? soloLecturaNeutra : 'Tu plan Elite se conserva: lo sigues viendo y registrando tus tomas.',
  };
}

/**
 * El asunto del correo de "Escríbele a Enrique" (con WhatsApp sin numero, el
 * boton abre el correo y el cliente lee el asunto). Con documento, el de su
 * voz: Elite "Mi programa ATP Elite", como siempre; programa "Mi programa
 * ATP". Leyendo, sin documento o sin poder leer decide el nivel (revision
 * en frio): nivel Elite, el de siempre; otro, "Mi programa ATP", sin la marca
 * que no le toca.
 */
export function asuntoCorreoCoach(lectura: LecturaParaPrograma | null, tier?: string | null): string {
  return vozParaTextos({ documento: lectura, tier }).asuntoCorreo;
}

/** Que se pinta de una fila de marcador en la pantalla del documento. */
export interface ColumnasMarcador {
  valor: boolean;
  rango: boolean;
  objetivo: boolean;
  /** El simbolo y la frase del estado (▲ Pide acción...). */
  estado: boolean;
}

function hayRango(r: EliteRango | null): boolean {
  return r !== null && (r.min !== null || r.max !== null);
}

/**
 * 8-oct-2026 (nivel 2, revision en frio): en Elite la fila de siempre, con la
 * raya donde no hay dato. En un programa no se pinta una columna sin dato:
 * una medida de bascula sin rango es lo normal y "Rango del laboratorio —" o
 * "— Sin valor" se leen como algo que falto.
 */
export function columnasMarcador(
  m: Pick<EliteMarcador, 'valor' | 'rango_lab' | 'objetivo' | 'estado'>,
  programa: boolean,
): ColumnasMarcador {
  if (!programa) return { valor: true, rango: true, objetivo: true, estado: true };
  return { valor: m.valor !== null, rango: hayRango(m.rango_lab), objetivo: hayRango(m.objetivo), estado: m.estado !== null };
}

/** Lo mismo para el estado de un sistema: en un programa, sin estado no hay simbolo ni "Sin valor". */
export function mostrarEstado(estado: EliteEstado | null, programa: boolean): boolean {
  return !programa || estado !== null;
}

/**
 * 8-oct-2026 (nivel 2, revision en frio): la migracion 329 no deja que el
 * cliente cambie nombre, dosis, momento ni horario de una ficha que fijo el
 * coach (SQLSTATE 42501, mensaje con `ficha_del_coach_solo_lectura`). Ese
 * rechazo no es "No se pudo guardar, intenta de nuevo": reintentar nunca va a
 * funcionar. Se reconoce aqui y Suplementos dice por que y que si puede hacer.
 */
export function esFichaDelCoachSoloLectura(error: { message?: unknown } | null | undefined): boolean {
  return !!error && typeof error.message === 'string' && error.message.includes('ficha_del_coach_solo_lectura');
}

export const AVISO_FICHA_DEL_COACH = {
  titulo: `Lo fijó ${NOMBRE_COACH_ELITE}`,
  texto: `Esta ficha es parte del plan que te asignó ${NOMBRE_COACH_ELITE}: el nombre, la dosis y el horario los ajusta él. Puedes pausarla o escribirle si algo no te va.`,
} as const;
