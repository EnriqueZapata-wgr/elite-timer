# 🎸 FABLE SPRINT — MENTE Ecosystem · el pilar completo pre-beta

**Fecha:** 2026-07-09 tarde-noche → 2026-07-10 AM
**Estimado:** 10-12h · sprint grande overnight
**Deadline hard:** sábado 2026-07-11 noche (beta a testers prime)
**Owner:** Fable (CCF5)
**Contexto:** MAGIA ARGOS 2.0 cerrada exitosamente. Enrique aprobó sprint MENTE. Objetivo: convertir el pilar MENTE de "features sueltas" en **ecosystem completo** que un tester wellness perciba como "app terminada".

---

## 🎯 Filosofía del sprint

El módulo MENTE actualmente tiene piezas sueltas: journal, check-in, algo de breathwork básico. Testers profesionales (nutriólogas, coaches wellness) notarán la incongruencia. **Un pilar COMPLETO señala calidad al resto de la app.**

Filosofía: no hacemos MÁS features. Cerramos lo que hay + agregamos lo esencial + tejemos el ecosystem cross-referencing.

Estética: editorial ATP (B/N + acento lima), sensibilidad emocional (esto es MENTE — respeto y calma en cada interacción).

---

## 📖 Estado actual verificado

**Existente:**
- `app/journal.tsx` + `app/journal-history.tsx` (marathon V1.4 F3) — Journal composer + historial con filtros ✅
- Tabla `journal_entries` (033) con mood_before/after + tags ✅
- Tabla `mind_sessions` (049) genérica breathing/meditation/checkin ✅
- Tabla `emotional_checkins` (006) ✅
- `journal-service.ts` + `journal-logic.ts` ✅

**Gaps a cerrar:**
- Screen HUB MENTE (no existe pantalla que junte todo)
- Breathwork sin biblioteca ni timer visual
- Meditación sin biblioteca ni audios
- Check-in emocional no está integrado al journal
- No hay streaks/medallas cross-MENTE

---

## 🔨 Deliverables (5 tasks)

### T1 — Screen MENTE hub principal (2-3h)

Nuevo archivo `app/mente.tsx` (o `app/(tabs)/mente.tsx` si prefieres tab, aunque bottom nav es 3 tabs ahora — va como pantalla accesible desde Mi ATP).

**Estructura visual (5 cards editoriales B/N):**

1. **Card JOURNAL**
   - Imagen editorial B/N
   - Título: "Journal"
   - Subtítulo dinámico: streak actual + última entrada
   - Tap → `/journal-history`
   - Botón CTA: "Nueva entrada" → `/journal`

2. **Card BREATHWORK**
   - Imagen editorial B/N
   - Título: "Respiración"
   - Subtítulo: "4 técnicas · última sesión hace X"
   - Tap → `/mente/breathwork`
   - CTA: "Empezar sesión"

3. **Card MEDITACIÓN**
   - Imagen editorial B/N
   - Título: "Meditación"
   - Subtítulo: "biblioteca inicial · streak actual"
   - Tap → `/mente/meditacion`
   - CTA: "Sesión guiada"

4. **Card CHECK-IN EMOCIONAL**
   - Compact card horizontal
   - "¿Cómo estás hoy?" con emoji + slider inline (mini)
   - Tap → detalle expandido con prompt del día

5. **Card "Últimas sesiones"** (bottom)
   - Timeline scroll horizontal con últimas 10 sesiones mix (breathing/meditation/journal/checkin)
   - Cada mini-card muestra: tipo + timestamp + duration

**Imágenes MJ necesarias:**
- 3 imágenes B/N nuevas (journal, breathwork, meditación) si no existen — placeholders OK si no hay tiempo, luego Enrique genera con MJ.

**Archivos:**
- `app/mente.tsx` (nuevo)
- `src/components/mente/MenteHubCard.tsx` (nuevo)
- Actualizar `app/kit.tsx` o "Mi ATP" para agregar link a MENTE

### T2 — Breathwork biblioteca + timer visual (3-4h)

Nueva ruta `/mente/breathwork` (index) + `/mente/breathwork/[technique]` (player).

**4 técnicas iniciales:**

1. **4-7-8** — Inhala 4s / retén 7s / exhala 8s (calming)
2. **Box Breathing** — 4-4-4-4 (focus, Navy SEALs)
3. **Coherencia 5-5** — 5s inhala / 5s exhala (HRV optimization)
4. **Wim Hof Lite** — 30 respiraciones profundas + retención breath-hold (energizing)

