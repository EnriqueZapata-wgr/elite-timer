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
 */
import type { EliteV3 } from './elite-v3-core';
import { formatearFecha, type SeccionUiKey } from './evaluacion-elite-core';
import { BLOQUES_PROGRAMA, etiquetaSeccion, type BloqueProgramaKey } from './programa-elite-core';
import { detallePuertas, edadesDeEvaluacion, marcadoresDeEvaluacion } from '@/src/services/hoy/elite-hoy-core';
import type { EdadHero } from '@/src/services/hoy/hero-laboratorios-core';

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
    case 'inicio':
      return [e.inicio.edad_cronologica, e.inicio.edad_atp, e.inicio.diferencia_anios, e.inicio.programa_semanas]
        .some(hayNumero);
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
      return n > 0 ? plural(n, 'pendiente de medir', 'pendientes de medir') : 'En tu evaluación';
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
 */
export function bloquesMiPrograma(e: EliteV3): BloqueMiPrograma[] {
  return BLOQUES_PROGRAMA
    .map((b) => ({
      key: b.key,
      titulo: b.titulo,
      filas: b.secciones
        .filter((sec) => b.key !== 'evaluacion'
          || (!CUBIERTAS_POR_RESUMEN.includes(sec) && seccionTieneContenido(e, sec)))
        .map((sec) => ({ seccion: sec, titulo: etiquetaSeccion(sec), detalle: detalleSeccion(e, sec) })),
    }))
    .filter((b) => b.filas.length > 0);
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

/** "Versión 2 · toma de mayo 2026 · interpretada por Enrique Zapata". Sin fecha, sin ese tramo. */
export function lineaVersion(e: EliteV3): string {
  const partes = [`Versión ${e.version}`];
  if (hayTexto(e.cliente.fecha_toma)) partes.push(`toma de ${formatearFecha(e.cliente.fecha_toma)}`);
  if (hayTexto(e.interpretado_por.evaluacion)) partes.push(`interpretada por ${e.interpretado_por.evaluacion}`);
  return partes.join(' · ');
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
