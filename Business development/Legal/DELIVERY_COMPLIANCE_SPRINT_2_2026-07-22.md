# ✅ DELIVERY · Sprint Compliance 2 — Consentimiento + Privacidad

**Fecha:** 2026-07-22 · **Rama:** `fix/compliance-sprint-2` (desde `main`)
**Estado:** construido, tsc 0 errores, 1923 tests verdes. **NO mergeado — espera auditoría de Cowork.**
**Fuentes:** `AVISO_DE_PRIVACIDAD_v1_2026-07-21.md` (Partes 2 y 3) · `HANDOFF_DEV_CIERRE_COMPLIANCE_2026-07-21.md` · `DECISIONES_ENRIQUE_COMPLIANCE` (fila 5)

---

## ⚠️ Regla de publicación respetada

- Aviso Integral + T&C viven **in-app en staging** (`app/legal/aviso.tsx`, `app/legal/terminos.tsx`) con el placeholder literal **[RAZÓN SOCIAL]** / **[DOMICILIO]**.
- `src/constants/legal-texts.ts` es la fuente única del texto in-app. Cuando llegue la razón social: inyectar ahí + publicar en somosatp.com + los links in-app siguen como espejo.
- Nada se publica con nombre personal.

## 1 · Los 7 checkboxes (texto EXACTO Parte 3, NO pre-marcados)

| CB | Superficie | Bloquea | Dónde |
|---|---|---|---|
| CB-1 Términos+Aviso | `register.tsx` | **Creación de cuenta** (botón deshabilitado por validación) | `app/register.tsx` |
| CB-2 Datos sensibles | Muro de onboarding | **Onboarding** | `app/onboarding/v2/privacy.tsx` |
| CB-3 Transferencia internacional | Muro de onboarding | **Onboarding** | ídem |
| CB-4 Mayoría de edad | Muro de onboarding | **Onboarding** (+ gate DOB, ver §4) | ídem |
| CB-5 Marketing | Muro de onboarding | No (opcional) | ídem |
| CB-6 Voz | **Contextual** — primera activación del modo voz ARGOS | No (sin aceptar, no se activa voz) | `app/argos-chat.tsx` |
| CB-7 Ciclo | **Contextual** — al activar modalidad de ciclo que trata datos | No (sin aceptar, no se activa módulo) | `app/onboarding/v2/cycle.tsx` |

Nota de diseño: la Parte 3 del Aviso especifica CB-6/CB-7 como **contextuales** ("se muestran al activar la función, no en signup") — así se implementó. CB-1 bloquea la cuenta en el registro (como exige su spec); CB-2/3/4 bloquean el onboarding (el handoff los define como "bloquean creación de cuenta / onboarding").

- Nuevo paso de onboarding `privacy` (paso 2 de 8): Aviso Simplificado (Parte 2) arriba + checkboxes + links a Aviso Integral y T&C. Patrón "privacidad como alivio": copy de control, no de letra chica.
- Componentes reutilizables: `ConsentCheckboxRow`, `ContextualConsentModal`.

## 2 · Log de auditoría por aceptación

**Migración `209_consent_audit_log.sql`** (idempotente + RLS):
- Tabla `user_consent_log`: `user_id`, `checkbox_id` (CB-1..CB-7), `action` (accepted/revoked), `aviso_version`, `terms_version`, `texto_hash`, `accepted_at` (dispositivo), `ip`, `user_agent`, `created_at` (servidor).
- **IP**: el cliente RN no conoce su IP pública → trigger `BEFORE INSERT` server-side extrae `x-forwarded-for` + `user-agent` de `request.headers` (PostgREST). Sin edge function nueva.
- **texto_hash**: SHA-256 del texto exacto del checkbox — implementación pura TS (`src/utils/sha256.ts`, verificada en vitest contra `node:crypto`; sin dependencia nativa nueva).
- **Append-only**: policies solo INSERT/SELECT del propio usuario. Revocar = fila nueva `action='revoked'`; nunca se borra evidencia (cero borrado de filas del user).
- CB-1 en register: si la sesión aún no está lista al crear la cuenta, la aceptación queda encolada (AsyncStorage) y el muro del onboarding la reintenta (`flushPendingConsentLogs`).
- Servicio: `src/services/consent-log-service.ts` (log, estado por CB, `hasCoreConsents`).

