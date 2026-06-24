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

# SPRINT OVERNIGHT — AUTH Mini-Sprint (23-jun-2026)

**Branch:** `feat/auth-minisprint-23jun` (desde `main`). **NO merge, NO OTA.**
**Resultado:** `npx tsc --noEmit` → **0 errores**. `npx vitest run` → **560/560 (77 archivos)**, 0 regresiones (7 tests nuevos).

## Nota de base (D0)
El handoff dice "base main después del merge de labs-desmadre/4partes que Enrique hizo hoy", pero
`origin/main` AÚN no tiene esos sprints mergeados. **A diferencia del sprint anterior, este es
independiente**: toca login/register/forgot/auth-context/day-compiler/brand/(tabs)/index/_layout,
SIN overlap con los archivos de labs. Por eso se branqueó desde `main` (como pide la instrucción):
da una branch que mergea limpio e independiente. `app/economy/admin.tsx` traía un WIP de Enrique
("Mi Economía"→"Mi Progreso") — se dejó intacto; commits selectivos.

## Tabla 4/4 partes

| Parte | Estado | Notas |
|---|---|---|
| A — Auth UI fixes | ✅ | logo grande, inputs 100% width, footer links, gradient + teal en 3 pantallas |
| B — onboarding zombie | ✅ (con fix de bloqueo) | NO era zombie: tenía ref viva → repoint + borrado seguro (ver D-B) |
| C — Splash/Loading unificado | ✅ (alcance conservador) | SplashLoader + progreso real; integración en (tabs) HOY, rewire de boot diferido (D-C) |
| D — Reset password deep link | ✅ | redirectTo atp:// + pantalla + handler + parser testeado |

## PARTE A — Auth UI (login / register / forgot-password)
- **Fix 1 (logo):** login con logo a ~22% del alto (`Dimensions`) + tagline teal. Register/forgot sin logo gigante (handoff).
- **Fix 2 (inputs width):** causa raíz — `EliteInput.container` no tenía width; el password iba en un wrapper `width:100%` y el email no → desalineados. Fix: `width:'100%'` por DEFAULT en EliteInput (arregla las 3 pantallas de un golpe, menos invasivo). Se quitó el `containerStyle` redundante del password en login.
- **Fix 3 (footer):** `src/components/auth/AuthLinksFooter.tsx` (marca ATP+Comunidad en teal arriba, Términos+Privacidad gris abajo). Solo en login. Abre con `Linking.openURL`.
- **Fix 4 (contraste teal):** `ATP_BRAND.teal = '#1ABC9C'` (el más bajo del molecule gradient). Aplicado a: labels+focus de inputs (prop opcional `accentColor` en EliteInput — NO cambia el resto de la app), links secundarios, back arrow, tagline. CTA principal sigue lima. Fondo: `src/components/auth/AuthScreen.tsx` con gradient sutil `#0A0E14→#000` (expo-linear-gradient), usado por las 3 pantallas (consistencia).

## PARTE B — onboarding zombie (DECISIÓN D-B, bloqueo resuelto)
**El handoff afirmaba "0 llamadas entrantes" — FALSO.** `app/index.tsx:81` hacía
`<Redirect href="/onboarding" />` para usuarios SIN sesión: `app/onboarding.tsx` era la pantalla de
entrada logged-out (carrusel de 3 slides). Borrarlo a secas dejaría una ruta muerta en el arranque.
**Resolución conservadora y reversible:**
1. Repoint `app/index.tsx:81` `/onboarding` → `/login` (flujo estándar; el onboarding real vive en `/onboarding-basics + /onboarding/*`).
2. Quitado `<Stack.Screen name="onboarding">` de `_layout.tsx`.
3. `git rm app/onboarding.tsx`.
Verificado: 0 referencias residuales a `/onboarding` exacto. Cambia el first-run UX (sin carrusel) →
si Enrique lo quería, revertir es trivial (git). Documentado para su decisión.

