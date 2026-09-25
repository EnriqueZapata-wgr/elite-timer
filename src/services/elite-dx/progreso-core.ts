/**
 * progreso-core: la lógica pura de las salas PROGRESO y TÚ de la app Elite DX
 * (25-sep-2026, APP_ELITE_DX).
 *
 * Cero imports de red o React: corre en node para sus tests. La cuenta de la
 * constancia NO vive aquí: vive en consola-core (`adherenciaIntervenciones`)
 * y aquí solo se importa, porque la regla de la casa es que el número que ve
 * el cliente sea el mismo que ve Enrique en su consola. Si mañana cambia la
 * fórmula, cambia para los dos a la vez.
 */
import {
  VENTANA_ADHERENCIA_DIAS,
  senalDeVida,
  type Adherencia,
  type FuenteSenal,
  type MotivoSinAdherencia,
} from '../consola/consola-core';

// ─────────────────────────────────────────────────────────────────────────────
// Constancia
// ─────────────────────────────────────────────────────────────────────────────

/** Lo que devuelve el servicio. 'error' nunca se pinta como cero ni como vacío. */
export type LecturaConstancia =
  | { estado: 'ok'; adherencia: Adherencia }
  | { estado: 'error' };

/**
 * 25-sep-2026 (APP_ELITE_DX): los motivos de "no hay número" en la voz del
 * CLIENTE. Los de TEXTO_SIN_ADHERENCIA (consola-core) le hablan a Enrique de
 * un tercero ("Lo que le cargaste..."); aquí la persona lee de sí misma.
 * La clave es la misma: el motivo lo decide la misma función para los dos.
 */
export const TEXTO_CONSTANCIA_CLIENTE: Readonly<Record<MotivoSinAdherencia, string>> = {
  'sin-intervenciones': 'Tu plan todavía no tiene prácticas activas.',
  'recien-cargado': 'Tu plan empieza hoy. Mañana ya verás tu constancia.',
  'sin-senal': 'Todavía no registras tus prácticas. Palomea en Hoy y aquí verás tu constancia.',
};

export type VistaConstancia =
  | { tipo: 'numero'; cifra: string; detalle: string }
  | { tipo: 'motivo'; texto: string };

/**
 * Cómo se lee la constancia en PROGRESO. Con número: "X% · N de M", la
 * fracción siempre visible (un porcentaje sin su base engaña con 1 de 1).
 * Sin número: el motivo en la voz del cliente. Nunca un 0% de relleno: eso ya
 * lo garantiza `adherenciaIntervenciones`, que devuelve motivo cuando no sabe.
 */
export function vistaConstancia(a: Adherencia, ventanaDias: number = VENTANA_ADHERENCIA_DIAS): VistaConstancia {
  if (a.estado === 'sinDato') return { tipo: 'motivo', texto: TEXTO_CONSTANCIA_CLIENTE[a.motivo] };
  return {
    tipo: 'numero',
    cifra: `${a.pct}% · ${a.hechos} de ${a.esperados}`,
    detalle: `Prácticas palomeadas de las que tocaban en los últimos ${ventanaDias} días.`,
  };
}

/**
 * ¿Hubo señal dentro de la ventana? Es EXACTAMENTE la regla de la consola
 * (consola-service, cargarClientes): la señal más reciente entre todas las
 * fuentes, y que caiga en o después de `desde`. Se reutiliza `senalDeVida`
 * para que el cliente y Enrique no puedan divergir por una comparación
 * escrita dos veces.
 */
