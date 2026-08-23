# Árbol de navegación de ATP

**Medido el 19 de agosto de 2026** contra `app/` y `src/constants/app-routes.generated.ts`,
en `main`, commit `6d08a97`. No copié un solo número de ningún documento.

## Cómo reproducirlo

Los scripts que lo generan viven en `/tmp/atp-nav/` de la sesión, no en el repo. La
clasificación es mecánica: un archivo de `app/` cuenta como **alias** si contiene
`<Redirect`, `router.replace(` o equivalente y mide 60 líneas o menos. Todo lo demás es
pantalla.

## Lo medido

| Qué | Cuánto |
|---|---|
| Archivos `.tsx` en `app/` | 203 |
| Layouts | 2 |
| **Pantallas reales** | **147** |
| **Alias y redirects** | **54** |
| Rutas únicas | 200 |
| Plantillas dinámicas | 10 |
| Grupos funcionales | 16 |

**El mapa que consume ARGOS no está desactualizado.** Cero rutas en `app/` que falten en
`APP_ROUTES`, cero rutas en el mapa que ya no existan en `app/`. Lo verifiqué en las dos
direcciones porque lo sospechaba, y la sospecha era falsa.

---

# EL HALLAZGO: el 27% del mapa de ARGOS es ruido

De las 200 rutas que ARGOS puede elegir, **54 no son pantallas: son alias que redirigen a
otra**. El resolvedor no tiene noción de canónico contra alias. La única excepción es un
caso escrito a mano (`argos-nav-resolver-core.ts:189`, para `/settings/comunidad` y
`/settings/cuenta`). Las otras 52 compiten en el ranking como si fueran destinos distintos.

**18 de esos alias apuntan a una pantalla que también está en el mapa**, o sea que hay
parejas confirmadas peleándose entre sí:

| Alias | Destino real |
|---|---|
| `/edad-atp/cinematic-tests-index` | `/tests` |
| `/edad-atp/questionnaires` | `/tests` |
| `/edad-atp/tests` | `/tests` |
| `/historia-clinica` | `/tests` |
| `/quizzes` | `/tests` |
| `/salud/mis-evaluaciones` | `/tests` |
| `/biblioteca` | `/my-routines` |
| `/fitness-my` | `/fitness-hub` |
| `/fitness-train` | `/fitness-hub` |
| `/fitness-cardio` | `/log-cardio` |
| `/health-hub` | `/salud` |
| `/perfil` | `/settings` |
| `/settings/cuenta` | `/settings` |
| `/progreso` | `/fitness-strength` |
| `/my-chronotype` | `/tests/resultado/cronotipo` |
| `/reset-password` | `/forgot-password` |
| `/edad-atp/cognitive` | `/edad-atp/tests/reaction-time` |
| `/settings/comunidad` | `/comunidad/ajustes` |

Léelo en voz alta: **seis rutas distintas van a `/tests`**. Cuando alguien le dice a ARGOS
"llévame a mis evaluaciones", el resolvedor tiene seis candidatos que llevan al mismo
lugar, con descripciones parecidas, repartiéndose la puntuación entre ellos. Esa es una
causa mecánica y verificable de que la orbe a veces mande a la pantalla equivocada, y no
requiere culpar al modelo.

Los otros 36 alias no pude resolverles el destino leyendo el archivo estático: lo calculan
en tiempo de ejecución. Están listados abajo, por grupo, marcados.

## Qué haría, y no lo hago sin tu visto bueno

**Marcar el alias en el generador, no borrarlo.** Que `gen-mapa-rutas.js` emita una lista
`APP_ROUTES_ALIAS` y que el resolvedor le baje el peso o los excluya del ranking. Los
alias siguen vivos como enlaces profundos (una notificación vieja puede estar usándolos),
pero dejan de competir.

Lo que **no** haría a 13 días del lanzamiento es borrar las 54 rutas. Cada una puede ser
un enlace profundo que alguien ya tiene guardado.

---

# EL ÁRBOL

## OTROS  ·  29 pantallas, 8 alias

