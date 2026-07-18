# 🧠 N-Back Challenge · Spec preliminar para feature app Mente

**Uso:** Feature grande V1.5 · módulo Mente. Spec para que Fable haga mapa técnico cuando llegue al Bloque 6 del mega buzón.
**Autor:** Cowork, research 2026-07-11 turno nocturno.
**Base:** Task #6 · doctrina Mariana ("investiga N-Back Challenge") + intervención A33 del catálogo v3.
**Referencias:** Dual N-Back Pro · Brain Workshop (open source, gold standard) · HQBrain · Cognifit · Peak Brain · Elevate.

---

## 🎯 Qué es N-Back (Jaeggi 2008)

Ejercicio de **working memory dual** que requiere recordar simultáneamente **2 canales de estímulos** ocurridos **N pasos atrás** en una secuencia.

**El estudio original (Jaeggi et al. 2008, PNAS):** demostró que entrenamiento en Dual N-Back durante 19 días mejora **IQ fluido (Gf)** en adultos jóvenes — hallazgo debatido pero replicado varias veces. **Es el único ejercicio cognitivo con evidencia sólida** de transfer a inteligencia general.

**Por qué es importante para ATP:**
- Único ejercicio de working memory con evidencia de mejora medible
- Progresión objetiva (N sube = te vuelves mejor)
- Métrica clara (N actual, N máximo, accuracy)
- Anti-declive cognitivo con la edad
- Brain fog / focus tracking

---

## 🎮 Mecánica base

### Estímulos duales (Dual N-Back)

Cada "ronda" muestra simultáneamente 2 estímulos:

1. **Estímulo visual:** una casilla iluminada en una grilla 3×3
2. **Estímulo auditivo:** una letra hablada (audio: C, H, K, L, Q, R, S, T)

### Regla de respuesta

Después de cada estímulo, el user debe decidir por cada canal:
- ¿La casilla actual es la MISMA que N pasos atrás? → tap botón A (match visual)
- ¿La letra actual es la MISMA que N pasos atrás? → tap botón L (match auditory)

Puede activar 0, 1 o 2 matches en cada ronda.

### Ejemplo con N=2

| Ronda | Casilla | Letra | Match visual? | Match audio? |
|---|---|---|---|---|
| 1 | (2,3) | K | — | — |
| 2 | (1,1) | R | — | — |
| 3 | (2,3) | S | **✓ SÍ** (igual que ronda 1) | ✗ NO |
| 4 | (3,2) | R | ✗ NO | **✓ SÍ** (igual que ronda 2) |
| 5 | (2,3) | S | ✗ NO (igual que 3, no 3) | ✗ NO |

### Duración de sesión

- **1 bloque** = 20+N estímulos, ~5 seg por estímulo → **~2 min por bloque**
- **1 sesión** = 20 bloques → **~15-20 min**
- **Frecuencia recomendada:** 5-6×/semana

---

## 📈 Sistema de progresión N

**Regla estándar (usada por Brain Workshop, gold standard):**

- Empieza en **N=2**
- Al terminar un bloque, calcula accuracy en cada canal:
  - **≥80% en visual Y ≥80% en auditivo** → **sube a N+1** al siguiente bloque
  - **<50% en cualquier canal** → **baja a N-1** al siguiente bloque
  - **Intermedio (50-80%)** → mantiene N actual
- Guarda `current_n` (nivel actual) y `best_n` (mejor logrado).

**Personalización ATP:**
- **Nivel mínimo N=1** (no bajar de eso — quedaría trivial)
- **Nivel máximo N=∞** (Jaeggi tuvo participantes que llegaron a N=8+; es literalmente el punto — no hay techo)

---

## 🎨 UX / UI patterns (de apps de referencia)

### Pantalla de sesión activa

- Grilla 3×3 en el centro, casilla iluminada con lima ATP
- 2 botones grandes debajo: **"POSICIÓN"** (visual match) y **"SONIDO"** (audio match)
- Cronómetro pequeño arriba con progreso del bloque (13/22)
- Nivel actual grande: **"N = 3"**
- Audio se reproduce con auriculares recomendado

### Feedback inmediato (opcional, degradable por usuario)

- **Verde suave** al presionar match correcto
- **Rojo suave** al presionar match incorrecto o al no presionar cuando había match
- Sin timer específico — enseña al user a confiar en su percepción
- **Opción "modo silencioso"** para users avanzados que quieren solo el score final

### Pantalla post-sesión

