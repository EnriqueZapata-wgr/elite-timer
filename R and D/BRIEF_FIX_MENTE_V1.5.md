# 🔧 BRIEF FIX — Cierre Mente V1.5.0 (para CC)

**Repo:** este. CLAUDE.md aplica. Base: auditoría Cowork (3 subagentes + AUDIT_CC si CC lo generó) + `PLAN_CIERRE_MENTE_V1.5.md`.
**Estructura:** 3 tracks. Se pueden hacer en 1 away run grande o 2 (bugs+UX / editorial). NO merge, tests verdes, Cowork audita cada branch.
**Entrega:** la mayoría OTA; lo nativo va marcado (keyboard Android, assets). El home-fix y N-Back son JS → OTA.

---

## TRACK 1 · BUGS P0 (primero)

### 1.1 · N-Back multitouch → arregla presión simultánea Y conteo N≥2
**Raíz:** `AnimatedPressable` (`src/components/ui/AnimatedPressable.tsx:13`) envuelve el `Pressable` nativo y el juego dispara en **`onPress`** (release). El sistema de responder único de RN cancela un botón cuando se presionan dos a la vez → un canal no registra → *miss* falso → con el gate 90% (que no perdona) nunca sube de N. **El scoring es correcto; NO hay bug de conteo aparte.**
**Fix:** disparar la detección en **`onPressIn`** (touch-down) en los dos botones de match (`app/mente/nback/sesion.tsx:294-317`). `press()` (154-171) ya es idempotente por canal → seguro. Opciones: (a) agregar prop `onPressIn` passthrough a `AnimatedPressable` (que llame su spring interno + el handler del caller), o (b) usar `Pressable` plano en esos 2 botones con `onPressIn={() => press('v'|'a')}`. Alternativa robusta: `react-native-gesture-handler` `Gesture.Tap()` por botón (multitouch real; RNGH ya es dependencia).
**Gracia de press tardío (P2, CC lo propone):** `trialRef` avanza al iniciar el trial i+1; un press justo pasado el límite se atribuye al trial nuevo. Implementar como **función pura testeable en `nback-core.ts`** que acredite presses en los primeros ~300-500ms de un trial al estímulo anterior. (Menos crítico una vez que `onPressIn` baja la latencia.)

### 1.2 · Botón Home reinicia la app
**Raíz:** `router.navigate('/(tabs)')` (`src/components/layout/StickyPillarBanner.tsx:76` y `src/components/ui/HomeFloatingButton.tsx:36`) resuelve a `/`, que colisiona con `app/index.tsx` (gate de auth que también es `/`) → muestra logo+spinner y re-corre el check → "se reinicia".
**Fix:** `router.dismissTo('/(tabs)')` en ambos (desapila hasta los tabs ya montados, sin re-correr el gate). Opcional hardening: renombrar el gate para quitar la colisión de `/`.

### 1.3 · Teclado tapa los inputs
**Raíz:** `src/components/ui/Screen.tsx:34-47` usa `KeyboardAvoidingView behavior='padding'` (iOS) / `undefined` (Android) — solo encoge, no hace scroll al campo enfocado. No restaura bien al cerrar.
**Fix rápido (OTA):** en los ScrollView de formularios (`app/journal.tsx:329`, `app/checkin.tsx` step 3) agregar `automaticallyAdjustKeyboardInsets`, `keyboardDismissMode="interactive"`, `contentInsetAdjustmentBehavior="always"`. Mejor centralizarlo en `Screen` (modo `keyboard`). **Android (build):** `android.softwareKeyboardLayoutMode: "resize"` en app.json. (Definitivo futuro: `react-native-keyboard-controller` + `KeyboardAwareScrollView`.)

---

## TRACK 2 · N-Back polish + UX (P1)

- **2.1 · Gracia de arranque ~2s:** `sesion.tsx:120` cambiar el delay de `startRound` de `2600` → `~4600`, o diferir `runTrial(0)` (línea 134) con `later(() => runTrial(0), 2000)`.
- **2.2 · Quitar el cuadrito gris central del grid:** `sesion.tsx:277-281` (celda `gi===4`) — contenedor transparente/sin borde (mismo footprint), que solo se vea el `+` (`s.crosshair`, 414). No tocar las demás celdas.
- **2.3 · Botón presionado se LLENA sólido:** `matchBtnPressed` (`sesion.tsx:422`) hoy solo recolorea el borde → `{ backgroundColor: ATP_BRAND.lime, borderColor: lime }` + icono/texto a `#000` en pressed. Coordinar con `matchBtnOk/Bad` (423-424, el flash) para que el sólido gane.
- **2.4 · Ajustes → botón "Personalizar":** extraer el bloque AJUSTES (`app/mente/nback/index.tsx:214-263`) a una ruta/sheet (`personalizar.tsx`) con un botón estilo `linkBtn`. Usa `getNBackSettings/saveNBackSettings` (`nback-service.ts`, AsyncStorage, sin migración).
- **2.5 · Toggles en Personalizar** (client-only, sin migración):
  - `feedbackFlash` — hoy el flash visual está atado a `feedbackSound` (`sesion.tsx:163`); **separarlos**. Nuevo campo en `NBackSettings` (`nback-service.ts:22-32,41-45`, default true). Conservar el feedback (a Enrique le gusta) pero apagable.
  - `showTurnNumber` — gate del contador `{trialIdx+1}/{total}` (`sesion.tsx:247-249`). Espeja el flag a un `useState` para que re-renderice.
