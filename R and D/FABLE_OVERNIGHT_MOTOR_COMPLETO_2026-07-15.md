# 🌙 FABLE OVERNIGHT · Motor de Personalización COMPLETO (Fase A + Fase B)

**Fecha:** 2026-07-15 (overnight · Enrique se va a dormir)
**Branch nuevo:** `fix/sprint-3-motor` (desde `fix/sprint-2-visual` · para incluir el trabajo visual + no bloquear en merge)
**Estimado:** 12-20h · trabajo autónomo · Enrique NO está disponible hasta la mañana
**Objetivo:** construir el motor de personalización COMPLETO end-to-end · el diferenciador core de ATP.

**Modo de trabajo:** AUTÓNOMO. Enrique duerme. Auto-verifica todo (tsc + tests). NO pares a preguntar salvo bloqueo crítico irresoluble (documéntalo en el delivery y sigue con lo demás). Deja TODO commiteado + pusheado + delivery doc listo para que Enrique en la mañana solo haga: device test → merge → OTA.

---

## 📚 Briefs fuente (lee AMBOS completos primero)

1. **`R and D/FABLE_BRIEF_MOTOR_FASE_A_2026-07-14.md`** — backend + migración + tests
2. **`R and D/FABLE_BRIEF_MOTOR_FASE_B_UI_2026-07-14.md`** — UI Mi Protocolo consume prescription
3. **`R and D/MOTOR_PERSONALIZACION_ARQUITECTURA_v1.md`** — spec completa (14 secciones · la biblia del motor)

Estos 3 docs tienen TODO el detalle. Este overnight brief los orquesta + resuelve gotchas específicos.

---

## ⚙️ Gotchas resueltos (aplica sin preguntar)

1. **Migración = 201** (NO 200 · el 200 ya lo usó el hotfix wake_time del León). Nombre: `201_user_prescribed_interventions.sql`
2. **Branch base = `fix/sprint-2-visual`** (NO main · Enrique no ha mergeado Sprint 2 aún · trabajamos encima para no perder el visual). Crea `fix/sprint-3-motor` desde ahí.
3. **NO apliques la migración a prod** (`supabase db push`) — Enrique la aplica en la mañana tras revisar. Solo déjala lista en el repo + documenta en delivery que está pendiente de aplicar.
4. **NO publiques OTA** — Enrique lo hace en la mañana desde main tras merge (el gotcha de este repo: OTA desde rama sin mergear = invisible).
5. **Catálogo enriquecido ya está** en `src/constants/interventions-catalog.ts` (88 intervenciones con `epigeneticImpact`, `recommendationRules`, etc.). NO lo toques · consúmelo.

---

## 🎯 FASE A · Backend + Migración + Tests (haz esto primero · 8-12h)

### A.1 · Migración `supabase/migrations/201_user_prescribed_interventions.sql`
Copia el schema del doc arquitectura sección 7 verbatim (tabla + vista `user_current_prescription` + RLS + índices). Idempotente (`IF NOT EXISTS`). Ajusta nombre a 201.

### A.2 · Types `src/services/interventions/personalize-types.ts`
Todos los types del doc arquitectura sección 2: `UserPhenotype`, `DXLevel`, `BravermanResult`, `UserLab`, `QuizAnswer`, `UserChronotype`, `UserCyclePhase`, `Profile`, `PrescribedIntervention`, `RationaleReason`, `SystemName`.

### A.3 · Función core `src/services/interventions/personalize-interventions.ts`
TODOS los helpers del doc arquitectura secciones 3-6:
- `personalizeInterventions(phenotype, catalog?)` (entry point)
- `isContraindicated()` + `buildUserState()` + `matchesUserState()`
- `computeScore()` + `matchesRule()` + `applyOperator()`
- `getCyclePhaseBoost()` (doctrina bidireccional · folicular/ovulatoria boost · lútea/menstrual penalty)
- `matchesUserPain()` + `getNoiseFactor()`
- `selectTop5()` + `deduplicateByFamily()`
- `generateRationale()` + `buildSummarySentence()` + `buildEpigeneticImpactSentence()`
- `categorizeBiomarkersByTier()` (Tier 1/2/3 · doctrina biomarcadores costosos)
- `getCyclePhaseNote()` + `getContraindicationsChecked()`

**CRÍTICO:** cero imports de argos-proxy / Anthropic. Motor 100% determinístico.

### A.4 · Servicio `src/services/interventions/prescription-service.ts`
- `fetchUserPhenotype(userId): Promise<UserPhenotype>` — arma fenotipo de las 7 fuentes (dx_levels, braverman, labs, master_quiz, chronotype, cycle, profiles)
- `generatePrescription(userId): Promise<PrescribedIntervention[]>` — fetchPhenotype → personalizeInterventions → persistir con superseded_at de anteriores
- `getCurrentPrescription(userId)` — lee vista
- `computePhenotypeHash(phenotype)` — SHA-256 · idempotencia (no re-crear versión si fenotipo no cambió)

