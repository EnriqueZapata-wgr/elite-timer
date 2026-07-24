# ✅ DELIVERY · Módulo N-Back (dual, piel ATP, economía integrada)

**Fecha:** 2026-07-23 · **Rama:** `feat/nback` (desde `main`, 4 commits)
**Estado:** `tsc` 0 errores, **1993 tests verdes (+18: 17 motor + 1 patrón HOY)**, eslint 0 errores en tocados. **NO mergeado — Cowork audita.**
**Entrega:** JS + migración 218 → **`db push` ANTES del OTA** (la card de HOY y el insert de rounds usan `nback_sessions.date`). ⚠️ La rama `feat/mente-ajuste-v2` (sin mergear) usa migs 214–217 — por eso esta es la **218**; al mergear ambas no chocan.

## Reconciliación (spec nuevo vs #6/#44/mig 197) — decisiones tomadas

| Tema | Resolución |
|---|---|
| Regla adaptativa | **75/90 de la referencia** (spec nuevo, verbatim; sus barras de resultados marcan 75/90). Supersede el 80/50 Brain Workshop del spec #6. |
| N inicial | Decisión #44-1: **tutorial N=1 forzado** con 0 sesiones; después `resume_mode` (last default / best / restart) en settings. `N_START=2` respeta el default de la mig 197. |
| Timeout | #44-2: **3s por trial** a 1x; speed (1x/1.5x/2x) divide. Estímulo visible 500ms. |
| Letras | Set fónico MX del spec nuevo: **A O U F L M R S** (no C,H,K… del spec viejo — Enrique graba el nuevo set). |
| Modo daltónico (#44-4) | El norte UX es **B/N por posición** (cuadro blanco en grid): cero discriminación por color requerida → inclusivo por diseño. El sistema color+forma de #44-4 aplicaba a diseños con color como estímulo; no se contradice, queda innecesario en esta piel. Anotado para review. |
| Leaderboard | Mig 197 prohíbe lectura cross-user de estas tablas → tab Ranking = **PRONTO** (requiere opt-in público vía Comunidad). Percentiles SÍ (RPC agregada, cero filas ajenas). |
| Dónde vive | **Dentro de Mente** (rutas `app/mente/nback/*` del spec #6): card en el hub + full-focus automático (`isMentePillarPath` ya cubre `/mente/*`). |
| e- gate (spec §5 lo pedía definir) | **e- 2.5 al PRIMER round del día** (marca card HOY/racha — patrón meditación, once/día key determinística). **H+ +5 al completar los 12 rounds** (la "sesión completada" de #44-5). |
| Sesión/estructura | Round = 20 trials evaluables + N de arranque (fila por round en `nback_sessions`, como manda la 197) · 12 rounds/día · reto 20 días. |

## Qué se construyó

1. **Motor puro `nback-core.ts` (17 tests):** generación de secuencias (2 canales, ≥6 matches forzados por canal — con fix real: forzar en orden ascendente, fuera de orden un write en `j==i−n` rompía matches ya forzados), scoring hit/miss/false → accuracy `hits/(total+falses)`, regla 75/90 con piso N=1 y sin techo, startingN (#44-1), racha por días, badges 🌱→🌟 (#44-5), reto 20 días, timing.
2. **Audio `nback-audio.ts`:** pool de players expo-audio para las 8 grabaciones + **fallback TTS es-MX (expo-speech, ya en el binario)** mientras llegan. Swap = poner los archivos en `assets/audio/nback/` y llenar `LETTER_ASSETS` (manifest con require) — el juego no cambia. Lazy imports (doctrina nativos).
3. **Mig 218 (idempotente):** `nback_sessions.date` (fecha local del cliente, regla #3) + índice; `challenge_started_on`; **`claim_nback_protons(p_date)`** — H+ de #44-5 (+5 día completo, +50 nuevo PR por valor de N, +100 racha 7, +500 racha 30) **server-derivado** (el cliente no elige montos) e idempotente vía `proton_transactions.idempotency_key` (094); **`nback_percentiles()`** agregada-only. `award_protons` (091, service_role) intacto.
4. **Servicio `nback-service.ts`:** settings device-local (speed/feedback/resume_mode — las letras NUNCA se apagan, #44-3), estado, `completeNBackRound` (fila + estado + e- + claim H+ + emits regla #5/#6), stats del reto, percentiles.
5. **HOY:** e- `nback` (2.5, patrón 3 lugares completo: ELECTRON_WEIGHTS + MANDATORY_BOOLEANS + VERIFIED con conteo real de `nback_sessions` + ruta `/mente/nback`). Card verificada para todos los usuarios — es lo que manda el spec §5 ("mismo patrón que meditación"); **ojo producto: entra al denominador del día de todos** (revisable en device).
6. **4 pantallas** (`/mente/nback`, `/sesion`, `/stats`, `/como-jugar`): home con week-strip + card Reto 20 días + card Hoy 0/12 + settings + copy de auriculares (#44-3); sesión full-black (countdown "¿Listo? / En posición. / ¡Va!", grid 3×3 con crosshair, botones circulares POSICIÓN/SONIDO, feedback verde/rojo degradable, salida con confirmación); resultados con barras y marcas 75/90 + cambio de nivel + rounds restantes + chips de e-/H+; stats 3 tabs (resumen con percentiles, reto con curva SVG de N + promedios, ranking PRONTO); tutorial 5 pasos → primera sesión N=1.

## Pendiente / notas

1. **🎙️ Las 8 grabaciones**: no estaban en `output/mente/` (busqué `nback_*` — cero). El fallback TTS suena YA; cuando Enrique las pase → normalizar, `assets/audio/nback/nback_<letra>.m4a`, llenar `LETTER_ASSETS` (10 min de cableado). Metro ya soporta m4a (assetExts default).
2. **Cronotipo push** (spec #6 opcional): fuera de este run.
3. Chime de acierto/level-up (spec §6 opcional): háptica ATP cubre el feedback; audio de chime cuando haya asset.
4. `app.json` sigue con su diff sucio pre-existente sin commitear.
5. Orden post-merge: audit → merge → `npx supabase db push` (218; si el wrapper falla, MCP `execute_sql`) → OTA.

## 📱 Device tests

1. Hub Mente → card N-Back → home: week-strip, reto en 0, "APRENDER A JUGAR" (primera vez) → tutorial → sesión N=1.
2. Sesión: letras se escuchan (TTS por ahora), celda ilumina 500ms, 3s por trial (1.5x/2x aceleran), un press por canal por trial, feedback verde/rojo (y OFF en settings lo apaga).
3. Resultados: brincar respuestas → <75% → nivel baja (piso 1); clavar ambos ≥90% → sube; barras con marcas.
4. Economía: 1er round del día → chip "+2.5 e-" y card N-BACK de HOY palomea; 12 rounds → "+5 H+"; subir best_n a 3 → "+50 H+" una sola vez (repetir round no re-otorga).
5. Racha: rounds en días consecutivos suben streak; día 7 → "+100 H+".
6. Stats: percentiles responden (con 1 usuario = 100%), curva del reto pinta, Ranking muestra PRONTO.
7. Full focus: cero flotantes ARGOS/home en todo `/mente/nback/*`.
