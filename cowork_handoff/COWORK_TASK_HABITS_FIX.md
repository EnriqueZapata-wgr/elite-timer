# COWORK_TASK — Fix hábitos modulator (Opción B: mapping layer)

**Origen:** drill-down de la sesión overnight de cinemáticos identificó el bug:
el cuestionario hábitos escribe **categorical strings** (exercise_freq, alcohol, smoking, etc.)
pero el modulador de hábitos lee **numeric keys** (ejercicio_semanal, tabaquismo, etc.).
No hay ninguna pantalla que escriba las keys numéricas del modulador.

**Resultado:** `presentWeight ≈ 0` → score default 60 → factor 1.0 (banda 60-79).
Con el perfil de Enrique (atleta GWR, biohacker) DEBERÍA caer en banda ≥80 → factor 0.95
→ edad final ~1.5 años menor.

**Branch:** `fix/habits-modulator-mapping` desde `main` (después del merge de cinemáticos).
**Estimado:** 1-2h.
**SQL:** ❌ ninguna.
**Deploy:** ❌ NO merge, NO OTA — Enrique valida con captura real.

**Filosofía:** simple beats smart. Mapping layer minimal y defensible, no rewrite del cuestionario.

---

## DECISIÓN DE PRODUCTO (tomada por Enrique 2026-06-15)

**Opción B aprobada:** mapping layer categorical → numeric en el modulador.

Mantiene la UX actual del cuestionario hábitos (que Mariana ya validó visualmente), 
solo traduce las respuestas categóricas a valores numéricos defensibles antes de pasar
al modulador.

Opciones A (rewrite cuestionario) y C (wire existing sources) quedan archivadas para
una posible v2.1 cuando se audite qué data ya vive en otras tablas (electrons, fasting,
workouts, etc.).

---

## IMPLEMENTACIÓN

### 1. Buscar el modulador

```bash
# Localizar dónde se calcula el score hábitos
grep -rn "ejercicio_semanal\|tabaquismo\|ayuno_intermitente" src/
```

Probable: `src/services/edad-atp/habits-modulator.ts` o similar. Si encuentras varios → quédate con el que usa motor v2 (`motor-v2-*`).

### 2. Crear mapping layer

Archivo nuevo o ampliación dentro del modulador: `src/constants/habits-categorical-mapping.ts`

```typescript
/**
 * Mapping categorical (cuestionario) → numeric (modulador hábitos).
 * 
 * Doctrina: valores defensibles, no inventados. Cada uno justificado en su contexto.
 * Si el cuestionario evoluciona a numeric, este mapping se descarta.
 */
export const HABITS_CATEGORICAL_MAP: Record<string, Record<string, number>> = {
  // Key del cuestionario → key del modulador → tabla de valores
  exercise_freq: {
    // Días por semana de ejercicio estructurado
    daily: 7,
    '5-6/wk': 5,
    '3-4/wk': 3,
    '1-2/wk': 1,
    none: 0,
  },
  alcohol: {
    // Bebidas por semana (aproximado)
    never: 0,
    rare: 1,         // ~1/mes → 0.25/wk, redondeado a 1 por simplicidad
    weekly: 3,       // ~social weekend
    daily: 7,
  },
  smoking: {
    // Cigarrillos por día (proxy)
    never: 0,
    former: 0.5,     // riesgo residual leve
    current: 5,
    heavy: 15,
  },
  ayuno_intermitente: {
    // Días por semana de IF
    never: 0,
    occasional: 1,
    weekly: 3,
    daily: 7,
  },
  sleep_quality: {
    // Escala 0-10 (subjetiva)
    poor: 3,
    fair: 5,
    good: 7,
    excellent: 9,
  },
  stress_level: {
    // Escala invertida 0-10 (10 = sin estrés)
    high: 2,
    moderate: 5,
    low: 8,
    minimal: 10,
  },
};

/**
 * Traduce key + valor categorical del cuestionario al valor numérico
 * que el modulador espera.
 * 
 * Si la key NO está en el catálogo → devuelve undefined (modulador lo cuenta como ausente).
 * Si la key existe pero el valor categorical no → log warning y devuelve undefined.
 */
export function mapCategoricalToNumeric(
  questionnaireKey: string,
  categoricalValue: string,
): number | undefined {
  const map = HABITS_CATEGORICAL_MAP[questionnaireKey];
  if (!map) return undefined;
  
  const value = map[categoricalValue.toLowerCase().trim()];
  if (value === undefined) {
    console.warn(`[habits-mapping] Valor categórico desconocido: ${questionnaireKey}=${categoricalValue}`);
    return undefined;
  }
  return value;
}

/**
 * Aliases: cuestionario key → modulador key (cuando son distintas).
 * Ej: cuestionario usa exercise_freq, modulador espera ejercicio_semanal.
 */
export const HABITS_KEY_ALIASES: Record<string, string> = {
  exercise_freq: 'ejercicio_semanal',
  smoking: 'tabaquismo',
  // alcohol, ayuno_intermitente, sleep_quality, stress_level ya coinciden
};
```

