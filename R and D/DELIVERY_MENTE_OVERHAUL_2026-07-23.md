# ✅ DELIVERY · Overhaul del pilar Mente (PARTE A completa)

**Fecha:** 2026-07-23 · **Rama:** `feat/mente-overhaul` (desde `main` 706200e)
**Estado:** construido, `tsc` 0 errores, **1975 tests verdes (197 archivos)**, eslint 0 errores en archivos tocados.
**NO mergeado — Cowork audita el branch.** Cero migraciones (run 100% cliente). Cero dependencia nativa nueva → **entregable por OTA** (expo-blur y expo-audio ya están en el binario actual).

Commits: `9a1977e` (A0+A5) · `2ee1dc6` (A3+A4) · `a4b368b` (A1+A2+A6).

---

## A0 · 🚨 Bug P0 — la meditación de audio no otorgaba e- (RESUELTO)

**Root cause confirmado:** la escucha efectiva acumulaba solo en ticks JS de `playbackStatusUpdate`; en background/lockscreen el hilo JS se pausa → nunca llegaba al 80% → `not_eligible` aunque la pieza terminara de verdad.

**Fix (como mandaba el brief):** recalifica por **posición final natural vs duración, restando el neto de saltos-forward** — cero dependencia de ticks:

- `mente-audio-core.ts`: nuevas funciones puras `applySeekToSkip` (neto de segundos saltados: seek adelante suma, seek atrás descuenta con clamp en 0 — retroceder nunca regala crédito) y `effectiveListenedAt` (efectiva = posición − arranque − neto saltado + crédito persistido). `effectiveListenDelta` (modelo de ticks) **eliminada**.
- `player.tsx`: los ÚNICOS eventos que alimentan el anti-seek son los seeks explícitos (±15s y scrubber, incluido el drag continuo que encadena deltas). El seek de restauración al retomar define el punto de ARRANQUE (no cuenta como salto) y el crédito previo persistido (`{p,l}` en AsyncStorage, formato intacto) entra como `priorListened`. `didJustFinish` garantiza fin por reproducción natural → **el background playback cuenta completo**.
- Anti-farm verificado por tests: brincar al final → efectiva mínima, sin e-; seek adelante+atrás no infla; retomar y saltar solo acredita lo real.
- **Downstream:** `logAudioSession` intacto (mind_sessions siempre + e- solo ≥80% + cap 3/día server-side). El electron-card de HOY palomea vía `electron_logs` (day-compiler ya migrado en el delta) y su link ya apunta a `/meditation`, que ahora ES la consolidada → cero cambio necesario. Peso 2.5 e- no tocado.
- 17 tests del core (5 nuevos del modelo por posición, incl. el escenario background explícito).

## A1 · Hub = SOLO navegación editorial

`app/mente.tsx`: la Audioteca suelta **murió**. El hub queda: **Meditación · Respiración · Descanso (nuevo) · Journal · Check-in**, cards editoriales `MenteHubCard` con subtítulos de contexto. El trofeo de Progreso viajó al banner fijo (rightExtra). Se removió el fetch del catálogo del hub (cero datos de audio).
**Decisión:** "Últimas sesiones" (historial) se conservó — el brief mata *piezas de audio sueltas*, no el strip de actividad. Si Enrique quiere doctrina dura (hub 100% menú), es un delete de 15 líneas.

## A2 · Meditación consolidada (muere la pantalla vieja)

`app/meditation.tsx` (la "vieja" real — `app/mente/meditation.tsx` no existía): la lista hardcodeada morado-legacy **murió**. Ahora: sección **GUIADAS** = catálogo `audio_pieces` categoría `meditacion` dinámico (grid de `AudioPieceCard`, badge PRO, Base → `/paywall`, espejo del 403) + sección **SIN GUÍA · SILENCIO** (timer 5/10/15/20, conservado, mismo PhasedTimer).

- **`MEDITATION_LIBRARY` queda intacta como datos** — los deep links `meditationId` de protocolos siguen funcionando; solo se quitó de la UI de biblioteca.
- **Wim Hof → Respiración:** NO se portó la versión de meditación (`wim-hof-10`); Respiración ya tenía **`wim-hof-lite` CON gate de atestación** (Sprint Compliance 3). Matar la de meditación además cierra un hueco: esa versión corría SIN gate.
- **Descanso:** destino propio `app/mente/descanso.tsx` (`/mente/descanso`), catálogo categoría `descanso` (NSDR + pausa + sueño). Registrado en Stack + typed routes.
- **Respiración:** `app/breathing.tsx` ganó sección **CON GUÍA** (categoría `respiracion` → `pranayama_guiado` hoy, escala solo) arriba del **TIMER VISUAL** existente. Wim Hof gateado intacto.

### 📋 Piezas viejas REMOVIDAS de la UI — review de Enrique (datos intactos en `meditation-library.ts`)

| Pieza vieja (id) | Estado |
|---|---|
| Presencia (mindfulness-5) | Consolidada → catálogo **El poder del ahora** (`presencia`) |
| Gratitud (gratitude-5) | Consolidada → catálogo **Gratitud** |
| Relajación total (body-scan-15) | Consolidada → catálogo **Relajación profunda** |
| Body scan nocturno (body-scan-10) | Consolidada → catálogo **Escaneo corporal** |
| Wim Hof Breathing (wim-hof-10) | Consolidada → Respiración **wim-hof-lite** (con gate) |
| Calma profunda (mindfulness-10) | **Sin equivalente en catálogo** — ¿producir o retirar? |
| Inmersión total (mindfulness-20) | **Sin equivalente** — ¿producir o retirar? |
| Enfoque láser (focus-10) | **Sin equivalente** — ¿producir o retirar? |
| Visión de futuro (visualization-10) | **Sin equivalente** — cubre el guion pendiente "visualiza tu día ideal / visualización creativa" (Parte B) |
| Reset rápido (relax-3) | **Sin equivalente directo** — `pausa_1min` (Descanso) cubre el micro-reset |

