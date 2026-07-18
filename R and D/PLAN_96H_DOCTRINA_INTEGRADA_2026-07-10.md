# 🔥 Plan 96h · Doctrina Humby+Sups+Labs+Comunidad integrada

**Decisión ejecutiva Enrique:** 2026-07-10 noche.  
**Nueva fecha beta:** **lunes 2026-07-13 21:00 CDMX** (72h calendario).  
**Filosofía:** "LA APP que vale la pena ser usada". No apurar.

---

## 🎯 Qué se integra a V1 (que antes era V1.5)

### 1. Motor de PROTOCOLOS MVP · Doctrina Humby (Fable Sprint MOTOR)

**NO el rediseño completo** (eso es 3 semanas honestas). MVP para V1 que aterriza la doctrina:

- **UI "Tus 5 accionables de hoy"** en HOY — jerarquía clara, no las 20 cosas del día
- **Detección automática:** si el user tiene protocolo activo, extraer los 5 accionables más urgentes
- **Reconfiguración parcial de HOY:** solo los 5 activos aparecen como prioridad, el resto en "Ver más"
- **Progresión manual v1:** al completar 5 durante 15 días → sistema muestra "Listo para siguiente nivel" con CTA para desbloquear 3-5 nuevos
- **Base de 50 accionables canónicos** curados por Mariana + Enrique (deliverable paralelo)

**Estimado:** 10-12h Fable + ~4h curación accionables Mariana+Enrique

### 2. Guía de LABS descargable (Fable Sprint LABS)

- PDF descargable + versión in-app
- Léxico México (biometría hemática, química clínica, perfil tiroideo, hormonales, PhenoAge biomarkers)
- Paquetes comerciales comunes (Licy, Chopo, otros) que ya vienen bundled
- Trigger post-registro + post-primer intento de cálculo Edad ATP
- Racional Humby: menor fricción → menor churn

**Estimado:** 4-6h Fable

### 3. Suplementos DOSIS MÚLTIPLES + reporte descargable (Fable Sprint SUPS)

Complementa el sprint NUTRICIÓN existente:

- **Múltiples dosis por día por MISMO suplemento** (omega 3 AM+PM, creatina 5g AM + 10g PM)
- **Dosis flexibles** (glisina 2g default con opción de subir a 5-8g según noche)
- **Reporte descargable** de historia suplementación + clínica últimos 30/60 días
- **ARGOS usa historia** en contextos (bonus si cabe)

**Estimado:** 6-8h Fable

### 4. Comunidad PRIMER PASO (Fable Sprint COMUNIDAD + Cowork copy)

- **Ranking simple:** posición vs otros en electrones + por pilar
- **Presencia visible:** "500 personas activas hoy en Nutrición" (social proof)
- **Skool bridge teaser:** botón "Únete a la Tribu ATP" que abre Skool (auth link)
- **Copy diferenciador:** en Meet ARGOS agregar línea final antes de "Ingeniería humana":  
  > "Cuando yo no pueda, hablas con una persona."

**Estimado:** 4-6h Fable + 1h Cowork copy

### 5. Copy POLISH FINAL (Fable Sprint POLISH — el ya planeado)

- Aplicar decisiones Mariana viernes 10am
- Fix bugs no críticos testing device
- Estimado 1-2h Fable

---

## 🗓️ Timeline 96h

### 🌙 Viernes 2026-07-11 (madrugada+día)

**00:00-08:00** Fable ya trabajando en **Sprint LABS GUÍA** (buzón listo)  
**08:00-09:00** Enrique + Mariana review copy compacto + **curación 50 accionables** (2 tareas)  
**09:00-12:00** Enrique testing device de branches ya pusheadas + acumula bugs  
**10:00-14:00** Fable **Sprint SUPS DOSIS MÚLTIPLES**  
**13:00-15:00** Enrique llena decisiones POLISH FINAL + Cowork actualiza frameworks  
**14:00-18:00** Fable **Sprint MOTOR PROTOCOLOS MVP** (parte 1)  
**18:00-20:00** Cena/descanso  

### 🌙 Sábado 2026-07-12 (overnight+día)

**00:00-08:00** Fable **Sprint MOTOR PROTOCOLOS MVP** (parte 2) + resolución de conflictos merge  
**08:00-12:00** Enrique testing device intensivo (todos los sprints mergeados)  
**12:00-16:00** Fable **Sprint COMUNIDAD PRIMER PASO**  
**16:00-20:00** Cowork copy final + Fable **Sprint POLISH FINAL** en paralelo  
**20:00-24:00** Cross-check final + merge todo + OTA batch

### 🌙 Domingo 2026-07-13 (buffer + prep)

**08:00-12:00** Testing device final Enrique con OTA unificado  
**12:00-16:00** Hot fixes si aparecen + upload source maps Sentry  
**16:00-20:00** SQL boost testers + prep WhatsApp templates personalizados + verificación monitoring  
**20:00-24:00** Descanso final antes de beta  

### 🚀 Lunes 2026-07-13

**08:00-16:00** Buffer / hot fixes si algo raro  
**16:00-19:00** Prep final envío + revisar Sentry/PostHog dashboards  
**19:00-20:00** Verificación última de link + boost testers  
**20:00-21:00** Setup monitoring pestañas  
**21:00-23:00** **🚀 ENVÍO WhatsApp escalonado a los 5-9 testers**  

---

## 📋 Frameworks a actualizar

- ✅ V1 Feature Map (agregar labs guía, sups múltiples, motor protocolos MVP, comunidad primer paso)
- ✅ Brief Comercial (integrar diferenciador Humby + comunidad como positioning)
- ✅ Runbook Sábado Launch Day → renombrar a Lunes
- ✅ Sprint POLISH FINAL buzón (agregar polish de nuevos sprints)

## 📝 Tasks nuevas a crear

- Sprint MOTOR PROTOCOLOS MVP
- Sprint LABS GUÍA descargable
- Sprint SUPS dosis múltiples
- Sprint COMUNIDAD primer paso
- Template curación 50 accionables (Mariana+Enrique)

---

## 🎯 Riesgos y mitigaciones

**Riesgo 1:** Fable satura a 30h+ en 72h  
**Mitigación:** priorizar por impacto — si topa cansancio, el LABS + SUPS + POLISH salen. MOTOR y COMUNIDAD pueden diferir a v1.1

**Riesgo 2:** Mariana no puede curar 50 accionables en 4h  
**Mitigación:** MVP con 20-25 accionables cubriendo los 5 objetivos principales (energía, sueño, digestión, dolor, ansiedad). El resto v1.1.

**Riesgo 3:** Merge conflicts entre 4 branches  
**Mitigación:** Fable merge secuencial + Cowork audit intermedio. Ya vimos en HARDENING+ONBOARDING que Fable resuelve conflicts en 5 min.

**Riesgo 4:** Testing device revela bugs críticos que consumen tiempo  
**Mitigación:** Sábado noche buffer de 4h. Domingo día completo de reserva.

---

## 💛 Nota estratégica

Este plan asume que el motor protocolos MVP + comunidad primer paso hacen la diferencia entre "app que funciona" y "APP que vale la pena". Ambos son riesgo — pero son EL diferenciador que Humby validó.

Si al domingo tarde vemos que uno de esos dos no cuaja bien, se posterga sin culpa. Los otros 3 (labs + sups + polish) son sí o sí.

— Cowork
