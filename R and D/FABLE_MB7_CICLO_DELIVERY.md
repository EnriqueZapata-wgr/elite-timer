# 🌙 MB-7 · CICLO FEMENINO — Delivery

**Fecha:** 2026-07-18 · **Branch:** `feat/mb7-ciclo` (desde `feat/mb6-sueno`, 3 commits) · **CI:** tsc 0 errores · 1844 tests verdes (17 nuevos)

---

## Qué se hizo

### 1. Gate `biological_sex` — cerrado en la raíz (commit 1)
El bug más vergonzoso ("estás embarazada" a un hombre) ya tenía el fix del call site puntual (`pregnancy-gate-core`), pero el mapa reveló huecos residuales: `getCycleInfo` no se auto-protegía (el patrón exacto que causó el bug) y había superficies sin gate.
- **`getCycleInfo` ahora se auto-gatea por `biological_sex`**: sin 'female' → `null`, pase lo que pase aguas arriba. Esto cierra la raíz y de paso protege `recipe-context-service` (la única superficie de *datos* que quedaba sin gate — un male recibía hints nutricionales por fase).
- **Nuevo `canAccessCycle` (puro) + `useCycleGate`**: las pantallas `/cycle`, `/cycle-charts`, `/cycle-history` sacan al no-female (deep-link cerrado). **`/cycle-settings` NO se bloquea**: gatea internamente por sexo — el modo compañero para parejas hombres es intencional y correcto; bloquearlo rompería esa feature.
- **Regresión `cycle-access-core.test`**: SOLO 'female' entra; male/null/'Female'/basura → fuera.

### 2. Copy bidireccional (commit 1)
Las 3 fuentes de copy de fase estaban duplicadas y divergentes; menstrual y lútea sonaban paternalistas ("no fuerces", "-40%", "descanso", "-25% volumen"). Reescritas en las tres (`cycle-service PHASES`, `cycle-info` del InfoButton, `cycle.tsx calcPhase`):
- **Folicular/ovulatoria → INTENSIFICAR**: "tu ventana de construir", "métele a los bloques duros", "LA ventana para ir por un récord".
- **Lútea/menstrual → ESCUCHAR** (ajustar, no prohibir): "ajusta el volumen, no la intención", "afina y escucha señales — baja el ego, no la ambición".
Una mujer lo lee y se siente poderosa, no limitada.

### 3. Labs de mujer con fase (commit 2)
- **Nuevo `lab-cycle-context-core` (puro, 7 tests)**: estradiol/progesterona/LH/FSH → nota con la fase actual; **fase desconocida → se dice explícito** ("⚠ Sin fase del ciclo registrada — este valor puede malinterpretarse"). Interpretar a ciegas es el error que evitamos. No-female nunca ve la anotación.
- Cableado en `edad-atp/biomarkers`: bajo el valor hormonal, la fase o el aviso. `isFemale` se lee directo de `biological_sex` (no de `getCycleInfo`, que devuelve null también para una mujer sin periodos — justo cuando más importa el aviso).

### 4. Máscara ATP Embarazo (commit 3)
La migración 080 especificó `src/utils/pregnancy.ts` y **nunca se construyó**; la máscara no existía.
- **`src/utils/pregnancy.ts` (puro, 6 tests)**: deriva semana gestacional + trimestre desde `due_date` (FUM = due − 280d) o `start_date`. Sin fecha → null (no se inventa etapa).
- **`cycle.tsx`**: con embarazo activo, card "Embarazo · Semana N · Nº trimestre" con copy cálido ("Estás acompañada en cada etapa"), barra 0-40 sem, y **se suprime toda predicción de menstruación** en el calendario (doctrina 080). Sensibilidad: cero lenguaje de riesgo/alarmista.
- **`cycle-settings.tsx`**: captura de la FPP (solo en modalidad embarazo) → escribe `cycle_settings.pregnancy_status`. Cierra el gap de capturar el estado **actual**, no solo el histórico. Todo bajo el gate de sexo.

## Qué NO se hizo (y por qué)
- **Síntomas → NO se migró al modelo `is_active/resolved_at`** (era un "verificar", y la premisa del brief no aplica limpio): los síntomas del ciclo (`cycle_daily_logs`: energy/mood/appetite/libido/cramps/bloating, escala 1-5 por día) son **snapshots de intensidad diaria**, un dominio legítimamente distinto al de condiciones clínicas con ciclo de vida (`user_symptoms` con started_at/resolved_at). Un "cólico 3/5 hoy" no es una condición que "se resuelve" — es una serie de tiempo de intensidad (mismo diseño que Clue/Flo). Además, **los periodos YA usan start/end** (`cycle_periods.start_date/end_date` + walk de `is_period`). Forzar `is_active/resolved_at` sobre el snapshot diario sería incorrecto y perdería la granularidad. Lo dejo como hallazgo — decisión de Enrique si se quiere unificar (implicaría rediseñar el tracking diario, no un ajuste).
- **`recipe-context-service` sin gate propio**: no le añadí gate porque el auto-gate de `getCycleInfo` ya lo cubre (recibe null para male). Cero cambios ahí = menos superficie.

## Dudas para Enrique
1. **Migración 080 (`pregnancy_status`)**: es idempotente (`ADD COLUMN IF NOT EXISTS`) pero puede no estar aplicada en el remoto — **requiere `npx supabase db push`** antes de que la máscara funcione en device. Verificar con Cowork.
2. **Máscara embarazo — alcance**: entregué la base funcional (semana/trimestre + supresión de menstruación + captura de FPP). Falta si quieres: contenido nutricional/ejercicio por trimestre, y activar `pickEmbarazoImage` (assets ya listos) como hero visual. No lo hice por sensibilidad clínica — es contenido que probablemente quiera revisar Mariana.
3. **Lactancia**: el estado se captura (C2 del cuestionario + modalidad) pero NO tiene máscara de UI propia (solo embarazo). ¿Entra a V2?
4. **Copy bidireccional**: revísalo en device con una lectora — el objetivo es "se siente poderosa". Ajustable si algún tono no pega.

## Checklist de device (Enrique)
- [ ] **Cuenta masculina (test)**: intentar abrir `/cycle`, `/cycle-charts`, `/cycle-history` por deep-link → debe sacarte (no renderiza nada de ciclo). Recetas generadas no mencionan fase. NINGÚN banner de embarazo en suplementos.
- [ ] **Cuenta femenina**: copy de cada fase suena a intensificar (folicular/ovulatoria) / ajustar sin prohibir (lútea/menstrual).
- [ ] Labs: registrar estradiol → ver nota de fase (o "⚠ Sin fase registrada" si no hay periodos).
- [ ] Embarazo: en cycle-settings elegir modalidad embarazo + poner FPP → el pilar Ciclo muestra "Semana N · trimestre", sin días de período predichos en el calendario.
- [ ] **db push** de la migración 080 antes de probar la máscara.

## Commits
1. `MB-7 Ciclo 1` — gate biological_sex en la raíz + copy bidireccional (7 archivos)
2. `MB-7 Ciclo 2` — labs hormonales con fase (3 archivos)
3. `MB-7 Ciclo 3` — máscara ATP Embarazo (4 archivos)
