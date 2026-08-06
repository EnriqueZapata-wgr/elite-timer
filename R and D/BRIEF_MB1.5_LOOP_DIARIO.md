# 🔧 BRIEF · MB-1.5 — Pulido del loop diario (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb15-loop-diario` desde `main` (después de que MB-2 mergee, para heredar suplementos y no chocar en componentes UI compartidos). NO merge, tests verdes, Cowork audita.
**Contexto:** el loop diario (HOY + electrones + agenda) ya es sólido; esto es **pulido de tacto y routing**, no features nuevas. Todo OTA-able (sin dep nativa, sin migración esperada).

## 🟡 VENTANA DE VETO (defaults de Cowork — Enrique vetea si algo no cuadra)

## Items (en orden)

### 1 · Press states consistentes app-wide *(P1 — el tacto)*
Hoy el feedback al tocar es disparejo entre pantallas (unos botones responden en `onPress`, otros en `onPressIn`, otros sin estado visual). **Default:** estandarizar sobre `AnimatedPressable` con **feedback en pointer-down** (touch-down, no touch-up) — el usuario debe sentir que el tap "prendió" al instante. Barrer las cards y botones principales de los 7 pilares para que:
- El relleno/escala reaccione en `onPressIn` (no esperar el release).
- Haya estado `pressed` visible (opacidad o escala sutil, consistente con el design system).
- Cero doble-tap muerto (el bug que ya arreglamos en N-Back con RNGH — verificar que no viva en otras listas).
**No** re-arquitectar navegación; solo el tacto.

### 2 · Feedback pointer-down en las acciones de HOY *(P1)*
Las cards de acción de HOY (electrones, intervenciones, agenda) deben dar el mismo feedback inmediato. **Default:** aplicar el patrón del #1 a `ActionContentRenderer` y las cards del feed de HOY.

### 3 · Routing granular de HOY *(P1 — el más de fondo)*
Hoy varias acciones de HOY llevan a un destino genérico en vez del lugar exacto del dato. **Default:** cada acción del feed de HOY rutea al **destino específico** donde se resuelve/consulta (respeta la doctrina navegación-vs-consulta: un dato = un lugar). Ejemplos del patrón deseado:
- "Registra tu ayuno" → pantalla de ayuno con el estado de HOY, no al hub de nutrición.
- "Suplemento AM pendiente" → la toma específica, no a la lista completa.
- "Tu ventana de foco" → el destino del dato, no un genérico.
**Investigación de referencia (bakear el patrón, no copiar UI):**
- **Oura "one big thing"** — el día abre con UNA prioridad, no un muro de métricas. HOY debe empujar la acción #1 del día arriba de todo.
- **Whoop "score = coaching"** — el número no es decorativo; al tocarlo te dice QUÉ hacer. El ATP Score al tocarse debe llevar a la acción que más lo mueve hoy.
**Default de alcance:** CC audita el mapa actual de acciones→rutas de HOY, y arregla los ruteos genéricos a granulares. Si alguna acción no tiene destino granular claro, lo flagea (no inventa pantallas).

### 4 · Barrido de "coming soon" muertos en el loop *(P2)*
Cualquier item del loop diario que dispare `Alert('Pronto disponible')` o lleve a hueco → o se cablea si el destino existe, o se oculta hasta que exista (no dejar botones muertos que el usuario toca). **Default:** ocultar, no borrar el código.

## Fuera de alcance (NO tocar)
- Fitness (va en MB-3, corrida propia).
- Lógica de scoring del ATP Score / Edad ATP (solo el routing al tocarlo, no el cálculo).
- Nada que pida migración; si algo la pide, idempotente + RLS + flag a Cowork.

## Protocolo
`feat/mb15-loop-diario` desde `main` (post-MB-2), NO merge, `tsc` + tests verdes, delivery con checklist device. Cowork audita → merge → OTA.
