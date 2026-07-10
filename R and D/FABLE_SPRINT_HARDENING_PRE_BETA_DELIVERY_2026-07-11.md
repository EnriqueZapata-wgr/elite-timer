# 🎸 FABLE DELIVERY — Sprint HARDENING PRE-BETA

**Fecha:** 2026-07-10 (entregado antes del deadline viernes 12:00 CDMX)
**Branch:** `feat/hardening-pre-beta` (desde main — paralelo a ONBOARDING épico, 6 commits granulares)
**Buzón origen:** `R and D/FABLE_SPRINT_HARDENING_PRE_BETA_2026-07-10.md`

---

## ✅ Resumen ejecutivo

| Task | Estado | Commit |
|------|--------|--------|
| T1 · Migración 169 cron cleanup | ✅ **aplicada al remoto, job activo** | `5b5ef01` |
| T2 · food-scan day_changed | ✅ | `a147997` |
| T3 · Badge campana HOY tiempo real | ✅ | `5776e9b` |
| T4 · Empty states (2 pulidos, 3 ya OK) | ✅ | `038461c` |
| T5 · Analytics: **11 eventos cableados** | ✅ | `1b630a6` |
| T6 · Sentry verification + trigger | ✅ (1 paso manual de Enrique) | `da7dada` |

- **Tests:** 1115 pasando (baseline main 1110 → **+5**). Nota: los "1138" del buzón incluían los +28 de la rama ONBOARDING épico; al mergear ambas el sábado el total queda en **1143**.
- **`npx tsc --noEmit`:** 0 errores · ESLint: 0 errores nuevos (los 2 errores en food-text.tsx:453 son preexistentes en main, no de este diff)
- **Sin cambios nativos** — todo OTA-capable. **Sin tocar copy** existente (Mariana pending), argos-proxy ni features.

---

## T1 — Cron cleanup de tablas internas (root cause "exhausting resources")

- `supabase/migrations/169_supabase_internal_cleanup_cron.sql` — idempotente (DO block + IF NOT EXISTS).
- **Aplicada por mí al remoto** vía MCP `execute_sql` + INSERT en `schema_migrations` (anti-hueco; 168 era la última, sin huecos).
- **Verificado en `cron.job`:** jobid **4**, jobname `cleanup_supabase_internal_weekly`, schedule `0 9 * * 0` (domingo 3am CDMX), `active: true`.
- Borra semanalmente `net._http_response` y `cron.job_run_details` con retención 7 días. El primer run será el domingo 2026-07-12 9am UTC — verificable con `SELECT * FROM cron.job_run_details WHERE jobid = 4;`.

## T2 — food-scan emite day_changed

