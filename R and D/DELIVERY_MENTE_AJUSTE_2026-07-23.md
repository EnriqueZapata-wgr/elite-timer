# ✅ DELIVERY · Ajuste Mente post-overhaul

**Fecha:** 2026-07-23 · **Rama:** `feat/mente-ajuste` (desde `main` con el overhaul)
**Estado:** `tsc` 0 errores, **1975 tests verdes (197 archivos)**, eslint 0 errores en tocados. **NO mergeado — Cowork audita.** Cero migraciones, 100% cliente → **OTA**.

## Ajuste 1 · Hub 100% menú + últimas sesiones por sección

- **Hub (`app/mente.tsx`):** strip "Últimas sesiones" **muerto** (+ su fetch de `recent`, estilos y imports). El hub queda solo cards de navegación; los subtítulos de contexto ("Última hace 2h") se conservan — son parte de la card editorial, no datos sueltos.
- **Componente nuevo `src/components/mente/MenteRecentSessions.tsx`:** bloque compacto "TUS ÚLTIMAS SESIONES" (5 filas: nombre · min · rondas · hace cuánto), filtrado por tipo de `mind_sessions`, se oculta si no hay datos. Refresca con `useFocusEffect`.
- **Meditación:** bloque con `type="meditation"` (incluye las de descanso — mismo type, consistente con la doctrina del Ajuste 2).
- **Respiración:** bloque con `type="breathing"` — **reemplaza** el "HISTORIAL RECIENTE" inline que ya tenía (menos código duplicado, mismo dato); el helper local `formatRelativeDate` murió a favor del `formatRelativeTime` compartido.
- Favoritas: NO tocado (fast-follow de Cowork, como manda el brief).

## Ajuste 2 · Descanso plegado en Meditación

- **`/mente/descanso` muerto:** pantalla borrada, `Stack.Screen` fuera, typed routes limpiadas (patrón espejo, 0 ocurrencias residuales; `expo start` regenera idéntico).
- **Hub:** Meditación · Respiración · Journal · Check-in. Card Meditación ahora dice "Guiadas · descanso · silencio".
- **`app/meditation.tsx`:** tres secciones internas — **GUIADAS** (`meditacion`) · **PARA DORMIR Y DESCANSAR** (`descanso`, solo si hay piezas) · **SIN GUÍA · SILENCIO** (timer intacto). La categoría `descanso` en DB se conserva (solo agrupa UI).
- Consistencia resuelta: `sessionTypeFor('descanso') → 'meditation'` ya no es un flag heredado — Descanso ES meditación por decisión de producto (sin cambio de código ahí).
- Tests de floating-cores: referencias a `/mente/descanso` actualizadas a `/mente/progreso` (el prefijo `/mente` sigue cubriendo todo el pilar).

## Notas

1. `app.json` sigue con su diff sucio pre-existente sin commitear (mismo del delivery del overhaul — pendiente decisión).
2. El delivery del overhaul menciona `/mente/descanso` como entregado — histórico, este ajuste lo supersede.

## 📱 Device tests

1. Hub: 4 cards, sin strip de sesiones, sin card Descanso; banner/blur igual que el overhaul.
2. Meditación: secciones Guiadas / Para dormir y descansar (NSDR + Pausa 1 min) / Silencio + "Tus últimas sesiones" abajo (aparece tras la primera sesión).
3. Respiración: "Tus últimas sesiones" con rondas donde aplique (mismo dato que el historial viejo).
4. Una pieza de descanso (NSDR) reproduce desde Meditación, otorga e- de meditación y palomea la card de HOY.
