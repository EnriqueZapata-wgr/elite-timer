# COWORK_TASK — Sprint Cinemáticos Unificados + Hábitos drill-down (OVERNIGHT)

**Origen:** Fase 3 motor v2. Sin estos 4 params (plank, BOLT, old_man_test, recovery_hr) la Edad ATP de Enrique sale 29.3 en vez de 27.3 — son los huecos finales del fitness. Además el score de hábitos parece dar 1.0 cuando debería ser 0.95 (perfil ≥80).

**Branch:** `feat/cinematicos-habitos-v2` desde `main` (después del merge de los 3 fixes premium — ya está limpio).
**Estimado:** 6-8h CC.
**SQL:** ⚠️ UNA migración mínima (`fitness_kinematic_tests` table — idempotente).
**Deploy:** ❌ NO merge, NO OTA — Enrique valida en la mañana antes.

**Filosofía:** simple beats smart en UX. Bulletproof en motor. Ante duda → opción premium pero documenta el flag claro en COWORK_REPORT.md.

**OVERNIGHT MODE:** Enrique no está disponible. Si encuentras una decisión que normalmente preguntarías:
1. Toma la decisión más conservadora (premium + bulletproof)
2. Documéntala en COWORK_REPORT.md como flag con justificación
3. Continúa, NO te bloquees esperando respuesta

---

## PARTE 1 — Cuestionarios cinemáticos unificados (4-5h)

### Migración SQL (mínima, idempotente)

```sql
-- supabase/migrations/074_fitness_kinematic_tests.sql
CREATE TABLE IF NOT EXISTS fitness_kinematic_tests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id),
  test_key     text NOT NULL,  -- 'plank' | 'bolt' | 'old_man_test' | 'recovery_hr'
  value        numeric NOT NULL,
  unit         text NOT NULL,  -- 'seconds' | 'seconds' | 'seconds' | 'bpm'
  measured_at  timestamptz NOT NULL DEFAULT now(),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fitness_kinematic_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User manages own kinematic tests" ON fitness_kinematic_tests;
DROP POLICY IF EXISTS "Coach manages client kinematic tests" ON fitness_kinematic_tests;
CREATE POLICY "User manages own kinematic tests" ON fitness_kinematic_tests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coach manages client kinematic tests" ON fitness_kinematic_tests FOR ALL USING (
  EXISTS (SELECT 1 FROM coach_clients cc
          WHERE cc.coach_id = auth.uid() AND cc.client_id = fitness_kinematic_tests.user_id AND cc.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_kinematic_latest 
  ON fitness_kinematic_tests (user_id, test_key, measured_at DESC);
```

⚠️ NO ejecutar la migración — déjala como archivo `.sql` listo. Enrique la corre manual.

### 4 Tests a capturar

#### 1. Plank Test (segundos)
- **Pantalla:** `app/edad-atp/test-plank.tsx`
- **Captura:** botón "Empezar" → cronómetro grande → "Detener" → guarda segundos
- **UX:** instrucciones visuales (foto silueta correcta) + timer arriba
- **Validación:** 0-600s (10 min cap)
- **Helper:** "¿Cómo se hace? → modal con técnica correcta"

#### 2. BOLT Score (segundos)
- **Pantalla:** `app/edad-atp/test-bolt.tsx`
- **Captura:** instrucción "Exhala normal, tapa nariz, mide segundos hasta primera urgencia"
- **Cronómetro:** Empezar / Detener / Reiniciar
- **Validación:** 0-120s
- **Helper:** explicación corta sobre qué mide (tolerancia CO2)

#### 3. Old Man Test (segundos)
- **Pantalla:** `app/edad-atp/test-old-man.tsx`
- **Captura:** "Sin usar manos, siéntate y levántate del piso. Mide segundos."
- **Cronómetro:** Empezar / Detener
- **Validación:** 0-60s
- **Helper:** video corto o foto de cómo se hace (si no, descripción textual)

#### 4. Recovery HR (BPM)
- **Pantalla:** `app/edad-atp/test-recovery-hr.tsx`
- **Captura:** "HR al pico de ejercicio" + "HR a 1 min de descanso" → calcula delta
- **Inputs:** 2 NumberInputRow
- **Validación:** ambos 40-220 BPM
- **Helper:** "¿Cómo medir? Apple Watch, Garmin, o tu pulso manual durante 15s × 4"

### Pantalla índice nueva

`app/edad-atp/cinematic-tests-index.tsx`:
- Lista las 4 tests
- Cada uno: nombre + último valor capturado + fecha + chevron
- Tap → entra a pantalla individual
- Integrar en flujo SALUD → "Pruebas Cinemáticas" (entry point nuevo)

### Servicio

`src/services/edad-atp/kinematic-tests-service.ts`:
```typescript
export type KinematicTestKey = 'plank' | 'bolt' | 'old_man_test' | 'recovery_hr';

export async function saveKinematicTest(
  userId: string,
  testKey: KinematicTestKey,
  value: number,
  unit: 'seconds' | 'bpm',
  notes?: string,
): Promise<void> {
  const { error } = await supabase
    .from('fitness_kinematic_tests')
    .insert({ user_id: userId, test_key: testKey, value, unit, notes });
  if (error) throw error;
}

export async function getLatestKinematicTests(userId: string) {
  // Devuelve el último valor por test_key del usuario
}
```

