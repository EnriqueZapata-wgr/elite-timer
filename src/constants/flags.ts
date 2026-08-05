/**
 * Feature flags de ATP — constantes de compilación distribuibles vía OTA.
 *
 * Patrón (establecido en DX F4): cada flag es una constante booleana con
 * comentario doctrinal. Cambiar un flag = editar este archivo + `eas update
 * --branch preview` (JS/TS puro → OTA, sin build nativo). NO usar process.env
 * en cliente (regla #7 CLAUDE.md).
 */

/**
 * INTERVENTIONS_DRIVE_HOY — el swap del corazón de la app (DX F4).
 *
 * QUÉ CONTROLA
 *  · ON  → las INTERVENCIONES ACTIVAS del user ("Mi Protocolo",
 *    user_interventions status='active') son el driver de HOY y AGENDA:
 *    day-compiler.buildAgenda convierte intervenciones a AgendaItems y
 *    agenda-service.generateAgendaEvents las vuelca a agenda_events (source
 *    'intervention') → heredan el pipeline de push (dispatch-agenda-notifications)
 *    sin tocarlo. Los protocolos precargados DEJAN de inyectar items al día y
 *    quedan como biblioteca de referencia (pantallas intactas, rol demoted).
 *  · OFF → comportamiento previo intacto: los protocolos (user_protocols →
 *    daily_plans vía generateDailyPlan) siguen driveando HOY/AGENDA y las
 *    intervenciones NO inyectan items.
 *
 * DOBLE-LECTURA (por qué se puede apagar sin migración de datos)
 *  Ambos caminos conviven en el código durante la transición: ninguna tabla se
 *  borra ni se transforma. daily_plans/user_protocols siguen escribiéndose igual
 *  con flag OFF, y user_interventions/intervention_completions existen con flag
 *  ON u OFF (F3). Apagar el flag revive el camino de protocolos tal cual;
 *  los agenda_events source='intervention' ya creados simplemente dejan de
 *  regenerarse (los existentes se pueden desactivar a mano si estorban).
 *
 * CÓMO APAGARLO EN CALIENTE
 *  1. Cambiar a `false` aquí.
 *  2. `npx tsc --noEmit` → 0 errores.
 *  3. `eas update --branch preview` (OTA — sin build nativo, sin migración).
 */
export const INTERVENTIONS_DRIVE_HOY = true;

/**
 * FASTING_MEASURED_MODE — modo medido del ayuno por sangre (MB-9 · Track E.3).
 *
 * QUÉ CONTROLA
 *  · OFF (default) → la pastilla de fase muestra la etapa ESTIMADA por tiempo,
 *    declarada como estimación. Es lo honesto sin datos de sangre.
 *  · ON → si hay glucosa y cetonas capturadas durante el ayuno, la pastilla
 *    muestra el estado REAL medido vía GKI (glucosa mmol/L ÷ cetonas mmol/L),
 *    leído como PROFUNDIDAD DE CETOSIS. La matemática vive en fasting-metrics-core.
 *
 * POR QUÉ EMPIEZA APAGADO
 *  El modo medido depende de captura de glucosa/cetonas en contexto de ayuno y
 *  requiere validación en device (lectura real de glucose_logs 040 + ketones_logs
 *  078). El core y el cableado están listos; se enciende tras el device test.
 *  ⚠️ El GKI viene de terapia metabólica oncológica y se usa como profundidad de
 *  cetosis, NUNCA como afirmación de autofagia (doctrina Track D).
 *
 * CÓMO ENCENDERLO: `true` aquí → `npx tsc --noEmit` → `eas update --branch preview`.
 *
 * NOMBRE PARA EL USUARIO (MB-23 P4.3): cuando esto gane superficie de UI, el
 * concepto es el mismo "simple contra completo" de nutrición y salud —
 * estimado = simple, medido = completo. Un concepto que se aprende una vez.
 */
export const FASTING_MEASURED_MODE = false;