Conservadas en UI: Silencio 5/10/15/20.

## A3 · Banner fijo con blur (muerte de los flotantes en el pilar)

- Componente reutilizable nuevo **`src/components/layout/StickyPillarBanner.tsx`**: absoluto arriba, **back + home + `ElectronBadge`**, capa `BlurView` (intensity 40, dark) + tint que hace fade-in al pasar 24px de scroll (Reanimated). El hero editorial pasa por debajo del banner transparente (los heroes se movieron DENTRO del ScrollView en hub/meditación/respiración/descanso para que el blur tenga contenido real debajo).
- **expo-blur ya estaba en el binario** (lo usan HOY y food-scan) → cero dep nativa nueva, no rompe el binario actual. En Android sin blur real la capa degrada a tint oscuro translúcido (fail-soft).
- Flotantes: `isMentePillarPath` nuevo en `argos-floating-core` (compartido por `home-floating-core`) oculta **ARGOS y Home en `/mente*`, `/meditation`, `/breathing`** — con tests.
- **Decisiones:** (a) Journal y Check-in CONSERVAN los flotantes (pantallas fuera del alcance A1–A6; sin banner no pueden perder el home). (b) `/mente/progreso` queda sin banner pero con su BackButton propio; home = 2 taps (back → banner del hub). Follow-up de 5 min si molesta en device.

## A4 · Player full focus

El "ARGOS flotante del player" era el flotante global — muere vía `isMentePillarPath` (`/mente/player` cae en el prefijo). El player no tiene ningún otro overlay: portada + controles, cero distracción.

## A5 · Notificación/lockscreen con artwork (app-side)

- `setActiveForLockScreen` ahora manda **`artworkUrl`**: cover remota firmada si `imagen_path` existe (hoy NULL — cuando suban las covers MJ entra sola) → fallback **asset editorial local** resuelto a URI (`Image.resolveAssetSource`) → último sello: ícono ATP.
- **Android override:** al primer tick con `playing=true` se re-aserta `updateLockScreenMetadata` con la metadata ATP completa — pisa los tags embebidos que el SO lee del .m4a. ⚠️ El residuo **"Dersinn" definitivo lo arregla Cowork en el pipeline** (tags del .m4a) — fuera de alcance aquí, como manda el brief.
- Caveat honesto: la carga de artwork desde URI de asset local en **release** depende de la implementación nativa de expo-audio — verificar en device; si el SO no la pinta, la metadata de texto va igual (todo en try/catch).

## A6 · Barrido de textos

- Hub: subtítulo "Audioteca · journal…" → "Meditación · respiración · descanso · journal · check-in"; card Meditación ya no promete "N sesiones" de la lista muerta ("Guiadas y en silencio"); CTAs congruentes.
- Meditación: subtítulo dinámico "N guiadas · silencio sin guía"; estados vacíos honestos (offline/cargando).
- Cero "Dersinn"/"Audioteca" residual en copy de UI (grep limpio; las 2 menciones restantes son comentarios históricos de código sobre /mind-hub eliminado).

---

## Fuera de alcance respetado

Cero audio producido · guiones 🩺 intactos · metadata del .m4a (pipeline Cowork) · N-Back · binaurales · peso 2.5 e- intacto · cero migraciones.

## ⚠️ Notas / no-bloqueantes

1. **`app.json` tenía un diff sucio PRE-EXISTENTE en el working tree** (no es de este run): `UIBackgroundModes: ["audio","audio"]` duplicado, permisos de ubicación Android, `NSSpeechRecognitionUsageDescription`, `ITSAppUsesNonExemptEncryption`. Parece residuo de un prebuild/tooling. **Lo dejé SIN commitear.** Revisar y decidir (el "audio" duplicado conviene limpiarlo antes del próximo build).
2. `.expo/types/router.d.ts` (versionado): `/mente/descanso` añadido a mano espejo de `/mente/progreso` — la próxima `expo start` lo regenera idéntico.
3. `sessionTypeFor('descanso') → 'meditation'`: una pieza de Descanso registra sesión de meditación y su e- palomea la card de meditación en HOY (comportamiento heredado del sprint audio, sin cambio). Si Descanso debe tener economía propia, es decisión de producto aparte.

## 📱 Device tests sugeridos

1. **A0 (el crítico):** reproducir una pieza completa con **pantalla bloqueada** → al terminar: e- otorgado, electron-card de meditación en HOY palomeada, toast/texto de completado correcto.
2. A0 anti-seek: brincar al final con el scrubber → sesión registrada, **sin** e- ("escúchala completa…").
3. A0 retomar: salir a la mitad, volver, terminar → e- (el crédito acumulado sobrevive).
4. A0 re-escucha: terminar, dar replay y terminar otra vez <3h → mensaje de espaciado suave.
5. **A3:** en hub/Meditación/Respiración/Descanso: banner fijo, blur aparece al scrollear (iOS real; Android puede verse como tint oscuro), back/home/electrones funcionan; **cero flotantes** en el pilar y presentes fuera (p. ej. /nutrition).
6. **A4:** player sin ningún botón flotante.
7. **A5:** lockscreen/notificación muestra portada + "ATP · Mente" como artista (iOS y Android release); confirmar que "Dersinn" ya no aparece (si persiste en Android, es el tag del .m4a → pipeline).
8. A2: pieza PRO con cuenta Base → paywall desde Meditación/Descanso/Respiración; deep link de protocolo con `meditationId` sigue abriendo el timer por fases; Silencio 5/10/15/20 funciona y otorga con ≥80%.
