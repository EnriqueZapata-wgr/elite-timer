# 👆 AWAY RUN MB-20.4 · se invierte el gesto

**Rama:** seguir en `feat/mb20-1-editorial`. Un commit por pieza.
**Cero migraciones.** `tsc`, Vitest y `npm run censo` en verde antes de cada commit.

---

# PIEZA 1 · Tap palomea, tap largo navega

## La decisión

**Se invierte.** Decisión de Enrique, y revierte la de la arquitectura V2:

| Gesto | Antes | **Ahora** |
|---|---|---|
| Tap simple | navegar | **palomear** |
| Tap largo | palomear | **navegar** |

## Por qué

HOY es un checklist. **La acción principal es palomear**, y estaba pagando el gesto caro:
diecisiete veces al día, cada una con un hold de 350 ms. Navegar es la acción secundaria y tenía
el gesto barato. Estaba al revés.

## Dónde aplica

**En las dos lentes, TAREAS y AGENDA.** Son la misma pantalla con dos vistas: gestos distintos
entre ellas sería peor que cualquiera de los dos órdenes.

Y en las tres superficies: la card editorial, la fila compacta y el renglón de hechas. Todas
pasan por `useTareaGesto`, así que el cambio vive en un solo lugar.

## Lo que NO cambia

- La **paloma inteligente** sigue igual: en las experiencias, el gesto de palomear (ahora el tap)
  abre *"¿Ya meditaste?"* con sus dos botones. Lo que cambia es qué gesto la dispara.
- **Ayuno sigue solo navegando.** Su gesto de navegar ahora es el tap largo.
- Los ocho de `ELECTRONS_SIN_APP` **no navegan a ningún lado**: su tap largo no hace nada y su
  tap los palomea. Queda más limpio que antes.

---

# PIEZA 2 · Lo que enseña el gesto también se invierte

⚠️ **Si esto no se hace, la app enseña lo contrario de lo que hace.** Es lo más fácil de olvidar
de todo el run.

**2.1 · El tour.** El paso 2 de los doce (`orb-tour-core.ts`) enseña los dos gestos y hace que el
usuario los pruebe ahí mismo. **Invertir el copy y el ejercicio.**

**2.2 · La burbuja contextual.** El nudge dice *"Para palomear un hábito, mantén presionado."*
Ahora debe decir lo contrario. Y su disparador también se invierte: hoy cuenta el patrón
**tap, navegar, regresar sin hacer nada**. Con el gesto nuevo, el patrón a detectar es que el
usuario **toque una fila que ya está palomeada y la despalomee sin querer**, o que abra y cierre
la paloma inteligente sin elegir. **Si el patrón nuevo no queda claro, deja el nudge apagado y
repórtalo**: es mejor no decir nada que enseñar lo viejo.

**2.3 · Busca el resto.** Cualquier copy, tooltip o comentario de código que describa los gestos.
Grep de "mantén presionado", "tap largo", "long press", "presiona".

---

# PIEZA 3 · La retroalimentación cambia de dueño

Hoy el tap largo tiene su animación de llenado de 350 ms, que era **la que enseñaba el gesto**:
el círculo se llena mientras mantienes, y soltar antes lo revierte.

Con el tap, no hay hold, así que no hay llenado. **La retroalimentación tiene que venir de otro
lado.**

**Lo que debe pasar al palomear con tap:**
- Vibración inmediata, la que ya usa.
- **La card encoge y viaja al bloque de hechas.** Esa transición ya existe y ahora es la
  confirmación principal: es imposible no verla.
- Al despalomear desde hechas, el camino inverso.

**Y el tap largo, que ahora navega, necesita su propia señal.** Sin el llenado, nada avisa que el
hold está haciendo algo. Como mínimo, vibración al cruzar el umbral, antes de navegar.

⚠️ **Todo degrada con reducir movimiento**, como ya lo hace.

---

# 🟠 PIEZA 4 · El riesgo que trae el cambio, y su mitigación

**Palomear escribe en el ledger.** Acabamos de dedicar un run entero a que el ledger no pierda
datos, y ahora la acción que escribe pasa a ser el gesto más barato **en una pantalla llena de
blancos de media pantalla.**

