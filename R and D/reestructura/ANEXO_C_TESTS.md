# Anexo C · Tests y evaluaciones ~37 → 8

Diseño de detalle producido por agente de arquitectura, 12-ago-2026.

## 0. Por qué los 4 motores pueden ser uno

Los cuatro comparten el autómata intro → pregunta[i] → resultado. Difieren en cinco ejes que son DATOS, no arquitectura: fuente (const o DB), tipo de input, scorer, tabla de persistencia y efecto al completar. Hallazgo decisivo: **master-quiz-bank.InputType ya cubre el 100% de las formas de pregunta de los otros tres** (el boolean es toggle, el single_select es single, etc.), y master-quiz-core ya es puro y testeable en node, con QuestionInput como widget extraído. Lo único que impide unificar es que cada motor hardcodea su scorer y su tabla: se resuelve con una interfaz de tres funciones (bank / score / persist) en un registry.

## 1. Las 8 rutas finales

| # | Ruta | Qué es |
|---|---|---|
| 1 | /tests | Hub único. 4 secciones (Funcional · Clínico · Edad ATP · Físico) leídas del registry. Hero Braverman + card del Maestro. Cada fila con ✓ y fecha |
| 2 | /tests/q/[id] | Motor de cuestionario parametrizado sobre master-quiz-core + QuestionInput (8 widgets). Resume universal, "prefiero no responder", guardar-y-salir. Sustituye functional-quiz + quiz-take + cuestionario-maestro + chronotype + 9 wrappers + historia-clinica/[category] |
| 3 | /tests/run/[id] | Runner físico. 3 modos: stopwatch (plank, bolt), capture (cooper, push-ups, balance, old-man, recovery-hr, grip), reactive (reaction-time, donde el teléfono ES el instrumento) |
| 4 | /tests/resultado/[id] | Vista de resultado persistente (generaliza lo que my-chronotype hizo bien). Sin resultado → redirige al motor |
| 5 | /braverman | PROPIA, se justifica: 313 preguntas en 2 partes, retroceso cruzado, intro cinemático, cross-fade anti-flicker, resultado 4 NT. Parametrizarlo costaría más que mantenerlo. PERO consume QuestionInput y el resume del motor para no divergir |
| 6 | /braverman-premium | Se queda: reporte pagado con H+ (modelo económico, no test) |
| 7 | /salud/mis-sintomas | Destino único del síntoma, ahora sí, con 3 tabs (ver §4) |
| 8 | /edad-atp | Stepper único con /edad-atp/paso/[key] y /edad-atp/resultado (ver §3) |

Regla de oro: el catálogo no se toca. Los 5 funcionales, los 313 Braverman, las 13 dimensiones, los ~40 de Historia Clínica y los 10 tests físicos siguen como entradas del registry. Muere la carpeta app/, no el contenido.

## 2. Absorciones clave

- 6 hubs → 1: quizzes, mis-evaluaciones (su hero editorial ES la cabecera del nuevo), edad-atp/questionnaires, edad-atp/tests, cinematic-tests-index (hoy triple exposición de los mismos tests físicos), historia-clinica. useAssessmentCompletion() lee todas las tablas de una vez.
- functional-quiz → adapter (conserva el flash "POR QUÉ IMPORTA" como capacidad del motor). quiz-take → adapter (gana resume gratis, hoy no tiene). cuestionario-maestro: su core ES el motor. Cronotipo 3 → 2: /tests/q/cronotipo + /tests/resultado/cronotipo conservando CHRONO_INFO completo (contenido, no código).
- 11 wrappers de 17-25 líneas → 0 rutas (los arrays van a src/constants/assessments/).
- /edad-atp/cognitive (placeholder confeso) muere; su captura manual de RT sobrevive como fallback del modo reactive.

## 3. Edad ATP: de 20+ rutas con bucles a stepper