## PARTE C — Splash/Loading (DECISIÓN D-C, alcance conservador)
- `compileDay(userId, onProgress?)` — callback opcional, additive (callers viejos no rompen). Hitos: 10 perfil → 45 métricas → 65 señales → 80 energía → 95 agenda → 100 listo.
- `src/components/SplashLoader.tsx` — logo + tagline + **barra 0-100% animada (Reanimated 4 withTiming)** + label; modo error con Reintentar. Misma identidad visual que el splash nativo.
- **Integración:** se reemplazó el bloque de loading indeterminado de `app/(tabs)/index.tsx` ("Compilando tu día…" + spinner) por `<SplashLoader>` alimentado por el progreso real. **Conservador:** NO se rewireó el boot (render en `app/index.tsx` antes de navegar + eliminar doble carga). Rewirear el arranque sin verificación en device es alto riesgo (pantalla blanca = catastrófico). El SplashLoader visualmente idéntico al splash nativo ya hace que las dos fases se sientan continuas. **Rewire completo del boot → DIFERIDO a auditoría de Enrique.**

## PARTE D — Reset password deep link
- `auth-context.resetPassword`: `redirectTo: 'atp://reset-password'`.
- `app/reset-password.tsx`: lee tokens (params) → `setSession` valida → form (nueva+confirmar) → `updateUser({password})` → `/login`. Estados validating/ready/invalid con mensajes claros. Estilo auth consistente.
- `app/_layout.tsx`: handler `Linking.addEventListener('url')` + `getInitialURL()` (cold start) → parsea y enruta.
- `src/utils/reset-password-link.ts`: parser PURO `parseResetPasswordUrl` que cubre tokens en FRAGMENT (#, default de Supabase) **y** query (?). 7 tests.

## Tests
- ✅ `src/utils/__tests__/reset-password-link.test.ts` (7 tests: fragment, query, url-encoded, faltantes).
- ⚠️ Test de `day-compiler` onProgress: NO corre en este harness — el grafo de imports de day-compiler rompe el transform de vitest ("Expected 'from', got 'typeOf'", mismo límite ya visto con argos-service). El `onProgress` se valida por tsc + smoke en device. (Se intentó con supabase mockeado; el error es de parse de un módulo transitivo, no de mock.)

## Archivos
**Nuevos:** `src/components/auth/AuthScreen.tsx`, `src/components/auth/AuthLinksFooter.tsx`, `src/components/SplashLoader.tsx`, `app/reset-password.tsx`, `src/utils/reset-password-link.ts`, `src/utils/__tests__/reset-password-link.test.ts`.
**Modificados:** `app/login.tsx`, `app/register.tsx`, `app/forgot-password.tsx`, `app/index.tsx`, `app/_layout.tsx`, `app/(tabs)/index.tsx`, `src/contexts/auth-context.tsx`, `src/services/day-compiler.ts`, `src/constants/brand.ts`, `components/elite-input.tsx`.
**Borrados:** `app/onboarding.tsx`.

## Checklist de cierre
- [x] `npx tsc --noEmit` → 0 errores
- [x] `npx vitest run` → 560/560 (7 nuevos)
- [ ] **Enrique:** smoke device — login/register/forgot consistentes (teal + gradient + logo)
- [ ] **Enrique:** smoke — barra de progreso real al abrir HOY
- [ ] **Enrique:** smoke — email de reset abre `atp://reset-password` y permite cambiar contraseña
- [ ] **Enrique:** confirmar que NO se quería el carrusel de onboarding.tsx (si sí, revertir D-B)
- [ ] **Enrique:** decidir si quiere el rewire completo del boot (D-C) en un follow-up

---
---

# SPRINT OVERNIGHT — HOY Redesign Editorial (23-jun-2026)

**Branch:** `feat/hoy-redesign-editorial-23jun`. **NO merge, NO OTA.**
**Resultado:** `npx tsc --noEmit` → **0 errores**. `npx vitest run` → **587/587 (80 archivos)**, 0 regresiones (27 tests nuevos).

## D0 — base de branch + recuperación de git
`origin/main` AÚN no tiene mergeados labs-desmadre / 4partes / auth-minisprint. Este sprint
**reescribe `app/(tabs)/index.tsx`**, que auth-minisprint ya modificó (SplashLoader) → branquear
desde main puro garantizaría conflicto en ese archivo. **Branqueado desde `feat/auth-minisprint-23jun`**
(la branch más reciente que toca ese archivo + ya tiene `ATP_BRAND.teal`). Stack para Enrique:
main → 4partes/labs/auth → HOY.

⚠️ **Recuperación de git:** al crear la branch, el índice venía contaminado con cambios staged de
4partes+labs (restos de operaciones git previas) + un COWORK_REPORT sin-mergear. Se limpió a un
estado idéntico a auth-minisprint (HEAD), **preservando el WIP de Enrique en `admin.tsx`** ("Mi
Progreso") y los untracked `R and D/*`. Los archivos de 4partes/labs ya están commiteados en sus
branches; aquí eran solo contaminación.

## D-scope — qué se entregó vs. qué se difirió (conservador, "NO frankenstein")
El HOY (`app/(tabs)/index.tsx`) tiene **2363 líneas** y 25+ estados interdependientes (suplementos,
journal, weekly insight, voice, daily review…). Reescribir su cuerpo (rip-out de secciones + wiring
de 15 cards) **sin verificación visual** es el riesgo de frankenstein que el handoff pide evitar, y
choca con "NO romper HoyDayCard ni Suplementos". Por eso:

- ✅ **ENTREGADO (fundación completa + testeada + integraciones seguras).**
- ⏸️ **DIFERIDO con guía** (abajo): el rewrite del cuerpo del HOY (Parte 1 grande + Parte 4) y Parte 7.

## Tabla 8 partes

| Parte | Estado | Notas |
|---|---|---|
| 1 — Cleanup viejos | ⚠️ Parcial | Header limpio (ElectronBadge + engrane retirados, Parte 6). Rip-out de Próximo Electrón/agenda hardcoded/proteína suelta → DIFERIDO (va junto al wiring Parte 4) |
| 2 — `<EditorialCard>` | ✅ | `src/components/hoy/EditorialCard.tsx` (+ placeholder gradient Parte 8 incluido) |
| 3 — HeroAgendaCard + lógica local | ✅ | `HeroAgendaCard.tsx` + `local-recommendation.ts` (20 reglas, 14 tests) |
| 4 — 14 cards en HOY | ⏸️ DIFERIDO | Componentes + registry listos; wiring al cuerpo del HOY → guía abajo |
| 5 — Toggle ON/OFF + DB | ✅ | migración 096 + `visibility-service.ts` (9 tests) + sección "Mostrar en HOY" en protocol-config |
| 6 — Campana badge real | ✅ | `notifications-service.ts` (4 tests) + badge de conteo en el header del HOY |
| 7 — Tab icons gradient | ⏸️ DIFERIDO | requiere `@react-native-masked-view/masked-view` (NO instalado) → dep nativo, no se instala overnight |
| 8 — Placeholders B/N | ✅ | integrado en EditorialCard/HeroAgendaCard (gradient sólido + icono si falta `imageBn`) |

## Fundación entregada (reusable, compila, testeada)
- `src/constants/hoy-cards.ts` — registry de las 14 cards (cardKey, categoría, icono, título, gradient, ruta) + orden default.
- `src/components/hoy/EditorialCard.tsx` — card editorial full-bleed con 4 estados (pending/in_window/done/out_of_hour) + placeholder de gradient.
- `src/components/hoy/HeroAgendaCard.tsx` — hero con countdown + 2 botones (lima/teal).
- `src/services/hoy/local-recommendation.ts` — mensaje contextual GRATIS (sin ARGOS), 20 reglas. **14 tests.**
- `src/services/hoy/visibility-service.ts` + `supabase/migrations/096_hoy_cards_visibility.sql` — toggles ON/OFF (default: todas visibles, HOY nunca vacío por datos). **9 tests.**
- `src/services/hoy/notifications-service.ts` — conteo resiliente (cada fuente en su try/catch; tabla futura inexistente → 0). **4 tests.**

## Integraciones seguras hechas en pantallas existentes
- **`app/(tabs)/index.tsx`** (header): retirado `ElectronBadge` + engrane (acceso ya existe en el botón "Configurar mi protocolo" al final del scroll); campana ahora con **badge de conteo real** (`countUnreadNotifications`, refresca al focus). El cuerpo del HOY queda intacto (estable).
- **`app/protocol-config.tsx`**: sección "MOSTRAR EN HOY" con switches por card; persiste inmediato y emite `hoy_visibility_changed`.

## GUÍA de integración del cuerpo del HOY (Parte 1 grande + Parte 4) — para Enrique / follow-up
Todo lo necesario ya existe; falta el wiring visual (que necesita tu ojo). Receta:
1. En `app/(tabs)/index.tsx`, cargar visibilidad: `const [cardsVisible, setCardsVisible] = useState<Set<string>>(new Set(HOY_CARD_ORDER_DEFAULT))`; cargar en focus con `getCardsVisible(user.id)`; listener `DeviceEventEmitter.addListener('hoy_visibility_changed', …)`.
2. **Remover** (Parte 1): la card "Próximo Electrón" (~L853-883), la sección agenda hardcoded (~L1327-1474), el bloque "Te faltan Xg proteína" suelto. (Líneas pre-cleanup; re-verificar tras este commit.)
3. **Insertar** tras `<HoyDayCard>`: `<HeroAgendaCard>` (alimentado por `day.agendaItems.find(i=>i.isNext)` + `generateLocalRecommendation`), luego map sobre `HOY_CARD_SPECS` filtrando `cardsVisible.has(spec.cardKey)`, renderizando `<EditorialCard>`. Los DATOS ya están en `day`: estado "done" desde `day.booleanElectrons` (completed) / progreso desde `day.quantitativeElectrons` (proteína/agua) / UV desde `uvMini`. El tap reusa los handlers existentes (`onElectronTap`) o `router.push(spec.route)`.
4. Suplementos detallado y el botón "Configurar mi protocolo" se quedan al final (KEEP).
Es un **re-skin de datos que el day-compiler YA computa**, no 15 flujos nuevos.

## Parte 7 (tab icons gradient) — por qué diferida
Requiere `@react-native-masked-view/masked-view` (no instalado). Instalar un dep NATIVO overnight
implica un build nativo que no se puede verificar aquí. **Enrique:** `npx expo install
@react-native-masked-view/masked-view` + build, luego aplicar el `GradientIcon` del handoff en `_layout.tsx`.

## Archivos
**Nuevos:** `src/constants/hoy-cards.ts`, `src/components/hoy/EditorialCard.tsx`, `src/components/hoy/HeroAgendaCard.tsx`, `src/services/hoy/local-recommendation.ts`, `src/services/hoy/visibility-service.ts`, `src/services/hoy/notifications-service.ts`, `supabase/migrations/096_hoy_cards_visibility.sql`, + 3 archivos de tests.
**Modificados:** `app/(tabs)/index.tsx` (header cleanup + badge), `app/protocol-config.tsx` (sección toggles).

## Checklist de cierre
- [x] `npx tsc --noEmit` → 0 errores
- [x] `npx vitest run` → 587/587 (27 nuevos)
- [ ] **Enrique:** `npx supabase db push` (migración 096 — columna hoy_cards_visible)
- [ ] **Enrique:** smoke — badge de campana con conteo; toggles "Mostrar en HOY" persisten
- [ ] **Enrique:** wiring del cuerpo del HOY (Parte 1+4) siguiendo la guía, con feedback visual
- [ ] **Enrique:** instalar masked-view + build para Parte 7 (tab icons gradient)

---
---

# SPRINT OVERNIGHT — Tabs Redesign V1.3 (24-jun-2026)

**Branch:** `feat/tabs-redesign-v13-24jun` (desde `feat/hoy-redesign-editorial-23jun` — base correcta, explícita). **NO merge, NO OTA.**
**Resultado:** `npx tsc --noEmit` → **0 errores**. `npx vitest run` → **591/591 (81 archivos)**, 0 regresiones (4 tests nuevos; +27 de la fundación heredada).

## D0 — bloqueo crítico de assets (require)
El handoff usa `require('@/assets/images/hoy-extra/uv.jpg')` "con fallback gradient". **PERO** un
`require()` de un archivo INEXISTENTE **rompe el bundler de Metro en build-time** (no es fallback de
runtime); y `require(\`...cronotipo-${x}.jpg\`)` dinámico **no lo soporta Metro**. Verifiqué: NINGUNA
carpeta editorial existe (`agenda/`, `electrons/`, `hoy-extra/`, `yo/`, `pillars/` vacías). **Decisión:
OMITIR `imageBn` en TODAS las cards** → EditorialCard cae a su placeholder de gradient (ya implementado,
funciona con `imageBn` undefined). Cuando Enrique suba assets, basta pasar `imageBn={require(...)}`.

## D-scope — conservador (3 pantallas principales, sin verificación visual)
Reescribir HOY (2363 líneas, estado entrelazado: voice/journal/weekly) + YO (dashboard pulido con
constelación interactiva) a ciegas es el riesgo de frankenstein que el handoff pide evitar, y choca
con "NO romper". Por eso:

| Parte | Estado | Notas |
|---|---|---|
| EditorialCard `size` | ✅ | variante normal/hero/pillar |
| 3 — MI ATP (kit) | ✅ COMPLETO | rewrite a 2 pillar cards (Historia Clínica + Hábitos; 3ª "ATP MI SALUD" retirada) |
| 1 — HOY body | ✅ Cards cableadas (aditivo) | `HoyEditorialSection` (15 cards, datos reales de `day`, gated por visibility). Cleanup de secciones viejas DIFERIDO (ver abajo) |
| 5 — composition | ✅ Verificada | `/edad-atp/composition` existe y es ruta válida; su card-tap llega con el redesign de YO |
| 2 — YO redesign | ⏸️ DIFERIDO | reemplazar la constelación/dashboard pulido a ciegas = alto riesgo; specs en el handoff |
| 4 — Tab icons gradient | ⏸️ DIFERIDO | requiere `@react-native-masked-view` (dep nativo) + rebuild no verificable |

## Cómo quedó HOY (Parte 1)
- `src/components/hoy/HoyEditorialSection.tsx` — aísla TODO el wiring nuevo; el `index.tsx` de 2363
  líneas solo ganó: 1 import, el estado `cardsVisible` + carga, y 1 línea de render tras el hero.
- Renderiza: Hero (próximo evento de `day.agendaItems`) + UV (uvMini) + Check-in/Proteína/Agua
  (electrones bool/cuant de `day`) + 8 cards de electrones (map cardKey→source) + Cardio/Pasos.
  **Defensivo** (optional chaining + fallbacks → no crashea por dato faltante). Gated por
  `cardsVisible` (visibility-service + listener `hoy_visibility_changed`).
- **ADITIVO a propósito:** NO removí las secciones viejas (Próximo Electrón, grid de electrones,
  counters proteína/agua, agenda hardcoded, voice/journal). Removerlas a ciegas del archivo
  entrelazado es el riesgo que evitamos. **Cleanup = paso de auditoría visual de Enrique** (las
  cards nuevas conviven con las viejas hasta entonces). Guía de removals en el handoff Parte 1.

## Parte 3 (MI ATP) — completa
`app/(tabs)/kit.tsx` reescrito: header + 2 `EditorialCard size="pillar"` (Historia Clínica →
/health-hub, Hábitos → /habits-portal). Retiré `ElectronBadge` del header (unificar economía).
Subtítulos descriptivos simples (sin queries pesadas → estable; el conteo real labs/biomarcadores
es follow-up).

## Diferidos — detalle
- **Parte 2 (YO):** `yo.tsx` (533 líneas) tiene `SubEdadConstellation` (interactiva), anillo de
  disciplina, grid de composición — UX pulida y funcional. Reemplazarla por 10 cards editoriales a
  ciegas degradaría y arriesgaría. Specs completas en el handoff; recomiendo hacerlo con feedback
  visual. (La migración 097 `yo_cards_visible` tampoco se creó — decisión: YO no usa toggles aún.)
- **Parte 4 (tab icons):** `npx expo install @react-native-masked-view/masked-view` + build nativo,
  no verificable overnight. El `GradientIcon` del handoff queda listo para pegar en `_layout.tsx`.

## Archivos
**Nuevos:** `src/components/hoy/HoyEditorialSection.tsx`, `src/constants/__tests__/hoy-cards-registry.test.ts`.
**Modificados:** `src/components/hoy/EditorialCard.tsx` (variante `size`), `app/(tabs)/kit.tsx` (rewrite), `app/(tabs)/index.tsx` (sección editorial aditiva + estado cardsVisible).

## Checklist de cierre
- [x] `npx tsc --noEmit` → 0 errores
- [x] `npx vitest run` → 591/591 (4 nuevos)
- [ ] **Enrique:** smoke device — MI ATP (2 pillars), HOY (cards editoriales debajo del hero), toggles
- [ ] **Enrique:** subir assets B/N a `assets/images/{electrons,hoy-extra,yo,pillars,agenda}/` → cards muestran foto
- [ ] **Enrique:** cleanup visual del HOY (remover secciones viejas que las cards reemplazan)
- [ ] **Enrique:** YO redesign (Parte 2) con feedback visual
- [ ] **Enrique:** masked-view + build para tab icons (Parte 4)
