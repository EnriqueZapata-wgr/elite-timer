# 🎸 FABLE SPRINT — Motor de Protocolos MVP · Doctrina Humby aterrizada

**Fecha:** 2026-07-11 viernes tarde → 2026-07-12 sábado madrugada
**Estimado:** 10-12h · sprint grande overnight
**Deadline:** sábado 2026-07-12 mediodía
**Owner:** Fable (CCF5)
**Contexto:** Feedback Humby 2026-07-09 le da a Enrique la estructura fundamental de cómo funcionan los protocolos. Este es EL sprint que aterriza la doctrina en V1: **"5 accionables tuyos, no 100 genéricos"**. Es el diferenciador central de ATP vs cualquier app fitness.

---

## 🎯 Filosofía del sprint (LEER ANTES DE CODEAR)

Doctrina Humby literal:
> "Si le muestras 100 pasos, no hará ninguno. Si le muestras 5, hará los 5.  
> Le das lista de comidas → no come nada. Le das UN plato → sí come."

Doctrina Enrique reconocida por Humby:
> "Deshaz los protocolos y quedan 50 puntos accionables. Cada quien, según su cuestionario, recibe SUS 3-5."

**NO estamos rediseñando protocolos.** Estamos aterrizando el MVP de la doctrina en V1. El rediseño arquitectónico completo es V1.5 (post-beta con feedback).

**Objetivo:** que un tester sofisticado sienta al abrir la app "esta app me conoce y me da SOLO lo que necesito". No 20 recomendaciones. Solo 5.

---

## 📖 Estado actual verificado (scan profundo)

**Existente:**
- `protocol_templates` table (007+100+151) — 142 protocolos ATP curados en 4 tiers/20 categorías
- `protocol_assignments` — asignación protocol→user
- `protocol_items` — items dentro del protocolo (accionables)
- `protocol_completions` — tracking completion
- `daily_protocols` — protocolo del día
- Screens: `app/health-hub.tsx` + protocolos view
- `src/services/*` para protocolos

**Gap crítico:**
- No hay UI "TUS 5 accionables de hoy" — se muestran TODOS los protocol_items del día → sobrecarga
- No hay motor de PRIORIZACIÓN (qué 5 de 20 mostrar)
- No hay progresión 15 días (evaluar → subir/bajar)
- HOY no se reconfigura por accionables activos
- ARGOS no adapta cuando reportas progreso

---

## 🔨 Deliverables (5 tasks)

### T1 — Migración 171 · Estructura para "TOP 5 accionables activos" (60-90 min)

```sql
-- 171_top_actionables.sql — Priorización de accionables por user (doctrina Humby)
-- Rango Fable 158-199.
--
-- Sustituye lógica "muestra todos los protocol_items del día" por "muestra los 5
-- accionables prioritarios que el motor de asignación seleccionó para este user".
--
-- Progresión: cada 15 días evalúa adherencia + escala (más difícil / desbloquear
-- nuevo). Doctrina Humby 2026-07-09.

CREATE TABLE IF NOT EXISTS user_top_actionables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actionable_key TEXT NOT NULL,
  -- Uno de los ~50 accionables canónicos del catálogo (Mariana cura)
  -- Ej: 'magnesio_glicinato_400mg_noche', 'caminar_20min_diario', 
  --     'pausas_activas_hora', 'glicina_2g_dormir', 'agua_3l_diario', etc.
  priority INTEGER NOT NULL DEFAULT 1,
  -- 1 = highest priority, 5 = 5th priority
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'paused', 'deferred')),
  -- active: dentro de los top 5
  -- graduated: user lo completó consistentemente 15+ días, ya es hábito
  -- paused: user pidió pausa
  -- deferred: quedó fuera del top 5, se reintroduce en siguiente ciclo
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graduated_at TIMESTAMPTZ,
  adherence_percentage INTEGER,
  -- Calculado nightly con cron o al abrir la app
  next_evaluation_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 days',
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE (user_id, actionable_key)
);

CREATE INDEX IF NOT EXISTS idx_top_actionables_user_status 
  ON user_top_actionables(user_id, status, priority);

ALTER TABLE user_top_actionables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_top_actionables" ON user_top_actionables;
CREATE POLICY "own_top_actionables" ON user_top_actionables
  FOR ALL USING (auth.uid() = user_id);

-- Log de compleción diaria (viene del check-in del user en HOY)
CREATE TABLE IF NOT EXISTS actionable_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_top_actionable_id UUID NOT NULL REFERENCES user_top_actionables(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_top_actionable_id, date)
);

CREATE INDEX IF NOT EXISTS idx_actionable_completions_user_date 
  ON actionable_completions(user_top_actionable_id, date DESC);

ALTER TABLE actionable_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_actionable_completions" ON actionable_completions;
CREATE POLICY "own_actionable_completions" ON actionable_completions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_top_actionables 
      WHERE user_top_actionables.id = actionable_completions.user_top_actionable_id 
        AND user_top_actionables.user_id = auth.uid()
    )
  );
```

