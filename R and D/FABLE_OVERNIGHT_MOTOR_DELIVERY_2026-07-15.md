# 🌙 OVERNIGHT · Motor de Personalización COMPLETO — Delivery

**Fecha:** 2026-07-15 (overnight autónomo)
**Branch:** `fix/sprint-3-motor` (desde `fix/sprint-2-visual`) · pusheado
**Verificación:** `tsc --noEmit` limpio · eslint 0 errores · **1706 tests verdes** (58 nuevos del motor)
**Estado:** Fase A + Fase B COMPLETAS end-to-end. Motor corriendo, prescribiendo, con UI.

> Enrique: en la mañana solo tienes que hacer (1) revisar migración 201, (2) `supabase db push`, (3) merge a main, (4) OTA desde main, (5) device test. Nada quedó a medias; `tsc` compila aunque la migración no se haya aplicado (el servicio degrada fail-soft).

---

## ✅ Fase A · Backend + Migración + Tests

| Entregable | Archivo | Estado |
|---|---|---|
| A.1 Migración 201 | `supabase/migrations/201_user_prescribed_interventions.sql` | ✅ tabla + vista `user_current_prescription` (security_invoker) + RLS + índices, idempotente |
| A.2 Types | `src/services/interventions/personalize-types.ts` | ✅ UserPhenotype (7 fuentes) + PrescribedIntervention |
| A.3 Motor core | `src/services/interventions/personalize-interventions.ts` | ✅ determinístico, cero LLM |
| A.4 Servicio | `prescription-service.ts` + `prescription-core.ts` | ✅ fetch 7 fuentes + persistencia versionada |
| A.5 Tests | `personalize-interventions.test.ts` (43) + `prescription-core.test.ts` (15) | ✅ 58 verdes |

**Motor core** implementa todos los helpers de la arquitectura §3-6: `personalizeInterventions`, `isContraindicated` (tags string + `excludeIf`, semántica OR clínica), `buildUserState`, `computeScore` (base 20 + boost×10 + pain 30 + ciclo ±20/−15 − noise, cap 100), `matchesRule` (los 7 sources), `getCyclePhaseBoost` (bidireccional), `matchesUserPain`, `selectTop5` (≤3 universales P1 + `deduplicateByFamily`), `generateRationale` + `buildSummarySentence` + `buildEpigeneticImpactSentence`, `categorizeBiomarkersByTier`, `getCyclePhaseNote`, `getContraindicationsChecked`.

**Invariantes garantizados por test:** gating clínico (requiresClinicalValidation fuera), contraindicaciones absolutas (embarazo/fiebre/diabetes 1), universales P1 nunca excluidos sin razón, ciclo bidireccional (folicular 85 vs lútea 50 = diff 35), dedup por familia, rationale con ≥1 razón concreta, tiers de biomarcadores sin solapamiento, **determinismo puro verificado leyendo el source (cero imports de argos/anthropic/supabase/fetch)**.

## ✅ Fase B · UI Mi Protocolo consume prescription

| Entregable | Estado |
|---|---|
| B.1 `PrescriptionCard.tsx` | ✅ rank + score bar + BASE, summary, reasons expandible con badge por fuente, epigenético, nota ciclo, biomarcadores Tier 1/2/3 tabs, CTA Activar |
| B.2 Refactor Mi Protocolo | ✅ sección "TUS PRESCRITAS POR ATP · 5" en top; vieja "Sugeridas" → "Explorar catálogo completo" colapsable; activas Sprint 1.5 intactas |
| B.3 Botón Recalcular | ✅ `generatePrescription` + loading + refresca cards (no auto en cada apertura, §9.1) |
| B.4 Copy cierre | ✅ "las otras existen pero no mueven la aguja tanto…" |
| B.5 Warning 9+ | ✅ `contextNote` del motor (doctrina Humby) en card ámbar |

---

## 🧪 Ejemplo REAL end-to-end · Perfil B (mujer 34 folicular)

Corrida real del motor (`personalizeInterventions(PROFILE_B)`), copiada verbatim del output. Fenotipo: circadiano Nivel 2, estrés/sueño Nivel 3, Braverman acetilcolina+dopamina low, PCR 1.8, vit D 25, cortisol AM alto, folicular día 8, objetivos energía+foco. **Hash de fenotipo: `d0a7d375b61f5409`** (idempotencia).

