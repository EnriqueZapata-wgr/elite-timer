# 🔍 Auditoría pre-merge · TRAMO 3 (MB-8 pulido + MB-10 onboarding)

**Fecha:** 2026-07-19 · **Auditor:** Cowork · **Diff auditado:** `feat/mb7-ciclo..feat/mb10-onboarding` (11 commits: 8 MB-8 + 1 delivery, 2 MB-10 + 1 delivery)
**Alcance:** SOLO tramo 3. Tramo 2 (mb5/6/7) ya auditado APTO — no se re-auditó.

---

## VEREDICTO: ✅ APTO PARA MERGE

**Cero bloqueadores.** 5 observaciones menores (ninguna detiene el merge), 1 decisión pendiente de Enrique (default de voz), y un orden de deploy obligatorio (abajo).

---

## 1. MIGRACIONES (máxima prioridad)

### 204_ketones_sources.sql — ✅ APTA
Solo `ALTER TABLE` sobre `ketones_logs` (tabla creada en `078_ketones_logs.sql`, que ya tiene `ENABLE ROW LEVEL SECURITY` + policy `"Users manage own ketones" FOR ALL USING (auth.uid() = user_id)` — las columnas nuevas heredan la RLS de la tabla, no se necesita policy nueva).

Idempotencia verificada línea por línea:
```sql
ALTER TABLE ketones_logs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'blood';
ALTER TABLE ketones_logs ADD COLUMN IF NOT EXISTS value_ppm NUMERIC(5,1);
ALTER TABLE ketones_logs ADD COLUMN IF NOT EXISTS urine_level TEXT;
ALTER TABLE ketones_logs ALTER COLUMN value_mmol DROP NOT NULL;  -- no-op si ya es nullable
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ketones_source_check') THEN
    ALTER TABLE ketones_logs ADD CONSTRAINT ketones_source_check
      CHECK (source IN ('blood', 'breath', 'urine'));
  END IF; ...
```
- Filas viejas → `source='blood'` por el DEFAULT: **sin pérdida ni reescritura de datos**.
- CHECKs guardados por `pg_constraint` → re-ejecutable sin error. ✅

### 205_argos_voice.sql — ✅ APTA
Solo ADD COLUMN sobre `profiles` (RLS activa desde 007 + hardening 038). Todo dentro de un `DO $$` con guardas `information_schema.columns` / `pg_constraint`:
```sql
IF NOT EXISTS (SELECT 1 FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'argos_voice') THEN
  ALTER TABLE profiles ADD COLUMN argos_voice TEXT;
...
CHECK (argos_voice IS NULL OR argos_voice IN ('masculina', 'femenina'));
```
Idempotente real. NULL permitido por diseño (= aún no elegida). ✅

### Tolerancia del cliente a columna ausente (OTA antes de db push)
- **argos_voice:** `saveArgosVoice` retorna `!error`; el picker lo envuelve en `try/catch` fail-open y `onDone()` corre igual → si la columna no existe, la voz simplemente no se guarda, **cero crash**. `getArgosVoice` valida el valor y devuelve `null` en error. ✅
- **cetonas:** el `insert` en `ketones-log.tsx` SIEMPRE manda `source`/`value_ppm`/`urine_level` → si la columna no existe, el guardado **falla con Alert** ("No se pudo guardar" — schema cache). No crashea y no corrompe nada, pero el registro de cetonas queda roto hasta el db push. La lectura (`select('*')` + fallback `log.source ?? 'blood'`) sí tolera la columna ausente. ⚠️ **Por esto el db push va ANTES del OTA** (ver orden de deploy).

### #20 · Migraciones 198/199 planas (afirmación de CC)
Verificado en `supabase/migrations/`: existen `198_rewrite_handle_new_user.sql` y `199_drop_supplement_protocols.sql` con nombres planos (no 198a/198b). CC además verificó el historial remoto vía MCP (delivery MB-8 §Higiene): ya aplicadas con esos nombres, sin `migration repair` necesario. Consistente. ✅

---

## 2. MB-10 ONBOARDING

**#3 Flujo post-pago completo — ✅.** onboarding v2 (preexistente) → `/argos/meet` cinemática → `ArgosVoicePicker` (nuevo, dentro de meet.tsx vía `showVoice`) → `finish()` → `router.replace('/(tabs)')` = HOY → `AppTour` editorial auto-dispara la 1ª vez (`@atp/tour_completed`). **Cero pantallas de venta/pricing en el diff** — ni una string de precio/suscripción añadida; el único enlace externo (Tribu/Skool) es preexistente y no se movió.

