# Recorrido de las 185 rutas de ATP

Generado con `npm run censo -- --recorrido`. Cada renglón dice desde dónde
se llega. Es la lista con la que se camina la app para comprobar que ninguna
función quedó sin acceso.

| Ruta | Se llega desde |
|---|---|
| `/(tabs)` | src/components/argos/argos-floating-core · src/components/argos/argos-intro-core · src/components/layout/TopBannerPersistent · src/components/onboarding/OnboardingCompletion y más |
| `/` | src/components/argos/argos-floating-core · src/components/argos/argos-intro-core · src/components/layout/TopBannerPersistent · src/components/onboarding/OnboardingCompletion y más |
| `/afiliados/aplicar` | afiliados/dashboard · settings/conexiones |
| `/afiliados/dashboard` | afiliados/aplicar |
| `/afiliados/mi-codigo` | afiliados/dashboard |
| `/agenda` | notifications · src/components/agenda/AgendaPreviewCard · supabase/functions/dispatch-agenda-notifications/index |
| `/(tabs)/argos` | src/components/argos/argos-floating-core · (tab en _layout) |
| `/argos-chat` | argos/conversations · notifications · nutrition · solar y más |
| `/argos-recipes` | nutrition |
| `/argos/conversations` | argos-chat |
| `/argos/meet` | settings/dev · src/components/argos/MeetArgosGate · src/services/onboarding-v2-service |
| `/atp-orden` | **ATP** |
| `/(tabs)/biblioteca` | shared-routine · (tab en _layout) |
| `/braverman` | braverman-premium · quizzes · salud/mis-evaluaciones/index |
| `/braverman-premium` | braverman · economy/shop |
| `/breathing` | mente · src/components/argos/argos-floating-core · src/constants/app-registry · src/constants/hoy-cards y más |
| `/builder` | fitness-hiit · fitness-train · my-routines |
| `/cardio-import` | fitness-cardio |
| `/checkin` | emotion-exploration · emotion-profile · emotions · mente y más |
| `/comunidad/amigos` | **TRIBU** · comunidad/ranking · settings/comunidad · supabase/functions/dispatch-social-notifications/index |
| `/comunidad/animo` | comunidad/amigos |
| `/comunidad/buscar` | comunidad/amigos |
| `/comunidad/perfil/[userId]` | comunidad/amigos · comunidad/buscar · comunidad/ranking |
| `/comunidad/ranking` | **TRIBU** |
| `/cycle` | src/constants/app-registry · src/constants/salud-puertas · src/services/day-compiler · src/services/hero-recommendation-service y más |
| `/cycle-charts` | cycle |
| `/cycle-history` | cycle |
| `/cycle-settings` | cycle · settings/salud |
| `/dev` | settings/dev |
| `/dev/goal-tree-smoke` | dev/index |
| `/economy/admin` | src/components/economy/EconomyHeaderPill · src/components/economy/HoyDayCardEditorial · src/components/yo/YoEditorialSection |
| `/economy/convert` | economy/admin · economy/how-to-earn · economy/shop · src/components/argos/RateLimitCard y más |
| `/economy/history` | economy/admin |
| `/economy/how-to-earn` | economy/admin · src/components/economy/HPlusExplainerCard |
| `/economy/shop` | braverman-premium · economy/admin · salud/diagnostico/index · salud/intervenciones/rationale y más |
| `/edad-atp` | settings/dev · src/components/edad-atp/EdadAtpHeroCard · src/components/yo/YoEditorialSection · src/services/hero-recommendation-service |
| `/edad-atp/biomarkers` | edad-atp/index · edad-atp/result-preview · edad-atp/sub-edad/[key] · my-health y más |
| `/edad-atp/cinematic-tests-index` | salud/mis-evaluaciones/index |
| `/edad-atp/cognitive` | edad-atp/index · edad-atp/result-preview · salud/mis-evaluaciones/index |
| `/edad-atp/composition` | edad-atp/index · edad-atp/questionnaires/index · edad-atp/result-preview · edad-atp/sub-edad/[key] y más |
| `/edad-atp/lab-confirmation` | my-health · src/components/labs/LabProcessingSheet |
| `/edad-atp/labs` | clinical-system · edad-atp/index · salud/mis-datos/index · src/components/edad-atp/EdadAtpHeroCard |
| `/edad-atp/questionnaires` | edad-atp/index · edad-atp/result-preview |
| `/edad-atp/questionnaires/cardiovascular` | edad-atp/questionnaires/index |
| `/edad-atp/questionnaires/habitos` | edad-atp/questionnaires/index |
| `/edad-atp/questionnaires/inflamacion` | edad-atp/questionnaires/index |
| `/edad-atp/questionnaires/inmunidad` | edad-atp/questionnaires/index |
| `/edad-atp/questionnaires/metabolismo` | edad-atp/questionnaires/index |
| `/edad-atp/questionnaires/renal-micronutrientes` | edad-atp/questionnaires/index |
| `/edad-atp/questionnaires/sistema-hormonal` | edad-atp/questionnaires/index |
| `/edad-atp/questionnaires/sueno` | edad-atp/questionnaires/index |
| `/edad-atp/questionnaires/vitalidad` | edad-atp/questionnaires/index |
| `/edad-atp/result-preview` | edad-atp/index · salud/diagnostico/index · src/components/edad-atp/EdadAtpHeroCard · src/components/yo/YoEditorialSection y más |
| `/edad-atp/sub-edad/[key]` | src/components/edad-atp/EdadAtpHeroCard · src/components/edad-atp/SubEdadConstellation |
| `/edad-atp/test-bolt` | edad-atp/cinematic-tests-index |
| `/edad-atp/test-old-man` | edad-atp/cinematic-tests-index |
| `/edad-atp/test-plank` | edad-atp/cinematic-tests-index |
| `/edad-atp/test-recovery-hr` | edad-atp/cinematic-tests-index |
| `/edad-atp/tests` | edad-atp/index · edad-atp/sub-edad/[key] |
| `/edad-atp/tests/balance` | edad-atp/tests/index · src/components/edad-atp/component-meta |
| `/edad-atp/tests/chronotype` | edad-atp/tests/index |
| `/edad-atp/tests/cooper` | edad-atp/tests/index · edad-atp/vitals · src/components/edad-atp/component-meta |
| `/edad-atp/tests/push-ups` | edad-atp/tests/index · src/components/edad-atp/component-meta |
| `/edad-atp/tests/reaction-time` | edad-atp/cognitive · edad-atp/sub-edad/[key] · edad-atp/tests/index · src/components/edad-atp/component-meta |
| `/edad-atp/vitals` | edad-atp/index · edad-atp/sub-edad/[key] · edad-atp/tests/cooper · salud/mis-datos/index y más |
| `/emotion-exploration` | emotion-profile · emotions |
| `/emotion-history` | emotions |
| `/emotion-navigation` | checkin |
| `/emotion-profile` | emotion-history |
| `/emotions` | mente · src/constants/app-registry |
| `/execution` | builder · fitness-hiit · my-routines · session-summary |
| `/exercise-detail` | exercise-detail · exercise-library |
| `/exercise-library` | fitness-hub |
| `/fasting` | nutrition · src/components/hoy/HoyEditorialSection · src/constants/app-registry · src/services/day-compiler y más |
| `/feedback-dashboard` | (tabs)/yo · settings/dev |
| `/fitness-cardio` | fitness-my · src/constants/app-registry |
| `/fitness-hiit` | fitness-train |
| `/fitness-hub` | src/components/hoy/HoyEditorialSection · src/constants/app-registry · src/constants/hoy-cards · src/data/emotion-navigation y más |
| `/fitness-my` | fitness-hub |
| `/fitness-strength` | fitness-my · progress · src/constants/app-registry |
| `/fitness-train` | fitness-hub |
| `/food-preferences` | nutrition |
| `/food-register` | food-register · nutrition · src/components/hoy/HoyEditorialSection · src/services/day-compiler y más |
| `/food-scan` | fasting · food-register · nutrition |
| `/food-text` | food-register · nutrition |
| `/forgot-password` | login · reset-password |
| `/functional-quiz` | quizzes |
| `/glucose-log` | nutrition · salud/mis-datos/index · src/constants/app-registry · src/constants/salud-puertas |
| `/health-hub` | settings/salud · src/constants/hoy-cards |
| `/health-input` | src/constants/data-capture-routes |
| `/historia-clinica` | salud/diagnostico/index · src/constants/salud-puertas |
| `/historia-clinica/[category]` | historia-clinica/index · quizzes · salud/mis-evaluaciones/index · solar y más |
| `/history` | fitness-my |
| `/hoy-habitos` | **HOY** |
| `/hydration` | src/components/hoy/HoyEditorialSection · src/constants/app-registry · src/constants/hoy-cards · src/services/hoy/score-coaching-core |
| `/journal` | journal-history · mente · src/components/hoy/HoyEditorialSection · src/constants/app-registry y más |
| `/journal-history` | journal · mente |
| `/ketones-log` | salud/mis-datos/index · src/constants/app-registry · src/constants/salud-puertas |
| `/(tabs)/kit` | src/components/argos/argos-floating-core · src/components/hoy/HoyEditorialSection · src/components/ui/home-floating-core · src/services/day-compiler y más |
| `/labs-guide` | edad-atp/index · salud/diagnostico/index · src/components/global/TopBanner · src/constants/app-registry y más |
| `/lista-compra` | my-recipes · src/constants/app-registry |
| `/log-cardio` | cardio-import · fitness-cardio · src/components/hoy/HoyEditorialSection · src/services/hoy/day-booleans y más |
| `/log-exercise` | fitness-strength · fitness-train · src/components/training/MetodosAtpInfo · src/constants/app-registry |
| `/login` | index · onboarding/v2/profile · reset-password · settings/cuenta y más |
| `/meditation` | mente · src/components/argos/argos-floating-core · src/constants/app-registry · src/constants/hoy-cards y más |
| `/mente` | src/components/argos/argos-floating-core |
| `/mente/nback` | mente · src/constants/app-registry · src/services/day-compiler · src/services/hoy/day-booleans y más |
| `/mente/nback/como-jugar` | mente/nback/index |
| `/mente/nback/personalizar` | mente/nback/index |
| `/mente/nback/saber-mas` | mente/nback/index |
| `/mente/nback/sesion` | mente/nback/como-jugar · mente/nback/index |
| `/mente/nback/stats` | mente/nback/index |
| `/mente/player` | breathing · meditation · src/data/emotion-navigation |
| `/mente/progreso` | mente |
| `/mobility-assessment` | fitness-my · src/constants/app-registry |
| `/my-chronotype` | sleep · src/components/yo/YoEditorialSection · src/constants/salud-puertas |
| `/my-health` | edad-atp/lab-confirmation · health-input · my-health · src/services/day-compiler |
| `/my-recipes` | nutrition · src/constants/app-registry |
| `/my-routines` | fitness-train |
| `/notifications` | src/components/global/TopBanner · src/components/hoy/NotificationBellIcon |
| `/nutrition` | src/constants/app-registry · src/constants/hoy-cards · src/services/day-compiler |
| `/onboarding/v2/chronotype` | src/services/onboarding-v2-core |
| `/onboarding/v2/consent` | src/services/onboarding-v2-core |
| `/onboarding/v2/cycle` | src/services/onboarding-v2-core |
| `/onboarding/v2/goal` | src/services/onboarding-v2-core |
| `/onboarding/v2/notifications` | src/services/onboarding-v2-core |
| `/onboarding/v2/positioning` | src/services/onboarding-v2-core |
| `/onboarding/v2/privacy` | src/services/onboarding-v2-core |
| `/onboarding/v2/profile` | src/services/onboarding-v2-core |
| `/onboarding/v2/welcome` | index · register |
| `/onboarding/voice-config` | index |
| `/paywall` | breathing · meditation · mente/player · settings/subscription y más |
| `/(tabs)/perfil` | (tab en _layout) |
| `/profile` | (tabs)/yo · settings/cuenta · settings/privacy |
| `/(tabs)/progreso` | (tab en _layout) |
| `/progress` | fitness-my |
| `/protocol-explorer` | quiz-take · settings/salud |
| `/quiz-take` | quiz/chronotype · quizzes |
| `/quiz/chronotype` | my-chronotype · salud/mis-evaluaciones/index · settings/salud · src/components/yo/YoEditorialSection |
| `/quizzes` | salud/diagnostico/index · salud/mis-evaluaciones/index |
| `/redeem-code` | paywall · settings/subscription |
| `/register` | login · src/components/argos/argos-floating-core |
| `/reports` | src/components/yo/YoEditorialSection · src/constants/salud-puertas |
| `/reset-password` | _layout |
| `/routine-generator` | fitness-hub · fitness-train · mobility-assessment |
| `/(tabs)/salud` | src/components/argos/argos-floating-core · (tab en _layout) |
| `/salud/cuestionario-maestro` | salud/mis-evaluaciones/index · src/constants/salud-puertas |
| `/salud/diagnostico` | salud/intervenciones/index · salud/intervenciones/rationale · src/constants/salud-puertas |
| `/salud/evolucion` | src/constants/salud-puertas |
| `/salud/expediente` | src/constants/salud-puertas |
| `/salud/hoy` | src/constants/salud-puertas |
| `/salud/intervenciones` | **HOY** · salud/cuestionario-maestro/index · salud/diagnostico/index · src/components/interventions/MyProtocolCard y más |
| `/salud/intervenciones/[key]` | salud/intervenciones/index |
| `/salud/intervenciones/rationale` | salud/intervenciones/index · src/components/interventions/MyProtocolCard |
| `/salud/mi-expediente` | src/constants/salud-puertas |
| `/salud/mis-datos` | src/constants/salud-puertas |
| `/salud/mis-evaluaciones` | src/constants/salud-puertas |
| `/salud/mis-sintomas` | src/constants/salud-puertas |
| `/salud/padecimientos` | src/constants/salud-puertas |
| `/salud/sintomas` | salud/mi-expediente/index |
| `/settings` | (tabs)/yo · dev/goal-tree-smoke · dev/index · settings/dev y más |
| `/settings/comunidad` | settings |
| `/settings/conexiones` | settings |
| `/settings/cuenta` | settings |
| `/settings/dev` | settings |
| `/settings/experiencia` | settings |
| `/settings/legal` | settings/privacy · settings |
| `/settings/notifications` | settings |
| `/settings/privacy` | settings/cuenta · settings |
| `/settings/salud` | settings |
| `/settings/subscription` | settings/cuenta |
| `/sleep` | src/components/hoy/HoyEditorialSection · src/constants/app-registry · src/services/hoy/score-coaching-core |
| `/solar` | src/components/hoy/HoyEditorialSection · src/constants/app-registry · src/constants/hoy-cards · src/constants/salud-puertas y más |
| `/strength-session` | builder · exercise-detail · fitness-hub · my-routines y más |
| `/supplements` | food-scan · nutrition · src/components/hoy/HoyEditorialSection · src/constants/app-registry y más |
| `/(tabs)/tribu` | src/components/argos/argos-floating-core · (tab en _layout) |
| `/(tabs)/yo` | src/components/ui/home-floating-core · (tab en _layout) |