```
1. Hidratación matutina 500 ml  [Score 100] · BASE
   Base innegociable · Universal P1 para todos. En tu perfil aporta especialmente
   por: Nivel 2 circadiano + alineado con tu objetivo (mas_energia, foco_concentracion).
   🧬 Activa aquaporinas AQP4 cerebral + peristalsis colónica. Modula cortisol_ritmo
      + volumen plasmático. Monitorear: presion_arterial_matutina.
   Biomarcadores → T1: presion_arterial_matutina | T2: HRV matutino | T3: …

2. Exposición solar matutina (Fitzpatrick)  [Score 100] · BASE
   Base innegociable · … por: Nivel 2 circadiano + tu objetivo (energía, foco).
   🧬 Activa CRY1/CRY2 + CLOCK gene phase-setting. Modula cortisol_ritmo + conversión
      serotonina→melatonina 14h después. Monitorear: 25-OH-vitamina_D.
   Biomarcadores → T1: 25-OH-vitamina_D | T2: cortisol_matutino_salival | T3: …

3. Hora de dormir  [Score 100] · BASE
   Base innegociable · … por: Nivel 2 circadiano + Nivel 3 sueno.
   🧬 Activa consolidación memoria + sistema glinfático cerebral. Modula sueño N3 % + REM %.

4. Pantallas off 60 min antes de dormir  [Score 100]
   Basado en tu Nivel 3 sueno + Nivel 2 circadiano, ATP prioriza esta intervención para ti.
   🧬 Activa síntesis nocturna melatonina pineal + GABA-A signaling. Modula DLMO + latencia.

5. Blackout total del cuarto  [Score 100]
   Basado en tu Nivel 3 sueno + Nivel 2 circadiano, ATP prioriza esta intervención para ti.
   🧬 Activa melatonina pineal máxima + sistema glinfático nocturno. Monitorear:
      glucosa_ayunas, presion_arterial_matutina.
```

**Lectura honesta del resultado:** el motor prescribe personalizado y coherente — cita el Nivel 2 circadiano, el Nivel 3 de sueño y los objetivos declarados de la usuaria; separa biomarcadores en tiers (no le pide melatonina urinaria de entrada). El top 5 quedó dominado por sueño/circadiano porque son sus sistemas más comprometidos + son universales P1. **Ver "Riesgos / tuning" abajo** sobre por qué coherencia cardíaca y ayuno 16:8 (que el ejemplo aspiracional de la arquitectura mencionaba) NO aparecen: 16:8 está gateado clínicamente y coherencia_cardiaca_5_5 pierde el slot contra las intervenciones de sueño (todas saturadas a 100).

---

## ⏭️ Pendiente Enrique (mañana, en orden)

1. **Revisar migración 201** (`supabase/migrations/201_user_prescribed_interventions.sql`). Es idempotente y usa `security_invoker` en la vista (la RLS de la tabla gobierna).
2. **`npx supabase db push`** — aplica la tabla + vista al remoto. Sin esto, `getCurrentPrescription`/`generatePrescription` degradan fail-soft (loguean warning, la UI muestra el empty state "toca Recalcular").
3. **Merge `fix/sprint-3-motor` → main.** ⚠️ Incluye Sprint 2 visual (aún sin mergear) — este branch salió de `fix/sprint-2-visual`, así que el merge trae AMBOS. Verifica que Sprint 2 ya pasó tu device test antes, o mergea Sprint 2 primero.
4. **OTA desde main** (`eas update --branch preview`) — NUNCA desde la rama (gotcha del repo).
5. **Device test:** abre Mi Protocolo → "TUS PRESCRITAS POR ATP · 5" arriba → toca Recalcular → deben aparecer 5 cards con rationale, score bar, badge BASE, reasons expandibles, biomarcadores en tabs. Activa una → CTA pasa a "Activa en tu protocolo".

---

## 🐛 Bugs bonus + gaps de catálogo (para Mariana)

