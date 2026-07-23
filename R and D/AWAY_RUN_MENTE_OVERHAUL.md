# 🌙 AWAY RUN — Overhaul del pilar Mente (CC autónomo)

**De:** Cowork · **Para:** CC (posible frío — lee contexto primero) · **Fecha:** 2026-07-23
**Repo:** este (ELITE_Timer). CLAUDE.md aplica. **Rama nueva** `feat/mente-overhaul` desde `main` actualizado.

## Contexto — léelo primero (pudiste ser /cleared)
1. `R and D/PLAN_TERMINAR_MENTE_OVERHAUL.md` — **el plan completo. Ejecuta toda la PARTE A (A0–A6).** Este doc solo añade decisiones resueltas + protocolo.
2. `R and D/DELIVERY_MENTE_AUDIO_SPRINT_2026-07-23.md` — el sprint de audio que ya está en main (Audioteca, player, catálogo `audio_pieces`, edge `mente-audio-url`, economía e- con cap 3/día).
3. Archivos clave: `app/mente.tsx` (hub), `app/mente/meditation.tsx` (pantalla vieja a matar), `app/mente/player.tsx` (bug A0 + full-focus + notificación), `src/services/mente-audio-service.ts`, `src/services/day-compiler.ts`.

## Alcance = PARTE A del plan (A0 a A6). Decisiones ya resueltas (NO preguntes, ejecuta):
- **A0 (bug P0):** la escucha efectiva del gate ≥80% depende del tick JS `playbackStatusUpdate`, que se pausa en background/lockscreen (el caso de uso real) → nunca otorga. Recalifica por **posición final natural (`didJustFinish`) vs duración, restando saltos-forward acumulados** (anti-seek), no por acumulación de ticks. Verifica que al otorgar, el electron-card de HOY palomea (day-compiler ya cuenta `electron_logs`).
- **A1:** hub Mente = SOLO navegación editorial a **Meditación · Respiración · Descanso · Journal · Check-in**. Cero piezas de audio sueltas en el hub.
- **A2:** mata la lista hardcodeada vieja de `meditation.tsx` (morado legacy + imagen vieja). Reemplaza por el catálogo `audio_pieces` dinámico (categoría `meditacion`) + una sección **"Sin guía"** (timer de Silencio 5/10/15/20, se conserva). Consolida solapamientos (Presencia/Gratitud/Relajación/Visualización → solo la del catálogo). **Wim Hof → Respiración.** Las piezas viejas que NO estén en el catálogo (Enfoque láser, Calma profunda, Inmersión total, etc.): quítalas de la UI y **lístalas en el delivery** para review de Enrique (no las pierdas, no las inventes como catálogo).
- **Descanso:** destino propio en el hub; muestra el catálogo categoría `descanso` (NSDR + sueño).
- **Respiración:** dentro van el `pranayama_guiado` (catálogo `respiracion`) + el timer visual existente + Wim Hof (movido de meditación).
- **A3:** mata el home button flotante y el ARGOS flotante del pilar. Banner superior **fijo** (back + home + electrones) con **blur** al scrollear. Hazlo componente reutilizable, aplícalo en el pilar Mente. ⚠️ Si el blur exige una dep nativa nueva (expo-blur) que no esté en el build, usa la solución de blur ya presente o documenta que requiere build — no rompas el binario actual.
- **A4:** en el player, **cero ARGOS** (quita el flotante). Full focus.
- **A5 (app-side):** notificación/lockscreen con **artwork = cover de la pieza** (`imagen_path` firmado, fallback local) + logo ATP como sello. Asegura que `setActiveForLockScreen` mande el artwork y sobrescriba en Android. (El residuo **"Dersinn"** es metadata embebida en el .m4a — eso lo arregla Cowork en el pipeline aparte, no en este run.)
- **A6:** barrido de textos del pilar — congruentes con lo que hacen, cero residuos.

## FUERA DE ALCANCE (no lo toques en este run)
- Producir audio (Enrique). Guiones 🩺 (Mariana). Portadas (Enrique).
- Metadata "Dersinn" del .m4a (Cowork, repo audio-pipeline).
- N-Back (run aparte). Binaurales (pipeline).
- No cambies el peso 2.5 e- de meditación.

## Protocolo de AWAY RUN (no negociable)
- Trabaja en `feat/mente-overhaul`. **NO mergees.** Cowork audita el branch antes del merge.
- `npx tsc --noEmit` en verde + tests verdes (agrega tests donde aplique, sobre todo A0).
- Migraciones (si alguna) idempotentes + RLS. Probablemente este run es solo cliente (sin migración).
- str_replace quirúrgico, nada de reescribir archivos completos.
- **Escribe un delivery** `R and D/DELIVERY_MENTE_OVERHAUL_2026-07-23.md`: qué cambió por punto (A0–A6), la lista de piezas viejas removidas para review de Enrique, device-tests sugeridos, y cualquier decisión que hayas tenido que tomar.
- Si algo te bloquea de verdad (ambigüedad no resuelta aquí), **déjalo anotado en el delivery y sigue con lo demás** — no pares el run entero.
