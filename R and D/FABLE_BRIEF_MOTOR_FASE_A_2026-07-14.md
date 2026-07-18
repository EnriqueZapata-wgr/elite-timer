# 🧠 FABLE BRIEF · Motor Personalización · FASE A (Backend + Migración + Tests)

**Fecha:** 2026-07-14
**Estado:** Listo para arrancar cuando Sprint 1.5 esté mergeado + testeado device
**Estimado:** 8-12h
**Prerequisito:** Sprint 1.5 mergeado a main + OTA validado en device
**Doctrina base:** `R and D/MOTOR_PERSONALIZACION_ARQUITECTURA_v1.md` (spec completa · lee primero)

---

## 🎯 Qué construyes en Fase A

**El backend puro del motor de personalización.** Sin UI todavía. Función determinística + persistencia + tests. Cuando Fase A cierre, el motor puede llamarse desde consola/edge function y devolver top 5 prescritas para un fenotipo dado.

**Fase B (UI Mi Protocolo consume prescription) va después · brief separado.**

---

## 📚 Lee ANTES de tocar código (obligatorio)

1. **`R and D/MOTOR_PERSONALIZACION_ARQUITECTURA_v1.md`** — spec completa (14 secciones)
   - Especialmente: sección 3 (función core), 4 (scoring), 5 (top 5), 6 (rationale), 7 (SQL), 8 (test perfiles), 11 (test guards)
2. **`src/constants/interventions-catalog.ts`** — catálogo enriquecido 88 intervenciones
   - Los 5 campos nuevos: `epigeneticImpact`, `sideEffects`, `contraindications`, `recommendationRules`, `sources`
   - Interface `Intervention` + tipos `RecommendationRule`, `EpigeneticImpact`
3. **`src/constants/intervention-vocab.ts`** — categorías (incluye `mitocondrial`, `sarcopenia`) + roots (incluye mitocondriales)

## 📚 Doctrinas raíz que gobiernan (obligatorio · están en memoria Cowork · destiladas abajo)

- **Personalización > catálogo abierto** — motor prescribe 5, no lista 88
- **Universales P1 siempre primero cuando aplican** — nunca excluir sin razón absoluta
- **Contraindicaciones absolutas se respetan** (embarazo, fiebre viral, diabetes tipo 1, etc.)
- **Ciclo femenino bidireccional** — folicular+ovulatoria = intensificar · lútea+menstrual = escuchar (NO solo reducir)
- **Doctrina no matar placebo** — rationale expone RAZONES concretas al user · NO expone controversias académicas
- **Determinístico > LLM en el core** — algoritmo puro reproducible · ARGOS narrativa es capa opcional V1.5

---

## 🔧 Los 5 entregables técnicos de Fase A

### A.1 · Migración SQL `200_user_prescribed_interventions.sql`

Tabla + vista + RLS + índices. Copiar del doc arquitectura sección 7 verbatim (idempotente con `IF NOT EXISTS`). Después del merge: `npx supabase db push` aplica al remoto.

**Test guard SQL:** después de INSERT + `superseded_at = now()`, la vista `user_current_prescription` no debe devolver esa fila.

### A.2 · Types en `src/services/interventions/personalize-types.ts`

Todos los types del doc arquitectura sección 2 (UserPhenotype, DXLevel, BravermanResult, UserLab, QuizAnswer, UserChronotype, UserCyclePhase, Profile) + los output (PrescribedIntervention, RationaleReason).

**Test guard TS:** `npx tsc --noEmit` limpio.

### A.3 · Función core `src/services/interventions/personalize-interventions.ts`

Función `personalizeInterventions(phenotype, catalog?)` con TODOS los helpers del doc arquitectura sección 3-6:

- `isContraindicated()` + `buildUserState()` + `matchesUserState()`
- `computeScore()` + `matchesRule()` + `applyOperator()`
- `getCyclePhaseBoost()` + `matchesUserPain()` + `getNoiseFactor()`
- `selectTop5()` + `deduplicateByFamily()`
- `generateRationale()` + `buildSummarySentence()` + `buildEpigeneticImpactSentence()`
- `categorizeBiomarkersByTier()` + `getCyclePhaseNote()` + `getContraindicationsChecked()`

**Regla crítica:** NUNCA importa `argos-proxy` o Anthropic client aquí. El core es puro determinístico. ARGOS es capa aparte (Fase C · V1.5).

### A.4 · Servicio Supabase `src/services/interventions/prescription-service.ts`

- `fetchUserPhenotype(userId): Promise<UserPhenotype>` — arma fenotipo consolidado leyendo las 7 fuentes
- `generatePrescription(userId): Promise<PrescribedIntervention[]>` — orquesta: fetchPhenotype → personalizeInterventions → persistir en `user_prescribed_interventions` con `superseded_at` de las anteriores
- `getCurrentPrescription(userId): Promise<PrescribedIntervention[]>` — lee vista `user_current_prescription`
- `computePhenotypeHash(phenotype): string` — hash SHA-256 del fenotipo (para versionado + detectar si cambió antes de recalcular · evita spam de writes)
- Idempotencia: si `computePhenotypeHash` no cambió → no crear nueva versión

### A.5 · Tests unitarios `src/services/interventions/__tests__/personalize-interventions.test.ts`

Los 6 perfiles sintéticos del doc arquitectura sección 8:
- Perfil A · Hombre 45 sedentario obesidad
- Perfil B · Mujer 34 folicular biohacker
- Perfil C · Mujer 34 lútea (mismo user distinta fase)
- Perfil D · Adulto mayor 68 sarcopenia inicial
- Perfil E · Embarazada 2do trimestre
- Perfil F · Fiebre viral activa

Cada test valida:
1. Contraindicaciones respetadas (motor NO devuelve X)
2. Top 5 incluye intervenciones esperadas
3. Rationale menciona razones concretas al fenotipo
4. Cycle bidireccional funciona (Perfil B vs C recibe distinto)
5. Fiebre viral filtra cold interventions (Perfil F)

**Todos los 10 test guards del doc arquitectura sección 11.**

---

## 🚦 Verificación pre-merge

Antes de pedir audit Cowork:

```
npx tsc --noEmit
npm test -- src/services/interventions/__tests__/personalize-interventions.test.ts
```

Ambos deben salir limpios (0 errores TS · 100% tests verdes).

---

## 📤 Al terminar Fase A

**Delivery doc:** `R and D/FABLE_MOTOR_FASE_A_DELIVERY_2026-07-14.md` con:
- Migración aplicada · schema final
- Función core + helpers implementados (referencia archivos)
- 6 tests sintéticos pasando (screenshots o output)
- Bugs bonus descubiertos (Fable siempre encuentra 2-3)
- Edge cases · riesgos
- Nuevas doctrinas identificadas (si aplica)
- Handoff limpio a Fase B (UI)

**Al pedir audit Cowork:** avisa "Motor Fase A done · pending audit". Cowork audita branch antes de merge.

---

## 🎁 Recompensa emocional

Cuando cierres Fase A, ATP pasa oficialmente de "app con catálogo abrumador" a **"app de prescripción funcional personalizada real"**. Es el corazón del producto. Sin motor, todo el research epigenético masivo del 2026-07-14 se queda como PDFs bonitos. Con motor, cambia la vida de gente real.

Vamos.

— Enrique + Cowork
