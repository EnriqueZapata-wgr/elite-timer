# COWORK REPORT — Sprint OVERNIGHT: Economía Cierre Total (22-jun)

**Branch:** `feat/economia-cierre-total` (desde `feat/economia-electrons-server-side`) · **Estado:** NO merge, NO OTA, **NO push** (Enrique aprueba)
**tsc:** 0 errores · **tests:** 553 pasan (515 base + 38 de economía acumulados) · **Feature OFF** (byte-idéntico verificado por test E2E flujo 5)
**Migración:** 093 idempotente — **NO ejecutada**. Doc operación: `docs/ECONOMIA_OPERACION.md`.

> Cierre de los placeholders y wiring diferido de los 2 sprints previos, calibrado contra el
> doc económico oficial `R and D/03_ECONOMIA_PROTONES_H_PLUS.md` (que ya existe en el repo).

## Estado por fase — 5/5

| Fase | Items | Estado |
|---|---|---|
| A | Investigación hookpoints + call-sites | ✅ `cowork_handoff/INVESTIGACION_HOOKPOINTS.md` |
| B | Cableado awards + lab-worker + call-sites | ✅ awards + lab-worker; call-sites guardados por 402 (ver flags) |
| C | Calibración con doc económico | ✅ rank real, referral 200k/50k, sub-bonus 100k, cap semanal test |
| D | Tests E2E flag simulado (5 flujos) | ✅ 5 tests + fix de ripple |
| E | Docs operación + reporte | ✅ |

## Cableado aplicado (FASE B)
- **Awards fire-and-forget (no-op si flag OFF):** hidratación (decay) y check-in [ya estaban];
  **nuevos:** meditación, food_photo (solo con foto — el doc no premia food_text), supplement_check
  (pantalla Suplementos + quick-toggle HOY, misma key idempotente entre ambos paths).
- **lab_uploaded:** award server-side en `lab-parser-worker` tras `extracted` (Opción 1 del handoff),
  gated por env, idempotente por upload_id, service_role.
- **Pre-flight:** chat ya wrappeado; el **402 del proxy es el guard real** de TODOS los call-sites.

## Calibración aplicada (FASE C, doc gana)
- **Curva de rank**: reemplazado el placeholder `sqrt` por la curva real por bandas (1-9/10-29/
  30-49/50-79/80-99) en `rank.ts` + SQL `economy_rank_from_lifetime` (migración 093, misma matemática)
  + `rankTierLabel` (insignias Iniciado→Maestro ATP) mostradas en RankBadge.
- **Referral**: 200,000 H+ al referrer + 50,000 al referido (era placeholder 100k).
- **subscription_bonus**: 100,000 H+ + RPC `grant_monthly_subscription_bonus` (service_role, para webhook IAP).
- **test_completed**: cap **semanal** (doc: 1/semana) vía `capWindow='week'` + `resolveWindow` rolling-7d.
- **Costos IA y montos de hábitos**: ya coincidían con el doc (validado por tests `award-rules`).

## Tests añadidos
- `award-rules.test.ts` (+resolveWindow week, amounts vs doc), `rank.test.ts` (curva por bandas +
  round-trip + insignias), `e2e-flow.test.ts` (5 flujos). Suite total: 76 files / 553 tests.

## Decisiones autónomas + FLAGS
1. **Ripple capture-service (resuelto):** cablear test_completed en `capture-service` arrastró
   `react-native` (vía electron-award-client) y rompió la colección de ~13 tests edad-atp en Vitest.
   → revertido; **test_completed se cableará a nivel pantalla** (infra lista, cap semanal hecho). FLAG.
2. **Wearables (sleep/steps/cardio): NO cableables** — `wearable-service` está DESACTIVADO (paquetes
   nativos removidos). Awards listos para cuando se reactive la ingestión. FLAG.
3. **withPreflight en food/lab/supplement/routine NO cableado**: son call-sites en SERVICIOS;
   meter Alert+router ahí sería frankenstein + ripple de tipo de retorno. El **402 server-side ya
   los guarda**. El pre-empt UX queda solo en chat (patrón establecido). FLAG (opcional).