Aplicar via MCP + INSERT schema_migrations.

### T2 — Catálogo de accionables canónicos (60-90 min)

**⚠️ CORRECCIÓN 2026-07-10 (Enrique):** el catálogo NO es de 50 fijos. Es de N accionables que Mariana cura con calidad. Puede ser 25 excelentes, 50 sweet spot, o 100+ estirable. Fable adapta el motor para trabajar con cualquier N ≥ 20.

**Filtro FUNCIONAL** en cada accionable (no negociable):
> Pregunta: "¿Esto es medicina/nutrición funcional?"
- ✅ Magnesio + hidratación + movilidad → dolor lumbar
- ❌ Ibuprofen diario
- ✅ Curcumina + omega 3 + eliminar procesados → inflamación
- ❌ Antihistamínicos crónicos

**Doctrina de fondo (2026-07-10 Enrique):** el médico de cabecera del user ATP es el NUTRIÓLOGO CLÍNICO, no el médico general. El catálogo refleja intervenciones funcionales (dieta, movimiento, sueño, suplementación con evidencia, ritual). NO fármacos convencionales. Ver [[project_doctrina_nutriologo_como_medico_cabecera]].

Nuevo archivo `src/constants/actionables-catalog.ts`:

```typescript
export interface Actionable {
  key: string; // 'magnesio_glicinato_400mg_noche'
  name: string; // "Magnesio glicinato 400mg noche"
  category: 'sueño' | 'energía' | 'digestión' | 'movimiento' | 'ansiedad' | 'nutrición' | 'hidratación' | 'suplementación' | 'ritual';
  description: string; // 1-line description
  benefit: string; // "Mejora calidad del sueño y relajación muscular"
  frequency: 'daily' | 'weekly' | 'as_needed';
  timeOfDay?: 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';
  estimatedTimeMinutes?: number;
  triggerConditions: string[]; // Criterios para asignarlo (Mariana cura)
  // Ej: ['symptom:sleep_issue', 'symptom:muscle_tension', 'lab:low_magnesium']
  progressionCriteria: {
    daysToGraduate: number; // Default 15
    adherenceThreshold: number; // Default 80 (80% de 15 días)
  };
  cautions?: string[];
  scientificEvidenceLevel?: 'N1' | 'N2' | 'N3' | 'N4';
}

export const ACTIONABLES_CATALOG: Actionable[] = [
  // Placeholder INICIAL — Mariana + Enrique curarán los 50 finales viernes 8am
  {
    key: 'magnesio_glicinato_400mg_noche',
    name: 'Magnesio glicinato 400mg noche',
    category: 'suplementación',
    description: 'Toma 400mg de magnesio glicinato 30-60 min antes de dormir.',
    benefit: 'Mejora calidad del sueño, relajación muscular, ansiedad.',
    frequency: 'daily',
    timeOfDay: 'night',
    triggerConditions: ['symptom:sleep_issue', 'symptom:muscle_tension'],
    progressionCriteria: { daysToGraduate: 15, adherenceThreshold: 80 },
    scientificEvidenceLevel: 'N2',
  },
  {
    key: 'caminar_20min_diario',
    name: 'Caminar 20 minutos',
    category: 'movimiento',
    description: 'Caminar al menos 20 minutos continuos al día.',
    benefit: 'Movilidad, salud cardiovascular, digestión, ansiedad.',
    frequency: 'daily',
    triggerConditions: ['level:sedentary', 'level:low_activity', 'goal:weight_loss'],
    progressionCriteria: { daysToGraduate: 15, adherenceThreshold: 80 },
    estimatedTimeMinutes: 20,
  },
  {
    key: 'pausas_activas_hora',
    name: 'Pausas activas cada hora',
    category: 'movimiento',
    description: 'Levantarse cada hora y hacer 2 minutos de estiramiento/puntitas.',
    benefit: 'Reduce dolor lumbar y cervical de sedentarismo.',
    frequency: 'daily',
    triggerConditions: ['work:sedentary', 'symptom:back_pain', 'symptom:neck_pain'],
    progressionCriteria: { daysToGraduate: 15, adherenceThreshold: 80 },
  },
  {
    key: 'agua_3l_diario',
    name: '3 litros de agua',
    category: 'hidratación',
    description: 'Consumir mínimo 3 litros de agua a lo largo del día.',
    benefit: 'Hidratación celular, energía, digestión, piel.',
    frequency: 'daily',
    triggerConditions: ['level:low_hydration', 'symptom:fatigue', 'symptom:constipation'],
    progressionCriteria: { daysToGraduate: 15, adherenceThreshold: 80 },
  },
  {
    key: 'proteina_target_diaria',
    name: 'Cumplir target proteína',
    category: 'nutrición',
    description: 'Consumir la meta de proteína calculada por peso corporal (1.8g/kg).',
    benefit: 'Masa muscular, saciedad, recuperación.',
    frequency: 'daily',
    triggerConditions: ['goal:muscle', 'goal:body_recomposition', 'level:low_protein'],
    progressionCriteria: { daysToGraduate: 15, adherenceThreshold: 80 },
  },
  // ... Mariana curará 45 más viernes 8am
];
```