export function huboSenalEnVentana(fuentes: readonly FuenteSenal[], hoy: string, desde: string): boolean {
  const senal = senalDeVida(fuentes, hoy);
  return senal.estado === 'ok' && senal.fecha >= desde;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cuerpo
// ─────────────────────────────────────────────────────────────────────────────

/** Una fila de health_measurements, solo con lo que PROGRESO pinta. */
export interface FilaMedida {
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  body_fat_pct: number | null;
}

export type MetricaCuerpoKey = 'peso' | 'cintura' | 'grasa';

export interface MetricaCuerpo {
  key: MetricaCuerpoKey;
  etiqueta: string;
  /** "82.4 kg". */
  valor: string;
  /** Fecha 'YYYY-MM-DD' de la medida más reciente. */
  fecha: string;
  /**
   * Cambio contra el registro MÁS VIEJO de esa misma métrica, ya escrito:
   * "-1.2 kg desde el 3 ago". null si solo hay un registro de esa métrica:
   * un "0" ahí sería un cambio inventado.
   */
  cambio: string | null;
}

const METRICAS: readonly { key: MetricaCuerpoKey; campo: keyof Omit<FilaMedida, 'date'>; etiqueta: string; unidad: string }[] = [
  { key: 'peso', campo: 'weight_kg', etiqueta: 'Peso', unidad: 'kg' },
  { key: 'cintura', campo: 'waist_cm', etiqueta: 'Cintura', unidad: 'cm' },
  { key: 'grasa', campo: 'body_fat_pct', etiqueta: 'Grasa corporal', unidad: '%' },
];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'YYYY-MM-DD' → "3 ago", o "3 ago 2025" si no es del año de `hoy`. */
export function fechaCorta(fecha: string, hoy: string): string {
  const mes = MESES[Number(fecha.slice(5, 7)) - 1] ?? fecha.slice(5, 7);
  const dia = String(Number(fecha.slice(8, 10)));
  return fecha.slice(0, 4) === hoy.slice(0, 4) ? `${dia} ${mes}` : `${dia} ${mes} ${fecha.slice(0, 4)}`;
}

/** Un decimal como mucho y sin ".0" colgando: 82.40 → "82.4", 91.0 → "91". */
function numero(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function conUnidad(n: string, unidad: string): string {
  return unidad === '%' ? `${n}%` : `${n} ${unidad}`;
}

function valido(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/**
 * Las medidas de PROGRESO a partir del historial, en el orden que llegue.
 *
 * Por métrica, no por fila: la última fila puede traer solo presión y la
 * cintura vivir tres registros atrás. Se busca la más reciente y la más vieja
 * QUE TENGAN ESA MÉTRICA. Cambio solo si son dos fechas distintas. Un cambio
 * real de cero (dos registros iguales) se dice "sin cambio": ese sí es dato.
 * Un valor 0 o negativo en la base no es una medida, es un campo mal llenado:
 * no entra.
 */
export function resumenCuerpo(filas: readonly FilaMedida[], hoy: string): MetricaCuerpo[] {
  const out: MetricaCuerpo[] = [];
  for (const m of METRICAS) {
    let ultima: { fecha: string; v: number } | null = null;
    let primera: { fecha: string; v: number } | null = null;
    for (const f of filas) {
      const v = f[m.campo];
      if (!valido(v) || typeof f.date !== 'string' || f.date.length < 10) continue;
      const fecha = f.date.slice(0, 10);
      if (!ultima || fecha > ultima.fecha) ultima = { fecha, v };
      if (!primera || fecha < primera.fecha) primera = { fecha, v };
    }
    if (!ultima) continue;
    let cambio: string | null = null;
    if (primera && primera.fecha !== ultima.fecha) {
      const d = Math.round((ultima.v - primera.v) * 10) / 10;
      const desde = `desde el ${fechaCorta(primera.fecha, hoy)}`;
      // 25-sep-2026 (revisión en frío): la grasa corporal ya es un porcentaje,
      // así que su cambio va en PUNTOS: "+1.2%" se lee como cambio relativo
      // (1.2% de 18%), que no es lo que pasó.
      const magnitud = m.unidad === '%'
        ? `${numero(Math.abs(d))} ${Math.abs(d) === 1 ? 'punto' : 'puntos'}`
        : conUnidad(numero(Math.abs(d)), m.unidad);
      cambio = d === 0
        ? `Sin cambio ${desde}`
        : `${d > 0 ? '+' : '-'}${magnitud} ${desde}`;
    }
    out.push({ key: m.key, etiqueta: m.etiqueta, valor: conUnidad(numero(ultima.v), m.unidad), fecha: ultima.fecha, cambio });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// TÚ · la línea de "Tu servicio"
// ─────────────────────────────────────────────────────────────────────────────

export interface EntradaLineaServicio {
  /** useSubscription todavía leyendo. */
  cargando: boolean;
  /** useSubscription no pudo leer el nivel (nivelNoSePudoLeer). */
  ilegible: boolean;
  /** etiquetaMembresia(tier): "ATP Elite", "ATP completo", "Sin servicio activo". */
  etiqueta: string;
  /** ¿El nivel es de pago (premium o elite)? */
  pagado: boolean;
  /**
   * La fecha de vencimiento del grant vigente YA formateada como la formatea
   * "Tu servicio" (Ajustes), o null si no hay, no vence o no se pudo leer.
   */
  hastaTexto: string | null;
}

/**
 * La segunda línea de la fila "Tu servicio" en TÚ. null = no se dice nada y
 * la fila queda con su descripción fija: mientras carga o si el nivel no se
 * pudo leer, no se adivina un servicio (regla 7). La vigencia solo se agrega
 * si es de pago y hay fecha leída; "sin vencimiento" no se afirma desde aquí,
 * porque un grant ausente y uno sin fecha llegan igual desde el servicio.
 */
export function lineaServicio(e: EntradaLineaServicio): string | null {
  if (e.cargando || e.ilegible) return null;
  const etiqueta = e.etiqueta.trim();
  if (!etiqueta) return null;
  if (e.pagado && e.hastaTexto) return `${etiqueta} · hasta el ${e.hastaTexto}`;
  return etiqueta;
}

// ─────────────────────────────────────────────────────────────────────────────
// TÚ · HERRAMIENTAS
// ─────────────────────────────────────────────────────────────────────────────

/** Secciones del registro que entran completas a HERRAMIENTAS. */
export const SECCIONES_HERRAMIENTAS: readonly string[] = ['mente', 'cuerpo', 'diario'];

/**
 * 25-sep-2026 (APP_ELITE_DX): de la sección 'salud' del registro solo entran
 * las que son HERRAMIENTAS de medir o registrar algo del día: Ciclo, Glucosa,
 * Cetonas y Sol. Lo demás de 'salud' es expediente y no se repite aquí: hacerlo
 * devolvería la sensación de lanzador de 35 apps que se quiso quitar.
 * 'sistema' (Ajustes) no entra: tiene su fila en CUENTA.
 *
 * 25-sep-2026 (revisión en frío): dónde vive HOY cada una de las que quedan
 * fuera, sin prometer lo que todavía no existe:
 *  - Labs: PROGRESO › Laboratorios (/edad-atp/labs).
 *  - Reportes: PROGRESO › Reportes semanales (/reports).
 *  - Historia clínica, Síntomas, Tus datos y Ficha de emergencia: MI PROGRAMA
 *    › TU EXPEDIENTE.
 *  - Genética: MI PROGRAMA › TUS ESTUDIOS, cuando la evaluación trae hallazgos.
 *  - Edad ATP: el resumen de MI PROGRAMA (su evaluación con Enrique).
 *  - Mi mapa, Cronotipo, Condiciones, Cuestionario y Evaluaciones: sin puerta
 *    en las cinco salas nuevas. Siguen vivas como rutas y se llega por el
 *    Centro (/centro). Pendiente de decidir con Enrique, no resuelto aquí.
 */
export const HERRAMIENTAS_DE_SALUD: readonly string[] = ['ciclo', 'glucosa', 'cetonas', 'sol'];

/**
 * Qué apps del registro se enseñan en HERRAMIENTAS. Recibe la lista YA pasada
 * por `visibleApps` (el candado del ciclo y el de nivel ya se aplicaron allí);
 * aquí solo se escoge por sección, conservando el orden del registro.
 */
export function herramientasDeTu<T extends { key: string; section: string }>(apps: readonly T[]): T[] {
  return apps.filter((a) => SECCIONES_HERRAMIENTAS.includes(a.section)
    || (a.section === 'salud' && HERRAMIENTAS_DE_SALUD.includes(a.key)));
}
