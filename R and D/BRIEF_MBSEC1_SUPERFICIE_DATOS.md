# 🔐 BRIEF · MB-SEC-1 — Superficie de datos (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mbsec1-superficie` desde `main`. NO merge, tsc + tests verdes, **NO tocar la versión**, **NO correr `db push`**. Cowork audita ANTES de que nada toque el remoto.
**Origen:** requisitos de seguridad para uso gubernamental + auditoría Cowork con el security advisor de Supabase (2026-07-25). Contexto completo en `R and D/SEGURIDAD_LINEAMIENTOS_GOB_ATP.md`.
**Resultado del advisor:** 127 hallazgos · 0 ERROR · 120 WARN · 7 INFO. Nada crítico, pero es superficie que un pentest marca.

## ⚠️ REGLA DE ORO DE ESTE BATCH
**No revoques a ciegas.** Cada `REVOKE` puede romper la app si esa función sí se llama sin sesión. **Antes de tocar cada función: busca sus call sites en el código.** Si hay duda, **la dejas y la flageas** — es preferible un hallazgo pendiente que una app rota. Documenta el razonamiento de cada decisión en el delivery.

---

## 1 · RPC `SECURITY DEFINER` expuestas a `anon` (45) — lo más grave
Cualquiera **sin iniciar sesión** puede invocarlas vía `/rest/v1/rpc/*`.

**1.1 · Las de administración — prioridad máxima:**
`admin_list_reports` · `admin_resolve_report` · `admin_set_discoverable` · `promote_argos_brain` · `publish_argos_brain`
- **`REVOKE EXECUTE ... FROM anon`** (y de `authenticated` donde no aplique).
- **`promote_argos_brain` / `publish_argos_brain` reciben `p_admin_key text`:** eso es *un secreto viajando como parámetro*, no control de acceso. **Default:** validar rol de admin DENTRO de la función (`is_admin(auth.uid())` o equivalente) además de, o en lugar de, la llave.
- Las `admin_*` deben verificar rol adentro, nunca confiar en que solo un admin las llame.

**1.2 · El resto de las 45:** analiza call sites y decide. Sospechosas de necesitar `anon` de verdad: nada obvio — incluso el flujo de registro suele ir por Auth, no por RPC. Las de datos clínicos (`get_dx_memory`, `save_dx_memory`, `elite_intake_guardar`) **no deben ser anónimas jamás**.
**Ojo:** funciones de trigger (p. ej. `handle_new_user`) no necesitan GRANT a roles — verifica antes de tocarlas.

## 2 · Las 6 RPC de economía que reciben `p_user_id` — riesgo de operar sobre otro usuario
`activate_pro_boost` · `claim_nback_protons` · `convert_electrons_to_protons` · `spend_protons` · `join_challenge` · `nback_percentiles`
**Auditar una por una:** ¿derivan el usuario de `auth.uid()` o confían en el parámetro? Si alguna confía en el parámetro, **un usuario autenticado podría mover el saldo de otro** — eso es P0.
**Default:** derivar SIEMPRE de `auth.uid()`; si el parámetro se conserva por compatibilidad, validar que coincida y rechazar si no. **Test que lo cubra.**

## 3 · `search_path` mutable en 25 funciones
Combinado con `SECURITY DEFINER` habilita *search_path hijacking* con privilegios del owner.
Lista: `generate_coach_code`, `get_today_routines`, `increment_argos_usage`, `create_routine_share`, `clone_from_share`, `connect_to_coach`, `assign_routine_to_client`, `touch_affiliate_updated_at`, `affiliate_status_change_wallet_bootstrap`, `generate_affiliate_code`, `get_today_timeline`, `toggle_protocol_completion`, `touch_user_notification_prefs_updated_at`, `invite_client_by_email`, `has_active_pro_boost`, `update_updated_at`, `get_current_user_role`, `is_admin`, `get_routine_tree`, `calc_block_duration`, `calc_routine_duration`, `clone_routine`, `calc_estimated_1rm`, `update_personal_record`, `touch_user_consent_updated_at`.
**Default:** `SET search_path = public` en las 25, sin cambiar su lógica. *(Las migraciones 220-226 ya lo traen; esto es deuda vieja.)*

## 4 · Bucket `avatars_public` permite listar todos los archivos
Policy `avatars_public_read` con SELECT amplio sobre `storage.objects`. Un bucket público **no necesita eso** para servir URLs de objeto.
**Default:** retirar la policy de listado conservando el acceso por URL directa. **Verifica antes** que la app no dependa de listar ese bucket.

## 5 · 7 tablas con RLS activo y CERO policies
`elite_dx.clients` · `elite_dx.intake` · `elite_dx.braverman_results` · `public.argos_brain` · `argos_config` · `argos_dx_memory` · `push_failure_log`
Hoy **deniegan todo** salvo `service_role` — seguro por defecto, pero un auditor lo pregunta.
**Default:** si el acceso es solo de servicio, **documentarlo con un comentario en la migración**; si algún cliente debe leer, policy explícita. No las dejes ambiguas.

## 6 · Mensajes de error sin fugas
Barrido de Edge Functions y app: ningún mensaje al usuario debe revelar rutas, nombres de tabla, versiones o stack traces. El detalle va a Sentry; a pantalla va un mensaje genérico y útil.
**Default:** revisar los `catch` que hacen `alert(error.message)` o equivalente y sustituir por copy genérico (manteniendo el log interno).

---

## Protocolo
`feat/mbsec1-superficie` desde `main`. **Todo en migraciones idempotentes** (`REVOKE`/`GRANT`/`CREATE OR REPLACE` con guardas), numeradas después de 226. **NO `db push`** — Cowork audita y luego se aplica. `npx tsc --noEmit` (0) + tests verdes. NO merge, NO tocar versión.
**Delivery con:** tabla `función → decisión (revocada / conservada / modificada) → razón + call sites encontrados`, el resultado de la auditoría de las 6 RPC de economía (¿alguna confiaba en el parámetro?), y flags de lo que dejaste pendiente por riesgo de romper algo.
