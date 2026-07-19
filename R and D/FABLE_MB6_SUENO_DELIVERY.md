# 😴 MB-6 · SUEÑO — Delivery

**Fecha:** 2026-07-18 · **Branch:** `feat/mb6-sueno` (desde `feat/mb5-mente`, 3 commits) · **CI:** tsc 0 errores · 1827 tests verdes (12 nuevos)

**Nota de contexto:** las doctrinas citadas en el brief como memorias (`reference_sueno_atp`, `project_doctrina_cronotipo_delfin_estado_temporal`, `feedback_datos_maquina_validados_datos_user_sagrados`) no existen como archivos en mi memoria local — trabajé con la versión inline del brief, que es autocontenida.

---

## Qué se hizo

### 1. Delfín = estado temporal con cronotipo MADRE real (commit 1)
El sistema YA comunicaba a Delfín como estado transitorio (doctrina #12, MB-1) pero **hardcodeaba "Oso" como ancla** en pantalla, y el quiz calculaba el madre real (segundo score) sin que nadie más lo usara — `raw_scores` estaba persistido y desaprovechado.

- **Nuevo `motherChronotype(raw_scores)`** (helper puro en `intervention-agenda-core`): tendencia no-delfín más fuerte; empate/sin scores → Oso (mismo desempate doctrinal `bear > lion > wolf` de quiz-service).
- **Propagado a TODO el sistema**: `normalizeChronotype`/`validatedSchedule`/`anchorTimes` aceptan `raw_scores` opcional → la agenda de un Delfín ancla a su madre real (León/Oso/Lobo), no a Oso fijo. Callers actualizados: day-compiler, agenda-service (sync + reconcile), prescription-service.
- **Motor de prescripción**: `deriveChronotype` deriva el `type` del fenotipo del madre real; `transitionalState: 'delfin'` sigue viajando aparte. El motor en sí quedó INTOCADO.
- **Copy de la tesis** en `my-chronotype.tsx` (bloque "TU CRONOTIPO DE BASE") y en el resultado del quiz: *"Hoy estás en patrón Delfín — es un estado, no lo que eres. Tu cronotipo de base es X. Vamos hacia allá."* Sin paternalismo; el quiz y la pantalla ahora dicen lo MISMO que hace el plan.
- **Retrocompatible**: cuentas delfín sin `raw_scores` (si existieran) siguen → Oso.

### 2. Pantalla de cronotipo + datos sin usar (commit 3)
- El "engorde" de la pantalla YA estaba hecho (triple-audit P2.11 en main: bloque TUS VENTANAS con peak_focus/physical reales). **No lo dupliqué.**
- Lo que faltaba era la **conexión con la agenda**: nuevo builder puro `focusWindowAgendaItem` (patrón de `sleepAgendaItem`) → item informativo en el HOY: "Ventana de foco profundo · Hasta 14:00 — agenda aquí lo pesado". Sin dato → sin item.

### 3. Propagación del cronotipo (commit 1, tests)
Verificación de arquitectura: **todas** las superficies (HOY, agenda, protocolo/motor, ARGOS, pantallas) leen la MISMA tabla `user_chronotype`; no hay tabla espejo. El re-test emite `chronotype_changed` (ya existía). El riesgo real del bug León→Oso son las **3 definiciones paralelas de horarios** que deben ir en espejo: template SQL del quiz (025/200), `CHRONO_SCHEDULES` (onboarding v2) y `CHRONO_ANCHOR_DEFAULTS` (agenda).
- **Test de regresión nuevo**: espejo `CHRONO_ANCHOR_DEFAULTS ↔ CHRONO_SCHEDULES` (wake/sleep idénticos por tipo) + León 06:00 clavado. El template SQL no es importable en vitest — queda cubierto por el data-fix 200 ya aplicado.
- Tests del madre: `motherChronotype` (3 casos), `normalizeChronotype` con scores (delfín→lobo/león/oso, no-delfín inmune), `deriveChronotype` (delfín→lobo y →león con transitionalState).

### 4. Datos máquina vs datos usuario (verificado, sin cambios)
La línea ya está bien trazada en el código y la respeté: `custom_time` de intervenciones y `user_day_preferences.goals.wake_time` son SAGRADOS (nunca se ajustan — `resolveInterventionTimeEx` orden custom > computed > ancla); los horarios máquina se auto-validan (`validatedSchedule` snapea wake roto >60 min contra el default del tipo) y se espacian (`STAGGER_MINUTES`). El cambio de madre solo afecta la rama MÁQUINA.

### 5. Contraindicación #117 (commit 2)
**Premisa del brief parcialmente desactualizada** (hallazgo honesto): el `how` del catálogo YA decía "20-40 min en tina… terminando 60-120 min antes de dormir" — la duración nunca estuvo mal en la instrucción. Lo que SÍ estaba mal era el **`name`**: "Baño caliente vespertino (40-42°C · **90 min pre-sueño**)" se lee como baño de 90 minutos.
- Name → "(40-42°C · **termina ~90 min antes de dormir**)"; `how` refuerza "no más — baños más largos resecan la piel" + "óptimo ~90 min" de antelación (Haghayegh 2019: optimal timing).
- Barrido del resto de "90 min" del catálogo: pantallas off, lentes rojos, pausas activas — todos inequívocos.

## Qué NO se hizo (y por qué)
- **Persistir el cronotipo madre como columna** (`user_chronotype.base_chronotype`): no hace falta — se deriva determinísticamente de `raw_scores` en un helper puro compartido. Una columna sería un segundo lugar de verdad que puede divergir. Si Cowork prefiere columna, la migración es trivial.
- **Snapear el schedule guardado del delfín al del madre en DB**: `validatedSchedule` ya lo hace en runtime (dato máquina). Un data-fix SQL masivo sin bug reportado = riesgo innecesario.
- **El item de foco NO empuja tareas automáticamente** dentro de la ventana (p.ej. mover bloques cognitivos ahí): eso es re-planificación automática de la agenda del user y roza "datos user sagrados". El item informa y educa; la automatización sería decisión de producto.

## Dudas para Enrique
1. **Delfín con agenda del madre**: ahora un Delfín con madre Lobo tiene anclas de Lobo (wake 08:00, sleep 00:00) en vez de Oso. La tesis dice "se apegue a su madre" — pero si prefieres que TODOS los delfines usen ancla Oso (ritmo solar conservador) mientras se estabilizan, es 1 línea de revert en `normalizeChronotype` (los tests marcan ambos caminos). **Default aplicado: madre real**, porque es lo que el copy promete.
2. El item "Ventana de foco profundo" aparece todos los días si hay peak_focus. ¿Lo quieres solo entre semana?

## Checklist de device (Enrique)
- [ ] Cuenta con cronotipo normal (León/Oso/Lobo): agenda muestra "Ventana de foco profundo" a la hora del peak_focus; Mi Cronotipo sin cambios visibles.
- [ ] Cuenta/estado Delfín: Mi Cronotipo muestra "TU CRONOTIPO DE BASE" con el animal REAL (no siempre Oso) y el copy de la tesis; resultado del quiz consistente.
- [ ] Delfín: horas de agenda (Despertar/Dormir/anclas de intervenciones) corresponden al madre (p.ej. madre Lobo → Dormir 00:00).
- [ ] Re-test de cronotipo (León→Oso): HOY + agenda + Mi Cronotipo reflejan el cambio sin reiniciar la app.
- [ ] Catálogo: la card del baño caliente dice "termina ~90 min antes de dormir".

## Commits
1. `MB-6 Sueño 1` — Delfín estado temporal + cronotipo madre en todo el sistema (9 archivos)
2. `MB-6 Sueño 2` — #117 baño caliente: antelación vs duración
3. `MB-6 Sueño 3` — ventana de foco pico → agenda