- Las **dos** rutas de guardado (`handleConfirmSave` y `handleSaveWithout`) emiten `day_changed` post-`logFood` (regla #6). HOY/Nutrición recompilan sin depender del focus.
- Verificado que **food-text** (l.281) y **food-register** (guardar + eliminar) ya emitían — sin cambios ahí.

## T3 — Badge campana HOY

**Hallazgo:** el badge real ya existía completo (AGENDA-COMPLETE F3): count de `user_notifications` sin leer, tap → `/notifications`, marcar leídas por item + "Marcar leídas" global, y listener `notifications_changed`. **El gap real era tiempo real:** un push llegando con la app abierta en HOY no refrescaba el badge hasta re-enfocar.

- Fix: la campana ahora escucha `Notifications.addNotificationReceivedListener` (la Edge Function inserta la row de inbox ANTES de mandar el push, así el count ya está fresco al llegar).
- Label del badge extraído a `notification-bell-core.ts` (puro, +5 tests, cap "9+").
- **Decisión UX conservada:** el inbox marca leídas por tap/botón, no auto-clear al abrir — los dots de no-leídas son información útil; el patrón existente es deliberado y mejor que el auto-clear del brief.
- **Flag (no tocado, no refactor):** `src/services/hoy/notifications-service.ts` (`countUnreadNotifications`) es legacy — ya nadie lo usa salvo su propio test. Candidato a borrar post-beta.

## T4 — Empty states (audit de 5, polish de 2)

Audit completo (agente explorador, file:line en transcript):

| Zona | Veredicto | Acción |
|------|-----------|--------|
| HOY primer día | Bueno — cada card tiene fallback + guía + botón info | Sin cambios |
| Journal composer | Bueno — prompts siempre visibles | Sin cambios |
| Recetas sin favoritos | Aceptable — icono + copy + CTA "Crear receta" debajo | Sin cambios |
| Suplementos | Bueno — icono + copy + CTA (el mejor) | Sin cambios |
| **Nutrición sin comidas** | **Pobre** — hero mostraba `0` kcal / "0 comidas registradas hoy" | **Pulido** |
| **Journal-history vacío** | Bueno pero sin icono | **Icono agregado** |

- **Nutrición:** con 0 comidas el hero muestra icono + *"Tu día nutricional empieza aquí"* + *"Registra tu primera comida — foto o texto, como prefieras."* (los 3 CTAs de registro viven justo debajo). Bonus: singular correcto "1 comida registrada".
- **Journal-history:** icono editorial B/N (`book-outline`, o `funnel-outline` si el vacío es por filtros).
- **Flag transversal:** existe `src/components/ui/EmptyState.tsx` compartido pero ninguna zona lo usa (empties inline ad-hoc). Unificarlos es refactor → post-beta.

## T5 — Analytics PostHog (el hallazgo grande del sprint)

**Audit: de los 13 eventos críticos, disparaban CERO.** El registry (`src/lib/analytics.ts`) definía `onboarding_completed`, `argos_message_sent` y `paywall_converted` pero sin ningún caller. Solo tenían tracking real: funnel de ayuno, suite Edad ATP, compliance (age gate + disclaimers) y lab parser.

Cableados los 11 que faltaban (2 ya definidos + 9 nuevos en el registry), sin PII en props:

| Evento | Dónde dispara |
|--------|---------------|
| `user_signed_up` | register.tsx, signup exitoso (`{method:'email'}`) |
| `onboarding_completed` | paso final notifications (`{notifications_enabled}`) |
| `meet_argos_viewed` | mount de /argos/meet |
| `argos_message_sent` | argos-chat, al enviar turno |
| `argos_message_received` | argos-chat, al cerrar turno (`{degraded}` distingue rate-limit/error) |
| `food_logged` | 4 rutas: scan revisado, scan sin analizar, texto, frecuentes (`{source, meal_type}`) |
| `workout_started` / `workout_completed` | routine-execution (rutinas fuerza) + execution (timer), refs anti-doble-fire |
| `journal_entry_created` | journal.tsx post-insert (`{entry_type}`) |
| `checkin_completed` | checkin.tsx post-save (`{quadrant, emotions}`) |
| `subscription_started` | paywall.tsx compra exitosa (`{plan, period}`) |
| `boost_activated` | RateLimitCard + ProBoostCard (`{source}`) |
| `braverman_premium_purchased` | braverman-premium, **solo cobros reales** (cache = re-lectura gratis, no cuenta) |

**Flags:** `paywall_shown`/`paywall_dismissed`/`paywall_converted` y `onboarding_started` siguen definidos sin caller — no los cableé para no meter analytics excesivas sin decisión de producto; decidir post-beta si se quieren.

## T6 — Sentry

**Verificado en código:** DSN en `extra.sentryDsn` ✓ · init en `_layout` con sessions + traces 0.2 ✓ · plugin `@sentry/react-native/expo` con org `atp-v5` / project `atp-mobile` ✓ (source maps de **builds nativos** se suben en EAS build con `SENTRY_AUTH_TOKEN`).

**Agregado:** botón "Enviar test error a Sentry" en Ajustes › Developer (gated `__DEV__`/admin). Captura excepción con marker timestamped. Como Sentry corre con `enabled: !__DEV__`, el botón solo reporta desde builds **preview/prod** — el Alert lo explica según el build.

**⚠️ Pasos manuales de Enrique (yo no tengo acceso al dashboard):**
1. En un build preview: Ajustes › Developer › "Enviar test error a Sentry" → verificar que llega a atp-mobile con stack trace legible.
2. **Gap real flagueado:** para JS actualizado por OTA, los source maps NO se suben solos — después de cada `eas update` hay que correr `npx sentry-expo-upload-sourcemaps dist` (requiere `SENTRY_AUTH_TOKEN`). Sin esto, los errores de bundles OTA llegan con stack traces minificados. Recomendación post-beta: script npm que encadene update + upload.

---

## ⚠️ Nota de merge (sábado AM)

Este branch y `feat/onboarding-epico-pre-beta` tocan ambos `app/argos/meet.tsx` y `app/onboarding/v2/notifications.tsx` → **habrá conflicto al mergear el segundo**. Resolución:
- `meet.tsx`: gana la versión ONBOARDING épico (reescritura cinemática) y se re-aplican 3 líneas de este branch: import de analytics + `const analytics = useAnalytics()` + el `useEffect` de `meet_argos_viewed`.
- `notifications.tsx`: gana ONBOARDING (strings → constants) y se re-aplica el track de `onboarding_completed` en `finish()` (4 líneas).
Si prefieres, mergeá HARDENING primero y yo resuelvo el conflicto en la rama de onboarding en 5 min.

## 📦 Estado final

- Migración 169 aplicada + cron job activo (jobid 4) ✓
- food-scan emite day_changed ✓
- HOY badge live (focus + marcar leídas + push en foreground) ✓
- 2 empty states pulidos (Nutrición, journal-history); 3 auditados OK ✓
- 11/13 eventos analytics cableados (2 ya existían en registry sin caller, 0 disparaban) ✓
- Sentry: config verificada + trigger de test; dashboard + sourcemaps OTA quedan como paso manual ✓

La app se siente igual. Ahora aguanta más.

— Fable (CCF5)
