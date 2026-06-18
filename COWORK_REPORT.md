# COWORK_REPORT — Labs Bulletproof v1 (UX async ELITE + 7 capas de blindaje)

**Branch:** `feat/labs-bulletproof-v1` (desde `main` @ 9820cf6)
**Estado:** ✅ `npx tsc --noEmit` 0 errores · `npx vitest run` 445/445 (+30 nuevos).
**SQL:** migración 075 lista **NO ejecutada**. **NO merge, NO OTA.**
**Modo overnight:** decisiones conservadoras tomadas solo + flags abajo.

> `COWORK_REPORT.md` / `COWORK_TASK.md` en `.gitignore` (este se force-add).

---

## Capas implementadas (antes/después)

| Capa | Qué | Archivos | Tests |
|------|-----|----------|-------|
| 1 — Validación cliente | bloquea pre-upload: >20MB, >50 pág, PDF protegido; soft-confirm 21-50 pág; imagen pesada informa | `src/utils/lab-file-validator.ts` | 14 |
| 2 — Reintento inteligente | retry red **+ 529/overload/503/timeout** (backoff 3s/8s) | `src/utils/smart-retry.ts` (+ lab-service) | 7 |
| 5 — Files API | sube PDF 1 vez a Anthropic (`file_id` cacheado) con **fallback transparente a base64** | `lab-service.ts`, `anthropic-client.ts`, `argos-proxy/index.ts`, migración 075 | (vía smart-retry/validator) |
| 6 — Logging granular | JSON parse-fail y "sin biomarcadores" → Sentry con preview del raw | `lab-service.ts` | — |
| 7 — Captura manual desde fallido | botón "Capturar manual" en upload fallido → biomarkers con banner del archivo + "Ver archivo"; marca `confirmed` al guardar | `my-health.tsx`, `biomarkers.tsx` | — |
| 8 — UX async ELITE | sheet + mini-banner global + orb + hook con Realtime; subida no bloquea | `lab-processing-reducer.ts`, `useLabProcessing.tsx`, `ProcessingOrbAnimation/LabProcessingSheet/ProcessingMiniBanner`, `_layout.tsx`, `my-health.tsx` | 9 (reducer) |

**Total nuevos: 30 tests.** Flujo nuevo: validar → subir → `startProcessing` (abre sheet, extrae
en background) → Realtime actualiza estado → banner verde/rojo → tap → confirmación. Nunca bloquea.

---

## Arquitectura UX async (Capa 8)

- **Estado central:** `LabProcessingProvider` (montado en `_layout`, dentro de Auth) con un
  reducer PURO (`lab-processing-reducer`, testeado) + suscripción **Supabase Realtime** a
  `lab_uploads` del usuario. Al arrancar, carga uploads `uploaded/pending/processing` y reanuda
  los atascados (>5 min).
- **Sheet** (`LabProcessingSheet`, global): reusa el `ExpandableSheet` ya probado (drag/snap/
  backdrop). Drag-down → minimiza al banner. Estados con orb + filename + elapsed + progreso
  indeterminado + botones (Revisar / Reintentar / Capturar manual).
- **Mini-banner** (`ProcessingMiniBanner`, global en `_layout`): sticky sobre el tab bar, visible
  en TODAS las pantallas; "Procesando N labs… Ns", auto-dismiss del éxito a 8s, tap re-expande.
- **Orb** (`ProcessingOrbAnimation`): reanimated puro (pulso / checkmark / X) + haptic por estado.
  Reutilizable (futuro: genética, plan ARGOS).
- **Confirmación:** al terminar la extracción en background, el review se cachea
  (`lab-review-store.setReview`) y el botón "Revisar valores" navega a `/edad-atp/lab-confirmation`.

---

## Decisiones autónomas (overnight) + FLAGS

1. **Files API — beta header `files-api-2025-04-14` SIN verificar** (no puedo navegar a
   docs.anthropic.com de noche). **Mitigación bulletproof:** TODO el path tiene fallback a base64
   — si el endpoint no está desplegado, la columna 075 no migró, o el header es incorrecto, el
   flujo cae al método actual sin regresión. **Acción Enrique:** verificar el beta vigente antes
   de confiar en la ruta file_id; probar el endpoint `upload_file` en el edge function desplegado.
