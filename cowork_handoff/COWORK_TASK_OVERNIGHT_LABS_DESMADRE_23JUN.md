# COWORK_TASK — Sprint OVERNIGHT: ATP LABS Desmadre (23-jun)

**Origen:** smoke real de Enrique 23-jun. Pantallaso del catálogo ATP LABS muestra 4 problemas simultáneos:

(A) Duplicados por idioma — parser extrae sinónimos en/es como entradas separadas
(B) Valores absurdos — testosterona total 9.97 ng/dL, prolactina ng/dL en vez de ng/mL, WBC 0500
(C) Items basura — "Levocartine fatum", "h41", "Iuf 105", "BIO leukocitos total"
(D) Mix idioma visible al usuario

**Branch base:** `main` (con todo lo del 4partes ya mergeado)
**Branch nueva:** `feat/labs-desmadre-fix`
**Estimado:** 4-6h CC overnight
**SQL:** 1 migración (095) + scripts de limpieza data
**Deploy:** ❌ NO merge, NO OTA. Push final, Enrique audita.

**OVERNIGHT MODE:** Si bloqueante, opción conservadora + documentar. NO frankenstein.

---

# CONTEXTO OBLIGATORIO

Leer PRIMERO:
1. `src/constants/lab-canonical-map.ts` — mapa actual
2. `src/constants/lab-clinical-ranges.ts` — rangos clínicos
3. `app/edad-atp/labs.tsx` — UI de LABS donde se muestran los duplicados
4. `app/edad-atp/biomarkers.tsx` — UI donde se muestran biomarcadores individuales
5. `src/services/edad-atp/lab-values-service.ts` — query lectura
6. `supabase/functions/lab-parser-worker/index.ts` — donde se INSERTAN al parser AI exitoso

---

# DIAGNÓSTICO INICIAL (FASE 0)

Antes de tocar código, CC corre estas queries y documenta en `cowork_handoff/INVENTARIO_LABS.md`:

```sql
-- Query 1: TODOS los parameter_keys que existen en DB
SELECT parameter_key, COUNT(*) as records, COUNT(DISTINCT user_id) as users,
       MAX(value) as max_val, MIN(value) as min_val,
       array_agg(DISTINCT unit) as units
FROM lab_values
GROUP BY parameter_key
ORDER BY records DESC;

-- Query 2: parameter_keys que NO están en LAB_COLUMN_TO_CANONICAL ni en CANONICAL_TO_RANGE_KEY
-- (estos son CANDIDATOS a basura o a agregar al map)
-- Compara contra la lista actual del mapa.

-- Query 3: detectar duplicados — pares parameter_key que probable son el mismo lab
-- en distintos idiomas o unidades
-- Heurística: mismo user_id, fecha similar (±7 días), valores numéricamente cercanos
SELECT a.parameter_key as key_a, b.parameter_key as key_b, COUNT(*) as duplicates_count
FROM lab_values a
JOIN lab_values b ON a.user_id = b.user_id
  AND a.parameter_key < b.parameter_key
  AND ABS(EXTRACT(EPOCH FROM (a.created_at - b.created_at))) < 7*86400
  AND ABS(a.value - b.value) < 5  -- valores cercanos
GROUP BY a.parameter_key, b.parameter_key
HAVING COUNT(*) >= 2
ORDER BY duplicates_count DESC;
```

Output esperado en INVENTARIO_LABS.md:
- Tabla: parameter_keys totales con counts
- Tabla: parameter_keys huérfanos (no en mapa)
- Tabla: pares duplicados sospechosos
- Recomendación por cada caso: KEEP / DELETE / MERGE_INTO / RENAME

---

# FASE 1 — Reforzar alias en EXTRACTED_KEY_ALIASES (1-2h)

Basado en el screenshot de Enrique, sabemos que aparecen estos pares en/es:

| Inglés (parser) | Español (canonical) | Acción |
|---|---|---|
| testosterone | testosterona_total | Aliasear |
| total_cholesterol | colesterol_total | Aliasear |
| triglycerides | trigliceridos | Aliasear |
| insulin | insulina | Aliasear |
| creatinine | creatinina_serica | Aliasear |
| calcium | calcio | Aliasear |
| iron | hierro_serico | Aliasear |
| albumin | albumin (mantener inglés, PhenoAge) |
| uric_acid | acido_urico | Aliasear |
| (chloride) | cloro | Aliasear si parser emite |
| (sodium) | sodio | Aliasear |
| (potassium) | potasio | Aliasear |

