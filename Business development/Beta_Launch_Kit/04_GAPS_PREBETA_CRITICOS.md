# 🚨 Gaps críticos pre-beta — 2026-07-09

**Análisis Cowork basado en task backlog + código actual + feedback Enrique.**  
**Deadline beta:** sábado 2026-07-11 noche (48h restantes).

---

## 🎯 Filosofía del análisis

**Los testers son sofisticados + potenciales afiliados.** Verán la app con ojo profesional. Un módulo "obviamente incompleto" bajo su comparación con otras apps top NO es bug — es RIESGO REPUTACIONAL.

Hay 3 tipos de gaps:

- 🔴 **BLOQUEANTES BETA** — deben resolverse antes del sábado o esconder features
- 🟡 **VISIBLES pero tolerables** — testers verán "está en progreso", pero no rompe la impresión
- 🟢 **BACKLOG POST-BETA** — no priorizar ahora

---

## 🔴 BLOQUEANTES BETA (48h para resolver)

### 1. MAGIA ARGOS 2.0 debe entregarse completo
Sprint Fable en curso (T1-T5). Sin esto:
- Avatar sigue sutil → nadie nota la presencia
- No hay streaming → speaking state se pierde
- Rate limit UX pobre → afiliados frustrados en primer día

**Owner:** Fable (sprint activo hasta viernes AM)  
**Riesgo:** MEDIO (sprint bien diseñado, Fable históricamente cierra)

### 2. Meet ARGOS debe funcionar para users existentes
Feedback Enrique + análisis Cowork: users backfilleados NO ven Meet ARGOS con reset del flag.  
**Fix:** T3 de MAGIA ARGOS 2.0 (buzón + hint entregados a Fable).  
**Owner:** Fable  
**Riesgo:** BAJO (fix chico, hint claro)

### 3. Sistema de bloqueo tier debe manejar rate limit con gracia
"Lo siento no pude procesar" mata la primera impresión. Testers sin boost pueden topar límite si son muy activos.

**Mitigación temporal:** dar Boost Pro gratis 48h+ a todos los testers al mandar el link (SQL rápido).  
**Fix real:** T5 de MAGIA ARGOS 2.0 (rate limit card + botón boost).  
**Owner:** Cowork (setup testers) + Fable (T5)

### 4. Foto perfil rota ("Network request failed")
Enrique reportó anoche que estaba fixed (#138 completed). Pero **hay que reverificar en device antes de beta**. Foto de perfil rota = 30 seg de mala impresión a cada tester (todos suben foto en signup).

**Owner:** Enrique (testing device — sábado AM antes de mandar)  
**Riesgo:** MEDIO (asumimos fixed pero sin verificación reciente)

---

## 🟡 VISIBLES pero tolerables (comunicar como "en desarrollo")

### 5. Módulo MENTE se ve incompleto (#74/#75 pending)
- Meditación módulo full (#49 pending) — sin audio biblioteca
- Breathwork (#73 pending) — sin progresiones ni CO2/O2
- Journal (#39 pending) — vive pero sin historial dedicado

**Framing con testers:** "Mente es el próximo módulo grande — v1.5. Explora el Journal actual y check-in emocional; el resto viene."

### 6. Módulo FITNESS Customer Journey pending (#70/#71)
No hay audit ni rediseño. Testers de perfil fitness lo notarán "raro" comparado con Whoop / Freeletics.

**Framing:** "Fitness es funcional pero rediseño post-beta. Feedback específico bienvenido."

### 7. Nutrición SIMPLE vs COMPLETO pendiente (#52)
Actualmente hay solo un modo. Testers avanzados quieren datos densos, testers casuales quieren simple. Un solo modo satisface a nadie.

**Framing:** "Nutrición v2 en camino: modo simple + completo. En beta ves el prototipo."

### 8. Suplementos refactor (#54) + Recetas sistema (#56)
Ambos pendientes. Se ven "genéricos" comparados con foodily / cronometer.

**Framing:** "Ambos evolucionan en v1.5 — expediente personal con dosis flexibles y marketplace de recetas".

### 9. CICLO módulo audit (#84)
Mujeres testers lo notarán. La memoria dice que hay máscara "ATP Embarazo" (#85) que aún no está masterizada.

**Framing:** para testers mujeres, mencionar "el módulo CICLO tiene modo pareja, embarazo y menopausia — cuéntanos cuál usas y qué le falta"

### 10. HERO Header campana notificaciones (#3 pending)
Contador de notifs no funciona bien. Menor pero visible.

**Framing:** "Campana en polish."

---

## 🟢 BACKLOG POST-BETA (NO priorizar ahora)

- #45 Wearables dashboard — dif V2
- #46 Challenges UI — V1.4
- #51 GENÉTICA — V2 completo
- #62 GlobalTopBar rollout — M2 técnico
- #63 Nav profunda — polish técnico
- #64 Performance — post-beta
- #65 Coach engine wire completo — V1.5 con Coach Proactivo
- #80 CGM Freestyle — V1.5
- #92 ARGOS memoria persistente — post-beta
- #98 Multimodal — post-beta
- #104-130 Backend clínico HUB Fx — V1.5

---

## 📋 Recomendaciones concretas para las 48h

### Viernes AM (post-Fable sprint):
- [ ] Auditar branch `feat/argos-magia-2-dramatismo`
- [ ] Cowork: audit adversarial (correr tsc + vitest en sandbox limpio)
- [ ] Merge + push main
- [ ] OTA batch

### Viernes tarde:
- [ ] Enrique testing device del OTA
- [ ] Sprint POLISH ARGOS (Fable) — bugs encontrados
- [ ] Cowork: setup boost H+ 72h para todos los users que van a ser testers (SQL grant)

### Sábado AM:
- [ ] Enrique fresh install + full journey testing
- [ ] Copy review con Mariana (ARGOS_VOICE + Meet ARGOS + Rate Limit card)
- [ ] Backup migration table completo (safety)

### Sábado tarde:
- [ ] Fix cualquier crítico last-minute
- [ ] Preparar link de instalación (Expo dev build o TestFlight/APK build)
- [ ] Confirmar que push notifs funcionan en fresh device

### Sábado noche:
- [ ] Enviar mensaje WhatsApp a los 5-9 testers con link
- [ ] Cowork monitoreando logs (Sentry, PostHog, argos_logs) en tiempo real

---

## 🎯 Decisión framework para "es aceptable o no"

Para cada gap, la pregunta es:

> **"Si un tester lo ve tal como está, ¿pierdo credibilidad?"**

- Si respuesta = SÍ → arreglar antes del sábado
- Si respuesta = "sí pero puedo enmarcarlo como en progreso" → 🟡 tolerable con framing
- Si respuesta = NO → 🟢 posponer

Los items 🔴 arriba fallan la pregunta. Los 🟡 se salvan con buen framing.

---

## 🧠 Nota estratégica

Los 5-9 testers verán la MAGIA ARGOS antes que TUS módulos incompletos.  
Si ARGOS los captura desde el minuto 0, tolerarán mucho más gap en otros módulos.  
Si ARGOS NO los captura, cada gap va a doler el doble.

**Por eso el Sprint MAGIA ARGOS 2.0 es la apuesta correcta.** Está bien diseñado.  
No agreguemos más scope. Confiemos en Fable + polish sábado.

— Cowork
