/**
 * Límites de Free (ATP 3.0, 5-sep-2026, ruta 1.11 y 2.9). Lógica PURA, sin
 * imports de RN ni Supabase, para que se pruebe en node.
 *
 * Matriz de gating (pivote 3.2):
 *  - Subir estudios: Free sube 1 (el primero); Pro y Elite, ilimitados.
 *  - Marcadores con ficha: Free ve 3 (los de mayor impacto según la matriz
 *    V7); Pro y Elite, todos.
 *  - Mapa funcional ATP: Elite, Pro anual y Founders. Pro mensual y Free, no.
 *
 * Regla 1 de la casa: los candados aplican a `free`. A quien pagó no se le
 * corta nada, y por eso cada función recibe el tier y contesta "sí" para
 * premium y elite sin mirar nada más (salvo el mapa funcional, que por
 * decisión del pivote distingue anual de mensual).
 *
 * 7-sep-2026 (VENTA_AL_PUBLICO): estos tres candados son de VENTA, así que la
 * bandera los gobierna. Cada función recibe el estado de la bandera como
 * último parámetro, con `VENTA_AL_PUBLICO` de default, para que el test siga
 * probando el CONTRATO (con la bandera encendida) y además el comportamiento
 * de hoy (apagada). La compuerta pregunta `=== true` para cerrar: cualquier
 * otro valor abre (fail-open, misma doctrina que el proxy).
 */
import type { Tier } from './tier-logic';
import { VENTA_AL_PUBLICO } from '@/src/constants/flags';

/**
 * ¿Se le cierra algo a esta persona por no haber pagado? La usan las pantallas
 * que hoy preguntan `tier === 'free'` a mano. Con la bandera apagada nunca, y
 * con `nivelNoSePudoLeer` tampoco (regla 1: no se degrada a nadie por no poder
 * leer su nivel).
 */
export function candadoDeVentaCierra(
  tier: Tier,
  nivelNoSePudoLeer = false,
  ventaAlPublico: boolean = VENTA_AL_PUBLICO,
): boolean {
  if (ventaAlPublico !== true) return false;
  if (nivelNoSePudoLeer) return false;
  return tier === 'free';
}

/** Estudios que Free puede subir en total. */
export const ESTUDIOS_FREE = 1;

/** Marcadores con ficha abiertos para Free. */
export const MARCADORES_FREE = 3;

/**
 * ¿Puede subir otro estudio? `estudiosPrevios` es cuántas filas de
 * `lab_uploads` ya tiene (sin contar las fallidas: una subida que murió no le
 * dio nada a la persona y no le gasta su único estudio).
 */
export function puedeSubirEstudio(
  tier: Tier,
  estudiosPrevios: number,
  ventaAlPublico: boolean = VENTA_AL_PUBLICO,
): boolean {
  if (ventaAlPublico !== true) return true;
  if (tier !== 'free') return true;
  return estudiosPrevios < ESTUDIOS_FREE;
}

/** Cuenta los estudios que sí cuentan: cualquier subida que no haya fallado. */
export function estudiosQueCuentan(uploads: ReadonlyArray<{ status?: string | null }>): number {
  return uploads.filter((u) => u.status !== 'failed').length;
}

export type EstadoMarcador = 'optimo' | 'aceptable' | 'atencion' | 'sin_banda';

export interface MarcadorParaImpacto {
  key: string;
  /** Peso del parámetro en la matriz V7 (0 si no está en la matriz). */
  peso: number;
  /** Dónde cayó el valor de la persona respecto a su ventana funcional. */
  estado: EstadoMarcador;
}

/** Orden de urgencia: primero lo que pide atención, al final lo que no tiene banda. */
const RANGO_ESTADO: Record<EstadoMarcador, number> = {
  atencion: 3,
  aceptable: 2,
  optimo: 1,
  sin_banda: 0,
};

/**
 * Las llaves de los marcadores que Free ve con ficha: los tres de mayor
 * impacto. Impacto = primero el estado (lo que está fuera de ventana importa
 * más que lo que está bien), luego el peso en la matriz V7, y por último la
 * llave en orden alfabético para que el resultado sea estable entre cargas
 * (a la persona no se le abre y cierra un marcador según el orden de lectura).
 *
 * Con tres o menos marcadores medidos, todos quedan abiertos.
 */