- **Nivel actual N**
- **Nivel máximo alcanzado (best N)**
- **Accuracy por canal** (visual %, auditory %)
- **Sesiones esta semana / racha**
- Gráfica pequeña de N por sesión (últimos 30 días)
- Copy motivacional variable: "Sesión 47 · Best N=5 · Adulto promedio N=3"

### Pantalla de historial

- Timeline de sesiones
- Tap en sesión → detalles (bloques completados, accuracy por bloque, N alcanzado)
- Racha, mejor semana, promedio

---

## 📊 Métricas clínicas visibles

| Métrica | Descripción | Ejemplo |
|---|---|---|
| `current_n` | Nivel N actual del user | 3 |
| `best_n` | Nivel máximo alcanzado | 5 |
| `sessions_total` | Sesiones completadas | 47 |
| `streak_days` | Días consecutivos con al menos 1 sesión | 12 |
| `accuracy_avg_visual` | Accuracy promedio canal visual (todas las sesiones) | 76% |
| `accuracy_avg_auditory` | Accuracy promedio canal auditivo | 71% |
| `sessions_this_week` | Sesiones esta semana | 5 |
| `time_practiced_total_min` | Minutos totales practicados | 620 |

---

## 🛠️ Spec técnica preliminar

### Modelo de datos

**Tabla `nback_sessions`** (append-only, una fila por bloque completado)

```
id                    UUID PK
user_id               UUID FK auth.users
started_at            TIMESTAMPTZ
completed_at          TIMESTAMPTZ
n_level               SMALLINT     -- N usado en este bloque
stimuli_count         SMALLINT     -- 20 + N típicamente
matches_visual_total  SMALLINT     -- cuántos matches visuales había
matches_visual_hit    SMALLINT     -- cuántos el user acertó
matches_visual_miss   SMALLINT     -- cuántos falló (no presionó cuando había)
matches_visual_false  SMALLINT     -- cuántos false positives
matches_audio_total   SMALLINT     -- idem canal audio
matches_audio_hit     SMALLINT
matches_audio_miss    SMALLINT
matches_audio_false   SMALLINT
accuracy_visual       NUMERIC(4,3) -- calculated: hit / (hit+miss+false)
accuracy_audio        NUMERIC(4,3)
promoted              BOOLEAN      -- si este bloque promovió al siguiente N
demoted               BOOLEAN
next_n                SMALLINT     -- N para el siguiente bloque
metadata              JSONB        -- flexibilidad futura
```

**Tabla `nback_user_state`** (una fila por user)

```
user_id               UUID PK FK auth.users
current_n             SMALLINT DEFAULT 2
best_n                SMALLINT DEFAULT 2
best_n_achieved_at    TIMESTAMPTZ
sessions_total        INT DEFAULT 0
streak_days           SMALLINT DEFAULT 0
last_session_date     DATE
updated_at            TIMESTAMPTZ
```

RLS dueño-only en ambas. Sin lectura cross-user (privacidad cognitiva).

### Motor puro `nback-core.ts`

```typescript
export interface NBackBlock {
  nLevel: number;
  stimuliCount: number;
  visualMatchesTotal: number;
  visualHits: number;
  audioMatchesTotal: number;
  audioHits: number;
  visualFalsePositives: number;
  audioFalsePositives: number;
}

export interface NBackResult {
  accuracyVisual: number;
  accuracyAudio: number;
  promoted: boolean;
  demoted: boolean;
  nextN: number;
}

/** Calcula accuracy + promoción según regla estándar Brain Workshop. */
export function evaluateBlock(block: NBackBlock, currentN: number): NBackResult;

/** Genera secuencia de estímulos random para un bloque de N y count dado. */
export function generateStimuli(n: number, count: number): {
  visual: [number, number][];   // [row, col] en grilla 3×3
  audio: string[];               // letra hablada
  matchesVisual: number[];       // índices donde HAY match visual
  matchesAudio: number[];        // índices donde HAY match audio
};
```

### Pantallas expo-router

- `app/mente/nback/index.tsx` — home con stats + botón "Empezar sesión"
- `app/mente/nback/sesion.tsx` — sesión activa (fullscreen, sin distracciones)
- `app/mente/nback/historial.tsx` — timeline sesiones
- `app/mente/nback/como-jugar.tsx` — tutorial (solo primera vez o accesible desde stats)

### Audio

Grabaciones cortas de 8 letras (C, H, K, L, Q, R, S, T) en voz neutra. Se pueden usar TTS del sistema como fallback. Idealmente pre-grabadas para uniformidad.

