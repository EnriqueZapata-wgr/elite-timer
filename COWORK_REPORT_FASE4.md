# COWORK_REPORT FASE 4 — Cardio + sub-edades desde matriz

**Rama:** `feat/cardio-from-matriz` (push OK → origin), desde `main` (que ya tiene la matriz integrada).
**Estado:** ✅ COMPLETO. `npx tsc --noEmit` 0 errores · `npx vitest run` **152 pass**. No merge, no OTA.

## Commits (4 git = los 5 lógicos del buzón)
| # | Commit | Notas |
|---|--------|-------|
| 1+2 | `5651325` cardio desde matriz + orquestador | Combinados: deben ir juntos para tsc verde. Elimina ASCVD; `computeEdadCardiovascular({paramValues,sex,chronological_age})` usa scoreDomain sobre los 23 params cardio + `sfToAge`. El orquestador pasa `paramValues` (138) vía `EdadAtpV2Inputs.paramValues`. |
| 3 | `96a6831` sub-edades desde SF | Metabólica→`metabolismo`, Corporal→`composicion_corporal`, Fitness→`vitalidad`. Elimina curvas inventadas + `clampSubEdad` (sfToAge ya da rango realista). |
| 4 | `f67cf06` test cardio paciente real | Usa HOMBRES V7 (fixture_enrique.json no vino) — CE>70, edad definida, drill-down con bandas, monotonía. |
| 5 | `f4505b2` doc + smoke test | `SMOKE_TEST_CARDIO_MATRIZ.md` + `band?` en SubEdadResult.components. |

## Resultado
Las 4 sub-edades display ya NO usan ASCVD ni curvas inventadas: todas derivan del SF de su
dominio en la matriz V7/V6 (scoreDomain 9-band) + curva `sfToAge`. El drill-down muestra cada
param con su banda real. El Integral seguía usando SF real (Fase 5 previa).

## Flags / decisiones
1. **Commits 1+2 combinados** — separarlos deja el orquestador sin compilar (tsc rojo). Atómico = juntos.
2. **fixture_enrique.json NO vino en el handoff** → el test de regresión cardio usa el paciente
   HOMBRES V7 (23 params cardio reales). Los números del buzón (SF 86.8 → ~30) no se pueden
   reproducir sin sus valores; cuando los pases, afino el test.
3. **Fitness = dominio `vitalidad`** (la matriz no tiene dominio "fitness" propio). Incluye fuerza
   de agarre + músculo + energía. Revisar con Mariana si quieres un set fitness-específico.
4. **Curva `sfToAge` interim** (piecewise relativa a la cronológica). TODO Mariana Sprint 5: validar
   SF→edad por dimensión con datos clínicos. Élite capped a cron×0.55.
5. **clampSubEdad eliminado** — la curva sfToAge ya produce rango realista; el clamp lo distorsionaba.

## Pendiente del sprint mayor (no en esta Fase 4)
- Fase 3: cuestionarios cinemáticos (34 params Forms con copy de Mariana).
- Fase 6: regresión E2E HOMBRES V7 (PhenoAge 40.897 / G37 54.55) + MUJERES V6.
