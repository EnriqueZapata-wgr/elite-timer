/**
 * hoy-cards — lo que queda del registro de cards editoriales del HOY.
 *
 * MB-20.4 (nota del audit): HOY_CARD_SPECS y HOY_CARD_BY_KEY murieron con
 * su único consumidor de producción (HoyEditorialSection, retirado en
 * MB-20). Solo los usaban tests que declaraban vigilar un renderer que ya
 * no existe. La superficie viva del HOY es TareasView (tareas-core +
 * tareas-editorial-core), con color por sección (APP_SECTION_COLORS) e
 * iconos por electrón — nada de specs por card.
 *
 * HOY_CARD_ORDER_DEFAULT sigue VIVO: es el default del toggle ON/OFF de
 * visibilidad (visibility-service, migración 096).
 */

/**
 * Orden de visibilidad del HOY, default para el toggle ON/OFF (migración 096).
 * #v13e (reorden): orden cronológico por las 5 sub-secciones (DESPERTAR / NUTRICIÓN / ACTIVIDAD /
 * CIERRE / DESCANSO). #v13f 2.4: SUPLEMENTOS restaurada como card editorial (X/Y tomados) en NUTRICIÓN.
 */
export const HOY_CARD_ORDER_DEFAULT: string[] = [
  // #v13f 2.5: 'hero_agenda' eliminado (card "AHORA" confusa). HOY arranca con DESPERTAR.
  // DESPERTAR
  'uv', 'luz_solar', 'checkin', 'meditacion',
  // NUTRICIÓN
  'proteina', 'agua', 'suplementos', 'no_processed_foods', 'ayuno',
  // ACTIVIDAD
  'fuerza', 'cardio', 'pasos', 'grounding', 'bano_frio',
  // CIERRE
  'breathwork', 'lentes_rojos', 'journal', 'screen_time_cutoff', 'no_alcohol',
  // DESCANSO
  'sleep',
];
