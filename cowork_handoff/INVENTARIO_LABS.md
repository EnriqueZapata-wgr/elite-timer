# INVENTARIO_LABS — FASE 0 (23-jun-2026)

**Fuente:** queries reales sobre `lab_values` del proyecto Supabase `ELITE-APP-FULLDB`
(`itqkfozqvpwikogggqng`) vía MCP. Read-only. 73 `parameter_key` distintos, ~6 usuarios.

---

## 1. Hallazgo central

Los "duplicados" del screenshot NO son un fallo de dedup de UI: `loadCanonicalLabValues` ya
dedupea por `parameter_key` (`dedupeLatestByKey`). El problema es que conviven **dos keys
distintas** para el mismo biomarcador: la canónica español (`testosterona_total`) y una **raw
inglés** (`testosterone`). Como son keys diferentes, ambas pasan el dedup → 2 filas en pantalla.

**Causa raíz (forward):** las filas raw inglés **tienen unidad almacenada** (ng/dL, mg/dL, μU/mL)
mientras las canónicas español tienen `unit=null`. Sólo `insertCanonicalBiomarkers` (captura manual,
`saveBiomarkers`) escribe `unit`; y ese path **NO canonicaliza** el `parameter_key` (lo inserta tal
cual). El path de PDF (`insertLabValuesFromRaw` → `toCanonicalEntries`) sí canonicaliza. → fix FASE 4
en `insertCanonicalBiomarkers`.

**Items basura (C) del screenshot ("Levocartine fatum", "h41", "Iuf 105", "BIO leukocitos"):**
NO existen en `lab_values` hoy — los 73 keys son todos reconocibles. Posiblemente venían de
`lab_uploads.extracted_data.other_values` (no se persiste a `lab_values`) o de un estado ya
limpiado. La migración 095 incluye un void defensivo de esa lista (0 matches actuales).

---

## 2. Pares duplicados en/es CONFIRMADOS (raw inglés presente en DB → MERGE a español)

| Key inglés (raw, con unidad) | Canónico español (destino) | Recs EN | Recs ES | Nota |
|---|---|---|---|---|
| `testosterone` (ng/dL, 2.9–994) | `testosterona_total` | 4 | 5 | ES tiene valores ABSURDOS 9–9.93 (ng/mL mal etiquetado) → corregir ×100 |
| `insulin` (μU/mL) | `insulina` | 2 | 13 | |
| `cortisol` (μg/dL) | `cortisol_matutino` | 2 | 11 | |
| `uric_acid` (mg/dL) | `acido_urico` | 2 | 13 | |
| `t3_free` (pg/mL) | `t3_libre` | 2 | 10 | |
| `total_cholesterol` (mg/dL) | `colesterol_total` | 2 | 14 | |
| `ldl` (mg/dL) | `colesterol_ldl` | 2 | 14 | |
| `hdl` (mg/dL) | `colesterol_hdl` | 2 | 14 | |
| `crp` (mg/dL) | `proteina_c_reactiva_cuantitativa_pcr` | 2 | 13 | |
| `glucose` (mg/dL) | `glucosa_en_ayuno` | 2 | 16 | |
| `creatinine` (mg/dL) | `creatinina_serica` | 2 | 13 | |
| `homocysteine` (μmol/L) | `homocisteina` | 1 | 8 | |
| `triglycerides` (mg/dL) | `trigliceridos` | 1 | 13 | |
| `wbc` (cel/μL) | `leucocitos_totales` | 2 | 15 | |

**Decisión:** todos MERGE_INTO el canónico español. Los 14 keys inglés YA están en
`LAB_COLUMN_TO_CANONICAL` (toCanonicalEntries los mapea bien en el path PDF); la migración 095
normaliza los registros viejos, y el helper `canonicalParameterKey` los colapsa en display + en
`insertCanonicalBiomarkers` (forward).

## 3. Keys que SON canónicas inglesas (KEEP — sin equivalente español, PhenoAge/L2)

`albumin`, `mcv`, `alp`, `lymphocyte_pct`, `rdw_cv`, `homair`, `t4_free`, `estradiol`. → KEEP.
(`calcium` también es canónica inglesa en el map — `keys:['calcium']` — por eso NO se mapea a
`calcio`, a diferencia de lo que sugería el handoff.)

## 4. Doble-key por diseño del map (AST / GGT) — FLAG, no auto-fix

`LAB_COLUMN_TO_CANONICAL` mapea cada uno a DOS claves (escribe 2 filas):
- AST → `transaminasa_glutamico_oxalacetica_ast` (11) + `transaminasa_g_oxalacetica_ast_tgo` (11)
- GGT → `gama_glutamil_transferasa` (11) + `ggt` (11)

Esto produce duplicados en UI. NO se auto-colapsa: ambas claves podrían alimentar el motor v2
(regla #4: no tocar motor). `canonicalParameterKey` excluye multi-key a propósito.
→ FLAG para Enrique: decidir clave única por biomarcador (requiere verificar matriz V7/V6).

## 5. Valores absurdos / unidades sospechosas

| Key | Síntoma | Acción 095 |
|---|---|---|
| `testosterona_total` | 9–9.93 (ng/mL etiquetado ng/dL) | ×100 donde `value < 50` (queda ~900–993, reconcilia con `testosterone` 994) |
| `leucocitos_totales` | unidades MIXTAS: 4.36 (miles) vs 8100 (/µL) | FLAG — no auto-fix (riesgo de duplicar la confusión) |
| `vitamina_b12` | 6000 (> max clínico 2000) | FLAG — quedará fuera de rango (isLabValueValid) hacia adelante |
| `testosterona_libre_pgml` | min 0.022 (absurdo bajo) | FLAG — no auto-fix |
| `prolactina` | unidad null, 5.39–43.6 | sin acción (valores plausibles ng/mL; el fix ng/dL→ng/mL del handoff no aplica, no hay unidad ng/dL) |

## 6. Query 3 (heurística difusa de duplicados) — DESCARTADA

La query de pares por valor-cercano (`ABS(a.value-b.value)<5`) produjo **solo falsos positivos**
(empareja biomarcadores no relacionados con decimales parecidos: hba1c 0.05 vs rdw_cv 0.13). Los
duplicados reales se identificaron deterministamente por nombre de key (sección 2). No se usa.

---

## 7. Recomendación por caso (resumen)

- 14 pares en/es → **MERGE_INTO** español (095 + helper forward).
- 8 keys inglés-canónicas → **KEEP**.
- AST/GGT doble-key → **FLAG** (decisión de matriz, no overnight).
- `testosterona_total` <50 → **AUTO-FIX ×100** (anotado en metadata).
- b12 6000 / leucocitos mixtos / testo libre 0.022 → **FLAG** (no auto-fix).
- basura del screenshot → **0 matches** en `lab_values` (void defensivo en 095).
