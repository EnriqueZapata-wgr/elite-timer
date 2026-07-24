# ✅ DELIVERY · Ajuste Mente v2 — secciones + favoritas + hard gate + seed

**Fecha:** 2026-07-23 · **Rama:** `feat/mente-ajuste-v2` (desde `main`)
**Estado:** `tsc` 0 errores, **1976 tests verdes (197 archivos)**, eslint 0 errores en tocados. **NO mergeado — Cowork audita.**
**Entrega:** solo JS + migraciones → **`db push` (214–217) ANTES del OTA** (ver nota 2 — hay fallback igualmente).

## 1 · Mig `214_audio_pieces_seed_batch2.sql` — reproducibilidad

Las 19 filas batch-2 (insertadas por MCP, sin migración) capturadas con `SELECT` del estado VIVO de `audio_pieces` (ELITE-APP-FULLDB, 2026-07-23): títulos, subtítulos, duraciones, voz, `imagen_path` a `covers/<slug>.jpg`, orden 12–30, todo verbatim. `ON CONFLICT (slug) DO NOTHING` → no-op aquí, reproduce en entornos nuevos. Categorías tal como estaban al capturar (la 215 recategoriza — orden de migraciones consistente en fresh).

## 2 · Mig `215_audio_pieces_categorias.sql` — Mantras y Visualización propias

CHECK `audio_pieces_categoria_check` (nombre verificado en la DB viva) recreado con `mantra` y `visualizacion`. UPDATE por lista explícita: 9 `mantra_*` → `mantra`; `visualizacion_dia_ideal`/`vision_de_futuro`/`visualizacion_creativa`/`woop` → `visualizacion`. `enfoque_laser`, `estres_descarga`, `ansiedad_gestion`, `perdon_profundo`, `mindfulness_base` se quedan en Guiadas. Idempotente (DROP IF EXISTS + ADD; UPDATEs re-corribles).

## 3 · UI Meditación — secciones nuevas

`app/meditation.tsx` ahora agrupa: **Favoritas** (si hay) → **Guiadas** → **Visualización** → **Mantras** → **Para dormir y descansar** → **Sin guía · Silencio** (orden del brief). El fetch trae TODO el catálogo (Favoritas puede incluir respiración). Tipos cliente: `AudioCategoria` + `mantra`/`visualizacion`; `sessionTypeFor` ya los mapea a `meditation` (test nuevo); labels del player añadidas.

## 4 · Favoritas — mig `216_audio_favorites.sql` + UI

- Tabla `audio_favorites (user_id, slug, created_at)`, PK `(user_id, slug)`, FK a `auth.users ON DELETE CASCADE`, **RLS ON** + policies select/insert/delete solo propias.
- **Corazón en el player** (header, junto al cierre): toggle optimista, revierte si la DB falla (`setFavorite` upsert/delete). Oculto mientras el hard gate está activo.
- **Sección Favoritas**: **decisión — vive en Meditación, no en el hub** (el hub quedó 100% menú por doctrina del ajuste anterior; meter datos ahí la contradecía). Se refresca `on-focus` al volver del player. Vacía → no se muestra.

## 5 · Hard gate de pánico — mig `217_audio_hard_gate.sql` + player

- Columna `hard_gate boolean NOT NULL DEFAULT false` + `UPDATE ... WHERE slug='navegar_ataque_panico'` (no-op hasta que Enrique la produzca y se siembre).
- **Player**: si `piece.hard_gate` → NO se pide el audio ni se crea el player; aparece el reconocimiento con el texto del brief **verbatim**, checkbox "Entiendo", botón **"Buscar ayuda / emergencia"** (abre diálogo con `tel:911` y `tel:8009112000` — Línea de la Vida) y CONTINUAR deshabilitado hasta marcar. Corre **cada vez** que se abre la pieza (mismo criterio que el gate de respiración intensa).

## Notas

1. **Orden post-merge:** `npx supabase db push` (214–217) → deploy nada (sin edge functions tocadas) → OTA. (Ojo memoria: si `db push` falla por el wrapper, aplicar vía MCP `execute_sql`.)
2. **Fallback anti-columna-fantasma:** `fetchAudioPieces` pide `hard_gate` y si el select da error (OTA llegó antes que la 217) reintenta sin la columna y default `false` — el catálogo nunca se vacía por el orden de despliegue.
3. Ninguna migración se aplicó al remoto en este run (solo SELECTs de captura/verificación) — Cowork audita y luego `db push`.
4. `app.json` sigue con su diff sucio pre-existente sin commitear (tercera vez que se reporta).

## 📱 Device tests

1. Meditación: secciones en orden Guiadas/Visualización/Mantras/Para dormir/Silencio con las 30 piezas repartidas (tras db push).
2. Corazón en player: marcar → aparece sección Favoritas arriba al volver; desmarcar → desaparece; modo avión al marcar → el corazón revierte.
3. Hard gate: (requiere sembrar `navegar_ataque_panico` con `hard_gate=true`) — abrir la pieza: no reproduce, texto + checkbox + botón de ayuda; CONTINUAR solo tras "Entiendo"; el botón de ayuda abre el diálogo con 911 / Línea de la Vida.
4. Regresión: pieza normal reproduce directo (sin gate), e- con ≥80% intacto, mantras cortos (180–240s) otorgan e- de meditación al completarse.
