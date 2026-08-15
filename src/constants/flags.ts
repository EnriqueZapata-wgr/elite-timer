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

/**
 * LOGIN_PASA_POR_GATE — cierre del agujero de consentimiento (CIERRE-1).
 *
 * QUÉ CONTROLA
 *  · ON (default) → al iniciar sesión, `app/login.tsx` navega a `/`, o sea al
 *    gate de `app/index.tsx`, que lee `profiles.onboarding_step` y decide:
 *    'completed' → /(tabs); cualquier otro valor → la pantalla de onboarding
 *    que toca. Es el MISMO camino que ya recorre un arranque en frío con sesión
 *    viva, así que no inventa política nueva: solo deja de saltárselo.
 *  · OFF → comportamiento previo: `router.replace('/(tabs)')` directo.
 *
 * POR QUÉ EXISTE
 *  Iniciar sesión brincaba el gate por completo. Un usuario que abandonó el
 *  onboarding a medias y volvió por la pantalla de login entraba a HOY sin
 *  haber aceptado CB-2 (datos sensibles), CB-3 (transferencia internacional)
 *  ni CB-4 (mayoría de edad), que se firman en `/onboarding/v2/privacy` y se
 *  registran en `user_consent_log`. Una app de salud que recolecta datos sin
 *  consentimiento asentado es un problema legal y motivo de rechazo en
 *  revisión de tiendas. No es deuda de UX: es cumplimiento.
 *
 * POR QUÉ NO SE VERIFICA `user_consent_log` DIRECTAMENTE
 *  Sería lo obvio y sería un desastre. La tabla nace en la migración 209,
 *  mientras que la 032 (líneas 15-16) marcó `onboarding_step='completed'` a
 *  TODOS los usuarios preexistentes. Esos usuarios ya consintieron por el
 *  camino que existía entonces y no tienen una sola fila en `user_consent_log`:
 *  gatear por ahí los mandaría a repetir el onboarding y a re-firmar algo que
 *  ya firmaron. El dato del usuario es sagrado. La marca válida de "este ya
 *  pasó" es `onboarding_step`, que sí está backfilleada.
 *
 * A QUIÉN LE CAMBIA ALGO
 *  A nadie que ya esté adentro: 'completed' → `resolveOnboardingRoute` devuelve
 *  null → Redirect a /(tabs), exactamente lo de antes más un frame de splash.
 *  Solo cambia para quien de verdad no terminó.
 *
 * CÓMO APAGARLO EN CALIENTE
 *  `false` aquí → `npx tsc --noEmit` → `eas update --branch preview`.
 *  Apagarlo revive el brinco, o sea reabre el agujero legal: solo tiene sentido
 *  si el gate resultara estar mandando gente a onboarding por error.
 */
export const LOGIN_PASA_POR_GATE = true;

/**
 * DIA_1_SIEMBRA_SUAVE — el día 1 se siembra, no se hereda (CIERRE-1).
 *
 * QUÉ CONTROLA
 *  · ON (default) → al CERRAR el onboarding v2 se escribe una fila explícita
 *    en user_day_preferences con 3 hábitos (los del pack elegido, o los tres
 *    universales de SIEMBRA_DIA_1) y cero cuantitativos.
 *  · OFF → `sembrarDia1` sale de inmediato y el usuario nuevo hereda el
 *    comportamiento previo: DEFAULT_BOOLEANS ∪ MANDATORY_BOOLEANS y
 *    DEFAULT_QUANTS, o sea 13 renglones el primer día.
 *
 * POR QUÉ
 *  El usuario abría HOY con 13 tareas que nunca eligió y la barra en "0 de 13".
 *  Ese es el momento exacto en que la app se siente compleja: no por tener 145
 *  pantallas, sino por empezar con una lista ajena y un cero. Contradice la
 *  doctrina propia de que instalar una app equivale a activar un hábito,
 *  porque el usuario no instaló nada.
 *
 * SOLO USUARIOS NUEVOS, POR TRES CANDADOS
 *  Bandera one-shot en goals; aborta si ya hay `active_boolean_electrons`
 *  persistido (una elección previa no se pisa jamás); y el único llamador es
 *  el cierre del onboarding, por el que un usuario existente no vuelve a
 *  pasar. Los defaults globales NO se tocaron justamente por esto: recortar
 *  DEFAULT_BOOLEANS le habría apagado hábitos a todo el que aún no tiene fila
 *  propia.
 *
 * LO QUE ESTE FLAG NO LOGRA
 *  Baja el día 1 de 13 a 8, no a 3. Los 5 MANDATORY los fuerza el compilador
 *  por unión y no son deseleccionables (ver siembraDia1 en install-core).
 *
 * CÓMO APAGARLO EN CALIENTE
 *  `false` aquí → `npx tsc --noEmit` → `eas update --branch preview`.
 *  Apagarlo NO deshace lo ya sembrado: quien ya recibió su fila explícita la
 *  conserva, que es lo correcto (es su elección desde que se escribió). Solo
 *  deja de sembrar a los siguientes.
 */
export const DIA_1_SIEMBRA_SUAVE = true;

