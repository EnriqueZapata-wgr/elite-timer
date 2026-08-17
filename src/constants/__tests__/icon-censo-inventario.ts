/**
 * Inventario del censo de iconos (MB-19.2, ampliado en NOCTURNO A2) — generado
 * del árbol real con la misma lógica del test.
 *
 * Cada entrada es un USO directo de un glifo de función auditado como chrome o
 * contenido de su propio dominio (no dibuja la función del registro en un
 * lanzador). Formato: 'archivo::glifo' = 1 uso; 'archivo::glifo::xN' = N usos.
 * El test icon-censo compara el árbol contra esta lista EXACTA:
 *   · aparece un uso nuevo → o pasa por <AppIcon> o se agrega aquí, a conciencia.
 *   · desaparece un uso → se poda de aquí (el inventario no arrastra muertos).
 *
 * La divergencia de mente-streaks-core.ts (sparkles/journal/leaf-outline
 * dibujando categorías de Mente) murió en NOCTURNO-FIX P6: migrada a nombres
 * lógicos como su gemelo mente-hub-core.ts (NOCTURNO A3). Ambos archivos están
 * ahora en REGISTRY_FILES_SIN_IONICON: no pueden recaer.
 */
export const GLYPH_INVENTORY: readonly string[] = [
  // (los grid/pulse-outline del tab bar murieron con el montaje del set SVG:
  // las cuatro salas dibujan con <AppIcon name="tab-*">)
  'app/(tabs)/index.tsx::checkbox-outline',
  // MB-26 P4: CTA quiet "Ordenar mi día" — chip de acción, no lanzador.
  'app/(tabs)/index.tsx::sparkles-outline',
  'app/agenda.tsx::calendar-outline',
  // MB-21 P3: "Que ARGOS proponga uno" (renombrar) — chip de acción, no lanzador.
  'app/argos/conversations.tsx::sparkles-outline',
  'app/breathing.tsx::cloud-outline',
  'app/breathing.tsx::leaf-outline',
  'app/breathing.tsx::moon-outline',
  'app/breathing.tsx::pulse-outline',
  'app/breathing.tsx::snow-outline',
  'app/builder.tsx::barbell-outline',
  'app/builder.tsx::eye-outline',
  'app/builder.tsx::timer-outline',
  // MB-26 P4: fila "Ordenar mi día" en el Centro — chip de acción, no lanzador.
  'app/centro/index.tsx::sparkles-outline',
  'app/comunidad/amigos.tsx::pulse-outline',
  'app/comunidad/perfil/[userId].tsx::hourglass-outline',
  'app/cycle.tsx::analytics-outline',
  'app/cycle.tsx::calendar-outline',
  'app/cycle.tsx::heart-circle-outline',
  'app/cycle.tsx::leaf-outline',
  'app/cycle.tsx::medical-outline',
  'app/cycle.tsx::moon-outline',
  'app/cycle.tsx::restaurant-outline',
  'app/cycle.tsx::settings-outline',
  'app/cycle.tsx::sunny-outline',
  'app/cycle.tsx::water',
  'app/cycle.tsx::water-outline::x3',
  'app/economy/admin.tsx::trophy-outline',
  'app/edad-atp/biomarkers.tsx::document-text-outline',
  'app/edad-atp/index.tsx::barbell-outline',
  'app/edad-atp/index.tsx::document-text-outline',
  'app/edad-atp/index.tsx::flask-outline',
  'app/edad-atp/index.tsx::list-outline',
  'app/edad-atp/index.tsx::water-outline',
  'app/edad-atp/lab-confirmation.tsx::calendar-outline',
  'app/edad-atp/lab-confirmation.tsx::document-outline',
  'app/edad-atp/lab-confirmation.tsx::hourglass-outline',
  'app/emotions.tsx::pulse-outline',
  'app/exercise-detail.tsx::barbell',
  'app/exercise-library.tsx::barbell-outline',
  'app/fasting.tsx::hourglass-outline',
  'app/fasting.tsx::timer-outline',
  // Ola 2 Fitness PR2: el hub absorbe los secundarios de fitness-train y
  // fitness-my (mismos glifos de siempre; trophy-outline murió con la fila
  // "Mi Fitness" — ahora las retrospectivas tienen filas propias).
  'app/fitness-hub.tsx::barbell-outline',
  'app/fitness-hub.tsx::body-outline',
  'app/fitness-hub.tsx::book-outline',
  'app/fitness-hub.tsx::calendar-outline',
  'app/fitness-hub.tsx::flame-outline',
  'app/fitness-hub.tsx::list-outline',
  'app/fitness-hub.tsx::pulse-outline',
  'app/fitness-hub.tsx::trending-up-outline',
  'app/fitness-strength.tsx::barbell-outline::x2',
  'app/fitness-strength.tsx::trophy-outline',
  'app/glucose-log.tsx::moon-outline',
  'app/glucose-log.tsx::restaurant-outline',
  'app/glucose-log.tsx::timer-outline',
  'app/health-input.tsx::body-outline',
  'app/health-input.tsx::moon-outline',
  'app/health-input.tsx::sparkles-outline',
  // MB-27 0.3: indicadores de estado del hábito (reposo/graduado) en la fila
  // de Mis hábitos — chrome de estado, no lanzador de función del registro.
  'app/hoy-habitos.tsx::moon-outline',
  'app/hoy-habitos.tsx::ribbon-outline',
  'app/journal.tsx::book-outline',
  'app/ketones-log.tsx::moon-outline',
  'app/ketones-log.tsx::restaurant-outline',
  'app/log-cardio.tsx::water-outline',
  // Ola 2 Fitness PR2: /log-strength es log-exercise adelgazado (mismo header
  // de ejercicio y mismo reloj de guardado).
  'app/log-strength.tsx::barbell-outline',
  'app/log-strength.tsx::hourglass-outline',
  'app/login.tsx::eye-outline',
  // OLA6 D: el acceso a la ficha de emergencia desde el login. Va aquí a
  // conciencia porque es la puerta que se usa SIN sesión, cuando quien tiene
  // el teléfono no es el dueño.
  'app/login.tsx::medkit-outline',
  'app/mente/nback/como-jugar.tsx::eye-outline',
  'app/mente/nback/como-jugar.tsx::trending-up-outline',
  'app/mente/nback/index.tsx::book-outline',
  'app/mente/nback/index.tsx::stats-chart-outline',
  'app/mobility-assessment.tsx::body-outline',
  'app/mobility-assessment.tsx::leaf',
  'app/mobility-assessment.tsx::leaf-outline',
  'app/my-health.tsx::body-outline',
  'app/my-health.tsx::document-outline',
  'app/my-health.tsx::flask-outline::x2',
  'app/my-routines.tsx::barbell-outline::x2',
  'app/my-routines.tsx::folder-open-outline',
  'app/my-routines.tsx::sparkles-outline',
  'app/my-routines.tsx::timer-outline::x2',
  'app/nutrition.tsx::analytics-outline',
  'app/nutrition.tsx::flask-outline',
  'app/onboarding/v2/chronotype.tsx::sunny-outline',
  'app/onboarding/v2/positioning.tsx::trending-up-outline',
  'app/onboarding/v2/privacy.tsx::document-text-outline::x2',
  'app/progress.tsx::trophy-outline',
  'app/protocol-explorer.tsx::flask-outline',
  'app/register.tsx::eye-outline',
  // FIX-NOCHE: analytics-outline y barbell-outline salieron. OLA1 se llevó las
  // secciones por dominio del hub a REPORT_DOMAINS y app/reports.tsx dejó de
  // dibujarlas, pero las entradas se quedaron. El test nunca las reportó porque
  // la aserción de usos nuevos truena antes que la de muertos.
  // MB-29 P1: header de la card "Para tu consulta" — chrome de sección en su
  // propio dominio (reportes), no un lanzador dibujando una función.
  'app/reports.tsx::document-text-outline',
  'app/reports.tsx::eye-outline',
  'app/routine-generator.tsx::hourglass-outline',
  'app/salud/intervenciones/index.tsx::sparkles-outline',
  'app/salud/mi-expediente/index.tsx::document-text-outline',
  'app/salud/mis-datos/index.tsx::body-outline',
  'app/salud/mis-datos/index.tsx::flame-outline',
  'app/salud/mis-datos/index.tsx::flask-outline',
  'app/salud/mis-datos/index.tsx::pulse-outline',
  'app/salud/mis-datos/index.tsx::water-outline',
  'app/settings.tsx::document-text-outline',
  'app/settings.tsx::pulse-outline',
  // NOCHE-1 · HealthKit / Health Connect. Los dos usos son de la CONEXIÓN con
  // la plataforma de salud del teléfono, que no es una función del registro (no
  // tiene app, ni puerta, ni glifo en el set): en conexiones.tsx es el CTA que
  // lleva a conectar, y en salud-conexion.tsx es el indicador de estado, en
  // ternario con shield-checkmark cuando ya está conectado. Chrome de su propia
  // pantalla.
  'app/settings/conexiones.tsx::pulse-outline',
  'app/settings/salud-conexion.tsx::pulse-outline',
  'app/settings/dev.tsx::analytics-outline',
  'app/settings/dev.tsx::eye-outline',
  // MB-31A: moon-outline salió — la fila display-only "Tema" se volvió el
  // selector real de chips, sin glifo.
  'app/settings/experiencia.tsx::phone-portrait-outline',
  // OLA6 D · ficha de emergencia. Los tres glifos son de sistema, no de
  // función: compartir, ver en pantalla, y el acceso rápido.
  'app/salud/ficha-emergencia.tsx::document-text-outline',
  'app/salud/ficha-emergencia.tsx::eye-outline',
  'app/salud/ficha-emergencia.tsx::phone-portrait-outline',
  'app/settings/salud.tsx::medkit-outline::x2',
  'src/components/salud/FichaEmergenciaRow.tsx::medkit',
  'app/settings/legal.tsx::document-text-outline',
  'app/settings/legal.tsx::medkit-outline',
  // Ola 0 QW-5: las filas nuevas de Términos y Aviso (antes no había NINGUNA
  // puerta a /legal/* en la app, era bloqueante de revisión de tiendas).
  'app/settings/legal.tsx::reader-outline',
  'app/settings/privacy.tsx::document-text-outline',
  'app/settings/salud.tsx::calendar-outline',
  'app/settings/salud.tsx::flask-outline',
  // OLA6 D: medkit-outline pasó de un uso a dos (se sumó el acceso a la ficha
  // de emergencia), así que la entrada vive arriba como ::x2.
  'app/settings/salud.tsx::sunny-outline',
  'app/sleep.tsx::moon-outline',
  'app/sleep.tsx::sunny-outline',
  'app/solar.tsx::bar-chart-outline',
  'app/solar.tsx::moon-outline',
  'app/solar.tsx::sunny',
  'app/supplements.tsx::flask-outline',
  'app/supplements.tsx::moon-outline',
  'app/supplements.tsx::restaurant-outline',
  'app/supplements.tsx::sunny-outline',
  'src/components/MatrixExercisePicker.tsx::barbell-outline',
  'src/components/ScheduleModal.tsx::calendar-outline::x2',
  'src/components/builder/AddBlockButton.tsx::hourglass-outline',
  'src/components/builder/BlockCard.tsx::barbell-outline',
  'src/components/global/TopBanner.tsx::flame-outline',
  'src/components/global/TopBanner.tsx::flask-outline',
  'src/components/hoy/ActionContentRenderer.tsx::body-outline::x2',
  'src/components/hoy/ActionContentRenderer.tsx::book-outline',
  'src/components/hoy/ActionContentRenderer.tsx::eye-outline',
  'src/components/hoy/ActionContentRenderer.tsx::glasses-outline::x2',
  'src/components/hoy/ActionContentRenderer.tsx::leaf-outline',
  'src/components/hoy/ActionContentRenderer.tsx::moon-outline',
  'src/components/hoy/ActionContentRenderer.tsx::phone-portrait-outline',
  'src/components/hoy/ActionContentRenderer.tsx::sunny-outline',
  'src/components/interventions/PrescriptionCard.tsx::moon-outline',
  'src/components/legal/MedicalDisclaimerModal.tsx::medkit-outline',
  'src/components/nutrition/BreakFastGuide.tsx::restaurant-outline',
  // OLA3 nutrición: los glifos de las 9 rutas fusionadas se mudaron con su
  // código. Siguen siendo CONTENIDO de su propio dominio (categoría del
  // alimento en el buscador, tipo de comida del generador, tipo de dieta en
  // preferencias), nunca lanzadores. Las entradas de food-text, food-scan,
  // food-register, my-recipes, argos-recipes, lista-compra y food-preferences
  // se podaron: esas rutas hoy son stubs <Redirect> sin un solo dibujo.
  'src/components/nutrition/cocina/GeneradorArgos.tsx::moon-outline',
  'src/components/nutrition/cocina/GeneradorArgos.tsx::restaurant-outline',
  'src/components/nutrition/cocina/GeneradorArgos.tsx::sunny-outline',
  'src/components/nutrition/cocina/PreferenciasTab.tsx::flame-outline',
  'src/components/nutrition/cocina/PreferenciasTab.tsx::flower-outline',
  'src/components/nutrition/cocina/PreferenciasTab.tsx::leaf-outline',
  'src/components/nutrition/cocina/PreferenciasTab.tsx::restaurant-outline',
  // NOCHE-6 · biblioteca de alimentos: dos categorías nuevas en el MISMO mapa
  // de categorías que ya estaba inventariado (platillo y suplemento). Es la
  // categoría del alimento en el buscador, contenido del dominio nutrición, no
  // un lanzador.
  'src/components/nutrition/foodlog/TextSensor.tsx::flask-outline',
  'src/components/nutrition/foodlog/TextSensor.tsx::restaurant-outline',
  'src/components/nutrition/foodlog/TextSensor.tsx::grid-outline',
  'src/components/nutrition/foodlog/TextSensor.tsx::leaf-outline',
  'src/components/nutrition/foodlog/TextSensor.tsx::nutrition-outline',
  'src/components/nutrition/foodlog/TextSensor.tsx::sparkles-outline',
  'src/components/nutrition/foodlog/TextSensor.tsx::water-outline',
  'src/components/tests/TestInputScreen.tsx::clipboard-outline',
  // Ola 2 Fitness PR2: la fase de importación de /log-cardio es la copia
  // canónica de cardio-import.tsx (mismos glifos: nadar y abrir ajustes HC).
  'src/components/training/CardioImportFlow.tsx::settings-outline',
  'src/components/training/CardioImportFlow.tsx::water-outline',
  'src/components/training/ExerciseClip.tsx::barbell-outline',
  'src/components/training/MetodosAtpInfo.tsx::timer-outline',
  'src/components/training/MetodosAtpInfo.tsx::trending-up-outline',
  // Ola 2 Fitness PR1: el modo timer de /session es la copia canónica de
  // execution.tsx (mismo indicador de ejercicio en curso, mismo glifo).
  'src/components/training/TimerModeRunner.tsx::barbell-outline',
  'src/constants/categories.ts::analytics-outline',
  'src/constants/categories.ts::barbell-outline',
  'src/constants/categories.ts::flask-outline',
  'src/constants/categories.ts::moon-outline',
  'src/constants/categories.ts::restaurant-outline',
  'src/constants/categories.ts::sparkles-outline',
  'src/constants/electrons.ts::flame-outline',
  'src/constants/electrons.ts::sunny-outline',
  'src/constants/fasting-phases.ts::flame-outline',
  'src/constants/fasting-phases.ts::restaurant-outline',
  'src/constants/historia-clinica-questionnaires.ts::bandage-outline',
  'src/constants/historia-clinica-questionnaires.ts::body-outline',
  'src/constants/historia-clinica-questionnaires.ts::flame-outline',
  'src/constants/historia-clinica-questionnaires.ts::git-network-outline',
  'src/constants/historia-clinica-questionnaires.ts::medkit-outline',
  'src/constants/historia-clinica-questionnaires.ts::moon-outline',
  'src/constants/historia-clinica-questionnaires.ts::nutrition-outline',
  'src/constants/historia-clinica-questionnaires.ts::pulse-outline',
  'src/constants/historia-clinica-questionnaires.ts::restaurant-outline',
  'src/constants/historia-clinica-questionnaires.ts::sparkles-outline',
  'src/constants/historia-clinica-questionnaires.ts::sunny-outline',
  'src/constants/onboarding-copy.ts::analytics-outline',
  'src/constants/onboarding-copy.ts::calendar-outline',
  'src/constants/onboarding-copy.ts::medkit-outline',
  'src/constants/training-methods.ts::barbell-outline',
  'src/constants/training-methods.ts::flame-outline',
  'src/constants/training-methods.ts::timer-outline',
  'src/data/domain-explanations.ts::body-outline',
  'src/data/domain-explanations.ts::flame-outline::x2',
  'src/data/domain-explanations.ts::moon-outline',
  'src/data/domain-explanations.ts::pulse-outline',
  'src/data/domain-explanations.ts::water-outline',
  'src/data/meditation-library.ts::body-outline',
  'src/data/meditation-library.ts::eye-outline',
  'src/data/meditation-library.ts::leaf-outline',
  'src/data/meditation-library.ts::moon-outline',
  'src/data/meditation-library.ts::snow-outline',
  'src/screens/coach/ClientDetailScreen.tsx::barbell-outline',
  'src/screens/coach/ClientDetailScreen.tsx::calendar-outline',
  'src/screens/coach/ClientDetailScreen.tsx::document-text-outline::x2',
  'src/screens/coach/ClientDetailScreen.tsx::eye-outline',
  'src/screens/coach/ClientDetailScreen.tsx::flask-outline::x2',
  'src/screens/coach/ClientDetailScreen.tsx::hourglass-outline::x3',
  'src/screens/coach/ClientDetailScreen.tsx::restaurant-outline::x2',
  'src/screens/coach/ClientDetailScreen.tsx::sparkles-outline::x3',
  'src/screens/coach/ClientDetailScreen.tsx::trending-up-outline',
  'src/services/affiliate-core.ts::barbell-outline',
  'src/services/affiliate-core.ts::leaf-outline',
  'src/services/affiliate-core.ts::medkit-outline',
  // MB-21 P4.4: chips de prompt del estado vacío del chat (antes vivían en
  // app/argos-chat.tsx) — sugieren texto, no lanzan funciones del registro.
  'src/services/argos-suggestions-core.ts::analytics-outline',
  'src/services/argos-suggestions-core.ts::barbell-outline',
  'src/services/argos-suggestions-core.ts::hourglass-outline',
  'src/services/argos-suggestions-core.ts::moon-outline::x2',
  'src/services/argos-suggestions-core.ts::nutrition-outline::x2',
  'src/services/argos-suggestions-core.ts::restaurant-outline::x2',
  'src/services/argos-suggestions-core.ts::sparkles-outline',
  'src/services/argos-suggestions-core.ts::trending-up-outline',
  'src/services/community/mood-share-core.ts::eye-outline',
  'src/services/cycle-service.ts::leaf-outline',
  'src/services/cycle-service.ts::moon-outline',
  'src/services/cycle-service.ts::sunny-outline',
  'src/services/cycle-service.ts::water-outline',
  'src/services/fitness/mobility-core.ts::body-outline',
  'src/services/fitness/mobility-core.ts::trending-up-outline',
  'src/services/onboarding-v2-core.ts::barbell-outline',
  'src/services/onboarding-v2-core.ts::body-outline',
  'src/services/onboarding-v2-core.ts::flower-outline',
  // OLA1 R-2: el historial emocional y el perfil se fusionaron en el dominio
  // emociones. Son los MISMOS usos de antes (los iconos de correlacion, los de
  // patrones y los del perfil), en un solo archivo: por eso dos llegan x2.
  // Dibujan contenido propio del dominio, no lanzadores.
  'src/components/reports/domains/emociones.tsx::analytics-outline',
  'src/components/reports/domains/emociones.tsx::barbell-outline',
  'src/components/reports/domains/emociones.tsx::calendar-outline::x2',
  'src/components/reports/domains/emociones.tsx::hourglass-outline',
  'src/components/reports/domains/emociones.tsx::moon-outline',
  'src/components/reports/domains/emociones.tsx::pulse-outline::x2',
  'src/components/reports/domains/emociones.tsx::sunny-outline',
  'src/components/reports/domains/emociones.tsx::timer-outline',
  // NOCHE-REP: la anotación "N marcas nuevas ese día" dentro de la tarjeta de
  // cada sesión. Es contenido del reporte de entrenamiento (una marca, dicha
  // donde pasó), no la puerta a Récords — mismo trato que ya tienen los otros
  // trophy de progreso, retos y fuerza.
  'src/components/reports/domains/entrenamiento.tsx::trophy-outline',
  // NOCHE-7 · labs con contexto de ciclo: la nota que dice en qué fase se tomó
  // el estudio. Va en ternario con alert-circle cuando la fase no se conoce:
  // es el par de estado (conocida / desconocida), chrome puro de la nota.
  'src/components/reports/domains/labs.tsx::moon-outline',
  // OLA1 R-5: el flame-outline del encabezado "racha del protocolo". Es
  // contenido del dominio adherencia (una racha, dibujada donde vive), no un
  // lanzador de funcion del registro.
  'src/components/reports/domains/adherencia.tsx::flame-outline',
  // OLA1 R-3: los dos glifos de las pantallas de ciclo, ya dentro del dominio.
  // Contenido propio (la grafica y la lista de ciclos), no lanzadores.
  'src/components/reports/domains/ciclo.tsx::analytics-outline',
  'src/components/reports/domains/ciclo.tsx::calendar-outline',
  // FIX-NOCHE: los siete de report-domain-core.ts murieron. OLA1 los inventarió
  // con el argumento de que "no dibuja, es el dato que el hub lee", y ese
  // argumento estaba mal: un registro que nombra un glifo declara un DIBUJO
  // donde debe declarar una FUNCIÓN. REPORT_DOMAINS ya usa nombres lógicos de
  // AppIconName y el archivo entró a REGISTRY_FILES_SIN_IONICON. Lo mismo con
  // expediente-report-core.ts, que nunca llegó a inventariarse.
  'src/services/salud/ketones-source-core.ts::cloud-outline',
  'src/services/salud/ketones-source-core.ts::flask-outline',
  'src/services/salud/ketones-source-core.ts::water-outline',
  'src/services/uv-service.ts::glasses-outline',
  'src/services/uv-service.ts::sunny-outline',
  // ── OLA 4 · Tests (Anexo C) ───────────────────────────────────────────────
  // El registry de evaluaciones declara el glifo de cada uno de los 37 tests.
  // No pasan por <AppIcon> porque el set SVG no tiene glifo para ninguno: no
  // hay 'plank' ni 'cronotipo' ni los 9 dominios de Edad ATP. Entran aquí a
  // conciencia, que es la salida que el propio ratchet contempla. Si algún día
  // el set los cubre, este bloque muere y el hub dibuja con nombres lógicos.
  // FIX-215: los cinco quizzes funcionales compartían el portapapeles y se leían
  // como cinco veces la misma fila. Ahora cada uno trae su glifo, y por eso
  // entran aquí tres usos nuevos: bandage (dolor), nutrition (digestión) y el
  // segundo moon (sueño, que ya lo usaba el dominio de Edad ATP). El
  // portapapeles se queda como fallback de un quiz nuevo sin icono. Los otros
  // dos glifos elegidos (battery-charging, speedometer) no son de función y no
  // pasan por el ratchet.
  'src/constants/assessments/registry.ts::bandage-outline',
  'src/constants/assessments/registry.ts::barbell-outline',
  'src/constants/assessments/registry.ts::body-outline',
  'src/constants/assessments/registry.ts::clipboard-outline',
  'src/constants/assessments/registry.ts::cloud-outline',
  'src/constants/assessments/registry.ts::flame-outline',
  'src/constants/assessments/registry.ts::list-outline',
  'src/constants/assessments/registry.ts::moon-outline::x2',
  'src/constants/assessments/registry.ts::nutrition-outline',
  'src/constants/assessments/registry.ts::pulse-outline',
  'src/constants/assessments/registry.ts::sunny-outline',
  'src/constants/assessments/registry.ts::water-outline',
  // Los horarios del cronotipo: se mudaron de app/quiz/chronotype.tsx (hoy
  // redirect) al componente del resultado. Mismo dibujo, otra casa.
  'src/components/assessments/ChronotypeReveal.tsx::barbell-outline',
  'src/components/assessments/ChronotypeReveal.tsx::moon-outline',
  'src/components/assessments/ChronotypeReveal.tsx::restaurant-outline',
  'src/components/assessments/ChronotypeReveal.tsx::sunny-outline',
  // La vista del cronotipo guardado: se mudó de app/my-chronotype.tsx.
  'app/tests/resultado/cronotipo.tsx::calendar-outline',
  'app/tests/resultado/cronotipo.tsx::moon-outline',
  'app/tests/resultado/cronotipo.tsx::sunny-outline',
];
