# AUDIT CC — Pilar Mente rumbo a V1.5.0

**Fecha:** 2026-07-24 · **Modo:** read-only (cero cambios de código)
**Insumos:** `R and D/PLAN_CIERRE_MENTE_V1.5.md` (feedback Enrique) + lectura de código.
**Alcance:** N-Back (A1/A2/A3), botón Home (I17), teclado (I18), cue Respiración (G14), smells.

---

## P0-1 · A2 — Posición + Sonido simultáneos: la raíz es el Gesture Responder System de RN

**Síntoma:** presionar POSICIÓN y SONIDO a la vez → solo registra uno; secuencial rápido sí funciona.

**Descartado (verificado):**
- No hay `disabled` en los botones — `app/mente/nback/sesion.tsx:295-316` no lo pasa nunca.
- No hay estado compartido — `press()` (`sesion.tsx:154-171`) usa `pressedVRef`/`pressedARef` independientes y el guard `pressedArr[i]` es por canal. El handler está bien.

**Raíz confirmada:** ambos botones son `AnimatedPressable` → `Pressable` nativo de RN (`src/components/ui/AnimatedPressable.tsx:43-58`), y el press se registra en **`onPress`, que dispara al SOLTAR el dedo**. El responder system de RN permite **un solo responder a la vez**:

1. Dedo 1 toca POSICIÓN → ese `Pressable` toma el responder.
2. Dedo 2 toca SONIDO mientras el 1 sigue abajo → negociación de terminación (`onResponderTerminationRequest` default `true` en Pressability) → el primer press se **cancela** (su `onPress` jamás dispara) y el segundo toma el responder — o el segundo nunca lo obtiene, según timing.
3. Resultado: **solo un canal registra**, exactamente el síntoma.

**Fix propuesto (mínimo):** registrar el press en **`onPressIn`** (dispara al BAJAR el dedo, antes de cualquier terminación):
- `AnimatedPressable.tsx` hoy **se traga** `onPressIn`/`onPressOut` para la animación de scale (líneas 49-54). Extender la interfaz: aceptar `onPressIn` externo y componerlo con el scale (no reemplazar el componente — lo usa media app).
- En `sesion.tsx:301,312`: mover `press('v')`/`press('a')` de `onPress` a `onPressIn` (dejar `onPress` vacío o quitarlo).
- **Bonus directo:** registrar al touch-down elimina la latencia touch-down→release, lo que también mejora la atribución de trial (ver P0-2b).
- **Verificación en device obligatoria** (dos dedos reales). Si en algún Android el segundo `onPressIn` no dispara, fallback: `View` padre con `onTouchStart` + hit-test por `locationX` (los touch events crudos no pasan por la exclusividad del responder), o RNGH con `simultaneousHandlers`.

---

## P0-2 · A1 — Conteo mal en N≥2: confirmado downstream de A2 (motor puro limpio)

**Motor verificado línea por línea — correcto:**
- `matchesOf` (`src/services/nback-core.ts:103-105`): `i ≥ n && seq[i] === seq[i−n]`. Bien.
- `buildChannel` (`:89-101`): 6 matches forzados con escritura ascendente (el comentario documenta por qué; la propagación de cadenas es correcta). Los matches accidentales cuentan como matches reales — legítimo.
- `scoreChannel` (`:133-146`): `accuracy = hits / (total + falses)`. Bien.
- `evaluateRound` (`:160-174`): 75/90 según spec. Bien.
- Un jugador perfecto daría 100% en cualquier N **si pudiera presionar ambos botones**.

**Por qué N≥2 no pasa (la aritmética):** 6 matches forzados por canal sobre ~20 trials evaluables → esperanza de ~**1.8 trials por round donde AMBOS canales hacen match a la vez** (6×6/20; los canales se generan independientes, sin anti-solape — y no debe haberlo: presionar ambos es parte del juego). Con el bug A2, cada trial doble pierde 1 canal → p. ej. 2 dobles perdidos = 4/6 = **67% < 75%** → demote. Con suerte 1 doble = 5/6 = 83% → no sube. Es estadísticamente imposible sostener ≥90% en ambos canales → **nunca promociona desde N=2**. En la corrida de N=1 hubo menos dobles por azar. **Arreglar A2 arregla A1.** No encontré otra fuente de conteo malo.

### P0-2b · Atribución de press tardío (contribuidor secundario, real)

