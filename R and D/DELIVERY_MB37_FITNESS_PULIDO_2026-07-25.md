# ✨ DELIVERY · MB-3.7 — Pulido final de Fitness

**Fecha:** 2026-07-25 · **Rama:** `feat/mb37-fitness-pulido` (desde `main` 296bcb0, ya con MB-3.6) · **NO mergeada, versión intacta.**
**Verificación:** `tsc --noEmit` = 0 · **2118 tests verdes** · eslint 0 errores (5 warnings preexistentes de log-exercise).

## 1 · Las 5 redundancias — qué se hizo

| # | Resolución aplicada |
|---|---|
| **1** Fuerza · benchmark card vs tabla | **El PR/1RM sale de la card de benchmark; TUS MARCAS es la única casa del dato.** Razón documentada: la tabla es la presentación rica (por rango de reps + recencia + progresión + historial) y no puede irse sin perder datos; y en el punto donde el PR SÍ decide (registrar), **log-exercise ya muestra el PR actual** — la card era el tercer lugar del mismo número. La card queda como acceso: nombre + badge + músculos + variantes + botón registrar. |
| **2** Runner · número + barra | **Número conservado** ("EJERCICIO 2 / 6"); la barra bajó a **indicador ambiental**: 2 px, lima al 75%, sin label propio. |
| **3** Detalle · familia duplicada | Sección ahora dice solo **"4 VARIANTES"** (con singular "1 VARIANTE"); la familia vive en el header. |
| **4** Cardio hub · "Última: …" | **Retirada** (doctrina hub = navegación, cero datos). El dato vive en log-cardio como prefill "la última vez… tocar para repetir". **Los PR chips se quedan** — no viven en ningún otro lugar (documentado en código). Se limpió el estado, el query de últimas sesiones y los estilos muertos. |
| **5** Hub · kg hoy vs kg semana | El día que **ya entrenaste, la card ESTA SEMANA se oculta** — el hero de completado no compite con otro resumen. Los demás días, normal. |

## 2 · Español — strings traducidos

| Dónde | Antes → Después |
|---|---|
| `fitness-strength` MUSCLE_GROUP_DESCRIPTIONS | UPPER BODY → **TREN SUPERIOR** · LOWER BODY → **TREN INFERIOR** · FULL BODY → **CUERPO COMPLETO** (CORE se queda) |
| `fitness-hiit` sección | WORKOUTS → **ENTRENAMIENTOS** |
| `strength-session` cierre | SETS → **SERIES** (coherente con "SERIE 1 DE 3" del runner) |
| `strength-session` runner | "Hold objetivo: 40 s" → **"Aguante objetivo: 40 s"** · alert "…segundos del hold" → **"…del aguante"** |
| `log-exercise` | columna SET → **SERIE** · "Agregar set" → **"Agregar serie"** |
| `fitness-train` | "Loguea sets, reps y peso" → **"Registra series, reps y peso"** |
| `src/types/exercise.ts` MUSCLE_GROUP_LABELS | full_body 'Full Body' → **'Cuerpo completo'** (visible en filtros de marcas) |
| `routine-generator` + `fitness-hub` enfoque | 'Full body' → **'Cuerpo completo'** |

**Se quedan por doctrina del brief:** REPS, SEG, CORE, KG, RIR (explicado con botón "i"), 1RM, PR/PRs, HIIT/EMOM/AMRAP/Tabata (explicados en su card: "Every Minute On the Minute — 1 ejercicio cada minuto", etc.), BENCHMARK (explicado con botón "i" en Fuerza). Los nombres de ejercicios de la matriz (Dead Hang, Broad Jump…) son datos de DB — no se tocaron, como pide el brief. Barrido hecho sobre las 14 pantallas del pilar + los 4 componentes de métodos (Method35/EMOMAuto/MyoReps/RestTimer ya estaban en español).

**Sigue:** audit Cowork → merge → bump + build nativo de cierre de Fitness.
