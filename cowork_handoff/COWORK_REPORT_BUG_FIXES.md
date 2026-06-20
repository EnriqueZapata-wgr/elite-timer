# COWORK_REPORT — 3 bug fixes display Edad ATP

**Branch:** `fix/edad-atp-display-fixes` (desde `origin/main` 779bdf, pusheado)
**Estado:** ✅ 5 commits, `npx tsc --noEmit` 0 errores, `npx vitest run` 157/157 verde.
**NO merge, NO OTA** — pendiente validación de Enrique.

## Commits

1. `fix(source-map): mapear composición corporal a health_measurements + conversión`
2. `test(source-map): paciente Enrique resuelve los params de composición desde DB`
3. `fix(sub-edad-display): mostrar Pendiente cuando CE < 50%`
4. `fix(drill-down): formato decimal apropiado por magnitud + unidad de matriz`
5. `docs(edad-atp): runbook bug fixes display + flags`

## Resumen por bug

- **Bug 1 (CRÍTICO):** `COMPOSITION_HEALTH_MEASUREMENTS_MAP` chequeado antes del switch
  sobre `matrizSource`. grasa_corporal 11 → 0.11; musculo_esqueletico = muscle_mass_kg /
  weight_kg = 55/79 = 0.696 (health_measurements no tiene skeletal_muscle_pct; columna
  declarada forward-compat con precedencia si algún día existe); fuerza_de_agarre 77.8;
  grasa_visceral 3. Test con datos del paciente Enrique verifica los 4 + precedencia +
  questionnaire para los 2 sin columna.
- **Bug 2:** `SUB_EDAD_CE_PENDING_THRESHOLD = 50` en tokens.ts. Constellation: mini-ring
  gris "Pendiente" + ⚠️. Drill-down: ring "⚠️ Pendiente" + mensaje con CE actual;
  componentes y Acción ATP visibles para guiar qué falta. Las 5 sub-edades.
- **Bug 3:** `formatComponentValue` por magnitud (≥100→0, ≥10→1, ≥1→2, <1→3 decimales)
  + unidad de la matriz (bonus incluido). Params `unit: '%'` se muestran ×100
  (0.476 → "47.6%", 0.055 → "5.5%"), porque la matriz guarda fracción decimal.

## Flags

1. **musculo_esqueletico espera FRACCIÓN decimal** — validado contra la matriz importada
   (`edad-atp-matriz-v7-v6.ts`): bandLimits [0.2…0.8], consistente con grasa_corporal
   [0.03…0.35]. 0.696 cae en **aceptable_3 (score 80)**, no en crítico_5 — el temor del
   handoff (W=0.8, V=0.75) no aplica porque 0.696 < 0.75. No se inventó ×100. No tengo
   acceso al Excel master; si difiere del dump importado, revisar con Mariana.
2. **edad_corporal y pullups**: sin columna en health_measurements → siguen como
   `questionnaire` + TODO de captura dedicada (el param de matriz es `pullups`, sin
   guion bajo — el handoff decía `pull_ups`).
3. **Threshold CE 50%**: constante única peloteable en tokens.ts.
4. **NO se tocó** sfToAge ni Edad Integral.
5. **⚠️ IMPORTANTE — Fase 4 NO está mergeada en main.** El handoff dice "después de
   mergear Fase 4", pero `feat/cardio-from-matriz` (7 commits: cardio matriz +
   sub-edades desde SF dominio) NO está en `origin/main`. Este branch se creó desde
   main como pediste; los 3 fixes aplican igual (source-map, Constellation y drill-down
   existen en main). PERO: el smoke test #1 (Corporal 70→~25 desde la matriz) y los
   componentes con claves de matriz en el drill-down solo se cumplen con Fase 4
   mergeada. Sugerencia: mergear `feat/cardio-from-matriz` → main primero, luego este
   branch (posible conflicto menor en `[key].tsx` / orquestador si Fase 4 los tocó).

## Exit criteria

- [x] `npx tsc --noEmit` → 0 errores
- [x] `npx vitest run` → 157 tests verdes (incluye 4 nuevos de composición)
- [x] Push a `origin/fix/edad-atp-display-fixes`
- [x] NO merge, NO OTA
- [x] Este reporte (local, gitignoreado junto con cowork_handoff/)
