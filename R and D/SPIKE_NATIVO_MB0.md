# 🔩 SPIKE NATIVO · MB-0(e) — decisión de stack para el build único post-MB-1

**Fecha:** 2026-07-17 · **Autor:** CC (MB-0 Cimiento) · **Estado:** DECIDIDO — nada se instala en MB-0.
**Objetivo:** que el build nativo post-MB-1 sea UNA sola pasada con todas las deps previsibles (Mente MB-5, voz ARGOS J5, teclado app-wide, orb ARGOS J2).

---

## 1. AUDIO → `expo-audio` (confirmado)

| | |
|---|---|
| **Dep** | `expo-audio` — **ya instalada** (`~1.1.1`, la versión SDK 54) |
| **Reemplaza a** | `expo-av ~16.0.8` (deprecada en SDK 54; sigue en package.json — migrar consumidores y **quitarla en el build único** para no arrastrar dos stacks de audio) |
| **Config nativa requerida** | iOS: `"UIBackgroundModes": ["audio"]` en `app.json → ios.infoPlist` (audio background + lock screen para meditación/respiración de Mente y voz ARGOS). Android: `expo-audio` gestiona el foreground service vía su config plugin — añadir `"expo-audio"` a `plugins` si no está. |
| **API clave** | `setAudioModeAsync({ shouldPlayInBackground: true, interruptionMode: 'duckOthers' })` + `useAudioPlayer`. Validar en el build device: audio sigue al bloquear pantalla. |
| **Lazy require** | Sí — los consumidores nuevos cargan el módulo con `require()` dentro de la función/efecto, nunca top-level (regla del crash ExpoPrint: nativos nuevos SIEMPRE lazy hasta que el binario los traiga). |

## 2. TECLADO → `react-native-keyboard-controller` (confirmado)

| | |
|---|---|
| **Dep** | `react-native-keyboard-controller` **^1.18** (línea 1.x compatible con RN 0.81 / SDK 54 / Fabric; fijar la exacta con `npx expo install` al instalarse) |
| **Por qué** | KEY-1 quedó resuelto en MB-0 con `KeyboardAvoidingView` opt-in en `Screen` (iOS `padding`, Android `adjustResize`). KAV es frágil en pantallas complejas (scroll + footer + modales); keyboard-controller da progreso de animación frame-perfect y `KeyboardAwareScrollView` real. |
| **Config nativa** | Autolinking puro — sin plugin ni Info.plist. Root: envolver `app/_layout.tsx` con `<KeyboardProvider>`. |
| **Plan de adopción** | La prop `keyboard` de `Screen` es el punto único de swap: cambiar su implementación interna de KAV → keyboard-controller **sin tocar las 11 pantallas** que ya la usan. |
| **Lazy require** | Sí — `KeyboardProvider` se monta con require condicional + fallback a Fragment mientras convivan binarios viejos (OTA a builds pre-build único). |

## 3. MOTION ORB ARGOS → **Reanimated 4 (ya presente) + react-native-svg** (confirmado)

| | |
|---|---|
| **Dep** | **Cero dep nativa nueva.** `react-native-reanimated ~4.1.1` + `react-native-worklets 0.5.1` + `react-native-svg 15.12.1` ya están en el binario actual. |
| **Por qué** | El orb idle/pensando/hablando es geometría procedural reactiva a estado (escala, glow, waveform por amplitud) — exactamente el punto fuerte de worklets + SVG animado. Cero riesgo de build, prototipable YA por OTA antes del build único (ventaja directa para el prototipo J2). |
| **Skia** | `@shopify/react-native-skia` queda como **escalación**, solo si J2 exige blur/glow procedural o shaders que SVG no dé con 60fps. Si J2 lo pide, entra al build único (compatible SDK 54); decidirlo ANTES del build para no provocar un segundo. |
| **Lottie** | **Descartado** — asset pre-horneado, mala reactividad a estado en runtime (amplitud de voz, transiciones interrumpibles) y dep nativa extra sin necesidad. |
| **Doctrina** | Orb abstracto. **Sin mascota husky.** |

---

## Checklist del build único post-MB-1

- [ ] `app.json`: `UIBackgroundModes: ["audio"]` (iOS) + plugin `expo-audio`.
- [ ] `npx expo install react-native-keyboard-controller` (fija versión SDK 54).
- [ ] Migrar consumidores `expo-av` → `expo-audio` y **remover `expo-av`**.
- [ ] Decisión Skia cerrada con el prototipo J2 (default: no entra).
- [ ] Todos los consumidores de módulos nuevos con **lazy require** + fail-soft.
- [ ] Bump de versión en `app.json` solo con build inmediato (regla #11).

*Generado en MB-0(e) · deriva de FABLE_MB0_CIMIENTO_2026-07-17.md · las versiones exactas se fijan con `expo install` en el momento del build.*
