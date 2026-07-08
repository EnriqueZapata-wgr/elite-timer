# FABLE 5 CC — SPRINT POLISH V1.3

**Kickoff:** 2026-07-07 mañana
**Autor:** Cowork
**Working directory:** `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable`
**Branch:** `feat/v13-polish-hero-argos` desde main
**Objetivo:** 6 features de polish/UX que dan value inmediato · sin deps externas · testeables 100% en simulator

---

## 🚨 REGLAS DE ORO

1. **NO OTA / NO BUILD** — solo merge+push. Enrique testea en batch cuando termines TODO.
2. Verifica `pwd` + `git branch --show-current` antes de cada commit.
3. Cowork trabaja en paralelo en main worktree — NO tocar ese directorio.
4. Migraciones range: 157-199 (Cowork ya usó 100-102).
5. Migraciones idempotentes obligatorias.
6. `npx tsc --noEmit` = 0 antes de cada commit.

**Setup inicial (obligatorio):**

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable
git pull origin main   # trae TODO lo mergeado hoy (tus 5 commits + mis Cowork changes)
npm install
npx tsc --noEmit       # baseline 0 errores esperado
vitest run             # baseline 708/708 esperado
git checkout -b feat/v13-polish-hero-argos
```

---

## 📋 SCOPE — 6 FEATURES

### F1 · Recomendación HERO dinámica en HOY (#68)

**Objetivo:** el top de HOY cambia según contexto del usuario (hora + hábitos + edad ATP + progreso). Actualmente es estático.

**Sistema de reglas locales (~20 reglas):**

Reglas por CONTEXTO horario:
- Mañana (5-11am): "Empieza tu día con sol matutino" · "Toma tu proteína desayuno" · "Ayuno IF activo — no rompas todavía"
- Mediodía (11am-3pm): "Hora de hidratación intensa" · "Rompe el ayuno con proteína" · "Check-in emocional"
- Tarde (3-7pm): "Ejercicio de la tarde" · "Segunda comida balanceada"
- Noche (7-11pm): "Lentes rojos + reduce pantallas" · "Meditación + journal" · "Cortar cafeína"

Reglas por HÁBITO faltante hoy:
- Sin agua registrada + >10am: "Bebe tu primer vaso"
- Sin proteína registrada + >11am: "Agrega proteína ahora"
- Sin sol registrado + <11am + días soleados: "Sal 10 min al sol"

Reglas por PROGRESO edad ATP:
- Edad ATP > cronológica: "Foco en biomarcadores esta semana"
- Edad ATP <= cronológica: "Sigues joven — mantén el ritmo"
- Sin edad ATP calculada: "Completa tus tests para conocer tu Edad ATP"

Reglas por CICLO (si mujer + regular):
- Fase folicular: "Fase de energía alta — enfoca entrenamiento intenso"
- Fase lútea: "Cuida el descanso — considera baja intensidad"
- Fase menstrual: "Escucha tu cuerpo — nutrición extra hierro"

Reglas por STREAK:
- Streak >7 días: "🔥 Racha de {days} días — no la pierdas"
- Streak roto ayer: "Nuevo día, nueva racha — puedes recuperarte"

**Implementación:**

- `src/services/hero-recommendation-service.ts` — función pura `getHeroRecommendation(user_context)`
- Reglas en un array declarativo con `condition`, `priority`, `title`, `subtitle`, `cta`, `route`
- Se ejecutan de arriba a abajo — la primera que matchea gana
- Fallback: mensaje genérico editorial
- Refresh cada vez que HOY se enfoca (useFocusEffect)
- Cache 15 min para evitar cambios erráticos

**Wire:** en `app/(tabs)/index.tsx` (HOY) donde vive el hero actual, reemplazar contenido estático por lo que devuelve el service.

**Tests:** unit tests de cada regla con inputs distintos (min 15 test cases).

**Deliverable F1:** service + wire + tests + 0 errores tsc.

---

### F2 · ARGOS Chat UX fixes (#93)

**Bugs conocidos:**

- **F2.1 Auto-scroll:** al llegar mensaje nuevo o al enviar, la lista NO scrollea al último mensaje automáticamente. User tiene que scrollear manual. **Fix:** en `FlashList`/`FlatList` de mensajes, usar `scrollToEnd({ animated: true })` en effect cuando `messages.length` cambia.

- **F2.2 Historial de conversaciones:** actualmente al cerrar app y volver, no ves conversaciones pasadas — solo la actual. **Fix:** pantalla `/argos/conversations` con lista de conversaciones anteriores (leer `argos_conversations` table). Tap → carga esa conversación. Botón "Nueva conversación" en argos-chat header.

- **F2.3 Polish general:**
  - Timestamp discreto entre mensajes cuando diferencia >5 min
  - Indicador "ARGOS está pensando..." con dots animados (haptic light al terminar)
  - Botón "Copiar" en press-hold del mensaje
  - Long-press mensaje del user → "Editar y reenviar"

**Deliverable F2:** auto-scroll + pantalla historial + polish. 0 errores tsc.

---

### F3 · Top banner persistente HOY + ARGOS (#23)

**Concepto:** banner sutil arriba de HOY y ARGOS con info contextual del user.

**Contenidos rotativos (3 variantes, cambia cada 15s):**

1. **Trial countdown** (si en trial):
   - "Trial ATP Pro · quedan {days} días" · botón "Ver planes"
   - Colores lima al día 14, ámbar días 7-3, rojo días 2-0

2. **Racha activa** (si streak > 3):
   - "🔥 Racha de {days} días" · sin CTA

3. **Protones ganados hoy** (si > 0):
   - "+{count} H⁺ hoy" · botón "Ver Shop"

4. **Notificación importante pending** (si hay unread en inbox):
   - "🔔 {n} notificaciones sin leer" · botón "Ver"

5. **Insight ARGOS del día** (si generado):
   - "💡 Insight de hoy" · botón "Ver"

**Implementación:**

- `src/components/global/TopBanner.tsx` — auto-rotate cada 15s, dismissable (persist localStorage)
- Priority system: si algo es CRÍTICO (trial <3 días, notif importante), esa variante gana y NO rota
- Editorial ATP style
- Solo visible en HOY y ARGOS (NO en Ajustes u onboarding)

**Deliverable F3:** componente + wire en HOY + wire en ARGOS chat. 0 errores tsc.

---

### F4 · Sonidos EDAD ATP (#69)

**Contexto:** actualmente el cálculo de edad ATP es silencioso. Agregar sonidos sutiles para dar sensación premium.

**Sonidos a agregar (usar expo-audio, ya en deps):**

- **Tick sutil** durante cálculo (cada segundo mientras carga, 1-3 ticks)
- **Chime reveal** cuando el resultado aparece (0.5s, editorial sutil)
- **Ding mejora** si tu edad ATP bajó vs anterior (contexto positivo)

**Assets:** placeholder de sonidos. Fable elige entre freesound.org (CC0) O sintetiza básicos con `Tone.js` (no ideal en RN)... **mejor:** usa 3 archivos free CC0 y ponlos en `assets/sounds/`:
- `sounds/edad-atp/tick.mp3` (~200ms)
- `sounds/edad-atp/chime.mp3` (~500ms)
- `sounds/edad-atp/improve.mp3` (~600ms)

Como alternativa si no encuentras assets adecuados, usa haptics + un solo chime genérico. Documenta la decisión.

**Wire:** en `app/edad-atp/result.tsx` (o donde vive el reveal).

**Nice-to-have:** toggle "Sonidos ATP" en Settings > Sonidos.

**Deliverable F4:** wire + audio files + toggle setting. 0 errores tsc.

---

### F5 · Notificaciones nativas config UI granular (#61)

**Contexto:** actualmente notifs on/off global. Enrique quiere control granular per módulo + modos.

**Migración 157:** agregar columnas a `user_notification_prefs` (o crear tabla nueva si no existe):

```sql
CREATE TABLE IF NOT EXISTS user_notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard', 'adaptive_argos', 'silent')),
  agenda_enabled BOOLEAN NOT NULL DEFAULT true,
  argos_enabled BOOLEAN NOT NULL DEFAULT true,
  streak_enabled BOOLEAN NOT NULL DEFAULT true,
  community_enabled BOOLEAN NOT NULL DEFAULT true,
  system_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  dnd_during_consultation BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_notification_prefs ENABLE ROW LEVEL SECURITY;
