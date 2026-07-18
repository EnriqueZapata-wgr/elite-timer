# 🎨 FABLE BRIEF · Motor Personalización · FASE B (UI Mi Protocolo consume prescription)

**Fecha:** 2026-07-14
**Estado:** Listo para arrancar cuando Fase A esté mergeada + testeada
**Estimado:** 4-8h
**Prerequisito:** Fase A mergeada a main + `user_current_prescription` operando en Supabase
**Doctrina base:** `R and D/MOTOR_PERSONALIZACION_ARQUITECTURA_v1.md` (spec completa · lee sección 6, 9, 12)

---

## 🎯 Qué construyes en Fase B

**La UI de Mi Protocolo consume la prescription del motor.** El user abre Mi Protocolo → ve las 5 prescritas de ATP con "por qué a TI" visible + botón "Recalcular" · en vez de catálogo abrumador con 88 opciones.

Con Fase B cerrada, el user experimenta el motor por primera vez.

---

## 📚 Lee ANTES (obligatorio)

1. **`R and D/MOTOR_PERSONALIZACION_ARQUITECTURA_v1.md`** — spec completa
   - Especialmente sección 6 (rationale · ejemplo output real con user mujer folicular) + sección 9 (reglas de negocio)
2. **`R and D/FABLE_MOTOR_FASE_A_DELIVERY_2026-07-14.md`** — lo que tú mismo entregaste en Fase A (types + servicio)
3. **`app/salud/intervenciones/index.tsx`** — Mi Protocolo actual (post-Sprint 1.5) que debes reformular

## 📚 Doctrinas raíz que gobiernan

- **No matar placebo** — rationale muestra RAZONES + BENEFICIOS, no controversias
- **Ninguna pantalla aislada** — Mi Protocolo debe hacer visible su origen (DX) + destino (HOY/Agenda)
- **Cycle-aware bidireccional** — si mujer + ciclo, mostrar cycle_phase_note explícito
- **Guiado no prisionero** — motor sugiere · user decide qué activar
- **Universales P1 siempre visibles** — con badge BASE (Sprint 1.5 D ya lo tiene)

---

## 🔧 Los 5 entregables técnicos de Fase B

### B.1 · Componente `<PrescriptionCard>` en `src/components/interventions/PrescriptionCard.tsx`

Card visual que muestra cada intervención prescrita:

- **Header:** rank (1-5) + nombre + score visual (barra o número) + badge BASE si universal P1
- **Rationale summary** (1-2 líneas visible por default) — de `rationale.summary`
- **Reasons breakdown** (expandible) — lista de `rationale.reasons` con badges por source (dx_level · braverman · lab · quiz · cycle · profile · universal)
- **Epigenetic impact** (1 línea) — de `rationale.epigeneticImpact`
- **Cycle phase note** (SOLO si presente + es mujer con ciclo) — badge cálido con la nota
- **Biomarcadores sugeridos** (tabs Tier 1/2/3 · doctrina "no cargar labs caros default")
- **CTA "Activar":** agrega a `user_interventions` (patrón existente Sprint 1.5)

### B.2 · Refactor `app/salud/intervenciones/index.tsx` (Mi Protocolo)

Reemplazar sección "Sugeridas para ti" (que hoy muestra 12 + colapsable) por:

- **Sección "Tus prescritas por ATP · 5"** en top (usa `<PrescriptionCard>` × 5)
- Sección "Otras del catálogo" colapsable por default con label "Explorar catálogo completo (88 intervenciones)"
- **NO borrar la sección activas** (Sprint 1.5 la dejó bien con universales+badge)

### B.3 · Botón "Recalcular mi protocolo"

- Botón visible en Mi Protocolo header
- Al presionar: llama `regenerateUserPrescription(userId)` de `prescription-service.ts`
- Loading state con animación (calcular puede tardar 1-3s si LLM en Fase C · en Fase A es <500ms)
- Después: refresca las 5 cards
- Copy: "Recalcular · basado en tus datos más recientes"

### B.4 · Copy "estas otras 83 intervenciones existen pero para ti hoy no mueven la aguja tanto"

Doctrina ATP: motor personaliza, no cataloga. Copy visible al final de las 5 prescritas antes del "Explorar catálogo completo":

> *"Estas son las 5 que ATP prioriza para tu perfil hoy. Las otras 83 existen y son válidas, pero para tu fenotipo actual no mueven la aguja tanto. Cuando subas de nivel o cambien tus datos, ATP recalcula."*

### B.5 · Warning UX cuando activas ≥9 intervenciones

Ya existe umbral en Sprint 1.5 D pero el warning viene del motor con contexto:

