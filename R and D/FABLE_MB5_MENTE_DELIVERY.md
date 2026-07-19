# 🧠 MB-5 · PILAR MENTE — Delivery

**Fecha:** 2026-07-18 · **Branch:** `feat/mb5-mente` (desde `main`, 5 commits) · **CI:** tsc 0 errores · 1815 tests verdes (11 nuevos)

---

## Qué se hizo

### 1. Pantallas de ejecución (respiración + meditación) — terminadas
- **Nuevo `src/components/ui/GradientCTA.tsx`**: el botón de acción del design system (brandGradient + AnimatedPressable spring + haptic; variants `primary`/`quiet`). Reemplaza TODOS los `Pressable` planos de breathing/meditation (COMENZAR, PAUSAR, REANUDAR, TERMINAR, CONTINUAR, config de Box Breathing). Reutilizable en el resto de la app.
- **Respiración — estado "preparando" explícito**: al tocar COMENZAR hay cuenta 3-2-1 en el círculo ("Prepárate") antes de la primera inhalación. Estados ahora: `idle → preparing → running/paused → completed`. La máquina pura `breath-timer-core` quedó INTOCADA.
- **Salida sin castigo (bug real)**: el tiempo parcial YA se registraba vía TERMINAR, pero el **BackButton durante sesión activa descartaba en silencio** (ambas pantallas). Ahora back = mismo camino que TERMINAR: confirma y registra el tiempo real. Copy del Alert lo dice: "se registra tu tiempo real".
- **Bug meditación**: al terminar antes de tiempo, `handleComplete` no pausaba el `useTimer` → el reloj seguía corriendo en la pantalla de completado. Ahora `pause()` congela el tiempo.
- **Guard anti doble-complete** en ambas (ref síncrono): el tick final del timer y TERMINAR simultáneos ya no pueden registrar dos veces.
- Peso del electrón desde `ELECTRON_WEIGHTS` (antes "+1.0" hardcodeado en respiración); meditación ahora **muestra** la card de electrón ganado (+2.5) — antes otorgaba en silencio.

### 2. Electrón de journal — verificado + blindado
**Hallazgo honesto:** el cableado de los 3 lugares YA estaba completo (se cerró en `#cableado-final 3.1` / `#17`): definición en `ELECTRON_WEIGHTS`, award+emit en `journal.tsx:298` y quick-journal de `index.tsx`, y journal en `MANDATORY_BOOLEANS` + `VERIFIED_ELECTRON_KEYS` + query de conteo. Lo que NO existía era un candado contra regresión (la falla es silenciosa por diseño).
- Listas `DEFAULT_BOOLEANS`/`MANDATORY_BOOLEANS`/`VERIFIED_*` + opciones del EditDayModal extraídas a **`src/services/hoy/day-booleans.ts`** (módulo puro). `day-compiler` y `EditDayModal` re-exportan — cero cambios para consumidores.
- **Test `day-booleans.test.ts`**: journal en los 3 lugares; los 4 booleanos de MENTE alcanzables en el universo del HOY; todo verificado con definición + ruta; pesos del EditDayModal no pueden divergir de `ELECTRON_WEIGHTS`.

### 3. Check-in — 2 bugs cerrados (con test)
- **Fallo de guardado invisible**: si `saveCheckin` tronaba, solo había `logWarn` — el usuario se quedaba en el paso 3 creyendo que guardó ("estados que no persisten bien"). Ahora Alert honesto; las respuestas siguen en memoria para reintentar.
- **`pleasantness`/`energy_level` nunca se escribían**: existen en la tabla (migración 006, CHECK 1-10), day-compiler los lee como señal cross-pillar de mood… y la UI jamás los seteaba → siempre null. Nuevo **`checkin-axes-core.ts`** (puro, 6 tests): los deriva del cuadrante RULER + energy/intensity de las emociones elegidas. Compatible con `isLow` (≤ 4).

