# DELIVERY CC — Cierre Mente V1.5.0 (2 away runs)

**Fecha:** 2026-07-24 · **Base:** `BRIEF_FIX_MENTE_V1.5.md` + `AUDIT_VISUAL_MENTE_V15.md` + `AUDIT_CC_MENTE_V15.md`
**Estado:** 2 ramas pusheadas, NO mergeadas. `tsc --noEmit` limpio y **1999 tests verdes** en ambas. Cero migraciones SQL.

## Ramas

### 1 · `feat/mente-v15-bugs-ux` (41b2a43) — Tracks 1+2
- **1.1 Multitouch N-Back:** `AnimatedPressable` acepta `onPressIn` passthrough; los botones POSICIÓN/SONIDO registran en touch-down (`sesion.tsx`). Esto también arregla el conteo N≥2 (era downstream).
- **1.1b Gracia press tardío:** `resolvePressIndex()` pura en `nback-core.ts` (`GRACE_PRESS_MS: 450`, fijo — el RT humano no escala con la velocidad del juego) + 5 tests nuevos en `nback-core.test.ts`.
- **1.2 Home:** `router.dismissTo('/(tabs)')` en `StickyPillarBanner` **y** `HomeFloatingButton` (mismo bug fuera del pilar).
- **1.3 Teclado:** `automaticallyAdjustKeyboardInsets` + `keyboardDismissMode="interactive"` en los ScrollViews con inputs de `journal.tsx` y `checkin.tsx` (se quitó el KAV de `Screen` en esas 2 pantallas para no compensar doble). **Desviación:** omití `contentInsetAdjustmentBehavior="always"` — duplicaría el inset superior con el SafeAreaView de `Screen`. **Android:** `softwareKeyboardLayoutMode: "resize"` en app.json → **requiere build nativo**.
- **2.1** Countdown 2.6s → **4.6s** + el hint acompaña todo el countdown.
- **2.2** Centro del grid transparente (solo cruz, mismo footprint).
- **2.3** Botón presionado = **relleno sólido** lima (flash error = sólido rojo), contenido en negro.
- **2.4/2.5** Ruta nueva `/mente/nback/personalizar` (speed, resume, y toggles nuevos `feedbackFlash` #C8 y `showTurnNumber` #C9 — client-only, con migración de settings viejos que heredan `feedbackSound`). Home de N-Back queda de foco (AJUSTES fuera). `router.d.ts` regenerado a mano (3 posiciones de unión).
- **2.6** `como-jugar.tsx` paginado (1 idea/pantalla + ENTENDIDO + dots + EMPEZAR) y **coach on-the-fly** en la primera ronda (`sesion.tsx`): overlay intro N=1 + aviso antes del primer match de cada canal (pausa hasta ENTENDIDO, con re-anclaje del timing).
- **2.7** `AppState`: background a media ronda → pausa con overlay REANUDAR/Salir (también durante countdown). Timers de trial contra **deadline absoluto** (drift cero a 2x).

### 2 · `feat/mente-v15-editorial` (d9c01af) — Track 3 (encadenada de la 1)
- **G14:** `playChime()` en `sounds.ts` con asset propio `assets/sounds/chime.wav` — **NO pasa por `STYLE_MAP` ni `currentStyle`** (bug lateral: el estilo del timer de Fitness se filtraba a Respiración; 'silent'/'boxing'/'military' ya no aplican). El asset es un cuenco sintetizado (G4, 2.4s, partials inarmónicos + decay) — **swappable 1:1** si Enrique quiere uno producido. Entra por bundle Metro → OTA-able.
- **G15:** esfera real (borderRadius 100 sobre 200px; antes `Radius.pill`=50 → "ni cuadrado ni círculo") + gradiente de profundidad (highlight arriba-izq → sombra abajo-der) + glow por color de fase. **Palabra (Inhala/Retén/Exhala) FUERA** de la esfera; **número flotando** con textShadow, sin caja.
- **F12:** Check-in del hub al molde `MenteHubCard` (era la única card bespoke) + **imageBn despierta en las 5 cards** con portadas B/N del set `intervenciones/` (audio/respiracion/cognitivo/mente/grounding) como **placeholders** — swap 1:1 en `CARD_ART` (mente.tsx) cuando lleguen las MJ dedicadas.
- **3.3 Journal:** editor con `MenteHero` (back del hero regresa al selector; muere el PillarHeader pelón), cards de práctica al molde `MenteHubCard` (prop nueva `iconColor`), inputs con **focus state** (`JournalInput`, borde del pilar sin brincos de layout), labels a header editorial, y `src/constants/journal-types.ts` como **fuente única** (mata el `TYPE_META` hardcodeado de journal-history; todo deriva de `CATEGORY_COLORS`). Nota: `SURFACES.card`/`ELEVATION[1]` ya están alineados en valores (brand.ts) — el drift real era el TYPE_META.

## Qué NO entró (consciente)
- **E11** artículo "Saber más sobre N-Back" — lo escribe Cowork (botón pendiente de su copy).
- **Respiración: las 6 cards de técnicas** al molde editorial (prioridad 5 del audit visual, fuera del brief 3.1) y **toque editorial extra en la home de N-Back** — candidatos a un track corto post-audit.
- Portadas MJ dedicadas (Enrique genera; Cowork da prompts) — el cableado ya está listo para el swap.

## Verificación en device (Enrique)
1. N-Back: dos dedos A LA VEZ en POSICIÓN+SONIDO → ambos registran (botones se llenan sólidos). Jugar N=2 perfecto → debe subir a N=3.
2. Home (banner del pilar y casita flotante) → HOY aparece instantáneo, sin loader negro.
3. Journal/Check-in: teclado ya no tapa el input; al cerrar, la pantalla restaura.
4. Respiración: cue = cuenco (no beep); esfera con palabra afuera y número limpio.
5. N-Back → background a media ronda → overlay de pausa → REANUDAR continúa el trial.

## Post-merge
- OTA cubre todo **excepto** el teclado Android (`app.json`) → entra al próximo build nativo (ya hay uno pendiente por los m4a de mente-fixes).
