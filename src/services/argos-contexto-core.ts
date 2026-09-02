/**
 * ARGOS Contexto de apertura — lógica pura (HUB-ARGOS, 31-ago-2026).
 *
 * EL CONTRATO DEL CHAT: `/argos-chat?contexto=<clave>&ref=<id>`.
 *
 * El hub de ARGOS (app/(tabs)/argos.tsx) y otras pantallas abren el chat con
 * un CONTEXTO PRECARGADO en vez de una pregunta suelta. El contexto viaja por
 * parámetro de ruta, no en memoria: un deep link, una notificación o un push
 * desde otra pantalla llegan igual, y el chat no depende de que alguien haya
 * dejado algo en un singleton antes de navegar.
 *
 * Claves iniciales:
 *  · `edad_atp`   → "explícame mi Edad ATP". El bloque de Edad ATP ya viaja en
 *                   el contexto del usuario (argos-context-core); aquí solo se
 *                   le dice al modelo que ESE es el tema.
 *  · `labs`       → "explícame mi último laboratorio". Mismo razonamiento: el
 *                   expediente ya viaja (argos-labs-core).
 *  · `electrones` → "explícame qué es un electrón": concepto de la app, sin
 *                   dato personal; ARGOS lo explica con el cerebro.
 *  · `receta`     → `ref` = uuid de `recipes` o `user_recipes`. El chat carga
 *                   la receta y la mete como contexto de sistema con la
 *                   instrucción de que la persona quiere MODIFICARLA. Quien
 *                   navega (la ficha de recetas) solo manda clave + id.
 *
 * Dos reglas, con test:
 *  1. La pregunta inicial se PRELLENA, no se envía (CIERRE-1: mandar una
 *     pregunta que la persona no escribió es ponerle palabras en la boca).
 *  2. Una clave desconocida o un `ref` malformado se ignoran en silencio: el
 *     chat abre normal. Un parámetro roto nunca es una pantalla rota.
 */

export const CLAVES_CONTEXTO = ['edad_atp', 'labs', 'electrones', 'receta'] as const;
export type ClaveContexto = (typeof CLAVES_CONTEXTO)[number];

