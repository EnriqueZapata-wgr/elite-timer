# 🐞 AWAY RUN · los tres bugs de Mariana

**Rama:** seguir en `feat/nocturno`. Un commit por bug.
**Trae migración** (M1). `tsc`, Vitest y `npm run censo` en verde antes de cada commit.
Cero em dash en copy de usuario.

Reportados por dos usuarias reales en dispositivo. **M1 es el más grave y el que peor se
siente.**

---

# 🚨 M1 · El check-in se registra y la card dice que no

## Lo que vive la usuaria

Hace su check-in emocional. **Se le acreditan los 2.0 electrones.** Vuelve a HOY y la card sigue
apagada, diciendo "¿Cómo te sientes hoy?". La app le cobra el trabajo y le niega el crédito.

Le pasa a dos personas distintas en dos teléfonos distintos.

## La causa raíz, probada

**`checkin` nunca entra a `booleanElectrons`, así que la card no tiene de dónde leer su estado.**

1. `day-compiler.ts:257` → `const persistedBoolKeys = prefs?.active_boolean_electrons ?? DEFAULT_BOOLEANS;`
   **Si la usuaria tiene fila en `user_day_preferences`, gana la lista persistida y
   `DEFAULT_BOOLEANS` nunca se aplica.**
2. `043_day_preferences.sql:9` → el DEFAULT de esa columna es
   `['sunlight','meditation','supplements','cold_shower','grounding','no_alcohol']`.
   **Sin `checkin`.**
3. `day-compiler.ts:258` → la unión de rescate es con `MANDATORY_BOOLEANS`
   (`['journal','no_processed_foods','screen_time_cutoff','cardio']`). **`checkin` tampoco.**
4. `day-compiler.ts:300-320` → `booleanElectrons` se arma solo desde `activeBoolKeys`.
5. `HoyEditorialSection.tsx:146,205` → sin entrada en el mapa, `isDone('checkin')` es **`false`
   para siempre**.

`verifiedCompleted.checkin` **se calcula bien** (`day-compiler.ts:217-224`) y **se descarta**.

**Y no puede arreglarlo sola:** `checkin` no está en `ALL_BOOLEAN_OPTIONS`
(`day-booleans.ts:117-129`), así que tampoco aparece en `/hoy-habitos` para reactivarlo.

## Qué le crea la fila

Cuatro acciones inocentes, y basta una:
- `063_hydration_backfill_water_goal.sql:13` — un backfill masivo que ya corrió.
- `hydration-service.ts:54` — editar la meta de agua.
- `app/fasting.tsx:272` — guardar una meta de ayuno.
- `agenda-service.ts:546` — quitar un evento de la agenda.

Por eso no depende del teléfono.

## El arreglo, que son DOS partes

⚠️ **Arreglar el código no alcanza.** Las usuarias que ya tienen la fila mala seguirán rotas.

**M1.a · Código.** Que `checkin` no pueda volver a caerse. Elige UNA y hazla bien:
- meterlo a `MANDATORY_BOOLEANS`, que es la red que existe justo para esto, **o**
- que la lista persistida se una siempre con los que la app considera irrenunciables.
**Y meterlo a `ALL_BOOLEAN_OPTIONS`** para que sea reactivable desde `/hoy-habitos`.

**M1.b · Migración idempotente que repare a quien ya está roto.** Agregar `'checkin'` al arreglo
de `active_boolean_electrons` de toda fila que no lo tenga, sin duplicar y sin tocar el resto de
la lista. **Y corregir el DEFAULT de la columna** para que las filas nuevas nazcan bien.

**M1.c · El comentario miente y el test da falsa confianza.**
`day-booleans.ts:20-40` afirma *"no_alcohol y checkin SÍ palomean porque ambos sí son
seleccionables"*. Es falso para `checkin`. Corrígelo.
`day-booleans.test.ts:25-29` define el universo como `DEFAULT ∪ MANDATORY ∪ SELECCIONABLES`,
pero **en runtime es `(persistidos ?? DEFAULT) ∪ MANDATORY`**. Por eso el test pasa y producción
falla. **Que el test modele el universo real**, incluido el caso de una fila persistida corta.

**M1.d · Revisa si hay más víctimas.** El mismo patrón puede estar afectando a otros electrones
que están en DEFAULT pero no en MANDATORY. **Enuméralos y repórtalos**, aunque no los arregles.

---

# 🟠 M2 · El botón "Volver" queda cortado al cerrar el check-in

## La causa

`app/checkin.tsx:386-527`, la rama `if (step === 3)`. **No hay ScrollView en ninguna parte.**