**Acción:** agregar todos los aliases en `EXTRACTED_KEY_ALIASES` (lab-canonical-map.ts). Hacer un audit completo: por cada entrada de `LAB_COLUMN_TO_CANONICAL` cuyo `keys[0]` está en español, agregar el alias inglés correspondiente.

Validar: corre el inventario (Query 1) DESPUÉS de aplicar fix → debe haber menos parameter_keys distintos.

---

# FASE 2 — Deduplicar UI ATP LABS (1-2h)

## Problema actual
`app/edad-atp/labs.tsx` muestra TODAS las filas de `lab_values` sin agrupar por canonical. Si un usuario tiene `testosterone` Y `testosterona_total`, aparecen DOS filas.

## Fix
Antes de renderizar, agrupar en cliente por `parameter_key` y mostrar UN solo valor por grupo (el más reciente con mayor confianza).

```typescript
// src/services/edad-atp/lab-values-service.ts (o similar)
function dedupLabValues(values: LabValue[]): LabValue[] {
  const byKey = new Map<string, LabValue>();
  for (const v of values) {
    const existing = byKey.get(v.parameter_key);
    if (!existing) {
      byKey.set(v.parameter_key, v);
    } else {
      // Más reciente gana. Si misma fecha, mayor confianza/extraction_quality gana.
      const newer = new Date(v.measured_at ?? v.created_at) > new Date(existing.measured_at ?? existing.created_at);
      if (newer) byKey.set(v.parameter_key, v);
    }
  }
  return Array.from(byKey.values());
}
```

**Pero PRIMERO** aplicar los alias del Fix 1 al INSERT. Lo de deduplicar UI es defense in depth — el INSERT debe canonicalizar correctamente para que nuevos uploads no creen duplicados.

---

# FASE 3 — Migración 095: limpieza data viejos (1h)

## Migración 095_lab_values_cleanup.sql

Aplica las decisiones del inventario de FASE 0:

```sql
-- 095_lab_values_cleanup.sql
-- Limpieza de lab_values: parameter_keys basura del parser AI (sin mapeo canónico).

-- Caso 1: borrar entradas claramente basura identificadas en INVENTARIO_LABS.md
-- (Levocartine fatum, h41, Iuf 105, BIO leukocitos, etc.)
DELETE FROM lab_values
WHERE parameter_key IN (
  'levocartine_fatum', 'h41', 'iuf', 'bio_leukocitos_total'
  -- agregar más según inventario CC
);

-- Caso 2: NORMALIZAR duplicados por idioma (mover inglés → español)
-- Ejemplo: testosterone → testosterona_total
UPDATE lab_values SET parameter_key = 'testosterona_total'
  WHERE parameter_key = 'testosterone';
UPDATE lab_values SET parameter_key = 'colesterol_total'
  WHERE parameter_key = 'total_cholesterol';
UPDATE lab_values SET parameter_key = 'trigliceridos'
  WHERE parameter_key = 'triglycerides';
UPDATE lab_values SET parameter_key = 'insulina'
  WHERE parameter_key = 'insulin';
UPDATE lab_values SET parameter_key = 'creatinina_serica'
  WHERE parameter_key = 'creatinine';
UPDATE lab_values SET parameter_key = 'calcio'
  WHERE parameter_key = 'calcium';
UPDATE lab_values SET parameter_key = 'hierro_serico'
  WHERE parameter_key = 'iron';
UPDATE lab_values SET parameter_key = 'acido_urico'
  WHERE parameter_key = 'uric_acid';
-- (extender lista con todos los pares detectados por FASE 0)

-- Caso 3: VALORES ABSURDOS (out of clinical_range)
-- Marcarlos como pending_review en metadata (no borrar — usuario puede haber capturado mal,
-- pero algunos son bugs del parser que afectan UX hoy).

-- Testosterona total 9.97 ng/dL: probable bug de unidad (parser guardó ng/mL como ng/dL)
-- Si el valor < 50 ng/dL Y unidad ng/dL → probablemente está en ng/mL, multiplicar ×100
UPDATE lab_values
  SET value = value * 100,
      metadata = COALESCE(metadata, '{}'::jsonb) || '{"auto_corrected_unit": "ng/mL→ng/dL ×100"}'::jsonb
WHERE parameter_key = 'testosterona_total'
  AND value < 50
  AND unit = 'ng/dL';

-- Prolactina con unidad ng/dL probablemente debe ser ng/mL (mismo número)
UPDATE lab_values
  SET unit = 'ng/mL',
      metadata = COALESCE(metadata, '{}'::jsonb) || '{"auto_corrected_unit": "ng/dL→ng/mL (etiqueta)"}'::jsonb
WHERE parameter_key = 'prolactina'
  AND unit = 'ng/dL';
```

