# Anexo A · Reports unificado

Diseño de detalle producido por agente de arquitectura, 12-ago-2026. Spec del fundador: Reports es el hub maestro de todos los datos; cada reporte tiene su pantalla por dominio; se entra desde el hub O desde el contexto del pilar; el atrás regresa por donde entraste; es LA MISMA pantalla; export maestro estilo Garmin.

## 1. Los 14 dominios

Ruta: `/reports` (hub) + `/reports/[dominio]`.

| # | Dominio | Absorbe | Fuente |
|---|---|---|---|
| 1 | adherencia | calendario + compliance + rachas y medallas de /mente/progreso | adherence-service, adherence-calendar-service |
| 2 | entrenamiento | /history, /progress, retrospectiva de /fitness-strength | exercise-service |
| 3 | nutricion | sección de reports.tsx | getNutritionReport |
| 4 | hidratacion | sección | getHydrationReport |
| 5 | ayuno | sección | getFastingReport |
| 6 | glucosa | sección + series de glucose_logs/ketones_logs hoy en mis-datos y mi-expediente | getGlucoseReport |
| 7 | mente | sección | getMindReport |
| 8 | nback | /mente/nback/stats completo | nback-service |
| 9 | emociones | /emotion-history + /emotion-profile | emotion-history-service, emotion-stats-core |
| 10 | journal | /journal-history | journal-service |
| 11 | ciclo | /cycle-history + /cycle-charts + sección | cycle_periods, cycle_daily_logs |
| 12 | economia | /economy/history + sección electrones | electron-service, proton-service |
| 13 | labs | series de lab_values + composición/vitals | lab-values-service |
| 14 | expediente | /salud/mi-expediente | mi-expediente-core |

Reservado sin crear vacío: `sueno` (hoy el sueño registrado vive como sleep_quality dentro de cycle_daily_logs; se abre cuando exista tabla propia o HealthKit).

## 2. Absorción feature por feature (nada se pierde)

- **/history → entrenamiento**: lista cronológica getSessionHistory(50) agrupada Hoy/Ayer/fecha, cards por modo, pull-to-refresh. Tab "Sesiones". El límite 50 lo sustituye el rango del shell.
- **/progress → entrenamiento**: getMonthlyStats, gráficas de frecuencia y volumen semanal (con auto-recorte y resalte de semana actual), PRs recientes, top ejercicios con MiniSparkline y colores por grupo muscular. Tab "Tendencias".
- **/fitness-strength → se parte**: al dominio van hero RENDIMIENTO, PRs agrupados, ProgressionLineChart con toggles 1RM/3RM/5RM/8-10RM, historial por ejercicio, badges de recencia. El bloque BENCHMARKS se queda fuera (es captura → /fitness).
- **/journal-history → journal**: lista + expandir, rangos 7/30/90/todo, filtro por tipo, búsqueda con debounce 350ms, editar/borrar entrada, streak, FAB al composer. Editar/borrar sobreviven: borrar tu entrada desde donde la ves es la única casa razonable.
- **/emotion-history → emociones**: mosaico canónico, detalle expandible con zona corporal, correlaciones (sueño/entrenamiento/ayuno/sol) con umbral de honestidad estadística, fase de ciclo, patrones por día/momento, cuadrantes, disparadores, eficacia de navegación, comparativo vs periodo anterior (este sube al shell).
- **/emotion-profile → emociones (sección)**: arquetipo, gate de datos insuficientes con barra "te faltan N check-ins", share, CTA a checkin. Hoy hace un segundo fetch del mismo dato que history: se unifica.
- **/cycle-history → ciclo tab "Ciclos"**: hasta 24 ciclos, promedios, variabilidad, gate por biological_sex, distinción fallo-de-red vs sin-datos.
- **/cycle-charts → ciclo tab "Gráficas"**: líneas multiparámetro con toggles (energía, ánimo, libido, cólicos, hinchazón, apetito, sueño; temperature_c y hrv_ms ya se consultan sin pintarse), bandas de periodo, rangos. El gate sube al shell.
- **/economy/history → economia**: tabs H+/E-, traducción KEY_LABELS + humanizeKey, signo/color por monto.
- **/mente/progreso → adherencia (NO a mente)**: 4 rachas, medallas con vitrina 7/30/90/365, syncMenteMedals con háptico. Las rachas son adherencia. El app-registry "Rachas" repunta con ancla.
- **/mente/nback/stats → nback**: tabs Resumen (rounds, mejor N, percentiles vía RPC), Reto (línea de 20 días), Ranking en PRONTO (gated por opt-in Comunidad).
- **/reports actual → hub**: conserva pills de periodo, calendario de adherencia, PDF de consulta 30/90/180, preferencias de secciones, deep-link ?period=. Las 10 secciones pasan de contenido a tarjetas-resumen navegables al dominio (leen el mismo getXReport).

