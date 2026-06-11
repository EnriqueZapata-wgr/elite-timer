# Motor Edad ATP v2 — Arquitectura por áreas ciegas

**Branch:** `feat/motor-edad-atp-v2` (desde `origin/main`).
**Fuente de verdad:** `cowork_handoff/motor_v2/EDAD_ATP_Motor_v1.0.xlsx` (9 hojas) +
`fixtures_4_pacientes.json` (gate).
**Estado del gate:** ✅ los 4 pacientes reproducen la Edad ATP integral ±1e-4 (muy por
dentro de la tolerancia ±1.0 año).

## Flujo

```
1. Cada ÁREA (5) calcula UNA edad parcial CIEGA (sin saber la cronológica).
2. Cada edad parcial se ANCLA a la cronológica: edad_aj = cron + (ciega − cron) × factor.
3. PROMEDIO PONDERADO de las 5 áreas ajustadas → edad_pre_modulador.
4. MODULADOR HÁBITOS (0.95 a 1.10) → edad × factor.
5. CAP final [20, 100].
```

## Config congelada (`src/constants/edad-atp-motor-v2-config.ts`)

| Área | Peso | Factor anclaje |
|---|---|---|
| labs | 0.25 | 0.75 |
| composicion | 0.15 | 0.70 |
| fitness | 0.20 | 0.65 |
| cognicion | 0.15 | 0.55 |
| riesgos | 0.25 | 0.75 |

- Caps `[20, 100]`. Hábitos: ≥80→0.95, 60-79→1.0, 40-59→1.05, <40→1.10.
- `scoreToEdadCiega(score)`: curva universal piecewise (score alto = edad joven). La usan
  composición, fitness y riesgos. Labs y cognición mapean por edad directa.

## Áreas (servicios)

1. **`area-labs-service.ts`** (hoja 2) — PhenoAge (Levine 2018, reusa `phenoage-service`)
   + 7 modificadores funcionales (Vit D, B12, homocisteína, ferritina, TSH, cortisol,
   bilirrubina) como delta, cap interno `[-5,+10]`. Edad = PhenoAge + Σdelta.
2. **`area-composicion-service.ts`** (hoja 3) — 6 params con bandas por sexo (grasa, FFMI
   calculado, músculo, visceral, agarre, cintura) → SUMPRODUCT → curva universal.
3. **`area-fitness-service.ts`** (hoja 4) — 9 tests con bandas por sexo → curva universal.
4. **`area-cognicion-service.ts`** (hoja 5) — RT Simple/Choice (Der & Deary 2006), Go/No-Go
   (RT + modificador por % errores) y subjetivos. PROMEDIO PONDERADO de las 4 edades
   (NO pasa por la curva universal).
5. **`area-riesgos-service.ts`** (hoja 6) — 5 sub-bloques (cardio 0.30, metabólico 0.25,
   inflamatorio 0.20, hormonal 0.15, hepato-renal 0.10) → score total → curva universal.

**Modulador:** `habitos-modulador-service.ts` (hoja 7) — score 0-100 de 7 hábitos →
factor. El score se CALCULA (no se usa el input "Score Hábitos global", que es estimación).

**Orquestador:** `motor-v2-service.ts` (hoja 8) — `computeMotorV2(input)` → `MotorV2Result`.

## Integración runtime

`computeEdadAtpV2(userId)` (en `edad-atp-v2-service.ts`):
`loadUserData` + `loadAllParamValues` → `buildMotorV2Input` (adapter) → `computeMotorV2`
→ `motorResultToView` (forma UI, sub-edades por área, `age_years` = edad ajustada).

El modelo v1 (`computeEdadAtpV2FromInputs` → `EdadAtpV1Result`) se conserva para los tests
de regresión; ya no alimenta el runtime.

## UI

- `tokens.ts` `EDAD_DIMS`: 5 áreas (Labs/Composición/Fitness/Cognición/Riesgos), emojis sin
  cambio. Constellation + share card iteran `EDAD_DIMS`.
- `app/edad-atp/sub-edad/[key].tsx`: META por área; drill-down muestra `sub.components`.
- Test cognitivo (`app/edad-atp/tests/reaction-time.tsx`): 3 modos (Simple, Choice,
  Go/No-Go 20 trials 75/25), PRNG seedeado por sesión, instrucción + 2 demos por modo,
  filtro de outliers. Persiste `reaction_time_simple/choice`, `go_no_go_rt_hits`,
  `go_no_go_error_rate`.

## Gate (tolerancias)

`src/services/edad-atp/__tests__/motor-v2-fixtures.test.ts`:

| Paciente | Integral esperado | Reproducido |
|---|---|---|
| H1 (cron 50, sano-medio) | 47.46 | ✅ ±1e-4 |
| H2 (Enrique, cron 35.83, atleta) | 27.27 | ✅ ±1e-4 |
| M1 (cron 28, atleta optimizada) | 22.40 | ✅ ±1e-4 |
| M2 (cron 65, sedentaria DM2) | 73.79 | ✅ ±1e-4 |

Cada edad parcial ciega ±1.5 y cada ajustada ±1.0 también reproducen.

## Flags / decisiones

1. **Gate verde**: no se abrió flag #1. El motor reproduce el Excel exactamente.
2. **Config v1 vs adapter**: el motor (pura) está verificado contra fixtures. El
   `motor-v2-adapter` (DB → MotorV2Input) es capa de integración; su mapeo desde fuentes
   reales (matriz keys, health_measurements, functional_tests) debe validarse en runtime
   (smoke test). Conversión de unidades: %grasa/%músculo de la matriz (decimal) → % para
   el motor; hba1c decimal → %.
3. **Habit score**: el motor usa el score CALCULADO de los 7 hábitos, no el input "Score
   Hábitos global" del Excel (que es referencia). Para los 4 fixtures ambos caen en la
   misma banda de factor.
4. **Cap [-5,+10] de Labs**: con los 7 modificadores el delta natural va en `[-4, +8.5]`,
   el clamp es salvaguarda y no engancha con datos reales.
5. **Cognición Go/No-Go**: `Math.random()` no se usa directo; PRNG mulberry32 seedeado
   (sin librerías nuevas, flag #4). El seed usa el reloj una sola vez al arrancar.
6. **No se tocó**: matriz V8, `phenoage-service`, `sf-9band-service`. El modelo v1 y
   `algoritmo-excel-service` se conservan (deprecados) para los tests de regresión.
7. **Commits 18-20 combinados**: el test cognitivo (Go/No-Go + seed + instrucciones) es un
   solo archivo interdependiente; se entregó en un commit en vez de tres.

## Verificación local

- `npx tsc --noEmit` → 0 errores.
- `npx vitest run` → 209 tests / 38 archivos en verde (incl. 5 áreas × 4 pacientes +
  gate integral + curva + passthrough).
