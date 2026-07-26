# 👻 DELIVERY · MB-6 — Columnas fantasma que corrompen el ATP Score

**Rama:** `feat/mb6-fantasmas-score` (desde `main`) · **tsc:** 0 errores · **tests:** 2217/2217 verdes (214 archivos)
**1 migración (234, idempotente, SIN db push — se aplica tras el merge y ANTES del OTA). Sin tocar versión.**
Esquema verificado contra el remoto real (ELITE-APP-FULLDB) el 2026-07-26.
*v2 del delivery: §3 corregido por decisión de Enrique — nullable + rename legacy + motor_version, no valor sustituto.*

---

## El hallazgo raíz (aplica a los 3 y al barrido)

`supabase-js` **no lanza excepción en errores 4xx** — el error viene en `{ error }` del
resultado. Por eso los `try/catch` de estos servicios nunca vieron el 400: el código veía
`data == null`, caía al fallback y el catch quedaba de adorno. La regla que queda en el
código: **chequear `error` explícitamente y loguearlo** (`logWarn` → breadcrumb Sentry,
que es exactamente el canal por el que Cowork cazó estos tres).

---

## 1 · `food_logs.quality_score` (componente Nutrición) — DECISIÓN

**No se crea columna.** La calidad ya vive donde dijo `nutrition-score-core`:
`ai_analysis.score` (registro IA) o `notes.quality_score` (registro manual, JSON en notes).
`calcNutrition` ahora usa la **misma regla** que `nutrition-score-service` (fuente canónica).
Además el filtro estaba mal tipado: `food_logs.date` es `date`, y se filtraba
`.gte(today).lt(today + 'T23:59:59')` — ahora `.eq('date', today)`.
Estados honestos: comidas con score → promedio; comidas sin calificar → neutral 50 con
detail "N comidas sin calificar"; sin registro → "Sin registro hoy".

## 2 · `daily_plans.completed_tasks/total_tasks` (componente Protocolo) — DECISIÓN

Columnas reales: `completed_actions`, `total_actions`, `compliance_pct`.
Se usa `compliance_pct` (ya calculado) con fallback a `round(completed/total)`.
**Estados distinguibles** vía `source/detail`:
- `Protocolo · X/N acciones` — hay plan (incluye plan al 0% = `0/N`)
- `Sin protocolo · Sin plan activo` — no hay fila hoy
- `Sin datos · No se pudo leer el plan` — error de query (y se loguea)

## 3 · `edad_atp_calculations` (histórico Edad ATP) — DECISIÓN FINAL (corregida por Enrique)

**Migración 234** (idempotente), tres movimientos en la misma migración:

1. **`algoritmo_excel` → nullable.** Es del motor v1 (matriz V7/V6, donde
   `edad_integral = algoritmo_excel + modificador_cognitivo`); el motor v2 no lo produce
   y **no se rellena con valores sustitutos**. (La primera versión de esta rama mapeaba
   `edad_pre_modulador` ahí — revertido.)
2. **Rename de las 5 columnas legacy al vocabulario v2 real** — el insert las llenaba con
   áreas que no corresponden al nombre (`edad_cardiovascular` ← areas.**labs**,
   `edad_metabolica` ← areas.**riesgos**): arreglar solo el NOT NULL habría empezado a
   escribir datos mal etiquetados.
   `edad_metabolica`→`edad_riesgos` · `edad_corporal`→`edad_composicion` ·
   `edad_cardiovascular`→`edad_labs` · `edad_cognitiva`→`edad_cognicion` ·
   `edad_fitness` ya coincidía. Renames guardeados por existencia (re-ejecutables).
   Verificado antes de renombrar: **ningún otro punto del código lee esas 5 columnas
   por su nombre viejo** (los únicos accesos a la tabla son el insert del servicio y
   `app/(tabs)/index.tsx:261`, que solo lee `chronological_age, edad_integral`; los demás
   hits de esos nombres en el repo son claves de la matriz v1/tipos/tests, no queries).
3. **`motor_version` en la tabla.** Backfill de los **111 registros existentes**
   (2026-06-09 → 2026-06-12, verificado contra el remoto) como `'v1'`; el insert v2
   escribe `motor_version = MOTOR_V2_VERSION` (constante compartida en
   `edad-atp-motor-v2-config.ts`).

