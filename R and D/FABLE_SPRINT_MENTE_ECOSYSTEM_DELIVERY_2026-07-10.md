# 🎸 DELIVERY — Sprint MENTE Ecosystem · el pilar completo pre-beta

**Fecha:** 2026-07-10
**Owner:** Fable (CCF5)
**Branch:** `feat/mente-ecosystem-pre-beta` (6 commits, listo para audit de Cowork)
**Buzón origen:** `FABLE_SPRINT_MENTE_ECOSYSTEM_2026-07-09.md`

---

## ⚠️ Hallazgo previo que cambió el plan (leer primero)

El "estado actual verificado" del buzón estaba desactualizado. Al auditar el código real:

- `app/breathing.tsx` (718 líneas) YA tenía biblioteca (5 técnicas) + timer con círculo animado + save a `mind_sessions` + electrones.
- `app/meditation.tsx` (446 líneas) YA tenía biblioteca (9 sesiones guiadas) + player por fases **con prompts textuales cronometrados** (exactamente lo que pedía T3).
- `app/checkin.tsx` (501 líneas) YA tenía un flujo RULER de 3 pasos (cuadrante → emociones → contexto) — muy superior a un slider 1-10.

**Decisión:** NO dupliqué rutas `/mente/breathwork` ni `/mente/meditacion` (dos players paralelos = la incongruencia que este sprint quiere matar). En su lugar: hub nuevo + upgrades quirúrgicos a lo existente hasta cubrir cada requisito del buzón. El valor entregado es el mismo (pilar completo); la arquitectura no se Frankensteineó.

---

## 📊 Tabla estándar

| # | Feature | Estado | Clave | Tests |
|---|---------|--------|-------|-------|
| T1 | MENTE hub principal | ✅ Completa | `app/mente.tsx`: 5 zonas editoriales (Journal con streak vivo · Respiración · Meditación · Check-in compacto con prompt del día · timeline "Últimas sesiones" mix de 4 fuentes) + botón Progreso. `MenteHubCard` editorial B/N con `imageBn` placeholder. habits-portal: 4 cards sueltas colapsadas en 1 → `/mente`. | +8 |
| T2 | Breathwork completo | ✅ Completa | +**Wim Hof Lite** (3 rondas, avanzado, contraindicaciones embarazo/cardíacas/agua) · coherencia ajustada a **5-5** · las 6 técnicas con level+benefit+contraindications+audioUrl placeholder · **anillo cambia de COLOR por fase** (verde inhala / azul retén / naranja exhala / azul profundo vacío) · card de contraindicaciones antes de iniciar · timer refactorizado sobre máquina de estados pura (`breath-timer-core`). | +13 |
| T3 | Meditación biblioteca | ✅ Completa | +4 sesiones **Silencio** (5/10/15/20 min, free-form) → total **13 sesiones** (4 silencio + 9 guiadas con prompts cronometrados, incluye body scan, focus, sleep-prep nocturno). `meditation-core` puro (scheduling de prompts + validación). Sin audio real; `audioUrl?` placeholder. | +10 |
| T4 | Check-in pulido | ✅ Completa | 10 **prompts del día** rotativos (deterministas por fecha, mismos en check-in y hub) · nota del check-in se guarda TAMBIÉN como mini-entrada de journal (`journal_type: 'checkin'` + tags cuadrante/emociones) · streak "🔥 N días seguidos escuchándote" en la pantalla de éxito · `day_changed` ya se emitía. | +8 |
| T5 | Streaks + medallas | ✅ Completa | Migración **165 aplicada al remoto y verificada** (tabla+RLS+policy+schema_migrations) · rachas de las 4 categorías con `computeJournalStreak` como motor genérico · medallas 7/30/90/365d con sync idempotente (diff puro + upsert ignoreDuplicates) · `/mente/progreso` con 4 cards de racha + vitrina de medallas + próxima medalla como objetivo. | +12 |

**Tests: 997 → 1048 (+51 · target era 1020+).** `npx tsc --noEmit` = 0 errores. Suite completa verde (120 archivos).

