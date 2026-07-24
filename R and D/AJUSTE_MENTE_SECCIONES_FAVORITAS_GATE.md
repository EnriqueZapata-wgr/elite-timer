# 🔧 AJUSTE Mente v2 — secciones + favoritas + hard gate + reproducibilidad

**Repo:** este (ELITE_Timer). CLAUDE.md aplica. **Rama** `feat/mente-ajuste-v2` desde `main`. NO mergees — Cowork audita.
**Contexto:** el catálogo de audio ya está VIVO — **30 piezas sembradas en `audio_pieces`** (11 de la mig 212 + 19 batch-2 que Cowork insertó por MCP 2026-07-23), todas con `imagen_path` a `covers/<slug>.jpg` y audio en `audio/<slug>.m4a`. Este run organiza, agrega favoritas y el gate.

## 1 · Migración SEED (reproducibilidad) — la primera
Las 19 filas batch-2 se insertaron por MCP, **no viven en migración** → un entorno nuevo no las reproduce. Crea una migración de seed **idempotente** (`INSERT ... ON CONFLICT (slug) DO NOTHING`) que capture las 19 filas actuales. Genera los valores con `SELECT` del estado vivo de `audio_pieces` (las que NO están en la mig 212). Las 19 slugs: mindfulness_base, estres_descarga, ansiedad_gestion, enfoque_laser, visualizacion_dia_ideal, vision_de_futuro, visualizacion_creativa, woop, perdon_profundo, mantra_amor_fati, mantra_esto_tambien_pasara, mantra_como_si_siguiente_paso, mantra_go_for_the_win, mantra_bring_it_on, mantra_mi_mejor_yo, mantra_ser_mejor_no_tener_razon, mantra_presente_perfecto, mantra_amante_del_proceso, sueno_induccion. (En este proyecto es no-op porque ya existen; reproduce en entornos nuevos.)

## 2 · Migración categorías — Mantras y Visualización propias
Hoy 26 piezas caen en `meditacion` (todas juntas en "Guiadas") — choca con la doctrina de compartimentalizar. Da su sección a mantras y visualizaciones:
- `ALTER TABLE audio_pieces` → CHECK de `categoria` incluye ahora `'mantra'` y `'visualizacion'` (además de meditacion/respiracion/descanso). Idempotente.
- `UPDATE`: los 9 `mantra_*` → `categoria='mantra'`. Las 4 (`visualizacion_dia_ideal`, `vision_de_futuro`, `visualizacion_creativa`, `woop`) → `categoria='visualizacion'`.
- `enfoque_laser`, `estres_descarga`, `ansiedad_gestion`, `perdon_profundo`, `mindfulness_base` se quedan en `meditacion` (Guiadas).

## 3 · UI de Meditación — nuevas secciones
En `app/meditation.tsx`, agrega dos secciones (mismo patrón que "Para dormir/descanso"): **Mantras** (`mantra`) y **Visualización** (`visualizacion`), además de Guiadas (`meditacion`) · Para dormir (`descanso`) · Sin guía/Silencio. Orden sugerido de secciones: Guiadas → Visualización → Mantras → Para dormir → Silencio.

## 4 · Favoritas
- Migración: tabla `audio_favorites` (`user_id uuid`, `slug text` [o `piece_id`], `created_at`), PK/único `(user_id, slug)`, RLS ON + policy (el usuario ve/gestiona solo las suyas). Idempotente.
- **Corazón en el player** (`app/mente/player.tsx`): toggle favorito (insert/delete en `audio_favorites`), estado optimista + fail-soft.
- **Sección "Favoritas"** arriba en el hub de Mente o en Meditación (dinámica, jala del join favoritas × audio_pieces). Vacía → no se muestra.

## 5 · Hard gate de pánico
- Migración: columna `hard_gate boolean NOT NULL DEFAULT false` en `audio_pieces`. `UPDATE ... SET hard_gate=true WHERE slug='navegar_ataque_panico'` (la pieza se siembra cuando Enrique la produzca — el UPDATE puede correr igual, no-op si aún no existe).
- **Player**: si `piece.hard_gate` → antes de reproducir, pantalla de reconocimiento (checkbox "Entiendo") con el texto:
  > *"Esto es un apoyo para acompañarte a respirar; no sustituye atención médica. Si sientes dolor o presión en el pecho, dolor que baja al brazo o la mandíbula, dificultad grave para respirar, o crees que es una emergencia, busca atención médica de inmediato o llama a servicios de emergencia. Si estás en crisis emocional, puedes llamar a la Línea de la Vida 800-911-2000."*
  + botón visible "Buscar ayuda / emergencia". Solo tras "Entiendo" reproduce.

## Fuera de alcance
Producir audio · N-Back · el fix de metadata (ya hecho por Cowork).

## Protocolo
`feat/mente-ajuste-v2`, NO merge, `tsc` + tests verdes, migraciones idempotentes + RLS. Delivery corto. Cowork audita. Entregable por **build nativo si tocas algo nativo; si es solo JS+migración, OTA + db push**.