- `:925` → `doneContainer: { flex: 1, justifyContent: 'center' }`. Altura fija a la pantalla y
  centrado vertical: **lo que sobra se recorta arriba y abajo por igual.**
- `Screen.tsx:33` → `edges = ['top']` por default, **no reserva el área segura inferior.**
- El contenido **crece condicionalmente** y "Volver" es el último hijo: pulso, título, subtítulo,
  frase de cierre, racha, banner de crisis, card de navegar, card de compartir, puente a Tribu.
  Con dos cards ya se pasa.

## El arreglo

`ScrollView` con `contentContainerStyle` que crezca (`flexGrow: 1`, no `flex: 1`), padding
inferior generoso, y área segura `bottom`.

⚠️ **Prueba el caso peor**, no el mínimo: check-in con racha activa, banner de crisis visible,
las dos cards y el puente a Tribu. Si en ese caso se ve completo, está bien.

---

# 🟠 M3 · El ciclo no se ajusta al registrar el periodo

## Lo que NO es

La lógica de recálculo **está bien**. `app/cycle.tsx:167-175` toma el último bloque consecutivo
de `is_period`, y `:260-264` deriva la fase en vivo. **No existe ningún valor congelado.**
Si el dato se guarda, el contador va a 1 y la fase a menstrual.

## M3.a · Lo más probable: nunca se guarda

El sheet del editor tiene `maxHeight: '90%'` (`:952-955`), pero su padre es un
`KeyboardAvoidingView` **sin `flex` ni altura** (`:700-703`). Un porcentaje de alto contra un
padre de altura automática **no resuelve**, así que ese `maxHeight` es inerte: el sheet crece con
el contenido, el ScrollView interior queda sin altura acotada y no scrollea. Como el overlay usa
`justifyContent: 'flex-end'`, **el desborde se va por arriba, que es justo donde vive
"¿Tienes periodo hoy?"**.

Y encima: elegir "Sí, tengo periodo" da háptico y cambia el color, **pero solo muta estado
local**. El único escritor es "Guardar registro", al fondo de un sheet de nueve secciones. Tocar
fuera o "Cancelar" cierra **sin guardar y sin avisar**.

**Arreglo:** que el `maxHeight` funcione de verdad (padre con altura resuelta), que el sheet
scrollee, y que **cerrar con cambios sin guardar avise** en vez de tirarlos en silencio.

## M3.b · Las predicciones nunca aprenden

Todo el calendario se construye con `settings.avg_cycle_length`, que **solo cambia si la usuaria
lo teclea a mano** en `cycle-settings.tsx:105`. Nada lo actualiza desde los ciclos observados.

**Existe `predictNext()` en `cycle-service.ts:83-95`, que sí promedia los ciclos reales, y NO
TIENE UN SOLO IMPORTADOR.** Está escrita y nadie la llama.

Por eso siempre dice "de 28" aunque su ciclo sea de 31.

**Arreglo:** que el promedio observado alimente la predicción cuando haya suficientes ciclos
registrados. ⚠️ **Y que se note de dónde sale:** si la app cambia su número, tiene que poder
decirle por qué. Nunca cambiar un dato de su cuerpo en silencio.

## M3.c · Dos fuentes de verdad

La pantalla de ciclo usa `cycle_daily_logs`. Pero `getCycleInfo` (`cycle-service.ts:105-129`),
que alimenta **HOY, Edad ATP y labs**, usa `cycle_periods`, una tabla que solo se reconstruye
desde dentro de `/cycle`.

Si el guardado no ocurre, **las dos quedan viejas a la vez**, y si ocurre a medias, quedan
distintas.

**No lo unifiques en este run**, es su propio proyecto. **Documéntalo** con lo que consume cada
una y déjalo escrito para decidir.

---

# 📦 ENTREGA

Un commit por bug. Migración idempotente. Reporte con:

1. **El resultado de M1.d:** qué otros electrones tienen el mismo patrón.
2. **Cuántas filas repara la migración** de M1.b.
3. Lo que quedó fuera y por qué.

**Verificación en dispositivo:**
1. Hacer check-in emocional → **la card de HOY se palomea.** En una cuenta que ya tenga el
   problema, no solo en una nueva.
2. La pantalla de cierre del check-in muestra el botón "Volver" completo, **con racha, banner y
   las dos cards visibles.**
3. Abrir el editor de un día en Ciclo: el sheet **scrollea** y se ve "¿Tienes periodo hoy?".
4. Registrar periodo hoy → el contador vuelve a **día 1** y la fase a menstrual, en esa pantalla
   y en HOY.
5. Cerrar el editor con cambios sin guardar **avisa**.