Cada técnica:
- Card editorial con imagen + descripción + duración recomendada + beneficio principal
- Nivel principiante/intermedio/avanzado
- Contraindicaciones (embarazo, condiciones cardíacas) — ver [[project_atp_embarazo_modulo]]

**Timer visual (T2 killer feature):**
- Anillo grande centrado que respira: crece en inhala, mantiene en retención, decrece en exhala
- Color cambia por fase: verde inhala / azul retención / naranja exhala
- Texto fase encima: "Inhala" / "Retén" / "Exhala"
- Contador de ronda: "3 / 8"
- Botón pausa/reanudar + salir
- Al terminar: modal "Sesión completada · X segundos · Y rondas" + botón "guardar" que inserta en `mind_sessions`

**Audio opcional:**
- No requiere audio grabado por ahora (evitar complejidad de licencias). Solo haptic feedback en cada fase (opcional toggle).
- Placeholder: dejar props `audioUrl?: string` para futuro.

**Archivos:**
- `app/mente/breathwork.tsx` (biblioteca)
- `app/mente/breathwork/[technique].tsx` (player)
- `src/constants/breathwork-techniques.ts` (4 técnicas hardcoded)
- `src/components/mente/BreathTimer.tsx` (visual timer con Reanimated)
- `src/services/breathwork-service.ts` (save sessions)
- Tests: +8 (technique validation, timer logic core, save session)

### T3 — Meditación biblioteca inicial (2-3h)

Nueva ruta `/mente/meditacion` (biblioteca) + `/mente/meditacion/[session]` (player).

**8 sesiones iniciales:**

Free-form:
1. Silencio 5 min
2. Silencio 10 min
3. Silencio 15 min
4. Silencio 20 min

Guiadas (SOLO placeholder por ahora — sin audio real, solo timer con prompts textuales):
5. Body scan 10 min
6. Metta / compasión 10 min
7. Focus / atención 5 min
8. Sleep prep 15 min

**Sesión player:**
- Timer visual minimalista (círculo con progreso)
- Prompts textuales aparecen cada 60-120s para las guiadas (frases editoriales cortas)
- Botón pausa + salir
- Al terminar: "Guardar sesión" → `mind_sessions`

**NO usar audio real** por ahora (evitar licensing hell). Puedes:
- Dejar `sound: 'silence'` para free-form
- Para guiadas usar prompts textuales que aparecen cronometrados
- Placeholder `audioUrl?` para futuro

**Archivos:**
- `app/mente/meditacion.tsx` (biblioteca)
- `app/mente/meditacion/[session].tsx` (player)
- `src/constants/meditation-sessions.ts`
- `src/components/mente/MeditationTimer.tsx`
- `src/services/meditation-service.ts`
- Tests: +6

### T4 — Check-in emocional pulido (60-90 min)

Refactor del check-in emocional existente (ver `emotional_checkins` tabla 006).

**Nuevo UX:**
- Compact card en HOY (probablemente ya existe)
- Expanded modal:
  - Slider mood 1-10 con emoji dinámico
  - Prompt del día (rotativo, editorial ATP tone)
  - Textarea opcional (mini journal)
  - "Guardar" → `emotional_checkins` + opcionalmente crear entry en `journal_entries` con tag `checkin`
- Streak de días consecutivos con check-in

**Prompts del día (10 rotativos):**
- "¿Qué te está pesando hoy?"
- "¿Qué te dio energía en las últimas 24h?"
- "Una cosa que sí y una que no."
- "¿Cómo está tu cuerpo ahora mismo?"
- (etc. 6 más — Enrique review después)

**Archivos:**
- `src/components/mente/EmotionalCheckinCard.tsx`
- `src/components/mente/EmotionalCheckinModal.tsx`
- `src/services/emotional-checkin-service.ts` (si no existe)
- Tests: +4

### T5 — Streaks + ecosystem cross-MENTE (60-90 min)

Componente global de streaks para MENTE.

**Streaks a calcular (via SQL o cliente):**
- `journal_streak` — días consecutivos con al menos 1 entry
- `breathing_streak` — días consecutivos con al menos 1 mind_session type=breathing
- `meditation_streak` — días consecutivos con al menos 1 mind_session type=meditation
- `checkin_streak` — días consecutivos con al menos 1 emotional_checkin

