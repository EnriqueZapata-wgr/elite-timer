# 🎸 FABLE SPRINT — MAGIA ARGOS · Jarvis en el bolsillo

**Fecha:** 2026-07-08 (noche, arranca ~10:30 PM)
**Estimado:** 7-8h · sprint grande overnight
**Owner:** Fable (CCF5)
**Contexto:** Enrique detuvo el submit stores. La app funciona pero "aún no se siente como el producto que la gente ama". Este sprint cambia eso.

---

## 🎯 Objetivo mayor

**Transformar ARGOS de "chat inteligente" en "presencia real cross-app".** El momento cuando el usuario abre ATP y siente que ARGOS lo conoce, lo saluda por nombre, sabe la hora, sabe qué está mirando, y tiene personalidad — ese es EL diferenciador de ATP.

Filosofía Enrique: **"Ingeniería Humana."** ARGOS es la firma. Multimodal + contextual + proactivo + con cara.

Filosofía sprint: NO estamos haciendo un chat mejor. Estamos haciendo que ARGOS deje de sentirse como email y empiece a sentirse como Jarvis.

---

## 📖 Estado actual (a mejorar)

- Backend argos-proxy v15 ya soporta tier detection + rate limits + logging estructurado
- Cliente `argos-service.ts` maneja generateResponse con contexto
- Chat funcional pero **sin presencia visual** más allá del texto
- NO hay avatar/símbolo, no hay entrada contextual, no hay adaptación por hora/pantalla, no hay "voz" (personalidad textual)

Este sprint envuelve tasks #94 (PERSONALIDAD+PRESENCIA), #95 (contextual por pantalla), #66 (aterrizar contexto timeContext).

---

## 🔨 Deliverables (6 tasks discretos)

### T1 — ARGOS Avatar component animado (60-90 min)

Nuevo componente reutilizable `src/components/argos/ArgosAvatar.tsx`:

**Especificaciones visuales:**
- SVG o Lottie de un símbolo abstracto ATP (ver assets existentes en `assets/images/argos*` o crear uno geométrico simple)
- **3 estados con transiciones:**
  - `idle`: respiración sutil (scale 1.0 → 1.03 → 1.0 en loop de 3-4s), opacidad estable
  - `thinking`: pulsos ligeros más rápidos + shimmer/glow
  - `speaking`: onda de audio-like (barras internas o forma que se ondula)