2. **`argos-proxy` (edge function Deno) — NO testeable aquí** (no hay runtime Deno). Implementé el
   `action: 'upload_file'` y el beta header de forma ADITIVA (no toca el path actual de mensajes).
   Verificar en deploy.
3. **Subida múltiple (varias fotos) sigue con su flujo de confirmación consolidada** (sprint
   anterior), NO el sheet async. El sheet/banner async es para subida ÚNICA. Unificar multi-foto
   al sheet es follow-up (evité re-trabajar UX que ya funciona).
4. **Tests de componentes RN (sheet/banner) NO incluidos:** el harness vitest es node sin
   react-native testing library; renderizar componentes reanimated/Ionicons rompe. Testé el
   NÚCLEO LÓGICO: reducer (9), validator (14), smart-retry (7). Los componentes siguen el patrón
   ya probado del ExpandableSheet. **Verificar en device** (smoke test abajo).
5. **`countPdfPages` por regex** (no hay `pdf-lib` en deps, como anticipaba el brief). Cubre ~95%;
   si no puede contar, PERMITE (mejor procesar que bloquear). Password vía heurística `/Encrypt`.
6. **Snap points del sheet:** reusé el ExpandableSheet (25/50/90) en vez de 35/70/92 del brief —
   componente probado > snaps exactos. Funcionalmente equivalente.
7. **`tabBarHeight` del banner:** constante aproximada (60 + safe area + 8) — no hay hook de altura
   del tab bar accesible en `_layout`. Ajustable si queda mal en algún device.
8. **No toqué** motor v2, parser v2 (solo lo envolví con retry/Files), ARGOS chat sheet,
   edad-atp, electrones/protones. Realtime emite solo (no DeviceEventEmitter, regla #3).

---

## Migración SQL (correr manual)
`supabase/migrations/075_lab_uploads_anthropic_file_id.sql` — `ADD COLUMN IF NOT EXISTS
anthropic_file_id TEXT`. Idempotente. Sin ella, Files API cae a base64 (sin romper).

---

## EXIT CRITERIA
- [x] `npx tsc --noEmit` → 0 errores.
- [x] `npx vitest run` → 445/445 (+30: validator, smart-retry, reducer).
- [x] Push a `origin/feat/labs-bulletproof-v1`.
- [ ] **NO merge, NO OTA** — Enrique valida + corre 075 + despliega edge function + verifica beta header.

---

## SMOKE TEST (Enrique)
- [ ] Subir PDF mediano → sheet aparece, orb pulsa, termina, banner verde, tap → confirmación.
- [ ] Subir PDF >20MB → bloquea pre-upload con mensaje claro.
- [ ] Subir PDF protegido (/Encrypt) → bloquea con mensaje.
- [ ] Subir PDF de 25 páginas → pide confirmación antes de subir.
- [ ] Iniciar upload, navegar a HOY → mini-banner sigue visible abajo; al terminar se pone verde.
- [ ] Drag-down del sheet → minimiza a banner; tap banner → re-expande.
- [ ] Subir lab y matar la app → al reabrir, el banner muestra el processing y se actualiza (Realtime + reanudación).
- [ ] Wifi off a media subida → reintenta auto (3s/8s); si todo falla → estado error claro + Reintentar/Capturar manual.
- [ ] Upload fallido (lista "uploads con error") → "Capturar manual" → biomarkers con banner del archivo + "Ver archivo".
- [ ] Subir 2 labs casi a la vez → banner "Procesando 2 labs…".
- [ ] (Tras correr 075 + deploy proxy) verificar que el 2º intento del mismo PDF reusa file_id (logs argos).

---

## Deuda técnica / follow-ups
- Verificar y, si cambió, actualizar el beta header de Files API (flag #1).
- Tests de componentes UI requieren agregar `@testing-library/react-native` al harness (no está).
- Unificar multi-foto al sheet async (hoy usa confirmación consolidada del sprint previo).
- Plumbing del nombre real de archivo (hoy genérico `lab.pdf`/`lab.jpg` en el sheet).
