# Plan Maestro — Lanzamiento ATP a Stores en 3 semanas

**Fecha inicio:** 2026-07-01
**Fecha target submit:** 2026-07-22
**Owner:** Enrique
**Ejecución:** Fable 5 CC + Cowork (yo)

---

## Filosofía

Nada fuera. Todo priorizado. Categorías estrictas:

- **🔴 BLOQUEANTE** — sin esto NO se submite
- **🟡 CRÍTICO** — sin esto el producto no cumple su promesa
- **🟢 IMPORTANTE** — mejora significativamente, cabe en scope
- **⚪ POST-LANZAMIENTO** — V1.4 o V2, capturado pero fuera de scope

---

## Semana 1 (2026-07-01 → 2026-07-07): Cerrar core técnico

### 🔴 BLOQUEANTES

**S1.1 · Merge + OTA Sprint I** (Enrique, 10 min)
- Confirma que bugs pre-Sprint I desaparecen
- Estado: en curso

**S1.2 · Task 2 · Deploy push notifications** (Fable, EN CURSO)
- Edge Function deployed
- Migración 099 pg_cron aplicada
- Test end-to-end
- Estado: reportando

**S1.3 · Mega-Sprint AGENDA-COMPLETE** (Fable, ~4h)
- F1 Sync HOY↔Agenda bidireccional
- F2 Permisos push onboarding + fallback
- F3 Notif inbox (tabla + campana + /notifications)
- F4 Templates enriched ALL protocolos
- F5 Auditoría bugs residuales
- Buzón: `R and D/FABLE_MEGA_SPRINT_AGENDA_COMPLETE.md`
- Estado: listo para arrancar tras Task 2

### 🟡 CRÍTICOS Semana 1

**S1.4 · Onboarding polish** (Fable, ~3h después de AGENDA-COMPLETE)
- Investigación flujo actual `app/onboarding/*`
- Fix bugs visibles
- Consistency editorial premium
- Voice-config screen validation
- Task #43 (age gate) integrado aquí

---

## Semana 2 (2026-07-08 → 2026-07-14): Pagos + compliance

### 🔴 BLOQUEANTES

**S2.1 · RevenueCat + IAP real** (Fable + Enrique, ~5 días)
- Setup RevenueCat en App Store Connect + Google Play Console (Enrique)
- SDK integrado en Expo (Fable)
- Productos configurados: ATP base $9.99/mes + ATP Pro $19.99/mes (precios TBD Enrique)
- Paywall + purchase flow (Fable)
- Restore purchases (Fable)
- Feature gating free vs pro (Fable)
- Task #40

**S2.2 · Age gate onboarding** (Fable, 1 día)
- Fecha nacimiento o "mayor de 18?" en `app/onboarding-basics`
- Rechazo <13 (COPPA)
- Country restrictions (config JSON con países bloqueados)
- Task #41

**S2.3 · Medical disclaimers firma Mariana + cablear** (Enrique + Fable, ~3 días)
- Enrique: confirma copy legal con Mariana
- Fable: cablear MedicalDisclaimer.tsx en pantallas críticas (labs, ARGOS, protocolos, edad ATP, health-input)
- Modal "aceptar términos" en primer signup + persist consent
- Task #42

**S2.4 · Web reset password en somosatp.com** (Enrique + Fable, ~2 días)
- Página en rama comercial (Enrique coordina con web team)
- Deep link fallback en app
- Task #43

### 🟡 CRÍTICOS Semana 2

**S2.5 · Smoke testing exhaustivo** (Enrique + Fable, en paralelo)
- Signup completo con user nuevo
- Onboarding hasta HOY con protocolo activo
- Purchase flow test (sandbox)
- Push notification recibida
- ARGOS chat funciona
- Labs upload + parse
- Edad ATP calculada

---

## Semana 3 (2026-07-15 → 2026-07-22): Assets + submit

### 🔴 BLOQUEANTES