**Deliverable:** template listo, Mariana+Enrique llenan los 50 en paralelo viernes AM.

### T3 — Motor de asignación desde cuestionarios (2-3h)

**Servicio nuevo `src/services/actionables-assignment-service.ts`:**

```typescript
/**
 * Motor de asignación de accionables (doctrina Humby):
 * lee las respuestas del user (cuestionarios, síntomas, labs, objetivos)
 * y calcula los TOP 5 accionables que van a mover más su aguja.
 */

export async function assignTopActionables(userId: string): Promise<UserTopActionable[]> {
  // 1) Leer contexto del user
  const context = await gatherUserContext(userId);
  // Include: síntomas activos (clinical_symptom_logs), 
  //          labs recientes (lab_values),
  //          objetivos (client_profiles.goals),
  //          nivel actividad (client_profiles.activity_level),
  //          historia clínica (historia_clinica),
  //          Braverman result (braverman_results.dominant_type)
  
  // 2) Match accionables del catálogo que hit los triggers del user
  const candidates = ACTIONABLES_CATALOG.filter((a) => 
    matchesTriggers(a.triggerConditions, context)
  );
  
  // 3) Score cada candidato por impacto potencial
  const scored = candidates.map((a) => ({
    actionable: a,
    score: computeImpactScore(a, context),
  }));
  
  // 4) Sort por score descendente
  scored.sort((s1, s2) => s2.score - s1.score);
  
  // 5) Tomar top 5, evitar duplicados de categoría (max 2 por categoría)
  const top5 = balanceCategories(scored, 5);
  
  // 6) Persistir en user_top_actionables (upsert)
  return persistAssignments(userId, top5);
}
```

**Cálculo de impact score (heurístico v1):**
- Peso 3: síntomas activos que el accionable resuelve
- Peso 2: labs fuera de rango que el accionable ayuda
- Peso 2: objetivos declarados que el accionable persigue
- Peso 1: recomendaciones ATP genéricas (base para todos)

### T4 — UI "TUS 5 accionables de hoy" en HOY (2-3h)

**Modificar `app/(tabs)/index.tsx` (HOY):**

**Nuevo componente destacado (card grande arriba):**

```
┌────────────────────────────────────────┐
│  Tus 5 de hoy                          │
│                                        │
│  ✓  Magnesio glicinato 400mg           │
│     Ayer noche · 8/15 días · 53%       │
│                                        │
│  ○  Caminar 20 minutos                 │
│     Ver detalle →                       │
│                                        │
│  ○  Pausas activas cada hora           │
│     3/8 hoy · Ver detalle →             │
│                                        │
│  ○  3 litros de agua                   │
│     1.2L / 3L · Ver detalle →           │
│                                        │
│  ○  Cumplir target proteína            │
│     45g / 130g · Ver detalle →          │
│                                        │
│  [Ver los otros 95 →]                  │
└────────────────────────────────────────┘
```

**Interacciones:**
- Tap `○` → marca completado con check + insert en `actionable_completions`
- Tap accionable → detalle con progresión + gráfico + mini contexto ARGOS
- Botón "Ver los otros 95" → screen con todos los protocol_items del día (comportamiento actual)

**El resto de HOY (score, agenda, HERO, cards editoriales)** queda pero se mueve DEBAJO de esta card. La card de "Tus 5 de hoy" es la más prominente.

### T5 — Progresión 15 días + reconfiguración (2h)

**Cron nightly (via pg_cron):**