-- policies own_select/own_upsert/own_update...
```

**Pantalla:** `app/settings/notifications.tsx`

Modos (radio):
- **Standard:** notifs normales según toggles
- **Adaptive ARGOS:** ARGOS decide cuándo notificar (menos ruido, más relevante) — requiere Pro
- **Silent:** solo notifs críticas (sistema, expiraciones)

Toggles por tipo:
- Agenda (próximo evento, recordatorios)
- ARGOS (insights, mensajes proactivos)
- Rachas / Streaks
- Community (challenges, referidos, clínico)
- Sistema (renovación, actualizaciones)

Quiet hours: hora inicio + hora fin con slider

DND automático durante consulta clínica (V1.5+): checkbox

**Enforcement:** en el dispatch de notifs (Edge Function `dispatch-agenda-notifications`), check antes de disparar.

**Deliverable F5:** migración + pantalla + wire dispatch. 0 errores tsc.

---

### F6 · Cleanup helpers muertos sprints A/B/C/D (#26)

**Concepto:** durante sprints A-F, se crearon helpers que después fueron reemplazados. Grep + limpieza.

**Estrategia:**

1. Correr en Fable-workspace:
   ```bash
   # Find posibles unused
   npx ts-unused-exports tsconfig.json
   ```
2. Revisar output — si algo está declarado exported pero nadie lo importa, candidato a eliminar
3. También grep manualmente por:
   - Archivos con nombres tipo `*.old.ts`, `*.legacy.ts`, `*.deprecated.ts`
   - Componentes con `// TODO: delete after X`
   - Servicios que llaman a tablas que ya no existen