4. **tier vs evidence_tier:** se mantiene `requiredEvidence` explícito (decisión del sprint previo).
5. **subscription reset/no-acumula** por ciclo: requiere flujo de billing (sprint IAP). FLAG.
6. **8 call-sites callAnthropic fuera de catálogo** (recipe, shopping_list, food_reanalysis,
   label_scan, meal_suggestion, daily_summary, clinical_interpretation, goal_decomposition): sin
   costo en el doc → NO se cobran. FLAG documentado en investigación.

## Para activar
Ver `docs/ECONOMIA_OPERACION.md` (comandos exactos, smoke, métricas, troubleshooting). Resumen:
merge 3 ramas → `db push` (082-093) → deploy 4 Edge Functions → flag ON (cliente + env servidor) → OTA.

---

# COWORK REPORT — Sprint OVERNIGHT: Award Electrones Server-Side + Pre-flight + Challenge Progress (22-jun)

**Branch:** `feat/economia-electrons-server-side` (desde `feat/economia-protones-h-plus`) · **Estado:** NO merge, NO OTA, **NO push** (Enrique aprueba)
**tsc:** 0 errores · **tests:** 542 pasan (515 base + 27 nuevos) · **Feature OFF** (`LAB_ECONOMY_ENABLED=false`)
**Migraciones:** 092 idempotente — **NO ejecutada**. **Edge Functions nuevas:** award-electrons, settle-challenge (NO desplegadas).

> Cierra el **bloqueante #1** del sprint 21-jun: el award de electrones por hábito ya NO es client-side; pasa por Edge Function validada. El cliente nunca acredita moneda.

## Estado de avance por parte — 5/5

| Parte | Items | Estado |
|---|---|---|
| 1 | Edge Function award-electrons | ✅ (+migración 092 idempotency atómica, +_shared/award-rules, 9 tests) |
| 2 | requestElectronAward + cableado | ✅ helper+4 tests; 2 hookpoints cableados, 8 diferidos (flag) |
| 3 | withPreflight + call-sites ARGOS | ✅ helper+4 tests; chat cableado, resto diferido (flag) |
| 4 | Challenge progress + settle-challenge | ✅ writer+EdgeFn+10 tests |
| 5 | Tests + verificación + reporte | ✅ tsc=0, 542 tests |

## Decisiones autónomas + FLAGS para Enrique

1. **Migración 092 (idempotency ATÓMICA).** La 091 chequeaba idempotency con `EXISTS` sobre
   metadata — race-prone (2 requests simultáneos → doble award). 092 añade columna
   `idempotency_key` + UNIQUE index parcial y reescribe `award_electrons` para que la INSERCIÓN
   de la tx sea la compuerta (`ON CONFLICT DO NOTHING`) → a prueba de concurrencia. Backfill de
   la key vieja en metadata. **NO ejecutada.**
2. **tier vs evidence_tier (ambigüedad del handoff).** El `tier` abstracto de HABIT_RULES
   ('premium'…) no coincide con el enum `evidence_tier` del cliente ('wearable'…). Definí
   `requiredEvidence` EXPLÍCITO por hábito (sin ambigüedad) y valido contra él. (sleep/steps/
   cardio→wearable; meditation/food/checkin→evidence; hydration/supplement→self; lab/test→elite.)
3. **Caps por día con ventana anti-abuso.** El server no conoce la TZ del usuario → acepta
   `local_date` del cliente PERO la clampa a ±1 día de hoy UTC (evita gaming de caps con fechas
   lejanas). Ventana = [date 00:00Z, +24h). Aproximación documentada; suficiente para anti-spam.
4. **Cableado de hookpoints PARCIAL (conservador).** El helper `fireElectronAward` está cableado
   en 2 hookpoints representativos: **hidratación** (ejercita el decay) y **check-in** (cap 1/día).
   Los 8 restantes (sleep/steps wearable, food foto/texto, meditación, supplement, lab, test) son
   **1 línea fire-and-forget c/u** pero quedan DIFERIDOS para tu review (tocar 8 flujos sensibles
   a ciegas en run autónomo es riesgoso; **inertes con flag OFF**). NO removí `awardBooleanElectron`
   legacy (maneja el ring de HOY actual): el award nuevo es ADITIVO al economy, no lo reemplaza.