⚠️ **Post-merge:** `npx supabase db push` (migración 209).

## 3 · Aviso Simplificado + documentos linkeados

- Parte 2 renderizada arriba de los checkboxes del muro (fuente: `src/constants/consent-copy.ts`).
- Links del muro, de register, del footer de login (`AuthLinksFooter`) y de Ajustes → Legal apuntan a las pantallas in-app `/legal/aviso` y `/legal/terminos` (antes iban a somosatp.com, que aún no publica).

## 4 · Gate 18+ duro

- `src/utils/age-gate.ts`: `MIN_AGE = 18`; `<18 → 'blocked'`. **El tier `parental` (13-17) se eliminó** junto con el flujo de email del tutor (`isValidParentalEmail`, variant parental del `AgeGateModal`, columnas parental ya no se escriben).
- `AgeGateModal`: solo variante de bloqueo — "ATP no está disponible para menores de 18 años" + salir (signOut → login) o corregir fecha.
- DOB sigue siendo obligatoria en el paso profile; CB-4 ("Confirmo que soy mayor de 18 años") se captura antes, en el muro.
- Tests actualizados (`age-gate.test.ts`).

## 5 · ARCO verificado (Perfil → Privacidad)

Patrón confirmado: los botones NO llaman a las edge functions directo — insertan fila y **pg_cron** dispara `data-export-generator` / `account-deletion-processor` (migración 156). Cableado verificado:
- **Acceso/Portabilidad**: "Descargar mis datos" → `user_data_exports` → cron → JSON firmado 7 días. ✅ ya existía.
- **Cancelación**: "Eliminar mi cuenta" → re-auth con password → `user_deletion_requests` (gracia 30 días, cancelable). ✅ ya existía.
- **Oponerme**: toggles `user_consent` (analytics/marketing/investigación/clínico) con enforcement PostHog inmediato. ✅ ya existía.
- **Rectificar** (nuevo): fila "Rectificar mis datos" → editor de perfil.
- **Nuevo — Consentimientos del Aviso**: sección con estado por CB (fecha de otorgamiento / revocado / sin otorgar) y acción Otorgar/Revocar. Revocar CB-2/CB-3 advierte que el core deja de operar (nota de revocación de la Parte 3) y loguea `action='revoked'`.

## Archivos del diff

**Nuevos:** `supabase/migrations/209_consent_audit_log.sql` · `src/constants/consent-copy.ts` · `src/constants/legal-texts.ts` · `src/services/consent-log-service.ts` · `src/utils/sha256.ts` (+test) · `src/components/legal/{ConsentCheckboxRow,ContextualConsentModal,LegalDocScreen}.tsx` · `app/legal/{aviso,terminos}.tsx` · `app/onboarding/v2/privacy.tsx` · `src/constants/__tests__/consent-copy.test.ts`

**Modificados:** `app/register.tsx` (CB-1) · `app/onboarding/v2/{cycle,profile}.tsx` · `app/argos-chat.tsx` (CB-6) · `app/settings/{privacy,legal}.tsx` · `src/components/onboarding/AgeGateModal.tsx` · `src/components/auth/AuthLinksFooter.tsx` · `src/utils/age-gate.ts` (+test) · `src/services/onboarding-v2-core.ts` (+test) · `app/_layout.tsx` · `.expo/types/router.d.ts` (typed routes regenerado)

## Pendientes fuera de este sprint

1. **Razón social** → inyectar en `legal-texts.ts` + publicar web (bloqueado hasta mañana).
2. **Enforcement duro de revocación CB-2/CB-3** (apagar el core al revocar): hoy se loguea y se advierte; el corte funcional del core es decisión de producto a definir (¿pantalla de cuenta limitada?).
3. Usuarios beta existentes que ya pasaron el onboarding no ven el muro retroactivamente (no hay backfill de consentimiento) — decidir si se fuerza re-consent al abrir la app en v2.0.
