# 👻 BRIEF · MB-6 — Columnas fantasma que corrompen el ATP Score (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb6-fantasmas-score` desde `main`. NO merge, tsc + tests verdes, **NO tocar la versión**, **NO `db push`**. Cowork audita.
**Origen:** caza de Cowork sobre los breadcrumbs del Sentry de Enrique (2026-07-26). CC ya cazó `exercise_logs.metadata` y `user_symptoms`; **estos tres son distintos** — no son tablas faltantes sino **nombres de columna equivocados y un NOT NULL sin llenar**, y por eso el barrido código↔esquema no los vio.

## ⚠️ EL PATRÓN, Y POR QUÉ IMPORTA
Los tres **fallan en silencio** dentro de un `catch` vacío y **devuelven 0 o el fallback**. No hay error visible: el usuario ve un número, y el número está mal. **Esto corrompe el ATP Score**, que es el corazón de la app.
**Regla que sale de aquí:** un `catch { /* silenciar */ }` sobre una consulta de datos **no debe devolver un valor plausible** — debe devolver "sin dato" y distinguirse de un cero real. Aplicar el criterio al barrer.

---

## 1 · `food_logs.quality_score` NO EXISTE *(componente Nutrición del score)*
`src/services/daily-health-score.ts:126` consulta `.select('quality_score')` → **400**.
Columnas reales de `food_logs`: `meal_type, meal_time, description, photo_url, ai_analysis, calories, protein_g, carbs_g, fat_g, hunger_level, satisfaction_level, notes, was_edited, source`.
**Contexto:** `nutrition-score-core.ts:259` menciona que la calidad vive en **`ai_analysis.score` o en un `quality_score` del registro manual**. O sea el dato existe pero **en otro lugar**.
**Default:** leer la calidad de donde realmente está (`ai_analysis.score`), o crear la columna si el registro manual la necesita. **Decide con el código en la mano, no adivines** — y si no hay dato, que el componente diga "sin registro", no un promedio inventado.

## 2 · `daily_plans.completed_tasks` / `total_tasks` NO EXISTEN *(componente Protocolo)*
`daily-health-score.ts:192` consulta `.select('completed_tasks, total_tasks')` → **400**.
**Las columnas reales se llaman `completed_actions` y `total_actions`** (además existe `compliance_pct` ya calculado).
**Consecuencia hoy:** el `catch` devuelve `{ score: 0, source: 'Sin protocolo', detail: 'Sin plan activo' }` — **siempre**. Enrique puede tener su plan al 100% y el score le dice que no tiene plan.
**Default:** usar los nombres correctos (o directamente `compliance_pct`, que ya viene calculado). Y que "sin plan" y "plan al 0%" sean **estados distinguibles**.

## 3 · `edad_atp_calculations` nunca guarda — `algoritmo_excel` es NOT NULL *(el histórico de Edad ATP)*
`edad-atp-v2-service.ts:220` inserta `chronological_age, edad_integral, ce_integral, edad_metabolica, edad_corporal, edad_cardiovascular, edad_fitness, edad_cognitiva`. Todas existen.
**Pero `algoritmo_excel` es `NOT NULL` sin default y el insert no la manda** → **400 en cada cálculo**, tragado por el `catch` de la línea 232.
**Consecuencia:** la Edad ATP **nunca se ha persistido**. No hay histórico ni tendencia — y la tendencia es justo lo que le da sentido a la métrica.
**Default:** decidir qué va en `algoritmo_excel` en el motor v2 (¿el resultado del algoritmo de la matriz V7/V6? ¿se vuelve nullable porque el v2 ya no la usa?). **Consultar a Enrique si no es obvio** — es su algoritmo. Si se vuelve nullable, migración idempotente.

---

## 4 · BARRIDO — buscar más del mismo tipo
Los dos que encontró CC eran *tablas faltantes*; estos tres son *columnas mal nombradas y constraints sin llenar*. **Falta un barrido de ese segundo tipo.**
**Default:** cruzar **cada `.select(...)`, `.insert(...)` y `.update(...)` del código contra el esquema real**, verificando:
- que cada columna del `select` exista,
- que cada `insert` cubra todas las columnas `NOT NULL` sin default,
- que los filtros usen columnas del tipo correcto (ej. `.gte('date', ...)` sobre una columna `date` vs `timestamptz` — el query de `food_logs` mezclaba `date` con `T23:59:59`).
**Entregar la lista completa de hallazgos** aunque no los arregles todos; Enrique prioriza.

## 5 · Que no vuelva a pasar
**Default:** que los `catch` silenciosos de lectura de datos **registren el error** (Sentry/log) aunque no lo muestren al usuario. Hoy estos tres llevaban semanas fallando sin dejar rastro visible salvo en los breadcrumbs. Un log basta para cazarlos en el próximo device test.

---

## Protocolo
`feat/mb6-fantasmas-score` desde `main`. Migraciones idempotentes si hacen falta. `npx tsc --noEmit` (0) + tests verdes. NO merge, NO tocar versión, NO `db push`.
**Delivery con:** qué decidiste en cada uno de los 3, la **lista completa del barrido del punto 4**, y qué componentes del ATP Score cambian de valor al arreglarlos (Enrique va a ver su score moverse y debe saber por qué).
