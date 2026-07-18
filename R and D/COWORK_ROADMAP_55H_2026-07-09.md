# 🗺️ Roadmap 55h — Cowork planning pre-beta

**Timestamp:** 2026-07-09 16:00 CDMX (jueves tarde)  
**Deadline:** 2026-07-11 23:00 CDMX (sábado noche — beta a testers prime)  
**Tiempo restante:** ~55h

---

## 🎯 Filosofía del roadmap

Enrique dijo "vamos con A (MENTE) y enseguida todos los demás". Los demás son B/C/D.

**Realidad de capacity:**
- Fable en flow puede ~10-12h en overnight + ~4-6h en día con descansos
- Total Fable = ~20-25h efectivas
- Cowork puede correr paralelo pero requiere Enrique disponible para decisiones

**Traducción:** 2 sprints Fable grandes + 1-2 sprints medianos son realistas.

---

## 📅 Cronograma propuesto

### 🌙 Jueves 21:00 → Viernes 09:00 (12h overnight #1)
**Fable:** Sprint A · MENTE Ecosystem (ejecutando ahora)  
**Cowork:** Audit magia 2.0 · beta launch kit · copy propuestas

### ☀️ Viernes 09:00 → 13:00 (4h AM)
**Enrique:** despertar + testing device del OTA (si merges antes)  
**Cowork:** priorizar bug fixes que surjan del testing  
**Fable:** descanso post-overnight

### ☕ Viernes 13:00 → 20:00 (7h tarde)
**Fable:** Sprint B · elegir uno:
- **B1 · Nutrición SIMPLE vs COMPLETO** (mayor impacto para wellness testers)
- **B2 · Onboarding épico cinemático** (primeros 90 seg)
- **B3 · Fitness quick wins**

### 🌙 Viernes 20:00 → Sábado 06:00 (10h overnight #2)
**Fable:** cierre Sprint B + polish cross-app  
**Cowork:** audit adversarial + preparar merge final

### ☀️ Sábado 06:00 → 14:00 (8h AM/tarde)
**Enrique:** despertar + testing final device  
**Cowork:** SQL boost testers + copy review Mariana

### 🚀 Sábado 14:00 → 21:00 (7h prep)
**Enrique + Cowork:** merge final, OTA, verificación, comms

### 📱 Sábado 21:00 → 23:00 (2h send)
**Enrique:** enviar WhatsApp a los 5-9 testers  
**Cowork:** monitor Sentry/PostHog/argos_logs en tiempo real

---

## 🎯 Decisión pendiente: ¿Qué sprint B?

Después de que Fable termine MENTE (viernes AM), hay una ventana de 7h (viernes tarde) para otro sprint. Aquí las opciones:

### 🅱️1 · Nutrición SIMPLE vs COMPLETO (~7h)
**Scope:** modo simple default (score + proteína) + modo completo opt-in.
**Impacto:** ALTO para testers wellness (nutriólogas).
**Riesgo:** MEDIO (requiere UI decisions con Enrique).
**Mi voto:** ⭐ SÍ

### 🅱️2 · Onboarding épico cinemático (~5-6h)
**Scope:** polish primeros 90 seg + copy final Meet ARGOS + splash épico.
**Impacto:** ALTO en primera impresión.
**Riesgo:** BAJO (scope contenido).
**Mi voto:** ⭐ SÍ si testers empiezan fresh install (probablemente)

### 🅱️3 · Fitness quick wins (~7h)
**Scope:** rediseño visual quick wins sin CJ audit completo.
**Impacto:** MEDIO (testers fit lo notarán pero no crítico).
**Riesgo:** ALTO (Fitness Customer Journey #70 sin audit → cambios podrían no dar en el clavo).
**Mi voto:** ⏸️ POSPONER post-beta

### 🅱️4 · Módulo CICLO simplificado (~7h)
**Scope:** simplificar calendario + acompañante emocional.
**Impacto:** ALTO para testers mujeres, MEDIO general.
**Riesgo:** MEDIO (Mariana tendría que revisar copy sensibilidad).
**Mi voto:** ⏸️ POSPONER (Mariana ocupada con MENTE + Meet ARGOS copy)

---

## 🗣️ Mi recomendación fuerte para Sprint B

**Ejecutar B1 (Nutrición SIMPLE/COMPLETO) + fragmentos de B2 (copy Meet ARGOS + splash mejorado).**

Combo total: ~7-8h. Cubre:
- Impacto para nutriólogas testers (que son varias en el perfil)
- Copy final Meet ARGOS pulido con Mariana (crítico para primera impresión)
- Splash mejor (2h de trabajo)

Fitness y Ciclo pasan a v1.5.

---

## 📋 Sprints B/C/D drafts (rápidos)

### Sprint B1 · Nutrición SIMPLE/COMPLETO — 5-6h

**T1:** feature flag `nutrition_mode` en profile (default `simple`)  
**T2:** modo SIMPLE = card en HOY con score nutricional + proteína del día (2 números)  
**T3:** modo COMPLETO = actual (todos los detalles)  
**T4:** toggle en Settings > Nutrición para cambiar modo  
**T5:** Micro-onboarding cuando activan COMPLETO ("¿seguro? más data, más ruido")

**Impacto:** testers casuales tienen simple, avanzados tienen completo. Nadie forzado.

### Sprint B2 · Onboarding épico (fragmento) — 2-3h

**T1:** copy Meet ARGOS final (usar propuesta A del `06_COPY_PROPUESTAS_MARIANA_REVIEW.md`)  
**T2:** splash + primer boot con transiciones cinemáticas  
**T3:** pulir 2-3 pantallas del onboarding v2 que se veían "flat"

### Sprint C · POLISH cross-app (~4-6h post-testing)

**Scope:** bugs que aparezcan del testing Enrique + copy final ARGOS_VOICE + cleanup visual quick wins.

Se define POST-testing Enrique el viernes AM. No prefaseable hasta ver el estado.

### Sprint D · Cross-check pre-envío (~2h sábado tarde)

**Scope:** verificar cada tester puede instalar + login + Meet ARGOS + chat ARGOS + shop + notifs. Runbook de acceptance.

---

## ⚠️ Riesgos

1. **Fable se satura:** 25h efectivas es MUCHO. Si golpea burnout viernes noche, tenemos que soltar Sprint C.
2. **Enrique disponibilidad:** el sprint A entrega feedback viernes AM. Si testing revela bugs críticos, se rehacen decisiones.
3. **Bugs de merge:** magia 2.0 + MENTE + Sprint B → 3 branches consecutivos. Riesgo de conflict merge.

**Mitigación:** Cowork audita cada branch antes de merge + Enrique testing en fresh clones si tiene dudas.

---

## 🎯 Decisión requerida

**Enrique — cuando confirmes lectura, dime:**
- ✅ "Sprint B = B1 (Nutrición) + fragmento B2 (Meet ARGOS copy)"
- 🅱 "Sprint B = otro"
- ⏸️ "Solo A, esperamos testing antes de decidir B"

Con eso, el pipeline queda claro para Fable cuando termine MENTE.
