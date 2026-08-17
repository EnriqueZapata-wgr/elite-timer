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

/**
 * INSIGHT_EN_VENTANA — el insight diario deja de ser una llave abierta (CIERRE-4).
 *
 * QUÉ CONTROLA
 *  · ON (default) → la generación del insight diario se decide con
 *    `decidirRegeneracionInsight` (argos-insight-window-core): el día se parte
 *    en ventanas fijas de 4 horas y dentro de una ventana se genera UNO solo,
 *    sin importar cuántas veces se invalide el cache ni cuántas veces se abra
 *    la app. `invalidateDailyInsight` marca `argos_daily_insights.stale = true`
 *    en vez de falsear `created_at`.
 *  · OFF → comportamiento previo byte por byte: guarda por antigüedad de 6h e
 *    invalidación escribiendo `created_at = epoch 0`.
 *
 * POR QUÉ EXISTE
 *  La guarda nunca fue "uno al día", era un cache de 6 horas, y la invalidación
 *  lo anulaba por completo. `day_changed` se emite desde 36 lugares del código,
 *  así que cualquier comida o tramo de ayuno dejaba el insight invalidado y el
 *  siguiente arranque en frío pagaba una llamada nueva a Sonnet. Medido en
 *  argos_logs a 30 días: 193 llamadas de `insight` contra un diseño de una por
 *  usuario por día, y el 62% del costo de cada una es una escritura de caché de
 *  5 minutos que en 30 días se leyó UNA vez (103 escrituras, 1 lectura).
 *
 * LO QUE NO LE PUEDE QUITAR A NADIE
 *  El primer insight del día siempre se genera: la fila es por fecha, al
 *  amanecer no existe y gana el motivo 'sin_insight'. El techo pasa de "sin
 *  límite" a 6 al día; lo normal queda en 1 a 3. Nadie pierde el insight que paga.
 *
 * DEPENDE DE LA MIGRACIÓN 275 (columna `stale`), pero NO se rompe sin ella:
 *  `leerInsightDeHoy` reintenta sin la columna y asume `stale = true`, o sea
 *  cae del lado generoso (regenera al cruzar ventana) en vez de callarse.
 *
 * CÓMO APAGARLO EN CALIENTE
 *  `false` aquí → `npx tsc --noEmit` → `eas update --branch preview`.
 *  Sin migración inversa: la columna `stale` sobrante es inerte con el flag OFF.
 */
export const INSIGHT_EN_VENTANA = true;

/**
 * ARGOS_LEE_LABS_DE_VERDAD — el asistente deja de estar ciego a los labs.
 *
 * QUÉ CONTROLA
 *  · ON (default) → el contexto de ARGOS arma su bloque de labs desde
 *    `lab_values` (la tabla canónica time-series) vía `loadLabsReport` +
 *    `construirHistorias` + `construirBloqueLabs`: todos los parámetros del
 *    expediente, con ventana funcional de la matriz V7/V6, serie por parámetro
 *    y fase del ciclo donde aplica.
 *  · OFF → vuelve el bloque previo, que leía `lab_results` con `.limit(1)`.
 *
 * POR QUÉ EXISTE
 *  El dueño preguntó, usando su propia app, qué hacer con un magnesio que
 *  lleva años saliendo bajo. ARGOS respondió que no podía ver ni un valor ni
 *  un histórico. Tenía 244 mediciones en 60 parámetros en la base.
 *
 *  La causa no era un filtro roto: era que el contexto miraba `lab_results`,
 *  una tabla ancha de once columnas fijas escritas a mano (vitamin_d, hba1c,
 *  ferritin, tsh, cholesterol_total, hdl, ldl, triglycerides, testosterone,
 *  estradiol, cortisol). Magnesio no es una de las once, así que la pregunta
 *  era literalmente incontestable. Y `.limit(1)` trae un solo estudio, o sea
 *  cero historia, cuando la pregunta era sobre una tendencia de años.
 *
 *  Medido con su expediente real: magnesio 1.97 contra una ventana funcional
 *  de 2.2 a 2.6, con cuatro mediciones desde 2023-09. Tenía razón, y el dato
 *  para dársela ya estaba guardado.
 *
 * LO QUE CUESTA
 *  1,740 tokens sobre un cerebro de ~26,000, o sea +6.7%, medido con los 244
 *  valores reales. Volcar la serie cruda habrían sido 5,610 (+21.6%). El
 *  recorte NO es "solo lo que está fuera de rango": eso reintroduce el bug con
 *  otra cara, porque un parámetro dentro de ventana volvería a ser invisible.
 *  Todos los parámetros aparecen por nombre; los 40 primeros traen serie.
 *
 * LO QUE ESTE FLAG NO ARREGLA
 *  Los rangos de la matriz que no cuadran de unidad con lo guardado en
 *  `lab_values` siguen igual de torcidos que en la pantalla de ATP Labs: la
 *  testosterona total del dueño está en ng/dL (993) contra una ventana de la
 *  matriz en ng/mL (7-12), así que se reporta "pide atención" sin serlo. Eso
 *  es un problema de conversión en el borde de escritura, es previo a este
 *  cambio y se arregla en otro lado. Aquí solo se hizo visible.
 *
 * CÓMO APAGARLO EN CALIENTE
 *  `false` aquí → `npx tsc --noEmit` → `eas update --branch preview`.
 *  Sin migración y sin build nativo: esto solo cambia de dónde se leen datos
 *  para armar un prompt. No escribe una sola fila.
 */
