# 🔧 MEGA-SPRINT A · Pulido transversal — Delivery

**Fecha:** 2026-07-16
**Branch:** `fix/megasprint-a-pulido` (desde `main` post-motor) · pusheado
**Verificación:** `tsc --noEmit` limpio · eslint 0 errores (warnings preexistentes only) · **1712 tests verdes** (168 files, +6 nuevos display-labels + guard fiebre actualizado)
**Estado:** los 4 bloques resueltos. Un device test → un merge → un OTA.

---

## 🎯 BLOQUE 1 · Copy user-facing

### 1.1 · Nombres propios fuera del copy (excepción Braverman) ✅

Barrido completo con grep sobre `app/` + `src/` (excluyendo comentarios, tests, y los campos internos `sources`/`citation`/`paradigmConflict`/`scientificInfo`-metadata). **Hallazgos user-facing y su fix:**

| Ubicación | Antes | Ahora |
|---|---|---|
| `salud/intervenciones/index.tsx` | "Humby recomienda enfocarte…" | "**ATP** recomienda enfocarte…" |
| `personalize-interventions.ts` contextNote | "Doctrina Humby: menos, mejor" | "**ATP** recomienda menos, mejor" |
| catálogo `zona_2_aerobica` how/benefit | "Attia protocol…", "(Iñigo San Millán)", "(Attia zona 2 doctrina)" | sin nombres, hecho intacto |
| catálogo `vo2max_training` benefit/scientificInfo | "(Mandsager 2018 · Attia)", "regla Attia" | "predictor #1 de mortalidad…", "regla 80/20" |
| catálogo `nsdr_yoga_nidra` how | "Huberman recomienda 1-3×/día" | "Se recomienda 1-3×/día" |
| catálogo `bulletproof_coffee` scientificInfo | "Doctrina Enrique 2026-07-11:…" | "Doctrina ATP:…" |
| catálogo `protocolo_ayuno_sardinas` scientificInfo | "Placeholder — Enrique aporta…" | "Protocolo en validación —…" |
| `training-methods.tsx` | "métodos… diseñados por **Enrique Zapata**" | "métodos de entrenamiento propietarios de ATP" |

**Braverman se mantiene** (test reconocido). Los nombres restantes viven solo en comentarios de código + campos internos del catálogo (`sources`, `citation`, `paradigmConflict`, `assignRule`) que **no se renderizan en Nivel 1** (verificado: la pantalla de detalle muestra `name`/`how`/`benefit`/`scientificInfo`, nunca `assignRule` ni `sources`).

### 1.2 / 1.3 · snake_case → legible en toda la app ✅

Creado **`src/constants/display-labels.ts`** — `displayLabel(key)` / `displayLabels(keys)`:
- **Mapa curado** para los términos comunes/feos (biomarcadores, epigenéticos, condiciones Fx).
- **Beautify de cola** para keys sin entrada (guiones bajos → espacios), conservando la nota entre paréntesis intacta.
- Ejemplos: `cortisol_ritmo`→"ritmo de cortisol", `presion_arterial_matutina`→"presión arterial matutina", `25-OH-vitamina_D`→"vitamina D (25-OH)", `HRV_RMSSD`→"HRV (RMSSD)", `digestion_estres_autonomico`→"digestión por estrés", `insulin_resistance`→"resistencia a la insulina", `no_sun_exposure`→"baja exposición solar".
- **Condiciones Fx inglés→español (1.3):** `hashimoto`, `hypertension`→hipertensión, `knee_injury`→lesión de rodilla, `adhd`→TDAH, `insomnia`→insomnio, `anxiety_disorder`→trastorno de ansiedad, `alcohol_excess`, `sugar_addiction`, `processed_food`, `poor_sleep`, `no_sun_exposure`, `no_exercise`, `chronic_stress`.

**Aplicado en:** el motor (`buildEpigeneticImpactSentence` → activates/modulates/biomarcadores) y `PrescriptionCard` (listas de biomarcadores por tier). El dato interno queda snake_case; solo el display se legibiliza (doctrina). **Resultado real** (Perfil B, verbatim):
> *"Activa aquaporinas AQP4 cerebral + peristalsis colónica. Modula **ritmo de cortisol** + **volumen plasmático**. Monitorear: **presión arterial matutina**."*
> *"Monitorear: **vitamina D (25-OH)** (target funcional 50-80 ng/mL)."*

**Nota:** el panel Coach de condiciones (`condition-catalog.ts`) YA tenía labels en español — `displayLabel()` cubre las condiciones que llegan crudas desde el fenotipo/DX. Se pueden envolver más renders con `displayLabel()` incrementalmente; el sistema central ya existe.

---

## 🎨 BLOQUE 2 · Visual

### 2.1 · Pilares Mi ATP renombrados ✅
`kit.tsx`: HISTORIA CLÍNICA → **SALUD FUNCIONAL** ("Diagnóstico · datos · evaluaciones · síntomas"); HÁBITOS → **HÁBITOS FUNCIONALES** ("Nutrición, fitness, sueño, ayuno"); COMUNIDAD → **COMUNIDAD ATP**. El header del hub (`health-hub.tsx`) → "Salud Funcional". Las pantallas `historia-clinica/*` (sub-módulo de cuestionarios) conservan su nombre legítimo — el rediseño del hub va en Mega-Sprint B.