- `runTrial(i)` fija `trialRef.current = i` al **iniciar** el trial (`sesion.tsx:142`) y agenda `runTrial(i+1)` a `trialMs` (`:150`).
- Un press que aterriza tras el límite se atribuye al trial `i+1` → **doble castigo**: miss en `i` + false alarm en `i+1` (si `i+1` no es match). A 2x (1500ms/trial) el problema escala.
- Lo agrava que hoy `onPress` dispara al soltar (latencia del hold). El fix de A2 (onPressIn) ya reduce esto.
- **Fix propuesto:** ventana de gracia — un press dentro de los primeros ~400-500ms del trial `i+1` (escalar por speed) se atribuye a `i` **si** `i` no tiene press en ese canal. Implementarlo como función pura en `nback-core.ts` (p. ej. `resolvePressTrial(elapsedInTrialMs, i, pressedArr)`) para testearla en Vitest (patrón `*-core.ts` del repo).

### A3 · Arranque muy rápido (confirmado en código)

`startCountdown` (`sesion.tsx:115-122`): pasos a 0/900/1800ms y **primer trial a 2600ms** — "¡Va!" solo vive 800ms, y el hint de instrucciones (`:262-266`) solo se ve durante el paso 0 (900ms). Fix: estirar el countdown (~4.5s total) o insertar ~2s de pausa entre "¡Va!" y `startRound`, con el hint visible todo el countdown.

---

## P0-3 · I17 — Botón Home "reinicia la app": remount de `(tabs)`, no reload de JS

**Call sites:** `src/components/layout/StickyPillarBanner.tsx:76` y `src/components/ui/HomeFloatingButton.tsx:36` — ambos `router.navigate('/(tabs)')`.

**Mecanismo (expo-router ~6.0.23):** `navigate` solo "regresa" al target si encuentra el href en el historial; si la comparación no matchea (el entry del stack raíz quedó registrado como `/` / `(tabs)/index` — el root arranca en `app/index.tsx` que hace `<Redirect href="/(tabs)">`, `app/index.tsx:77` — o difiere en params), **pushea una instancia NUEVA del navigator `(tabs)`**. Eso remonta HOY desde cero: `app/(tabs)/index.tsx:364-365` (`setLoading(true)` en mount) + `:936` (`loading && !day` → pantalla de carga full-screen en negro) = la percepción exacta de "se reinició la app". No hay ningún `Updates.reloadAsync` involucrado — es **remount**, no reload.

**Fix propuesto:** `router.dismissTo('/(tabs)')` en ambos call sites — hace pop del stack raíz hasta `(tabs)` (y solo pushea si de verdad no existe). Nunca duplica el navigator → HOY conserva su estado y no muestra loader. Nota: el banner se usa en todo el pilar (mente.tsx, nback/index, stats, como-jugar, meditation, breathing) — un solo cambio en el componente cubre todo; no olvidar el flotante (`HomeFloatingButton`) que tiene el mismo bug fuera del pilar.

**Verificación:** en device, entrar HOY → Mente → N-Back → Home; HOY debe aparecer instantáneo con su estado (sin loader negro).

---

## P1-1 · I18 — Teclado tapa inputs: no existe NINGÚN manejo de teclado en Journal/Check-in

**Verificado:** ni `app/journal.tsx` ni `app/checkin.tsx` tienen `KeyboardAvoidingView`, `automaticallyAdjustKeyboardInsets` ni listeners de `Keyboard` — los `TextInput` (`journal.tsx:517,539,560,579,592`; `checkin.tsx:475`) viven en `ScrollView` planos (`journal.tsx:329,405`; `checkin.tsx:446`). `app.json` tampoco fija `android.softwareKeyboardLayoutMode`. En iOS no hay comportamiento automático → el teclado tapa; en Android con edge-to-edge (obligatorio en SDK 54 / RN 0.81) el `adjustResize` clásico es poco confiable.

**Fix propuesto (mínimo, sin dependencia nativa):**
- iOS: `automaticallyAdjustKeyboardInsets` en los `ScrollView` de journal/checkin — inseta al abrir **y restaura al cerrar** (cubre el "que regrese a tamaño completo").
- Android: envolver en `KeyboardAvoidingView behavior="height"` (o `padding` con offset) esas dos pantallas.
- Alternativa robusta pilar-completo: `react-native-keyboard-controller` — pero es **dependencia nativa** → solo si se cuelga del BUILD NATIVO ya pendiente de `feat/mente-fixes` (m4a binaurales).
- Ojo con el `ScrollView` anidado con `maxHeight: 200` de `checkin.tsx:326` al probar.

---

## P1-2 · G14 — Cue "8-bits" en Respiración: es `beep.mp3` del timer de Fitness

**Dónde se genera (exacto):**
- **Inicio:** `app/breathing.tsx:508` — al terminar la cuenta 3-2-1 (`playBeep(0.5)`).
- **Final:** `app/breathing.tsx:524` + `:526` — `handleComplete` reproduce el beep **dos veces** (segunda a los 1500ms).
- Cadena: `playBeep` → `playStepStart` (`src/utils/sounds.ts:161-163` → `:114-118`) → `STYLE_MAP[currentStyle]` → default `'digital'` → **`assets/sounds/beep.mp3`** — el mismo asset del timer de rutinas. Ese es el "sonidito de 8-bits".

