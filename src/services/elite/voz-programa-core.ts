/**
 * voz-programa-core (8-oct-2026, nivel 2). Logica PURA: cero React, cero
 * supabase, cero imagenes. Se verifica con
 * `node scripts/run-tests-sin-vitest.js src/services/elite/__tests__/voz-programa-core.test.ts`.
 *
 * Por que existe: el nivel 2 es el mismo documento `elite_v3` con
 * `tipo: 'programa'`, y el cliente de un programa ve la misma app que el de
 * Elite. Lo unico que cambia son las PALABRAS: nunca lee "Elite" y, si su
 * documento no trae evaluacion, tampoco se le habla de "tu evaluacion". Si
 * cada pantalla decidiera sus palabras por su cuenta, tarde o temprano una
 * se quedaria con la marca del otro nivel. Aqui se decide una sola vez.
 *
 * Regla que amarran las pruebas: ningun texto de la voz de un programa
 * contiene "Elite", y la voz de Elite es letra por letra la que ya estaba en
 * pantalla antes de esta fecha.
 */
import {
  ELITE_PROGRAMA_NOMBRE_MAX,
  tieneDiagnostico,
  tipoDeDocumento,
  type EliteTipo,
  type EliteV3,
} from './elite-v3-core';

export interface VozPrograma {
  tipo: EliteTipo;
  /** Nombre del programa ya limpio (una linea, con tope), o null si no hay. */
  nombre: string | null;
  /** El documento trae algo de evaluacion que leer (ver tieneDiagnostico). */
  conDiagnostico: boolean;
  /** Como se nombra el documento a media frase: "tu evaluación" o "tu programa". */
  documento: string;
  /** Igual, con la marca cuando la lleva: "tu evaluación Elite". En un programa es igual a `documento`. */
  documentoConMarca: string;
  /** Titulo de la pantalla del documento completo. */
  tituloPantalla: string;
  /** La ceja (el rotulo chico en mayusculas arriba del titulo). */
  marca: string;
  /** Asunto del correo cuando "Escríbele a tu coach" cae en correo. */
  asuntoCorreo: string;
  /** Titulo del PDF (su <title> y su encabezado). */
  tituloPdf: string;
  /** Base del nombre del archivo PDF, sin version ni extension. Ver archivoPdf. */
  nombrePdf: string;
  /** Primera linea del bloque que se le pasa a ARGOS. No lo lee el cliente. */
  encabezadoArgos: string;
}

/**
 * El mismo texto que `ENCABEZADO_EVALUACION_ELITE` (argos-elite-contexto-core).
 * Se repite aqui en vez de importarlo para que este modulo no dependa de los
 * de ARGOS; una prueba amarra que los dos sigan iguales.
 */
const ENCABEZADO_ARGOS_ELITE =
  'Evaluación Elite del usuario (interpretada por su equipo ATP; usa esto como fuente principal para suplementos, alimentación y prioridades; no es un diagnóstico):';

const ENCABEZADO_ARGOS_PROGRAMA =
  'Programa del usuario con su coach de ATP (trae una evaluación ligera; usa esto como fuente principal para suplementos, alimentación, entrenamiento, prácticas y prioridades; lo que aquí no aparece no se midió, y nada de esto es una conclusión médica):';

/** Una linea, sin espacios dobles, con el mismo tope que pone el validador. */
function limpiarNombre(nombre: string | null | undefined): string | null {
  if (typeof nombre !== 'string') return null;
  const limpio = nombre.replace(/\s+/g, ' ').trim().slice(0, ELITE_PROGRAMA_NOMBRE_MAX).trim();
  return limpio.length > 0 ? limpio : null;
}

