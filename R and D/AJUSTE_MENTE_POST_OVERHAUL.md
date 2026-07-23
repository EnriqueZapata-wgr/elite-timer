# 🔧 AJUSTE Mente (post-overhaul) — decisiones de Enrique 2026-07-23

**Repo:** este (ELITE_Timer). CLAUDE.md aplica. **Rama nueva** `feat/mente-ajuste` desde `main` (ya trae el overhaid mergeado). NO mergees — Cowork audita.
**Base:** el overhaul (A0–A6) ya está en main. Esto son 2 refinamientos de arquitectura que decidió Enrique.

## Ajuste 1 · Hub 100% menú + últimas sesiones POR sección
- **Hub (`app/mente.tsx`):** matar el strip "Últimas sesiones" del hub. Doctrina dura: el hub es SOLO cards de navegación editorial, cero datos.
- **Mover el mini-segmento de "últimas sesiones" DENTRO de cada sección** (Meditación, Respiración): un bloque compacto "Tus últimas sesiones" al entrar a la sección, filtrado por el tipo de esa sección (meditación muestra sesiones de meditación; respiración las de respiración). Reusar la data de `mind_sessions` que ya alimentaba el strip.
- (Favoritas = fast-follow aparte, NO en este run — Cowork lo especifica después.)

## Ajuste 2 · Descanso se pliega en Meditación (matar destino separado)
Decisión: "meditaciones a meditaciones, respiraciones a respiraciones. Descanso son meditaciones." No hay claridad aún de qué es "Descanso" como categoría propia → **no lleva destino propio**.
- **Matar el destino `app/mente/descanso.tsx` + `/mente/descanso`** (quitar de Stack + typed routes) creado en el overhaul.
- **Hub queda: Meditación · Respiración · Journal · Check-in** (sin Descanso).
- **En Meditación (`app/meditation.tsx`):** mostrar las piezas de categoría `meditacion` **y** `descanso`, agrupadas con sub-encabezados claros dentro de la misma pantalla: p. ej. **Guiadas** (`meditacion`) · **Para dormir y descansar** (`descanso`: NSDR + sueño) · **Sin guía · Silencio** (timer, ya existe). Un solo destino, secciones internas.
- La categoría `descanso` en la DB se conserva (para el sub-grouping y filtros) — solo cambia la UI: ya no es un destino, es una sección dentro de Meditación.
- Esto además resuelve el flag heredado: `sessionTypeFor('descanso') → 'meditation'` ahora es consistente (Descanso ES meditación).

## Fuera de alcance
Favoritas (fast-follow), producir audio, guiones, N-Back, metadata m4a (Cowork).

## Protocolo
- `feat/mente-ajuste`, NO merge, `tsc` + tests verdes, str_replace quirúrgico.
- Cero migración esperada (cambio de UI/rutas). Si tocas typed routes, espeja el patrón existente.
- Delivery corto con lo que cambió. Cowork audita antes del merge. Entregable por OTA (cliente).
