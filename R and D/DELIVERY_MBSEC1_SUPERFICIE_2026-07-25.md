# 🔐 DELIVERY · MB-SEC-1 — Superficie de datos

**Rama:** `feat/mbsec1-superficie` (desde `main`). **NO mergeada. Versión intacta. NO se corrió `db push`. Cowork audita ANTES de que nada toque el remoto.**
**Migraciones nuevas (idempotentes, numeradas tras 226):** `227` revoke anon · `228` search_path · `229` avatars · `230` RLS documentado. **§2 no necesitó migración** (auditoría: ya está blindado). §6 es código (edge + app).
**Verificación:** `npx tsc --noEmit` → **0** · `vitest run` → **2126/2126 verdes** (incluye 8 tests estáticos nuevos que blindan la superficie) · `eslint` de los tocados → **0 errores nuevos** (2 errores pre-existentes en `food-text.tsx:455`, ajenos a mi diff).

---

## 🧭 REGLA DE ORO aplicada: call sites ANTES de tocar
Antes de cada REVOKE grepé el código (`app`, `src`, `supabase/functions`). Nada se revocó a ciegas. El mecanismo del hallazgo: **Supabase concede EXECUTE a `anon` de forma EXPLÍCITA** (default privileges), así que los viejos `REVOKE ... FROM PUBLIC` (191, 178) nunca quitaron ese grant → el advisor las seguía marcando. El corte correcto y quirúrgico es `REVOKE ... FROM anon` (sin tocar `authenticated`/`service_role`).

### Tabla: función → decisión → razón + call sites
| Función(es) | Decisión | Razón + call site |
|---|---|---|
| `admin_list_reports`, `admin_resolve_report`, `admin_set_discoverable` | **REVOCADA anon** (227) | Ya validan rol adentro (`admin_users`) y `search_path` fijo (191); solo faltaba el revoke de anon explícito. Call site: `app/admin/reports.tsx` (autenticado). |
| `promote_argos_brain`, `publish_argos_brain` | **REVOCADA anon** (227) **+ FLAG** | Sin call site en la app (ops de ARGOS-BRAIN, se corren con service_role). `p_admin_key` es secreto-en-parámetro; endurecer con `is_admin()` adentro requiere su cuerpo (repo ARGOS-BRAIN). `authenticated` **NO** tocado (riesgo de romper el tooling). |
| `get_dx_memory`, `save_dx_memory`, `elite_intake_guardar` | **REVOCADA anon** (227) **+ FLAG** | Clínicas → jamás anon. Sin call site en la app. `authenticated` conservado (caller no confirmado, probable tooling elite_dx). |
| `invite_client_by_email` | **REVOCADA anon** (227) | `src/services/coach-service.ts` (coach autenticado). También en §3 (228). |
| `search_users` | **REVOCADA anon** (227) | Comunidad autenticada (`friends-service`, `public-profile-service`); 178/184 revocaban PUBLIC pero no el anon explícito. |
| `get_public_profile` | **REVOCADA anon** (227) **+ watch** | `app/comunidad/perfil/[userId].tsx` (autenticado). "public" = subset no-clínico, NO acceso anónimo (la app exige login para comunidad). Riesgo bajo. |
| `spend_protons`, `convert_electrons_to_protons`, `join_challenge`, `activate_pro_boost` | **CONSERVADA** (blindadas en 207) | Validan `p_user_id` contra `auth.uid()` + anon revocado (207). |
| `claim_nback_protons`, `nback_percentiles` | **CONSERVADA** (blindadas en 218) | **No reciben `p_user_id`** — derivan de `auth.uid()`; anon revocado (218). |
| Las 25 con search_path mutable | **MODIFICADA** → `SET search_path = public` (228) | Sin cambio de lógica; deuda vieja (220-226 ya lo traen). |
| Policy `avatars_public_read` | **DROP** (229) | Bucket público sirve por URL directa (no pasa por RLS). App **no lista** el bucket (cero `.list()`, cero referencias a `avatars_public` en cliente). |
| 7 tablas RLS-sin-policies | **DOCUMENTADA** (230) | `COMMENT` "solo service_role, intencional". No se abren policies. |

---

## §2 · Auditoría de las 6 RPC de economía — **¿alguna confiaba en el parámetro? NO.**
Resultado one-by-one (con test estático que lo blinda, `mbsec1-superficie.test.ts`):

