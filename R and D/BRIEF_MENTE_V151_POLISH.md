# 🔧 BRIEF · Mente V1.5.1 — polish device (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mente-v151` **desde `feat/mente-v15-editorial`** (esa rama tiene el swap 1164c43: portadas reales + artículo, ya auditado APTO). Basarla ahí = polish + portadas reales cierran en UN solo merge, y el hub deja los placeholders. NO merge, tests verdes, Cowork audita.
**Origen:** device test de Enrique (build V1.5). **Cierra en build nativo** (keyboard-controller + bump de versión + user-facing).
**Ventana de veto:** defaults bakeados abajo; Enrique vetea si algo no cuadra.

## ⚠️ Contexto — este feedback es sobre el BUILD NATIVO v15 YA instalado
El build instalado YA trae los fixes de multitouch (`onPressIn`) y keyboard (insets + `softwareKeyboardLayoutMode: resize`). **Y aun así fallan** (#1 presión simultánea, #5 teclado tapa) → **el approach ligero NO bastó; hay que subir a la versión robusta** (RNGH para #1, keyboard-controller para #5). NO es problema de deploy.
Las portadas reales del hub/journal (swap 1164c43) viven en `feat/mente-v15-editorial` → por eso esta rama se basa AHÍ (no en main). Así el hub deja los placeholders sin un merge extra.

## Items

### 1 · Multitouch robusto *(P0 — CONFIRMADO)*
`onPressIn` NO bastó (falla en el build instalado). Cambiar los 2 botones de match (`app/mente/nback/sesion.tsx`) a **`react-native-gesture-handler` `Gesture.Tap()` por botón** (detectores separados = multitouch real, fuera del responder único de RN). RNGH ya es dependencia del proyecto. Verifica en device que 2 dedos simultáneos registren ambos canales.

### 2 · Gracia de 2s DESPUÉS de que aparece el tablero *(P1)*
Hoy el countdown se alargó, pero cuando el grid aparece el primer estímulo dispara al instante. **Default:** tras renderizar el grid (post "¡Va!"), esperar **2s** antes del primer `runTrial(0)` — que el usuario ubique la vista. (En `sesion.tsx`, diferir el primer trial, no solo el countdown.)

### 3 · Pace ~10% más lento *(P1)*
Enrique lo siente rápido. **Default:** base 1x un ~10% más lenta (más forgiving) — subir `TRIAL_MS` de 3000 a ~3300, o factor equivalente. (Ojo: Enrique dijo "×0.9"; su intención es MÁS LENTO, así que aplica ×1.1 al tiempo. Si literalmente quería más rápido, vetará.)

### 4 · Scroll desde un TextInput en Journal *(P1)*
En journal (sobre todo Gratitud, casi todo son inputs), arrastrar para scrollear **empezando sobre un TextInput no scrollea** → se siente pasmado. **Default:** que el ScrollView capture el pan vertical aunque el gesto empiece sobre un input (`keyboardShouldPersistTaps="handled"` ya está; sumar el manejo para que el drag no lo capture el input — evaluar `nestedScrollEnabled`, o envolver con el scroll de keyboard-controller de #5 que lo resuelve de raíz).

### 5 · Input enfocado SIEMPRE visible *(P1 — el definitivo)*
El teclado sigue tapando la mitad inferior; el input seleccionado debe **quedar visible al escribir sin importar su posición**. El fix rápido (`automaticallyAdjustKeyboardInsets`) no bastó. **Default:** instalar **`react-native-keyboard-controller`** + `KeyboardProvider` en el root + reemplazar los ScrollView de formularios (journal, checkin) por `KeyboardAwareScrollView` (scroll-to-focused + restaura al cerrar, cross-platform). Resuelve #4 y #5 de raíz. **Es dep nativa → build.**

### 6 · Orb de respiración con profundidad *(P2 · nice-to-have)*
El color plano de la esfera le da toc. **Default:** gradiente radial (highlight arriba-izq → color de fase al borde) + sombra/glow suave que respira con la escala. Sutil, premium — sin romper el fondo.

### 7 · Covers de meditación: flicker + fallos *(P1)*
En la Audioteca, al entrar: se ve el placeholder → **desaparece (blank)** → carga el remoto; y **varias no cargan**. **Default en `audio-cover.ts` / `AudioPieceCard`:** mostrar el fallback local **hasta** que el remoto cargue (nunca blank en medio); en `onError` del remoto → quedarse con el fallback. Precargar/cachear la URL firmada. Evaluar si las que "no cargan" son signed URLs vencidas o 404.

### 8 · Banner sticky + casita fija APP-WIDE *(P1 — el más grande)*
Enrique quiere el **top blureado con casita fija** (el `StickyPillarBanner` que estandarizamos en Mente) en **TODAS las pantallas**, y **matar la casita flotante** donde siga apareciendo. **Default:** generalizar `StickyPillarBanner` como el patrón de nav estándar del app; aplicarlo pantalla por pantalla (fuera del pilar Mente donde ya está); quitar `HomeFloatingButton` donde el banner lo cubra. (Es transversal — inventaría las pantallas y aplica; puede ser el ítem más pesado del batch.)

### 9 · Bump de versión a 1.5.0 *(P1 — con cuidado)*
El código es V1.5 pero la etiqueta sigue en `1.2.1` (`app.json:5`, nadie la bumpeó). **Default:** subir `expo.version` a **`1.5.0`** + incrementar `android.versionCode` e `ios.buildNumber` (para instalación limpia sin fricción de "misma versión" en Android). **Regla dura:** el bump va JUNTO con el build nativo de este batch, NUNCA por OTA suelto (cambiar versión + `runtimeVersion` rompe compatibilidad OTA con builds viejos — por eso se hace con build). Setear `cli.appVersionSource` en eas.json si simplifica (hoy da warning). Verifica que el OTA post-bump siga apuntando al runtime correcto.

## Protocolo
`feat/mente-v151` (desde `feat/mente-v15-editorial`), NO merge, `tsc` + tests verdes, delivery con checklist. **Cierra en build nativo** (keyboard-controller + bump de versión). Cowork audita → merge → build (con OTA de lo JS-only si aplica).
