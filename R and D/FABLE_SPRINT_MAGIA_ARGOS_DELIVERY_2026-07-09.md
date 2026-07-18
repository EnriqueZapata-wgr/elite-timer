# 🎸 FABLE SPRINT — MAGIA ARGOS · DELIVERY

**Fecha entrega:** 2026-07-09 (madrugada)
**Owner:** Fable (CCF5)
**Branch:** `feat/argos-magia-jarvis`
**Estado global:** ✅ 6/6 tasks completas · tsc 0 errores · 951 tests (baseline 855 → **+96**, target era 870+) · migración 163 aplicada y verificada

> ARGOS dejó de sentirse como email. Tiene cara, presencia cross-app, voz, sabe la hora y sabe qué pantalla ves. Duerme tranquilo.

---

## 📊 Tabla estándar

| # | Feature | Estado | Clave | Tests |
|---|---------|--------|-------|-------|
| T1 | ARGOS Avatar animado | ✅ Completa | `ArgosAvatar.tsx` (Reanimated 4) con 3 estados: idle (respiro), thinking (pulso+shimmer), speaking (onda de barras). Lógica de animación pura en `argos-avatar-core.ts`. Integrado en cabecera + empty-state del chat. | +9 |
| T2 | Floating ARGOS cross-app | ✅ Completa | `ArgosFloatingButton.tsx` montado en layout raíz vía `ArgosPresenceProvider`. Auto-hide: chat ARGOS, onboarding/auth, teclado, y hasta Meet ARGOS. Tap → chat con `?from=<pantalla>`. | +9 |
| T3 | Personalidad textual + tono | ✅ Completa | `argos-personality.ts`: `ARGOS_VOICE` (greetings por franja, encouragement, concern, celebration), `pickVariant`/`VoiceRotator` (no repite últimas 3), `buildPersonalityInjection` (capa PRESENCIA aditiva en el system prompt). | +44* |
| T4 | Contexto por pantalla | ✅ Completa | `useArgosScreenContext` + `argos-screen-context-core.ts`: mapea pathname → pilar. `chatWithArgosEx` acepta `screenContext` e inyecta contexto en el prompt. Callers: HOY quick-ask + chat vía `?from`. | +29 |
| T5 | ARGOS time-aware | ✅ Completa | `getTimeOfDay` (Intl `America/Mexico_City`, h23) + `buildTimeContextInjection`: capa temporal propia que adapta recomendaciones a la hora (no cardio de madrugada, etc). | +44* |
| T6 | Meet ARGOS + migración 163 | ✅ Completa | `app/argos/meet.tsx` cinemática (se presenta por nombre, revela en secuencia, libera el floating). Enganchada al final de `completeV2Step`. Migración 163 + `argos-intro-service`. | +5 |

\* T3 y T5 comparten el archivo de tests `argos-personality.test.ts` (44 tests cubren ambos).

**Tests nuevos por archivo:** avatar-core 9 · floating-core 9 · screen-context-core 29 · personality (T3+T5) 44 · intro-service 5 = **96 nuevos**.

---

## 🌿 Branch & commits (6 granulares)

```
6b12b32 feat(argos-magia T6): Meet ARGOS + migracion 163 argos_introduced_at
9bb12e5 feat(argos-magia T2): floating ARGOS access cross-app
85c265c feat(argos-magia T4): contexto por pantalla auto-inyectado
56fc719 feat(argos-magia T5): ARGOS time-aware (contexto temporal CDMX)
89c5771 feat(argos-magia T3): personalidad textual + inyeccion de tono en LLM
eb2d379 feat(argos-magia T1): ArgosAvatar animado 3 estados
```

21 archivos, +1553 / -20. **Sin merge aún** — a la espera de audit Cowork + tu review de copy.

---

## 🗄️ Migración 163 — APLICADA Y VERIFICADA ✅

- Archivo: `supabase/migrations/163_argos_introduced.sql` (idempotente `IF NOT EXISTS` + backfill).
- Aplicada al remoto (`ELITE-APP-FULLDB` / `itqkfozqvpwikogggqng`).
- **Ojo:** `apply_migration` volvió a reventar con el bug 42P10 (ON CONFLICT fantasma del wrapper MCP — ya documentado en memoria del proyecto). Apliqué vía `execute_sql` como marca la nota. Falló atómico, no hubo estado parcial.
- Verificación post-aplicación:
  - Columna `profiles.argos_introduced_at` = `timestamp with time zone` ✓
  - **11 perfiles backfilleados** (usuarios con onboarding ya completo → reciben el floating button de inmediato).
  - **1 perfil pendiente** (onboarding incompleto → verá la cinemática Meet ARGOS al terminar).

---

## 📱 Screens/superficies tocadas (para probar en device)

1. **Chat ARGOS** (`app/argos-chat.tsx`) — avatar animado en cabecera (thinking cuando responde) + empty-state.
2. **Floating button** — aparece bottom-right en TODAS las pantallas (menos chat/onboarding/teclado). Pruébalo navegando entre pilares.
3. **HOY** (`app/(tabs)/index.tsx`) — el quick-ask por voz ahora manda `screenContext: 'hoy'`.
4. **Meet ARGOS** (`app/argos/meet.tsx`) — para verla: completar onboarding v2 con un usuario nuevo (el 1 pendiente), o navegar manual a `/argos/meet`.
5. **Onboarding v2** — el último paso (notifications) ahora enruta a `/argos/meet` antes de HOY.