### 4. Audio — expo-audio + background
- `sounds.ts` y `edad-sound.ts` migrados de `expo-av` → **`expo-audio`** con **import perezoso** (lección ExpoPrint: sin módulo nativo degrada a silencio, jamás crashea por OTA). Misma API pública; call sites intactos. `expo-audio` está en package.json desde marzo 2026 → el binario del 13-jul SÍ lo trae por autolinking.
- `app.json`: `ios.infoPlist.UIBackgroundModes: ["audio"]` — audio con pantalla bloqueada. **⚠️ Requiere build nativo** (no viaja por OTA). MB-4 no había corrido: verificado que no duplico (no existe branch mb4).
- **Nuevo `mind-audio-service.ts`**: reproductor de pistas largas (binaural/NSDR/guiadas) con background + loop, **catálogo VACÍO a propósito** (#46 — según brief). Cuando existan las grabaciones se agregan a `MIND_AUDIO_CATALOG` y las pantallas las listan sin tocar el servicio.
- `expo-av` sigue en package.json **sin ningún import vivo en src/** → quitarlo en el build único (checklist SPIKE_NATIVO_MB0).

### 5. Barrido copy placeholder (app entera)
| Texto | Dónde | Veredicto |
|---|---|---|
| "domain_scores usan placeholder neutral (Sprint 5)" | `edad-atp/result-preview.tsx` | ❌ **ELIMINADO** — jerga dev visible al usuario |
| "En comunidad · verifica pronto" | `community-presence-core.ts` | ✅ Ya NO se renderiza (Sprint 2 D lo ocultó bajo el umbral honesto); sobrevive solo como estado interno + test. Si molesta en código, es cosmético |
| Badges "PRONTO" (economy/shop, economy/admin, fitness-explore, kit) | varios | ✅ SE QUEDAN — patrón honesto sancionado por DESIGN_SYSTEM §3 ("badge explícito, nav honesta") |
| "placeholder Sprint 2" en `edad-atp/cognitive.tsx` | comentario de código | ✅ No user-facing; la pantalla es funcional (captura manual de RT) |
| `Lorem` / `TODO` en copy visible | — | ✅ Cero ocurrencias |

## Qué NO se hizo (y por qué)
- **Audios binaurales/NSDR (#46)**: fuera de alcance por brief — son grabaciones por producir. Reproductor y catálogo listos.
- **N-Back Challenge (#45)**: fuera de alcance — decisión pendiente de Enrique para V2.
- **`emotional_checkins` sin columna `date`** (⚠️ hallazgo): es la ÚNICA tabla de MENTE que depende de `created_at` UTC en vez de `date: getLocalToday()` (mind_sessions y journal_entries sí la tienen). Los lectores actuales convierten consistentemente a hora local, así que no hay bug activo — pero es deuda de alineación. Arreglarla bien pide migración + backfill (el backfill por `created_at::date` marcaría mal los check-ins nocturnos pre-migración). **No la hice**: migración no trivial sin bug activo que la justifique → decisión para Enrique/Cowork.
- **habit_type de journal/breathwork en award-rules del economy server-side**: meditación y checkin lo tienen; journal/breathwork no. Hoy es no-op (flag `LAB_ECONOMY_ENABLED` OFF). Anotado como deuda del sistema economy, no de MENTE.
- **Copy de Meet ARGOS**: intacto, con su flag (no lo toqué por ninguna razón).

## Dudas para Enrique
1. **¿Columna `date` en `emotional_checkins`?** (ver arriba — recomiendo hacerla en un MB de infra con migración + lectores en el mismo PR).
2. El estado "preparando" es de 3 segundos fijos — ¿lo quieres configurable o más largo para Wim Hof?
3. `GradientCTA` usa el degradado de marca (lime→teal) en Mente. Si prefieres el degradado del pilar (morado), es un prop (`pillar="mind"`) — decisión visual de device.

## Checklist de device (Enrique)
- [ ] Respiración: COMENZAR → ver 3-2-1 → fases con color → PAUSAR/REANUDAR → TERMINAR a la mitad → verifica que registra tiempo parcial y otorga +1.0 (card en HOY palomea).
- [ ] Respiración: durante sesión, tocar BACK → debe confirmar, no descartar.
- [ ] Meditación: terminar antes de tiempo → el tiempo en la pantalla de completado queda CONGELADO; card +2.5 visible.
- [ ] Check-in completo → card de HOY palomea; en modo avión, guardar → debe salir Alert "No se pudo guardar" y poder reintentar.
- [ ] Journal (pantalla + quick nocturno del HOY) → electrón +1.5 y card palomea.
- [ ] **Post build nativo**: sonido de respiración/meditación con pantalla bloqueada (iOS) — esto NO funciona solo con OTA.
- [ ] Botones nuevos: spring + haptic en COMENZAR/PAUSAR/TERMINAR en ambas pantallas.

## Commits
1. `MB-5 Mente 1` — ejecución terminada (GradientCTA, preparando, salida sin castigo, reloj congelado)
2. `MB-5 Mente 2` — check-in (fallo visible + ejes RULER)
3. `MB-5 Mente 3` — electrón journal blindado (day-booleans + regresión)
4. `MB-5 Mente 4` — audio expo-audio + UIBackgroundModes + mind-audio-service
5. `MB-5 Mente 5` — barrido copy placeholder
