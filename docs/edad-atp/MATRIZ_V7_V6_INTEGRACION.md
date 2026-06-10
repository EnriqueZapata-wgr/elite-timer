# EDAD ATP — Integración Matriz V7/V6 (runbook)

## Qué es
La matriz real V7 (HOMBRES) / V6 (MUJERES) extraída de los Excel master de Enrique + Mariana:
276 params (138 c/u) en 10 dominios, cada uno con 9 bandas + peso + fuente + unidad.
Reemplaza los placeholders genéricos (`sf=50`, ASCVD, curvas inventadas).

## Archivos
- `src/constants/edad-atp-matriz-v7-v6.ts` — la matriz (MATRIZ_HOMBRES / MATRIZ_MUJERES).
- `src/services/edad-atp/sf-9band-service.ts` — `score9Bands` (lógica de bandas del Excel),
  `scoreDomain`, `computeSFGlobalReal`.
- `src/constants/edad-atp-source-map.ts` — cada param → fuente DB.
- `src/services/edad-atp/load-all-params.ts` — `loadAllParamValues` lee los 138 params.
- `docs/edad-atp/matriz_v7_v6_dump.json` — dump de referencia.

## Cómo se mapean los 138 params a fuentes (`PARAM_SOURCE_MAP`)
- **Laboratorio (76):** `lab_results` (columna inglesa, vía `LAB_COLUMN_MAP`) → fallback
  `lab_uploads.extracted_data`. Conversión de unidades DB→matriz (hba1c/hematocrito/rdw %→decimal).
- **Forms/Entrevista (34):** `edad_atp_questionnaire_responses` por `parameter_key` = clave de matriz.
- **Tests (11):** `edad_atp_functional_tests` por `test_key` = clave de matriz.
- **Cálculo (8):** ratios derivados runtime (LDL/HDL, TG/HDL, NLR).
- **Glucómetro/CGM (5):** captura manual (`edad_atp_biomarkers`).
- **Wearable (4):** `health_measurements` → manual.

## Lógica de bandas (verificada)
`score9Bands` replica la asimetría del Excel: fronteras bajas `[lo, hi)`, óptimo (100)
cerrado en T (`[S, T]`), riesgo_4 `(U, V]` → 50, critico_5 `(V, W]` → 25.
**Gate:** paciente HOMBRES V7 (92 valores) → SF = 0.6066 ≈ **0.6083 ± 0.005** ✓
(`__tests__/sf-9band-service.test.ts`).

## Regenerar las constantes desde un Excel actualizado
Los 3 archivos pre-generados se extrajeron por Cowork del Excel master. Para regenerar:
re-correr el script de extracción de Cowork sobre el nuevo Excel y reemplazar los 3 archivos.
Validar siempre contra el gate (SF=0.6083) antes de mergear.

## Smoke test post-OTA
1. Recalcular Edad ATP de Enrique → 21-26 años.
2. Sub-edad Cardiovascular → params con banda real (no ASCVD).  *(pendiente Fase 4)*
3. Hub cuestionarios "X/Y contestadas".  *(pendiente Fase 3)*
4. SF cardiovascular > 85 (no 50 placeholder).
5. Test cognitivo 30×2 trials, RT más reciente (fix ORDER BY).

---

## ⚠️ FLAG — hoja "Sueño" del Excel V7 con fórmulas buggy (AD/AE saltan V)
El patch inicial (`FIX_BANDS_EXCEL_LOGIC.md`) se basó **solo en la hoja Sueño**, que es la
única con fórmulas AD/AE que **saltan el límite V** (riesgo_4 cubriendo `(U, W]`). Eso
sobre-puntúa y da SF = 0.641 (no reproduce 0.6083). Las **otras 9 hojas** usan la lógica
estándar (`U<v<=V` → riesgo_4 = 50; `V<v<=W` → critico_5 = 25), que es la implementada y
reproduce **0.6066 ≈ 0.6083**. El código usa la lógica estándar correcta.
**TODO Mariana:** revisar/corregir las fórmulas AD/AE de la hoja **Sueño** del Excel master V7.
