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

/**
 * Secciones del registro que entran a HERRAMIENTAS, completas y en el orden
 * de la sala ATP (kit): mente, cuerpo, hábitos diarios y salud. 'sistema'
 * (Ajustes) no entra: tiene su fila en CUENTA.
 *
 * 26-sep-2026 (decisión de Enrique: Elite DX es "todo lo de ATP más su
 * programa", no pierde ninguna función): se REVIERTE el recorte del 25-sep.
 * Aquel día de 'salud' solo entraban Ciclo, Glucosa, Cetonas y Sol, con el
 * argumento de que lo demás era expediente y repetirlo devolvía la sensación
 * de lanzador de 35 apps. Ese argumento cae: dejaba sin puerta Mi mapa,
 * Cronotipo, Condiciones, Cuestionario y Evaluaciones. Ahora HERRAMIENTAS
 * enseña TODO lo que `visibleApps` le da a la persona, igual que la sala ATP
 * (paridad completa). Que una función tenga además fila en MI PROGRAMA o en
 * PROGRESO ya no es razón para quitarla de aquí.
 */
export const SECCIONES_HERRAMIENTAS: readonly string[] = ['mente', 'cuerpo', 'diario', 'salud'];

/**
 * Qué apps del registro se enseñan en HERRAMIENTAS. Recibe la lista YA pasada
 * por `visibleApps` (el candado del ciclo y el de nivel ya se aplicaron allí);
 * aquí solo se deja fuera 'sistema', conservando el orden del registro.
 */
export function herramientasDeTu<T extends { key: string; section: string }>(apps: readonly T[]): T[] {
  return apps.filter((a) => SECCIONES_HERRAMIENTAS.includes(a.section));
}

// ─────────────────────────────────────────────────────────────────────────────
// TÚ · TODAS TUS FUNCIONES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 26-sep-2026 (misma decisión: "todo lo de ATP más su programa"): las puertas
 * que en Elite DX se habían quedado sin entrada visible. Tres son salas de la
 * ATP completa que aquí salen del tab bar (ATP = /kit, SALUD = /salud,
 * TRIBU = /tribu, con href: null) y tres son pantallas de configuración a las
 * que solo se llegaba desde esas salas o desde HOY.
 *
 * Cada ruta es una pantalla real de app/ y ninguna es un <Redirect> (lo
 * verifica el test). Las tres salas se abren con el tab bar visible y sin
 * pestaña resaltada: la salida es tocar cualquier pestaña, TÚ incluida.
 */
export const RUTAS_TODAS_TUS_FUNCIONES = {
  sala: '/kit',
  centro: '/centro',
  armar: '/packs/armar',
  habitos: '/hoy-habitos',
  salud: '/salud',
  comunidad: '/tribu',
  // Revision en frio (26-sep): Mi Progreso de la economia (rango, electrones,
  // racha, logros) solo tenia entrada por la pildora, oculta para Elite desde
  // el 20-sep. La pildora sigue oculta; la funcion no se pierde.
  electrones: '/economy/admin',
} as const;

export type FuncionTuKey = keyof typeof RUTAS_TODAS_TUS_FUNCIONES;

export interface FilaFuncionTu {
  key: FuncionTuKey;
  titulo: string;
  /** Una línea: lo que la pantalla HACE (verificado en su código), sin promesas. */
  linea: string;
  ruta: (typeof RUTAS_TODAS_TUS_FUNCIONES)[FuncionTuKey];
}

/**
 * Las filas, en orden de uso. Las líneas describen lo que hay del otro lado:
 *  - Sala de apps (/kit): la cuadrícula lista lo INSTALADO, con buscador y
 *    tres órdenes; agregar más es su entrada al Centro, visible sin scroll.
 *  - Centro (/centro): cada función con su ficha para instalar, quitar y
 *    configurar.
 *  - Armar mi app (/packs/armar): "¿Qué quieres cambiar primero?" (el pack)
 *    y tu horario de despertar y dormir; al aplicar enciende los hábitos del
 *    pack por etapas.
 *  - Elegir mis hábitos (/hoy-habitos): qué hábitos cuentas en tu Hoy.
 *  - Salud funcional completa (/salud): el hub SaludHub (mapa funcional,
 *    evolución, expediente, datos).
 *  - Comunidad (/tribu): Ranking y Amigos.
 */
export const FILAS_TODAS_TUS_FUNCIONES: readonly FilaFuncionTu[] = [
  { key: 'sala', titulo: 'Sala de apps', linea: 'Tus apps: buscar, ordenar y agregar más', ruta: RUTAS_TODAS_TUS_FUNCIONES.sala },
  { key: 'centro', titulo: 'Centro de funciones', linea: 'Instala, quita y configura funciones', ruta: RUTAS_TODAS_TUS_FUNCIONES.centro },
  { key: 'armar', titulo: 'Armar mi app', linea: 'Elige un objetivo y tu horario, y aplica su pack', ruta: RUTAS_TODAS_TUS_FUNCIONES.armar },
  { key: 'habitos', titulo: 'Elegir mis hábitos', linea: 'Qué hábitos cuentas cada día en Hoy', ruta: RUTAS_TODAS_TUS_FUNCIONES.habitos },
  { key: 'salud', titulo: 'Salud funcional completa', linea: 'Tu mapa, tu evolución y tu expediente', ruta: RUTAS_TODAS_TUS_FUNCIONES.salud },
  { key: 'comunidad', titulo: 'Comunidad', linea: 'Tribu, ranking y amigos', ruta: RUTAS_TODAS_TUS_FUNCIONES.comunidad },
  { key: 'electrones', titulo: 'Tus electrones y logros', linea: 'Tu rango, tu racha y tus logros', ruta: RUTAS_TODAS_TUS_FUNCIONES.electrones },
];
