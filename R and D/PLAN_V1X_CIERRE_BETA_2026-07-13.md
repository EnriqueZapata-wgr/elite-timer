# 🗺️ Plan V1.X · cierre beta · v2

**Fecha:** 2026-07-13
**Predecesor:** `PLAN_V1X_CIERRE_BETA_2026-07-11.md` (obsoleto — muchos sprints ya shipped)
**Status:** Beta técnica v1 casi cerrada. Solo falta eas build + 3ra pasada test + activar flag.

---

## 📊 Estado global (verificado 2026-07-13 noche)

**Migraciones aplicadas al remoto:** 170-193 (+ 194/195/196 si Fable pushó B.2/B.3/B.6 esta noche)

**Sprints Fable shipped:**
- DX F1-F4 ✅ (motor + Card A + Card B + swap con flag)
- Comunidad C1, C2, C4, C5 ✅ (anti-leak + amigos + ranking + Skool bridge)
- Polish copy Mariana ✅ (reacciones + errores + disclaimers)
- Hotfix 1 (thinking Sonnet 5 + 4 bugs forense) ✅
- Sprint 1-4 (hardening + catálogo v3 verify + salud F5 + sups BHA + comunidad V1.1) ✅
- Sprint 5 Fitzpatrick ✅
- Hotfix 2da pasada (crash labs + DX PDF + historia clínica + fitzpatrick surfaced + routing HOY parcial) ✅

**Sprints Fable en curso esta noche (mientras Enrique duerme):**
- A.1 Micro-fix routing HOY completo (agua/sups/ayuno/pasos/sueño → hubs)
- B.1 Deuda expo-sharing lazy en result-preview.tsx
- B.2 Consolidar supplement_scan legacy (mig 194)
- B.3 Persistencia DX transaccional RPC (mig 195)
- B.4 ARGOS intervention_rationale (V1.1 Pro)

**Adelantos Cowork nocturnos (2026-07-13):**
- ✅ Sanity audit catálogo v3 · 86 intervenciones OK · fix menor separadores_dedos_pies roots
- ✅ Runbook launch day v2 con doctrina actual
- ✅ Checklist 3ra pasada test device
- ✅ Playbook activar INTERVENTIONS_DRIVE_HOY con rollback
- ✅ Este plan actualizado

**eas build:** en curso o pendiente (Enrique lo lanza cuando pueda decir YES al keystore)

---

## 🎯 5 fases hasta launch a testers

### FASE 1 · Terminar eas build (Enrique · 30 min)
- Corre `eas build --profile preview --platform android` → YES keystore
- Espera build en Expo dashboard (~15-30 min)
- APK listo para distribuir

### FASE 2 · Assets MJ + swap imageBn (Enrique + Fable · 30 min)
- Enrique termina de generar las 10 imágenes MJ (ver `PROMPTS_MJ_ASSETS_EDITORIALES_2026-07-13.md`)
- Comprimir con TinyPNG web
- Push assets a `assets/images/pillars/` y `assets/images/health-hub/`
- Fable hace swap de referencias imageBn en código (30 min post-push)

### FASE 3 · Merge de sprints nocturnos Fable (Cowork audit + Enrique merge)
- Cowork audita branches nuevos de Fable (A.1, B.1-B.4)
- Enrique mergea + db push + edge deploys si aplica + OTA

### FASE 4 · 3ra pasada test device (Enrique · 20-30 min)
- Instalar APK del eas build
- Seguir `CHECKLIST_3RA_PASADA_TEST_DEVICE_2026-07-13.md` tap a tap
- Si todo pasa → siguiente fase
- Si hay bugs → hotfix sprint con Fable

### FASE 5 · Activar flag + launch (Enrique · 1-2h)
- Seguir `08_PLAYBOOK_ACTIVAR_INTERVENTIONS_DRIVE_HOY.md`
- Seguir `07_RUNBOOK_LAUNCH_DAY_v2_2026-07-13.md`
- Enviar link a 5-9 testers vía WhatsApp uno a uno
- Monitorear primeras 24h activamente

---

## 🩺 Bloque paralelo · frente clínico Mariana

**Cuando Mariana tenga tiempo (ideal antes o durante beta con testers):**

