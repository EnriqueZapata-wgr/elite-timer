# 📦 DELIVERY · LOS TRES BUGS DE MARIANA · 2026-08-03

**Rama:** `feat/nocturno` (continúa el run; se mergea junto).
**Brief:** `R and D/AWAY_RUN_BUGS_MARIANA.md`.
**3 commits, uno por bug** + este reporte. `tsc`, Vitest y `npm run censo` en verde antes de cada uno.

| Commit | Bug | Qué |
|---|---|---|
| 62a707b | M1 🚨 | checkin ya no puede caerse del universo del HOY + migración 248 **ya aplicada al remoto** |
| 7daa8d4 | M2 | El cierre del check-in scrollea y "Volver" nunca se recorta |
| 822dad2 | M3 | El sheet del editor de ciclo funciona de verdad + las predicciones aprenden |

---

## 1 · M1.b: cuántas filas reparó la migración

La migración `248_checkin_repair_day_prefs.sql` quedó en el repo (idempotente) **y además
se ejecutó ya contra el proyecto remoto** (`ELITE-APP-FULLDB`, vía MCP `execute_sql`,
el camino de la casa para migraciones remotas):

- **Antes:** 4 filas en `user_day_preferences`, **3 sin `checkin`**, 0 con lista NULL.
- **Reparadas: 3 filas** (se les agregó `checkin` sin duplicar y sin tocar el resto).
- **Después:** 0 filas sin `checkin`, y el DEFAULT de la columna verificado:
  `['sunlight','meditation','supplements','cold_shower','grounding','no_alcohol','checkin']`.

Esto arregla a las dos usuarias **hoy, en el binario que ya tienen**: el compilador
embarcado lee la lista persistida y el verificado de checkin existe desde v13d. No
dependen del OTA. El `db push` formal re-correrá la 248 sin efecto (idempotente).

## 2 · M1.d: qué otros electrones tienen el mismo patrón

El patrón del hueco: estar en `DEFAULT_BOOLEANS` sin estar en `MANDATORY_BOOLEANS`, y
que una fila persistida vieja no lo traiga. Enumeración completa de DEFAULT sin
MANDATORY (antes del fix):

| Electrón | ¿En DEFAULT de columna 043? | ¿En ALL_BOOLEAN_OPTIONS? | Veredicto |
|---|---|---|---|
| sunlight | ✅ | ✅ | Toda fila nace con él; si falta fue decisión y es reactivable. No cae. |
| meditation | ✅ | ✅ | Ídem. |
| supplements | ✅ | ✅ | Ídem. |
| cold_shower | ✅ | ✅ | Ídem. |
| grounding | ✅ | ✅ | Ídem. |
| no_alcohol | ✅ | ✅ | Ídem. |
| **checkin** | ❌ | ❌ | **La única víctima real: sin red alguna. Corregido (MANDATORY + mig 248).** |

- `journal`, `no_processed_foods`, `screen_time_cutoff` también están en DEFAULT pero SON
  MANDATORY: la unión del compilador los rescata (por eso nunca reportaron este bug).
- Cuantitativos: DEFAULT del código = `['protein','water']`; DEFAULT de la columna =
  `['protein','steps','water']` (superconjunto; steps/sleep se filtran por no tener
  fuente). **Sin víctimas.**
- `nback`, `period_log`, `strength`, `breathwork`, `red_glasses`: no están en DEFAULT,
  son opt-in por catálogo. Fuera del patrón.

**Y quedó blindado a futuro:** el test nuevo en `day-booleans.test.ts` exige que todo
DEFAULT no-MANDATORY sea seleccionable o viva en la fila 043. Un electrón nuevo que
caiga en el patrón de checkin truena en CI, no en el teléfono de una usuaria.

## 3 · Decisiones y desvíos del brief (con porqué)

1. **M1.a eligió MANDATORY** (la red v13e, la misma de journal/cardio): checkin es el
   hábito raíz de Mente, verificado por actividad real, y la memoria del proyecto ya
   registraba este gotcha ("nuevos booleanos van en MANDATORY, no solo DEFAULT").
