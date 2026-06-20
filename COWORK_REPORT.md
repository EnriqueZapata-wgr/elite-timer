# COWORK REPORT — Sprint OVERNIGHT MEGA: Bugs P0 + IA (backlog 19-jun)

**Branch:** `feat/bugs-p0-backlog-19jun` (desde `main`) · **Estado:** push, NO merge, NO OTA
**tsc:** 0 errores · **tests:** 474 pasan (465 previos + 9 nuevos de calendario ciclo)
**Migraciones:** 077, 078 listas como `.sql` — **NO ejecutadas** (regla #12).

## Estado de avance por parte

| Parte | Items | Estado |
|---|---|---|
| 1 | C1, C2, L1, N3, N4, H5 | ✅ Completa (H5 ya estaba — flag) |
| 2 | H1, H2, H8, HC2, HC4, Nu1 | ✅ Completa (H2 ya estaba) |
| 3 | M1, M2, HC3, N2 | ✅ Completa (M1 ya era card grande) |
| 4 | L2, HC1 ✅ · L3 🟡 | 🟡 Parcial (L3 flagged: dep inexistente) |
| 5 | T1 ✅ · T2, T3 ❌ | 🟡 Parcial (solo T1) |
| 6 | H3, H7 | ❌ No iniciada |
| 7 | C3 | ❌ No iniciada |
| 8 | N1 | ❌ No iniciada |

**Dónde paré y por qué:** completé Partes 1-4 + T1 de la Parte 5. T2 (migrar todos los tests a
UI tipo Braverman) y T3 (módulo de cuestionarios de Historia Clínica + migración 079) son builds
de varias horas cada uno; siguiendo la regla del task ("no empieces una parte que no cabe; para
limpio + flag") me detuve en el último item completable con calidad en vez de dejar código
frankenstein a medias. Partes 6-8 quedan para el siguiente overnight (orden estricto las pone
después de 5). Cada parte está en un commit incremental.

---

## Antes / Después por bug

### PARTE 1 — Bugs P0 visibles
- **C1+C2 (calendario ciclo).** Root cause ÚNICO: en `app/cycle.tsx`, `DAY_SIZE` calculaba el
  ancho con `SCREEN_W - 2*md - 12` pero el grid vive dentro de ScrollView(md)+card(md) = 4*md.
  Las 7 celdas quedaban ~20px anchas de más → la 7ª (Domingo) se envolvía a otra fila → grid
  desalineado: el viernes 19-jun aparecía bajo la columna "Lunes" (C1) y Domingo se veía vacío
  (C2). Fix: ancho real medido con `onLayout` (`cellSize = gridW/7`, a prueba de padding) +
  fórmula de fallback corregida. Helper puro `src/utils/cycle-calendar.ts` con 9 tests
  (alineación día↔encabezado, bisiesto, julio con 2 huecos, hoy en columna 4).
- **L1 (ATP ATP LABS).** `PillarHeader` ya antepone "ATP"; el title era "ATP Labs" → doble.
  Ahora title="Labs" → "ATP LABS".
- **N3 (burbuja feedback en prod).** `<FeedbackButton/>` en `app/(tabs)/_layout.tsx` ahora solo
  bajo `__DEV__ || isAdmin(user?.id)`.
- **N4 (safe area tabbar).** `paddingBottom: 8` hardcoded → `insets.bottom + 8` y
  `height: 60 + insets.bottom` (Android botones SO / iPhone home bar no se traslapan; gesture
  nav no agrega padding de más).
- **H5 (Inicia tu racha). FLAG:** el literal "Inicia tu racha" NO existe en el código. El header
  del HOY ya dice "ATP DAILY" (una de las frases sugeridas). El único string con "racha" es el
  chip funcional `🔥 Empieza tu racha` (cuando streak=0). No toqué copy funcional sin tu frase
  elegida. → Si quieres otra frase para el chip, dímela.

### PARTE 2 — Flujo + ruteo
- **H1 (tap checkin → /checkin).** `checkin` ahora es electrón VERIFICADO (`day-compiler.ts`):
  tap del hábito navega a `/checkin` (vía `onElectronTap`, no togglea), y el compilador lo
  enciende solo cuando hay un `emotional_checkin` de hoy (derivado de `moodRes`, sin query extra).
- **H2 (checkin enciende hábito + electrones). YA ESTABA:** `checkin.tsx` ya llamaba
  `awardBooleanElectron('checkin')` + `emit('electrons_changed'|'day_changed')` al guardar.
- **H8 (quitar acceso directo).** Card "Check-in emocional" sobre ACTIVIDAD eliminada del HOY.
- **HC2 (re-ruteo Historia Clínica).** Biomarcadores → `/health-input` (métricas: peso,
  composición, grasa visceral, fuerza de agarre, medidas — es la pantalla correcta, ver flag
  abajo); Laboratorios → `/edad-atp/labs`; card "Dominios de salud" eliminada.
- **HC4 (quitar ATP SOL).** Fuera de Historia Clínica; verificado accesible en Hábitos → Mente
  (`/mind-hub` → `/solar`).
- **Nu1 (quitar Hidratación + Ayuno de Nutrición).** Cards removidas; ambas viven en Hábitos →
  Mente (`/fasting`, `/hydration`). Limpié `addWater`/`waterPct`/`showEditor`/`WaterGoalEditor`.

### PARTE 3 — Information Architecture (Mi ATP = `app/(tabs)/kit.tsx`)
- **M1.** Las cards de Mi ATP ya eran grandes (120px, icono en círculo, título+descripción).
- **M2.** Nueva card grande "ATP MI SALUD" → `/my-health` (3 frentes: Historia Clínica, Hábitos,
  ATP MI SALUD).
- **N2.** Card de ARGOS eliminada de Mi ATP (pasa al menú inferior, Parte 8). `argos-chat` sigue
  funcional.
- **HC3.** Historia Clínica gana card explícita "ATP MI SALUD" → `/my-health`.

### PARTE 4 — ATP LABS profundo
- **HC1 (cetonas). ✅** `/ketones-log` funcional (espejo de `glucose-log`, mmol/L + rangos de
  cetosis nutricional); card activada en Historia Clínica; **migración 078** `ketones_logs`
  (NUMERIC mmol, RLS, NO ejecutada). Sin electrón (no hay key en el catálogo — NO toqué la
  economía; se puede sumar después).
- **L2 (audit biomarcadores). ✅** ~37 biomarcadores que el parser SÍ extrae se DROPEABAN por no
  tener mapeo en `LAB_COLUMN_TO_CANONICAL` → agregados (tiroides ext, hormonal, lípidos,
  minerales, inflamación/coag, hepático, renal, biometría hemática, metabólico). **Migración
  077** (columnas espejo en `lab_results`, flujo v1, NO ejecutada). Doc completo en
  `cowork_handoff/AUDIT_LABS_BIOMARKERS.md`.
- **L3 (unidades canónicas). 🟡 FLAG:** el task asumía un `lab-unit-converters.ts` con
  `normalizeLabValue()` que **NO existe**. Además `insertLabValuesFromRaw` recibe valores **sin
  unidad** (la unidad se pierde antes). Canonicalizar de verdad (testo ng/dL vs ng/mL → una sola
  serie) requiere un módulo nuevo de conversión por-unidad + propagar la unidad hasta el insert.
  Es un mini-sprint propio; no lo improvisé para no romper la time-series. Propuesta en el doc.

### PARTE 5 — Tests + Cuestionarios
- **T1 (Cronotipo en Tests). ✅** Wrapper `app/edad-atp/tests/chronotype.tsx` re-exporta el quiz
  existente (sin duplicar) + entrada en el índice de Tests.
- **T2 (UI Braverman para todos los tests). ❌** No iniciado — requiere un `<TestQuestionScreen>`
  reusable + migrar 8 tests (multi-hora).
- **T3 + HC5 (módulo cuestionarios Historia Clínica). ❌** No iniciado — requiere migración 079
  `historia_clinica` + pantalla índice + ≥3 cuestionarios + validación de preguntas con Mariana.

---

## FLAGS para Enrique
1. **H5:** dame la frase para el chip de racha si "Empieza tu racha" no te gusta (no existe
   "Inicia tu racha").
2. **HC2 Biomarcadores:** lo ruteé a `/health-input` (la pantalla de métricas: peso/composición/
   grasa visceral/músculo/agarre/medidas). Si esperabas otra, ajústalo.
3. **L3:** necesita módulo de conversión de unidades nuevo (no existe el que asumía el task).
4. **Cetonas:** sin electrón asociado (no quise tocar la economía). ¿Agregamos `ketones_log` al
   catálogo de electrones?
5. **Anomalía de repo (no la causé):** en `main` hay ~30 archivos core SIN trackear en git
   (`tsconfig.json`, `vitest.config.ts`, `types/`, migraciones 041-076) — existen en disco pero
   no están commiteados ni en local ni en `origin/main`. La app compila porque están en disco.
   Mis commits agregan explícitamente los archivos que toco. Vale la pena reconciliar esto.

## Migraciones (idempotentes, NO ejecutadas)
- `077_lab_results_missing_columns.sql` — columnas faltantes (L2).
- `078_ketones_logs.sql` — tabla cetonas (HC1).
- Pendientes para Partes 5/7: `079_historia_clinica`, `080_pregnancy_status`.

## Smoke test (lo que SÍ se puede validar de Partes 1-5/T1)
- [ ] CICLO: calendario 7 columnas alineadas; hoy (viernes) bajo "Vi", no "Lu".
- [ ] ATP LABS: header dice solo "ATP LABS".
- [ ] Sin burbuja feedback en build de producción (sí en dev/admin).
- [ ] TabBar por encima de los botones del SO en Android.
- [ ] HOY: sin card de acceso directo de Check-in sobre ACTIVIDAD; tap del hábito Check-in →
      `/checkin`; completar el checkin enciende el hábito.
- [ ] Historia Clínica: Biomarcadores → métricas, Laboratorios → ATP LABS, sin Dominios, sin
      ATP SOL, con card ATP MI SALUD, Cetonas activado (→ /ketones-log, guarda mmol/L).
- [ ] Nutrición: sin Hidratación ni Ayuno.
- [ ] Mi ATP: 3 cards grandes (HC, Hábitos, ATP MI SALUD), sin ARGOS.
- [ ] Tests: aparece "Cronotipo".
- [ ] Tras correr 077: subir PDF con panel completo → nuevos biomarcadores en `lab_values`.

## Commits
1. `fix(p0/parte1)` — calendario + título + feedback + safe area
2. `fix(p0/parte2)` — checkin + re-ruteo HC + limpieza Nutrición
3. `feat(p0/parte3)` — Mi ATP IA (ATP MI SALUD + quitar ARGOS)
4. `feat(p0/parte4)` — cetonas + audit L2 biomarcadores
5. `feat(p0/parte5)` — T1 Cronotipo en Tests