| RPC | ¿Recibe p_user_id? | ¿Cómo deriva el usuario? | Estado |
|---|---|---|---|
| `spend_protons` | Sí | **Valida** `p_user_id <> auth.uid() → forbidden` | anon revocado en 207 ✅ |
| `convert_electrons_to_protons` | Sí | **Valida** contra `auth.uid()` | 207 ✅ |
| `join_challenge` | Sí | **Valida** contra `auth.uid()` | 207 ✅ |
| `activate_pro_boost` | Sí | **Valida** contra `auth.uid()` | 207 ✅ |
| `claim_nback_protons` | **No** (solo `p_date`) | `v_user := auth.uid()` | anon revocado en 218 ✅ |
| `nback_percentiles` | **No** (sin args) | `v_user := auth.uid()` | anon revocado en 218 ✅ |

**Conclusión:** ninguna confía en el parámetro. 4 lo validan contra `auth.uid()`, 2 no lo reciben. El único hoyo histórico (con la anon key `auth.uid()` era NULL y el guard de self-use no aplicaba) ya lo cerró **207**. **No hizo falta migración nueva para §2.** (El doc decía "las 6 reciben p_user_id" — impreciso: claim/percentiles no lo reciben; son las más seguras.)

---

## §6 · Mensajes de error sin fugas (código)
**Edge (Response body al cliente → genérico; el detalle YA se loguea internamente):**
- `account-deletion-processor` — `error.message` → genérico + `console.error` interno.
- `anthropic-proxy` — el `logArgosCall` ya captura `error.message`; la respuesta pasa a genérica.
- `argos-proxy` — igual (el `logArgosCall` conserva el detalle; refundEconomy intacto).

**App (Alert con `err.message` crudo de Postgres/RPC → copy genérico + `console.warn` interno):**
`food-scan.tsx` (×2), `food-text.tsx`, `health-input.tsx`, `settings/conexiones.tsx` (×2, verifiqué que `connectToCoach`/`generateCoachCode` hacen `throw new Error(error.message)` → reenviaban el error crudo).

Los `error_message:` que van a **tablas de log / Sentry** se conservan (son internos, no fuga).

---

## 🚩 FLAGS — lo que dejé pendiente por riesgo (no se toca a ciegas)
1. **`promote_argos_brain` / `publish_argos_brain`:** solo revoqué anon. Endurecer con `is_admin()` ADENTRO y revocar `authenticated` exige (a) su cuerpo, que vive en el repo **ARGOS-BRAIN**, no aquí, y (b) confirmar que el tooling entra como `service_role` (si entra como admin autenticado, revocar authenticated lo rompe). **Cowork/Enrique confirma el caller y se cierra en follow-up.**
2. **`get_dx_memory` / `save_dx_memory` / `elite_intake_guardar`:** anon revocado; `authenticated` conservado porque no pude confirmar el caller (probable tooling elite_dx). Evaluar restringir a `service_role`.
3. **La lista COMPLETA (45 anon / 48 auth / 25 search_path) vive en el advisor de la DB live, no en el repo.** Cubrí todas las **nombradas** por el brief + `SEGURIDAD_LINEAMIENTOS_GOB_ATP.md`. Para barrer el resto EXACTO hace falta el export del advisor (o una query a `pg_proc`/`pg_policies` que Cowork/Enrique corre). Los bloques `DO` son **name-based** (agnósticos de firma, cubren overloads, saltan las inexistentes) — precisamente porque varias funciones no están en el repo y no puedo ver su firma.
4. **§6 no es exhaustivo:** cerré los leaks user-facing claros. Un barrido de TODO `catch` es más amplio (el doc lo ubica en **MB-SEC-2**).
5. **Fuera de alcance de migración (dashboard Supabase):** HaveIBeenPwned (doc #5) y rate limits de Auth — son switches, no SQL. Mencionados para MB-SEC-1 operativo.
6. **NO corrí `db push`** (por diseño). Las migraciones tienen sintaxis revisada a mano pero **no ejecutada** (sin DB local); el `db push` de Cowork/Enrique confirma. Todas idempotentes.

---

## Archivos
**Migraciones:** `227_sec_revoke_anon_rpc.sql` · `228_sec_search_path.sql` · `229_sec_avatars_drop_list.sql` · `230_sec_rls_documented.sql`
**Edge:** `account-deletion-processor` · `anthropic-proxy` · `argos-proxy`
**App:** `food-scan.tsx` · `food-text.tsx` · `health-input.tsx` · `settings/conexiones.tsx`
**Test:** `src/services/__tests__/mbsec1-superficie.test.ts` (+8)
```
tsc: 0 · vitest: 2126/2126 · eslint tocados: 0 errores nuevos · sin merge · sin bump · SIN db push
```