/** Primera letra en mayuscula ("tu programa" a "Tu programa"). Para abrir frase. */
export function conMayuscula(texto: string): string {
  return texto.length ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

/**
 * Las palabras de la pantalla segun el documento.
 *
 *  - `tipo`: el de `tipoDeDocumento(doc)`. null o indefinido = 'elite' (es lo
 *    que ve una pantalla que todavia esta leyendo).
 *  - `nombre`: `inicio.programa_nombre`. En Elite NO cambia titulos ni ceja
 *    (las pantallas Elite se quedan como estaban); solo viaja en `nombre`.
 *    En un programa, un nombre que diga "Elite" se descarta: el validador ya
 *    lo rechaza, pero un documento cargado por otra via no debe colarlo.
 *  - `conDiagnostico`: `tieneDiagnostico(doc)`. Si no se sabe: en Elite true
 *    (siempre trae evaluacion); en un programa false, porque "tu programa"
 *    nunca es falso para ese cliente y "tu evaluación" si puede serlo.
 */
export function vozDe(args: {
  tipo: EliteTipo | null | undefined;
  nombre?: string | null;
  conDiagnostico?: boolean;
}): VozPrograma {
  if (args.tipo !== 'programa') {
    return {
      tipo: 'elite',
      nombre: limpiarNombre(args.nombre),
      conDiagnostico: args.conDiagnostico !== false,
      documento: 'tu evaluación',
      documentoConMarca: 'tu evaluación Elite',
      tituloPantalla: 'Mi evaluación Elite',
      marca: 'ATP ELITE',
      asuntoCorreo: 'Mi programa ATP Elite',
      tituloPdf: 'Mi evaluación Elite',
      nombrePdf: 'Evaluacion-Elite',
      encabezadoArgos: ENCABEZADO_ARGOS_ELITE,
    };
  }
  const crudo = limpiarNombre(args.nombre);
  const nombre = crudo !== null && !/elite/i.test(crudo) ? crudo : null;
  const conDiagnostico = args.conDiagnostico === true;
  const documento = conDiagnostico ? 'tu evaluación' : 'tu programa';
  return {
    tipo: 'programa',
    nombre,
    conDiagnostico,
    documento,
    documentoConMarca: documento,
    tituloPantalla: nombre ?? 'Mi programa completo',
    marca: nombre ? nombre.toUpperCase() : 'TU PROGRAMA',
    asuntoCorreo: 'Mi programa ATP',
    tituloPdf: nombre ?? 'Mi programa',
    nombrePdf: 'Mi-programa',
    encabezadoArgos: ENCABEZADO_ARGOS_PROGRAMA,
  };
}

/** Lo que una pantalla usa mientras todavia no sabe de que tipo es el documento. */
export const VOZ_ELITE: VozPrograma = vozDe({ tipo: 'elite', nombre: null, conDiagnostico: true });

/**
 * 8-oct-2026 (nivel 2, revision en frio): lo minimo de la lectura del
 * documento vigente (leerEvaluacionEliteVigente) que la voz necesita.
 */
export type LecturaDocumentoVoz =
  | { ok: true; evaluacion: EliteV3 | null }
  | { ok: false };

/** La voz de un programa sin documento leido: "tu programa", marca neutra, asunto sin Elite. */
export const VOZ_PROGRAMA_NEUTRA: VozPrograma = vozDe({ tipo: 'programa' });

/**
 * 8-oct-2026 (nivel 2, revision en frio): la voz de la CUENTA, haya o no
 * documento leido. Un documento leido siempre manda. Sin el (leyendo, sin
 * documento todavia, o no se pudo leer) decide el nivel: los clientes Elite
 * se activan con codigo `elite` y los de programa con `premium`
 * (CARGAR_PROGRAMA.md), asi que `tier === 'elite'` es la voz Elite de siempre
 * y cualquier otro nivel (o el nivel sin leer) no tiene voz: null, y quien
 * pinta usa su palabra neutra. Asi un cliente Elite no ve "ATP" y luego "ATP
 * ELITE" en cada arranque, y uno de programa nunca ve la marca.
 */
export function vozMientras(args: {
  documento: LecturaDocumentoVoz | null | undefined;
  tier: string | null | undefined;
}): VozPrograma | null {
  const d = args.documento;
  if (d && d.ok && d.evaluacion) return vozDeDocumento(d.evaluacion);
  return args.tier === 'elite' ? VOZ_ELITE : null;
}

/** Igual que vozMientras, pero sin voz cae en la de un programa: para los textos que necesitan nombrar el documento. */
export function vozParaTextos(args: {
  documento: LecturaDocumentoVoz | null | undefined;
  tier: string | null | undefined;
}): VozPrograma {
  return vozMientras(args) ?? VOZ_PROGRAMA_NEUTRA;
}

/**
 * La voz de un documento ya validado. Sin documento (cargando, o no se pudo
 * leer) devuelve VOZ_ELITE: es lo que la pantalla ya decia antes del nivel 2.
 */
export function vozDeDocumento(doc: EliteV3 | null | undefined): VozPrograma {
  if (!doc) return VOZ_ELITE;
  return vozDe({
    tipo: tipoDeDocumento(doc),
    nombre: doc.inicio.programa_nombre ?? null,
    conDiagnostico: tieneDiagnostico(doc),
  });
}

/** "Evaluacion-Elite-v2.pdf" o "Mi-programa-v2.pdf". */
export function archivoPdf(voz: Pick<VozPrograma, 'nombrePdf'>, version: number): string {
  return `${voz.nombrePdf}-v${version}.pdf`;
}

const RE_PLAN_ELITE = /^Plan Elite v(\d+)$/;

/**
 * El plan de alimentacion se guarda en la base como "Plan Elite vN" (lo
 * escribe la carga, migracion 324) tambien para un cliente de programa.
 * Renombrarlo en la base quedo fuera de este bloque; se resuelve aqui: a un
 * cliente de programa se le muestra "Plan de alimentación · vN". Cualquier
 * otro nombre (uno que el cliente o el coach escribio) se muestra tal cual, y
 * en Elite no cambia nada.
 */
export function nombreVisibleDelPlan(nombreEnBase: string, voz: Pick<VozPrograma, 'tipo'>): string;
export function nombreVisibleDelPlan(nombreEnBase: string | null | undefined, voz: Pick<VozPrograma, 'tipo'>): string | null;
export function nombreVisibleDelPlan(nombreEnBase: string | null | undefined, voz: Pick<VozPrograma, 'tipo'>): string | null {
  if (typeof nombreEnBase !== 'string') return null;
  if (voz.tipo !== 'programa') return nombreEnBase;
  const m = RE_PLAN_ELITE.exec(nombreEnBase.trim());
  return m ? `Plan de alimentación · v${m[1]}` : nombreEnBase;
}