**Bug lateral encontrado:** `currentStyle` es **estado global de módulo** que mutan Fitness (`src/hooks/useRoutineMode.ts:135,145`) y Settings (`app/settings/experiencia.tsx:184`). Si el usuario dejó estilo `'boxing'`/`'military'`, la respiración suena a **campana de box o silbato militar**; con `'silent'` pierde el cue por completo. La respiración nunca debió colgarse del estilo del timer de Fitness.

**Fix propuesto:** eliminar el beep (los hápticos `haptic.light`/`vibrateMedium` ya cubren el feedback en `:505,525`) o, si Enrique quiere cue sonoro, un asset propio suave (chime/bowl) reproducido directo con `expo-audio` sin pasar por `STYLE_MAP` ni `currentStyle`. Cero migración; es OTA-able (asset via require estático).

---

## P2 · Code smells / riesgos rumbo a V1.5.0

1. **N-Back sin manejo de AppState** (`sesion.tsx`, verificado: cero `AppState`): si la app va a background a mitad de round, iOS/Android throttlean los `setTimeout` → al volver, los trials siguen con timing corrido y el audio desincronizado. Propuesta: listener de `AppState` que aborte (o pause) el round al backgroundear — el spec ya asume que un round abandonado se pierde (`handleExit`).
2. **Drift acumulado en la cadena de timers** (`sesion.tsx:150`): cada trial se agenda relativo a la ejecución del callback anterior; a 3s/trial es despreciable, a 2x (1500ms) × 22 trials puede acumular decenas de ms. Si se toca ese código para A3/gracia, aprovechar y agendar contra tiempo absoluto (`startedAt + i*trialMs`).
3. **`AnimatedPressable` traga `onPressIn`/`onPressOut`** (`AnimatedPressable.tsx:49-54`): bloquea el fix de A2 y cualquier consumidor futuro que necesite touch-down. Extender props componiendo con el scale (cambio backwards-compatible).
4. **F12 confirmado en código:** la card de Check-in del hub es un bloque inline a mano (`app/mente.tsx:194-211` + estilos `:229-242`) mientras los otros 4 destinos usan `MenteHubCard` (`:147-191`). Unificar el molde resuelve la inconsistencia visual que reportó Enrique.
5. **`mente.tsx:69-70`** usa `new Date()` + `setHours(0,0,0,0)` para `checkinsToday` en vez del patrón de casa `getLocalToday()`/`parseLocalDate()` (regla técnica #3). Funciona, pero es el único sitio del hub que compara fechas a mano.
6. **Round fallido sin retry** (`sesion.tsx:197-199`): si `completeNBackRound` truena, el Alert avisa pero el round se pierde para siempre (sin cola offline). Aceptable para V1.5.0; anotar para el patrón offline que ya existe en chat ARGOS.
7. **`press()` silencioso en `saving`** (`sesion.tsx:156`): presses en el instante final del round se descartan sin feedback — correcto e intencional, solo documentarlo si alguien lo reporta como "no registró mi último press".
8. **I17 aplica fuera de Mente:** `HomeFloatingButton` comparte el `navigate('/(tabs)')` — el mismo remount ocurre desde cualquier pantalla profunda del Stack. El fix de P0-3 debe tocar ambos call sites, no solo el banner.

---

## Resumen ejecutivo

| # | Prio | Hallazgo | Raíz | Fix |
|---|------|----------|------|-----|
| A2 | P0 | Botones no simultáneos | Responder exclusivo de RN + registro en `onPress` (release) | Registrar en `onPressIn` (pasar prop por `AnimatedPressable`) |
| A1 | P0 | No pasa de N=2 | Downstream de A2 (motor puro correcto, verificado) | El de A2 + ventana de gracia en core testeable |
| I17 | P0 | Home "reinicia" app | `navigate('/(tabs)')` pushea `(tabs)` nuevo → remount de HOY con loader full-screen | `router.dismissTo('/(tabs)')` en banner + flotante |
| I18 | P1 | Teclado tapa inputs | Cero manejo de teclado en journal/checkin | `automaticallyAdjustKeyboardInsets` (iOS) + `KeyboardAvoidingView` (Android) |
| G14 | P1 | Cue 8-bits | `beep.mp3` de Fitness vía estilo global compartido | Quitar beep (háptico ya existe) o asset propio suave |
| A3 | P1 | Arranque rápido | Primer trial a 2.6s del tap | Countdown ~4.5s con hint persistente |

Todos los fixes son JS/TS puro → **OTA-able**; ninguno requiere migración SQL. Solo la alternativa `react-native-keyboard-controller` (I18) exigiría build nativo — hay uno ya pendiente en `feat/mente-fixes` si se decide por esa vía.
