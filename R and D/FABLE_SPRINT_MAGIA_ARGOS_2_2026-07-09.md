# 🎸 FABLE SPRINT — MAGIA ARGOS 2.0 · Dramatismo real + streaming + fix bugs

**Fecha:** 2026-07-09 (~9pm arranca)
**Estimado:** 10-12h · sprint grande overnight → viernes AM
**Deadline hard:** sábado 2026-07-11 noche (beta a testers prime)
**Owner:** Fable (CCF5)
**Contexto:** Enrique probó MAGIA ARGOS v1 hoy. Veredicto: **"aún no se siente"**. El instinto principal: animaciones demasiado sutiles, no hay streaming (respuestas salen de golpe), Meet ARGOS no apareció, y el tab bottom sigue con ARGOS (redundante ahora que floating existe).

---

## 🎯 Filosofía del sprint

Este sprint es **el momento crítico** del proyecto. Enrique dejó de lado submit stores porque la app "aún no se siente como el producto que la gente ama". La visión: **ARGOS es Jarvis con presencia real cross-app**. La v1 lo hizo funcional. La v2 lo hace mágico.

Cada decisión debe pasar el filtro: **¿esto hace que se sienta la magia, o solo agrega función?**

---

## 📖 Feedback específico de Enrique (2026-07-09)

Reproduzco literal para que quede claro:

