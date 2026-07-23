# 🧠 PLAN PARA TERMINAR EL PILAR MENTE — Overhaul + contenido

**Fecha:** 2026-07-23 · **Origen:** feedback de Enrique en device tras el sprint de audio.
**Estado:** el audio funciona y se ve premium (player full-bleed, background playback ✓, cards ✓). Falta arquitectura, consolidación y un bug P0. Este doc es la fuente de verdad para cerrar el pilar.

---

## PARTE A — OVERHAUL (sprint de CC · lo urgente, define "pulido")

### A0 · 🚨 BUG P0 — la meditación de audio no otorga e- ni palomea HOY
**Síntoma:** Enrique terminó un par de meditaciones y no recibió electrón, el electron-card de meditación en HOY no se palomeó.
**Root cause (fundado en `app/mente/player.tsx`):** la escucha efectiva (`listenedRef`, para el gate de ≥80%) se acumula SOLO cuando dispara el evento JS `playbackStatusUpdate`. En **background / pantalla bloqueada** — el caso de uso principal — el hilo JS se pausa: no acumula, y al volver el salto de posición se clasifica como *seek* y tampoco suma. `effectiveSeconds` nunca llega al 80% → el gate bloquea el award aunque la pieza terminó de verdad.
**Fix:** no depender del tick JS para la escucha efectiva. Como `didJustFinish` garantiza reproducción natural hasta el final, **calificar por posición final alcanzada vs duración, restando el total de saltos-hacia-adelante** (anti-seek). Así el background playback cuenta y el seek-al-final se sigue descartando. Alternativa/complemento: acumular tiempo con `onAppState` (foreground) + confiar en didJustFinish.
**Downstream:** una vez que el award dispara, el electron-card de HOY palomea solo (day-compiler ya cuenta `electron_logs` para meditation/breathwork). Verificar en device.
**Extra:** el electron-card de meditación dice **2.5 e-** — confirmar que ese peso es el oficial. Y su link hoy manda al módulo Mente viejo → tras A2, que apunte a la Meditación consolidada.

### A1 · 🏛️ Compartimentalizar (doctrina menú-vs-datos)
La Audioteca quedó **suelta en el hub de Mente** — mal. El hub debe ser SOLO navegación editorial a los sub-módulos; las piezas viven DENTRO del destino.
- **Hub Mente** = cards editoriales que llevan a: Meditación · Respiración · Journal · Check-in (+ Descanso, ver A2). CERO piezas de audio sueltas en el hub.
- **Meditaciones** (catálogo audio `meditacion`) → dentro de **Meditación**.
- **Respiración** (`pranayama_guiado` narrado + timer visual + Wim Hof) → dentro de **Respiración**.
- **Descanso/Sueño/NSDR** (`descanso`) → propuesta: sección "Descanso" dentro de Meditación, o destino propio. **Decisión Enrique.**
- **Check-in** → dentro de Check-in. **Journal** → Journal. (Ya están; solo confirmar que no queden datos sueltos en el hub.)

### A2 · Matar la pantalla Meditación vieja (`app/mente/meditation.tsx`)
Hoy: imagen vieja, estilo **morado legacy**, y lista **hardcodeada desactualizada** (Silencio 5/10/15/20, Mindfulness Presencia/Calma/Inmersión, Body Scan, Gratitud, Visualización, Enfoque, Wim Hof, Reset rápido).
- **Reemplazar** por la Audioteca real (catálogo `audio_pieces` dinámico) + opcional el **timer de Silencio** ("medita sin guía", 5/10/15/20) como una sección si se conserva.
- **Consolidar solapamientos:** Presencia, Gratitud, Relajación, Visualización ya existen en el catálogo → matar los hardcodeados duplicados. Un concepto, un lugar.
- **Wim Hof NO va aquí** → mover a Respiración.
- **Estilo editorial ATP** (matar morado viejo + imagen vieja), consistente con las cards nuevas.

### A3 · 🎨 Nav — banner fijo con blur (matar botón flotante)
- **Quitar** el home button flotante (y el botón ARGOS/target flotante) del pilar.
- **Banner superior FIJO**: back + home + electrones, sticky, con **blur** (glassmorphism) encima del contenido al scrollear.
- Definir alcance: patrón app-wide o empezar en Mente. **Propuesta:** implementar el componente reutilizable y aplicarlo primero en Mente.

### A4 · Player = full focus (sin ARGOS)
- En la pantalla del reproductor **NO** mostrar el botón flotante de ARGOS. Full focus, cero distracción. (Aparece abajo-derecha en el player actual — quitarlo ahí.)

### A5 · Reproductor — notificación / lockscreen premium
- **Artwork** en la notificación: la **portada de la meditación** (cover) + logo ATP como sello/fallback. Hoy no lleva artwork (`setActiveForLockScreen` solo pasa title/artist/album).
- **Metadata congruente:** se ve **"Dersinn"** como artista → es **metadata embebida en el .m4a** (residuo del encoder/cama) que el SO lee en vez del `artist: 'ATP · Mente'`. Fix doble: (a) en el pipeline de audio (`ATP-audio-pipeline/scripts/ensamble.py`), escribir tags limpios al exportar el m4a (`title`=pieza, `artist`=ATP, `album`=Mente) o strippear todo tag; (b) asegurar que `setActiveForLockScreen` mande artwork y sobrescriba en Android.
- Re-subir los 11 m4a con metadata limpia tras el fix del pipeline.

### A6 · Barrido de textos congruentes
Quitar residuos tipo "Dersinn". Todo texto del pilar congruente con lo que hace. Barrido rápido.

---

## PARTE B — CONTENIDO (paralelo · no bloquea el overhaul)

- **Mantras (8):** escritos, en revisión de Enrique (`ATP-audio-pipeline/content/GUIONES_MANTRAS_AUDIO_MENTE.md`) → producir tras aprobar.
- **Guiones no-🩺 pendientes (Cowork escribe):** visualiza tu día ideal, WOOP, visualización creativa.
- **Guiones 🩺 (esperan Mariana):** S.O.S. pánico (obligatorio disclaimer), estrés, ansiedad, sanación del perdón, abundancia.
- **Producir** mindfulness_base + sueño_inducción (pilotos ya escritos, faltó subirlos).
- **Binaurales (3)** por código (mini-sprint CC, ~$0): alpha/theta/delta.
- **Portadas MJ** (11) — Enrique, en curso.

---

## PARTE C — N-BACK (implementación CC · rock grande aparte)
Spec + 5 decisiones ya cerradas (tasks #6, #44). Cowork prepara el brief de build. 20-30h. Arranca en paralelo al overhaul.

---

## ORDEN SUGERIDO
1. **A0 (bug P0)** — desbloquea la economía, es lo que rompe la experiencia hoy.
2. **A1 + A2** — compartimentalizar + matar pantalla vieja (el corazón del "no está organizado").
3. **A3 + A4 + A5** — nav blur, player full-focus, notificación premium.
4. **A6** — barrido textos.
5. Contenido (B) y N-Back (C) en paralelo, por su cuenta.

Cowork audita el branch del overhaul antes del merge (como siempre).
