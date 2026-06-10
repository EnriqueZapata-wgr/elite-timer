# FIX URGENTE — Lógica de 9 bandas debe replicar Excel EXACTO

## Causa raíz del gap 0.578 vs 0.6083 esperado

La implementación actual de `score9Bands` en `sf-9band-service.ts` usa la lógica simplificada:
```typescript
for i in 0..7:
  if value <= bandLimits[i]: return SCORES_9[i]
return SCORES_9[8]
```

Esta lógica **NO reproduce** las fórmulas del Excel V7/V6. Diferencias específicas detectadas:

### Bug 1: Valores en límite exacto caen en banda incorrecta

**Ejemplo:** Duración promedio = 6h con bandas `[6, 6, 7, 7.5, 8.5, 9, 9.5, 10]` (P=Q=6).
- Lógica actual: `6 <= 6` → banda 0 → score 0
- Excel real: cae en banda `Q <= value < R` (`6 <= 6 < 7`) → score 50 ✓

### Bug 2: Excel salta el límite V (rango riesgo 4)

En todas las hojas de dominio, la fórmula AD5 (Score 50, banda riesgo 4) es:
```excel
=IF(AND($D5>U5,$D5<=W5), AD$30, 0)
```
Va de **U5 directo a W5** (salta V5 = rango_riesgo_4). Significa que las bandas "riesgo 4" y "crítico 5" se **fusionan en una sola banda con score 50 cubriendo `(U, W]`**.

### Lógica EXACTA del Excel (descubierta por inspección de fórmulas col X-AF)

| Score discreto | Condición Excel |
|---|---|
| 0 (X) | `value <= P` |
| 25 (Y) | `P <= value < Q` |
| 50 (Z) | `Q <= value < R` |
| 80 (AA) | `R <= value < S` |
| 100 (AB) | `S <= value <= T` (cerrado a la derecha) |
| 80 (AC) | `T < value <= U` |
| 50 (AD) | `U < value <= W` **(salta V)** |
| 25 (AE) | casi nunca matchea (referencia X inválida en Excel) |
| 0 (AF) | `value >= W` |

El Excel calcula el score final con `=SUM(X5:AF5)`. Cualquier banda activa contribuye su score; las que no matchean contribuyen 0.

---

## Patch para `src/services/edad-atp/sf-9band-service.ts`

Reemplazar la función `score9Bands` con esta versión:

```typescript
/**
 * Replica EXACTAMENTE las fórmulas del Excel V7/V6 columnas X-AF.
 * Limits = [P, Q, R, S, T, U, V, W] (8 valores frontera, V se ignora por bug Excel).
 * Verificado contra paciente HOMBRES V7 ejemplo (Duración=6 → 50, no 0).
 */
export function score9Bands(value: number | null | undefined, bandLimits: (number | null)[]): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const [P, Q, R, S, T, U, _V, W] = bandLimits;  // V (índice 6) se omite

  let total = 0;
  // X (score 0): value <= P
  if (P != null && value <= P) total += 0;
  // Y (score 25): P <= value < Q
  if (P != null && Q != null && value >= P && value < Q) total += 25;
  // Z (score 50): Q <= value < R
  if (Q != null && R != null && value >= Q && value < R) total += 50;
  // AA (score 80): R <= value < S
  if (R != null && S != null && value >= R && value < S) total += 80;
  // AB (score 100): S <= value <= T (intervalo cerrado en óptimo 2)
  if (S != null && T != null && value >= S && value <= T) total += 100;
  // AC (score 80): T < value <= U
  if (T != null && U != null && value > T && value <= U) total += 80;
  // AD (score 50): U < value <= W (salta V — bug intencional del Excel: riesgo 4 + critico 5 fusionados)
  if (U != null && W != null && value > U && value <= W) total += 50;
  // AE (score 25): casi nunca matchea (ref X inválida) — omitida
  // AF (score 0): value >= W → contribuye 0, no afecta la suma

  return total;
}
```

## Tests obligatorios antes de reactivar el gate

Agregar a `__tests__/sf-9band-service.test.ts`:

```typescript
import { score9Bands } from '../sf-9band-service';

describe('score9Bands replica Excel V7 EXACTO', () => {
  // Ejemplos verificados directamente del Excel
  test('LDL=149, bands [30,50,60,80,120,150,160,180] → 80 (banda aceptable_3, T<v<=U)', () => {
    expect(score9Bands(149, [30,50,60,80,120,150,160,180])).toBe(80);
  });
  test('ApoB=105, bands [30,0,40,50,99,110,125,150] → 80 (banda aceptable_3)', () => {
    expect(score9Bands(105, [30,0,40,50,99,110,125,150])).toBe(80);
  });
  test('Col total=189, bands [115,130,150,180,220,250,280,350] → 100 (banda óptimo_2)', () => {
    expect(score9Bands(189, [115,130,150,180,220,250,280,350])).toBe(100);
  });
  test('Duración promedio=6, bands [6,6,7,7.5,8.5,9,9.5,10] → 50 (banda aceptable_-3 con P=Q)', () => {
    expect(score9Bands(6, [6,6,7,7.5,8.5,9,9.5,10])).toBe(50);
  });
  test('Testosterona total=3.32, bands [3,4.5,6,7,12,null,null,null] → 25 (banda riesgo_-4)', () => {
    expect(score9Bands(3.32, [3,4.5,6,7,12,null,null,null])).toBe(25);
  });
  test('LH=0.62, bands [0.9,1,1.5,2,8,9,10,null] → 0 (banda crítico_-5)', () => {
    expect(score9Bands(0.62, [0.9,1,1.5,2,8,9,10,null])).toBe(0);
  });
  test('Energía despertar=4, bands [6,6,7,9,10,null,null,null] → 0 (value < P)', () => {
    expect(score9Bands(4, [6,6,7,9,10,null,null,null])).toBe(0);
  });
});
```

## Después del fix

1. Correr `npx vitest run` — los 7 tests nuevos deben pasar.
2. Reactivar el gate (`it.skip` → `it`) del paciente HOMBRES V7. Debe reproducir SF = 0.6083 ± 0.005.
3. Si reproduce → continuar Fases 2-7 según COWORK_TASK.md original.
4. Si NO reproduce todavía → flag #2: investigar diferencias en ponderación o algún param con unidad/key distinta.

## Bonus: los expected scores domain-by-domain del paciente HOMBRES V7

Calcular contra fórmulas del Excel (hoja "Reporte de resultados"):
- metabolismo: ~0.50
- habitos: ~0.55-0.65
- cardiovascular: ~0.51
- sistema_hormonal: ~0.50
- sueño: ~0.55
- vitalidad: ~0.55
- inflamacion: ~0.65
- composicion_corporal: ~0.55
- renal_micronutrientes: 0.8242 (validado por CC)
- inmunidad: ~0.75

SF global ponderado debe converger a 0.6083.

---

**Resumen:** la lógica del Excel tiene asimetría intencional (algunos < y otros <=) y un salto del límite V. Sin replicarlo exacto, no se reproduce 0.6083. Aplicar el patch y reactivar el gate.
