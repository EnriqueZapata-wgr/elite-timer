# ✅ DELIVERY · Sprint Compliance 3 — Gates de protocolos (mantener-con-atestación)

**Fecha:** 2026-07-22 · **Rama:** `fix/compliance-sprint-3` (desde `fix/compliance-sprint-2` — NO desde main)
**Estado:** construido, tsc 0 errores, 1945 tests verdes. **NO mergeado — espera auditoría de Cowork.**
**Fuentes:** `SIGNOFF_ATESTACION_PROTOCOLOS_2026-07-21.md` (textos EXACTOS §2) · `DECISIONES_ENRIQUE_COMPLIANCE` (filas 2-3 actualizadas: mantener-con-gate) · umbrales BORRADOR del `HANDOFF_DEV_CIERRE_COMPLIANCE`

---

## Las 6 capas del sign-off — estado

| Capa | Qué exige | Implementación |
|---|---|---|
| 1 · Hard-block por condición declarada | Si declaró contraindicación absoluta, el protocolo NI SE OFRECE | `gateDecisionForFamily` bloquea por condiciones del Cuestionario Maestro (D9.2 activas) + embarazo/lactancia (D9.4b + `cycle_modality='pregnancy'`). Mensajes §2.6 / capa 1. |
| 2 · Atestación contextual bloqueante | Afirmaciones 1ª persona, todas obligatorias | `AttestationGateModal`: COMENZAR deshabilitado hasta palomear TODO. Textos EXACTOS §2.1-2.4, cero copy inventado. |
| 3 · Corre CADA VEZ | Contexto variable (agua/de pie/conducir) | Wim Hof/frío/sauna: el gate corre en cada activación/sesión (checkboxes se resetean en cada apertura; en respiración `clearedId` se limpia al salir del timer). Ayuno: una vez al fijar objetivo >48h (así lo marca §2.4). |
| 4 · Límites técnicos enforced | Máx 3 rondas, retención con countdown, auto-cierre 120h | `capBreathingTemplate` (3 rondas / retención ≤90s en plantillas de riesgo; countdown por fase ya existía, botón TERMINAR siempre visible) + auto-cierre 120h del ayuno. |
| 5 · Consentimiento logueado | Timestamp + versión + contenido | Tabla `user_attestation_log` (migración 210): attestation_id, protocol_key, versión, sha256 del texto, ip/user_agent server-side. Append-only + RLS. |
| 6 · Cláusula 11-bis en T&C | Asunción de riesgo | Ya incluida en los T&C staging del Sprint 2 (`legal-texts.ts` §11-bis). |

**Condición extra PULL-nunca-PUSH:** el motor de prescripción ahora excluye TODAS las keys de las familias de riesgo (`PULL_ONLY_INTERVENTION_KEYS` en `personalize-interventions.ts` paso 1) — antes solo excluía `requiresClinicalValidation` y PODÍA empujar sauna/frío. ARGOS no asigna protocolos (solo el motor determinístico); los 43 tests del motor pasan.

## 1 · Ayuno (decisión fila 2: contador completo a 120h, NO cortar)

- Contador sigue completo hasta 120h (`MAX_FAST_HOURS=120`, ya existía).
- **Celebraciones 72h/96h ELIMINADAS** — los hitos de celebración terminan en 48h.
- **Alertas escalantes** (texto EXACTO §2.5): aviso a 36h, alerta fuerte a 72h. Horas parametrizables (`fasting_safety` en safety_params).
- **Auto-cierre a 120h** con el texto EXACTO "Olvidaste cerrar tu ayuno…" (§2.5) — reemplaza los 2 copys anteriores (cierre en vivo + catch-up al abrir).
- **Atestación §2.4** al iniciar ayuno con objetivo >48h (preset 72h).
- **Hard-blocks**: embarazo/lactancia → cualquier ayuno >12h; diabetes 1/2 o TCA declarados → ayunos >48h.

## 2 · Gate de atestación contextual (Wim Hof / frío / sauna / apnea)

