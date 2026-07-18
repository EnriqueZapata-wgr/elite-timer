# 🎸 FABLE SPRINT — POLISH FINAL pre-beta

**Fecha:** 2026-07-11 (viernes AM tras review Mariana)
**Estimado:** 1-3h · sprint quirúrgico
**Deadline hard:** sábado 2026-07-11 15:00 CDMX (antes prep técnica beta)
**Owner:** Fable (CCF5)
**Contexto:** Sprint ONBOARDING épico entregado con 2 flags decisión + copy compacto Mariana review. Este sprint aplica los ajustes finales antes del envío WhatsApp.

---

## 🎯 Filosofía

Sprint chico y quirúrgico. NO features nuevas. Solo:
- Aplicar decisiones de Mariana + Enrique del copy review
- Fix bugs no críticos que aparezcan del testing device
- Preparar la app para el momento final

---

## 📖 Input requerido antes de arrancar

**Enrique llena esta sección después del review Mariana mañana:**

### Copy Meet ARGOS (crítico compliance + doctrina nutriólogo) ✅ DECIDIDO ENRIQUE 2026-07-10

**Pantalla 3 FINAL:**
```
"No solo soy una app.
Soy tu asistente personal.
Impulsado por IA."
```

**Pantalla 4 FINAL (actualizada 2026-07-10 con doctrina nutriólogo clínico):**
```
"Voy a estar aquí.
En la mañana, cuando tu cuerpo despierte.
En la noche, cuando decidas qué comer.
Y cuando algo no cuadre, seré el primero en notarlo.

Y cuando yo no pueda,
hablas con tu nutriólogo clínico."
```

**Racional última línea:** doctrina Enrique 2026-07-10 — el médico de cabecera del user ATP es el nutriólogo clínico, no el médico general (medicina funcional). Ver [[project_doctrina_nutriologo_como_medico_cabecera]] en memoria persistente.

**Racional:**
- ✅ Respeta guidelines transparencia IA Apple/Google (menciona IA explícita)
- ✅ Mantiene impacto emocional de la Propuesta A original
- ✅ La 3ra línea "Impulsado por IA" fluye natural, no rompe ritmo
- ✅ "Asistente personal" (vs "humano") es honesto sin ser frío

**Otras pantallas de Meet ARGOS (1, 2, 4, 5):** sin cambios de la Propuesta A original. Solo pantalla 3 modificada.

### Bienvenida final (post-Meet ARGOS)

- [ ] Copy final: `______________________________________________`
  - Opciones sugeridas: "Empezamos, {nombre}." / "Aquí empieza, {nombre}." / "Vamos, {nombre}."

### Ajustes ARGOS_VOICE (7 franjas)

- [ ] Cambios en saludos mañana temprano: ___________
- [ ] Cambios en saludos mañana: ___________
- [ ] Cambios en saludos medio día: ___________
- [ ] Cambios en saludos tarde: ___________
- [ ] Cambios en saludos atardecer: ___________
- [ ] Cambios en saludos noche: ___________
- [ ] Cambios en saludos madrugada: ___________

### Reacciones ARGOS

- [ ] Encouragement ajustes: ___________
- [ ] Concern ajustes: ___________
- [ ] Celebration ajustes: ___________

### RateLimitCard

- [ ] Copy header ajuste: ___________
- [ ] Copy body ajuste: ___________
- [ ] Copy botones ajuste: ___________

### Errores ARGOS (4 situaciones)

- [ ] Red caída: ___________
- [ ] Datos insuficientes: ___________
- [ ] Pregunta médica: ___________
- [ ] Usuario frustrado: ___________

### Prompts check-in emocional (10 rotativos)

- [ ] Prompts a mantener: ___________
- [ ] Prompts a cambiar: ___________

### Catálogo suplementos (14 × 5 objetivos)

- [ ] Aprobado tal cual: ✅ / ❌
- [ ] Ajustes específicos por suplemento: ___________

### Contraindicaciones Breathwork

- [ ] Wim Hof Lite ajustes: ___________
- [ ] 4-7-8 ajustes: ___________