No es razón para no hacerlo, pero sí para cuidar dos cosas:

**4.1 · Que despalomear sea igual de fácil.** Un toque en la fila de hechas la devuelve a
pendiente. Si palomear es un toque y despalomear cuesta más, el error es caro.

**4.2 · Que un toque accidental no dispare cosas irreversibles.** Palomear otorga electrones. El
otorgamiento ya es idempotente por día, así que palomear y despalomear no debe dejar residuo.
**Verifícalo:** palomear, despalomear y volver a palomear tres veces no puede dejar más de un
electrón, ni borrar el que ya estaba.

---

# 🔧 PIEZA 5 · Dos cosas del audit del ledger

**5.1 · La fábrica de fechas nulas sigue viva.** `exercise-service.ts:127` (`logExerciseSet`) y
`:157` (`logExerciseSets`) insertan en `exercise_logs` **sin `date`**. Son exactamente las que
crearon las 110 filas nulas que originaron el bug.

Hoy no hay bug activo porque **no tienen un solo llamador**, y las tres rutas vivas sí escriben
la fecha. Pero son API exportada y el contrato nuevo solo vigila el lado de lectura. **Si alguien
las vuelve a cablear, la bomba regresa.**

Bórralas si de verdad no las usa nadie, o ponles `date: getLocalToday()`. **Y extiende el
contrato al lado de escritura**, que es donde nace el problema.

**5.2 · El tri-estado cubre nulo pero no malformado.** Comprobado con mutación: un `created_at`
con basura (`"no-es-fecha"`) o una fecha imposible (`"2026-13-99"`) hacen que
`toLocalDateString` devuelva `"NaN-NaN-NaN"`, que es un string truthy distinto de hoy, o sea
**evidencia positiva de ausencia**, y el electrón se borra.

La probabilidad es baja porque Postgres garantiza fechas bien formadas. Pero es **la misma clase
de bug que el run anterior vino a cerrar**, y son tres líneas: si la fecha no matchea
`^\d{4}-\d{2}-\d{2}$`, es **no se sabe**.

---

# 🟡 NOTAS, no bloquean

- **La card de suplementos puede decir "0 de N" con la paloma puesta.** Es consecuencia aceptada
  de separar las dos preguntas: si desactivas un suplemento que ya tomaste, el electrón se queda
  (correcto) y el conteo de la card no lo refleja. Vale una línea de copy.
- **Las revocaciones fuera del compilador no dejan rastro.** `tarea-actions.ts:46` y
  `agenda-service.ts:674` llaman a `revokeBooleanElectron` sin log. Son acciones explícitas del
  usuario, pero si mañana vuelve a desaparecer un electrón, el rastro solo cubre una de las tres
  puertas. **Ponles el mismo log.**
- **Código muerto tras borrar `HoyEditorialSection`:** `HOY_CARD_SPECS` y `HOY_CARD_BY_KEY`
  perdieron su consumidor de producción y solo los usan tests. Peor: `hoy-cards-registry.test.ts`
  declara que vigila *"lo que renderiza HoyEditorialSection"*, un renderer que ya no existe.
  `HOY_CARD_ORDER_DEFAULT` sí sigue vivo, así que el archivo no se borra entero.

---

# 📦 ENTREGA

Un commit por pieza. En el reporte, **la lista de todos los lugares donde se invirtió el copy del
gesto**, que es lo más fácil de dejar a medias.

**Verificación en dispositivo:**
1. **Un toque palomea**, y la card encoge y viaja a hechas.
2. **Un toque en hechas despalomea**, y la card vuelve a su bloque.
3. **Tap largo navega**, con vibración al cruzar el umbral.
4. Tap en Meditar abre *"¿Ya meditaste?"*; tap largo abre meditación directo.
5. Tap largo en Ayuno abre su pantalla; un toque **no** la abre.
6. En baño frío y grounding, **el tap largo no hace nada** y el toque los palomea.
7. **El tour del paso 2 enseña el gesto NUEVO.**
8. Palomear, despalomear y volver a palomear tres veces **deja exactamente un electrón**.
9. Igual en las dos lentes, TAREAS y AGENDA.
