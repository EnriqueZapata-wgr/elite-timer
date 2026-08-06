# 🔧 BRIEF · Mente V1.5.2 — polish device 2 (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mente-v152` desde `main` (ya trae V1.5.1 + MB-2 + MB-1.5). NO merge, tests verdes, Cowork audita.
**Origen:** device test de Enrique sobre el build **1.5.0** (V1.5.1 instalado, OTA corrido). **Casi todo OTA-able** (ver item 3: si tocar covers exige cambio de bucket/policy, eso NO es OTA — flaguéalo).
**Ventana de veto:** defaults bakeados abajo.

## Items

### 1 · N-Back skin ATP (matar el brutalist ELITE) *(P1)*
Enrique: el N-Back se ve muy "brutalist verde ELITE", no ATP. **Default:** re-skin editorial ATP (molde "Mis Datos": degradados + fondos editoriales, lime/teal como acento no como bloque plano) en **sesión, hub, stats y personalizar**. Referencia de doctrina: `project_design_system_atp_no_lime_brutalist`. **NO tocar la mecánica** (timing, scoring, RNGH) — solo la piel: colores, superficies, tipografía, jerarquía visual. Cero verde lime plano de fondo; el lime va como acento sobre superficie oscura con profundidad.

### 2 · Breakdown de errores por round *(P1 — feature nueva, idea de Enrique)*
Al cerrar cada round, mostrar el desglose **por canal**: cuánto fallaste en SONIDO y cuánto en POSICIÓN, con signo:
- **+X** = clicks de MÁS (comisión: señalaste un match que no era / te adelantaste).
- **−Y** = te FALTARON (omisión: no señalaste un match real).
- Un renglón por canal: `Sonido +2 / −1 · Posición 0 / −1` (formato a criterio del design system).
**El motor ya tiene la data:** `nback-core.ts` (`scoreChannel`/`evaluateRound`) ya distingue hits, falsos (comisión) y misses (omisión) por canal — esto es **display en la pantalla de resultados**, no cambio de scoring. Verifica que los conteos mostrados salgan de la misma fuente que el score (no recomputar aparte).

### 3 · Parpadeo de covers — fix de raíz (URL estable) *(P1)*
**Diagnóstico (confirmado):** el blanco ya murió (V1.5.1 ✓), pero persiste el swap genérica→real cada sesión porque las covers usan **URL firmada** cuyo token se regenera al reabrir la app → `expo-image` cachea por URI → URI nueva = caché miss = re-descarga = swap.
**Default:** las covers NO son premium → **servirlas con URL ESTABLE** (bucket público de covers, o URL pública/no-firmada), para que el caché de disco de `expo-image` pegue entre sesiones → swap solo la primera vez de por vida, no cada sesión. **Además, prefetch** de las covers al montar el hub/audioteca (`Image.prefetch`/expo-image prefetch) para matar también la primera. **⚠️ Si esto exige cambiar bucket/policy → NO es OTA, requiere coordinar (flaguéalo, no lo fuerces).** Si prefieres mantener firma: cachear la URL firmada de forma **persistente** (no solo en memoria) + prefetch — pero la pública es más limpia.
**Placeholder:** mientras carga, considerar **gradiente/blur** en vez de la foto genérica de categoría — así el usuario ve "cargando→cargado", no "imagen vieja→imagen nueva" (elimina la *percepción* de swap aunque haya latencia). El fallback foto se mantiene solo para offline.
**Reset de estado:** al cambiar de pieza, resetear el remoto a null para que no quede la cover ANTERIOR mientras baja la nueva (revisar `player.tsx` y `AudioPieceCard`).

### 4 · Respiración: cards editoriales + hereda el fix de covers *(P1)*
Hoy las respiraciones NO tienen cards editoriales (a diferencia de meditación). **Default:** estandarizar al mismo molde editorial de meditación (imagen + gradiente + velo + tipografía). `breathing.tsx` **no tiene ningún fix de covers** → al ponerle el molde con el patrón local-base+overlay del item 3, **matas el parpadeo de respiración de una** (dos pájaros: consistencia visual + fix del flicker).

### 5 · Silencio viejo fuera *(P2)*
Las piezas "Silencio 5/10/15/20 min" (`SIN GUÍA · SILENCIO`) son timers legacy, ya superados por el contenido real de meditación/respiración. **Default:** retirarlas de la audioteca. Si son filas en `audio_pieces` → preferir `.filter()` en la query (OTA-able) o, si va por migración, **idempotente** (soft-hide con flag, no DELETE destructivo). Código/data reversible.

## Protocolo
`feat/mente-v152` desde `main`, NO merge, `tsc` + tests verdes, delivery con checklist device. Cowork audita → merge → OTA (o build si el item 3 terminó tocando algo nativo/bucket — improbable, pero flaguéalo). Ojo: si el item 3 va por bucket público, coordinar el cambio de storage con Cowork ANTES.