Hoy cada captura hace router.back() al hub, que es peaje. Propuesta: /edad-atp como stepper de 6 pasos (labs · composicion · vitals · cuestionarios · cognitivo · fisico) con % y badge "datos nuevos", CE integral como barra del stepper, CTA "Calcular" que se ilumina al 30% (CALC_THRESHOLD ya existe). Cada paso sigue siendo deep-linkable (/edad-atp/paso/labs = URL estable). Al guardar, el paso ofrece avanzar al siguiente incompleto en vez de solo back(). cuestionarios y fisico dejan de ser sub-hubs (abren /tests/q/ o /tests/run/ directo, con retorno al paso). Composición aparece UNA vez (grip dentro). lab-confirmation queda como sub-estado de paso/labs. sub-edad/[key] cuelga de /edad-atp/resultado (renombre de result-preview con alias).

Efecto: 9 capturas + 2 sub-hubs + 16 hojas → 3 rutas.

## 4. Síntomas: ejecutar la absorción declarada

Las 4 pantallas guardan en 3 modelos distintos (user_symptoms, clinical_symptoms_aislados, padecimientos+episodios) y dx-engine lee los tres. La absorción es de UI, no de esquema:

/salud/mis-sintomas con 3 tabs: **Activos** (default, modelo user_symptoms intacto) · **Registro** (quick-tap de salud/sintomas, peso BAJO en DX, uso distinto: log rápido diario) · **Padecimientos** (peso ALTO, episodios con duration_days generado en Postgres, el modelo más rico). Y /clinical-system (huérfana, la mejor pieza de las cuatro) NO muere: se convierte en filtro ?sistema=X que filtra las 3 tabs y muestra labs correlacionados.

## 5. Redirects

quizzes→/tests · mis-evaluaciones→/tests · edad-atp/questionnaires→/tests#edad · edad-atp/tests→/tests#fisico · cinematic-tests-index→/tests#fisico · historia-clinica→/tests#clinico · historia-clinica/[cat]→/tests/q/hc-[cat] · functional-quiz?quiz_id=X→/tests/q/X · quiz-take?quiz_id=X→/tests/q/db-X · cuestionario-maestro→/tests/q/maestro · quiz/chronotype→/tests/q/cronotipo · edad-atp/tests/chronotype→borrar re-export · my-chronotype→/tests/resultado/cronotipo · 9 questionnaires/*→/tests/q/edad-* · tests físicos→/tests/run/* · cognitive→/tests/run/reaction-time · edad-atp/{labs,composition,vitals,biomarkers}→/edad-atp/paso/* · result-preview→/edad-atp/resultado · sintomas→mis-sintomas?tab=registro · padecimientos→mis-sintomas?tab=padecimientos · clinical-system?system=X→mis-sintomas?sistema=X · braverman sin cambio.

28 archivos con 74 referencias. Sugerencia: capa de alias LEGACY_ROUTES durante un ciclo de OTA para no reescribir los 74 call-sites en el mismo PR.

## 6. Decisiones abiertas

1. Braverman propio: SÍ (4 features de un solo cliente), pero consumiendo los widgets del motor.
2. Los 5 funcionales NO migran a DB ahora (la tabla quizzes no modela rootCause ni resultInsights; migrar perdería contenido clínico). El registry acepta const y DB.
3. Tabla única assessment_runs: SÍ pero fase 2, con vistas de compatibilidad. Rutas primero, esquema después: mezclar ambas en un PR es cómo se pierde data.
4. Padecimientos como tab: sí de UI; NO merge de modelo (sus episodios son el modelo más rico y dx-engine los pondera alto).

## 7. Esfuerzo

Registry + hub + alias 2d · motor con 4 adapters 5d · runner físico + borrar 11 wrappers 2d · resultado 2d · síntomas 3 tabs + filtro por sistema 3d · stepper Edad ATP 4d · barrido de 74 call-sites + tsc + tests 2d. **Total ~20 días.** Saldo: ~9,400 líneas en app/ → ~4,200 + ~1,500 de bancos movidos a constants. Cero preguntas perdidas.