**Cuidado:**
- NO eliminar código que sí se usa (verificar con grep antes)
- NO eliminar type definitions que se usan solo en tests
- NO tocar backend (edge functions) sin verificar deploy

**Objetivo:** -500 a -2000 líneas de código muerto. Reporta el neto.

**Deliverable F6:** commit(s) de cleanup con lista de archivos borrados/simplificados. 0 errores tsc + todos los tests siguen passing (708+).

---

## 📦 ENTREGABLES

Al terminar, en branch `feat/v13-polish-hero-argos`:

1. Commits limpios por feature (F1, F2, F3, F4, F5, F6)
2. Tabla estándar (feature × commits × migraciones × verificaciones)
3. Migración 157 aplicada al remoto
4. `npx tsc --noEmit` = 0 errores
5. `vitest run` = todos passing (baseline 708 + tus tests nuevos)
6. Push a origin, listo para audit Cowork
7. Reporte de decisiones de criterio con razones
8. Scope no cerrado listado (con por qué)

## 🎯 ESTIMACIÓN

- F1 HERO dinámico: 2-3h
- F2 ARGOS chat UX: 2h
- F3 Top banner: 1-2h
- F4 Sonidos EDAD ATP: 1h
- F5 Notif config UI: 2h
- F6 Cleanup: 1-2h
- **Total: 9-12h**

Si algo sale más chico/grande, ajusta y avisa. Si algo bloquea, salta y sigue.

## 🚫 FUERA DE SCOPE

- RevenueCat / IAP (Cowork lleva en paralelo — Enrique setea Apple/Google dashboards)
- Backend ARGOS / argos-proxy (Cowork)
- HUB Fx / backend clínico v1.5 (no aplica)
- Onboarding v2 (ya terminado)
- Compliance stuff (ya terminado)
- Web assets (Cowork ya hizo)

## 🏁 KICKOFF

Fable:

1. Setup arriba
2. Arranca F1 (HERO dinámico) — impacto visual inmediato
3. Después F3 (Top banner) — parecido al F1, aprovechas el momentum
4. Después F5 (Notif config) — el más denso con migración
5. F2 ARGOS chat UX
6. F4 Sonidos EDAD ATP
7. F6 Cleanup al final

Reporta con tabla estándar cuando termines todo. Sin OTA. Solo merge+push.

Cowork paralelo prepara RevenueCat + guía a Enrique con Apple/Google/RevenueCat setup para el próximo sprint tuyo.

**Rock and roll.** 🎸
