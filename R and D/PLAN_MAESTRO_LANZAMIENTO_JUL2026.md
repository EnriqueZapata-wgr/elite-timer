# PLAN MAESTRO ATP — LANZAMIENTO V1.3 A STORES (JUL-AGO 2026)

**Fecha:** 2026-07-01  
**Objetivo:** submit a Apple App Store + Google Play Store en 4-5 semanas (mid-agosto 2026)  
**Contexto:** entrevista completa por 9 pilares + META con Enrique, visión de v1.3 → v2.0 clara

---

## 🎯 VISIÓN ESTRATÉGICA

**Producto:** ATP es el **sistema operativo de rendimiento humano** — integra fitness, nutrición, mente, salud funcional, ciclo menstrual y gamificación con IA personalizada (ARGOS) bajo modelo de medicina funcional.

**Positioning:**
- Headline: *"Si olvidaras tu edad, ¿cuántos años tendrías?"*
- Tagline: *"Tu sistema operativo de rendimiento"*
- ARGOS = **Jarvis en el bolsillo** (no email)
- AGENDA = **asistente de vida saludable** (no tracker)

**Modelo económico:**
- **ATP Base:** $399 MXN/mes (anchor $899) — utilidad neta $150-180/user
- **ATP Pro:** $799-999 MXN/mes — objetivo utilidad $400/user (ARGOS proactivo)
- **Clínicos Fx:** $1,499-2,499 MXN/mes (a ajustar según cálculo consultas grabadas)
- **Referidos:** $100 MXN/mes comisión al referente + protones extra al referido
- **Trial:** 14 días completo ATP Pro
- **Break-even clínico:** 15 pacientes activos ($100 c/u)

---

## 📊 TIER DE PRIORIDADES

### 🔴 V1.3 BLOQUEANTE LANZAMIENTO (4-5 semanas)
Tasks que NO pueden faltar para submit stores.

### 🟡 V1.4 CRÍTICO POST-LANZAMIENTO (semanas 6-10)
Features que hacen la diferencia pero no bloquean submit.

### 🟢 V1.5+ SPRINT MAYOR (meses 3-6)
Backend clínico completo, ARGOS overhaul, HUB Fx consulta.

### 🔵 V2.0 VISIÓN (mes 6+)
Comunidad clínicos, i18n inglés, más wearables, nuevos módulos.

---

## 🗓️ CRONOGRAMA 4-5 SEMANAS