- **2.6 · Tutorial amigable:** `como-jugar.tsx` hoy es una lista (`STEPS` 18-44 renderizados todos juntos, 70-80). Paginar: un `STEPS[i]` por pantalla con botón **"Entendido"/"Siguiente"** + indicador de progreso; último = "EMPEZAR" (`router.replace('/mente/nback/sesion')`). Y la **primera ronda con indicaciones y pausas on-the-fly** (que el novato entienda N=1, N=3, sus implicaciones).
- **2.7 · Robustez (auditoría CC · P2):**
  - **AppState en N-Back:** hoy mandar la app a background a mitad de round descompone el timing (los timers JS se pausan). Pausar el round al ir a background (y ofrecer reanudar o abortar), como el player de audio.
  - **Drift de timers a 2x:** el encadenado de `setTimeout` acumula drift a velocidades altas; considerar timing basado en timestamp (deadline absoluto) en vez de delays relativos.

---

## TRACK 3 · Editorial level-up (P1)

### 3.1 · Respiración
- **Sonido 8-bits fuera:** el cue es `beep.mp3` vía `playBeep()` (`app/breathing.tsx:508` inicio, `524` y `526` fin). **Reemplazar** por un chime suave (cuenco) — nuevo `playChime(vol)` en `src/utils/sounds.ts` que reproduzca el asset **independiente de `currentStyle`** (para que no se filtre el estilo de Fitness); precargar en `initAudio`. (NO reusar `bell.mp3` = campana de box.) Recomendado reemplazar, no dejar en silencio.
- **Timer visual → esfera:** `app/breathing.tsx:666-691`. Hoy es un **rectángulo redondeado** (`styles.breathCircle` 791-797: 200px, `borderRadius: Radius.pill`=50) con relleno translúcido `${ring}15` que lee como caja negra. Fix: `borderRadius: 100` (círculo real) + **esfera con gradiente radial** (`expo-linear-gradient`, highlight arriba-izq, glow con el `shadowColor` que ya existe); **palabra (Inhala/Retén/Exhala) FUERA** de la esfera (sacarla de la `RNAnimated.View`, label estático arriba); **número sin caja**, con `textShadow` para contraste. Animación actual: `scaleAnim` 1→1.5 inhala, →1.0 exhala (`breathing.tsx:447-460`, `breath-timer-core.ts:75-81`).

### 3.2 · Mente Hub
- **Unificar Check-in:** hoy es un `AnimatedPressable` inline bespoke (`app/mente.tsx:194-211` + estilos 229-242) mientras los otros 4 usan `MenteHubCard`. Rutearlo por `MenteHubCard` (title corto tipo "Check-in", la pregunta "¿Cómo estás hoy?" como subtítulo, `icon="heart-outline"`, `onPress→/checkin`). Borrar los estilos huérfanos.
- **Subir a editorial:** `MenteHubCard` YA soporta `imageBn` (art editorial, `MenteHubCard.tsx:31,68-73`) pero nunca se le pasa → está dormido. Wire art MJ a las 5 cards (ver "Assets" abajo).

### 3.3 · Journal
- **Editor con hero:** hoy usa `PillarHeader` (barra de texto pelona, `journal.tsx:328`) → nivel-down al entrar. Cambiar a `MenteHero` (como el home) para que el hero cargue home→editor→history.
- **Cards de práctica** (Gratitud/Visión/Estoico/Descarga, `journal.tsx:410-417`, estilo `typeCard` 620-633): planas → reconstruir con el vocabulario de `MenteHubCard` (icon circle, tipografía editorial, imagen opcional).
- **Unificar tokens:** history (`journal-history.tsx`) usa `ELEVATION/TEXT/ATP_BRAND` mientras home+editor usan `SURFACES/TEXT_COLORS/CATEGORY_COLORS` → drift. Unificar a una familia + matar el `TYPE_META` hardcodeado (`journal-history.tsx:39-45`) a favor de `CATEGORY_COLORS`.
- **Inputs:** agregar focus state + labels como headers editoriales (`s.input` `journal.tsx:652-656`).

---

## Assets (Enrique genera MJ) — Cowork da prompts
Portadas editoriales para: 5 cards del hub Mente + 4 cards de práctica del Journal (Gratitud/Visión/Estoico/Descarga) + opcional N-Back. Mismo estilo editorial ATP 4:5. Cowork entrega el doc de prompts.

## Contenido (Cowork escribe)
Artículo **"Saber más sobre N-Back"** — literatura citada, optimismo sin promesas → botón en `app/mente/nback/index.tsx`.

## Protocolo
Branch(es) `feat/mente-v15-*`, NO merge, `tsc`+tests verdes. Migraciones: ninguna esperada (todo client/JS salvo app.json Android keyboard). Cowork audita → merge → OTA (build solo si tocas nativo/assets). Cierra V1.5.0.