- Props: `state: 'idle' | 'thinking' | 'speaking'`, `size?: number` (default 32), `variant?: 'compact' | 'full'`
- Color: base ATP lime (#c8f000 aprox) + acento negro
- NO usar animaciones nativas pesadas — Reanimated 3 layer

**Usar en:**
- Chat ARGOS existente (reemplazar avatar actual o agregar)
- Header floating (T2)
- Meet ARGOS screen (T6)

### T2 — Floating ARGOS access cross-app (90-120 min)

Pequeño componente que aparece en TODAS las pantallas de la app (menos onboarding).

**UX:**
- Botón flotante compact bottom-right (o top-right, decide qué respeta mejor la composición existente)
- Muestra ArgosAvatar en state `idle`
- Al tap → abre chat ARGOS
- Long-press → quick action (activar mic para voice input, si tienes tiempo)
- Auto-hide cuando teclado abierto en pantallas de input
- Auto-hide en `/argos` chat screen mismo (redundante ahí)

**Implementación técnica:**
- `src/components/argos/ArgosFloatingButton.tsx`
- Wrapper en `app/_layout.tsx` o similar top-level layout
- Respeta safe areas
- Consulta unread hint (si ARGOS tiene mensaje proactivo esperando)

**Regla importante:** NO se debe sentir intrusivo. Si aparece en una pantalla donde no aporta, se puede ocultar via context.

### T3 — Personalidad textual + tone (60-90 min)

Nuevo archivo `src/services/argos/personality.ts` (o extend argos-service.ts):

**Constantes de personalidad:**
```typescript
export const ARGOS_VOICE = {
  greeting: {
    morning: [
      "Buenos días, {nombre}. Vamos por otro día.",
      "{nombre}, ¿cómo amaneciste?",
      "Buenos días. Ya estoy listo.",
    ],
    afternoon: [/* ... */],
    evening: [/* ... */],
    night: [/* ... */],
  },
  encouragement: [/* frases al completar hábitos */],
  concern: [/* frases al detectar drops en métricas */],
  celebration: [/* frases al hitos: streaks, PRs, rangos */],
};
```

**Personalidad base:**
- Directo (nunca hedges de más)
- Cercano pero profesional (no "amiguito" empalagoso)
- Ingeniería + ciencia como analogías
- Nunca condescendiente
- Frases cortas cuando el user está en flow
- Usa nombre del user
- Referencia contexto reciente ("ayer batiste tu récord de agua")

**Inyección en prompts LLM:**
- Agregar system prompt suffix con directrices de tono
- Para respuestas generadas (recipes, routines, chat) — la personalidad se aplica
- Braverman PREMIUM ya tiene su propio prompt largo, ahí NO tocar (mantener su calidad)

Referencia: [[feedback_comunicacion_enrique]] (memoria de estilo Enrique)

### T4 — Contexto por pantalla (auto-inject) (60-90 min)

Nuevo hook `src/hooks/useArgosScreenContext.ts`:

Cuando el user está en cualquier pantalla, ARGOS debe "saber" en qué está:

```typescript
// Ejemplo
const context = useArgosScreenContext();
// context = { screen: 'nutrition', activeSection: 'proteina', dayContext: { ... } }
```

**Screens con contexto rico:**
- HOY → info de electrones del día, agenda pendiente, HERO card
- NUTRICIÓN → últimas comidas, macros del día, hidratación
- FITNESS → última rutina, próxima programada
- MENTE → journal reciente, streak breathwork
- SALUD → labs recientes, glucosa 24h si CGM, edad ATP
- CICLO → fase actual + día

**Uso:**
- Cuando user abre chat ARGOS desde una pantalla, se manda el contexto en el request
- ARGOS puede responder: "Vi que estás en Nutrición. ¿Todo bien con tu proteína hoy?"
- Backend argos-proxy ya loguea `requestType` — agregar `screenContext` al metadata

**Guardar en tabla o solo runtime:**
- Runtime OK para launch. Persistir es task #92 (memoria persistente) — fuera de scope.

### T5 — Time-aware ARGOS (45-60 min)

Extensión de personality.ts:

**Adaptación por hora:**
- `getTimeOfDay()`: returns 'early_morning' (4-7) | 'morning' (7-11) | 'noon' (11-14) | 'afternoon' (14-17) | 'evening' (17-20) | 'night' (20-23) | 'late_night' (23-4)
- Greeting apropiado (from ARGOS_VOICE.greeting)
- Prompt LLM injecta contexto temporal: "Es de mañana temprano, el usuario probablemente está en su rutina de arranque"
- Recomendaciones adaptadas: no sugerir cardio pesado a las 10pm, sugerir hidratación en la mañana, etc.

**Zonas México específicas:**
- Usar `Intl.DateTimeFormat` con `America/Mexico_City` (patrón v6 ya establecido)

### T6 — "Meet ARGOS" screen (60-90 min)

Nueva pantalla `app/argos/meet.tsx`:

**Flujo:**
- Se muestra la PRIMERA vez que el user completa onboarding v2
- Full screen cinemática
- ArgosAvatar grande centrado, state animation
- Sequence:
  1. "Hola, {nombre}."
  2. "Soy ARGOS."
  3. "Voy a estar aquí para ti."
  4. Micro-copy explicando qué hace
  5. Botón "Comencemos"
- Después de esta pantalla, ARGOS floating button aparece en TODAS las pantallas
- Flag persistida en profiles: `argos_introduced_at` timestamp

**Migración 163** (NO usar 162 — Cowork la ocupó anoche con action_cost):
```sql
-- 163_argos_introduced.sql — Flag primera intro ARGOS (Fable Sprint MAGIA ARGOS)
-- Rango Fable 158-199.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'argos_introduced_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN argos_introduced_at TIMESTAMPTZ;
  END IF;
END $$;
```

Aplicar via MCP `apply_migration` al final del sprint.

---

## 🧪 Tests requeridos (+15 mínimo)

- `personality.test.ts`: greeting por time-of-day, encouragement/concern/celebration variants no repiten last 3
- `useArgosScreenContext.test.ts`: retorna contexto correcto para cada screen conocida
- `ArgosAvatar.test.tsx`: transición de states, size props respetados
- `ArgosFloatingButton.test.tsx`: hide en teclado abierto, hide en /argos route
- `getTimeOfDay.test.ts`: buckets correctos por hora Mexico City

Baseline actual: 855. Target: 870+.

---

## ⚠️ Reglas técnicas no negociables (CLAUDE.md)

1. **NO reescribir archivos completos** — str_replace quirúrgico sobre `argos-service.ts` y `_layout.tsx`
2. **NO usar crypto.randomUUID** — helper `generateUUID`
3. **DateHelpers:** `getLocalToday()`, `parseLocalDate()` (regla #3)
4. **Migración 163 idempotente** — DO $$ + IF NOT EXISTS
5. **Aplicar migración 163 al remoto tú mismo** via MCP apply_migration
6. **`Constants.expoConfig.extra`** no process.env directo (regla #7)
7. **npx tsc --noEmit → 0 errores** antes de push
8. **Commits granulares** — 6 commits mínimo (uno por task) + tests
9. **DeviceEventEmitter.emit** cuando aplique (no aplica mucho en este sprint, pero atento)

---

## 🎨 Sensibilidad de diseño

- **Estética editorial ATP** — B/N + acento lima. El avatar debe respetar esto.
- **Sensibilidad emocional** — este sprint es sobre "sentir presencia". No confundir con "sentirse invasivo".
- **Menos es más** — mejor menos frases de personalidad pero mejor calibradas, que un montón mediocres.
- **Copy final es de Enrique** — si tienes duda de una frase, deja placeholder claro para review post-sprint.

---

## 🚫 Fuera de scope (NO hacer)

- ❌ Multimodal voice + vision (#98) — sprint futuro
- ❌ ARGOS memoria persistente (#92) — sprint futuro
- ❌ Backend argos-proxy cambios (Cowork tocó anoche, respetar)
- ❌ Fix bugs preexistentes v6 dispatch-agenda-notifications — Cowork los está atacando en paralelo
- ❌ Fix bug #142 tasa E-→H+ — Cowork lo está atacando en paralelo
- ❌ Rediseño chat existente — solo agregar avatar, no cambiar la mecánica

---

## 📦 Deliverable final (buzón de vuelta)

En `R and D/FABLE_SPRINT_MAGIA_ARGOS_DELIVERY_2026-07-09.md`:

Tabla estándar:
```
#: T1
Feature: ARGOS Avatar animado
Estado: ✅ Completa
Clave: <resumen 2 líneas>
Tests: +N
```

Al final:
- Branch name (sugerido `feat/argos-magia-jarvis`)
- Migración 163 aplicada al remoto (confirmar)
- Screens tocados (para que Enrique test en device mañana)
- Feature flag si dejaste algo detrás de toggle
- Copy que necesita review de Enrique (lista de frases donde pusiste placeholder)

---

## 🤝 Contexto colaborativo

- **Marathon V1.4 + Sprint #50 + Braverman H+ mergeados a main** (11aef1c → HEAD actual)
- **Migration table SINCRONIZADO** (no huecos)
- **Cowork trabajando en paralelo** en fix #142 + bugs preexistentes v6
- **Enrique se va a dormir después de pasarte este buzón** — nada de interrumpir salvo emergencia real

Si detectas bugs preexistentes CRÍTICOS que no son tu scope, flaguéalos en el buzón de vuelta pero NO los fixees.

## 💛 Nota emocional

Enrique lleva 12+ horas hoy con gripa. Tomó la decisión sabia de NO submitear una app que aún no siente que la gente ame. Está confiando en ti para transformar ese sentimiento. No es "un sprint más" — es EL sprint que hace que ATP se sienta como ATP debe sentirse.

Duerme, ARGOS. Duerme, Enrique. Fable, brilla.

— Cowork (Opus 4.7)
