/**
 * Acceso al pilar Ciclo — núcleo PURO (MB-7).
 *
 * El bug más vergonzoso de la app (contenido de embarazo/ciclo a un hombre)
 * nació de superficies que renderizaban sin verificar biological_sex. La card
 * de Ciclo se oculta en habits-portal para no-female, pero las rutas
 * (/cycle, /cycle-charts, /cycle-history, /cycle-settings) eran abribles por
 * deep-link SIN gate. Este predicado es la regla única de acceso.
 *
 * Regla: SOLO 'female' entra. null/undefined/cualquier otro → fuera (fail-safe:
 * ante la duda, NO se muestra contenido de ciclo).
 */
export function canAccessCycle(biologicalSex: string | null | undefined): boolean {
  return biologicalSex === 'female';
}