5. **Call-sites ARGOS: el mapa del handoff NO existe.** Los 8 archivos `src/services/argos-chat.ts`
   etc. no existen — el cliente funnelea TODO por `callAnthropic` (anthropic-client.ts). Cableé el
   call-site real representativo (**sendMessage de argos-chat**, gate antes del update optimista).
   **El guard REAL es el 402 server-side del proxy** (ya existe); withPreflight es UX que lo
   pre-empta. Resto de wiring UI diferido a review.
6. **config.toml no existía** → creé uno mínimo con las 2 Edge Functions (verify_jwt=true). Si hay
   un config.toml más completo en otro entorno, reconciliar.
7. **settle-challenge** re-valida el criterio server-side (no confía en cliente) y el caller solo
   liquida su propia participación; la RPC es idempotente (no re-paga).

## Archivos creados
```
supabase/migrations/092_electron_transactions_idempotency.sql
supabase/functions/award-electrons/index.ts
supabase/functions/settle-challenge/index.ts
supabase/functions/_shared/award-rules.ts
supabase/functions/_shared/challenge-criteria.ts
supabase/config.toml
src/services/economy/electron-award-client.ts
src/services/economy/with-preflight.ts
src/services/economy/challenge-progress-writer.ts
src/services/economy/__tests__/{award-rules,electron-award-client,with-preflight,challenge-criteria,challenge-progress-writer}.test.ts
```
## Archivos modificados
```
src/services/hydration-service.ts   ← fireElectronAward('hydration_tap') (decay)
app/checkin.tsx                      ← fireElectronAward('checkin_emotional')
app/argos-chat.tsx                   ← withPreflight('chat') en sendMessage
```

## Smoke test checklist (tras activar flag + push migraciones + deploy Edge Functions)
- [ ] `LAB_ECONOMY_ENABLED=true` (economy-config.ts) + env del proxy + deploy award-electrons/settle-challenge.
- [ ] Tomar agua varias veces → award decreciente (2,2,2,1,…), cap a los 10.
- [ ] Repetir el mismo tap (misma idempotency_key) → NO doble award.
- [ ] Check-in emocional → +10 E- una vez/día.
- [ ] Chat ARGOS con H+ bajo → Alert "Ir a la Tienda" (no llama LLM); con H+ → normal.
- [ ] Unirse a reto + cumplir criterio → settle-challenge acredita premio una sola vez.
- [ ] **Con flag OFF (default):** tomar agua / check-in / chat → NO award E-, NO descuento H+,
      NO Alert. Comportamiento byte-idéntico al actual.

## Para activar (orden)
1. `npx supabase db push` (incluye 092). 2. Deploy Edge Functions award-electrons + settle-challenge.
3. `LAB_ECONOMY_ENABLED=true` en economy-config.ts + env del proxy. 4. Cablear los 8 hookpoints
restantes + call-sites ARGOS restantes (1 línea c/u). 5. Calibrar curva de rank/montos con el doc económico.

---

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

---
---

# SPRINT OVERNIGHT — 4 PARTES (22-jun-2026)

**Branch:** `feat/overnight-4partes-22jun` (desde `main`). **NO merge, NO OTA** — Enrique audita + smoke en device.
**Resultado:** `npx tsc --noEmit` → **0 errores**. `npx vitest run` → **574/574 tests pasan (79 archivos)**, 0 regresiones.

## Tabla 4/4 partes

