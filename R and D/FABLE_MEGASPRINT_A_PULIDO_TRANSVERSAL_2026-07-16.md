# 🔧 MEGA-SPRINT A · Pulido transversal (Fable)

**Fecha:** 2026-07-16
**Branch:** `fix/megasprint-a-pulido` desde `main` (post-motor)
**Filosofía:** UN sprint consolidado · todos los fixes cross-app juntos · un device test + un merge + un OTA. NO fragmentar.
**Estimado:** 8-12h

---

## 📚 Doctrinas obligatorias (leer)

1. **`feedback_nombres_propios_nunca_en_copy_usuario`** — nombres de personas NO en copy user-facing (ATP/ARGOS).
2. **`feedback_datos_maquina_validados_datos_user_sagrados`** — cronotipo.
3. **`project_doctrina_mi_atp_3_pilares`** — nombres pilares.
4. **`feedback_no_matar_placebo_seguros_no_ingenuos`** — copy limpio.

---

## 🎯 BLOQUE 1 · Copy user-facing

### 1.1 · "Humby" → "ATP" + barrido nombres propios (P0)
- `app/salud/intervenciones/index.tsx`: "Trabajas 8 · **Humby recomiendo/recomienda** enfocarte en 5-7" → "Trabajas 8 · **ATP recomienda** enfocarte en 5-7 para lograr consistencia"
- **Barrido completo:** `grep -ri` en todo el código de copy user-facing por: Humby, Kresser, Bredesen, Attia, Sinclair, Huberman, Prieto, Gratacós, Mariana, Wahls, Gottfried, Kharrazian, y cualquier nombre de persona. Reemplazar por ATP/ARGOS o quitar.
- **EXCEPCIÓN confirmada Enrique 2026-07-16:** "Braverman" SÍ se mantiene (es el test reconocido que el user hizo, no un apodo). Cualquier otro nombre propio → fuera.
- Los nombres solo viven en docs internos + campo `sources` del catálogo (que NO se muestra Nivel 1).

### 1.2 · snake_case técnico → legible en TODA la app (P1)
- Enrique 2026-07-16: "los indicadores se filtran... pasa MUCHO en toda la app."
- Crear sistema central `src/constants/display-labels.ts`: mapa `key técnica → label legible español`.
- Ejemplos: `cortisol_ritmo`→"ritmo de cortisol", `presion_arterial_matutina`→"presión arterial matutina", `25-OH-vitamina_D`→"vitamina D (25-OH)", `PCR_hs`→"PCR", `tasa_oxidacion_grasas_max_METS`→"oxidación de grasas máx", `lactato_umbral_zona2_bpm_watts`→"umbral de lactato zona 2", `HRV RMSSD`→"HRV (RMSSD)", `insulin_resistance`→"resistencia a la insulina", `no_sun_exposure`→"baja exposición solar", `digestion_estres_autonomico`→"digestión por estrés", etc.
- **Aplicar en TODO render user-facing:** motor (buildEpigeneticImpactSentence), DX raíces, condiciones (incluye las de Fx en inglés · ver 1.3), biomarcadores, agenda, síntomas, catálogo intervenciones.
- Los datos internos quedan snake_case · SOLO el display se legibiliza.
- **Barrido:** buscar donde se rendericen keys crudas al user y envolverlas con `displayLabel()`.

### 1.3 · Condiciones Fx en inglés → español (parte del 1.2)
- Panel Coach Fx muestra condiciones crudas en inglés: `insulin_resistance`, `hashimoto`, `hypertension`, `knee_injury`, `adhd`, `insomnia`, `anxiety_disorder`, `alcohol_excess`, `sugar_addiction`, `processed_food`, `poor_sleep`, `no_sun_exposure`, `no_exercise`, `chronic_stress`
- Agregar al mapa displayLabels con traducción español legible.

---

## 🎨 BLOQUE 2 · Visual