---

## ✅ Migración 165 — confirmación

Aplicada vía MCP `execute_sql` (no `apply_migration`, bug 42P10) + `INSERT INTO supabase_migrations.schema_migrations ('165','mente_medals')` (patrón anti-hueco). Verificación post-aplicación en remoto: `table_ok=1, policies=1, rls_on=true, migration_recorded=1`. Archivo idempotente en `supabase/migrations/165_mente_medals.sql`.

## 📱 Screens tocados (para testing de Enrique)

1. **`/mente`** (NUEVO) — hub del pilar. Entrada: Mi ATP → Hábitos → card MENTE.
2. **`/mente/progreso`** (NUEVO) — streaks + medallas (también vía el trofeo del hub).
3. **`/breathing`** — anillo con color por fase, tags nivel/beneficio, warning de contraindicaciones (pruébalo con Wim Hof Lite), haptic por fase.
4. **`/meditation`** — grupo "Silencio" arriba de la biblioteca.
5. **`/checkin`** — paso 3: PROMPT DEL DÍA + textarea; al guardar con nota revisa que aparezca en `/journal-history` con tag checkin; done screen muestra streak.
6. **Hábitos portal** — 4 cards MENTE → 1 card MENTE.

## 🖼 Placeholders que necesitan asset real

- **Imágenes editoriales B/N (MJ)**: hub MENTE acepta `imageBn` en cada card (hoy tipográficas puras — se ven terminadas). Card MENTE del habits-portal reusa `electrons/meditacion.png` temporalmente. Sugeridos: journal, breathwork, meditación, pilar MENTE.
- **Audio**: `audioUrl?: string` en BreathingTemplate y MeditationTemplate — sin audio real (licensing, según scope).

## ✍️ Copy para review de Enrique

1. **10 prompts del día** — `src/data/checkin-prompts.ts` (los 4 del buzón + 6 míos, tono directo).
2. **Benefits por técnica de respiración** — `src/data/breathing-library.ts` (`benefit`).
3. **Copy de contraindicaciones** — "No recomendado con: … Si aplica, consulta con un experto antes."
4. **Motivacionales de progreso** — `mente-streaks-core.ts` (`CATEGORY_COPY.motivation`, `streakCopy`) + quote de cierre en `/mente/progreso` ("La constancia no se negocia con motivación. Se construye con sistemas.").
5. **Sesiones de silencio** — copy de apertura/cierre en `meditation-library.ts` (factory `silenceSession`).

## 📝 Desviaciones del buzón (documentadas)

1. **Sin rutas `/mente/breathwork` ni `/mente/meditacion`**: el hub linkea a `/breathing` y `/meditation` existentes (con protocolos y deep links ya apuntando ahí). Los upgrades cubren TODO lo pedido para esas pantallas.
2. **Check-in sin slider 1-10**: el flujo RULER existente (cuadrante→emociones→contexto) es más rico que un slider; agregué encima lo que faltaba (prompt del día, puente a journal, streak). Rediseñarlo a slider habría sido un downgrade.
3. **Wim Hof Lite adaptado al motor de fases**: 3 ciclos de [60s respiraciones profundas ×30 → 60s retención sin aire → 15s retención con aire]. La versión guiada completa ya existía como meditación (`wim-hof-10`).
4. **Bibliotecas ahora PURAS** (color literal espejo de brand): permite que los tests validen los datos REALES, no fixtures.

## 🚩 Flags fuera de scope (no tocados)

- `app/mind-hub.tsx` quedó como ruta huérfana (nada navega a ella tras el colapso a `/mente`; ya no aparecía en ningún flujo antes tampoco). Candidato a eliminar en cleanup v1.5.
- La card "SUEÑO" del habits-portal sigue apuntando a `/reports` (TODO preexistente).

---

*Verificación final: tsc 0 errores · vitest 1048/1048 (120 archivos) · migración 165 aplicada+verificada · 6 commits en `feat/mente-ecosystem-pre-beta`.*

— Fable (CCF5), 2026-07-10
