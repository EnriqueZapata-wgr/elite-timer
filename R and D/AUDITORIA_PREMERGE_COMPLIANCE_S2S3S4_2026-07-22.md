# 🔍 AUDITORÍA PRE-MERGE · Compliance Sprints 2 / 3 / 4

**Fecha:** 2026-07-22 · **Auditor:** Cowork (solo lectura) · **Repo:** EliteTimer
**Ramas encadenadas:** `main` → `fix/compliance-sprint-2` (51f0dbd) → `fix/compliance-sprint-3` (92fe9e2) → `fix/compliance-sprint-4` (745a2ce)
**Método:** diff por rama contra su base + lectura de código + cotejo verbatim contra fuentes de verdad (Aviso Parte 3, SIGNOFF §2, HANDOFF, POSICIONAMIENTO).

---

## VEREDICTO POR RAMA

| Rama | Veredicto | Bloqueadores |
|---|---|---|
| **S2 · Consentimiento** | ✅ **APTO** | Ninguno |
| **S3 · Gates de protocolos** | ✅ **APTO** | Ninguno |
| **S4 · Renames + posicionamiento** | ✅ **APTO** | Ninguno |

**Las 3 ramas pasan.** Cero bloqueadores. Solo observaciones menores (abajo), ninguna frena el merge.

---

## SPRINT 2 — Consentimiento ✅ APTO

- **Gate 18 duro:** `age-gate.ts` MIN_AGE=18, `<18 → 'blocked'`; tier `parental` eliminado (residuos solo en comentarios que documentan la eliminación — grep limpio en `app/`+`src/`, sin lógica ni columnas parental, sin flujo de email de tutor). DOB obligatoria en `profile.tsx`; al fallar el gate → `AgeGateModal` de bloqueo + `signOut()` → login. **Sin ruta de bypass**: la cuenta solo persiste tras pasar el gate; el registro no captura edad, la persiste el perfil.
- **7 checkboxes:** ninguno pre-marcado (`useState(false)` / `checked={}` vacío). CB-1 bloquea la **creación de cuenta** (`validate()` en `register.tsx`). CB-2/3/4 bloquean el **onboarding** (botón deshabilitado + guard en `handleContinue`). CB-5 opcional; CB-6 (voz, `argos-chat.tsx`) y CB-7 (ciclo, `cycle.tsx`) contextuales. **Texto EXACTO** de los 7 = verbatim contra Aviso Parte 3 (cotejado carácter a carácter).
- **Log (mig 209 · `user_consent_log`):** append-only real (solo policies INSERT/SELECT del propio user; **sin UPDATE/DELETE**). Guarda user_id, checkbox_id, action, aviso_version, terms_version, texto_hash, accepted_at (device), ip, user_agent, created_at (server). **texto_hash = SHA-256** correcto (impl. FIPS 180-4 pura, verificada en test) del texto exacto aceptado. **IP server-side**: trigger `BEFORE INSERT SECURITY DEFINER` lee `request.headers` (x-forwarded-for + user-agent); el cliente **no** envía IP (no está en el insert). RLS por `auth.uid()=user_id`. Idempotente.
- **Placeholder [RAZÓN SOCIAL]:** `legal-texts.ts` es el único punto de inyección (3 placeholders); nombre "Enrique" aparece solo en comentarios de código, nada publicado con nombre personal.
- **ARCO:** export/deletion ya cableados (cron mig 156); "Rectificar" nuevo → editor de perfil; revocación loguea `action='revoked'` con `REVOKE_CORE_WARNING` para CB-2/CB-3.

## SPRINT 3 — Gates de protocolos ✅ APTO

- **Atestación (Wim Hof/frío/sauna/apnea):** `attestation-copy.ts` = **verbatim SIGNOFF §2.1–2.6** (heading, checks, footers). `AttestationGateModal`: COMENZAR deshabilitado hasta palomear **TODO** (`allChecked`), loguea antes de `onProceed`; **resetea casillas en cada apertura** (corre CADA VEZ).
- **Límites enforced en código:** `capBreathingTemplate` → máx **3 rondas** y retención **≤90s** (no solo texto).
- **Ruta PULL en las 3 superficies:** gate cableado en `breathing.tsx` (timer bloqueado hasta `clearedId===selected.id`; re-atesta al salir), `salud/intervenciones/[key].tsx` (`onActivate`) y `protocol-explorer.tsx` (`handleActivate`, matcher por keywords). **Hueco PUSH cerrado**: el motor `personalize-interventions.ts` excluye `PULL_ONLY_INTERVENTION_KEYS` (unión de las 4 familias: breath_intense, cold, heat, fasting), no solo `requiresClinicalValidation`.
- **Hard-block:** embarazo/lactancia y diabetes/TCA en ayuno **bloquean de verdad** (`result:'blocked'`, no palomeable), precedencia correcta antes de la atestación.
- **Ayuno:** MAX_FAST_HOURS=120; celebraciones terminan en 48h (**72h/96h eliminadas** — `72:0` es solo un *preset seleccionable* que dispara la atestación >48h, no una celebración); alertas escalantes 36h/72h (texto §2.5); auto-cierre 120h con texto exacto.
- **Infra (mig 210):** `safety_params` (RLS: lectura authenticated, escritura service_role) + `user_attestation_log` append-only reusando el trigger de IP de la 209. Idempotente. **Nota honesta del delivery confirmada**: el flujo "acompañar fiebre" queda como motor listo pero sin cablear (no hay input de fiebre en la app) — no es regresión, es alcance.