| # | Parte | Estado | Notas |
|---|-------|--------|-------|
| 1 | GlobalTopBar persistente (#75) | Componente + tests + integración de referencia (labs) | Rollout masivo a ~50 pantallas DIFERIDO a auditoría (decisión D1) |
| 2 | Idempotency doble cobro ARGOS (#71) | COMPLETO | Migración 094 atómica + proxy + cliente + guard doble-tap + 5 tests |
| 3 | ATP LABS catálogo extendido (#50) | COMPLETO | +68 rangos, flag clinical_only, +33 canonical, +70 display labels ES, 13 tests |
| 4 | TESTS/cuestionarios (#51) | Auditado/documentado | Sin refactors riesgosos overnight (hallazgos H1-H4) |

---

## PARTE 2 — Idempotency doble cobro ARGOS (#71) — COMPLETO

**Bug:** 22-jun 8:16pm, 1 mensaje a ARGOS cobró 2x (280 H+ x2 = 560 H+) con 42ms de diferencia.

**Solución (defensa en profundidad, race-safe):**
1. **`supabase/migrations/094_proton_transactions_idempotency.sql`** — réplica EXACTA del patrón atómico de la 092 (electrones) para el GASTO de protones:
   - Columna `idempotency_key TEXT` + `UNIQUE INDEX` parcial en `proton_transactions`.
   - `spend_protons` v2: la INSERCIÓN de la tx es la compuerta atómica (`ON CONFLICT DO NOTHING`); el balance solo se debita si la tx se insertó. Misma firma (la key viaja en `p_metadata`) → `CREATE OR REPLACE` preserva permisos.
   - Retry idempotente devuelve `{ success:true, idempotent:true }` SIN re-debitar (chequeo ANTES del insufficient-check, para no leer un retry como "fondos insuficientes").
2. **`argos-proxy/index.ts`** — lee `idempotency_key` del body, lo pasa en `p_metadata` a `spend_protons` y al refund. En retry idempotente NO marca `economyDebited` (evita que este request refund-ee el cobro legítimo del otro). Warning a log si llega sin key (medir adopción). **Bw compat:** la RPC vieja ignora el campo `idempotent` → comportamiento idéntico al actual.
3. **Cliente** — `getArgosCallMetadata` genera `idempotencyKey` (uuid v4) por defecto y la hila a `callAnthropic` → body `idempotency_key`. **Generalizable:** TODOS los call-sites (chat, food_*, supplement_scan, lab_interpretation, insight, weekly_insight, etc.) que pasan `meta` obtienen idempotencia server-side automáticamente.
4. **Chat doble-tap** — `argos-chat.tsx`: guard de re-entrancy con `useRef` (SÍNCRONO, atrapa el doble-tap antes de que `loading`/state actualice) + una idempotency_key por turno hilada a `chatWithArgosEx`.

**Helper UUID canónico nuevo:** `src/utils/uuid.ts` (regla #2: nunca `crypto.randomUUID` directo). Antes estaba duplicado en routine-service / protocol-builder-service (se dejaron intactos — conservador; el nuevo código usa el canónico).

**PENDIENTE Enrique:** la migración 094 NO se ejecutó (regla #6). Tras auditar: `npx supabase db push`. El proxy tampoco se redeployó (NO deploy). Hasta entonces el cliente ya manda la key (inerte sin la RPC v2; el guard de doble-tap SÍ protege desde ya).

---

## PARTE 3 — ATP LABS catálogo extendido (#50) — COMPLETO

**Archivos:** `lab-clinical-ranges.ts` (+68 rangos, tipo `LabAbsoluteRange` con `clinical_only`, helper `isClinicalOnlyParam`), `lab-canonical-map.ts` (+33 entradas Lote 2B + 23 aliases), `component-meta.ts` (+70 display labels ES), `app/edad-atp/labs.tsx` (sublabel "Rango clínico (pendiente rango funcional)").

**Hallazgo:** casi todo el Lote 2A YA existía en el canonical-map (audit L2 19-jun). El trabajo real fue: el flag `clinical_only`, los rangos clínicos, el Lote 2B nuevo (marcadores tumorales/autoinmunes/cardio/fertilidad/etc.) y los display labels.

### Decisiones autónomas (conservadoras)

- **D2 — Rango ABSOLUTO != banda funcional de matriz (Lote 1).** El spec pedía calcular el rango de `anti_tpo`/`anti_tg`/`progesterone` desde las bandas de la matriz V7/V6. PERO `LAB_ABSOLUTE_RANGES` es un filtro de PLAUSIBILIDAD clínica (descartar basura del parser), no la banda óptima. Usar la banda de matriz (anti-TPO óptimo 0-35) como filtro absoluto **descartaría valores reales** de Hashimoto (100-1000+). Decisión: rango absoluto AMPLIO (anti_tpo/anti_tg 0-5000, progesterone 0-60), `clinical_only:false` (SÍ tienen curva funcional, que aplica el motor de Edad ATP aparte). Test cubre `isLabValueValid('anti_tpo', 500) === true`.
- **D3 — calcium/phosphorus/neutrophils_pct/total_protein NO están en la matriz.** El spec los listaba en Lote 1 (con matriz), pero la matriz solo tiene el PRODUCTO `calcio*fosforo`, no los individuales. Decisión: `clinical_only:true` con rango de plausibilidad clínica estándar.
- **D4 — Conflictos tibc/ige_total.** `tibc` = mismo biomarcador que `iron_binding` existente (canónico `capacidad_de_fijacion_de_hierro`, que SÍ está en matriz); `ige_total` = mismo que `ige` existente. Decisión: NO duplicar en canonical-map — aliasados vía `EXTRACTED_KEY_ALIASES` (`tibc`→`iron_binding`, `capacidad_total_fijacion_hierro`→`iron_binding`, `ige_total`→`ige`). Se conservan sus rangos (inocuos). Test lo verifica.
- **D5 — t4_free y platelets** ya existían en rangos → solo se les agregó `clinical_only:true` (mismos valores). Sin duplicar.

### Fix 3.A (título doble ATP LABS)
No se reprodujo un título duplicado literal: `labs.tsx` usaba un solo `PillarHeader title="Labs"`; "ATP Labs" es la card de navegación del hub `edad-atp/index.tsx`, no un header duplicado. Se resolvió de forma definitiva al integrar GlobalTopBar en labs (un solo header "ATP Labs"). El duplicado por unidades (3.B) no se reprodujo con los datos actuales (el agrupamiento por `parameter_key` ya es único) → FLAG a validar con datos reales en device.

---

## PARTE 1 — GlobalTopBar persistente (#75) — Componente + integración de referencia

**Entregado:** `src/components/ui/GlobalTopBar.tsx` (+ `global-topbar-utils.ts` con `isHomePath` puro testeable + 3 tests). Tokens canónicos (BG/BORDER/TEXT), `EconomyHeaderPill` self-gated, `AnimatedPressable`, haptic, safe-area. Campana en HOY (`onBellPress`), casita (`router.replace('/')`) en el resto; back independiente del home. Integrado como referencia en `app/edad-atp/labs.tsx` (swap limpio de PillarHeader; `<Screen edges={[]}>` para no duplicar safe-area).

### D1 — Rollout masivo DIFERIDO (decisión conservadora, "NO frankenstein")
El spec pedía aplicarlo a ~50 pantallas heterogéneas (ScreenHeader, PillarHeader con color de pilar, headers inline, y los HEROES a medida de las tabs HOY/Yo/Mi ATP). Aplicar 50 swaps sin verificación visual overnight es el riesgo de frankenstein que el handoff pide evitar. Además:
- Las tabs (index/yo/kit) tienen heroes bespoke + ya renderizan la pill → meterles GlobalTopBar encima crea doble-header; necesita decisión de diseño.
- PillarHeader aporta color de identidad de pilar que GlobalTopBar elimina (cambio de Design System a validar).

**Recomendación:** Enrique aprueba el componente en labs (device), y luego rollout por tandas (stack screens con PillarHeader primero: biomarkers, cycle, checkin, food-scan, supplements, health-hub, edad-atp/*, economy/*, tests/*; tabs al final con diseño revisado). Cada swap: `<Screen edges={[]}>` + reemplazar el header existente por `<GlobalTopBar title=... />`.

---

## PARTE 4 — TESTS/cuestionarios (#51) — Auditado (sin refactors riesgosos)

### Hallazgos
- **H1 — `TestQuestionScreen` NO existe en `main`.** El motor reusable + los 5 cuestionarios HC se crearon en el commit `7570251 feat(p5b)` que **nunca aterrizó en main** (solo se restauró la migración `079_historia_clinica` en `79b6819`). Hoy `TestQuestionScreen` es solo una referencia en un comentario de `TestInputScreen.tsx`. `app/historia-clinica/` NO existe. → El premiso de "verificar que los HC usen TestQuestionScreen" es inaplicable en esta branch. **Decisión Enrique:** cherry-pick de p5b (`7570251`)? Fuera de scope overnight (cambio grande, no auditado).
- **H2 — Cronotipos:** 3 pantallas (`app/quiz/chronotype.tsx`, `app/onboarding/chronotype.tsx`, `app/edad-atp/tests/chronotype.tsx` = re-export de quiz). Usan el componente reusable `QuizQuestion` (1 pregunta/pantalla, haptic). Funcionales.
- **H3 — Componentes reusables que SÍ existen:** `QuestionnaireScreen` (9 cuestionarios edad-atp por dominio) y `QuizQuestion` (onboarding). Bien.
- **H4 — Estilo viejo (monolítico):** Braverman (313 preguntas), functional-quiz, quiz-take. Funcionan. Refactorizarlos a un componente reusable overnight, sin verificación, es alto riesgo → DIFERIDO a backlog.

### Acción
Cero cambios de código en Parte 4 (opción más conservadora). No hay pantallas huérfanas seguras de borrar (borrar exige verificación visual). Todo documentado para decisión de Enrique.

---

## Resumen de archivos

**Nuevos:** `src/utils/uuid.ts`, `supabase/migrations/094_proton_transactions_idempotency.sql`, `src/components/ui/GlobalTopBar.tsx`, `src/components/ui/global-topbar-utils.ts`, `src/components/ui/__tests__/global-topbar.test.ts`, `src/services/__tests__/argos-idempotency.test.ts`, `src/constants/__tests__/lab-catalog-094.test.ts`.

**Modificados:** `argos-proxy/index.ts`, `argos-service.ts`, `anthropic-client.ts`, `app/argos-chat.tsx`, `lab-clinical-ranges.ts`, `lab-canonical-map.ts`, `component-meta.ts`, `app/edad-atp/labs.tsx`.

## Checklist de cierre
- [x] `npx tsc --noEmit` → 0 errores
- [x] `npx vitest run` → 574/574 (incl. 21 tests nuevos)
- [ ] **Enrique:** `npx supabase db push` (migración 094) tras auditar
- [ ] **Enrique:** redeploy `argos-proxy` (NO se deployó)
- [ ] **Enrique:** smoke device — doble-tap rápido en send → 1 solo cobro H+
- [ ] **Enrique:** aprobar GlobalTopBar en labs → rollout por tandas (D1)
- [ ] **Enrique:** decidir cherry-pick p5b (TestQuestionScreen + HC) (H1)

---
---

# SPRINT OVERNIGHT — ATP LABS Desmadre (23-jun-2026)

**Branch:** `feat/labs-desmadre-fix`. **NO merge, NO OTA.**
**Resultado:** `npx tsc --noEmit` → **0 errores**. `npx vitest run` → **585/585 (81 archivos)**, 0 regresiones (11 tests nuevos).

## Decisión bloqueante D0 — base de branch
El handoff dice "branch desde `main` con todo lo del 4partes ya mergeado", pero `origin/main` **NO**
contiene el sprint 4partes (quedó pusheado sin merge). Branquear desde `main` puro habría generado
historias divergentes de `lab-canonical-map.ts` (4partes ya lo extendió) → conflictos garantizados +
inventario inconsistente. **Decisión conservadora:** branquear desde `feat/overnight-4partes-22jun`
(el "main+4partes" de facto). Stack para Enrique: `main → 4partes → labs-desmadre`.

## Nota — WIP ajeno en el working tree
`app/economy/admin.tsx` traía una modificación sin commitear de Enrique ("Mi Economía" → "Mi
Progreso", 23-jun). NO es de esta tarea → se dejó intacta y los commits fueron selectivos (no se
incluyó admin.tsx).

## Tabla 5/5 fases

| Fase | Estado | Notas |
|---|---|---|
| 0 — Inventario | ✅ | `cowork_handoff/INVENTARIO_LABS.md` desde queries reales (MCP, read-only) |
| 1 — Aliases/canonical | ✅ | helper `canonicalParameterKey` + alias `total_cholesterol` (gap real detectado por test) |
| 2 — Dedup display | ✅ | `collapseLanguageDuplicates` (display-only, no toca motor) en `labs.tsx` |
| 3 — Migración 095 | ✅ | colisión-segura, `is_voided`, validada con BEGIN/ROLLBACK contra DB real |
| 4 — Forward fix | ✅ | `insertCanonicalBiomarkers` ahora canonicaliza la key (causa raíz) |
| 5 — Tests + report | ✅ | 11 tests nuevos + esta sección |

## Diagnóstico (FASE 0) — lo importante
- Los 73 `parameter_key` de `lab_values` están todos reconocibles: **NO hay basura** ("Levocartine
  fatum", "h41", etc. del screenshot NO existen en la tabla; void defensivo en 095, 0 matches).
- **14 pares en/es** conviven (raw inglés con unidad + canónico español con `unit=null`). El path PDF
  (`insertLabValuesFromRaw`→`toCanonicalEntries`) sí canonicaliza; el de **captura manual**
  (`insertCanonicalBiomarkers`) **NO** → causa raíz de las filas raw inglés.
- **Valor absurdo confirmado:** `testosterona_total` 9–9.93 (ng/mL etiquetado ng/dL) → ×100.
- **FLAG AST/GGT:** el canonical-map escribe cada uno a 2 claves → duplicado en UI. NO se auto-colapsa
  (ambas podrían alimentar el motor v2; regla #4). Decisión de matriz para Enrique.
- Query 3 (heurística difusa por valor-cercano) = **solo falsos positivos** → descartada.

## Arquitectura del fix (por qué así)
1. **`canonicalParameterKey`** (lab-canonical-map.ts): derivado del map — colapsa SOLO columnas
   inglesas de 1 destino (`testosterone`→`testosterona_total`); excluye automáticamente multi-key
   (ast/ggt) y self-maps (albumin/calcium/t4_free…). Una fuente, sin lista que mantener.
2. **FASE 2 = ya existía** (`dedupeLatestByKey` dedupea por key). El fix real es colapsar en/es:
   `collapseLanguageDuplicates` se aplica **solo en display** (labs.tsx), DESPUÉS de
   `loadCanonicalLabValues`, para NO alterar lo que ve el motor v2 (regla #4).
3. **FASE 4 = forward fix**: el worker NO inserta en `lab_values` (solo `extracted_data`); el insert
   real es cliente. Se reforzó `insertCanonicalBiomarkers` para canonicalizar la key → la captura
   manual ya no crea raw inglés.
4. **Migración 095**: `is_voided` (reversible) en vez de DELETE; merge colisión-seguro (void de la
   fila inglesa que choca con el UNIQUE + rename del resto); `metadata` jsonb para trazar el ×100.
   Validada con `BEGIN…ROLLBACK` contra la DB real (merge OK: testosterona 5→9, glucosa 16→18, hdl
   14→16; sin violación de constraint).

## Decisiones autónomas
- **D1** — Rango/merge ABSOLUTO: `testosterona_total < 50 → ×100` (heurística ng/mL→ng/dL). Reconcilia
  9.93→993 con el `testosterone` 994 mergeado. Anotado en `metadata`.
- **D2** — `calcium` NO se mapea a `calcio` (el handoff lo pedía): en el canonical-map `calcium` ES la
  clave canónica (`keys:['calcium']`) → mapearlo rompería. Se respeta el map.
- **D3** — AST/GGT doble-key: FLAG, no auto-fix (riesgo motor v2).
- **D4** — leucocitos mixtos / b12 6000 / testo libre 0.022: FLAG, no auto-fix (ver INVENTARIO §5).
- **D5** — Migración 095 validada con ROLLBACK (no persiste) para no entregar SQL roto; respeta "NO ejecutar".

## Archivos
**Nuevos:** `cowork_handoff/INVENTARIO_LABS.md`, `supabase/migrations/095_lab_values_cleanup.sql`,
`src/constants/__tests__/lab-canonical-aliases.test.ts`, `src/services/edad-atp/__tests__/lab-values-dedup.test.ts`.
**Modificados:** `src/constants/lab-canonical-map.ts` (canonicalParameterKey + alias total_cholesterol),
`src/services/edad-atp/lab-values-service.ts` (collapseLanguageDuplicates + insertCanonicalBiomarkers),
`app/edad-atp/labs.tsx` (aplica collapse).

## Checklist de cierre
- [x] `npx tsc --noEmit` → 0 errores
- [x] `npx vitest run` → 585/585 (11 nuevos: 6 aliases + 5 dedup)
- [x] Migración 095 validada con BEGIN/ROLLBACK (no persistida)
- [ ] **Enrique:** `npx supabase db push` (095 — añade columna metadata, merge en/es, ×100 testo)
- [ ] **Enrique:** OTA preview (`eas update --branch preview`) para el dedup de display
- [ ] **Enrique:** smoke device — ATP LABS sin duplicados en/es ni testosterona 9.93
- [ ] **Enrique:** decidir clave única AST/GGT (FLAG matriz)
