# AUDIT — Labs: biomarcadores extraídos vs persistidos (L2, 19-jun)

## Método
Diff entre (a) los keys que el parser AI emite (prompt v1 `extractLabValues` + `PARSER_V2_PROMPT`
en `lab-service.ts` + worker `lab-parser-worker`) y (b) los keys mapeados en
`LAB_COLUMN_TO_CANONICAL` (`src/constants/lab-canonical-map.ts`), que es el único borde de
escritura a `lab_values` (la time-series canónica que alimenta gráficas + motor).

`toCanonicalEntries()` **descarta** silenciosamente cualquier key sin entrada en el mapa
(`if (!m) continue`). Por eso un biomarcador extraído sin mapeo nunca se guarda ni se grafica.

## Hallazgo
El parser emitía ~95 keys; el mapa cubría ~58. **~37 biomarcadores se perdían.**

### Faltantes corregidos (agregados al mapa + migración 077)
- **Tiroides:** t4_free, total_t3, total_t4, anti_tpo, anti_tg
- **Hormonal:** estradiol, progesterone, dhea, shbg, igf1
- **Lípidos:** non_hdl_cholesterol, lp_a
- **Minerales:** calcium, phosphorus, zinc
- **Inflamación/coag:** esr, fibrinogen, complement_c3, complement_c4, pt, ptt, inr
- **Hepático/proteínas:** bilirubin_direct, bilirubin_indirect, total_protein, globulin, ag_ratio
- **Renal/electrolitos:** co2, gfr
- **Biometría hemática:** platelets, rbc, mch, mchc, mpv, neutrophils_pct, monocytes_pct, eosinophils_pct, basophils_pct
- **Metabólico:** fructosamine, c_peptide

Clave canónica = nombre inglés (graph-only, patrón idéntico a albumin/mcv/alp/lymphocyte_pct).
Los `_pct` se guardan como % (consistente con `lymphocyte_pct`, sin `convertPct`).

### Deferidos a propósito (bajo valor de gráfica / ruido OCR) — FLAG
`urine_ph`, `urine_density`, `bands_pct`, y los absolutos `*_abs` (lymphocytes_abs,
neutrophils_abs, etc.). Si Mariana los quiere graficar, se agregan igual que los de arriba.

## Acciones
1. `src/constants/lab-canonical-map.ts` — +37 entradas en `LAB_COLUMN_TO_CANONICAL`.
2. `supabase/migrations/077_lab_results_missing_columns.sql` — columnas espejo en la tabla ancha
   `lab_results` (flujo v1). **NO ejecutada.**

## Verificación post-merge (cuando se corra 077)
- Subir un PDF con panel completo → confirmar que los nuevos keys aparecen en `lab_values`
  (`SELECT DISTINCT parameter_key FROM lab_values WHERE user_id = ...`).
- Confirmar que las gráficas de ATP LABS muestran las nuevas series.

## Relación con L3 (unidades) — ver COWORK_REPORT flag
L2 hace que se GUARDEN; L3 (canonicalizar unidades para no duplicar series) queda flagged:
`insertLabValuesFromRaw` recibe valores SIN unidad y `lab-unit-converters.ts` (que el task
asumía existente) NO existe. Se requiere un módulo de conversión por-unidad antes de cerrar L3.