### A.5 · Tests `src/services/interventions/__tests__/personalize-interventions.test.ts`
Los 6 perfiles sintéticos del doc arquitectura sección 8:
- A · Hombre 45 sedentario obesidad
- B · Mujer 34 folicular biohacker
- C · Mujer 34 lútea (mismo user distinta fase → recomendaciones distintas)
- D · Adulto mayor 68 sarcopenia
- E · Embarazada 2do trimestre (excluye OMAD/sardinas/sauna/cold/wim hof)
- F · Fiebre viral activa (excluye TODAS las cold interventions)

+ los 10 test guards del doc arquitectura sección 11.

**Verifica Fase A:** `npx tsc --noEmit` limpio + `npm test` de este archivo 100% verde antes de pasar a Fase B.

---

## 🎨 FASE B · UI Mi Protocolo consume prescription (después de A · 4-8h)

### B.1 · Componente `src/components/interventions/PrescriptionCard.tsx`
Del doc Fase B sección B.1: header (rank + nombre + score + badge BASE) + rationale summary + reasons expandible + epigenetic impact + cycle phase note (solo si aplica) + biomarcadores Tier 1/2/3 tabs + CTA "Activar".

### B.2 · Refactor `app/salud/intervenciones/index.tsx`
Sección "Tus prescritas por ATP · 5" en top (usa PrescriptionCard × 5) + "Explorar catálogo completo (88)" colapsable. NO borres la sección activas (Sprint 1.5 la dejó bien).

### B.3 · Botón "Recalcular mi protocolo"
Llama `generatePrescription(userId)` + loading state + refresca cards.

### B.4 · Copy cierre
*"Estas son las 5 que ATP prioriza para tu perfil hoy. Las otras 83 existen y son válidas, pero para tu fenotipo actual no mueven la aguja tanto. Cuando subas de nivel o cambien tus datos, ATP recalcula."*

### B.5 · Warning 9+ activas
Con `contextNote` del motor · doctrina Humby.

**Ejemplo visual completo en doc Fase B sección "Detalles visuales".**

---

## 🧪 Auto-verificación final (antes de considerar overnight done)

```
npx tsc --noEmit          # 0 errores
npm run lint              # 0 errores (o warnings preexistentes only)
npm test                  # todos verdes · especialmente personalize-interventions.test.ts
```

Si algo falla y NO puedes resolverlo → documenta en delivery bajo "BLOQUEOS" y sigue con lo que sí puedas. NO dejes el branch roto (tsc debe compilar aunque un feature quede parcial).

---

## 📤 Delivery (obligatorio para que Enrique arranque en la mañana)

`R and D/FABLE_OVERNIGHT_MOTOR_DELIVERY_2026-07-15.md` con:
- **Estado Fase A:** migración + función + servicio + tests (cuántos verdes)
- **Estado Fase B:** componente + refactor + recalcular + copy
- **Verificación:** tsc + lint + test output
- **Ejemplo real:** corre el motor con Perfil B (mujer folicular) y pega el top 5 con rationale generado (prueba que funciona end-to-end)
- **Pendiente Enrique mañana:** (1) revisar migración 201, (2) `supabase db push`, (3) merge fix/sprint-3-motor a main, (4) OTA desde main, (5) device test
- **Bugs bonus + edge cases + riesgos**
- **Nuevas doctrinas identificadas**

---

## 🔒 Invariantes

- str_replace quirúrgico
- Idempotencia migración (IF NOT EXISTS)
- Motor 100% determinístico (cero LLM en core)
- Universales P1 nunca excluidos sin razón absoluta
- Ciclo femenino bidireccional (no solo reducir)
- Contraindicaciones absolutas respetadas (embarazo, fiebre viral, diabetes 1)
- Biomarcadores Tier 1/2/3 (no cargar caros por default)
- `generateUUID` no `crypto.randomUUID`
- `getLocalToday()` / `parseLocalDate()`
- Tests integration reales (no unit que validan doctrina equivocada · aprendizaje hotfix Sprint 1.5)
- Cero fuga clínica

---

## 💛 Nota

Este es EL trabajo que convierte ATP de "app con catálogo" a "app de prescripción funcional personalizada". Cuando Enrique despierte y vea el motor devolviendo 5 prescritas con "por qué a TI" basado en su fenotipo real → ese es el momento en que 3 días de research epigenético masivo cobran vida.

Trabaja tranquilo toda la noche. Auto-verifica. Deja todo listo. Enrique confía en ti.

— Enrique + Cowork