**Vista de progreso MENTE:**
- Nueva screen `/mente/progreso` o sección dentro del hub
- 4 mini-cards con streak counter cada uno
- Medallas visuales al llegar a: 7 días · 30 días · 90 días · 365 días
- Copy motivacional editorial ATP style

**Migración 165 — medallas (si no existe):**
```sql
-- 165_mente_medals.sql
CREATE TABLE IF NOT EXISTS mente_medals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('journal', 'breathing', 'meditation', 'checkin')),
  tier TEXT NOT NULL CHECK (tier IN ('7d', '30d', '90d', '365d')),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category, tier)
);
ALTER TABLE mente_medals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_mente_medals" ON mente_medals;
CREATE POLICY "own_mente_medals" ON mente_medals FOR ALL USING (auth.uid() = user_id);
```

Aplicar via MCP `execute_sql` + INSERT en schema_migrations (patrón anti-hueco de [[reference_supabase_migration_gap]]).

**Archivos:**
- `app/mente/progreso.tsx`
- `src/services/mente-streaks-service.ts`
- Tests: +5 (streak calculations)

---

## 🧪 Tests requeridos (+23 mínimo)

Baseline actual: 997. Target: 1020+.

- Breathwork: technique validation, timer state machine (core), save session
- Meditation: session validation, timer + prompt scheduling
- Check-in: prompt rotation, streak calculation
- Medals: award logic (test cuando llega a 7d/30d/90d)

---

## ⚠️ Reglas técnicas no negociables (CLAUDE.md)

1. **NO reescribir archivos completos** — str_replace quirúrgico
2. **NO usar crypto.randomUUID** — `generateUUID` helper
3. **`getLocalToday()` / `parseLocalDate()`** para date queries (regla #3)
4. **Migración 165 idempotente** — `IF NOT EXISTS` + RLS obligatorio
5. **Aplicar migración 165 al remoto tú mismo** via MCP execute_sql + INSERT schema_migrations (patrón anti-hueco)
6. **DeviceEventEmitter.emit('day_changed')** después de check-in / journal (regla #6)
7. **npx tsc --noEmit → 0 errores** antes de push
8. **5 commits granulares** — uno por task
9. **Estética editorial ATP** — B/N + acento lima, sensibilidad emocional
10. **Contraindicaciones respetadas** — Wim Hof advertencia embarazo/cardiacas

---

## 🚫 Fuera de scope (NO hacer)

- ❌ Audio grabado real (licencias, complejidad, tiempo)
- ❌ CO2/O2 adaptativos avanzados (backlog #73 full — v1.5)
- ❌ MENTE Customer Journey audit (#74 — v1.5)
- ❌ Rediseñar journal composer existente
- ❌ Multimodal (voz para journal) — post-beta

---

## 📦 Deliverable final (buzón de vuelta)

En `R and D/FABLE_SPRINT_MENTE_ECOSYSTEM_DELIVERY_2026-07-10.md`:

Tabla estándar Fable:
```
#: T1
Feature: MENTE hub principal
Estado: ✅ Completa
Clave: <resumen>
Tests: +N
```

Al final:
- Branch: `feat/mente-ecosystem-pre-beta`
- Migración 165 aplicada al remoto (confirmar)
- Screens tocados (para testing Enrique)
- Placeholders/mocks que necesitan asset real (imágenes MJ, audio futuro)
- Copy que necesita review de Enrique (prompts check-in, textos motivacionales)

---

## 🤝 Contexto colaborativo

- **Deadline sábado noche = beta a testers prime.** Este es el pilar visible que decide.
- **Cowork trabajando en paralelo** en beta launch infrastructure + copy propuestas.
- **NO tocar** MAGIA ARGOS componentes (Fable ya cerró v2.0).
- Si detectas bugs preexistentes CRÍTICOS que no son tu scope, flaguéalos en el buzón pero NO los fixees.

## 💛 Nota estratégica

Testers wellness verán MENTE. Si perciben "pilar completo", perdonan gaps en Fitness/Nutrición. Si perciben "otro módulo incompleto", el rating baja.

Este sprint es 30% del tiempo restante pero 50% del veredicto de los testers.

Brilla. 12h de flow te devuelven un módulo completo.

— Cowork (Opus 4.7)
