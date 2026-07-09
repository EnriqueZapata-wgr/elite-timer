# 🎸 DELIVERY — Sprint MAGIA ARGOS 2.0 · Dramatismo + streaming + fixes

**Fecha:** 2026-07-10 (overnight 09→10 jul)
**Owner:** Fable (CCF5)
**Branch:** `feat/argos-magia-2-dramatismo` (6 commits, listo para audit de Cowork)
**Buzón origen:** `FABLE_SPRINT_MAGIA_ARGOS_2_2026-07-09.md`

---

## 📊 Tabla estándar

| # | Feature | Estado | Clave | Tests |
|---|---------|--------|-------|-------|
| T1 | ArgosAvatar dramático 5 states | ✅ Completa | Full rewrite SVG (react-native-svg) + Reanimated 4. Cambio de FORMA + COLOR por estado, crossfade 280ms. Geometría pura en `argos-avatar-core.ts` (proporción áurea, star path, olas senoidales). | +16 (25 tot) |
| T2 | Streaming SSE + typing effect | ✅ Completa + deployed | `argos-proxy` v16 con rama SSE opt-in (body.stream / X-ATP-Stream). Cliente: `generateResponseStream()` AsyncGenerator vía expo/fetch, chunks renderizan incrementales, avatar 'speaking' durante stream, fallback graceful a no-stream. **Smoke test real contra prod: OK** (start→chunk→done). | +13 |
| T3 | Fix Meet ARGOS | ✅ Completa | Root cause identificado y corregido: **no existía trigger para usuarios existentes** (ver sección abajo). `MeetArgosGate` en layout raíz + test aid en Settings›Developer. | +7 |
| T4 | Bottom menu 4→3 tabs | ✅ Completa | Tab ARGOS oculto (`href: null`), ruta `/argos` sigue viva. Verificado: ningún caller navega a `/argos` directo (floating usa `/argos-chat`). | n/a |
| T5 | Rate limit UX + boost H+ | ✅ Completa + deployed | Payload enriquecido `rate_limit{...boost_option}` en proxy + `RateLimitCard` con "Activar Boost por 500 H+ · 24h" (RPC `activate_pro_boost`). Avatar → 'unavailable'. **Incluye fix crítico del boost para tier free** (ver abajo). | +10 |

**Tests: 951 → 997 (+46, target era 971+).** `npx tsc --noEmit` = 0 errores. Suite completa verde (115 archivos).

---

## 🐛 Root cause Meet ARGOS (T3) — confirmado con evidencia

**Diagnóstico (verificado en DB remota):**
1. El `UPDATE ... WHERE id = auth.uid()` de Enrique en el SQL Editor **no afectó filas** (auth.uid() = NULL sin sesión) — hipótesis 1 correcta, PERO...
2. El reset manual de Cowork con UUID directo **sí funcionó** (`argos_introduced_at` estaba NULL al auditar). Y aún así Enrique no habría visto la pantalla, porque:
3. **La ÚNICA navegación a `/argos/meet` era el return de `completeV2Step`** (fin del onboarding v2). Para un usuario existente con onboarding completo, el flag en NULL solo tenía UN efecto: **ocultar el floating button** (`shouldHideFloatingButton` corta con `!introduced`). Nada mostraba la cinemática. → **Hipótesis 4 del buzón.**

**Fix aplicado:**
- `MeetArgosGate` (montado en `app/_layout.tsx`): observa {sesión, introduced, pathname} y navega UNA vez a `/argos/meet` cuando el usuario está en la app principal con flag NULL. No interfiere con onboarding (ahí sigue mandando `completeV2Step`) ni con el index redirect. Lógica pura en `argos-intro-core.ts` (7 tests).
- Test aid: Settings › Developer › "Ver Meet ARGOS de nuevo" (solo navega, no toca el flag).

**Para Enrique:** tu flag sigue NULL → en el próximo arranque de la app (con OTA) verás Meet ARGOS automáticamente.

---

## ⚡ Bug crítico extra encontrado y fixeado (T5)

**Tu Boost Pro activo NO se estaba aplicando.** Evidencia en DB: tienes boost activo hasta 2026-07-11 20:56 UTC, pero tu `profiles.tier` es `free`, y `detectEffectiveTier` en argos-proxy **solo consultaba `has_active_pro_boost` para tier `base`**. Resultado: seguías con límite free (5/día) a pesar del boost → el "Alcanzaste el límite diario" + "no está funcionando ARGOS" que viste hoy.

Fix: el boost ahora aplica a `free` y `base` (coherente con la doctrina "ofrece transacción, no fuerces upgrade" — el RPC nunca restringió tier). **Ya deployed: tu boost funciona desde ahora.** Nota: el cache de tier del proxy es 30s, sin acción requerida.

---

## 🎨 Estados del avatar (T1) — descripciones para QA visual