export const ARGOS_LEE_LABS_DE_VERDAD = true;

/**
 * LABS_UNIDADES_ALINEADAS — dejar de calificar un biomarcador contra una ventana
 * escrita en otra unidad.
 *
 * QUÉ CONTROLA
 *  · ON (default) → antes de comparar un valor de `lab_values` contra la ventana
 *    de la matriz V7/V6, el valor se lleva a la unidad de esa ventana (o la
 *    ventana se trae a la unidad del valor, según lo que se vaya a pintar). El
 *    registro de unidades y los factores viven en `lab-unidades-core.ts`.
 *  · OFF → se compara crudo, como antes de este cambio.
 *
 * POR QUÉ EXISTE
 *  `lab_values` guarda la testosterona total en ng/dL, que es como la reporta el
 *  laboratorio. El dueño tiene 993. La matriz escribe esa ventana en ng/mL: 7 a
 *  12 en hombres. Factor 100. El sistema calificaba una testosterona sana como
 *  "pide atención" en las tres superficies que leen labs (la pantalla de ATP
 *  Labs, el motor de Edad ATP y, desde ARGOS_LEE_LABS_DE_VERDAD, el contexto del
 *  asistente) y lo decía sin matices.
 *
 *  Un "no sé" se recupera. Un dato mal interpretado dicho con confianza manda a
 *  una persona a un consultorio, a un tratamiento o a preocuparse sin motivo.
 *
 * LO QUE NO ROMPE
 *  No escribe ni migra un solo valor guardado: lo que reportó el laboratorio se
 *  queda como está. No modifica la matriz. La conversión mira la magnitud además
 *  de la clave, así que es idempotente y respeta el histórico mezclado (hay
 *  filas viejas de captura manual que ya venían en ng/mL). Los fixtures de
 *  regresión del motor viven en unidad de matriz y no cruzan este borde: sus
 *  números no se mueven.
 *
 * LO QUE NO ALCANZA
 *  Las ventanas de la matriz que están mal por dentro (LDH con cuatro ventanas
 *  distintas, ácido úrico contradictorio entre dominios, ApoB con cortes fuera
 *  de orden, T3 libre etiquetada en ng/dL con bandas de pg/mL). Eso NO se toca
 *  desde código: está documentado en `PENDIENTES_MATRIZ` para quien firma la
 *  matriz.
 *
 * CÓMO APAGARLO EN CALIENTE
 *  `false` aquí → `npx tsc --noEmit` → `eas update --branch preview`.
 *  Sin migración y sin build nativo: solo cambia cómo se compara, no qué se guarda.
 */
export const LABS_UNIDADES_ALINEADAS = true;

/**
 * LABS_FICHA_POR_BIOMARCADOR — tocar un marcador entra a su ficha.
 *
 * QUÉ CONTROLA
 *  · ON (default) → en ATP Labs, tocar un renglón navega a `/edad-atp/lab/[key]`:
 *    tu número contra tu ventana, qué es el marcador, qué significa que TU valor
 *    haya caído donde cayó, qué altera la lectura del estudio, con qué otros
 *    marcadores se lee, tu historia y qué lo mueve.
 *  · OFF → vuelve el acordeón en línea de antes (gráfica + rangos + delta
 *    dentro de la lista), byte por byte. La ruta sigue existiendo pero nadie
 *    llega a ella desde la lista.
 *
 * POR QUÉ EXISTE
 *  El panel ya sabía cuántos marcadores piden atención. Lo que no existía era
 *  el lugar donde entender uno: la lista contestaba "cuántos" y nunca "qué
 *  significa el mío". Un acordeón con una gráfica no es una ficha.
 *
 *  Va detrás de bandera porque cambia el gesto principal de la pantalla, y una
 *  regresión de navegación en una app sin builds pendientes se paga cara. Con
 *  el flag en false se vuelve al comportamiento anterior sin tocar una línea de
 *  la pantalla.
 *
 * LO QUE NO HACE
 *  No escribe nada, no migra nada y no llama a ningún modelo. El contenido
 *  explicativo está escrito en el repo (`biomarcador-contenido.ts`) y todo lo
 *  personal se calcula con datos que ya estaban guardados. Abrir una ficha
 *  cuesta cero protones. Lo único que puede llamar a un modelo es el botón
 *  explícito de preguntarle a ARGOS, que es el chat de siempre con su costo de
 *  siempre y solo si la persona lo toca.
 *
 * CÓMO APAGARLO EN CALIENTE
 *  `false` aquí → `npx tsc --noEmit` → `eas update --branch preview`.
 *  Sin migración y sin build nativo.
 */
export const LABS_FICHA_POR_BIOMARCADOR = true;