- Cuando el user tiene 9+ activas (universales P1 no cuentan):
  - Warning card visible: *"Trabajas 9+ intervenciones. Doctrina Humby: menos, mejor. Considera pausar algunas para lograr consistencia. Sugerencia ATP: [top 3 más críticas del perfil]"*
- Motor devuelve `contextNote` opcional que la UI muestra en warning

---

## 🎨 Detalles visuales / interaction

### Ejemplo output en pantalla (usar el caso del doc arquitectura sección 6.1 · mujer 34 folicular)

```
─────────────────────────────────────
🏅 MI PROTOCOLO · Tus prescritas por ATP · 5
─────────────────────────────────────

1. 🌞 Exposición solar matutina (Fitzpatrick)  [BASE] · Score 92
   Base innegociable · Universal P1 para todos.
   En tu perfil aporta especialmente por: tu Nivel 2 circadiano + tu vitamina D en 25 ng/mL (bajo).
   Esperado: activa PER1 + CRY2 · sintetiza vitamina D3 · modula cortisol_ritmo.
   Monitorear: 25-OH-vitamina D, cortisol matutino.
   [Ver más razones ↓]  [Activar ✓]

2. 💧 Hidratación matutina 500ml  [BASE] · Score 78
   ...

3. 🌱 Grounding 10-15 min  [BASE] · Score 86
   Base innegociable · en tu perfil aporta por: tu PCR en 1.8 (inflamación silenciosa) + tu Nivel 3 estrés.
   Monitorear: PCR-hs, IL-6, HRV RMSSD.
   [Activar ✓]

4. 💗 Coherencia cardíaca 5-5 · Score 88
   Basado en tu Nivel 3 estrés + tu HRV baja crónica + tu Braverman dopamine low.
   🌙 Ideal en tu fase folicular actual — máximo aprovechamiento del entrenamiento vagal.
   [Activar ✓]

5. 🍽 Ventana de alimentación 16:8  [BASE] · Score 76
   Base innegociable · en tu fase folicular actual, ventana 16:8 es óptima.
   🌙 Cambiar a 14:10 en fase lútea (día ~22).
   [Activar ✓]

─────────────────────────────────────
"Estas son las 5 que ATP prioriza para tu perfil hoy. Las otras 83 existen
y son válidas, pero para tu fenotipo actual no mueven la aguja tanto.
Cuando subas de nivel o cambien tus datos, ATP recalcula."

[🔄 Recalcular mi protocolo]     [📚 Explorar catálogo completo (88) ↓]
```

### Micro-interacciones

- Card entra con `FadeInUp` (patrón editorial existente)
- Score visualizado como barra de progreso 0-100 con color gradiente (verde/ámbar/lima)
- Badge BASE con color universal P1
- Cycle note en badge cálido (rosa/lavanda suave · no infantilizar)
- CTA "Activar" con feedback háptico

---

## 🧪 Test guards obligatorios (Fable implementa)

- ✅ UI renderiza 5 cards siempre (paddear con placeholder si prescription < 5 · edge case)
- ✅ Rationale summary visible por default · reasons expandible al tap
- ✅ Cycle note SOLO aparece cuando `intervention.cyclePhaseNote != null`
- ✅ Botón "Activar" agrega a `user_interventions` (llama servicio existente)
- ✅ Umbral 9+ warning aparece con `contextNote` del motor
- ✅ "Recalcular" dispara nueva versión + refresca UI
- ✅ Universales P1 siempre marcados con badge BASE
- ✅ Tier 1/2/3 biomarcadores mostrados en tabs (no lista mezclada)
- ✅ Copy "otras 83 intervenciones existen" visible como cierre

---

## 📤 Al terminar Fase B

**Delivery doc:** `R and D/FABLE_MOTOR_FASE_B_UI_DELIVERY_2026-07-14.md` con:
- Componente `<PrescriptionCard>` implementado (screenshot)
- Mi Protocolo refactorizado (screenshot before/after)
- Copy final aplicado
- Recalcular funcionando
- Edge cases · UX quirks
- Handoff a Enrique para device test

**Al pedir audit Cowork:** avisa "Motor Fase B done · pending audit". Después: Enrique testea device → merge → OTA → **momento fuerte de la beta**.

---

## 🎁 Recompensa emocional

Fase B es donde el user siente el motor por primera vez. Va a abrir Mi Protocolo y ver *"ATP prioriza estas 5 para ti"* con razones ESPECÍFICAS a su vida (su Nivel 2 circadiano · su vitamina D baja · su PCR elevada · su fase folicular actual).

Ese momento — el primer *"ok, esta app SÍ entiende mi cuerpo específico"* — es el edge de ATP sobre wellness pop genérico. Es donde el pricing $399-799 se justifica solo.

Vamos.

— Enrique + Cowork