### Cronotipo integration (opcional)

- Recomendar sesión en la ventana de **peak cognitivo** del cronotipo del user:
  - León: 10am-12pm
  - Oso: 10am-2pm (banda ancha)
  - Lobo: 4pm-8pm
- Push notification suave 1×/día en la ventana

### Electrón

Nueva key `nback_session` en `ELECTRON_WEIGHTS`. Peso sugerido: **2.5** (mismo que meditation por esfuerzo cognitivo comparable).

---

## 🎯 Preguntas para Enrique — ✅ CERRADAS 2026-07-14

### 1. N inicial · TUTORIAL en N=1 · sesiones subsecuentes configurable
- **Primera vez del user (tutorial):** N=1 obligatorio para aprender mecánica
- **Sesiones subsecuentes:** el user configura en Settings del test:
  - `resume_mode: 'last'` — arranca desde el último N alcanzado en la sesión previa (default)
  - `resume_mode: 'best'` — arranca desde N máximo histórico (challenge mode)
  - `resume_mode: 'restart'` — arranca desde N=1 siempre (reset mode · para entrenar base)
- **Impacto UI:** onboarding del test detecta si `nback_sessions.count = 0` → tutorial N=1 forzado. Después config settings visible.

### 2. Timeout · 3 segundos por trial
Estándar Brain Workshop. Es parte del reto cognitivo · sin timeout pierde valor de entrenar WM bajo presión.

### 3. Auditivo obligatorio · auriculares o altavoz claro
- Copy pre-test: *"Usa auriculares o pon el altavoz claro · necesitas escuchar los sonidos con precisión"*
- Detección: verificar que audio output esté activo (permission check ligero al arrancar test)
- NO forzar auriculares como Bluetooth (permitir altavoz externo/interno del device)
- Modo mudo del OS = warning: *"Tu teléfono está en silencio · reactiva sonido antes de empezar"*

### 4. Modo daltónico · formas + color siempre
Doctrina ATP inclusiva · 8% mercado (hombres) daltónicos no se excluyen. Sistema visual = color de fondo (rojo/azul/verde/amarillo · 4 opciones) + forma dentro (círculo/triángulo/cuadrado/estrella · 4 opciones). Match visual dispara si posición Y (color O forma) matches N atrás.

### 5. Free ilimitado + Protones (H+) por uso + badges de progreso
NO paywall en N-Back · anzuelo brand libre + comunidad compite igual. Incentivos:

- **Protones (H+) por sesión completada:**
  - Sesión normal completada: +5 H+
  - N alcanzado nuevo personal record: +50 H+ bonus
  - Racha 7 días: +100 H+ bonus
  - Racha 30 días: +500 H+ bonus
- **Badges de progreso (max N alcanzado):**
  - 🌱 Novato · N=1 completado
  - 🌿 Aprendiz · N=2 completado
  - 🍀 Practicante · N=3 completado
  - 🌳 Adepto · N=4 completado
  - 🎋 Avanzado · N=5 completado
  - 🌲 Maestro · N=6 completado
  - 🌟 Élite · N=7+ (Jaeggi papers rara vez superan · badge premium)
- **Leaderboard comunidad:** max N alcanzado + racha actual (Strava style · no chat)

Los H+ se pueden usar para features LLM caras (doctrina `project_features_premium_como_transaccion_hplus`) · esto convierte N-Back en revenue driver sano SIN paywall.

---

## 🚀 Estimación de effort para Fable

- **Motor puro + tests:** 4-6h
- **Migraciones + RLS:** 2-3h
- **Audio (grabaciones o TTS):** 2-4h
- **UI 4 pantallas + tutorial:** 8-10h
- **Integración cronotipo + push:** 2-3h
- **Electron + wire:** 1-2h

**Total: 20-30h.** Feature grande. **V1.5 post-beta.** No bloquea la beta actual.

---

## 💛 Nota

N-Back es la única cosa cognitiva con evidencia real de transfer. Metérselo a los users de ATP (biohackers, alto rendimiento 35-55) puede ser un anzuelo muy fuerte. Además tiene el "leaderboard" natural (N=5 vs N=7 es medida objetiva) que juega con el módulo Comunidad.

**Referencias útiles para Fable:**
- Brain Workshop (open source, código Python) — reference implementation
- Jaeggi et al. 2008 PNAS — paper original
- Cognitivefun.net — versión web simple para experimentar

— Cowork, 2026-07-11 · turno nocturno