## 3. Fuera de reports (y por qué)

Captura y ejecución no entran: /agenda, /checkin, /journal composer, /emotions, /cycle, nback juego, timers. /salud/mis-datos se queda como destino de CAPTURA y cede la retrospectiva (sus series van a labs). /session-summary es recibo transaccional por params, no consulta BD: su lugar es el flujo post-entreno con CTA al dominio. /edad-atp/result-preview es parte del flujo del test. /argos/conversations es historial de chat, no métrica. Comunidad es dato de otros.

## 4. El shell (ReportDomainShell)

Se empuja siempre con router.push (nunca replace): el back nativo devuelve al origen sin params de retorno. Compartido: (1) selector de rango Semana/Mes/Año/Todo en ReportRangeContext, persistido por dominio, sembrable por ?period=; (2) comparativa vs periodo anterior generalizada; (3) export CSV/JSON del rango visible con Share; (4) header del color del pilar; (5) TRES estados honestos: cargando / sin datos / falló la lectura; (6) guards por dominio (useCycleGate para ciclo, MedicalDisclaimerGate para labs/expediente); (7) umbral de honestidad estadística con copy "te faltan N registros". Propio de cada dominio: sus gráficas e interacción.

## 5. Export maestro

Ya existe server-side: data-export-generator (DSAR GDPR Art. 20, 47 tablas, skipped tables sin tumbar, cap 5000 filas, JSON a bucket privado, signed URL 7 días, pg_cron cada 5 min, idempotente). Disparo hoy escondido en settings/privacy.

Falta para el estilo Garmin: CSV por dominio dentro de un ZIP; filtro de rango y dominios en la solicitud; superficie en el hub; notificación al completar; manifiesto legible con unidades; el PDF de consulta en el mismo botón con dos salidas ("para mi médico" curado, "todo mi dato" ZIP); verificar cobertura de nback_*, mind_sessions, medallas, logs de navegación emocional.

## 6. Redirects

| Vieja | Nueva |
|---|---|
| /history | /reports/entrenamiento?tab=sesiones |
| /progress | /reports/entrenamiento |
| /fitness-strength | /fitness/benchmarks (captura); retrospectiva → /reports/entrenamiento?tab=marcas |
| /personal-records | /reports/entrenamiento?tab=marcas |
| /journal-history | /reports/journal |
| /emotion-history | /reports/emociones |
| /emotion-profile | /reports/emociones?section=perfil |
| /cycle-history | /reports/ciclo?tab=ciclos |
| /cycle-charts | /reports/ciclo?tab=graficas |
| /economy/history | /reports/economia |
| /mente/progreso | /reports/adherencia?section=rachas |
| /mente/nback/stats | /reports/nback |
| /salud/mi-expediente | /reports/expediente |

Callers a actualizar (12): fitness-my, cycle, emotions, journal, economy/admin, nback/index, progress, app-registry (3 entradas), salud-puertas (2), YoEditorialSection, tareas-core. Tests que romperán (5 suites): censo-rutas, salud-puertas, app-registry, home-floating-core, argos-screen-context-core.

## 7. Decisiones abiertas

1. **fitness-strength se parte** (benchmarks a captura, marcas al dominio). Recomendado: sí; dejarla entera deja un reporte fuera de reports, contra la ley.
2. **Rachas dentro de adherencia**, y unificar los 3 cálculos de racha en un streak-core con la regla de gracia como parámetro. Sin esto dos pantallas mostrarán números distintos de la misma racha.
3. **mis-datos cede sus series** a /reports/labs; se queda con último valor + navegación a captura.
4. **Las preferencias de secciones sobreviven** migrando el schema: ordenan/apagan cards del hub, pero apagar un dominio NO bloquea la ruta (el back desde N-Back funciona aunque nback esté apagado).

## 8. Esfuerzo

F0 shell 2-3d · F1 dominios baratos (5) 2d · F2 dominios con pantalla (4) 3-4d · F3 entrenamiento 3-4d · F4 emociones 2d · F5 adherencia + streak-core 2-3d · F6 glucosa/labs 2d · F7 hub + export maestro 3-4d · F8 redirects y tests 1-2d. **Total 20-27 días.** F0 y F8 son bordes; F1-F7 paralelizables porque el shell fija el contrato.