/**
 * AUTH_RESPETA_EL_TEMA — el stack de auth deja de ser oscuro a la fuerza.
 *
 * QUÉ CONTROLA
 *  · ON → AuthScreen pinta su gradiente con los tokens del tema y
 *    abre <ThemeReady>, así que login, registro y recuperar-contraseña salen
 *    claros para quien eligió claro. EliteInput y EliteButton, que son el kit
 *    de esas tres pantallas, leen tokens en vez de constantes oscuras.
 *  · OFF → vuelve el gradiente fijo #0A0E14→#000, el StatusBar
 *    claro y el kit oscuro, byte por byte. Sin ThemeReady, `useSurfaceTokens`
 *    entrega THEME_DARK y los componentes rinden exactamente lo de hoy.
 *
 * POR QUÉ NACIÓ APAGADA Y POR QUÉ YA ESTÁ ENCENDIDA
 *  La implementación siempre estuvo completa. Lo que faltaba no era código: era
 *  que la marca se leyera en claro.
 *
 *  `assets/images/logo-horizontal-dark.png` es el único logo horizontal del
 *  repo, y su nombre no miente: está hecho para fondo oscuro. Medido pixel a
 *  pixel, la molécula es lima/teal (se vería bien sobre acero) pero el
 *  logotipo "ATP" son ~1,959 píxeles opacos en RGB 224+, o sea blanco. Sobre
 *  el fondo claro (#DBE2E7) eso da ~1.1 de contraste: la marca DESAPARECÍA, y
 *  ocupa el 22% del alto de la primera pantalla que ve quien acaba de pagar.
 *
 *  El diagnóstico viejo decía que no había salida por código porque los logos
 *  verticales son SVG y metro no tiene transformer. Era un diagnóstico
 *  incompleto: el repo YA tiene un canal para SVG sin transformer, el mismo del
 *  set de iconos — la geometría del asset se copia a un módulo de datos puros y
 *  `react-native-svg` (15.12.1, ya instalado) la monta. Eso es lo que hace
 *  `src/components/ui/brand/LogoVerticalATP.tsx`: un solo dibujo, el logotipo
 *  "ATP" por parámetro de color (#1d1d1b en claro, #fff en oscuro, los dos
 *  tomados de los assets oficiales `_N` y `_B`) y la molécula con sus cuatro
 *  degradados intactos. Ni tintColor aplanando la marca, ni placa oscura de
 *  parche, ni dependencia nueva.
 *
 * LO QUE QUEDÓ FUERA A PROPÓSITO
 *  El logo vertical trae vectorizado "ACTIVA TU ENERGÍA Y SALUD", que
 *  `docs/DESIGN_SYSTEM.md` declara firma de otra época con instrucción expresa
 *  de usar el logo sin firma hasta resolverlo con la autora del manual. Esos 21
 *  paths no se montan; la bajada sigue viviendo como TEXTO en la pantalla, que
 *  es donde se puede corregir con un commit.
 *
 * POR QUÉ LA DECISIÓN VIEJA YA NO SE SOSTIENE
 *  Había una decisión escrita en el encabezado de `app/login.tsx`: el flujo de
 *  auth quedaba oscuro en los dos modos "como la card editorial", hasta
 *  tematizarlo en su propio run. Esa decisión dejó de sostenerse, y no por
 *  gusto: el onboarding v2, sus nueve pasos, está terminado en tema claro sin
 *  un solo salto, y va INMEDIATAMENTE DESPUÉS del registro. Quien elige claro
 *  y acaba de pagar ve una pantalla negra, escribe su correo, y en el siguiente
 *  toque la app se vuelve clara. El salto cae justo en el peor momento del
 *  producto.
 *
 *  La comparación con la card editorial tampoco aplicaba. La card es oscura a
 *  propósito porque lleva foto de fondo y su velo es constante — hay tests que
 *  lo exigen. El stack de auth no lleva foto: era oscuro por alcance pendiente,
 *  no por doctrina. Ningún test protege AuthScreen, EliteInput ni EliteButton.
 *
 * RIESGO REAL, MEDIDO
 *  EliteInput tiene 3 consumidores y los 3 son de auth. EliteButton tiene 7:
 *  3 de auth y 4 fuera, de los cuales `components/empty-state.tsx`,
 *  `ExercisePicker` y `ScheduleModal` no los importa nadie. El único vivo,
 *  AssignRoutineModal, ya vive dentro de <ThemeReady> sobre `t.card`, que en
 *  claro ya es claro: ahí el cambio corrige un lima sobre acero que hoy está
 *  mal. El lima como RELLENO no se toca (identidad, y `textoSobreLima` es
 *  negro en los dos temas); el lima y el teal como LETRA sí se calibran, que
 *  es la regla 1 del manual 3.6.
 *
 * CÓMO MOVERLA EN CALIENTE
 *  Cambiar el booleano → `npx tsc --noEmit` → `eas update --branch preview`.
 *  Sin migración y sin build nativo, en los dos sentidos.
 */
export const AUTH_RESPETA_EL_TEMA = true;
