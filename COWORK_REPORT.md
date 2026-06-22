# COWORK REPORT — Sprint OVERNIGHT: Economía Protones H+ (21-jun)

**Branch:** `feat/economia-protones-h-plus` (desde `main`) · **Estado:** NO merge, NO OTA, **NO push** (Enrique aprueba)
**tsc:** 0 errores · **tests:** 515 pasan (492 base + 23 nuevos de economía) · **Feature OFF** (`LAB_ECONOMY_ENABLED=false`)
**Migraciones:** 082–091 (10) idempotentes — **NO ejecutadas**.

## Estado de avance por parte — TODAS las 7 entregadas

| Parte | Items | Estado |
|---|---|---|
| 1 | 9 tablas SQL (+RPC 091) | ✅ Completa (10 migraciones; +seguridad, ver flag #1) |
| 2 | 5 servicios + tests | ✅ Completa (18 tests) |
| 3 | argos-proxy debit+refund | ✅ Completa (gated OFF → sin cambio de comportamiento) |
| 4 | UI admin + subpantallas | ✅ admin/convert/history/referrals + logros como "Pronto" |
| 5 | Tienda H+ Clash Royale | ✅ Completa (mock IAP) |
| 6 | Header HOY E-/H+/Rank | ✅ Completa (pill self-gated) |
| 7 | UI Retos | ✅ Completa (3 tabs + join) |

**Commits:** migraciones · servicios · proxy+preflight · UI (componentes+pantallas+header).

## Decisiones autónomas + FLAGS para Enrique

1. **🔒 SEGURIDAD (desviación deliberada vs handoff) — la más importante.** El RLS del handoff
   (`FOR ALL USING auth.uid()=user_id`) en balances/tx permitiría que el **cliente se auto-acreditara
   moneda** (exploit de minteo). Lo cambié a **SELECT-only** y TODA mutación pasa por **RPCs
   SECURITY DEFINER atómicas** (091, no estaba en el handoff). Permisos: débito/convert/join →
   `authenticated`; **crédito (award/settle) → solo `service_role`**. Consecuencia a resolver antes
   de activar: el **award de electrones por hábito** hoy es client-trigger → necesita path
   server-validado (edge fn / trigger / RPC con validación). Sin eso, los hábitos no acreditan E-
   desde el cliente. **Es el bloqueante #1 para encender la feature.**
2. **📄 Doc económico AUSENTE.** `Business development/Product Decisions/03_ECONOMIA_PROTONES_H_PLUS.md`
   NO existe en el repo (ni la carpeta `Business development/`). Usé los números calibrados que el
   **handoff ya embebe** (1 H+=$0.001, 100 E-=3000 H+, costos IA, paquetes). Faltan del doc y quedaron
   con placeholder/flag: **curva de rank** (`economy_rank_from_lifetime` / `rank.ts` — fórmula
   sqrt placeholder), **monto de subscription_bonus**, **REFERRAL_REWARD_PROTONS=100000** (placeholder).
   Calibrar con el doc cuando aparezca.
3. **IAP real no incluido** (sprint dedicado, como pide el handoff). `shop-service.mockPurchase`
   intenta `award_protons` (path del webhook) → desde cliente da error (esperado por anti-minteo).
   La compra real credita por **webhook server-side**. La UX de tienda/confirmación sí es real.
4. **Pre-flight de H+ en ARGOS:** helper `preflightAction()` listo (no-op si flag off) + el proxy
   responde 402. **NO cableé** el pre-flight en cada call-site de ARGOS ni el redirect a tienda
   (toca flujos UX de ARGOS; mejor con tu review visual). Wiring pendiente.
5. **Referrals signup/paid + challenge settle** son **server-side** (tocan filas de otro usuario /
   acreditan premio). Implementados pero deben invocarse desde edge fn/cron. `checkChallengeCriteria`
   compara progreso guardado vs objetivo, pero **quién escribe el `progress`** (evaluador por tipo de
   criterio) NO está hecho — flag.
6. **Refund** agregado al CHECK de `proton_transactions` (el handoff lo usaba sin incluirlo en el enum).
7. **RLS añadida** a `proton_action_costs` y `proton_packages` (el handoff las omitió; regla #4) como
   read-público (catálogo no secreto).

## Smoke test checklist (validar en device tras activar flag + push migraciones)
- [ ] `LAB_ECONOMY_ENABLED=true` → Header HOY muestra pill E-/H+/Rank; tap → /economy/admin.
- [ ] Admin: RankBadge con barra de progreso + BalanceCard H+ + filas de navegación.
- [ ] Convertir: stepper + preview en vivo; confirmar baja E- (no rank) y sube H+.
- [ ] Historial: filtro E-/H+ lista movimientos con signo/color.
- [ ] Tienda: 3 paquetes (oro/plata/bronce) + "Más Popular" en el medio; confirmación.
- [ ] Retos: tabs Disponibles/Activos/Historial; unirse cobra H+ y aparece en Activos.
- [ ] Referidos: código ATPxxxxxx + share nativo.
- [ ] ARGOS con balance bajo → proxy responde 402 insufficient_protons.
- [ ] Con flag OFF (default): el HOY y ARGOS se comportan EXACTAMENTE como hoy (sin pill, sin debit).

## Para activar la feature (orden)
1. `npx supabase db push` (migraciones 082–091).
2. Resolver el award server-validado de electrones por hábito (flag #1).
3. Set env `LAB_ECONOMY_ENABLED=true` en el edge function argos-proxy + `LAB_ECONOMY_ENABLED=true` en `economy-config.ts`.
4. Cablear pre-flight + redirect a tienda en call-sites de ARGOS.
5. Calibrar curva de rank + montos con el doc económico.

---

# COWORK REPORT — Sprint OVERNIGHT: L3 + TestInputScreen + H7 + N1 (20-jun)

**Branch:** `feat/overnight-l3-testinput-pulidos-20jun` (desde `main` @ 8505867) · **Estado:** push, NO merge, NO OTA
**tsc:** 0 errores · **tests:** 492 pasan (474 previos + 18 nuevos) · suite completa verde
**Migraciones:** `081_lab_values_canonicalize_units.sql` lista — **NO ejecutada** (regla #12). **082 NO necesaria** (ver H7).

## Estado de avance por parte

| Parte | Items | Estado |
|---|---|---|
| 1 | L3 canonicalización unidades | ✅ Completa (re-scoped — ver abajo) |
| 2 | TestInputScreen + 8 tests | 🟡 Componente ✅ + tests ✅; migración de los 8 NO hecha (conflicto de doctrina — FLAG) |
| 3 | H7 cache invalidar en day_changed | ✅ Completa |
| 4 | N1 back-arrow ARGOS | ✅ Completa (defensiva; síntoma depende de p8 — FLAG) |
| 5 | Purga magic colors | ⏭️ Skipped (opcional; sin deuda nueva introducida) |

**Commits:** `1381eea` (P1) · `<TestInputScreen>` P2 · `be9680d` (P3) · `069785d` (P4).

## ⚠️ Contexto del repo al arrancar (no lo causé — léelo primero)
- **NO arranqué en `main`.** El repo estaba en `feat/overnight-partes-5b-6-7-8` (sprint previo
  5b/6/7/8: cuestionarios HC, H3/H7-notif, C3 embarazo, N1-ARGOS-tab) **sin mergear ni pushear**,
  con cambios SIN commitear (`_layout.tsx`, `index.tsx`: N3 feedback solo-DEV + quitar VoiceButton FAB,
  fechados 2026-06-20). Para branchear desde `main` limpio los **stashié**:
  `git stash list` → `stash@{0}` ("WIP partes-5b-8…"). **Recupéralos** al volver a esa rama:
  `git checkout feat/overnight-partes-5b-6-7-8 && git stash pop stash@{0}`.
- **`main` NO contiene partes 5b-8** → `TestQuestionScreen` (referencia del task) vive en esa rama,
  no en `main`. Lo consulté vía `git show` sin mergear.

## Detalle + FLAGS para Enrique

### P1 — L3 (✅, re-scoped por hallazgo)
La premisa del task estaba **desactualizada**: `normalizeLabValue` YA existe y YA está wired en el
parser v2 (`lab-parser-process.ts` Capa 2) → **el path de PDF en vivo YA canoniza** (testosterona
ng/mL→ng/dL incluido). Por eso:
- **NO bolteé `normalizeLabValue` al insert** (`insertLabValuesFromRaw`): ahí los valores ya son
  canónicos, SIN unidad y con keys ESPAÑOLAS (`testosterona_total`) ≠ keys inglesas del converter →
  sería no-op / doble-conversión. El §1.1 del handoff asumía arquitectura vieja.
- **Migración 081 = conservadora, basada en `unit` EXPLÍCITO** (determinista). **NO** hace fix por
  magnitud (ambiguo: 15 = testosterona femenina real vs ng/mL) **NI** toca hba1c/hematocrito/rdw_cv
  (lab_values los guarda como DECIMAL canónico; el §1.3 del handoff los habría CORROMPIDO).
- **3 tests de regresión** de testosterona en el pipeline. **Filas legacy con `unit` NULL** quedan sin
  auto-fix (decisión tuya: ¿script con contexto de sexo por usuario, o dejar que el parser v2 las
  corrija al re-subir?).

### P2 — TestInputScreen (🟡 componente sí, migración no)
- ✅ **`<TestInputScreen>`** reusable (number/time/reps/distance, min/max, MM:SS, haptics, tokens) +
  helpers puros + **13 tests**. Aditivo, sin tocar nada existente.
- ❌ **NO migré los 8 tests.** Conflicto real: el codebase **ya evolucionó** a un **FORMULARIO
  consolidado** (`app/edad-atp/tests/balance.tsx`: 6 tests con `NumberInputRow` + key-auditing al
  motor v2) + motor de cronómetro (`StopwatchTestScreen` para plank/bolt), bajo doctrina **documentada
  en código**: *"SIMPLE vence inteligente: CERO flujos en vivo"* — lo OPUESTO al UX per-test con
  cronómetro embebido del task. Force-migrar **regresaría esa decisión de producto** y duplicaría
  `NumberInputRow`. **DECISIÓN TUYA:** (a) adoptar `TestInputScreen` y revertir la doctrina "cero
  flujos en vivo", (b) quedarte con el form consolidado actual, o (c) híbrido (TestInputScreen solo
  para tests nuevos/single-value). Dejé el componente listo para cualquiera.

### P3 — H7 (✅)
Invalidación del insight diario en `day_changed` (nutrición/ayuno). Marca la fila de HOY como vieja
(`created_at`→epoch) → próximo load regenera. **LAZY a propósito**: NO regenera en el listener porque
`day_changed` se dispara varias veces/día → evitaría spam de LLM (coincide con "próxima request
forzará re-generación" del handoff). En módulo aislado `argos-insight-cache.ts` (+2 tests). Scoped por
user_id (+RLS). **082 NO necesaria:** la tabla no tiene `expires_at`; la freshness ya es por `created_at`.
Nota: como el Home es tab persistente, "próxima carga" puede ser al re-montar/relanzar; si quieres
refresh al volver al tab, convertir el efecto del insight a `useFocusEffect` (1 línea, no lo hice por
ser efecto de Phase 1/2).

### P4 — N1 (✅ defensiva)
Back-arrow condicionado a `navigation.canGoBack()`. **En `main` ARGOS NO es tab** (es ruta pusheada →
canGoBack true → back visible, SIN cambio). El síntoma del task (back raro en tab raíz) **solo existe
tras mergear p8** (ARGOS-4to-tab, en la otra rama). El guard ya deja la pantalla correcta para ese
escenario. **Verifica N1 después de mergear p8.**

### P5 — Magic colors (⏭️ skipped, opcional)
Mis archivos NUEVOS ya usan tokens (cero magic colors introducidos). Los existentes tocados con magic
colors son `index.tsx` (Phase 1/2 — OFF-LIMITS) y `argos-chat.tsx` (purga cosmética con riesgo cerca
del fix de markdown). Regla "opcional / no bloquear / NO tocar Phase 1/2" → skip.

---

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