export function marcadoresAbiertosFree(marcadores: ReadonlyArray<MarcadorParaImpacto>): string[] {
  const ordenados = [...marcadores].sort((a, b) =>
    RANGO_ESTADO[b.estado] - RANGO_ESTADO[a.estado]
    || b.peso - a.peso
    || a.key.localeCompare(b.key),
  );
  const vistos = new Set<string>();
  const abiertos: string[] = [];
  for (const m of ordenados) {
    if (vistos.has(m.key)) continue;
    vistos.add(m.key);
    abiertos.push(m.key);
    if (abiertos.length >= MARCADORES_FREE) break;
  }
  return abiertos;
}

/**
 * ¿Puede abrir la ficha de este marcador? `abiertos` es la lista de
 * `marcadoresAbiertosFree`; null significa "no se pudo calcular" y entonces
 * se abre (fail-open, misma doctrina que el proxy: ante la duda, no se cierra).
 */
export function puedeVerFicha(
  tier: Tier,
  key: string,
  abiertos: ReadonlyArray<string> | null,
  ventaAlPublico: boolean = VENTA_AL_PUBLICO,
): boolean {
  if (ventaAlPublico !== true) return true;
  if (tier !== 'free') return true;
  if (abiertos === null) return true;
  return abiertos.includes(key);
}

/** Un periodo de esta duración o más se lee como anual (un mes son 28 a 31 días). */
export const DIAS_PLAN_ANUAL = 300;

export interface OrigenMembresia {
  tier: Tier;
  esElite: boolean;
  /**
   * Dato EXPLÍCITO del plan (`tier_grants.metadata->>'plan'`, lo escribe el
   * webhook de pago). Manda sobre cualquier heurística.
   */
  plan?: 'anual' | 'mensual' | null;
  /**
   * Días que cubre el entitlement activo de RevenueCat (expirationDate menos
   * latestPurchaseDate u originalPurchaseDate). Con compra fuera de la tienda
   * el productIdentifier es opaco (`price_...`, `prod_...`), y esto es lo que
   * dice si el periodo es anual.
   */
  diasEntitlement?: number | null;
  /** Días que cubre el grant vigente de `tier_grants` (expires_at menos starts_at). */
  diasGrant?: number | null;
  /** `metadata->>'code_source'` del grant vigente ('founder', 'web_payment', 'cortesia'...). */
  codeSource: string | null;
  /** `productIdentifier` del entitlement, o el product_id del grant. Último recurso. */
  productId: string | null;
}

/** ¿Este id de producto es un plan anual? Heurística de nombre, último recurso. */
export function esProductoAnual(productId: string | null | undefined): boolean {
  if (!productId) return false;
  const id = productId.toLowerCase();
  return id.includes('annual') || id.includes('anual') || id.includes('year');
}

/** Días entre dos fechas ISO (b menos a); null si alguna falta o no parsea. */
export function diasEntre(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null;
  return Math.round((tb - ta) / 86_400_000);
}

const esPeriodoAnual = (dias: number | null | undefined): boolean =>
  typeof dias === 'number' && Number.isFinite(dias) && dias >= DIAS_PLAN_ANUAL;

/**
 * Mapa funcional ATP (pivote 3.2): Elite siempre; Pro solo en anual o con
 * grant de Founders; Free nunca.
 *
 * Orden de evidencia para "anual" en un premium (4EP 5-sep-2026, regla 1: un
 * Pro anual comprado fuera de la tienda no se puede quedar fuera):
 *  1. `plan` explícito del grant ('anual' abre, 'mensual' cierra).
 *  2. `code_source === 'founder'` abre siempre.
 *  3. Duración del entitlement de RevenueCat >= 300 días.
 *  4. Grant de `web_payment` con duración >= 300 días.
 *  5. Nombre del producto (annual / anual / year), último recurso.
 * Quien llama decide el fail-open cuando NADA se pudo leer; aquí, con datos,
 * se contesta.
 */
export function tieneMapaFuncional(
  o: OrigenMembresia,
  ventaAlPublico: boolean = VENTA_AL_PUBLICO,
): boolean {
  if (ventaAlPublico !== true) return true;
  if (o.esElite || o.tier === 'elite') return true;
  if (o.tier !== 'premium') return false;
  if (o.plan === 'anual') return true;
  if (o.plan === 'mensual') return false;
  if (o.codeSource === 'founder') return true;
  if (esPeriodoAnual(o.diasEntitlement)) return true;
  if (o.codeSource === 'web_payment' && esPeriodoAnual(o.diasGrant)) return true;
  return esProductoAnual(o.productId);
}