### SEMANA 1 (jul 1-7) — Cerrar backend + auditar Fable
- ✅ Fable cerró Mega-Sprint AGENDA-COMPLETE (task #32)
- 🔍 **Cowork audita branch `feat/agenda-complete-launch`** (task #115)
- 🔀 Enrique mergea + OTA + smoke test en device
- ⚠️ Setup `git worktree` para paralelismo Cowork↔Fable (task #116)
- 📊 Fase 1 Business Dashboard: MRR + Users + Signups básico (task #117 fase 1)

### SEMANA 2 (jul 8-14) — Compliance + monetización
- 💰 Setup RevenueCat + IAP real (task #40, blocked por #103 ARGOS Pro costs)
- 🧮 Calcular costo ARGOS PRO real → precio final Pro (task #103)
- ⚖️ Age gate onboarding (task #41)
- ✍️ Medical disclaimers firma Mariana + cablear (task #42)
- 🔒 Privacy + compliance completo GDPR/LFPDPP (task #114)
- 📄 Política reembolsos + cancelaciones (task #102)

### SEMANA 3 (jul 15-21) — Onboarding v2 + META
- 🎨 Onboarding v2 completo (task #110) — 7 pantallas + tour
- ⚙️ Settings > Modalidad Ciclo (task #111)
- 🔗 Deep links infrastructure (task #120)
- 🎛️ Notificaciones config granular (task #61)
- 📱 Widgets nativos hero: próximo evento + agua + suplementos (task #60 fase 1)
- 🌍 i18n infra Fase 1 (task #118 fase 1)

### SEMANA 4 (jul 22-28) — Bugs críticos + apps store
- 🐛 Braverman CRÍTICO: flicker + botón atrás + editorial (task #89)
- 🐛 ARGOS Chat UX fixes (task #93)
- 🩺 Historia Clínica output claro (task #77 audit)
- 🧪 Labs pulido (task #78)
- 🎨 App Store Assets: screenshots + copy + iconos (task #44)
- 🌐 Web reset password somosatp.com (task #43)
- 📱 Wearables base: Apple Health + Google Fit (task #112 fase 1)

### SEMANA 5 (jul 29 - ago 5) — Submit + smoke
- 🛒 Shop de Protones rediseño editorial (task #101)
- 🏆 Sistema de rangos v2 (task #100)
- 📊 Fase 1 Business Dashboard final
- 🧪 Beta testing con Tribu ATP (feedback intensivo)
- 🚀 **Submit App Store + Play Store** (esperar 3-7 días approval)
- 📣 Preparación lanzamiento marketing (paralelo — Enrique + web)

### BUFFER (ago 6-12) — Post-submit hardening
- Fixes de review Apple/Google
- OTAs urgentes si detectan bugs
- Preparar comunicación lanzamiento

---

## 📦 SPRINTS POST-LANZAMIENTO (V1.4)

### Semana 6-7:
- 🎙️ Siri Shortcuts + Google Assistant "Pregúntale a ARGOS" (task #113) — hero marketing feature
- 📱 Widgets completos (task #60 fase 2)
- 💬 Modo offline (task #119)
- 🎯 Challenges UI (task #46)
- 👥 Referral program UI (task #47)

### Semana 8-10:
- 🍎 Nutrición SIMPLE vs COMPLETO (task #52)
- 🧘 Meditación módulo full (task #49)
- 🌬️ Breathwork completo (task #73)
- 🧠 MENTE audit + rediseño (tasks #74, #75)
- 💪 FITNESS audit + rediseño (tasks #70, #71)
- 📊 Score nutricional funcional (task #72)
- 🎂 Edad ATP → recomendaciones output (task #79)

---

## 🏥 V1.5 BACKEND CLÍNICO (meses 3-4)

Sprint estrella — modelo B2B2C, Mariana como cofundadora modelo.

- 🎤 **Recibir + procesar audio Mariana** (task #109) — bloquea diseño final
- 🧮 Modelado costos consultas grabadas (task #108)
- 👨‍⚕️ Onboarding clínico + verificación cédula/RFC (task #106)
- 📋 Panel clínico dashboard (task #105) — filtros ricos + Calendly/GCal
- 🎙️ **HUB Fx Consulta** (task #104) — killer feature grabación + multi-output ARGOS
- 💬 Chat interno clínico↔paciente (task #107) — evaluar costos DB
- 🩺 Prescripciones médicas workflow (task #59)
- 📊 Coach view Mariana mentora (task #48)

---

## 🚀 V1.6+ ARGOS OVERHAUL

- 🤖 **ARGOS Personalidad + Presencia — Jarvis en el bolsillo** (task #94)
- 🧠 ARGOS memoria persistente (task #92)
- 📱 ARGOS contextual por pantalla (task #95)
- 🎨 ARGOS Recipes integración cross-módulo (task #96)
- 💪 ARGOS Routines modo coach exigente (task #97)
- 📷 ARGOS Multimodal voz + vision (task #98)
- ⚡ Coach engine wire completo (task #65)

---

## 🌏 V2.0 EXPANSIÓN (mes 6+)

- 🌍 i18n inglés Fase 2 (task #118 fase 2) — mercado USA hispano
- 🧬 Módulo GENÉTICA (task #51) + Research Circle DNA/ADNTro (task #82)
- 👨‍⚕️ Comunidad clínicos en WEB (fuera app scope)
- 🍽️ Recetas sistema completo + marketplace (task #56)
- 💊 Refactor SUPLEMENTOS biblioteca personal (task #54)
- 🏔️ Retiros Superhumano integración (task #57)
- 👥 Tribu ATP / Skool integration (task #58)

---

## 💎 PILARES CAPTURADOS EN LA ENTREVISTA

### 1. HOY
- Estado actual: rediseño editorial COMPLETO ✓
- V1.3: hero recomendación dinámica (task #68), sonidos edad ATP (task #69)

### 2. FITNESS
- Diagnóstico: muchas features "torpes y desconectadas"
- V1.4: **Customer Journey + CX audit + Rediseño** (tasks #70, #71)

### 3. NUTRICIÓN
- Estado: mejor que fitness, pero necesita 2 modos
- V1.4: SIMPLE vs COMPLETO (task #52), Score nutricional funcional (task #72)

### 4. MENTE
- Diagnóstico: preview, faltan funciones robustas
- V1.4: Meditación (task #49), Breathwork (task #73), Journal (task #39)
- V1.4: **CX audit + Rediseño ecosistema mente** (tasks #74, #75)

### 5. SALUD (tests + labs + edad ATP + historia clínica)
- V1.3: Historia Clínica output claro (task #77), Labs pulido (task #78)
- V1.3: Braverman crítico (task #89), Braverman reporte PREMIUM (task #90)
- V1.4: Edad ATP → recomendaciones (task #79), Tests cinéticos polish (task #91)
- V1.5: Freestyle Libre CGM (task #80), TESTS módulo especializado (task #81)
- V2: **Módulo GENÉTICA** (task #51)

### 6. CICLO
- V1.3: **Modalidad global** (task #111) + **ATP EMBARAZO máscara global app** (task #85)
- V1.4: Ciclo audit + rediseño (task #84), CICLO cross-módulo (task #86)
- V1.5: Fertilidad tracking (task #87), Menopausia máscara (task #88)
- V1.5: CICLO partner (compañero hombre) (task #37)

### 7. TESTS
- V1.3: Braverman + Reaction Time bugs críticos
- V1.4: Tests polish visual + input manual editorial
- V1.4: **Doctrina SIMPLE vence inteligente** (memoria [[feedback_simple_vence_inteligente]])

### 8. ARGOS
- Backend sólido (Sonnet 4.6 + Gemini + prompt caching) ✓
- V1.3: Chat UX fixes básicos (task #93)
- V1.5+: OVERHAUL personalidad + presencia = Jarvis (task #94)
- V1.6: Memoria persistente (task #92), Contextual pantalla (task #95), Multimodal (task #98)

### 9. ECONOMÍA
- Pricing confirmado ($399/$899 anchor, ATP Pro por calcular) ✓
- V1.3: RevenueCat setup con precios finales, wallet referidos + clínicos
- V1.4: Rangos v2 (Inmortal, Longevo, Brian Johnson easter eggs) (task #100)
- V1.4: Shop editorial (task #101), Referral program UI (task #47)
- V1.4: Challenges UI premios electrones (task #46)
- V1.5: Wallet clínicos + comisiones payout mensual

### 10. COACH (backend clínico Mariana)
- V1.5 SPRINT ESTRELLA — todo B2B2C
- HUB Fx consulta grabación + multi-output = **killer feature**
- Comunidad clínicos en WEB (V2)

### META (onboarding + settings + notifs)
- V1.3: Onboarding v2 (task #110), Notifs granulares (task #61), Modalidad Ciclo (task #111)
- V1.3: Deep links (task #120), Privacy compliance (task #114)
- V1.3: Wearables base Apple Health + Google Fit (task #112 fase 1)
- V1.3: **Business Dashboard fase 1** (task #117 — Enrique llamó "ORO")
- V1.4: Widgets completos (task #60), Siri + Google Assistant (task #113)
- V1.4: i18n fase 1 infra (task #118)
- V1.4: Modo offline (task #119)
- V1.5: Business Dashboard fase 2+3
- V2: i18n inglés

---

## ⚠️ RIESGOS + MITIGACIONES

### Riesgo 1: Timeline agresivo (4-5 semanas)
**Mitigación:** paralelizar Cowork + Fable 5 con `git worktree` (task #116). Priorizar bloqueantes.

### Riesgo 2: ARGOS Pro pricing incierto
**Mitigación:** Task #103 modelado antes de semana 2. Precio final Pro impacta todo revenue model.

### Riesgo 3: Braverman flicker BLOQUEANTE
**Mitigación:** Priority 1 en semana 4. No submit sin este fix (task #89).

### Riesgo 4: Rejection App Store por medical claims
**Mitigación:** Medical disclaimers Mariana firmados (task #42) + política reembolsos (task #102) + copy revisado para no hacer claims prohibidos.

### Riesgo 5: Audio Mariana pendiente
**Mitigación:** V1.5 backend clínico no arranca sin audio. Enrique gestiona con ella.

### Riesgo 6: Supabase Disk IO warning (task #83)
**Mitigación:** Monitor + upgrade tier si necesario antes de lanzamiento.

---

## 🎨 DOCTRINAS UX NO NEGOCIABLES

Memorias capturadas — cross-módulo:

1. **Guiado no prisionero, apoyo no grillete** (memoria [[feedback_guiado_no_prisionero]])
2. **SIMPLE vence inteligente** (memoria [[feedback_simple_vence_inteligente]])
3. **Customer Journey + CX audit ANTES de rediseñar** (memoria [[feedback_customer_journey_antes_de_redisenar]])
4. **Editorial premium B/N** (no cheap gamer / no casino / no callejón trasero de antro)
5. **ARGOS como Jarvis** (no email) (memoria [[project_argos_como_jarvis]])
6. **AGENDA como asistente de vida saludable** (no tracker) (memoria [[project_agenda_como_asistente]])
7. **Chat privado ARGOS↔user es INVIOLABLE** — clínico NUNCA lo ve, encriptado si viable
8. **Labs de mujeres cíclicas SIEMPRE contextualizados por fase** (memoria [[project_labs_con_contexto_ciclo]])
9. **ATP Embarazo = máscara GLOBAL de la app** (memoria [[project_atp_embarazo_modulo]])
10. **Peloteo con Enrique, no soluciones cerradas** (memoria [[feedback_peloteo_enrique]])
11. **Enrique es AUTOR del algoritmo Edad ATP** (memoria [[feedback_enrique_es_el_autor]])
12. **Mariana valida/firma pero NO diseña** — no bloquear sprints esperándola

---

## 📈 MÉTRICAS DE ÉXITO POST-LANZAMIENTO

**Meta 30 días:**
- 500 signups (Tribu ATP core + orgánico)
- 100 conversiones trial → paid
- 20 clínicos aplicando (v1.5 pipeline)
- Rating 4.5+ App Store / Play Store
- <1% crash rate
- MRR meta mes 1: ~$40K MXN

**Meta 90 días:**
- 2,000 users activos
- 500 paying users
- MRR $200K MXN
- 10 clínicos onboarded pagando
- 50 referidos activos generando comisiones

**Meta 6 meses:**
- 5,000 users
- 1,500 paying (300 Pro, 1,200 Base)
- MRR $500K+ MXN
- 50 clínicos activos
- V1.5 backend clínico completo

---

## 🎬 PRÓXIMOS PASOS INMEDIATOS

**Cowork (esta semana):**
1. Auditar branch `feat/agenda-complete-launch` (task #115)
2. Configurar Business Dashboard fase 1 (task #117)
3. Cerrar ARGOS costs modeling (task #103)
4. Setup RevenueCat entitlements (task #40)

**Enrique (esta semana):**
1. Setup `git worktree` PowerShell (task #116)
2. Merge branch Fable + OTA + smoke device
3. Gestionar audio Mariana para v1.5 (task #109)
4. Confirmar precio final ATP Pro post-cálculo (bloqueado por task #103)
5. Review pricing con Mariana (paquetes anuales, precio Pro final)

**Fable 5 CC (paralelo):**
1. Recibir onboarding + cuestionario (task #38) — ya arrancó AGENDA-COMPLETE
2. Próximo sprint: **Onboarding v2 completo** (task #110)
3. En paralelo: Braverman critical fixes (task #89)

---

## 🏁 CIERRE

Se recorrieron los 10 pilares. Se capturaron 21+ tasks nuevas (100-120). Se ancló 4+ memorias críticas nuevas (hub_fx_consulta, pricing_atp_v13, ARGOS_jarvis, labs_ciclo, backend_clinico_mariana, agenda_asistente, guiado_no_prisionero, customer_journey, simple_vence, ATP_embarazo). Se estableció paralelismo Cowork↔Fable con git worktree.

**Estado producto:** v1.2.x con 89 pantallas, 68K líneas, 430+ commits, 0 errores TS, backend argos-proxy sólido (Sonnet 4.6 + Gemini), Sentry + PostHog activos, agenda con push notifications v3, TU DÍA fixeado, editorial rediseño completo.

**Norte:** submit stores mid-agosto 2026. Después backend clínico v1.5, ARGOS overhaul v1.6, expansión v2.0.

**Filosofía:** *"Si olvidaras tu edad, ¿cuántos años tendrías?"*
