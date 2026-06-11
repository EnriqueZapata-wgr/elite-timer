# EDAD ATP — Smoke Test Fase 4 (Cardio + sub-edades desde matriz)

**Rama:** `feat/cardio-from-matriz` (desde `main`, que ya tiene la matriz integrada).
**Deploy:** OTA (`eas update --branch preview`) — sin build. **Lo corre Enrique tras validar.**

## Qué cambió
Las 4 sub-edades DISPLAY (Cardiovascular, Metabólica, Corporal, Fitness) ahora se calculan
desde el **SF del dominio correspondiente de la matriz V7/V6** (scoreDomain 9-band) + la curva
`sfToAge`, en vez de ASCVD vanilla / curvas inventadas:
- **Cardiovascular** → dominio `cardiovascular` (23 params) — **elimina ASCVD Pooled Cohort 2013**.
- **Metabólica** → dominio `metabolismo`.
- **Corporal** → dominio `composicion_corporal`.
- **Fitness** → dominio `vitalidad` (fuerza, músculo, energía/recuperación).

`computeEdadCardiovascular({ paramValues, sex, chronological_age })` — el orquestador pasa el
dict de 138 params (`loadAllParamValues`). Los `components` traen cada param con su banda real
para el drill-down. Se eliminó el `clampSubEdad` (la curva `sfToAge` ya da rango realista,
élite capped a cron×0.55).

## Smoke test post-OTA
1. [ ] Recalcular Edad ATP de Enrique → sub-edad **Cardiovascular** pasa de ~37 ▼ a una zona
   acorde a su SF cardio real (no riesgo ASCVD inflado).
2. [ ] Drill-down de Cardiovascular → muestra los **23 params con sus bandas reales**
   (apoB, HDL, LDL, presión, NLR, TG/HDL, etc.), no un "riesgo ASCVD".
3. [ ] Drill-down de Metabólica/Corporal/Fitness → params de su dominio con banda.
4. [ ] Sub-edades de un atleta no se saturan (curva `sfToAge`: SF 100 → cron×0.55).

## Flags
- **fixture_enrique.json no vino en el handoff** → el test de regresión cardio usa el paciente
  HOMBRES V7 (23 params cardio reales). Cuando tengas los valores de Enrique, se afina el test.
- **Curva `sfToAge` es interim** (piecewise relativa a la cronológica). TODO Mariana Sprint 5:
  validar SF→edad por dimensión con datos clínicos.
- **Fitness usa el dominio `vitalidad`** de la matriz (no hay dominio "fitness" propio); incluye
  fuerza de agarre + músculo + energía. Revisar con Mariana si se quiere un set fitness-específico.