2. **NO se metió a `ALL_BOOLEAN_OPTIONS`, apartándose de la letra del brief.** Mandatory
   + toggle de catálogo produce un toggle que se apaga y no apaga nada (la unión lo
   revive): la clase exacta de "toggle silencioso" que v13e mató. Con MANDATORY la
   reactivación es innecesaria porque ya no puede apagarse. Si el día de mañana se
   decide que checkin sea opcional, el camino es sacarlo de MANDATORY Y meterlo al
   catálogo a la vez.
3. **Consecuencia asumida:** la app `emociones` en la sala pasa a **fija** (como Journal
   y Cardio): ya no se instala/desinstala. Coherente con "hábito raíz"; tests de
   install-core actualizados. Si Enrique prefiere emociones desinstalable, es revertir
   MANDATORY y aplicar el camino del punto 2.
4. **Precisión sobre el brief de M3.b:** `predictNext` SÍ tiene importador en esta rama:
   `getCycleInfo` la llama (y de ahí HOY, ARGOS, historial emocional, prescripciones,
   recetas). Lo que era cierto: **la pantalla de ciclo no la usaba para nada** (fase,
   calendario, barra y "DÍA X DE 28" salían del ajuste manual), y dentro de
   `getCycleInfo` la fase también usa el ajuste. El fix hace que la pantalla aprenda del
   promedio observado; `getCycleInfo` comparte ahora el mismo núcleo para su predicción.

## 4 · M3.c: las dos fuentes de verdad del ciclo (documentado, NO unificado)

| Fuente | Quién escribe | Quién lee |
|---|---|---|
| `cycle_daily_logs` | El editor de día de `/cycle` (upsert por user+fecha) | La pantalla `/cycle` completa: calendario, fase en vivo, síntomas |
| `cycle_periods` | SOLO `recalcPeriods()` dentro de `/cycle` (delete+insert batch al guardar un día con periodo) | `getCycleInfo` → HOY (compileDay), ARGOS (contexto), historial emocional, prescripciones, recetas; y ahora también el promedio observado de la propia pantalla |

Riesgo documentado: si el guardado no ocurre, ambas quedan viejas a la vez; si
`recalcPeriods` falla a la mitad (su insert ya avisa), quedan distintas. La unificación
(una sola tabla o `cycle_periods` como vista derivada) es proyecto propio; queda aquí
escrito para decidirlo con Enrique y Mariana.

## 5 · Lo que quedó fuera y por qué

- **`cycle-settings.tsx` sigue mostrando el número manual sin anotar que la pantalla
  principal ya aprende.** La procedencia se dice donde se consume (card de fase). Añadir
  la nota en ajustes toca copy de un flujo que Mariana revisa; barato de sumar después.
- **La fase dentro de `getCycleInfo` (HOY/ARGOS) sigue usando el ajuste manual.** Darle
  el promedio observado ahí cambia el contexto que ve ARGOS y la Edad ATP; mejor como
  decisión consciente, no de contrabando en un fix de bugs.
- **Unificación de las dos fuentes del ciclo** (sección 4): proyecto propio.
- **Migración 246**: intocada, sigue esperando tu verificación del constraint.

## 6 · Verificación en dispositivo (para Enrique / Mariana)

1. Check-in emocional → **la card de HOY se palomea**, en una cuenta que YA tenía el
   problema (las 3 filas reparadas) y en una nueva.
2. Cierre del check-in: "Volver" completo **con racha + banner de crisis + las dos
   cards + puente a Tribu** (el caso peor scrollea).
3. Editor de día en Ciclo: el sheet **scrollea** y "¿Tienes periodo hoy?" se ve.
4. Registrar periodo hoy → contador a **día 1** y fase menstrual, en `/cycle` y en HOY.
5. Cerrar el editor con cambios sin guardar **avisa** (tocar fuera, Cancelar y back).
6. La card de fase dice **de dónde sale** la longitud del ciclo (promedio de tus últimos
   N ciclos, o según tus ajustes).