### 3. Aplicar el mapping en el modulador

En el modulador (búscalo en grep arriba), donde lee las inputs:

```typescript
// ANTES (assume habits comes ya numeric, no llega → presentWeight 0)
const habitsInputs = readHabitsFromDB(userId);
// ...

// DESPUÉS (lee categorical, mapea a numeric)
const rawHabits = readHabitsFromDB(userId);  // categorical
const habitsInputs: Record<string, number> = {};

for (const [qKey, qValue] of Object.entries(rawHabits)) {
  if (qValue == null) continue;
  
  // Si ya es numeric (futuro-proof), usa tal cual
  if (typeof qValue === 'number') {
    const moduladorKey = HABITS_KEY_ALIASES[qKey] ?? qKey;
    habitsInputs[moduladorKey] = qValue;
    continue;
  }
  
  // Si es categorical, mapea
  const numeric = mapCategoricalToNumeric(qKey, String(qValue));
  if (numeric === undefined) continue;
  
  const moduladorKey = HABITS_KEY_ALIASES[qKey] ?? qKey;
  habitsInputs[moduladorKey] = numeric;
}
```

### 4. Tests obligatorios

`__tests__/habits-modulator-mapping.test.ts`:

```typescript
describe('Habits categorical → numeric mapping', () => {
  it('mapea exercise_freq=daily → ejercicio_semanal=7', () => { ... });
  it('mapea smoking=never → tabaquismo=0', () => { ... });
  it('devuelve undefined para key desconocida', () => { ... });
  it('devuelve undefined para valor categorical desconocido', () => { ... });
  it('respeta valores ya numéricos sin tocar', () => { ... });
  
  // E2E: perfil Enrique → score hábitos ≥80 → factor 0.95
  it('perfil Enrique: hábitos completos → factor 0.95', () => {
    // Mock cuestionario con: daily exercise, never smoking, never alcohol, 
    // weekly IF, good sleep, low stress
    // Correr modulador
    // Expect score hábitos ≥80
    // Expect factor = 0.95
  });
});
```

### 5. NO actualizar el cuestionario UI

No tocar la pantalla del cuestionario hábitos. Solo el lado del modulador. Es exactamente eso lo que Mariana ya validó.

---

## ENTREGABLE

- [ ] tsc --noEmit → 0 errores
- [ ] vitest → 367/367 (+5-7 nuevos)
- [ ] Branch pusheado a `origin/fix/habits-modulator-mapping`
- [ ] COWORK_REPORT.md con:
  - Archivos tocados
  - Hipótesis del bug confirmada con prueba (drill-down output)
  - Valores del mapping table (justificación de cada uno)
  - Test E2E del perfil Enrique (score y factor obtenidos)
  - Smoke test checklist para Enrique
- [ ] NO merge, NO OTA — Enrique valida con captura real

---

## SMOKE TEST PARA ENRIQUE (incluir en report)

1. Abrir cuestionario hábitos en la app, responder con su perfil real:
   - exercise: daily
   - smoking: never
   - alcohol: rare o never
   - ayuno: daily o weekly
   - sleep: good
   - stress: low
2. Guardar.
3. Ir a Edad ATP → ver score hábitos → debe ser ≥80.
4. Edad ATP final debe bajar respecto al valor pre-fix (sin capturar todavía los 4 cinemáticos).
5. Después capturar los 4 cinemáticos → Edad ATP debe bajar más (hacia ~27.3).

---

## RECORDATORIOS CRÍTICOS

1. NUNCA reescribir archivos completos → solo str_replace quirúrgico
2. tsc --noEmit antes de commit
3. PowerShell 5.1 sin `&&` en comandos sugeridos para Enrique
4. NO migración SQL en este sprint
5. NO tocar UI del cuestionario hábitos
6. NO tocar motor v2 ni matrices V8
7. NO merge, NO OTA — push y espera

## STACK CONTEXT

- React Native + Expo SDK 54 + TypeScript + Supabase
- Motor Edad ATP v2 en `src/services/edad-atp/`
- Cuestionario hábitos: buscar con grep `exercise_freq` o `habits_questionnaire`