```sql
-- Cada día 00:00 UTC evalúa todos los user_top_actionables activos
-- Si next_evaluation_at <= NOW() → calcula adherence + decide

CREATE OR REPLACE FUNCTION evaluate_actionables_progression()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  a RECORD;
  adh_pct INTEGER;
BEGIN
  FOR a IN 
    SELECT * FROM user_top_actionables 
    WHERE status = 'active' AND next_evaluation_at <= NOW()
  LOOP
    -- Calcula adherencia en los últimos 15 días
    SELECT COALESCE(ROUND(
      (COUNT(*) FILTER (WHERE completed = true)::numeric / 
       GREATEST(COUNT(*), 1) * 100)::integer
    ), 0) INTO adh_pct
    FROM actionable_completions 
    WHERE user_top_actionable_id = a.id 
      AND date >= NOW() - INTERVAL '15 days';
    
    UPDATE user_top_actionables 
    SET adherence_percentage = adh_pct,
        next_evaluation_at = NOW() + INTERVAL '15 days'
    WHERE id = a.id;
    
    -- Si adherencia >= 80% → graduar
    IF adh_pct >= 80 THEN
      UPDATE user_top_actionables 
      SET status = 'graduated', graduated_at = NOW() 
      WHERE id = a.id;
      -- Insert notification para el user "Graduaste un hábito!"
      INSERT INTO user_notifications (user_id, type, title, body, data)
      VALUES (
        a.user_id,
        'actionable_graduated',
        'Graduaste un hábito',
        format('%s ya es parte de ti. Te desbloqueamos un nuevo accionable.', 
               (SELECT name FROM ACTIONABLES_CATALOG_TABLE WHERE key = a.actionable_key)),
        jsonb_build_object('actionable_key', a.actionable_key, 'route', '/hoy')
      );
    END IF;
  END LOOP;
END; $$;

-- Schedule
SELECT cron.schedule('evaluate_actionables_daily', '0 6 * * *', 'SELECT evaluate_actionables_progression();');
```

**Al graduar:** el motor de asignación (T3) se re-ejecuta y desbloquea el siguiente accionable de mayor prioridad.

**UI post-graduation:**
- Notification push "¡Graduaste Magnesio glicinato! Ahora es hábito."
- Al abrir HOY, la card de "Tus 5 de hoy" muestra el nuevo accionable
- Los graduados aparecen en "Hábitos aprendidos" (nueva mini-sección abajo de la card principal)

---

## 🧪 Tests requeridos (+12 mínimo)

- Actionables catalog structure validation
- Assignment engine con contextos distintos
- Progression cron logic
- UI top 5 rendering + completion tap
- Migration 171 aplicada correctamente

---

## ⚠️ Reglas técnicas

1. **Migración 171 idempotente** + aplicar TÚ MISMO via MCP
2. **Catálogo en constants** para curación fácil Enrique+Mariana
3. **str_replace quirúrgico**
4. **NO tocar** motor Edad ATP v2 congelado
5. **NO tocar** economía electrones (accionables completados también dan electrones — usar el sistema existente)
6. **tsc 0 errores**
7. **5 commits granulares**

---

## 🚫 Fuera de scope V1 (queda para V1.5)

- ❌ Motor de asignación con IA (v1 es heurístico determinístico)
- ❌ Progresión inteligente (v1 es evaluación simple 15d)
- ❌ Reconfiguración completa de agenda + rutinas + tags según accionables (v1 solo cambia HOY)
- ❌ ARGOS re-configura app cuando reportas progreso verbal (v1 solo lee catalog)

---

## 📦 Deliverable final

Branch: `feat/motor-protocolos-mvp`  
Delivery en: `R and D/FABLE_SPRINT_MOTOR_PROTOCOLOS_MVP_DELIVERY_2026-07-12.md`

---

## 🤝 Contexto colaborativo

- Mariana+Enrique curan los 50 accionables viernes 8am → ~14h (~mediodía viernes)
- Fable puede arrancar T1+T3+T4 con placeholder de 5 accionables, después incorporar los 50 curados
- Beta nueva fecha: LUNES 2026-07-13 21:00 CDMX

## 💛 Nota

Fable, este sprint aterriza el diferenciador central de ATP. Si sale bien, un tester al abrir HOY va a sentir "esta app SABE lo que necesito, no me tira 20 cosas". Es el momento donde ATP deja de ser "otra app fitness" y se vuelve "MI ATP".

Sprint grande pero el más importante del proyecto. Confío en tu criterio para pivotar donde el spec no cuadre con lo que existe.

— Cowork