### Disclaimers médicos onboarding consent

- [ ] Aprobado tal cual: ✅ / ❌
- [ ] Ajustes: ___________

---

## 🔨 Deliverables (según decisiones Enrique+Mariana)

### T1 — Copy Meet ARGOS ajustado (15-30 min)

Editar `src/constants/argos-meet-copy.ts` con el copy final decidido en review.

**⚠️ CRÍTICO compliance:** si Mariana + Enrique decidieron cambiar "Soy tu asistente humano" por alternativa, aplicar el cambio EXACTO acordado. No improvisar.

### T2 — Copy ARGOS_VOICE ajustado (15-30 min)

Editar `src/services/argos-voice.ts` (o `src/constants/argos-voice-copy.ts` si Fable lo movió a constants).

Aplicar cambios en saludos, reacciones, errores según review.

### T3 — Copy RateLimitCard ajustado (10 min)

Editar el componente `RateLimitCard.tsx` con el copy final.

### T4 — Copy onboarding v2 ajustado (15-30 min)

Editar `src/constants/onboarding-copy.ts` (Fable lo movió a constants en Sprint ONBOARDING épico).

### T5 — Copy check-in prompts ajustado (10 min)

Editar el archivo de constants de prompts (probablemente `src/constants/checkin-prompts.ts` o similar).

### T6 — Catálogo suplementos ajustado (30-60 min)

Editar `src/constants/supplement-catalog.ts` con ajustes específicos que Mariana pidió.

Este es el más delicado clínicamente — asegurar cada nivel de evidencia [N1-N4] y precauciones queden como Mariana pidió.

### T7 — Contraindicaciones breathwork (10 min)

Editar `src/constants/breathwork-techniques.ts` con ajustes de contraindicaciones si Mariana pidió cambios.

### T8 — Disclaimers médicos onboarding (10 min)

Editar `app/onboarding/v2/consent.tsx` si Mariana pidió ajustes al copy legal.

### T9 — Fix bugs no críticos del testing device (30-60 min)

Enrique va a hacer testing device viernes AM. Si aparecen bugs no críticos (visuales menores, copy raro que se escapó, transiciones ligeras), lista aquí:

- [ ] Bug 1: ___________
- [ ] Bug 2: ___________
- [ ] Bug 3: ___________
- [ ] (max 3-4 hot fixes — si hay más, escalar decisión con Cowork)

---

## 🧪 Tests

Cada cambio de copy debe verificar que los tests que dependen de constants siguen pasando.

Baseline: 1138 tests. Target: mantener 1138+ (no regresiones).

---

## ⚠️ Reglas técnicas

1. **NO reescribir archivos completos** — str_replace quirúrgico
2. **Copy en constants** (Fable ya movió mucho ahí)
3. **npx tsc --noEmit → 0 errores** antes de push
4. **Commits chicos** — uno por bloque de cambios (T1-T9)
5. **Approval Enrique + Mariana** ya está capturado en este doc antes de ejecutar

---

## 🚫 Fuera de scope (NO hacer)

- ❌ Features nuevas de cualquier tipo
- ❌ Refactoring
- ❌ Migraciones nuevas
- ❌ Deploy edge functions
- ❌ Cambios nativos (romperían OTA)
- ❌ Cambios en argos-proxy (v16 estable)

---

## 📦 Deliverable final

Merge a main + push + OTA batch. Después de este sprint, la branch de ONBOARDING épico + POLISH final se mergean juntas.

Branch sugerido: `feat/polish-final-pre-beta`

---

## 🤝 Contexto colaborativo

- Este es el ÚLTIMO sprint pre-beta.
- Enrique corre testing device antes de este sprint
- Mariana revisa copy antes de este sprint
- Cowork monitorea post-merge
- Sábado 21:00 se envía link a testers

## 💛 Nota

Fable, este es el toque final. La app ha crecido enormemente en 4 días. Este sprint es el que asegura que **cada palabra** que ven los 5-9 testers está pensada.

— Cowork