export interface ContextoDeApertura {
  clave: ClaveContexto;
  /** Solo las claves que apuntan a una fila (hoy: receta). */
  ref: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Claves que EXIGEN un `ref` (uuid). Sin él, la clave no significa nada. */
const CLAVES_CON_REF: ReadonlySet<ClaveContexto> = new Set<ClaveContexto>(['receta']);

export function esClaveContexto(v: unknown): v is ClaveContexto {
  return typeof v === 'string' && (CLAVES_CONTEXTO as readonly string[]).includes(v);
}

/**
 * Lee los params de ruta y devuelve el contexto validado, o null.
 * expo-router puede entregar string | string[] | undefined: se toma el primero.
 */
export function parsearContextoDeRuta(
  contexto: unknown,
  ref: unknown,
): ContextoDeApertura | null {
  const c = Array.isArray(contexto) ? contexto[0] : contexto;
  if (!esClaveContexto(c)) return null;
  const r = Array.isArray(ref) ? ref[0] : ref;
  const refLimpio = typeof r === 'string' ? r.trim() : '';
  if (CLAVES_CON_REF.has(c)) {
    if (!UUID_RE.test(refLimpio)) return null;
    return { clave: c, ref: refLimpio };
  }
  return { clave: c, ref: null };
}

/**
 * Lo que aparece escrito en el campo al abrir. La persona lo ve, lo edita si
 * quiere y lo manda ella. Sin em dashes: es copy de usuario.
 */
export const PREGUNTA_INICIAL: Record<ClaveContexto, string> = {
  edad_atp: 'Explícame mi Edad ATP: qué significa y qué la está moviendo.',
  labs: 'Explícame mi último laboratorio: qué salió bien y qué conviene vigilar.',
  electrones: 'Explícame qué es un electrón en ATP y cómo se gana.',
  receta: 'Quiero ajustar esta receta. ¿Qué me propones?',
};

export function preguntaInicialDe(ctx: ContextoDeApertura): string {
  return PREGUNTA_INICIAL[ctx.clave];
}

/** Forma mínima de una receta para el contexto, sin importar de qué tabla venga. */
export interface RecetaParaContexto {
  nombre: string;
  ingredientes: string[];
  pasos: string[];
  porciones: number | null;
  kcal: number | null;
  proteinaG: number | null;
  carbsG: number | null;
  grasaG: number | null;
  /** 'catalogo' = tabla recipes; 'propia' = user_recipes. */
  origen: 'catalogo' | 'propia';
}

/** Tope de líneas de ingredientes y pasos: el contexto no puede comerse la ventana. */
export const TOPE_LINEAS_RECETA = 25;
/** Tope por línea (4EP M2): un paso de 3,000 caracteres tampoco cabe. */
export const TOPE_CHARS_LINEA = 200;

function recortar(s: string): string {
  return s.length > TOPE_CHARS_LINEA ? s.slice(0, TOPE_CHARS_LINEA - 1).trimEnd() + '…' : s;
}

/**
 * Normaliza un JSONB de ingredientes/pasos a líneas de texto. Acepta strings,
 * objetos {name|nombre, amount|cantidad, unit|unidad} y cualquier cosa con
 * toString razonable; lo que no se entiende se descarta, no se inventa.
 */
export function lineasDe(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (out.length >= TOPE_LINEAS_RECETA) break;
    if (typeof item === 'string') {
      const s = item.trim();
      if (s) out.push(recortar(s));
      continue;
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const nombre = String(o.name ?? o.nombre ?? o.text ?? o.texto ?? o.step ?? o.paso ?? '').trim();
      if (!nombre) continue;
      const cantidad = o.amount ?? o.cantidad ?? o.quantity ?? null;
      const unidad = o.unit ?? o.unidad ?? null;
      const q = [cantidad, unidad].filter((v) => v != null && String(v).trim() !== '').map(String).join(' ');
      out.push(recortar(q ? `${nombre}: ${q}` : nombre));
    }
  }
  return out;
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Fila de `recipes` (catálogo) → forma mínima. */
export function recetaDesdeCatalogo(row: Record<string, unknown>): RecetaParaContexto {
  return {
    nombre: String(row.name ?? 'Receta').trim() || 'Receta',
    ingredientes: lineasDe(row.ingredients),
    pasos: lineasDe(row.instructions),
    porciones: num(row.servings),
    kcal: num(row.calories),
    proteinaG: num(row.protein_g),
    carbsG: num(row.carbs_g),
    grasaG: num(row.fat_g),
    origen: 'catalogo',
  };
}

/** Fila de `user_recipes` (propia) → forma mínima. No tiene pasos ni porciones. */
export function recetaDesdePropia(row: Record<string, unknown>): RecetaParaContexto {
  return {
    nombre: String(row.name ?? 'Receta').trim() || 'Receta',
    ingredientes: lineasDe(row.ingredients),
    pasos: [],
    porciones: null,
    kcal: num(row.total_calories),
    proteinaG: num(row.total_protein),
    carbsG: num(row.total_carbs),
    grasaG: num(row.total_fat),
    origen: 'propia',
  };
}

/**
 * El bloque de sistema que viaja en la capa dinámica del turno. Es texto para
 * el modelo, no copy de usuario, pero se mantiene sin em dashes por higiene.
 */
export function construirInyeccionContexto(
  ctx: ContextoDeApertura,
  datos?: { receta?: RecetaParaContexto | null },
): string {
  const cab = '\n\n=== CONTEXTO DE APERTURA DEL CHAT ===\n';
  const pie = '\n=== FIN CONTEXTO DE APERTURA ===\n';
  switch (ctx.clave) {
    case 'edad_atp':
      return cab +
        'La persona abrió este chat para que le EXPLIQUES su Edad ATP. Usa el bloque de Edad ATP del ' +
        'contexto de usuario (integral, cronológica y sub-edades). Explica qué significa el número, qué ' +
        'área la está subiendo y qué acción concreta de hoy la mueve. Si no hay Edad ATP calculada en ' +
        'el contexto, dilo tal cual y explica cómo calcularla en la app; no inventes un número.' + pie;
    case 'labs':
      return cab +
        'La persona abrió este chat para que le EXPLIQUES su último laboratorio. Usa el expediente de ' +
        'labs del contexto de usuario (marcadores, valores y fecha). Explica qué salió dentro de rango, ' +
        'qué conviene vigilar y qué preguntarle a su médico. Si no hay labs en el contexto, dilo tal cual ' +
        'y explica cómo cargarlos; no inventes valores ni rangos.' + pie;
    case 'electrones':
      return cab +
        'La persona abrió este chat para que le EXPLIQUES qué es un electrón en ATP: la unidad de una ' +
        'acción efectiva del día (un hábito cumplido) que alimenta el ATP Score y el rango. Explícalo ' +
        'con un ejemplo de sus propios hábitos de hoy si están en el contexto. No es un dato clínico.' + pie;
    case 'receta': {
      const r = datos?.receta ?? null;
      if (!r) {
        return cab +
          'La persona quería modificar una receta pero no se pudo cargar. Dilo tal cual y pídele que ' +
          'te la pegue o te diga cuál es; no inventes ingredientes.' + pie;
      }
      const macros = [
        r.kcal != null ? `${Math.round(r.kcal)} kcal` : null,
        r.proteinaG != null ? `${Math.round(r.proteinaG)} g proteína` : null,
        r.carbsG != null ? `${Math.round(r.carbsG)} g carbohidratos` : null,
        r.grasaG != null ? `${Math.round(r.grasaG)} g grasa` : null,
      ].filter(Boolean).join(', ');
      const lineas = [
        `La persona quiere MODIFICAR esta receta (${r.origen === 'propia' ? 'receta propia' : 'del catálogo'}). ` +
        'Pregunta qué quiere cambiar si no lo dice (más proteína, sin un ingrediente, menos tiempo, ' +
        'más porciones) y propón la versión ajustada completa: ingredientes con cantidades y pasos. ' +
        'Respeta su protocolo activo y sus preferencias del contexto. Si cambias macros, di que son estimados.',
        `Receta: ${r.nombre}`,
        r.porciones != null ? `Porciones: ${r.porciones}` : null,
        macros ? `Macros por receta: ${macros}` : null,
        r.ingredientes.length ? `Ingredientes:\n- ${r.ingredientes.join('\n- ')}` : 'Ingredientes: no registrados.',
        r.pasos.length ? `Pasos:\n${r.pasos.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : null,
      ].filter((l): l is string => !!l);
      return cab + lineas.join('\n') + pie;
    }
  }
}