### Integración con motor v2

El motor v2 ya espera estos 4 params en `fitness` area. Ahora hay que conectarlos:

`src/services/edad-atp/motor-v2-data-collector.ts` (o donde sea que se llene el input del motor):
- Después de leer composición + VO2max + push-ups + balance + agarre, llamar `getLatestKinematicTests`
- Mapear a los keys del motor: `plank → plank_seconds`, `bolt → bolt_seconds`, `old_man → old_man_seconds`, `recovery_hr → recovery_hr_delta`
- Si están presentes → motor los usa
- Si no → motor renormaliza (doctrina CE)

**Verificar con test:** capturar los 4 con valores típicos de Enrique:
- plank: 180s (3 min — atleta GWR)
- bolt: 40s (excelente)
- old_man_test: 8s (excelente)
- recovery_hr: 30 BPM delta (excelente)

Después correr el motor y validar que Edad ATP baja de 29.3 hacia ~27.3 (target original validado en 4 pacientes).

---

## PARTE 2 — Hábitos drill-down (1-2h)

### Bug a investigar

Estado actual: pre-modulador 29.1 → final 29.3. Eso significa factor 1.0 (banda 60-79). Con el perfil de Enrique (atleta GWR, biohacker) debería ser ≥80 (0.95) → final ~27.6.

### Lo que CC debe hacer

1. Buscar dónde se calcula el "Score Hábitos 0-100":
   - Probable: `src/services/habits-score-service.ts` o similar
   - Si no existe → buscar en `src/services/edad-atp/`
2. Imprimir el drill-down completo:
   - ¿Qué params se leen? (sueño, comida, hidratación, ejercicio, journal, electrones)
   - ¿Cuál es el peso de cada uno?
   - ¿Qué scores devuelve cada uno para Enrique?
3. Encontrar el / los param(s) que están bajando el score:
   - ¿Hay alguno con default 0?
   - ¿Hay alguno que cuente días faltantes como score 0 sin renormalizar?
4. **NO arregles el bug todavía.** Documenta el findings en COWORK_REPORT.md con:
   - Drill-down completo del score
   - Param(s) que bajan
   - Hipótesis del bug
   - Propuesta de fix
5. Espera a que Enrique decida en la mañana.

### Si el findings es trivial (1 línea de código)

Si encuentras algo obvio (typo, default mal, falta renormalizar), aplícalo en el mismo branch con commit separado:
- `fix(habits): renormalizar score cuando faltan días de captura`

Si requiere decisión de producto → documentar y no tocar.

---

## ENTREGABLE

### Tests obligatorios
- [ ] tsc --noEmit → 0 errores
- [ ] vitest → todos los existentes siguen pasando
- [ ] Tests nuevos para `kinematic-tests-service.ts` (mínimo 5: save, get latest, validación rangos, motor integration, missing data)
- [ ] Test E2E: capturar los 4 + correr motor → Edad ATP Enrique baja de 29.3 hacia ~27.3 (validar exacto en COWORK_REPORT.md)

### COWORK_REPORT.md debe incluir
1. Arquitectura nueva (tabla + 4 pantallas + servicio + integración motor)
2. Decisión por cada UX call que hayas tomado solo (con justificación)
3. Findings completo del hábitos drill-down
4. Smoke test checklist para Enrique:
   - Capturar plank
   - Capturar BOLT
   - Capturar old man
   - Capturar recovery HR
   - Ver Edad ATP bajar después de capturar los 4
5. Flags pendientes para Enrique

### Push pero NO merge, NO OTA
- Branch pusheado a `origin/feat/cinematicos-habitos-v2`
- Migración 074 como archivo `.sql` lista — Enrique la corre manual
- Enrique valida en la mañana

---

## RECORDATORIOS CRÍTICOS (lee antes de empezar)

1. **NUNCA reescribir archivos completos** → solo str_replace quirúrgico
2. **NUNCA usar crypto.randomUUID** → usar `generateUUID` helper
3. **CADA CREATE TABLE → ENABLE ROW LEVEL SECURITY + policy** ✅ (la 074 ya lo tiene)
4. **Constants.expoConfig.extra** (no process.env directo)
5. **Después del trabajo: `npx tsc --noEmit`** antes de commit
6. **OTA por default** — NUNCA proponer native build a menos que detectes nueva dep nativa
7. **PowerShell 5.1** — no uses `&&` en comandos sugeridos para Enrique (líneas separadas)
8. **Migración SQL NO la ejecutes** — déjala como archivo, Enrique la corre manual (regla #12 CLAUDE.md)

---

## STACK CONTEXT

- React Native + Expo SDK 54 + TypeScript + Supabase
- Sentry + PostHog activos
- Motor Edad ATP v2 en `src/services/edad-atp/`
- Matriz V8 en `src/constants/edad-atp-matrix-*.ts`
- NumberInputRow component reutilizable existe en componentes
- Expo Router para nav