## Sin puerta, a propósito (8)

- `/admin/reports` — Detrás del gate de admin. No lleva puerta en la navegación del usuario a propósito.
- `/clinical-system` — DECISIÓN PENDIENTE DE ENRIQUE. 353 líneas vivas (drill-down por sistema funcional: síntomas con severidad, timeline y correlación con labs) que se quedaron sin puerta cuando Mega-Sprint B B6 la absorbió en Salud Funcional. O se borra, o se le abre puerta desde el mapa funcional (tocar un sistema entra a su drill-down). No se decide en un run de carcasa.
- `/economy/challenges` — Apagada por bandera en MB-12 hasta que exista su backend. La pantalla se conserva para cuando se encienda.
- `/economy/referrals` — Apagada por bandera en MB-12 hasta que exista su backend. La pantalla se conserva para cuando se encienda.
- `/legal/aviso` — Cerrada en MB-17: el texto tiene corchetes sin datos fiscales. Se reabre cuando el legal cierre la razón social.
- `/legal/terminos` — Cerrada en MB-17: el texto tiene corchetes sin datos fiscales. Se reabre cuando el legal cierre la razón social.
- `/session-summary` — Se llega al terminar un entrenamiento, no desde un menú. La abre el motor de ejecución.
- `/shared-routine` — Landing de un link compartido de rutina: entra por deep link con el parámetro code. No es un destino de navegación interna.