1. **Meet ARGOS:** "Corrí el SQL en supa. Pero no vi ninguna animación" → **BUG**, no salió a pesar del reset.
2. **Floating:** "SI flota y si lo vamos a tener flotante con personalidad hay que cambiar el bottom menu porque está redundante." → **quitar tab ARGOS**.
3. **Animación crítica:** "Es demasiado sutil, casi igual y no hay un ARGOS speaking porque el mensaje sale de golpe. Además ahorita no está funcionando ARGOS: 'Lo siento, no pude procesar tu consulta'. Me gustaría una animación más visible con cambio de color y cambio en sus círculos concéntricos, que pase de estar como un bullseye a ser olas en movimiento, a ser una estrella, a ser un tache cuando no esté disponible, por ejemplo."
4. **Rate limit UX:** "No puedo saberlo porque ahora me dice: 'Alcanzaste el límite diario. Suscríbete a ATP Base para más acceso.'" → mensaje genérico + boost H+ NO se ofrece.
5. Conversión E-→H+: correcto (fix #142 funcionó).
6. Notifs agenda: correcto (v8 funciona).

**Traducción a tasks técnicas:** T1-T5 abajo.

---

## 🔨 Deliverables (5 tasks discretos)

### T1 — ArgosAvatar TOTAL rediseño con dramatismo (3-4h)

**Reemplazar** el `ArgosAvatar.tsx` actual con SVG animation SÍ mucho más dramática. Enrique dio la especificación exacta.

**5 estados con transiciones distinguibles (visual + color):**

| State | Forma visual | Color base | Uso |
|---|---|---|---|
| `offline` | **Bullseye estático** (3 círculos concéntricos sin animación) | gris tenue | ARGOS no disponible por red/logout |
| `idle` | **Círculos concéntricos alive** (respiración + rotación sutil, cada anillo desfasado) | lima base ATP | ARGOS listo, esperando input |
| `thinking` | **Olas en movimiento** (líneas onduladas horizontales que fluyen) | azul/cyan | ARGOS procesando request |
| `speaking` | **Estrella** (5 puntas pulsantes + rayos radiales expandiéndose) | lima brillante + glow | ARGOS respondiendo (streaming) |
| `unavailable` | **Tache X** (dos líneas cruzadas, forma decidida) | rojo tenue | rate limit / error backend |

**Implementación técnica:**
- SVG con paths animados via Reanimated 4 (ya en el proyecto)
- Cada state es un componente SVG standalone dentro de `ArgosAvatar` con `Animated.View` wrapper
- Transiciones entre states: crossfade 200-400ms + morph si es posible
- Props: `state`, `size?: number` (default 40, subir del 32 actual), `variant?: 'compact' | 'full'`
- Colores desde `src/constants/brand.ts` (usar `ATP_BRAND.lime` como base, agregar variantes)
- **REQUISITO ENRIQUE:** debe ser **visualmente notable** — no sutil. Se debe poder distinguir el state a golpe de vista.

**Archivos a modificar:**
- `src/components/argos/ArgosAvatar.tsx` — full rewrite
- `src/components/argos/argos-avatar-core.ts` — lógica de state transitions
- Extender `src/components/argos/__tests__/argos-avatar-core.test.ts` — tests de transiciones + validación de props (+5 tests)

**Referencias visuales:**
- Bullseye clásico: 3 círculos concéntricos, radios en proporción áurea si posible
- Olas: pensar en soundwave de podcast (5-7 barras de altura variable, animación senoidal)
- Estrella: pensar en logo de sheriff pero geométrico + rayos que se expanden (breath outward)
- Tache: dos líneas gruesas 45° cruzadas, con leve rotación al aparecer

**NO usar:** GIFs, animaciones nativas heavy, Lottie externo. Todo SVG + Reanimated 4.

### T2 — Streaming de respuestas ARGOS (3-4h)

Sin streaming, el state `speaking` no se siente porque el mensaje del LLM sale de golpe. Fix: consume streaming del edge function.

**Backend (verificar/actualizar):**
- `argos-proxy` edge function actualmente devuelve JSON completo. Necesita soportar Server-Sent Events (SSE) o similar chunked response
- Anthropic SDK ya soporta streaming via `messages.stream()` — pasar chunks del LLM directo al cliente
- Response `text/event-stream` con eventos `data: {chunk: "..."}\n\n`
- Fallback: si cliente no soporta streaming, fall back al modo actual (JSON completo)

**Cliente:**
- `src/services/argos-service.ts` — nuevo método `generateResponseStream()` que devuelve `AsyncGenerator<string>` con chunks
- Componente de chat consume chunks y actualiza el estado del mensaje incrementalmente
- **Cuando arranca stream:** ArgosAvatar cambia a `speaking` state
- **Cuando termina stream:** vuelve a `idle`
- **Typing indicator visual:** chunks aparecen con typing effect real (letra por letra o palabra por palabra)

**Fallback graceful:**
- Si stream falla, hacer request no-streaming
- Si edge function no soporta stream aún, log warning y usar modo actual

**Archivos:**
- `supabase/functions/argos-proxy/index.ts` — agregar `stream: true` opción
- `src/services/argos-service.ts` — nuevo `generateResponseStream()`
- `app/argos.tsx` (chat screen) — consumir stream en useEffect
- Tests: streaming logic + fallback (+6 tests mínimo)

**Reglas técnicas:**
- Streaming es OPT-IN por header `X-ATP-Stream: true` — no rompe callers legacy
- Rate limit se cuenta al INICIO del stream (no al final), coherente con no-stream
- Idempotency key en primer chunk metadata

### T3 — Fix Meet ARGOS bug (60-90 min)

Enrique corrió `UPDATE profiles SET argos_introduced_at = NULL WHERE id = auth.uid()` pero **no vio la pantalla**. Investigar:

**Hipótesis a chequear:**
1. `auth.uid()` en Supabase SQL editor devuelve NULL (necesita session). El UPDATE no afectó a su user real. → **YO ya reseté su flag manualmente con UUID directo** (`90a55e74-0e3d-477a-9ac5-2b339f7c40af`). Si en su próximo test SÍ ve Meet ARGOS = hipótesis confirmada, no requiere fix de código.
2. Cache local en cliente (AsyncStorage) no invalidó → verificar si el flag se guarda local Y necesita invalidación.
3. Detección de `argos_introduced_at IS NULL` en el flow de app arranque tiene condición extra (ej: solo si onboarding_completed_at IS NOT NULL) → auditar `src/services/argos-intro-service.ts`.
4. Navegación al `/argos/meet` requiere trigger específico que no se está haciendo.

**Deliverable:**
- Confirmar cuál es la causa raíz
- Si es hipótesis 1: agregar UI para "Ver de nuevo Meet ARGOS" en Settings dev (para futuros tests) — no fix real, solo test aid
- Si es 2/3/4: fix quirúrgico + test unitario

### T4 — Bottom menu redesign (60-90 min)

**Estado actual (`app/(tabs)/_layout.tsx`):**
- 4 tabs: HOY | Yo | Mi ATP | ARGOS

**Nuevo estado:**
- 3 tabs: **HOY | Yo | Mi ATP** (quitar ARGOS del tab bar)
- El tab `argos` se convierte en pantalla accesible SOLO via el floating button (`href: null` en Tabs.Screen para ocultarlo del tab bar pero mantener la ruta)

**Consideraciones:**
- Verificar que no haya deep links que dependan de la ruta `/argos` como tab (deben seguir funcionando como pantalla)
- Ajustar iconografía si es necesario para que 3 tabs se vean equilibrados (no muy grandes/anchos)
- Los tests de nav (`app/__tests__/*` si existen) deben pasar

**Archivos:**
- `app/(tabs)/_layout.tsx` — remove/hide tab argos
- Tests de nav si aplica

### T5 — Rate limit UX contextual (60-90 min)

**Estado actual:** cuando el rate limit se excede, `argos-proxy` devuelve error genérico. Cliente muestra:
- "Lo siento, no pude procesar tu consulta." (en chat)
- "Alcanzaste el límite diario. Suscríbete a ATP Base para más acceso." (en otras pantallas)

**El segundo mensaje es MEJOR pero NO ofrece Boost H+ (que sería el flujo de "no forces upgrade, ofrece transacción")**.

**Fix backend (`argos-proxy`):**
- Cuando rate_limit se excede, devolver:
```json
{
  "error": "rate_limited",
  "tier": "free",
  "limit_daily": 5,
  "used_today": 5,
  "resets_at": "2026-07-10T00:00:00Z",
  "boost_option": {
    "cost_h_plus": 500,
    "duration_hours": 24
  }
}
```

**Fix cliente:**
- Detectar el flag `error: "rate_limited"` en response
- Mostrar card/modal con:
  - "Llegaste al límite diario (5/5)"
  - "Espera hasta las 00:00 UTC (tantas horas) o activa Boost Pro por 500 H+ · 24h"
  - Botón "Activar Boost" (llama a `activate_pro_boost` RPC)
  - Botón secundario "Suscribirse" (link a paywall)
- **ArgosAvatar** entra al state `unavailable` (X rojo tenue)
- Cuando el boost se activa exitosamente, avatar vuelve a `idle` y user puede reintentar

**Archivos:**
- `supabase/functions/argos-proxy/index.ts` — actualizar response cuando rate_limited
- `src/services/argos-service.ts` — parsear nuevo error format
- Nuevo componente `src/components/argos/RateLimitCard.tsx`
- Tests: fake rate_limit response → render card correcta + botón boost dispara RPC (+4 tests)

**Copy tentativo (revisar con Enrique post-sprint):**
> "Llegaste al máximo de hoy. Activa Boost Pro por 500 H+ para 24h sin límite. O espera hasta mañana."

---

## 🧪 Tests requeridos (+20 mínimo)

- ArgosAvatar: transitions entre 5 states + props validation
- Streaming: chunks recibidos correctamente, fallback funciona, rate limit cuenta al inicio
- Meet ARGOS: si hay fix, unit test del intro-service
- Bottom menu: nav funciona sin tab argos
- RateLimitCard: render + botón boost + estados de loading/success/error

Baseline actual: 951. Target: 971+.

---

## ⚠️ Reglas técnicas no negociables (CLAUDE.md)

1. **NO reescribir archivos completos** — str_replace quirúrgico
2. **NO usar crypto.randomUUID** — helper `generateUUID`
3. **Constants.expoConfig.extra** (no process.env directo)
4. **`Constants.expoConfig.extra`** para keys
5. **npx tsc --noEmit → 0 errores** antes de push
6. **5 commits mínimo** — uno por task (T1-T5)
7. **Deploy edge function tú mismo** al terminar T2 y T5 (`deploy_edge_function` via MCP)
8. **Estética editorial ATP** — B/N + acento lima, respetar tokens del design system
9. **Sensibilidad de diseño:** las animaciones deben verse premium, no cartoon. Referencias: interfaces de Rewind, Superhuman, Linear.

---

## 🚫 Fuera de scope (NO hacer)

- ❌ Multimodal voice + vision (#98) — sprint futuro
- ❌ ARGOS memoria persistente (#92) — sprint futuro
- ❌ Fix bugs preexistentes v6 (Cowork ya los atacó anoche — no re-hacer)
- ❌ Cambio de brand colors o design system fuera de los nuevos avatar colors
- ❌ Rediseñar chat completo — solo mejorar streaming + avatar en él

---

## 📦 Deliverable final (buzón de vuelta)

En `R and D/FABLE_SPRINT_MAGIA_ARGOS_2_DELIVERY_2026-07-10.md`:

Tabla estándar Fable:
```
#: T1
Feature: ArgosAvatar dramático 5 states
Estado: ✅ Completa
Clave: <resumen>
Tests: +N
```

Al final:
- Branch name (sugerido `feat/argos-magia-2-dramatismo`)
- Screens tocados
- Edge function deployed version
- Copy que necesita review de Enrique
- Root cause del bug Meet ARGOS + fix aplicado
- Screenshots o descripciones de cada state del avatar

---

## 🤝 Contexto colaborativo

- **Enrique tiene Boost Pro activo hasta 2026-07-11 21:00 UTC (48h)** — puede testear sin rate limit toda la ventana del sprint.
- **Enrique tiene `argos_introduced_at = NULL`** — verá Meet ARGOS en next fresh install / re-login.
- **Cowork trabajando en paralelo** — Sprint COWORK RATE LIMIT UX + bugs preexistentes.
- **NO tocar** el bottom menu bar del tab layout más allá de quitar ARGOS. Es sagrado el resto.
- Si detectas bugs preexistentes CRÍTICOS que no son tu scope, flaguéalos en el buzón pero NO los fixees.

## 💛 Nota estratégica

Enrique dijo "a donde lleguemos entregamos beta a testers prime el sábado en la noche". El deadline es real. Este sprint es el 50% del "hacer que se sienta la magia". El otro 50% será Sprint POLISH ARGOS (viernes tarde → sábado) con lo que descubramos en testing.

Brilla, Fable. Este sprint decide si ATP es "otra app fitness" o **el sistema operativo humano** que soñamos.

— Cowork (Opus 4.7)