1. **Cold showers y sauna sin tag de fiebre.** `ducha_fria_nivel1/2/3`, `wim_hof_*` y `sauna_infrarrojo` NO portan `fiebre_viral_activa_37_8_o_mas` en `contraindications`. Clínicamente durante fiebre viral el frío/calor intensos también están contraindicados. El motor excluye correctamente las de inmersión (`bano_frio_*`, `cold_plunge_cns`, `dive_reflex`) que sí lo tienen, pero las duchas frías y la sauna se cuelan. Un test lo documenta explícitamente. **Fix = agregar el tag en el catálogo (no lo toqué, gotcha #5).**
2. **Bug corregido en el servicio:** `deriveBraverman` tenía un `||` que cortaba en `'medium'` (truthy) y nunca evaluaba la grafía española (`acetilcolina`). Corregido a `names.some()`.

## ⚠️ Riesgos / tuning identificado

1. **Saturación de score a 100.** La fórmula de la arquitectura (`boostWeight × 10` por match, universales P1 con piso 60, pain +30) hace que muchas intervenciones lleguen al cap 100. Entre empates, el orden lo decide la posición en el catálogo, no la relevancia fina → el top 5 pierde discriminación y algunas específicas valiosas (coherencia cardíaca) no entran. **Respeté la fórmula del spec** (no la cambié autónomamente). Recomendación: bajar el multiplicador de boost a ×5 o normalizar por nº de reglas para que el score discrimine mejor. Decisión tuya + Mariana.
2. **DX real ≠ spec.** La arquitectura asume `user_dx_levels` (sistema→nivel); el repo real tiene `functional_dx.roots_detected` (raíces+severidad). El servicio DERIVA niveles desde raíces (`deriveDxLevelsFromRoots`, invirtiendo severidad, mapa `ROOT_TO_SYSTEM`). El mapa cubre las 29 raíces del vocabulario actual; raíces nuevas sin entrada se ignoran silenciosamente (fácil de extender).
3. **Cuestionario Maestro no existe aún** (ni tabla ni UI). `quizAnswers` siempre `[]` → las reglas `source: 'quiz'` nunca matchean. Los objetivos del usuario (para el relevance multiplier) se leen de `client_profiles` best-effort. Cuando exista el Cuestionario Maestro, el motor ya está listo para consumirlo.
4. **`feverViralActive` sin fuente diaria.** No hay tabla de síntomas agudos diarios confiable → el servicio lo deja en `false`. El motor SÍ respeta la contraindicación cuando el flag es true (probado en Perfil F). Falta cablear el input (quiz diario / self-report). Documentado.
5. **Braverman low/med/high aproximado.** El test real guarda conteos + `primary_deficiency`, no low/med/high por NT. El servicio deriva: el déficit primario → `low`, el resto → `medium`. Es una aproximación; con los conteos crudos se puede afinar a 3 niveles reales por NT.

## 📚 Nuevas doctrinas identificadas

- **El motor prescribe, el catálogo es la fuente de verdad del contenido.** La tabla `user_prescribed_interventions` guarda solo la `intervention_key` + score + rationale; el contenido (nombre, how, epigenético) se re-hidrata del catálogo al leer. Así, enriquecer el catálogo mejora prescripciones viejas sin migrar datos.
- **Idempotencia por hash de fenotipo.** No se re-versiona si el fenotipo no cambió (`computePhenotypeHash`, FNV-1a determinístico). Recalcular con los mismos datos no genera basura de versiones.
- **Tests de invariante > tests de key aspiracional** (aprendizaje hotfix Sprint 1.5, aplicado aquí): las specs describían un top 5 "ideal" con keys que el catálogo real no tiene o tiene gateadas. Los tests afirman propiedades clínicas verificables, no una lista de keys que se rompería con cualquier cambio del catálogo.

---

## 🗂️ Archivos del sprint

**Nuevos:** `201_user_prescribed_interventions.sql`, `personalize-types.ts`, `personalize-interventions.ts`, `prescription-core.ts`, `prescription-service.ts`, `PrescriptionCard.tsx`, `personalize-interventions.test.ts`, `prescription-core.test.ts`, `_motor_fixtures.ts`.
**Modificados:** `app/salud/intervenciones/index.tsx`.

Commits: `feat motor A (core)` → `feat motor A (servicio)` → `feat motor B (UI)` → este delivery.

— Fable 🤖 · overnight completo · motor vivo, determinístico, testeado