- `AttestationGateModal` con los textos EXACTOS del sign-off §2.1 (Wim Hof: "no cerca del agua", "sentado o recostado…", "sin epilepsia/cardiaca/presión alta/desmayos", "detendré si mareo/dolor/palpitaciones"), §2.2 (frío) y §2.3 (sauna). Pies incluidos.
- Superficies cableadas (ruta PULL — antes CERO gate):
  - `app/breathing.tsx`: plantillas `wim-hof-lite` y `energize-2` — gate ANTES del timer, cada sesión, tanto desde el selector como por deep-link (`?breathingId=`). Cap 3 rondas / retención ≤90s.
  - `app/salud/intervenciones/[key].tsx` `onActivate`: 21 keys de riesgo del catálogo (4 familias).
  - `app/protocol-explorer.tsx` `handleActivate`: detección por keywords del nombre de plantilla (wim hof/apnea/frío/plunge/sauna/ayuno) — las plantillas viven en DB sin vocabulario de keys; falso positivo = una atestación de más (conservador).

## 3 · Hard-block automático (capa 1)

- Fuente: Cuestionario Maestro. **Se agregaron 4 condiciones declarables a D9.2** (marcadas PEND-MARIANA): epilepsia, cardiopatía, síncopes/desmayos, TCA — sin fuente declarable la capa 1 no podía disparar. Mariana valida etiquetas/lista.
- Mapeo condición→familia en `safety_params.protocol_gate` (ajustable sin re-deploy): breath_intense ← epilepsia/cardiopatía/hipertensión/síncopes · cold ← cardiopatía/hipertensión · heat ← cardiopatía · fasting ← diabetes/TCA. Embarazo/lactancia bloquea las 4 familias (§2.6, texto exacto).
- Fail-safe: sin cuestionario o sin red → estado vacío → la atestación (capa 2) sigue cubriendo.

## 4 · Ruta PULL con gate + PUSH nunca empuja

- PULL: las 3 superficies de arriba. PUSH: exclusión `PULL_ONLY_INTERVENTION_KEYS` en el motor (ver tabla).

## 5 · Screening de fiebre (umbrales BORRADOR, parametrizable)

- **Motor construido y testeado**: `fever-screening-core.ts` — `screenFever()` con los umbrales del handoff (>39°C, >48h, embarazo, 5 síntomas rojos) → `seek_care` (card "Busca atención médica ahora") o `accompany_ok` (opt-in + disclaimer). Copys incluidos.
- **Parametrizable sin re-deploy**: umbrales en `safety_params.fever_screening` (un UPDATE en DB los ajusta; fallback compilado).
- ⚠️ **Nota honesta**: el flujo "acompañar fiebre" NO existe hoy en la app (no hay input de fiebre en ningún cuestionario/síntoma; `feverViralActive` sigue hardcodeado false). El motor queda listo para cablear cuando ese contenido exista — no se inventó una pantalla nueva sin spec de contenido.

## Infraestructura nueva

- **Migración `210_safety_params_attestation_log.sql`** (idempotente + RLS): tabla `safety_params` (seeds = umbrales borrador; lectura authenticated, escritura solo service_role) + `user_attestation_log` (append-only, reusa el trigger de IP de la 209).
- `src/services/safety/`: `safety-params-defaults.ts` (PURO — lo consume el motor), `safety-params-service.ts` (fetch+cache+fallback), `protocol-gate-core.ts` (puro, 22 tests), `protocol-gate-service.ts` (SafetyState + log), `fever-screening-core.ts`.
- `src/constants/attestation-copy.ts` (textos exactos §2 + versión 1.0).
- `src/components/safety/AttestationGateModal.tsx`.

⚠️ **Post-merge:** `npx supabase db push` (migraciones 209 + 210 — la 210 depende de la función de trigger de la 209).

## Pendientes / decisiones para Mariana y Cowork

1. **Mariana (contenido)**: confirmar umbrales de fiebre y ayuno; validar las 4 condiciones nuevas de D9.2 y el mapeo condición→familia; lista verde-embarazo de suplementos (no cubierta en este sprint — no hay gate de suplementos aún).
2. **Cowork**: revisar la exclusión PULL-only en el motor (es el único toque al motor; 43 tests verdes) y el matcher por keywords de protocol-explorer.
3. Usuarios ya con hitos 72/96 mostrados en un ayuno activo: el storage de hitos es por fast.id, sin colisión con las alertas nuevas (36/72 marcan su propia hora).
