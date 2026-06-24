# COWORK_TASK — Sprint OVERNIGHT: 4 partes (22-jun)

**Origen:** decisiones de Enrique durante el smoke real de la economía + backlog 19-jun pendiente.

**Branch base:** `main` (con economía ya mergeada y activa).
**Branch nueva:** `feat/overnight-4partes-22jun` desde `main`.
**Estimado:** 10-14h CC overnight.
**SQL:** 1 migración nueva (094, ATP Labs catálogo extendido + flag clinical_only).
**Deploy:** ❌ NO merge, NO OTA. Push final, Enrique audita.

**OVERNIGHT MODE:**
- Si encuentras decisión bloqueante: toma la MÁS CONSERVADORA, documenta en COWORK_REPORT.
- NO te bloquees. NO frankenstein. Tokens canónicos. Reanimated 4 + haptic.
- NO tocar motor v2, parser AI (excepto agregar entries al canonical map), lab worker.

---

# ORDEN ESTRICTO

1. PARTE 1 — GlobalTopBar persistente (#75)
2. PARTE 2 — Idempotency doble cobro proxy ARGOS (#71)
3. PARTE 3 — ATP LABS catálogo extendido + fixes (#50)
4. PARTE 4 — TESTS pendientes (#51)
5. Tests + COWORK_REPORT + push

Si NO te cabe todo, prioridad: 1, 2, 3, 4. Si solo te dan 2: 1 y 2 (las más impactantes).

---

# PARTE 1 — GlobalTopBar persistente (3-4h)

## Objetivo
Header con pill (⚡E- · 💎H+ · Rank N) visible en **TODAS** las pantallas + botón derecho que cambia entre campana (HOY) y casita (otras pantallas, navega a `/`).

## Diseño
```
| ATP DAILY             ⚡ 25 · 💎 9.7K · Rank 1   (🔔) |   ← solo en HOY
| ← ATP LABS            ⚡ 25 · 💎 9.7K · Rank 1   (🏠) |   ← otras pantallas
| ← ATP CICLO           ⚡ 25 · 💎 9.7K · Rank 1   (🏠) |
```

## Implementación

### A. Crear componente `src/components/ui/GlobalTopBar.tsx`
- Props: `title: string`, `showBack?: boolean` (default true si no es HOY)
- Pill: usa el componente `<EconomyHeaderPill />` existente (self-gated por LAB_ECONOMY_ENABLED)
- Botón derecho:
  - Si `pathname === '/' || pathname.endsWith('/(tabs)')` → campana (notificaciones, abre el modal actual)
  - Sino → casita (Ionicons home-outline, tap → `router.replace('/')`)
- Safe area top con `useSafeAreaInsets()`
- Background semi-transparente (no rompe con backgrounds de pantallas)

### B. Aplicar en TODAS las pantallas

Buscar todos los archivos con `ScreenHeader` o headers customizados y reemplazar con `<GlobalTopBar>`. Pantallas a tocar (lista no exhaustiva, busca todas):

```
app/(tabs)/index.tsx        ← HOY (mantener título "ATP DAILY", botón campana)
app/(tabs)/yo.tsx
app/(tabs)/kit.tsx          ← Mi ATP
app/(tabs)/argos.tsx        ← ARGOS chat (cuidado: ya tiene header propio en argos-chat.tsx)
app/argos-chat.tsx          ← ARGOS standalone
app/edad-atp/labs.tsx       ← ATP LABS (verificar título)
app/edad-atp/today.tsx
app/edad-atp/biomarkers.tsx
app/cycle.tsx               ← ATP CICLO
app/cycle-settings.tsx
app/checkin.tsx
app/food-scan.tsx
app/supplements.tsx
app/labs/*.tsx              ← lab-confirmation, picker, etc.
app/historia-clinica/*.tsx
app/tests/*.tsx
app/protocol-config.tsx
app/economy/*.tsx           ← admin, shop, history, etc. (ya tienen ScreenHeader)
app/health-hub.tsx
app/mente.tsx               (o /mind si así se llama)
app/nutricion/*.tsx
app/fitness/*.tsx
app/salud/*.tsx
```

### C. Reglas de aplicación
- Mantener `<` back arrow donde ya existe (no romper navegación)
- El "back" es independiente del "home": atrás retrocede un nivel, casa va a `/`
- En HOY: NO `<` back arrow (es la raíz), botón derecho = campana
- En otras: `<` back arrow + botón derecho = 🏠

### D. Pill se self-gatea
La pill ya no renderiza si `LAB_ECONOMY_ENABLED=false`. Por lo tanto la pill desaparece si la feature se apaga (siguiendo el byte-idéntico).

## Tests
- Unit: `GlobalTopBar` renderiza pill cuando flag ON
- Unit: botón derecho = home cuando pathname !== '/'
- Unit: botón derecho = campana cuando pathname === '/'
- Manual: navegar HOY → LABS → ver casita → tap → vuelve a HOY

---

# PARTE 2 — Idempotency doble cobro ARGOS (1-2h)

## Bug confirmado
22-jun 8:16pm Enrique mandó 1 mensaje a ARGOS y el server cobró 2 veces (280 H+ × 2 = 560 H+) con 42ms de diferencia. Race condition: cliente envía 2 requests por doble tap / retry automático / React state.

## Generalizable a TODOS los call-sites de ARGOS
Mismo bug latente en: chat, food_estimate_photo, food_estimate_text, supplement_scan, lab_interpretation, routine, insight, weekly_insight.

## Solución

### A. Cliente: idempotency_key por intent
Donde se invoca `argos-proxy`:
```typescript
// Antes del invoke:
const idempotencyKey = uuidv4(); // o crypto.randomUUID si no rompe en RN (sino usa generateUUID helper)

await supabase.functions.invoke('argos-proxy', {
  body: { ...payload, idempotency_key: idempotencyKey, action_key: 'chat' },
});
```

**IMPORTANTE:** la app de ATP usa `generateUUID()` helper (no `crypto.randomUUID`, regla #2 de CLAUDE.md). Buscar `src/utils/uuid.ts` o similar.

Si la acción se reintentea, el cliente DEBE reusar la MISMA key (no generar nueva). El key debe nacer en el "intent" del usuario (ej. tap del botón send) y mantenerse para todos los retries.

### B. Server: argos-proxy verifica antes de cobrar
En `supabase/functions/argos-proxy/index.ts`, ANTES del `spend_protons`:

```typescript
const { idempotency_key, action_key } = body;

if (!idempotency_key) {
  // Bw compat: si no viene key, cobrar como antes (apps viejas)
  // Pero loguear warning a argos_logs para detectar adopción.
} else {
  // Buscar transacción previa con esa key
  const { data: prev } = await adminClient
    .from('proton_transactions')
    .select('id, amount')
    .eq('user_id', userId)
    .eq('action_key', action_key)
    .filter('metadata->idempotency_key', 'eq', idempotency_key)
    .limit(1)
    .maybeSingle();

  if (prev) {
    // Ya cobrado, no debit y procede al LLM normal (o retorna response cacheada si la guardamos)
    console.log('[economy] idempotent retry', idempotency_key);
    // Sigue al LLM (el cliente espera la response real, no error)
  } else {
    // Cobrar normal pero guardar la idempotency_key en metadata
    await adminClient.rpc('spend_protons', {
      p_user_id: userId, p_amount: cost, p_action_key: action_key,
      p_metadata: { idempotency_key, ...other }
    });
  }
}
```

### C. Migración 094 — índice GIN para queries rápidos (opcional)
Si la búsqueda por `metadata->idempotency_key` es lenta:
```sql
CREATE INDEX IF NOT EXISTS idx_proton_tx_idempotency
  ON proton_transactions ((metadata->>'idempotency_key'))
  WHERE metadata ? 'idempotency_key';
```

### D. Refund automático si la edge function de ARGOS devuelve error después del debit
Ya existe el refund manual. Asegurar que si el LLM falla (Anthropic 5xx, timeout, etc.) y se hizo debit, se haga `award_protons type='refund'` con la misma idempotency_key.

## Tests
- Unit: 2 requests con misma idempotency_key → 1 sola transacción
- Unit: 2 requests con diferentes keys → 2 transacciones
- Unit: request sin idempotency_key → cobro como antes (bw compat)
- Manual: doble-tap rápido en send de chat → 1 cobro server

---

# PARTE 3 — ATP LABS catálogo extendido + fixes (4-6h)

## A. Fix título doble (5 min)
En `app/edad-atp/labs.tsx` o donde aparezca, hay un título duplicado ("ATP LABS" arriba + "ATP LABS" en card). Buscar y consolidar a uno solo.

## B. Fix duplicados por unidades (30 min)
Algunos biomarcadores aparecen 2 veces en la UI por mismatch de unidades. Ejemplos conocidos:
- **testosterona** ng/mL vs ng/dL (rango ya corregido en sprint anterior 043)
- **hba1c** % vs decimal
- **hematocrito** % vs decimal

La canonicalización L3 (sprint anterior 081) debió resolver esto en INSERTs nuevos. Verificar:
1. ¿Hay registros viejos en `lab_values` con unidades no canónicas que ahora aparecen como duplicados en UI?
2. Si sí, query: identificar y normalizar (UPDATE con conversión correcta)
3. Verificar componente UI: si agrupa por `parameter_key`, debería ser único; si duplica, fix el agrupamiento

## C. Agregar 68 parámetros al catálogo (3-5h)

### Migración 094 — agregar columna `clinical_only` a `lab_clinical_ranges`
No hay tabla `lab_clinical_ranges` en DB hoy — los rangos viven en `src/constants/lab-clinical-ranges.ts` como constante. Solo agregar al archivo.

**PERO** sí hay que extender:
- `src/constants/lab-canonical-map.ts` (LAB_COLUMN_TO_CANONICAL, EXTRACTED_KEY_ALIASES)
- `src/constants/lab-clinical-ranges.ts` (LAB_ABSOLUTE_RANGES + nuevo field `clinical_only`)

### Estructura nueva del rango clínico
Modificar `LAB_ABSOLUTE_RANGES` para incluir flag `clinical_only`:

```typescript
export const LAB_ABSOLUTE_RANGES: Record<string, {
  min: number;
  max: number;
  unit: string;
  clinical_only?: boolean; // true = no tiene rango funcional definido en matriz V7/V6; usar solo clínico
}> = { ... };
```

Cuando un parámetro tenga `clinical_only: true`, la UI debe:
- Mostrar el valor capturado
- NO mostrar "banda funcional óptima" (no hay)
- Mostrar SOLO si está dentro/fuera del rango clínico válido
- Tooltip/sublabel: "Rango clínico (pendiente rango funcional)"

### Lote 1 — Usar rangos de matriz V7/V6 (7 parámetros)

Para cada uno, buscar en `MATRIZ_HOMBRES` y `MATRIZ_MUJERES` (de `edad-atp-matriz-v7-v6.ts`). Calcular rango clínico como `[min(bandLimits filtered no-null), max(bandLimits filtered no-null)]`.

Si el parámetro tiene rangos diferentes para hombres y mujeres, usar el RANGO MÁS AMPLIO (unión) en `LAB_ABSOLUTE_RANGES` (que es para validación clínica). La curva funcional sex-specific la usa el motor de Edad ATP por separado.

Parámetros:
1. `anti_tpo` — buscar en MATRIZ_HOMBRES/MUJERES (dominio inflamación o hormonal)
2. `antitiroglobulina` (mapping inglés: anti_tg)
3. `progesterona` (mapping inglés: progesterone)
4. `calcio` (mapping inglés: calcium)
5. `fosforo` (mapping inglés: phosphorus)
6. `neutrofilos` (mapping inglés: neutrophils_pct — verificar unidad % vs absoluto)
7. `proteinas_totales` (mapping inglés: total_protein)

Para cada uno, agregar entry en `LAB_ABSOLUTE_RANGES` (key = nombre inglés que usa el parser) y actualizar `LAB_COLUMN_TO_CANONICAL` para que mapee a la clave canónica española.

### Lote 2A — Clinical only, ya reconocidos en lab-canonical-map (30 params)

Estos YA están en el map como nombre inglés (PhenoAge-only o L2). Solo agregar rango clínico con `clinical_only: true`:

```typescript
t4_free:            { min: 0.1,  max: 5,    unit: 'ng/dL',  clinical_only: true },
total_t3:           { min: 30,   max: 400,  unit: 'ng/dL',  clinical_only: true },
total_t4:           { min: 1,    max: 25,   unit: 'µg/dL',  clinical_only: true },
dhea:               { min: 5,    max: 1500, unit: 'µg/dL',  clinical_only: true },
shbg:               { min: 5,    max: 200,  unit: 'nmol/L', clinical_only: true },
igf1:               { min: 30,   max: 500,  unit: 'ng/mL',  clinical_only: true },
non_hdl_cholesterol:{ min: 30,   max: 400,  unit: 'mg/dL',  clinical_only: true },
lp_a:               { min: 0,    max: 200,  unit: 'mg/dL',  clinical_only: true },
zinc:               { min: 30,   max: 200,  unit: 'µg/dL',  clinical_only: true },
esr:                { min: 0,    max: 150,  unit: 'mm/h',   clinical_only: true },
fibrinogen:         { min: 50,   max: 1000, unit: 'mg/dL',  clinical_only: true },
complement_c3:      { min: 30,   max: 200,  unit: 'mg/dL',  clinical_only: true },
complement_c4:      { min: 5,    max: 80,   unit: 'mg/dL',  clinical_only: true },
pt:                 { min: 8,    max: 60,   unit: 'seg',    clinical_only: true },
ptt:                { min: 15,   max: 200,  unit: 'seg',    clinical_only: true },
inr:                { min: 0.5,  max: 10,   unit: 'índice', clinical_only: true },
bilirubin_direct:   { min: 0,    max: 15,   unit: 'mg/dL',  clinical_only: true },
bilirubin_indirect: { min: 0,    max: 20,   unit: 'mg/dL',  clinical_only: true },
globulin:           { min: 1,    max: 6,    unit: 'g/dL',   clinical_only: true },
co2:                { min: 10,   max: 40,   unit: 'mEq/L',  clinical_only: true },
gfr:                { min: 5,    max: 200,  unit: 'mL/min', clinical_only: true },
platelets:          { min: 20,   max: 1000, unit: '×10³/µL', clinical_only: true },
rbc:                { min: 2,    max: 8,    unit: 'M/µL',   clinical_only: true },
mch:                { min: 15,   max: 45,   unit: 'pg',     clinical_only: true },
mchc:               { min: 25,   max: 40,   unit: 'g/dL',   clinical_only: true },
mpv:                { min: 5,    max: 15,   unit: 'fL',     clinical_only: true },
monocytes_pct:      { min: 0,    max: 25,   unit: '%',      clinical_only: true },
eosinophils_pct:    { min: 0,    max: 30,   unit: '%',      clinical_only: true },
basophils_pct:      { min: 0,    max: 10,   unit: '%',      clinical_only: true },
fructosamine:       { min: 100,  max: 600,  unit: 'µmol/L', clinical_only: true },
c_peptide:          { min: 0.1,  max: 20,   unit: 'ng/mL',  clinical_only: true },
```

Display labels en español (para UI):
- `t4_free` → "T4 Libre"
- `total_t3` → "T3 Total"
- `total_t4` → "T4 Total"
- `dhea` → "DHEA"
- `shbg` → "SHBG"
- `igf1` → "IGF-1"
- `non_hdl_cholesterol` → "Colesterol No-HDL"
- `lp_a` → "Lipoproteína(a)"
- `esr` → "VSG"
- `fibrinogen` → "Fibrinógeno"
- `complement_c3` → "Complemento C3"
- `complement_c4` → "Complemento C4"
- `pt` → "Tiempo de Protrombina"
- `ptt` → "Tiempo Parcial de Tromboplastina"
- `inr` → "INR"
- `bilirubin_direct` → "Bilirrubina Directa"
- `bilirubin_indirect` → "Bilirrubina Indirecta"
- `globulin` → "Globulina"
- `gfr` → "Tasa de Filtración Glomerular (TFG)"
- `platelets` → "Plaquetas"
- `rbc` → "Eritrocitos"
- `mch` → "HCM (Hemoglobina Corpuscular Media)"
- `mchc` → "CHCM (Concentración Corpuscular Media)"
- `mpv` → "VPM (Volumen Plaquetario Medio)"
- `monocytes_pct` → "Monocitos %"
- `eosinophils_pct` → "Eosinófilos %"
- `basophils_pct` → "Basófilos %"
- `fructosamine` → "Fructosamina"
- `c_peptide` → "Péptido C"

### Lote 2B — Clinical only, NUEVOS (32 params, keys en español)

Agregar al `LAB_COLUMN_TO_CANONICAL` el mapeo + al `LAB_ABSOLUTE_RANGES` el rango con `clinical_only: true`. También al `EXTRACTED_KEY_ALIASES` los aliases en inglés.

```typescript
// Marcadores tumorales
psa: { keys: ['antigeno_prostatico_especifico'] },
ca_125: { keys: ['ca_125'] },
ca_19_9: { keys: ['ca_19_9'] },
ca_15_3: { keys: ['ca_15_3'] },
cea: { keys: ['cea'] },
afp: { keys: ['alfa_fetoproteina'] },
// Autoinmunes
ana: { keys: ['anticuerpos_antinucleares'] },
anti_dna: { keys: ['anti_dna'] },
anti_ccp: { keys: ['anti_ccp'] },
// Cardio biomarcadores
troponin_i: { keys: ['troponina_i'] },
troponin_t: { keys: ['troponina_t'] },
bnp: { keys: ['bnp'] },
nt_pro_bnp: { keys: ['nt_pro_bnp'] },
ck_mb: { keys: ['ck_mb'] },
// Fertilidad
amh: { keys: ['hormona_antimulleriana'] },
inhibin_b: { keys: ['inhibina_b'] },
beta_hcg: { keys: ['beta_hcg'] },
// Paratiroides
pth: { keys: ['parathormona'] },
calcitonin: { keys: ['calcitonina'] },
vitamin_d_125: { keys: ['vitamina_d_125_activa'] },
// Endocrino
acth: { keys: ['acth'] },
aldosterone: { keys: ['aldosterona'] },
renin_activity: { keys: ['renina'] },
growth_hormone: { keys: ['hormona_crecimiento_gh'] },
// Virales / hepatitis
anti_hbs: { keys: ['anti_hbs'] },
hbsag: { keys: ['hbsag'] },
anti_hcv: { keys: ['anti_hcv'] },
hiv: { keys: ['hiv'] },
// Renal
microalbumin: { keys: ['microalbuminuria'] },
cystatin_c: { keys: ['cistatina_c'] },
tibc: { keys: ['capacidad_total_fijacion_hierro'] }, // verificar si no choca con "capacidad_de_fijacion_de_hierro" existente
// Otros
d_dimer: { keys: ['dimero_d'] },
procalcitonin: { keys: ['procalcitonina'] },
ammonia: { keys: ['amonio'] },
lactate: { keys: ['lactato'] },
reticulocyte_pct: { keys: ['reticulocitos_pct'] },
ige_total: { keys: ['ige_total'] }, // si ya está como 'ige', verificar antes de duplicar
```

Rangos clínicos (mismo formato que Lote 2A):
```typescript
psa:               { min: 0,    max: 200,    unit: 'ng/mL',   clinical_only: true },
ca_125:            { min: 0,    max: 1000,   unit: 'U/mL',    clinical_only: true },
ca_19_9:           { min: 0,    max: 1000,   unit: 'U/mL',    clinical_only: true },
ca_15_3:           { min: 0,    max: 500,    unit: 'U/mL',    clinical_only: true },
cea:               { min: 0,    max: 100,    unit: 'ng/mL',   clinical_only: true },
afp:               { min: 0,    max: 5000,   unit: 'ng/mL',   clinical_only: true },
ana:               { min: 0,    max: 5120,   unit: 'título',  clinical_only: true },
anti_dna:          { min: 0,    max: 500,    unit: 'IU/mL',   clinical_only: true },
anti_ccp:          { min: 0,    max: 500,    unit: 'U/mL',    clinical_only: true },
troponin_i:        { min: 0,    max: 50,     unit: 'ng/mL',   clinical_only: true },
troponin_t:        { min: 0,    max: 10,     unit: 'ng/mL',   clinical_only: true },
bnp:               { min: 0,    max: 5000,   unit: 'pg/mL',   clinical_only: true },
nt_pro_bnp:        { min: 0,    max: 35000,  unit: 'pg/mL',   clinical_only: true },
ck_mb:             { min: 0,    max: 300,    unit: 'U/L',     clinical_only: true },
amh:               { min: 0,    max: 30,     unit: 'ng/mL',   clinical_only: true },
inhibin_b:         { min: 0,    max: 500,    unit: 'pg/mL',   clinical_only: true },
beta_hcg:          { min: 0,    max: 300000, unit: 'mIU/mL',  clinical_only: true },
pth:               { min: 5,    max: 1000,   unit: 'pg/mL',   clinical_only: true },
calcitonin:        { min: 0,    max: 500,    unit: 'pg/mL',   clinical_only: true },
vitamin_d_125:     { min: 5,    max: 200,    unit: 'pg/mL',   clinical_only: true },
acth:              { min: 0,    max: 500,    unit: 'pg/mL',   clinical_only: true },
aldosterone:       { min: 1,    max: 100,    unit: 'ng/dL',   clinical_only: true },
renin_activity:    { min: 0.1,  max: 50,     unit: 'ng/mL/h', clinical_only: true },
growth_hormone:    { min: 0,    max: 50,     unit: 'ng/mL',   clinical_only: true },
anti_hbs:          { min: 0,    max: 1000,   unit: 'mIU/mL',  clinical_only: true },
hbsag:             { min: 0,    max: 10,     unit: 'índice',  clinical_only: true },
anti_hcv:          { min: 0,    max: 10,     unit: 'índice',  clinical_only: true },
hiv:               { min: 0,    max: 10,     unit: 'índice',  clinical_only: true },
microalbumin:      { min: 0,    max: 1000,   unit: 'mg/L',    clinical_only: true },
cystatin_c:        { min: 0.1,  max: 10,     unit: 'mg/L',    clinical_only: true },
tibc:              { min: 100,  max: 600,    unit: 'µg/dL',   clinical_only: true },
d_dimer:           { min: 0,    max: 50,     unit: 'µg/mL',   clinical_only: true },
procalcitonin:     { min: 0,    max: 500,    unit: 'ng/mL',   clinical_only: true },
ammonia:           { min: 5,    max: 500,    unit: 'µg/dL',   clinical_only: true },
lactate:           { min: 0.3,  max: 20,     unit: 'mmol/L',  clinical_only: true },
reticulocyte_pct:  { min: 0,    max: 15,     unit: '%',       clinical_only: true },
ige_total:         { min: 0,    max: 5000,   unit: 'IU/mL',   clinical_only: true },
```

Display labels en español:
- `psa` → "Antígeno Prostático Específico (PSA)"
- `ca_125` → "CA 125"
- `ca_19_9` → "CA 19-9"
- `ca_15_3` → "CA 15-3"
- `cea` → "Antígeno Carcinoembrionario (CEA)"
- `afp` → "Alfa-Fetoproteína (AFP)"
- `ana` → "Anticuerpos Antinucleares (ANA)"
- `anti_dna` → "Anti-DNA"
- `anti_ccp` → "Anti-CCP"
- `troponin_i` → "Troponina I"
- `troponin_t` → "Troponina T"
- `bnp` → "BNP"
- `nt_pro_bnp` → "NT-proBNP"
- `ck_mb` → "CK-MB"
- `amh` → "Hormona Antimülleriana (AMH)"
- `inhibin_b` → "Inhibina B"
- `beta_hcg` → "Beta-HCG"
- `pth` → "Parathormona (PTH)"
- `calcitonin` → "Calcitonina"
- `vitamin_d_125` → "Vitamina D 1,25 (activa)"
- `acth` → "ACTH"
- `aldosterone` → "Aldosterona"
- `renin_activity` → "Renina (actividad)"
- `growth_hormone` → "Hormona del Crecimiento (GH)"
- `anti_hbs` → "Anti-HBs (Hepatitis B)"
- `hbsag` → "HBsAg"
- `anti_hcv` → "Anti-HCV (Hepatitis C)"
- `hiv` → "VIH"
- `microalbumin` → "Microalbuminuria"
- `cystatin_c` → "Cistatina C"
- `tibc` → "Capacidad Total de Fijación de Hierro (TIBC)"
- `d_dimer` → "Dímero D"
- `procalcitonin` → "Procalcitonina"
- `ammonia` → "Amonio"
- `lactate` → "Lactato"
- `reticulocyte_pct` → "Reticulocitos %"
- `ige_total` → "IgE Total"

### Verificaciones obligatorias antes de commit
- [ ] Tests `lab-clinical-ranges.test.ts` no rompen con los nuevos rangos
- [ ] Test extra: `isLabValueValid('psa', 1000)` → false, `isLabValueValid('psa', 4.5)` → true
- [ ] Tests del parser con un PDF de prueba con algunos de estos nuevos parámetros (mock o fixture)
- [ ] `LAB_COLUMN_TO_CANONICAL` no tiene duplicados de keys (ej. confirmar que no choca `tibc` con existente `iron_binding`)

---

# PARTE 4 — TESTS pendientes (2-3h)

## Items del backlog 19-jun

### A. Cronotipos UI/UX
Verificar pantalla de cronotipos. Posibles ítems:
- Si está como pantalla independiente vs dentro de un cuestionario
- Estilo Braverman (1 pregunta/pantalla, progress, haptic)
- Resultado bien presentado con descripción del cronotipo

### B. Braverman UI/UX en TODOS los cuestionarios
- 313 preguntas Braverman ya están con `TestQuestionScreen`
- Aplicar misma UI/UX a cualquier cuestionario que aún use estilo viejo (forms con muchas preguntas en una pantalla)

### C. Cuestionarios HC (Historia Clínica)
- 5 cuestionarios HC ya creados (P5b): padecimientos personales, familiares, salud bucal, síntomas crónicos, tratamientos
- Verificar que TODOS usen `TestQuestionScreen` reusable (single + multi select)
- Verificar copy y validación con `FLAG Mariana` donde aplique

## Cleanup esperado
- Eliminar pantallas viejas de tests/cuestionarios si quedaron huérfanas
- Verificar que index/health-hub muestre los tests correctamente

---

# ENTREGABLE

## Archivos a crear/modificar

```
src/components/ui/GlobalTopBar.tsx                    ← NUEVO
src/constants/lab-canonical-map.ts                    ← extender con +32 nuevos
src/constants/lab-clinical-ranges.ts                  ← +68 rangos con clinical_only flag
supabase/functions/argos-proxy/index.ts               ← idempotency check
supabase/migrations/094_proton_tx_idempotency_index.sql  ← opcional, índice GIN
app/(tabs)/*.tsx                                      ← GlobalTopBar aplicado
app/edad-atp/labs.tsx                                 ← fix título doble
app/labs/*.tsx                                        ← UI Lab muestra label clinical_only
+ todas las pantallas listadas en PARTE 1
```

## Tests obligatorios
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos pasan + nuevos
- [ ] Tests idempotency: 2 requests misma key → 1 cobro
- [ ] Tests rangos clínicos: PSA, troponinas, marcadores nuevos
- [ ] Tests GlobalTopBar: pill, botón home/campana

## Anexar a COWORK_REPORT.md
- Tabla 4/4 partes con estado
- Decisiones autónomas (justificación)
- Flags pendientes (ej. si encontraste algún parámetro que ya tenía rango y necesitas decidir)

## Push pero NO merge, NO OTA
- `feat/overnight-4partes-22jun` pusheado a origin
- Enrique audita + smoke en device

---

# CONSTANTES Y REGLAS

1. NUNCA reescribir archivos completos → str_replace quirúrgico
2. Tokens canónicos (BG/BORDER/TEXT/ELEVATION)
3. Reanimated 4 + expo-haptics + PressableScale
4. NO tocar motor v2, parser AI core (solo extender catálogo), lab worker
5. `npx tsc --noEmit` antes de cada commit
6. Migraciones SQL como archivos .sql, NO ejecutarlas
7. Mantener app primordialmente en ESPAÑOL — display labels SIEMPRE en español; keys: español para nuevos, inglés para los existentes (no romper compat)
8. NUNCA usar `crypto.randomUUID` → usar `generateUUID` helper del kit
9. SIEMPRE `getLocalToday()` para date queries
10. `clinical_only: true` para los 61 parámetros sin matriz funcional — UI lo refleja como "Rango clínico (pendiente funcional)"

Buena overnight 🌙