### 2.2 · Cards sub-pilar Hábitos con imagen ✅ (ya cableado en Sprint 2)
Verifiqué con `ls`: los 6 assets existen (`nutricion/suplementacion/ayuno/sueno.png`, `fitness-el/ella.png`). El código de `habits-portal.tsx` YA los cablea (Sprint 2, ya en `main`): NUTRICIÓN/SUPLEMENTACIÓN/SUEÑO/AYUNO estáticas, FITNESS sex-aware (`pickFitnessImage`). Si Enrique aún los ve en gradient, es bundle stale — **este OTA los trae**. Nada que cambiar en código.

---

## 🔬 BLOQUE 3 · Motor

### 3.1 · Contraindicación fiebre en cold/calor ✅
Auditadas las 17 intervenciones de frío/calor/apnea. **10 ya tenían el tag; 6 faltaban** → agregado `fiebre_viral_activa_37_8_o_mas` + `infeccion_respiratoria_aguda_fase_temprana` a: `temperatura_cuarto_frio`, `wim_hof_basico`, `wim_hof_extendido`, `tabla_co2`, `tabla_o2`, `sauna_vapor`. **`compresa_fria_ojos` NO** (compresa local en ojos durante fiebre no es contraindicación sistémica — es benigna). Guard de test actualizado: las 6 ahora se contraindican con fiebre y quedan fuera del top 5.

### 3.2 · Scoring ×5 · NO APLICADO (pendiente Mariana) ✅
Dejado como TODO comentado en `computeScore` (`personalize-interventions.ts`): *"×10 satura el score a 100 … Code recomendó ×5. NO aplicar hasta que Enrique valide con Mariana."* El multiplicador sigue en ×10.

---

## 🔄 BLOQUE 4 · Cronotipo

### 4.1 · Propagación cross-app ✅ + bug de esquema corregido
Auditoría completa (writers/readers/eventos). **Hallazgo bueno:** las 3 superficies (YO, HOY, Agenda) ya releen por `useFocusEffect`, así que el cambio León→Oso SÍ propaga al navegar de vuelta (el quiz hace `router.replace` → focus). **Dos fixes de robustez + un bug real:**

1. **🐛 BUG corregido:** `saveChronotype` (onboarding v2) escribía a columnas **inexistentes** `peak_physical`/`wind_down` (la tabla tiene `peak_physical_start/end`, `wind_down_time` — confirmado en el esquema live) → el upsert de onboarding **fallaba silencioso**. Corregido a los nombres reales + `onConflict` + `updated_at` (que el motor de prescripción lee para detectar cambios de fenotipo).
2. **Propagación push:** ambos writers (`saveUserChronotype` del quiz + `saveChronotype` del onboarding) ahora emiten `DeviceEventEmitter.emit('chronotype_changed')`. HOY y Agenda lo escuchan (HOY recompila su timing; Agenda reconcilia las horas de Despertar/Dormir) sin depender solo del re-focus. YO refresca por focus.

---

## 🐛 Bugs bonus encontrados

1. **`saveChronotype` onboarding escribía columnas inexistentes** (peak_physical/wind_down) → upsert fallaba silencioso. Corregido (Bloque 4).
2. **Nombres propios en campos user-facing del catálogo** más allá de "Humby": Attia/San Millán/Huberman en `how`/`benefit`/`scientificInfo` de zona_2/vo2max/nsdr, y "Enrique" en 2 `scientificInfo`. Todos limpiados.

## ⚠️ Riesgos / notas

- **Mismatch de writers de cronotipo persiste parcialmente:** ahora ambos escriben columnas válidas, pero W2 (onboarding) aún no escribe `raw_scores` ni `peak_physical_end` (CHRONO_SCHEDULES solo tiene un `peak_physical` puntual). No rompe nada; el re-take va por el quiz (W1, completo). Unificar W2→W1 queda como mejora futura (ya propuesto en el audit Cowork).
- **displayLabel es incremental:** cubre el motor + PrescriptionCard + condiciones Fx. Otros renders con keys crudas se pueden envolver con `displayLabel()` según aparezcan; el sistema central ya está.

## ⏭️ Pendiente Enrique
1. Device test de TODO junto (checklist del brief): "ATP recomienda" (no Humby), copy sin snake_case crudo, pilares renombrados, cards Hábitos con imagen, cronotipo Oso consistente en YO+agenda, condiciones en español.
2. Merge `fix/megasprint-a-pulido` → main.
3. OTA desde main (NUNCA desde la rama).
4. Validar con Mariana el scoring ×5 antes de aplicarlo (TODO marcado en el código).

## 🗂️ Archivos
**Nuevos:** `src/constants/display-labels.ts` + su test.
**Modificados:** `kit.tsx`, `health-hub.tsx`, `training-methods.tsx`, `salud/intervenciones/index.tsx`, `interventions-catalog.ts`, `personalize-interventions.ts`, `PrescriptionCard.tsx`, `quiz-service.ts`, `onboarding-v2-service.ts`, `(tabs)/index.tsx`, `agenda.tsx`, `personalize-interventions.test.ts`.

Commits: `B1.1+B2.1+B3.2` → `B1.2+B3.1` → `B4.1` → este delivery.

— Fable 🤖 · pulido transversal · un merge, un OTA