**Prueba de contexto/tono:** abre el chat desde Nutrición vs desde Fitness → ARGOS debe reconocer la pantalla. Pregunta algo de madrugada vs de día → debe adaptar el tono/recomendación.

---

## 🚩 Feature flags / gating

- **No hay toggles nuevos.** El gating del floating button es el flag durable `profiles.argos_introduced_at` (no una feature flag). Provider default `introduced=true` con corrección desde DB (fail-open a visible).
- La capa de personalidad/tiempo/pantalla se inyecta **solo en `chatWithArgosEx`** (chat + HOY quick-ask). Braverman premium y demás prompts largos quedaron **intactos**.

---

## ✍️ Copy que necesita TU review (placeholders de Fable)

Todo el copy es borrador mío. Marcado con `// COPY / CONTENIDO ARGOS` en el código. Prioridad de review:

1. **`src/services/argos-personality.ts` → `ARGOS_VOICE`**
   - Greetings por franja (morning/afternoon/evening/night).
   - `encouragement`, `concern`, `celebration`.
   - Estilo que usé: directo, ingeniería/ciencia, cero empalago. Ajusta a tu voz.
2. **`app/argos/meet.tsx` → guion cinemático**
   - "Hola, {nombre}." / "Soy ARGOS." / "Voy a estar aquí para ti." / micro-copy de qué hace.
   - Es EL primer contacto — el copy aquí pesa mucho. Léelo con calma.
3. **`argos-personality.ts` → `buildPersonalityInjection` / `describeTimeOfDay`**
   - Directrices de tono y de contexto temporal que ve el LLM (no visibles al usuario, pero moldean cómo habla ARGOS).
4. **`argos-screen-context-core.ts` → `buildScreenContextInjection`**
   - Frase "vi que estás en {pilar}…" — decide si te gusta ese nivel de proactividad o lo quieres más sutil.

---

## ⚠️ Decisiones / desviaciones del buzón (para que las sepas)

1. **Naming de archivos:** el buzón pedía `src/services/argos/personality.ts`, pero los archivos ARGOS del repo viven **planos** en `src/services/` (`argos-service.ts`, `argos-voice.ts`). Seguí la convención existente → `src/services/argos-personality.ts`. Igual para hooks y componentes (`src/components/argos/`, que sí es subdir nuevo y limpio).
2. **Tests de componentes:** el harness es **Vitest en node, solo `.test.ts`, sin testing-library ni jsdom** — no se pueden renderizar componentes RN. Seguí la convención del repo: extraje la lógica pura a `*-core.ts` y la testeé (96 tests) en vez de `.test.tsx`. El render se valida en device.
3. **`screenContext` en metadata del proxy:** el buzón sugería agregarlo al metadata de argos-proxy. Como el backend está fuera de scope (lo tocó Cowork), inyecté el contexto de pantalla en el **system prompt** (que sí llega al LLM garantizado) en vez de tocar el contrato del proxy. Mismo efecto de producto, cero coupling con backend.
4. **Long-press → voice** en el floating: lo dejé fuera (era "si tienes tiempo"). El tap abre el chat; el mic ya vive dentro del chat. Fácil de agregar después.
5. **Edge case Meet ARGOS:** si un usuario nuevo fuerza el cierre en la pantalla Meet (sin tocar "Comencemos"), no se marca `argos_introduced_at` → no ve floating button hasta que pase por Meet. Menor; lo dejo anotado por si quieres un fallback.

---

## 🐛 Bugs preexistentes / contexto colaborativo

- **NO detecté bugs críticos preexistentes** en las zonas que toqué.
- El working tree tiene cambios **de Cowork en paralelo** sin commitear: `supabase/functions/dispatch-agenda-notifications/index.ts` (modificado) y `supabase/migrations/164_fix_convert_electrons_tasa.sql` (fix #142). **No los toqué ni los incluí en mis commits** — son de Cowork. Mis 6 commits usan rutas explícitas; auditables con `git diff --stat eb2d379~1 HEAD`.
- Migración 164 (Cowork) ya ocupa su número; 163 (mío) no colisiona. Tabla de migraciones sin huecos.

---

## ✅ Checklist de reglas técnicas (CLAUDE.md)

- [x] str_replace quirúrgico (nada de reescribir archivos completos; `argos-service.ts` y `_layout.tsx` editados por hunks)
- [x] Sin `crypto.randomUUID`
- [x] `getTimeOfDay` usa `Intl` `America/Mexico_City` (patrón v6)
- [x] Migración 163 idempotente (`IF NOT EXISTS`) + backfill idempotente (solo NULLs)
- [x] Migración aplicada al remoto por mí (execute_sql; apply_migration bugueado)
- [x] `tsc --noEmit` → 0 errores
- [x] 6 commits granulares (uno por task) + tests
- [x] Braverman premium y prompts largos intactos

---

Duerme, Enrique. La magia quedó. Cuando despiertes: revisa el copy, pruébalo en device, y si te gusta, mergeamos.

— Fable (CCF5) 🎸
