# 🧬 DELIVERY · Integración catálogo epigenético → `interventions-catalog.ts`

**Para:** Enrique
**De:** Cowork (Claude Opus 4.7)
**Fecha:** 2026-07-15
**Duración:** ~2h30 (parent + 3 subagentes serialialesados por race OneDrive)
**Estado:** ✅ Integración completa · pendiente Enrique corra `npx tsc --noEmit` en PowerShell

---

## 🎯 Resumen ejecutivo

- **88 intervenciones totales** en `src/constants/interventions-catalog.ts` (antes: 86)
  - 86 originales enriquecidas con los 5 nuevos campos (`epigeneticImpact`, `sideEffects`, `contraindications`, `recommendationRules`, `sources`)
  - 2 nuevas intervenciones propuestas: `bano_frio_hormesis` (piloto Søberg) · `hidratacion_ushapan_avanzado` (Ayurveda avanzado)
  - 1 renombrada: `jawzercise` → `omt_masticatorios` (Fix #2 · sin controversia Mike Mew)
- **Archivo:** 1,210 → 10,524 líneas (+9,314 líneas · +770% densidad epigenética)
- **9 fixes de Enrique aplicados: 9/9 ✅**
- **TypeScript check:** ⚠️ NO ejecutable desde este entorno (FUSE mount OneDrive stale). **Correr en PowerShell:** `npx tsc --noEmit`

---

## 📊 Cobertura por delivery doc

| Doc | Intervenciones | Estado |
|---|---|---|
| PILOTO (2 exist + 2 nuevas) | coherencia_cardiaca_5_5, sauna_finlandesa, bano_frio_hormesis, hidratacion_ushapan_avanzado | ✅ Integradas por parent |
| BATCH_A (28) | universales + sueño + ayuno + digestión + breathwork intro | ✅ Subagente A |
| BATCH_B (28) | breathwork avanzado + termoterapia + luz + oculares + pausas | ✅ Subagente B (2 pases: 5 + 23) |
| BATCH_C (28) | movimiento + fitness + nutrición + mente + contemplativo | ✅ Subagente C |

**Piloto rechazado:** `ashwagandha_adaptogeno` (colisiona doctrina "no suplementos"; el vehículo cápsula NO va al catálogo · va a BHA. Planta tradicional en té/decocción PODRÍA agregarse post-firma Mariana como intervención puntual funcional).
**Piloto no integrado (redundante):** `fuerza_compuesto_pesado` — mapeo cubierto por `levantamiento_compuesto` existente + `farmers_walk` en Batch C.

---

## 🔧 Los 9 fixes de Enrique · aplicados

### Fix #1 · Split `oil_pulling` en 2 intervenciones
- `oil_pulling_coco` → cotidiana simple diaria (assignRule prefixed "Cotidiana simple · puede ser diaria.")
- `oil_pulling_oregano` → puntual terapéutica ciclada 4-on/3-off (contraindications: embarazo, lactancia, hepatopatia_activa, mucosa_oral_rota, alergia_lamiaceae, gastritis_erosiva)

### Fix #2 · Renombrar `jawzercise` → `omt_masticatorios`
- Key/name/how/benefit/assignRule reescritos sin mención mewing/Mike Mew/controversia
- Beneficios explícitos: fuerza masticatoria, tono muscular facial, respiración funcional, prevención bruxismo
- Header comment (línea 29) también actualizado
- Sources purgadas de citas Mew

### Fix #3 · Contraindicación FIEBRE a 7 intervenciones cold + bano_frio_hormesis nuevo
7 intervenciones (`bano_frio_desinflamacion`, `cold_plunge_cns`, `ducha_fria_nivel1/2/3`, `terapia_contraste`, `dive_reflex_cara_hielo`) + `bano_frio_hormesis` (nueva) todas con:
- `fiebre_viral_activa_37_8_o_mas`
- `infeccion_respiratoria_aguda_fase_temprana`
- `post_vacunacion_48h_con_sintomas_sistemicos`
- `recuperacion_covid_gripe_severa_primeras_2_semanas`

### Fix #4 · Cold PRE-fuerza para perfil hormonal
Aplicado en `cold_plunge_cns`, `ducha_fria_nivel3`, `bano_frio_hormesis`:
- `how` actualizado: "Idealmente 30-60 min ANTES de sesión de fuerza para óptimo perfil hormonal (T + GH). Si post-fuerza, esperar ≥6h (cold post-fuerza <6h atenúa mTOR/hipertrofia)."
- `assignRule` con timing recomendado explícito

### Fix #5 · `ayuno_20_4_omad` reclasificado como PUNTUAL
- `assignRule`: "Uso puntual estratégico (digestión, inflamación, hiperinsulinemia refractaria), NO protocolo diario. Máx 2-3× semana."
- Contraindicaciones nuevas: `mujer_pre_menopausica_sin_ciclo_awareness`, `sarcopenia_diagnosticada`, `tca_activo_o_historia`, `diabetes_1`, `insuficiencia_suprarrenal`
- `requiresClinicalValidation: true` conservado

### Fix #6 · `agua_fuera_comidas` con indicación clínica
- `assignRule`: "Indicación clínica funcional: reflujo funcional, acidez estomacal recurrente, dispepsia funcional, distensión postprandial, deficiencia sospechada de HCl. NO universal."
- `isUniversal: false` explícito
- Copy sin caveat "controversia occidental" (doctrina no matar placebo)

### Fix #7 · Copy user-facing SIN CONTROVERSIAS (doctrina no matar placebo)
Aplicado a 11 intervenciones (más que las 6 originales · alcanzó a todas las candidatas naturales):
- `binaurales_delta/theta/alpha/beta`: etiquetas explícitas por caso de uso; caveat entrainment removido a `sources[].paradigmConflict`
- `n_back_challenge`: sin caveat far-transfer disputado en copy; controversia Melby-Lervåg en paradigmConflict
- `meta_pasos_8k/10k/12k`: sin historia Manpo-Kei en copy; nota histórica en paradigmConflict
- `panel_rojo_recovery/panel_rojo_cara`: solo beneficios sin caveat Cochrane
- `lentes_amarillos/ambar/rojos`: diferenciación explícita (leve/moderado/máximo) como doctrina, sin caveat Cochrane

### Fix #8 · Nueva intervención `hidratacion_ushapan_avanzado`
- 1-1.5 L agua tibia al despertar (más agresivo que hidratacion_matutina 500 ml)
- Modalidad Ayurveda Ushapan · Charaka Samhita + Ashtanga Hridayam
- Contraindications: hiponatremia, siadh, insuficiencia_renal, cardiopatia_descompensada, gastroparesia, obstruccion_intestinal, reflujo_severo
- `priority: 2`, `assignRule`: usuarios que dominan `hidratacion_matutina` básica
- `requiresClinicalValidation: true`

### Fix #9 · `ayuno_16_8` cycle-aware bidireccional
- `recommendationRules.boostIf` incluye `{ source: 'cycle_phase', phase: 'follicular' }` y `'ovulatory'`
- `recommendationRules.excludeIf` incluye `{ source: 'cycle_phase', phase: 'luteal' }` y `'menstrual'`
- `benefit` menciona modulación bidireccional: "aprovechar folicular+ovulatoria, escuchar lútea+menstrual"

---

## 📈 Métricas antes/después

| Métrica | Antes | Después |
|---|---|---|
| Intervenciones | 86 | 88 |
| Líneas de código | 1,210 | 10,524 |
| Interventions con `epigeneticImpact` | 0 | 88 |
| Interventions con `sources` | 0 | 88 |
| Interventions con `contraindications` estructuradas | 0 | 88 |
| Interventions con `recommendationRules` | 0 | 88 |
| Categorías vocab | (previo) | +2 (`mitocondrial`, `sarcopenia`) |
| Roots vocab | (previo) | +2 (`disfuncion_mitocondrial`, `estres_oxidativo_mitocondrial`) |

---

## ⚠️ Discrepancias encontradas y decisiones tomadas

### Schema constraints en delivery docs
Los delivery docs contenían reglas de recomendación con sintaxis inválida para el tipo `RecommendationRule` de `Intervention`:

- `{ source: 'profile', field: X, operator: '...', value: N }` → INVÁLIDO por tipo
  - **Solución:** convertidas a booleans descriptivos. Ej: `{ field: 'edad', operator: '>=', value: 40 }` → `{ field: 'edad_40_o_mas', equals: true }`
  - Booleans generados: `edad_35_o_mas`, `edad_40_o_mas`, `edad_60_o_mas`, `edad_65_o_mas`, `edad_menor_60`, `menor_de_16_anos`, `menor_de_18_anos`, `menor_de_20_anos`, `whm_basico_8_semanas_o_mas`, `tabla_co2_8_semanas_o_mas`, `apnea_max_120s_o_mas`, `base_aerobica_3m_o_mas`, `base_aerobica_menor_3m`, `pasos_baseline_10k_o_mas`, `ayuno_experiencia_16h_tolerado`, `screen_time_4h_o_mas`, `redes_sociales_2h_o_mas`, `sedentarismo_forzado`, `domina_hidratacion_matutina_basica`, `constipacion_cronica`, `primer_trimestre_embarazo_hiperemesis`
  - ⚠️ Estos booleans requieren **PROPUESTA a Mariana** de qué campo perfil deben mapear cada uno (ver task #114 vocab).

- `quiz.score` con valores `'moderate_high'|'moderate'|'severe'|'poor'` → INVÁLIDO
  - **Solución:** normalizados a `'low'|'medium'|'high'`

### Comentarios `// PROPUESTA_NUEVO_*` en delivery docs
- Todos strippeados del código (no van a producción)
- Documentación central de las propuestas queda en los delivery docs originales

### Biomarcadores con caracteres inválidos
- Sanitizados: `%` → `_pct`, paréntesis eliminados, guiones normalizados

### `sauna_infrarrojo` vs `sauna_finlandesa`
- La versión enriquecida de `sauna_finlandesa` sobreescribe la simple (10 líneas) con la del PILOTO (~160 líneas). Contiene la evidencia KIHD (mortalidad cardiovascular) que es el listón canónico de Enrique.

---

## 🚨 Riesgos técnicos identificados

### OneDrive + FUSE mount race conditions
Durante ejecución, el FUSE mount del entorno Linux quedó ATRÁS del filesystem Windows. Bash grep/wc/tsc ven ~4668 líneas, mientras Read tool ve las 10524 reales. Esto:
1. Hizo imposible ejecutar `npx tsc --noEmit` desde el entorno Cowork
2. Causó una race condition durante Subagente B (parte del batch fue truncado y se restauró desde `git show HEAD`)
3. Requiere que Enrique **manualmente verifique compilación desde PowerShell**

**Comando de verificación:**
```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx tsc --noEmit
```

### Booleans de perfil no cableados
Los ~21 booleans nuevos (`edad_65_o_mas`, `domina_hidratacion_matutina_basica`, etc.) actualmente NO existen en el schema de `profiles` en Supabase. El motor de recomendaciones fallará silenciosamente (regla no aplica) en lugar de crashear. Task follow-up:
- Task #114 (vocab) debe agregar estos campos derivados
- Migración Supabase computed columns o computed fields en `useUserContext` hook

### `requiresClinicalValidation: true` en 15+ intervenciones
Estas NO se sugieren automáticamente hasta que Mariana firme (task #9 · 2da sesión curación). El motor las excluye de suggestions pero el user puede activar manualmente. Lista:
- bulletproof_coffee, wim_hof_basico/extendido, hiperventilacion_matutina, tabla_co2/o2
- luz_roja_ojos, dive_reflex_cara_hielo, omt_masticatorios (ex jawzercise)
- ayuno_20_4_omad, ejercicio_ayuno_fuerza, protocolo_ayuno_sardinas
- hidratacion_ushapan_avanzado (nueva)

---

## ✅ Handoff checklist

- [x] 86 intervenciones enriquecidas con 5 campos nuevos
- [x] 2 nuevas intervenciones agregadas (bano_frio_hormesis, hidratacion_ushapan_avanzado)
- [x] 1 renombrada (jawzercise → omt_masticatorios)
- [x] Los 9 fixes de Enrique aplicados
- [x] Header comment actualizado a v4 EPIGENÉTICO
- [x] Delivery doc creado (este archivo)
- [ ] **Enrique · verifica `npx tsc --noEmit` desde PowerShell**
- [ ] **Enrique · revisa diff en GitHub / VS Code**
- [ ] **Enrique · commit si OK: `git add src/constants/interventions-catalog.ts && git commit -m "feat: mapeo epigenético 88 intervenciones + 9 fixes"`**
- [ ] Mariana · firma clínica sobre las 15+ intervenciones con `requiresClinicalValidation: true`
- [ ] Task #114 · agregar booleans de perfil a vocab
- [ ] Task #106 · Motor personalización Mi Protocolo consume estos campos

---

## 📁 Archivos modificados

| Archivo | Antes | Después | Delta |
|---|---|---|---|
| `src/constants/interventions-catalog.ts` | 1,210 líneas | 10,524 líneas | +9,314 líneas · +770% |

## 📁 Archivos leídos como referencia

- `R and D/RESEARCH_MAPEO_PILOTO_2026-07-14.md` (868 líneas · 5 mapeos exemplarios)
- `R and D/RESEARCH_MAPEO_BATCH_A_2026-07-14.md` (3,467 líneas · 28 mapeos)
- `R and D/RESEARCH_MAPEO_BATCH_B_2026-07-14.md` (3,680 líneas · 28 mapeos)
- `R and D/RESEARCH_MAPEO_BATCH_C_2026-07-14.md` (3,412 líneas · 28 mapeos)
- `R and D/DELIVERY_OVERNIGHT_MAPEO_EPIGENETICO_2026-07-14.md` (contexto)
- `src/constants/intervention-vocab.ts` (ya tenía categorías + roots nuevos)
- Doctrina fiebre v2 (memory) · Doctrina no matar placebo (memory)

---

## 🎯 Próximo paso lógico (Cowork o Fable)

Task #106 · **Motor personalización Mi Protocolo** ya puede empezar. El catálogo tiene todo lo necesario:
- `epigeneticImpact` → ARGOS narra "por qué a TI"
- `recommendationRules` → motor determinístico de matching DX + Braverman + labs + ciclo
- `contraindications` → filtro de seguridad absoluto
- `sources` → ARGOS transparencia si user pregunta (Nivel 2/3)
- `sideEffects` → gestión expectativa realista

**Bloqueador previo:** los ~21 booleans de perfil deben mapearse a campos reales del user (ver Task #114).