1. **Universales P1 confirmación (task #5)** — validar los 7 aterrizados
2. **2da sesión curación catálogo (task #9)** — validar 19 ajustes v3 + agregar ciclo femenino, tiroides, postparto, salud masculina, piel funcional, immune post-infección
3. **Firmar clínicamente las 12 pending** (`CLINICAL_VALIDATION_PENDING` en catálogo) — quitar el flag `requiresClinicalValidation` una por una según su criterio

**Cuando Enrique tenga tiempo:**
- Task #8 · Protocolo Ayuno Sardinas (spec detallado)
- Task #43 · Reescritura Meet ARGOS con WOW
- Task #44 · 5 preguntas N-Back Challenge

---

## 🔮 Roadmap V1.1 post-beta (2-4 semanas)

**Iteración según feedback beta:**
- Bug fixes urgentes de testers
- UX pulido según lo que rechine
- Ajustes al catálogo de intervenciones según activación real
- Overhaul UX agenda condensable (task #35)
- Overhaul UX suplementos slow load

**Features V1.1:**
- ARGOS `intervention_rationale` (task #47, Fable ya en curso B.4)
- Push friend request notif (task #19 ya shipped ✅)
- Panel admin reports (task #18 ya shipped ✅)

---

## 🔮 Roadmap V1.5 (2-3 meses)

**Features grandes que requieren specs + insumos:**
- N-Back Challenge implementación (task #45, spec listo, 5 preguntas Enrique)
- Grabaciones audio custom binaurales + NSDR (task #46)
- ARGOS sintomas_pattern detection (task #48)
- ARGOS cross_parameter analysis (task #49, gated Mariana docs)
- Vigencia inteligente labs (task #50, gated Mariana docs)
- Comunidad V1.5 con retos + auth bridge Skool automático (task #52)
- BHA V2 crowd-sourced (task #53)
- Coach Proactivo módulo (task #54)
- Hub Comunidad real (task #57, Fable trabajando esta noche B.5)

---

## 🎯 Comercial (Enrique dijo "aún no toca")

Cuando Enrique dé luz verde al frente comercial (después de beta técnica cerrada):
- Landing somosatp.com con oferta Founders Pro ($4,990-9,990 escalera)
- Checkout Stripe/PayPal
- Comms de lanzamiento
- Contenido IA (4 líneas × 3 canales)
- Grupo Skool premium (URL final)
- Marketing paid si aplica

**Referencia:** `reference_founder_pro_breakeven` (memoria) + `Business development/00_CIMIENTO/*`

---

## ⚡ Cosas que Cowork monitorea sin que preguntes

- Doctrina no-negociable (cero fuga clínica, delfín roto, suplementos registro, nutriólogo cabecera, BPC corregido, recordatorios agenda, expo-print eas build)
- Que Fable no salte fases sin gate
- Que las palabras reservadas Postgres no aparezcan en RPCs nuevos
- Que backfills filtren profiles huérfanos
- Que la memoria doctrinal quede actualizada si algo cambia
- Que los aprendizajes se guarden (bug thinking, forense queries silent 400, etc.)

---

## 📋 Tasks vivas resumen (23 pending)

**Enrique (mañana o siguiente):** #40 merge fitzpatrick · #41 2da pasada test (ya se hará como 3ra) · #42 activar flag · #43 Meet ARGOS · #44 N-Back preguntas · #8 protocolo sardinas · eas build

**Con Mariana:** #5 universales · #9 2da sesión · #71 asset diagnóstico si genera

**Fable esta noche (Bloque B):** A.1 · B.1 · B.2 · B.3 · B.4 · B.5 · B.6

**Fable esperando insumos:** #45 N-Back (5 preguntas) · #47 intervention_rationale ya en curso · imageBn swap

**Track C pre-launch:** #59 Sentry sourcemaps · #60 SQL boost · #61 Runbook (ya hecho v2) · #62 Comms · #63 Skool URL

**Roadmap futuro (no bloqueante):** #46 audios · #48 patterns · #49 cross-param · #50 vigencia labs · #51 DX transaccional (Fable esta noche B.3) · #52 comunidad V1.5 · #53 BHA V2 · #54 coach proactivo · #55 pg_cron · #58 supplement_scan legacy (Fable esta noche B.2) · #64 tipos expo-router · #73 expo-sharing lazy · #75 audit catálogo hecho ✅ · #76-79 docs Cowork ✅

---

## 🌟 Milestone visible

**Beta técnica v1 · shippable ETA:** 2026-07-14 (mañana martes) si eas build + 3ra pasada test salen limpios.

Si algo se atora, cada retraso es 1-2 días. Sin drama, avanzar y pulir en beta con testers.

**Cortejo comercial post-beta técnica cerrada:** cuando Enrique lo diga.

---

*Este plan es la fuente de verdad del status hoy. Se actualiza cuando cambien las fases.*

— Cowork