**La señal de ARGOS deja de mezclar motores:** `index.tsx:261` (edadAtpDelta → hero rec)
ahora filtra `.eq('motor_version', MOTOR_V2_VERSION)`. ARGOS llevaba 6 semanas usando el
último número del motor v1 (12 de junio); tras el db push la señal es null hasta que
exista el primer cálculo v2 — preferible a un número de otro motor. No existe hoy ninguna
otra lectura de la tabla (gráficas de tendencia aún no la consumen; cuando existan, la
regla es filtrar por `MOTOR_V2_VERSION`).

Extra: el insert ahora chequea `{ error }` — antes el catch jamás se enteraba del 400
(supabase no lanza), por eso **nunca se persistió un solo cálculo v2**.

**⚠️ Orden de deploy: merge → `npx supabase db push` (mig 234) → OTA.** Si el OTA sale
antes del push, el insert v2 falla logueado (fail-soft, igual que hoy) y el delta queda
null — sin crash, pero sin histórico hasta el push.

---

## 4 · BARRIDO COMPLETO código ↔ esquema real

Método: script (scratchpad `sweep.js`) que parsea cada cadena `supabase.from(...)` de
`src/`, `app/` y `components/` (select, insert, update, upsert, eq/gte/lt/order/match…)
y la cruza contra el esquema remoto (columnas + tipos + NOT NULL sin default).
Cada hallazgo se verificó a mano contra el código y contra `supabase/migrations/`
(ninguno tiene migración local pendiente que lo salve). 20 hallazgos brutos → 1 falso
positivo → **19 reales, 16 corregidos, 3 report-only.**

### Corregidos en esta rama

| # | Dónde | Fantasma | Consecuencia que tenía |
|---|-------|----------|------------------------|
| 1 | `daily-health-score.ts` calcNutrition | `food_logs.quality_score` + filtro timestamp sobre `date` | Nutrición del score siempre neutral 50 |
| 2 | `daily-health-score.ts` calcCompliance | `daily_plans.completed_tasks/total_tasks` | Protocolo siempre 0 — "Sin plan" con plan al 100% |
| 3 | `edad-atp-v2-service.ts:220` + mig 234 | insert sin `algoritmo_excel` (NOT NULL) + 5 columnas legacy mal etiquetadas | Edad ATP jamás persistida — cero histórico; y de haberse persistido, con nombres equivocados |
| 4 | `app/fitness-strength.tsx` recalculatePR | `exercise_logs.estimated_1rm/rep_range` | Al borrar un PR, **nunca se reconstruía** desde los logs (400 → rama de borrado). Ahora: Epley client-side (misma fórmula que `calc_estimated_1rm` SQL) y si la query falla NO se toca `personal_records` |
| 5 | `argos-service.ts` fetchUserPRs | `personal_records.reps` (real: `rep_range`) | ARGOS sin contexto de PRs |
| 6 | `atp-ai-service.ts:88` | `personal_records.exercise_name/reps` | Reporte IA coach sin PRs; nombre ahora vía embed `exercises(name_es, name)` |
| 7 | `health-score-service.ts:108` | `personal_records.exercise_name/reps` | Ajuste "Fuerza relativa" nunca aplicaba al health score |
| 8 | `health-score-service.ts:118` | `profiles.date_of_birth/biological_sex` | Fallback muerto que 400eaba — eliminado (esos campos viven SOLO en client_profiles) |
| 9 | `coach-panel-service.ts:123` | `consultations.date` (real: `consultation_date`) | Panel coach nunca mostraba última consulta |
| 10 | `edad-bridge-service.ts` getSexo | `profiles.biological_sex` (vive en `client_profiles`) | Benchmarks de fuerza siempre sin sexo |
| 11 | `app/quizzes.tsx:87` | `quiz_responses.is_complete` | Quizzes DB nunca aparecían completados → `.not('completed_at','is',null)` |
| 12 | `weekly-insight-service.ts:172` | `hydration_logs.goal_ml` (real: `target_ml`) | Hidratación semanal siempre 0% |