### 2.1 · Renombrar pilares Mi ATP (task #89)
- `app/(tabs)/kit.tsx` PILLARS:
  - "HISTORIA CLÍNICA" → **"SALUD FUNCIONAL"** · subtitle "Diagnóstico · datos · evaluaciones · síntomas"
  - "HÁBITOS" → **"HÁBITOS FUNCIONALES"** · subtitle "Nutrición, fitness, sueño, ayuno"
  - "COMUNIDAD" → **"COMUNIDAD ATP"** · subtitle "Ranking · Amigos · Tribu"
- Ver doctrina `project_doctrina_mi_atp_3_pilares`.
- Cualquier título de pantalla que diga "Historia Clínica" como pilar → "Salud Funcional". (El rediseño completo del hub va en Mega-Sprint B · aquí solo el rename del pilar.)

### 2.2 · Cards sub-pilar Hábitos con imagen editorial
- `app/habits-portal.tsx`: NUTRICIÓN, SUPLEMENTACIÓN, FITNESS muestran gradient vacío
- Cablear assets existentes en disco: `habits-portal/nutricion.png`, `habits-portal/suplementacion.png`, `habits-portal/fitness-el.png`/`fitness-ella.png` (por género), `habits-portal/sueno.png`, `habits-portal/ayuno.png` (verificar cuáles existen con `ls`)
- Patrón EditorialCard igual que los pilares top de Mi ATP.

---

## 🔬 BLOQUE 3 · Motor (con validación)

### 3.1 · Cold interventions sin tag fiebre (task #130)
- Code notó: `ducha_fria_nivel1/2/3`, `wim_hof_basico/extendido`, `sauna_finlandesa/infrarrojo/vapor` NO tienen contraindicación fiebre aunque deberían
- Auditar TODAS las intervenciones cold/calor en `interventions-catalog.ts` · agregar a `contraindications`:
  - `fiebre_viral_activa_37_8_o_mas`
  - `infeccion_respiratoria_aguda_fase_temprana`
- Ver doctrina `project_doctrina_promover_fiebre_no_antipireticos`

### 3.2 · Calibrar scoring motor (task #130 · PENDIENTE validación Mariana)
- Confirmado en vivo: scoring satura a 100 (Coherencia cardíaca=100, resto 60-70)
- Code recomendó bajar boost de ×10 a ×5 en `computeScore` de `personalize-interventions.ts`
- **NO aplicar aún** · Enrique valida con Mariana primero. Dejar como TODO marcado en el código con comentario.

---

## 🔄 BLOQUE 4 · Data

### 4.1 · Cronotipo propagación (task #129)
- Enrique cambió cronotipo León→Oso (re-hizo test)
- Verificar que el cambio se propaga a TODAS las fuentes: card YO, agenda (wake_time), config, validatedSchedule, HOY
- Confirmar consistencia cross-app tras cambio de cronotipo
- Si hay fuentes que no se actualizan → fix (fuente única + evento de propagación tipo `cronotipo_changed`)
- Doctrina `feedback_datos_maquina_validados_datos_user_sagrados` + `placeholder_unica_por_dato`

---

## 🚦 Verificación pre-merge

```
npx tsc --noEmit
npm run lint
npm test
```

Device test Enrique de TODO junto:
- Mi Protocolo: "ATP recomienda" (no Humby)
- Copy sin snake_case crudo (motor + DX + condiciones)
- Pilares Mi ATP renombrados
- Cards Hábitos con imagen
- Cronotipo Oso consistente en YO + agenda
- Fx condiciones en español

## 📤 Delivery

`R and D/FABLE_MEGASPRINT_A_DELIVERY.md` con: qué se resolvió, barrido nombres (cuántos encontrados), sistema displayLabels creado, screenshots before/after, bugs bonus.

Un device test → un merge → un OTA.

## 🔒 Invariantes
- str_replace quirúrgico · tsc limpio · tests integration reales
- Cero fuga clínica · nombres propios fuera del copy (excepto Braverman)
- Scoring ×5 NO aplicar sin validación Mariana
- Delivery doc

— Enrique + Cowork