- `/checkin` — Check-in emocional — Reconocer → Etiquetar → Entender (MB-15 · plano 12x12). La puerta de entrada es EL PLANO 12x12: la posición es el significado
- `/cocina` — /cocina — recetas, lista y preferencias bajo un techo (OLA3 · Anexo D §1). Eran cuatro rutas sueltas (my-recipes, argos-recipes, lista-compra,
- `/dev` — DEV Tools — menú de herramientas internas (Step COACH 7.1/N). Accesible vía router.push('/dev'). Lista las pantallas de validación/debug.
- `/dev/goal-tree-smoke` — Goal Tree LLM Smoke Test (DEV) — Step COACH 7/N. Pantalla de desarrollo para validar manualmente que GoalTree.decomposeGoal
- `/economy/admin` — MI PROGRESO — rango, electrones, logros e historial. PREMIUM (16-ago-2026): esta pantalla era mitad progreso y mitad cajero. Se
- `/economy/history` — Historial de electrones — qué ganó la persona y cuándo. PREMIUM (16-ago-2026): tenía dos pestañas, E- y H+, y abría en H+. Se quitó
- `/feedback-dashboard` — Feedback Dashboard — Vista admin para gestionar reportes de testers. Solo accesible por admin (90a55e74-...).
- `/ficha-emergencia` — /ficha-emergencia — modo pantalla. La ficha para quien te auxilia. OLA6 PIEZA D. Vive en la raíz, fuera de /salud y fuera de cualquier sesión,
- `/glucose-log` — Glucose Log — Registro de glucosa en sangre con contexto y rangos visuales. Permite registrar valor mg/dL, contexto (ayuno/pre/post/random/bedtime),
- `/history` — Historial de Sesiones — Lista cronológica de execution_logs agrupada por fecha, con cards premium por modo (timer/rutina).
- `/hydration` — Hidratación — Registro de agua con meta diaria, botones rápidos y barra de progreso.
- `/ketones-log` — Ketones Log — Registro de cetonas de 3 fuentes (#113, MB-8): sangre (β-hidroxibutirato mmol/L) · aliento (acetona ppm) · orina (cualitativa).
- `/kit` — La sala ATP (MB-19 PIEZA 2) — el lanzador. Sin carpetas: secciones. Las apps caben en un scroll, y una carpeta cobraría
- `/legal/aviso` — Sprint Compliance 2 — Aviso de Privacidad Integral (staging in-app).
- `/legal/terminos` — Sprint Compliance 2 — Términos y Condiciones (staging in-app).
- `/medidas` — Medidas (MB-27 Pieza 1) — la app de peso y medidas del usuario. Desbloquea \"Bajar grasa\": el pack cuyo resultado no se podía ver. Lee la
- `/mobility-assessment` — Evaluación de Movilidad (MB-3.6 Bloque 2) — captura GUIADA real de los 7 tests que persiste mobility_assessments (antes: placeholder de 50 líneas).
- `/my-health` — Mi Salud — Cliente sube estudios de laboratorio y ve resultados.
- `/night-filter` — MB-30B Pieza 1 — Filtro nocturno de sistema. Android: overlay real encima de TODO el teléfono (tipo Twilight), con
- `/notifications` — /notifications (AGENDA-COMPLETE F3) — inbox de notificaciones in-app. Historial de user_notifications (recordatorios de agenda + futuros tipos) con marcar
- `/nutrition` — Nutrición Hub — navegación del pilar, no tablero (OLA3 · Anexo D §1). loadData hacía 5 lecturas que computeAndSaveDailyScore YA hacía por su
- `/ordenar-dia` — Ordenar mi día (MB-26 Pieza 4) — la salida al desmadre. Tres caminos, uno por pantalla: empezar de cero (todo a reposo),
- `/plan-entrenamiento` — Mi plan de entrenar (MB-27 Pieza 2) — el usuario dice UNA vez qué días entrena qué, y Entrenar le contesta \"hoy te toca X\".
- `/profile` — Perfil — identidad del usuario: nombre, fecha de nacimiento (calcula edad cronológica), sexo biológico. Accesible desde el header de YO (Mariana #1:
- `/redeem-code` — TENGO UN CÓDIGO — canje de códigos de activación (MB-13 · PIEZA 1). Para el founder que pagó en la web, el invitado o la cortesía de soporte.
- `/routine-generator` — Routine Generator — 3 puertas sobre el motor determinista (MB-3 Track F; INTERVALOS desde Ola 2 Fitness PR2, ANEXO_B_FITNESS §1).
- `/session` — /session — runner UNIFICADO de entrenamiento (Ola 2 Fitness PR1; ex strength-session, MB-3 Tracks D+E+F). /strength-session queda como alias
- `/solar` — ATP SOL — Exposición solar consciente. Filosofía:
- `/strength-session` — Alias permanente de /session (Ola 2 Fitness PR1, ANEXO_B_FITNESS §5). La ruta vieja sigue viva y rinde el mismo runner con los mismos params:

  Alias y redirects de este grupo:

  - `/biblioteca` → `/my-routines`
  - `/cardio-import` → `/log-cardio?fase=importar`
  - `/execution` → _destino no legible en estático_
  - `/functional-quiz` → _destino no legible en estático_
  - `/my-chronotype` → `/tests/resultado/cronotipo`
  - `/my-recipes` → _destino no legible en estático_
  - `/progreso` → `/fitness-strength`
  - `/shared-routine` → _destino no legible en estático_

## EDAD ATP  ·  20 pantallas, 11 alias

- `/edad-atp` — Edad ATP — Hub de captura de datos (Sprint 2, MVP manual). MB-11 D.4: entrada del módulo al molde editorial — hero con imagen
- `/edad-atp/biomarkers` — Edad ATP — biomarcadores. MEGA COMPLETION (auto-prepopulation). NO muestra una forma vacía: separa \"✓ Disponibles\" (ya en tu expediente,
- `/edad-atp/composition` — Edad ATP — composición corporal. Sprint 2.5 (integración). Pre-puebla desde health_measurements (tabla canónica) y guarda ahí mismo —
- `/edad-atp/lab-confirmation` — Capa 4 del parser v2 — pantalla de confirmación pre-guardado. Tras extraer (sin guardar), el usuario VE todos los valores detectados con su estado
- `/edad-atp/lab/[key]`  ⚠️ **sin descripción para ARGOS**
- `/edad-atp/labs` — ATP Labs — vista CANÓNICA de laboratorios (fuente de verdad `lab_values`). Lista los parámetros con su último valor, agrupados por categoría de la matriz (#13), con filtros
- `/edad-atp/questionnaires/cardiovascular` — Cuestionario Cardiovascular. Copy MVP — // TODO Mariana Sprint 5: validar.
- `/edad-atp/questionnaires/habitos` — Cuestionario Hábitos. Copy MVP — // TODO Mariana Sprint 5: validar.
- `/edad-atp/questionnaires/inflamacion` — Cuestionario Inflamación. Copy MVP — // TODO Mariana Sprint 5: validar.
- `/edad-atp/questionnaires/inmunidad` — Cuestionario Inmunidad. Copy MVP — // TODO Mariana Sprint 5: validar.
- `/edad-atp/questionnaires/metabolismo` — Cuestionario Metabolismo. Copy MVP — // TODO Mariana Sprint 5: validar.
- `/edad-atp/questionnaires/renal-micronutrientes` — Cuestionario Renal y micronutrientes. Copy MVP — // TODO Mariana Sprint 5: validar.
- `/edad-atp/questionnaires/sistema-hormonal` — Cuestionario Sistema hormonal. Copy MVP — // TODO Mariana Sprint 5: validar (incl. preguntas específicas por sexo + fase del ciclo en mujeres).
- `/edad-atp/questionnaires/sueno` — Cuestionario Sueño. Copy MVP — // TODO Mariana Sprint 5: validar.
- `/edad-atp/questionnaires/vitalidad` — Cuestionario Vitalidad. Copy MVP — // TODO Mariana Sprint 5: validar.
- `/edad-atp/result-preview` — Edad ATP — pantalla de resultado. MEGA COMPLETION (Sprint 3 UIUX). Lee TODAS las fuentes vía el orquestador, reproduce la cinemática la primera vez
- `/edad-atp/sub-edad/[key]`  ⚠️ **sin descripción para ARGOS**
- `/edad-atp/tests/balance` — Tests funcionales — FORMULARIO de captura (doctrina \"SIMPLE vence inteligente\"): cada test se auto-administra fuera de la app con un reloj/cronómetro de mano y aquí
- `/edad-atp/tests/reaction-time` — Test funcional — Cognición (Der & Deary 2006): Simple RT + Choice 4-AFC + Go/No-Go. Mide ms de respuesta (+ tasa de errores en Go/No-Go) y guarda en
- `/edad-atp/vitals` — Edad ATP — mediciones puntuales (vitals). Sprint 2.5 (integración). Pre-puebla desde health_measurements y guarda ahí mismo (tabla canónica).

  Alias y redirects de este grupo:

  - `/edad-atp/cinematic-tests-index` → `/tests`
  - `/edad-atp/cognitive` → `/edad-atp/tests/reaction-time`
  - `/edad-atp/questionnaires` → `/tests`
  - `/edad-atp/test-bolt` → `/tests/run/bolt`
  - `/edad-atp/test-old-man` → `/tests/run/old-man`
  - `/edad-atp/test-plank` → `/tests/run/plank`
  - `/edad-atp/test-recovery-hr` → `/tests/run/recovery-hr`
  - `/edad-atp/tests` → `/tests`
  - `/edad-atp/tests/chronotype` → `/tests/q/cronotipo`
  - `/edad-atp/tests/cooper` → `/tests/run/cooper`
  - `/edad-atp/tests/push-ups` → `/tests/run/push-ups`

## SALUD  ·  17 pantallas, 7 alias

- `/clinical-system` — Drill-down de sistema funcional — Historia Clínica (F3 sprint UX blockers V1.3). Ruta: /clinical-system?system=<FunctionalSystemKey>
- `/health-input` — Health Input — Formulario de evaluación de salud con secciones colapsables.
- `/historia-clinica/[category]`  ⚠️ **sin descripción para ARGOS**
- `/labs-guide` — Guía de Laboratorios — pantalla in-app (Sprint LABS GUÍA DESCARGABLE T2/T3). Renderiza la guía completa desde constants (usable sin PDF) + botón para
- `/protocol-explorer` — ProtocolExplorer — Pantalla donde el cliente explora y activa plantillas de protocolos. Muestra protocolos activos del usuario y la galería de plantillas públicas.
- `/salud` — Tab SALUD — hero de Edad ATP y las cuatro secciones. OLA6 PIEZA B: el contenido vive en SaludHub y esta es su ÚNICA montura.
- `/salud/diagnostico` — Card A — \"Mi Diagnóstico Funcional\" (DX+Intervenciones F2). Documento VIVO y versionado: nivel de calidad 1-5, \"qué te falta\" para subir,
- `/salud/ficha-emergencia` — /salud/ficha-emergencia — la ficha que lee alguien más. OLA6 PIEZA D. Toda la pantalla obedece a una sola escena: estás en el piso,
- `/salud/intervenciones` — Intervenciones (dx-f3) — \"Mi Protocolo\" completo + \"Sugeridas para ti\". Mi Protocolo = activas (completar hoy + pausar). Sugeridas = output del motor
- `/salud/intervenciones/[key]`  ⚠️ **sin descripción para ARGOS**
- `/salud/intervenciones/rationale` — ¿POR QUÉ ESTAS INTERVENCIONES? — narrativa ARGOS (Megabuzón 2da pasada B.4). PREMIUM (16-ago-2026): costaba 280 H+ y era gratis solo para Pro. Esa
- `/salud/mi-expediente` — MI EXPEDIENTE — timeline cronológico del registro epigenético (Mega-Sprint B · B5). Eje temporal que cruza síntomas (inicio/fin), intervenciones activadas, labs y
- `/salud/mi-lectura` — CÓMO TE LEO — la lectura del expediente (NOCHE-3). QUÉ ES Y QUÉ NO ES.
- `/salud/mis-datos` — MIS DATOS — destino ÚNICO de todo dato numérico de salud (Mega-Sprint B · B2). Consolida lo que estaba disperso en 8 pantallas / 2 árboles (health-input,
- `/salud/mis-sintomas` — MIS SÍNTOMAS — destino ÚNICO del síntoma (Mega-Sprint B · B3). Absorbe las 3 superficies viejas (sintomas.tsx sueltos + clinical-system.tsx
- `/salud/padecimientos` — Padecimientos (SALUD F5) — registro ligero de condiciones + episodios (recurrencia). Modelo normalizado de la migración 173: padecimiento = definición de la
- `/salud/sintomas` — Síntomas Aislados (SALUD F5) — quick-tap de síntomas sueltos, peso BAJO en el DX. Chips de síntomas frecuentes de medicina funcional + input libre, severidad

  Alias y redirects de este grupo:

  - `/health-hub` → `/salud`
  - `/historia-clinica` → `/tests`
  - `/salud/cuestionario-maestro` → `/tests/q/maestro`
  - `/salud/evolucion` → _destino no legible en estático_
  - `/salud/expediente` → _destino no legible en estático_
  - `/salud/hoy` → _destino no legible en estático_
  - `/salud/mis-evaluaciones` → `/tests`

## ENTRADA  ·  13 pantallas, 1 alias

- `/forgot-password` — Pantalla de recuperación de contraseña. Envía un email con enlace de reset vía Supabase Auth.
- `/login` — Pantalla de Login — Entry point de la app. Branding ELITE + campos de email/password + links a registro y recuperación.
- `/onboarding/v2/chronotype` — Onboarding v2 — Paso 5: Cronotipo rápido (5 preguntas, scoring portado del quiz v1). Guarda lion/bear/wolf/dolphin + horarios en user_chronotype
- `/onboarding/v2/consent` — Onboarding v2 — Paso 8: Consentimiento médico + disclaimers. (Decía \"Paso 6\": el número real lo manda V2_STEPS, no este comentario.)
- `/onboarding/v2/cycle` — Onboarding v2 — Paso 4: Modalidad de Ciclo (task #111). Opciones según sexo biológico (capturado en el paso 2):
- `/onboarding/v2/goal` — Onboarding v2 — Paso 3: Objetivo principal (5 opciones del spec: longevidad / composición / energía / deporte / preparación).
- `/onboarding/v2/notifications` — Onboarding v2 — Paso 7: Permiso de notificaciones (explicación clara ANTES del prompt del sistema). Al terminar (con o sin permiso) el onboarding se
- `/onboarding/v2/positioning` — Onboarding v2 — Paso 2: Posicionamiento (Sprint Compliance 4). Versión PRECISA del posicionamiento (POSICIONAMIENTO_MASTER §2, citada en
- `/onboarding/v2/privacy` — Onboarding v2 — Paso 3: Muro de consentimiento (Sprint Compliance 2). (Decía \"Paso 2\": V2_STEPS lo mueve a 3 desde que entró `positioning`.)
- `/onboarding/v2/profile` — Onboarding v2 — Paso 2: Perfil base (sexo biológico, fecha de nacimiento, altura y peso). Los 4 son obligatorios: alimentan Edad ATP desde el día 1.
- `/onboarding/v2/welcome` — Onboarding v2 — Paso 1: Bienvenida (nombre; la foto se agrega después en Perfil — decisión de criterio: no meter picker/upload en el primer paso).
- `/onboarding/voice-config` — Onboarding — Voice Config (paso 9). Wizard auto-advance de 16 preguntas que pueblan `coach_voice_config`.
- `/register` — Pantalla de Registro — Crear cuenta nueva. Campos: nombre completo, email, password, confirmar password.

  Alias y redirects de este grupo:

  - `/reset-password` → `/forgot-password`

## MENTE  ·  12 pantallas, 7 alias

- `/breathing` — Respiración — Timer con animación de círculo expandible/contractible. Ciclos de inhala/retén/exhala con visualización.
- `/emotions` — EMOCIONES — el módulo como módulo (MB-10 · Track H.1). Deja de ser una pantalla suelta colgada de HOY: un solo lugar donde viven
- `/journal` — Journal — Escritura reflexiva con 4 tipos: Gratitud, Visión, Estoico, Descarga. Selector de tipo + formulario específico + mood tracking + historial.
- `/meditation` — Meditación — destino consolidado del pilar (Overhaul A2 + Ajuste 2). Un solo destino con secciones internas del catálogo `audio_pieces`:
- `/mente/nback` — N-Back — home del módulo (norte UX: referencia de Enrique, piel ATP). Week-strip · card Reto 20 días · card Hoy 0/12 con EMPEZAR SESIÓN ·
- `/mente/nback/como-jugar` — N-Back — cómo jugar (tutorial; primera vez es la puerta obligada a la sesión con N=1 forzado — decisión #44-1).
- `/mente/nback/personalizar` — N-Back — Personalizar (V1.5 #C7): toda la config del módulo agrupada fuera de la home (que queda de foco). Client-only vía AsyncStorage
- `/mente/nback/saber-mas` — N-Back — Saber más (artículo in-app). Contenido: R and D/ARTICULO_NBACK_SABER_MAS.md — voz ATP directa y
- `/mente/nback/sesion` — N-Back — sesión activa (norte UX: referencia de Enrique). Countdown (¿Listo? / En posición. / ¡Va!) → gameplay full-black (grid 3×3
- `/mente/player` — Sprint Audio Mente — Player de audio del pilar Mente. Portada full-bleed + título + controles (play/pause, scrubber con seek,
- `/sleep` — Sueño (#15 Batch 2) — pantalla editorial propia del descanso. Antes SUEÑO caía en /reports (hub genérico) o /health-hub. Esta pantalla se ve
- `/sleep-session` — Sesión nocturna del Sleep Cycle (MB-30A · Pieza 1). El modelo: la app abierta toda la noche en el buró, teléfono cargando,

  Alias y redirects de este grupo:

  - `/emotion-exploration` → `/checkin?mode=explore`
  - `/emotion-history` → `/reports/emociones`
  - `/emotion-navigation` → _destino no legible en estático_
  - `/emotion-profile` → `/reports/emociones?section=perfil`
  - `/journal-history` → `/reports/journal`
  - `/mente/nback/stats` → `/reports/nback`
  - `/mente/progreso` → `/reports/adherencia?tab=rachas`

## AJUSTES  ·  10 pantallas, 3 alias

- `/settings` — AJUSTES — hub principal. SIMPLE (17-ago-2026). Ajustes se había vuelto el basurero: adentro vivían un
- `/settings/conexiones` — AJUSTES › CONEXIONES (#137) — coach, atletas, wearables y afiliados. (Movido del monolito: secciones CONECTAR CON COACH + SOY COACH + DISPOSITIVOS.)
- `/settings/dev` — AJUSTES › DEVELOPER (#137) — solo __DEV__ o admins (founders/team).
- `/settings/experiencia` — AJUSTES › EXPERIENCIA (#137) — tema, idioma, unidades, voz, sonidos, vibración, pantalla y zona de prueba. (Antes: 6 secciones del monolito.)
- `/settings/legal` — Settings > Legal (#42) — documentos legales y disclaimers médicos. Links a Privacy Policy / Terms (somosatp.com) + re-lectura del modal de
- `/settings/notifications` — Settings > Notificaciones (#61) — control granular: modos (standard / adaptive ARGOS / silent), toggles por tipo,
- `/settings/privacy` — Settings > Privacidad (#132 Privacy Fase B) — control total del usuario: A) Consent toggles (user_consent, migración 100)
- `/settings/salud` — AJUSTES › SALUD Y PROTOCOLO — nivel de entrenamiento, nutrición, ciclo y la densidad del hub de SALUD.
- `/settings/salud-conexion` — AJUSTES › CONEXIONES › SALUD DEL TELÉFONO (NOCHE-1). Aquí se conecta, se ve QUÉ entra, y se desconecta. Vive colgada de
- `/settings/subscription` — AJUSTES › MEMBRESÍA — estado, renovación, gestión e historial. PREMIUM (16-ago-2026): una sola membresía. Se fueron el nombre del plan, el

  Alias y redirects de este grupo:

  - `/perfil` → `/settings`
  - `/settings/comunidad` → `/comunidad/ajustes`
  - `/settings/cuenta` → `/settings`

## FITNESS  ·  8 pantallas, 5 alias

- `/builder` — Builder — Editor visual de rutinas con bloques anidados. Permite crear y editar rutinas con estructura jerárquica de bloques:
- `/exercise-detail` — Exercise Detail — ficha del ejercicio matriceado (MB-3 Track F). Hero con poster + los 11 ejes legibles: músculos, equipo, patrón, dinámica,
- `/exercise-library` — Exercise Library — biblioteca MATRICEADA (MB-3 Track F · MB-3.5 #9). 214 ejercicios del catálogo exercise_matrix con buscador arriba + filtros por
- `/fitness-hub` — Fitness Hub (MB-3.6 Bloque 1.2) — el hub abre con LA SESIÓN DE HOY. Patrón Oura \"one big thing\": un solo protagonista — qué toca hoy, cuánto
- `/fitness-strength` — Fuerza (MB-3.6 Bloque 1.1) — FUSIÓN de fitness-strength + personal-records. Antes eran dos pantallas girando sobre el mismo dato (PRs/benchmarks) — un
- `/log-cardio` — Log Cardio (MB-3.6 Bloque 3.1) — la casa COMPLETA del cardio (Ola 2 Fitness PR2, ANEXO_B_FITNESS §1): registro manual ULTRA-fácil + PRs por
- `/log-strength` — Log Strength — registro RETRO de fuerza en 3 pasos (Ola 2 Fitness PR2, ANEXO_B_FITNESS §3; ex /log-exercise, adelgazado).
- `/my-routines` — Mis Rutinas — Lista de rutinas guardadas del usuario. Muestra todas las rutinas (timer + routine) con nombre, modo, # bloques y fecha.

  Alias y redirects de este grupo:

  - `/fitness-cardio` → `/log-cardio`
  - `/fitness-hiit` → `/routine-generator?puerta=intervalos`
  - `/fitness-my` → `/fitness-hub`
  - `/fitness-train` → `/fitness-hub`
  - `/log-exercise` → _destino no legible en estático_

## TRIBU  ·  7 pantallas, 0 alias

- `/comunidad/ajustes` — TRIBU › MI PERFIL PÚBLICO — visibilidad granular del perfil público + username + bridge Skool. Persiste en user_profile_public (mig 177) al momento.
- `/comunidad/amigos` — Comunidad › Amigos (C2) — solicitudes pendientes + lista de amigos. Fuente: list_pending_requests / list_friends / respond_friend_request (184).
- `/comunidad/animo` — Comunidad › Ánimo de tu gente (MB-4 · Bloque 4). Acompañamiento, no competencia: cada card es alguien que ELIGIÓ compartir
- `/comunidad/buscar` — Comunidad › Buscar personas (C2) — búsqueda con debounce + agregar amigos. Espejo del servidor: mínimo 2 caracteres y rate limit 20/60s (search_users v2,
- `/comunidad/perfil/[userId]`  ⚠️ **sin descripción para ARGOS**
- `/comunidad/ranking` — Comunidad › Ranking (C4) — leaderboard top 20 + tu posición destacada. Copy \"Comunidad, no competencia\": el ranking celebra la constancia, no compite
- `/tribu` — Tab TRIBU (MB-19 PIEZA 4) — la casa de la comunidad. Antes se llegaba por una card dentro de Mi ATP, que este run convirtió en la

## TESTS  ·  6 pantallas, 3 alias

- `/braverman` — Test de Braverman — Evaluación clínica de neurotransmisores. 313 preguntas V/F divididas en 2 partes (dominancia + deficiencias).
- `/braverman-premium` — REPORTE PREMIUM ARGOS — Braverman (#90, #143). PREMIUM (16-ago-2026): costaba 1,000 H+ y ahora viene incluido. Se cayó la
- `/tests` — TESTS — hub único de evaluaciones (Ola 4, Anexo C, pieza 2). Absorbe seis hubs que hoy muestran lo mismo desde ángulos distintos:
- `/tests/q/[id]`  ⚠️ **sin descripción para ARGOS**
- `/tests/resultado/cronotipo` — Mi Cronotipo — la vista de TU cronotipo, no el test crudo. Ola 4, pieza 5: se mudó de /my-chronotype a /tests/resultado/cronotipo, que
- `/tests/run/[id]`  ⚠️ **sin descripción para ARGOS**

  Alias y redirects de este grupo:

  - `/quiz-take` → _destino no legible en estático_
  - `/quiz/chronotype` → `/tests/q/cronotipo`
  - `/quizzes` → `/tests`

## NEGOCIO  ·  5 pantallas, 0 alias

- `/afiliados/aplicar` — Afiliados — Aplicación (#47 fase 1). Formulario de alta como afiliado (INSERT en affiliates status=pending, backend migración 101 Cowork).
- `/afiliados/dashboard` — Afiliados — Dashboard (#47 fase 1). Solo afiliados aprobados: wallet, referidos, comisiones, código con copiar/compartir, gráfica de referidos
- `/afiliados/mi-codigo` — Afiliados — Mi código (#47 fase 1). Código único + preview del landing que verán los invitados (somosatp.com/[codigo] — web, fase posterior) +
- `/atp-orden` — Mi orden (MB-19 PIEZA 2) — la pantalla que edita el orden \"Mío\" de la sala ATP. Con una LISTA, no arrastrando. Subir, bajar y fijar arriba resuelven el 100%
- `/paywall` — PAYWALL — editorial ATP (negro + lima). PREMIUM (16-ago-2026): UNA membresía. Se acabaron Base y Pro, se acabó el

## ARGOS  ·  4 pantallas, 1 alias

- `/argos` — N1 — ARGOS como tab inferior. Re-exporta la pantalla de chat existente (app/argos-chat.tsx) sin duplicar lógica. La ruta /argos-chat sigue válida para deep links existentes.
- `/argos-chat` — ARGOS Chat — pantalla orquestadora (MB-21 Pieza 4). Era un archivo de 800 líneas con estilos a mano y hex crudos. Ahora:
- `/argos/conversations` — ARGOS — Historial de conversaciones (F2.2 #93 · MB-21 Pieza 3). Lo que lo vuelve usable con cincuenta conversaciones: grupos por fecha
- `/argos/meet` — Meet ARGOS — primer contacto post-onboarding (T6 MAGIA ARGOS · T1 ONBOARDING épico). Secuencia cinemática de 5 pantallas (Propuesta A, guion en

  Alias y redirects de este grupo:

  - `/argos-recipes` → _destino no legible en estático_

## CENTRO  ·  4 pantallas, 0 alias

- `/centro` — El Centro ATP (MB-22 Pieza 2) — el instalador y configurador de apps. Todas las funciones de la app, agrupadas por sección, estilo Ajustes de
- `/centro/[appKey]`  ⚠️ **sin descripción para ARGOS**
- `/packs/[packKey]`  ⚠️ **sin descripción para ARGOS**
- `/packs/armar` — Ármala por mí — la entrada de dos preguntas (MB-25 Pieza 3, en etapas desde MB-26 Pieza 7).

## HOY  ·  4 pantallas, 0 alias

- `/` — HOY = TAREAS — tu checklist del día. Fin. Nada más. (MB-20 Pieza 1) Usa compileDay() como única fuente de datos. Estructura:
- `/` — HOY = TAREAS — tu checklist del día. Fin. Nada más. (MB-20 Pieza 1) Usa compileDay() como única fuente de datos. Estructura:
- `/agenda` — /agenda (#v13h — rediseño editorial) — ventana dependiente de HOY: timeline de eventos del día como mini-cards horizontales. Fondo gradient vertical + header editorial (título grande + fecha
- `/hoy-habitos` — Mis hábitos del HOY (MB-12 · E-3) — la puerta perdida de los electrones. Aquí el usuario decide qué hábitos booleanos y cuantitativos trackea su

## NUTRICION  ·  3 pantallas, 6 alias

- `/fasting` — Ayuno — Rediseño estilo ZERO. 3 estados: IDLE (selector + preview), ACTIVE (ring timer + zonas), HISTORY.
- `/food-log` — /food-log — la captura unificada (OLA3 · Anexo D §1). Un solo eje distinguía a food-text, food-scan y food-barcode: el SENSOR.
- `/supplements` — Suplementos — REGISTRO personal con tracking, agrupado por momento del día. Doctrina (Sprint SUPS+BHA): suplementos son REGISTRO, no recomendación.

  Alias y redirects de este grupo:

  - `/food-barcode` → _destino no legible en estático_
  - `/food-preferences` → _destino no legible en estático_
  - `/food-register` → _destino no legible en estático_
  - `/food-scan` → _destino no legible en estático_
  - `/food-text` → _destino no legible en estático_
  - `/lista-compra` → _destino no legible en estático_

## REPORTES  ·  3 pantallas, 0 alias

- `/progress` — Mi Progreso — Resumen mensual, gráficas de frecuencia/volumen semanal, y lista de PRs recientes.
- `/reports` — Reports — Hub de reportes en GradientCard: Identidad, Calendario de adherencia, Electrones, Nutrición, Hidratación, Ayuno, Ejercicio, Glucosa,
- `/reports/[dominio]`  ⚠️ **sin descripción para ARGOS**

## CICLO  ·  2 pantallas, 2 alias

- `/cycle` — Ciclo Menstrual — Hub principal de tracking. Muestra fase actual, calendario interactivo mensual, modal de registro
- `/cycle-settings` — Cycle Settings — Configuración del tracking de ciclo.

  Alias y redirects de este grupo:

  - `/cycle-charts` → `/reports/ciclo?tab=graficas`
  - `/cycle-history` → `/reports/ciclo?tab=ciclos`

---

# Nota sobre las 10 sin descripción

Las diez pantallas marcadas sin descripción son las plantillas dinámicas
(`/tests/q/[id]`, `/reports/[dominio]`, `/packs/[packKey]`, etcétera). **No es un hueco:**
su superficie de búsqueda vive aparte, en `argos-nav-dinamicas-core.ts`, que las expande a
destinos reales con su propio título. Lo verifiqué antes de reportarlo como problema,
porque a primera vista parecía uno.