(+ chequeos `{ error }` y logging en los 6 componentes del score, nutrition-score-service
y el insert de Edad ATP — ver §5.)

### Report-only (Enrique prioriza)

| # | Dónde | Qué | Por qué no se tocó |
|---|-------|-----|---------------------|
| R1 | `hoy/notifications-service.ts:33` | `argos_daily_insights.read` no existe — el contador de insights sin leer siempre 0 (safeCount lo traga) | No hay NINGUNA columna de leído en esa tabla: se necesita migración (`read_at timestamptz`) o decidir contar los insights del día. Decisión de producto |
| R2 | `health-score-engine.ts:93,96` | Mismos fantasmas de PRs + `user_protocols.protocol_key` | **Archivo huérfano** — cero importadores. Candidato a retiro, no a fix |
| R3 | Falso positivo | `quiz-service.ts:98` embed `quiz_id!inner(slug)` | Válido: FK `quiz_results.quiz_id → quiz_templates` (verificada en pg_constraint) y quiz_templates sí tiene `slug` |

### Límites del barrido (honestidad)

- **48 inserts/updates con payload dinámico** (variable, no objeto literal) y **6 selects
  dinámicos** no son verificables estáticamente — el logging del §5 es la red para esos.
- `.rpc(...)` quedó fuera del alcance (el brief pedía select/insert/update).
- Tests (`__tests__`) excluidos.

## 5 · Que no vuelva a pasar

- Los 6 componentes de `daily-health-score` chequean `{ error }` + `logWarn` (breadcrumb
  Sentry) y usan `maybeSingle()` (0 filas ya no es "error" que ensucie el log).
- `nutrition-score-service`: error checks en food/hydration + logs en los catch de peso y trend.
- `edad-atp-v2-service`: el insert chequea `{ error }`.
- **Patrón para Cowork/futuros sprints:** `catch` vacío sobre lectura de datos = bug
  latente; y con supabase-js el catch NI SIQUIERA ve los 400 — siempre chequear `error`.

---

## Qué componentes del ATP Score se mueven (Enrique va a ver el cambio)

El score de la card **Disciplina ATP** (pantalla Yo) pondera: sueño 25% · actividad 20% ·
**nutrición 20%** · estrés 15% · recuperación 10% · **protocolo 10%**.

- **Nutrición (20%):** dejaba SIEMPRE 50 neutral. Ahora refleja la calidad real de tus
  comidas del día → si comes limpio (scores IA ~85), el componente sube ~+35 pts → **+7 pts**
  en el score global. Si comes mal, baja.
- **Protocolo (10%):** dejaba SIEMPRE 0. Con plan al 100% → **+10 pts** globales.
- Neto para un día bueno con plan cumplido: el score puede subir **hasta ~17 puntos**
  respecto a lo que veías. No es que mejoraste de golpe — es que ahora el número es real.
- **Edad ATP:** el número en pantalla NO cambia (el motor no se tocó); lo nuevo es que
  cada cálculo ahora SÍ se guarda (con `motor_version='v2'` y columnas bien etiquetadas)
  → el histórico/tendencia empieza a acumularse desde el db push + OTA.
- **Hero rec de HOY:** el `edadAtpDelta` que alimenta la recomendación de ARGOS deja de
  usar el número del motor v1 del 12 de junio; será null hasta tu primer cálculo v2
  post-deploy y desde ahí siempre del motor actual.
- Extra fuera del score: hidratación del insight semanal deja de ser 0%, el panel coach
  muestra última consulta, ARGOS y el reporte coach recuperan contexto de PRs, y borrar
  un PR lo recalcula de verdad.

## Protocolo

- Rama `feat/mb6-fantasmas-score` pusheada. **NO mergeada.** Cowork audita.
- Migración 234 idempotente en la rama, **SIN aplicar**. Deploy: merge → db push → OTA.
  Sin cambio de versión.
- Device test sugerido: (1) Yo → Disciplina ATP con comidas+plan del día, (2) borrar un
  PR con logs previos → debe reconstruirse, (3) Sentry breadcrumbs `[health-score]` si
  algo falla.