/**
 * SALUD_DEL_SISTEMA_ALIMENTA_EL_DIA — la tabla deja de ser un cul-de-sac (CIERRE-3).
 *
 * QUÉ CONTROLA
 *  · ON (default) → `compileDay` lee la salud del día (health_measurements +
 *    sleep_nights + health_os_daily, resueltas por health-read-core) y con eso:
 *    (a) los electrones cuantitativos `steps` y `sleep` dejan de estar vetados y
 *    vuelven al renglón del día si el usuario los tiene activos;
 *    (b) se pagan los premios de tier wearable (`steps_wearable`,
 *    `sleep_wearable`), que existían en award-rules desde el día uno y nunca se
 *    dispararon; (c) corre la sync automática si la persona la activó.
 *  · OFF → el filtro `k !== 'steps' && k !== 'sleep'` vuelve a aplicarse, no se
 *    consulta ninguna de las tres tablas, no se paga ningún premio y no se
 *    sincroniza nada. Byte por byte el comportamiento previo.
 *
 * POR QUÉ EXISTE
 *  NOCHE-1 encendió HealthKit y Health Connect, y la tabla `health_os_daily` se
 *  quedó llenándose sin un solo lector: exactamente 2 archivos del repo la
 *  mencionaban, la migración y el que escribe. La persona conectaba su teléfono,
 *  veía "sincronizado" y en la app no cambiaba absolutamente nada. Eso es peor
 *  que no tener la función, porque promete y no cumple.
 *
 * LO QUE ESTE FLAG NO PUEDE ROMPER
 *  No escribe en ninguna tabla de la persona. La separación de la migración 264
 *  (máquina y persona en tablas distintas) se conserva: aquí solo se LEE, y
 *  quien gana lo decide health-read-core, donde el candado "lo manual nunca se
 *  pisa" es un test rojo y no un comentario.
 *
 * EL RIESGO REAL AL APAGARLO
 *  Los premios de wearable ya pagados NO se devuelven (son historial del
 *  usuario, y el historial no se toca). Apagarlo solo deja de pagar los
 *  siguientes y vuelve a esconder los dos renglones del día.
 *
 * CÓMO APAGARLO EN CALIENTE
 *  `false` aquí → `npx tsc --noEmit` → `eas update --branch preview`.
 *  Sin migración, sin build nativo, sin tocar datos.
 */
export const SALUD_DEL_SISTEMA_ALIMENTA_EL_DIA = true;

/**
 * RANGOS_UNA_SOLA_FUENTE — se acaban las dos verdades (CIERRE-3).
 *
 * QUÉ CONTROLA
 *  · ON (default) → `lab-rating` (el que colorea labs, composición y
 *    biomarcadores en el panel del coach) lee los rangos de la MATRIZ V7/V6,
 *    la misma que ya usan ATP Labs, Mi lectura y los reportes.
 *  · OFF → vuelve a leerlos de `src/data/functional-health-engine.ts` (legacy).
 *
 * POR QUÉ
 *  Convivían dos definiciones de rango funcional y el usuario las veía pelear:
 *  el MISMO biomarcador del MISMO cliente se pintaba distinto según la
 *  pantalla. Un VO2 de 55 salía "Aceptable" en el panel y "En tu ventana" en
 *  ATP Labs. Una IgG de 900 salía "Óptimo" porque el legacy tenía 80 donde la
 *  matriz dice 800, y con eso declaraba óptimo todo el intervalo [80, 1200].
 *
 *  La matriz gana por procedencia, no por gusto: cita archivo fuente, autoría y
 *  fecha de extracción, tiene fixtures de regresión contra el Excel y once
 *  archivos de test. El legacy no cita fuente, dice tener 144 parámetros y
 *  define 98, copia los umbrales masculinos a las mujeres en casi todos los
 *  parámetros (incluida la testosterona) y no tiene un solo test.
 *
 * QUÉ CAMBIA EN PANTALLA AL ENCENDERLO
 *  Muchos valores cambian de etiqueta, y ese es el objetivo. Los que estaban
 *  mal eran los del panel. Además se arreglan gratis seis columnas que siempre
 *  decían "Sin dato" (LH, CPK, urea, transferrina, saturación de hierro,
 *  capacidad de fijación de hierro) porque el mapa viejo apuntaba a claves
 *  inexistentes; y diez columnas pasan a decir "Sin dato" de forma DECLARADA,
 *  porque la matriz no define banda para ellas y un rango no se inventa
 *  (listadas en COLUMNAS_LAB_SIN_BANDA).
 *
 * LO QUE ESTE FLAG NO ALCANZA
 *  `calculateHealthScore` (el score funcional que se PERSISTE) sigue corriendo
 *  con el legacy. Ese swap es otro algoritmo — PhenoAge, edad biológica y
 *  pesos de dominio propios — y cambiarlo mueve un número guardado en base.
 *  No entra en un flag de presentación.
 *
 * CÓMO APAGARLO EN CALIENTE
 *  `false` aquí → `npx tsc --noEmit` → `eas update --branch preview`.
 *  Sin migración: esto solo cambia de dónde se leen números para pintar.
 */
export const RANGOS_UNA_SOLA_FUENTE = true;
