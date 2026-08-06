# 🔧 Métodos ATP auto-ajustables (spec + recurso de coaching)

**Fuente:** Enrique (autor del método), 2026-07-24. **Doble uso:** (1) recurso para enseñar a la gente a aplicarlo en-app; (2) spec para verificar que los ejecutores en código (`EMOMAuto.tsx`, `MyoReps.tsx`) hagan exactamente esto.

---

## EMOM auto-ajustable

**Notación:** `EMOM N×S` = N repeticiones por serie, S series. Arrancas cada serie al inicio de cada minuto; descansas lo que sobre del minuto. Objetivo: estrés metabólico + hipertrofia + alto volumen en poco tiempo (acidosis muscular).

### La serie X+1 (paga-deuda)
Siempre existe una **serie extra, la X+1** (la serie S+1). Sirve para **pagar la deuda** acumulada durante el ejercicio.

- **Deuda** = suma de repeticiones faltantes en cada serie = `Σ (N − reps_logradas_en_serie_i)`.
- La serie X+1 se ejecuta con **ese número de reps** (= la deuda total).

**Ejemplo (EMOM 10×10):** series 1-7 completas (10 c/u), serie 8 = 9 reps (falta 1), serie 9 = 9 (falta 1), serie 10 = 8 (faltan 2). **Deuda = 1+1+2 = 4** → la serie X+1 (la 11ª) es de **4 repeticiones**.

### Regla de auto-ajuste del peso (para la próxima vez)
Se compara la **deuda (serie X+1)** contra las **reps completadas en la última serie (serie X = serie S)**:

| Condición | Diagnóstico | Acción |
|---|---|---|
| deuda **= 0** | el peso fue muy bajo | **SUBIR** peso |
| **0 < deuda ≤ reps(serie X)** | el peso está adecuado | **MANTENER** |
| deuda **> reps(serie X)** | el peso fue muy alto | **BAJAR** peso |

**Verificación con el ejemplo:** serie X (10ª) = 8 reps; deuda = 4. ¿4 ≤ 8? Sí → **peso adecuado, mantener.** ✓
**Segundo ejemplo:** si en la serie X hubiera logrado 6 y la deuda fuera 7 → ¿7 > 6? Sí → **bajar peso.** ✓

### Aplicabilidad (columna `EMOM-apto` de la matriz)
El vehículo se cuida según la experiencia: Todos (máquina/cable/banda/peso corporal) · Intermedio+ (mancuerna/KB/goblet/smith) · Avanzado (barra libre no-espinal) · No (olímpicos/explosivos, bisagra espinal con barra libre, isométricos).
Ejemplos clásicos de Enrique: EMOM 10×10 u 8×8 de prensa, sentadilla hack, lagartijas, burpees, pull-ups.

> ✅ **VERIFICADO (Cowork 2026-07-24):** `src/components/training/EMOMAuto.tsx` implementa la regla EXACTA. Deuda por ronda = `max(0, targetReps − reps)`, acumula en `totalDebt`; `finalDebt===0` → "Peso bajo, sube"; en `completeDebtPayment`, `totalDebt > lastRound` → "Peso alto, bájale", si no → "Peso OK" (mantener). La serie X+1 es la fase `'debt'`. Sin cambios necesarios.

---

## Myo-reps auto-ajustable

**Estructura:** una **serie de PRECARGA** (activación) + varias **series de SOBRECARGA**. Entre CADA serie (precarga o sobrecarga) solo hay **5 segundos de descanso**.

- **Precarga ("serie cero"):** 20 repeticiones con un peso. Es solo requisito de activación — **NO se cuenta.**
- **Sobrecarga:** con el MISMO peso, tras 5 s → 5 reps → 5 s → 5 reps → 5 s → 5 reps… consecutivamente. **Estas SÍ se cuentan.**

**Objetivo:** llegar al **fallo** (no lograr las 5 reps) en la ventana de series de sobrecarga **6 a 9**.

### Regla de auto-ajuste del peso
| Dónde llega el fallo | Diagnóstico | Acción |
|---|---|---|
| Fallo en sobrecarga **6, 7, 8 o 9** | peso adecuado | **MANTENER** |
| Fallo en sobrecarga **1, 2, 3, 4 o 5** | peso muy alto | **BAJAR** |
| Llega a la **10 o más** sin fallo | peso muy bajo | **SUBIR** |

**Resumen:** precarga 20 (no cuenta) → mini-series de 5 con 5 s de descanso → cuenta las mini-series; la ventana ideal de fallo es 6-9. Antes = pesado, después = ligero.

> ✅ **VERIFICADO (Cowork 2026-07-24):** `src/components/training/MyoReps.tsx` implementa la regla correctamente en las ventanas principales: activación 20 (no contada, `activationReps` aparte), sobrecargas de 5 con 5 s, fallo en set 1-5 → "Peso alto, baja", fallo 6-9 → "Peso perfecto, mantén", completar set 10 → "Peso bajo, sube". **Micro-refinamiento pendiente (P3):** si el fallo ocurre EXACTAMENTE en el set 10+ el código dice "Peso OK" en vez de "sube" (línea 51) — caso raro; corregir cuando se toque MyoReps en MB-3 (cambiar el `else` a "Peso bajo, sube").

---

## Variantes lastradas (Enrique 2026-07-24)
Los de peso corporal lastrables se modelan como **filas separadas** (mismo clip MoveKit, `Cargable = Sí`, aceptan peso al registrar): p. ej. `Pull-up` + `Pull-up lastre`, `Push-up` + `Push-up lastre`. No se cambia el video; solo el tag y el registro. Propuesta de set a duplicar con variante lastre: **pull-ups, chin-ups, push-up, parralel-bar-dips, bench-dips, inverted-row** (Enrique confirma/ajusta la lista).
