/**
 * user-error — copy seguro para errores mostrados al usuario (MB-7 Track F).
 *
 * Punto 7 de SEGURIDAD_LINEAMIENTOS_GOB_ATP (requisito del trato de gobierno):
 * ningún mensaje a pantalla revela rutas, tablas, constraints, SQL, tokens,
 * versiones ni stack traces. El detalle técnico se loguea en el call site
 * (Sentry/logger); aquí solo se decide qué puede VER el usuario — los mensajes
 * de dominio escritos por nosotros pasan, las firmas técnicas caen al fallback.
 *
 * Sin imports de react-native → testeable en Vitest node.
 */

const TECH_SIGNATURES: RegExp[] = [
  // Postgres / PostgREST / Supabase
  /relation\s|column\s|constraint|violates|duplicate key|null value|foreign key/i,
  /syntax error|permission denied|row-level security|pgrst|postgres|supabase/i,
  // Auth / transporte
  /jwt|token|unauthorized|forbidden|status code|statuscode/i,
  /network request failed|failed to fetch|fetch|timeout|econn|enotfound|tls|ssl/i,
  // Storage
  /bucket|storage\/|\/object\//i,
  // SQL crudo
  /\bselect\s.+\sfrom\b|\binsert\s+into\b|\bupdate\s.+\sset\b|\bdelete\s+from\b/i,
  // Rutas de código / stack traces
  /\.tsx?\b|\.jsx?\b|\/src\/|\bat\s+\w+\s*\(/,
  // Módulos nativos y SDK (21-ago-2026). Una usuaria vio en pantalla, en
  // inglés: "Calling the 'getDocumentAsync' function has failed → Caused by:
  // Different document picking in progress." Cabía en 160 caracteres y no
  // traía ninguna de las firmas de arriba, así que pasó entero. El nombre de
  // una función interna en pantalla es exactamente lo que este archivo existe
  // para evitar, y además en un idioma que la persona no eligió.
  /calling the .+ function has failed|caused by:/i,
  /\bexpo-[a-z-]+|native ?module|turbomodule|invariant violation/i,
  /\bgetDocumentAsync\b|\blaunch(Camera|ImageLibrary)Async\b/i,
];

/** ¿El mensaje trae firma técnica que no debe llegar a pantalla? */
export function isTechnicalMessage(msg: string): boolean {
  return TECH_SIGNATURES.some((re) => re.test(msg));
}

/**
 * Mensaje mostrable al usuario: conserva mensajes de dominio cortos (los que
 * escribimos nosotros, p. ej. validaciones en español) y sustituye cualquier
 * cosa con firma técnica — o vacía, u oversized — por el fallback del caller.
 */
export function userErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error
    ? err.message
    : typeof err === 'string'
      ? err
      : err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string'
        ? (err as { message: string }).message
        : '';
  const msg = raw.trim();
  if (!msg || msg.length > 160) return fallback;
  if (isTechnicalMessage(msg)) return fallback;
  return msg;
}