## SPRINT 4 — Renames + posicionamiento ✅ APTO

- **"Diagnóstico" → "Mi Mapa Funcional":** cero residual user-facing renderizado. Los hits del grep caen todos en buckets excluidos legítimos: comentarios de código, keys de asset/JSON internas, slug de ruta `/salud/diagnostico`, disclaimers defensivos ("no diagnóstico", "no reemplaza… diagnóstico"), intake de diagnósticos médicos reales (autoinmune, upload ECG/EEG) y guardarraíles del system-prompt de ARGOS. PDF renombrado a `Mapa-Funcional-ATP-vN.pdf` + `<h1>Mi Mapa Funcional</h1>`.
- **BHA → ATP Functional Score:** binario "BIOHACKER APPROVED/NO APROBADO" fuera (residual = un comentario histórico). Score 0-100 por 4 atributos, total determinístico client-side (clamp 0-100). **Action-key del cobro H+ intacto**: `BHA_SCAN_ACTION_KEY='bha_scan'` = 500 H+ en `economy-config.ts` (no roto). `functional_score` persistido; `bha_status` legado conservado (cero borrado).
- **Posicionamiento:** paso `positioning` insertado ANTES de checkboxes — orden `welcome → positioning → privacy → profile` confirmado en `V2_STEPS`. Statement §2 verbatim ("ATP no es medicina para enfermos…"). `MEDICAL_DISCLAIMER_VERSION='1.1'` (bump re-pide aceptación). `ResultDisclaimerFooter` ("Estimación educativa, no diagnóstico. ATP optimiza, no trata.") en las **4** pantallas de resultado: `salud/diagnostico`, `edad-atp/result-preview`, `edad-atp/labs`, `labs-guide`. Metadata de stores sin palabras rojas ni nombres personales (créditos de fundadores fuera; "biohacking" solo como keyword ASO, flag a Enrique).

---

## TRANSVERSAL ✅

- **Cero borrado de filas del user:** ninguna migración tiene DELETE/DROP/TRUNCATE/DROP COLUMN; 211 solo ADD COLUMN, conserva `bha_status`.
- **Migraciones 209/210/211:** idempotentes (IF NOT EXISTS / ON CONFLICT DO NOTHING), RLS habilitada, policies presentes. La 210 depende del trigger de la 209 → **respetar orden**.
- **Secretos:** scan del diff completo (main→S4 en src/app/supabase) → **cero** claves/tokens.
- **Encadenamiento:** S3 sale de S2 y S4 de S3; el tip S4 contiene S2+S3 y compila (tsc 0, 1947 tests verdes por CC). `_layout.tsx` (tocado en S2 y S4) registra correctamente `legal/aviso`, `legal/terminos`, `positioning`, `privacy`. Imports nuevos resuelven.

## Observaciones menores (no bloqueantes)

1. **Trigger IP (mig 209):** solo sobreescribe `NEW.ip` cuando `x-forwarded-for` viene presente. En PostgREST/Supabase siempre llega, pero por robustez conviene forzar `NEW.ip := NULL` cuando no hay header (evita que un cliente que crafteara el insert persista una IP falsa). Riesgo real bajo; endurecer post-beta.
2. **`capBreathingTemplate`** usa `DEFAULT_SAFETY_PARAMS.breath_limits` compilados (3/90) en vez de los de DB — es la dirección segura (DB no puede *aflojar* el cap en runtime). Intencional, ok.
3. **Revocación CB-2/CB-3** hoy loguea + advierte pero no apaga el core funcionalmente (pendiente de producto ya documentado en el delivery S2). No es regresión.

---

## ORDEN DE MERGE

Encadenadas → mergear en secuencia, respetando la cadena:

1. `fix/compliance-sprint-2` → `main`
2. `fix/compliance-sprint-3` → `main`
3. `fix/compliance-sprint-4` → `main`

(Si se usa fast-forward de la cadena, mergear S4 arrastra S2+S3 en orden; verificar que `main` no avanzó desde el fork.)

## QUÉ NECESITA `db push` (post-merge)

`npx supabase db push` aplica al remoto, **en este orden** (210 depende de la función-trigger de 209):

- `209_consent_audit_log.sql`
- `210_safety_params_attestation_log.sql`
- `211_functional_score.sql`

Además: **OTA** (`eas update --branch preview`) para el copy/JS. El bump de disclaimer v1.1 re-pedirá aceptación a todos los usuarios (esperado).