**#4 "Saltar" + default de voz — ✅ con decisión pendiente.**
- Voz: "Saltar · elegir después" siempre visible; tour: "Saltar" en las 7 pantallas (incluida la última — `skip` llama a `finish`).
- Si salta la voz: `argos_voice` queda **NULL**. NO se infiere de `biological_sex` (verificado: cero lecturas de sexo en picker/servicio) ✅. PERO el default 'masculina' **no está implementado en código** — hoy nada consume `argos_voice` (`getArgosVoice` no tiene callers; el consumidor real llega con ElevenLabs MB-4 J5), así que el default es una decisión diferida, explícita en el delivery (duda #4). **Cuando se cablee el consumidor, aplicar `?? 'masculina'` ahí.** No bloquea: no hay comportamiento incorrecto posible hoy.

**#5 Pantalla 6 condicional — ✅.** `buildTourSteps(sex)` usa `isFemale = sex === 'female'` estricto; `index.tsx` alimenta `sex` desde `profiles.biological_sex` (línea 450). male/null/undefined → COMUNIDAD. Test de regresión explícito: `buildTourSteps('male')`/`(null)` NO contienen CICLO. El bug hombre-embarazado no puede renacer aquí. ✅

**#6 Copy Meet ARGOS #141 — ✅ INTACTO.** El diff de `meet.tsx` toca SOLO imports y control de flujo (`begin()` ya no navega, abre el picker; `finish()` nuevo). Ni una string del copy cinemático cambió. La frase del preview (`PREVIEW_LINE` en argos-voice-service) es nueva y está anotada como "NO es el copy #141". Flag/task #141 sigue pendiente. ✅

**#7 Preview TTS honesto + puntos de integración aislados — ✅.** Copy del picker: "Escucha una muestra y elige. Puedes cambiarla cuando quieras" — no promete que sea la voz final. `previewArgosVoice` con import perezoso de `expo-speech` (`~14.0.8` en package.json) + try/catch → no-op sin módulo nativo, OTA-safe. Los 2 puntos de swap MB-4 (orb → `ArgosAvatar` en 1 componente; ElevenLabs → 1 función `previewArgosVoice`) están aislados y comentados como dijo CC. ✅

**#8 Setup mínimo — ✅.** MB-10 no añadió ni un campo al setup; el onboarding v2 preexistente pide solo lo esencial. Cero cuestionarios largos en el diff.

Extra verificado: los 10 assets requeridos por el tour + hidratación + diagnóstico **existen todos** en `assets/images/` (requires no rompen el bundle). Los hex espejo de `app-tour-core.ts` coinciden 1:1 con `CATEGORY_COLORS` de brand.ts (razón documentada: no importar brand en core puro rompe vitest).

---

## 3. MB-8 PULIDO

- **#9 YoEditorialSection — ✅.** `dolphin.desc` ya es solo "Estado temporal"; el subtitle se arma en runtime con `motherChronotype(chronotypeRawScores)` → "base León/Oso/Lobo". `yo.tsx` pasa `chrono.raw_scores`. Fallback sin raw_scores → 'bear' (mismo default doctrinal del motor, no hardcode de UI). Test de regresión con madre Lobo y madre León. ✅
- **#10 Fitzpatrick #86 — ✅.** Los 6 fototipos tienen emoji único (antes I=II y III=IV idénticos): 🧑🏻/👩🏼/🧑🏽/👩🏽/🧑🏾/🧑🏿, gradiente claro→oscuro.
- **#11 Fiebre canónica #130 — ✅ (con 1 residuo).** 16 usos de `fiebre_viral_activa_37_8_o_mas` en el catálogo; las 2 saunas que tenían variantes se normalizaron. Test de regresión: toda térmica del set ducha_fria/bano_frio/cold_plunge/wim_hof/sauna/cuarto_frio/hormesis contraindica fiebre con el string canónico ÚNICO. **Residuo:** `bano_caliente_vespertino` (térmica de calor, fuera del set del brief y del regex del test) conserva `'infeccion_activa_con_fiebre'` — ver observaciones.
- **#12 Vocab +5 #114 — ✅.** ocular/vagal/respiracion/atencion/contemplativo añadidas a `INTERVENTION_CATEGORIES` + `CATEGORY_LABELS`. El dedup es semántico y viene ARGUMENTADO en el comentario (respiracion≠vagal≠contemplativo; atencion≠cognitivo) — familias nuevas, no sinónimos. Cumple `feedback_dedup_semantico_no_textual`.
- **#13 Mi Expediente — ✅.** `buildTimeline` pasa el marker por `displayLabel()` (mapa curado + beautify); test asegura que el título jamás contiene `_`. Vacío → `EmptyState` premium con CTA a `/salud/sintomas` (ruta existe).
- **#14 Cetonas 3 fuentes — ✅.** Unidades correctas por fuente: sangre β-OHB **mmol/L** (0–10, rangos estándar 0.5/1.5/3.0/5.0) · aliento acetona **ppm** (0–200, correlación orientativa 2/10/40 — anotada como duda para Mariana/Enrique) · orina **escala cualitativa** de tira (negative→large, sin número — correcto: la tira no es numérica fiable). Nota: el brief decía "ACEs/ppm" y "mg/dL o escala"; CC eligió ppm y escala — elecciones válidas dentro del brief. Validación cruzada impide mezclar unidades; 9 tests.
- **#15 Toast — ✅.** `AUTO_DISMISS_MS = 8_000`, ocultamiento de sesión (no persiste como la X que oculta el día); `MIN_TOP_GAP = 8` bajo el safe-area para no encimar el header.
- **#16 Scoring motor ×5 — ✅ NO TOCADO.** Cero cambios en pesos/scoring del motor en el diff. Consistente con "sin firma Mariana no se toca" (va en MB-11).

---

## 4. TRANSVERSAL

- **#17 Cero borrado de filas del user — ✅.** Ni un `.delete(`, `DELETE FROM` ni `DROP TABLE` añadido en todo el diff.
- **#18 Secretos/imports/rutas — ✅.** Sin secretos. Todos los imports nuevos resuelven: `EmptyState`, `GradientCTA`, `displayLabel`, `motherChronotype`, `expo-speech` (dep declarada), assets verificados en disco. Ruta `/salud/sintomas` existe.
- **#19 Español MX + cero nombres propios — ✅.** Todo el copy nuevo (tour, picker, hints de hidratación, cetonas) en español MX, sin nombres de personas, sin citas de autoridad. Los hints de hidratación son mecanismo, no autoridad (doctrina cumplida).
- **#20 — ✅** (ver sección migraciones).

---

## 5. OBSERVACIONES (no bloquean)

1. **`bano_caliente_vespertino` con string de fiebre no canónico** (`'infeccion_activa_con_fiebre'`). Es térmica (calor) y quedó fuera del regex del test y del trío del brief. Sugerencia: sumarla al canónico + al regex del test en el próximo barrido (1 línea + 1 token de regex). Mismo caso potencial para cualquier térmica futura.
2. **Default de voz NO implementado** — decisión pendiente de Enrique (duda #4 del delivery). Inofensivo hoy porque `argos_voice` no tiene consumidor; cablearlo (`?? 'masculina'` o lo que decida) cuando aterrice ElevenLabs.
3. **Tour: el pilar TESTS no tiene pantalla propia** — la 7ª es el cierre "EMPIEZA" (usa la imagen de tests). Sigue siendo 7 pantallas y funciona como apetito; solo anotar que TESTS quedó implícito. Decisión de copy, no bug.
4. **Botón "Saltar" del tour con `top: 54` fijo** (no `useSafeAreaInsets`). En devices con notch grande podría quedar justo. Cosmético; el original hacía algo equivalente.
5. **Rangos de aliento (2/10/40 ppm)** son correlación orientativa — CC ya lo dejó como duda; si Mariana tiene umbrales preferidos es 1 función (`breathKetoStatus`).

---

## 6. ORDEN DE DEPLOY RECOMENDADO

**merge → `npx supabase db push` → OTA (`eas update --branch preview`)** — en ese orden, sin excepciones.

**Por qué:** el cliente nuevo de cetonas **escribe** las columnas `source`/`value_ppm`/`urine_level` en cada guardado. Si el OTA llega a los devices antes de que 204 esté aplicada, todo registro de cetonas falla con Alert (schema cache: columna inexistente) hasta el db push — exactamente el gap documentado en `reference_supabase_migration_gap`. A la inversa (db push primero) no pasa nada: el cliente viejo ignora las columnas nuevas y las filas se crean con `source='blood'` por DEFAULT. 205 es fail-open en cliente, pero le aplica el mismo orden gratis.

1. Merge `feat/mb10-onboarding` → main (trae mb8 y el tramo 2 ya auditado).
2. `npx supabase db push` → aplica 204 + 205 (ambas idempotentes; si el tramo 2 dejó 200–203 pendientes, entran en el mismo push).
3. Verificar en el dashboard/CLI que 204 y 205 aparecen en la historia de migraciones.
4. `eas update --branch preview` (solo JS/TS en el diff — no hay cambio nativo; `expo-speech` ya está en el binario, y si no, el preview degrada a no-op sin crash).
5. Device test con el checklist de los 2 delivery docs (cetonas 3 fuentes DESPUÉS del push; voz + tour con cuenta nueva).

---

*Auditoría sobre working tree `feat/mb10-onboarding` @ `eda4067`. Solo lectura; ningún archivo de código modificado.*