⚠️ **NO ejecutar** — Enrique aplica con `npx supabase db push` después de auditar.

---

# FASE 4 — Reforzar lab-parser-worker (30 min)

`supabase/functions/lab-parser-worker/index.ts` es donde el parser AI inserta a `lab_values`. Verificar:

1. ¿Usa `toCanonicalEntries()` de `lab-canonical-map.ts`?
2. ¿Filtra entradas con `parameter_key` no canónico (sin entrada en `LAB_COLUMN_TO_CANONICAL`)?
3. ¿Aplica `isLabValueValid()` antes de insertar?

Si NO filtra parameter_keys huérfanos, agregar:
```typescript
// Antes del INSERT batch
const canonical = toCanonicalEntries(extractedRaw);
// canonical ya filtra automáticamente lo que no tiene mapping (regla en toCanonicalEntries)

// Validación clínica adicional
const valid = canonical.filter(({parameter_key, value}) => 
  isLabValueValid(parameter_key, value)
);

// Insertar solo lo válido
```

---

# FASE 5 — Tests + COWORK_REPORT (30 min)

## Tests obligatorios

```
src/services/edad-atp/__tests__/lab-values-dedup.test.ts
  - dedup vacío
  - dedup sin colisiones
  - dedup con duplicados → más reciente gana
  - dedup con misma fecha → mayor confidence gana

src/constants/__tests__/lab-canonical-aliases.test.ts
  - testosterone → testosterona_total (vía aliases)
  - total_cholesterol → colesterol_total
  - etc.
  - toCanonicalEntries con keys inglés del parser → canonical correcto
```

## COWORK_REPORT.md
Anexar sección nueva "Sprint LABS Desmadre (23-jun)" con:
- Tabla 5/5 fases con estado
- INVENTARIO_LABS.md generado en FASE 0 (resumen)
- Decisiones de DELETE / MERGE por cada parameter_key huérfano
- Tests añadidos
- Pendientes Enrique (db push 095, OTA)

---

# ENTREGABLE

## Archivos a crear
```
cowork_handoff/INVENTARIO_LABS.md                          ← análisis FASE 0
supabase/migrations/095_lab_values_cleanup.sql             ← migración
src/services/edad-atp/__tests__/lab-values-dedup.test.ts   ← tests
src/constants/__tests__/lab-canonical-aliases.test.ts      ← tests
```

## Archivos a modificar
```
src/constants/lab-canonical-map.ts                         ← +aliases en/es
src/services/edad-atp/lab-values-service.ts                ← función dedup
app/edad-atp/labs.tsx                                      ← usar dedup
supabase/functions/lab-parser-worker/index.ts              ← filtrar huérfanos
COWORK_REPORT.md                                            ← sección nueva
```

## Tests obligatorios
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos pasan + nuevos
- [ ] Tests cubren dedup + aliases

## Pendiente Enrique post-merge
- [ ] `npx supabase db push` (migración 095 — limpieza data)
- [ ] OTA preview con eas update
- [ ] Smoke en device: ATP LABS sin duplicados ni valores absurdos

---

# CONSTANTES Y REGLAS

1. NUNCA reescribir archivos completos → str_replace quirúrgico
2. Tokens canónicos
3. App primordialmente en ESPAÑOL — keys canónicas SIEMPRE en español, inglés solo como alias
4. NO tocar motor v2, edad-atp v2 cálculo, economía
5. `npx tsc --noEmit` antes de cada commit
6. Migración 095 como archivo .sql, NO ejecutar
7. Si parameter_key tiene <2 registros Y no está en mapa → probable basura, marcar DELETE candidato

---

# ORDEN ESTRICTO

1. Crear branch `feat/labs-desmadre-fix` desde `main`
2. **FASE 0** — inventario en `cowork_handoff/INVENTARIO_LABS.md`
3. **FASE 1** — aliases en EXTRACTED_KEY_ALIASES
4. **FASE 2** — dedup UI
5. **FASE 3** — migración 095 limpieza
6. **FASE 4** — reforzar parser worker
7. **FASE 5** — tests + COWORK_REPORT
8. Push branch, NO merge, NO OTA

Buena overnight 🌙