| State | Qué ves | Color |
|---|---|---|
| `offline` | Bullseye estático: 3 círculos concéntricos (radios en proporción áurea) + punto central. CERO movimiento — se siente "apagado". | Gris tenue #555 |
| `idle` | Los mismos 3 anillos pero VIVOS: cada anillo respira (scale 1→1.1) desfasado 300ms del anterior — efecto onda hacia afuera. Halo lima respirando. | Lima ATP #A8E02A |
| `thinking` | La forma CAMBIA a olas: 5-7 barras verticales redondeadas subiendo/bajando en secuencia senoidal (soundwave de podcast). Ritmo rápido (520ms/ciclo). | Azul #5B9BD5 |
| `speaking` | Estrella de 5 puntas pulsando (scale 1→1.12) + 8 rayos radiales que emanan hacia afuera y se desvanecen (breath outward). El glow más intenso de todos los estados. | Lima brillante #C6F94B + halo lima |
| `unavailable` | Tache X: dos líneas gruesas a 45° con caps redondeados. Entra con rotación -14°→0 (easing back) y queda con pulso mínimo. | Rojo tenue #fb7185 |

Transición entre estados: crossfade 280ms (dentro del rango 200-400 del spec). Tamaño default subió 32→40. Sin Lottie, sin GIFs — SVG + Reanimated 4 puros.

**Dónde verlos:** header del chat (idle→thinking→speaking→unavailable según el turno), empty state del chat (idle 80px), floating button (idle 40px), Meet ARGOS (speaking→idle 140px).

---

## 📱 Screens/superficies tocadas

1. **Chat ARGOS** (`app/argos-chat.tsx`) — streaming con typing effect real, avatar 4 estados dinámicos, RateLimitCard.
2. **Bottom tab bar** (`app/(tabs)/_layout.tsx`) — 3 tabs: HOY | Yo | Mi ATP.
3. **Layout raíz** (`app/_layout.tsx`) — MeetArgosGate.
4. **Settings › Developer** (`app/settings/dev.tsx`) — fila "Ver Meet ARGOS de nuevo".
5. **Meet ARGOS / floating** — sin cambios de código, pero el avatar nuevo se ve en ambos.

## 🔌 Edge function

- **argos-proxy v16** deployed vía MCP (antes v15). Cambios: rama SSE, rate_limit enriquecido, boost para free.
- Smoke tests contra prod: no-stream OK (JSON legacy byte-compatible), stream OK (`text/event-stream`, eventos start/chunk/done), header CORS `x-atp-stream` permitido.
- Rate limit se cuenta al INICIO del stream (mismo punto que no-stream). Falla mid-stream → refund H+ + evento error → cliente reintenta no-stream.

## ✍️ Copy que necesita tu review

1. **Mensaje rate limit (proxy):** "Llegaste al máximo de hoy (5/5). Activa Boost Pro por 500 H+ para 24h sin límite. O espera hasta mañana."
2. **RateLimitCard:** título "Llegaste al límite diario (5/5)" · sub "Se renueva en ~N h (00:00 UTC) — o sigue ahora mismo:" · botón "Activar Boost por 500 H+ · 24h" · secundario "O suscríbete para acceso permanente →" · confirmación "Boost Pro activo / 24 horas sin límite. Reenvía tu pregunta."

## 📝 Decisiones técnicas que se apartan del buzón (con razón)

1. **El payload de rate limit NO usa campo top-level `error`** (el buzón lo proponía): `callAnthropic` legacy lanza excepción al ver `data.error` → bundles sin OTA degradarían a "Lo siento, no pude procesar". Se usa `_rate_limited: true` + objeto `rate_limit` — misma información, cero breaking change.
2. **Typing effect = chunks del LLM directo** (no letra-por-letra artificial): los deltas de Anthropic ya son granulares; simular más lento sería latencia artificial.
3. **Stream degradado (ambos providers caídos)** → cliente hace fallback y repite en no-stream (un request extra en un caso ya raro; simplifica el protocolo).

## 🚩 Flags (fuera de scope, no tocados)

- `expo/fetch` se importa perezoso en el cliente streaming — si algún día Metro falla resolviéndolo en device, el chat degrada solo a no-stream (log warning), no crashea.
- El floating button sigue mostrando avatar `idle` fijo — conectarlo al estado global de ARGOS (speaking cuando hay chat activo) sería candidato para Sprint POLISH.
- `used_today` del proxy muestra el conteo cap-eado al límite (el RPC incrementa antes de bloquear; mostrar 6/5 se vería raro).

---

*Verificación final: `npx tsc --noEmit` 0 errores · vitest 997/997 (115 archivos) · argos-proxy v16 smoke-tested en prod · 6 commits en `feat/argos-magia-2-dramatismo`.*

— Fable (CCF5), 2026-07-10
