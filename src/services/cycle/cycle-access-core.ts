/**
 * Acceso al pilar Ciclo — núcleo PURO (MB-7, extendido en MB-22 Pieza 4).
 *
 * El bug más vergonzoso de la app (contenido de embarazo/ciclo a un hombre)
 * nació de superficies que renderizaban sin verificar biological_sex. La card
 * de Ciclo se oculta en habits-portal para no-female, pero las rutas
 * (/cycle, /cycle-charts, /cycle-history, /cycle-settings) eran abribles por
 * deep-link SIN gate. Este predicado es la regla única de acceso.
 *
 * MB-22: Ciclo es instalable por cualquiera, con un modo:
 *   · 'propio'      — es mi ciclo. Lo de siempre.
 *   · 'acompanante' — sigo el ciclo de otra persona. Un calendario que llevo
 *                     yo con lo que sé. NO se comparten datos entre cuentas.
 *
 * canAccessCycle sigue siendo LA fuente única para lo que es PROPIO: solo un
 * ciclo propio puede entrar a la Edad ATP, al contexto de ARGOS o a cualquier
 * cálculo de salud del usuario. Un ciclo de acompañante JAMÁS pasa por aquí
 * como propio — es lo más fácil de romper y lo peor que se ve roto.
 *
 * Reglas:
 *   · propio  ⇔ biological_sex === 'female' Y el modo NO es 'acompanante'.
 *     (female sin fila de modo = propio: el comportamiento de siempre, y el
 *     backfill de la mig 249 las deja explícitas.)
 *   · abrir la app ⇔ es propio O el modo es 'acompanante' (cualquier sexo).
 *   · null/undefined/desconocido → fuera (fail-safe: ante la duda, NO se
 *     muestra contenido de ciclo).
 */

export type CycleMode = 'propio' | 'acompanante';

/**
 * ¿El ciclo de este usuario es SUYO? Única puerta a superficies y cálculos de
 * salud del usuario (Edad ATP, ARGOS, day-compiler, recetas, prescripción).
 */
export function canAccessCycle(
  biologicalSex: string | null | undefined,
  mode?: CycleMode | null,
): boolean {
  if (mode === 'acompanante') return false;
  return biologicalSex === 'female';
}

/**
 * ¿Puede abrir las pantallas del Ciclo? Propio o acompañante. Esto NO otorga
 * acceso a salud: solo a la app (calendario, registro, predicción).
 */
export function canOpenCycleApp(
  biologicalSex: string | null | undefined,
  mode?: CycleMode | null,
): boolean {
  return canAccessCycle(biologicalSex, mode) || mode === 'acompanante';
}

/** Normaliza lo que venga de DB a un modo válido, o null. */
export function parseCycleMode(raw: unknown): CycleMode | null {
  return raw === 'propio' || raw === 'acompanante' ? raw : null;
}