**S3.1 · App Store Assets** (Enrique + Fable, ~2 días)
- Screenshots 6.5" y 6.7" iPhone (Enrique produce, Fable puede ayudar mockups)
- Feature graphic Play Store 1024x500
- Metadata: description, keywords, categoría, subtitle, promo text (Fable escribe copy, Enrique edita)
- Preview video opcional
- Task #44

**S3.2 · Privacy Policy + Terms públicos** (Enrique)
- En somosatp.com/privacy y /terms
- Links en app en signup + settings

**S3.3 · Build final + submission** (Enrique)
- `eas build --platform ios --profile production`
- `eas build --platform android --profile production`
- TestFlight interno + Google Play Internal Testing
- Beta testers finales (Tribu ATP + coaches)
- Submit review Apple + Google

### 🟢 IMPORTANTES Semana 3 (si sobra tiempo)

**S3.4 · Sentry alerts críticas** (Cowork setup, 1 hora)
- Alerta email si error > 10 users/día
- Alerta Slack (si canal) para crashes

**S3.5 · PostHog funnels** (Cowork setup, 1 hora)
- Funnel signup → onboarding complete → primer día completo
- Retention D1, D7, D30

---

## POST-LANZAMIENTO (V1.4+) — capturado, NO en scope

Estos quedan tracked pero explícitamente fuera de las 3 semanas:

| # | Feature | Task | Razón fuera de scope |
|---|---|---|---|
| — | HOY campana notificaciones badge real | #3 | ✅ SÍ entra — F3 del mega-sprint AGENDA-COMPLETE cubre |
| — | Tab icons gradient | #10 | Requiere build nativo, meter en próximo bump versión |
| — | Top banner extender HOY+ARGOS | #23 | Nice-to-have visual, no bloquea |
| — | Cleanup helpers muertos | #26 | Deuda técnica, no visible al usuario |
| — | Test fototipo Fitzpatrick | #30 | Nice-to-have feature, no bloquea UV |
| — | Journal screen dedicada | #39 | Datos se registran, historial en V1.4 |
| — | Wearables dashboard | #45 | Datos leídos en cards HOY, dashboard V1.4 |
| — | Challenges UI | #46 | Backend listo, gamification social V1.4 |
| — | Referral program UI | #47 | Growth loop V1.4 |
| — | Coach view founders | #48 | Feature separado V1.4+ (memoria project_coach_proactivo) |
| — | Meditación módulo full | #49 | Biblioteca + audio V1.4 |
| — | Sprint J CICLO partner | #37 | Feature grande V1.4 (memoria project_agenda_como_asistente para ATP Pro relación) |
| — | ARGOS controla agenda auto | ATP Pro | V2.0 tier premium (memoria project_agenda_como_asistente) |
| — | Google Calendar sync | ATP Pro | V2.0 tier premium |
| — | Rediseño ARGOS pantalla | — | V1.4 UI polish |

---

## Comunicación con equipo

- **Enrique** valida cada delivery en device antes de OK final
- **Cowork** aplica migraciones vía MCP + escribe buzones + mantiene dashboard
- **Fable** ejecuta mega-sprints + puede deployar Edge Functions + puede aplicar migraciones rango 150-199
- **Cadencia diaria**: 1 mega-sprint por día promedio (Fable puede overnight si scope lo permite)

---

## Métricas de éxito por semana

**Fin Semana 1:**
- AGENDA cerrada al 100% funcional (sync + inbox + templates + push)
- Onboarding polish comitteado
- Todo lo pre-comerciales listo

**Fin Semana 2:**
- IAP funcional (sandbox test OK)
- Age gate + disclaimers + web reset live
- Smoke completo pasa

**Fin Semana 3:**
- Build production compilando
- Assets stores listos
- Submitted Apple + Google

---

**Actualización:** Cowork mantiene el dashboard artifact `atp-project-dashboard` fresco al cierre de cada mega-sprint.
