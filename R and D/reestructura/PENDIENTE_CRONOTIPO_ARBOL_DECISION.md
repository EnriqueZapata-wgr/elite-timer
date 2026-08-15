# PENDIENTE · Cronotipo con árbol de decisión

> **CERRADO el 15 de agosto de 2026 (run DEUDA).** El árbol ya corre. Lo que se
> hizo, dónde quedó y qué NO se hizo está al final, en "Cómo quedó". El cuerpo
> del documento se conserva tal cual porque es el planteamiento original.

**Registrado:** 13 de agosto de 2026, por decisión de Enrique. En FIFO, no se ejecuta todavía.
**Origen:** al extraer los scorers a la capa pura (Ola 4, commit `140e4c9`), quedó al descubierto que **el desempate del cronotipo dependía del orden de las llaves de un objeto** y nunca había tenido una sola prueba. Ya tiene test, pero el problema de fondo es de diseño, no de código.

## El problema

El quiz de cronotipo resuelve por dominancia simple. Cuando dos animales quedan empatados o casi, el resultado es un volado disfrazado de diagnóstico. Los empates reales que Enrique nombra:

- **León / Oso** en disputa
- **Oso / Lobo** en disputa
- **Delfín**, que no se detecta bien por dominancia porque no es un cuarto polo: es un estado que se monta encima de otro cronotipo

## Lo que se necesita

1. **Robustecer el banco.** Más preguntas, y con peso diferenciado: no todas discriminan igual entre León y Oso.

2. **Árbol de decisión para desempates.** Cuando la diferencia entre los dos primeros animales cae bajo un umbral, el quiz NO cierra: abre una rama corta de preguntas específicas para ESE par en disputa (un set para León/Oso, otro para Oso/Lobo). La ramificación ya está soportada por el motor: `master-quiz-core` tiene `BranchingRules` y el registry expone `branching?` (ver ANEXO_C_TESTS §1). No hay que construir infraestructura, hay que escribir contenido y umbrales.

3. **Delfín y su cronotipo madre.** Doctrina ya establecida (memoria `project_doctrina_cronotipo_delfin_estado_temporal`): el Delfín es REAL pero TEMPORAL, y siempre se comunica junto a su cronotipo madre ("eres Oso en modo Delfín"). El quiz debe poder detectar el patrón Delfín **y** resolver por debajo cuál es el cronotipo de base, que es el que gobierna los horarios cuando el estado remita.

## Dónde se toca cuando llegue el turno

- Banco y umbrales: `src/constants/assessments/` (o la fuente actual del quiz, `quiz_templates` en DB según el registry)
- Ramificación: `master-quiz-core` (`BranchingRules`)
- Scorer: la capa pura de `src/constants/assessments/adapters.ts`, donde ya vive `determineChronotype` con su test
- Resultado: `/tests/resultado/cronotipo` (ex `my-chronotype`), que ya conserva `CHRONO_INFO` con los 4 animales
- Consumidores del dato: horarios de hábitos (ancla despertar), tema adaptativo, ventanas de ARGOS

## Por qué importa más de lo que parece

El cronotipo no es un dato de curiosidad: **es el ancla de la que cuelgan las horas de todos los hábitos** (regla ancla+offset) y del tema adaptativo. Un cronotipo mal resuelto desplaza el día entero del usuario. Un empate resuelto por el orden de las llaves de un objeto es, literalmente, el peor lugar donde puede vivir un volado.

---

## Cómo quedó (15 de agosto de 2026)

### Lo que sí se hizo

**El árbol.** `src/services/assessments/cronotipo-core.ts`, puro y con 29 pruebas
en `src/services/assessments/__tests__/cronotipo-core.test.ts`. Cuando la
diferencia entre los dos primeros cae en 2 puntos o menos, el quiz no cierra:
abre la rama del par en disputa, suma sus puntos y vuelve a resolver.

**La rama.** `src/constants/assessments/cronotipo-desempate.ts`: tres preguntas
para León/Oso y tres para Oso/Lobo. Van en constantes y no en `quiz_templates`
a propósito. La rama es estructura, no catálogo editable: si viviera en la DB, el
motor tendría que traerla a media sesión y desempatar quedaría atado a un
`db push`. Así viaja por OTA con el core que la usa. **No hubo migración.**

Las preguntas no repiten lo que ya pregunta el banco base, que es justo por lo
que empataban. León y Oso los separa el ESFUERZO (al León el temprano le sale
solo y se le acaba la pila pronto). Oso y Lobo los separa si lo tarde aparece
**cuando no hay nada que lo empuje**, por eso las tres quitan la agenda de en
medio: vacaciones, las dos primeras horas del día y cuándo llegan las ideas.

**León/Lobo NO se rama.** Son polos opuestos: quedar pegado ahí no es una
disputa que tres preguntas vayan a resolver, es un patrón de respuestas
contradictorio. Cae al orden declarado, igual que antes.

**Delfín con su madre.** El árbol nunca devuelve "Delfín" a secas: devuelve
Delfín **más** su cronotipo madre, y el `EngineOutcome` ahora carga `madre` y
`esEstadoTemporal` para los cuatro animales (para León, Oso y Lobo el madre es
él mismo). El madre lo resuelve `motherChronotype`, que YA existía y ya usaban
la agenda, el motor, YO y la pantalla de resultado. No se reimplementó: una
segunda definición de "cuál es tu cronotipo de base" es exactamente el bug que
este mismo run acababa de pagar con la racha duplicada de N-Back.

**El Delfín salió de la cuenta de fases.** Antes, un Delfín alto se comía un
empate León/Oso que sí tenía arreglo. Ahora la disputa se mide solo entre los
tres cronotipos de fase, que es lo que dice la doctrina: el Delfín no es un
cuarto polo, es un estado montado encima.

**Motor.** `visibleQuestions`, `nextCode` y `progressOf` de `engine-runtime.ts`
ya caminaban sobre lista recalculada para el Maestro; el cronotipo entró por el
mismo hueco. El contador crece de "10 de 10" a "11 de 13" cuando se abre la
rama, que es honesto: hay tres preguntas más y se ven.

### Lo que NO se hizo, y por qué

**Robustecer el banco base (punto 1 del pendiente).** Sigue en diez preguntas
que puntúan a los cuatro animales a la vez, con pesos parejos. Reescribirlo es
trabajo de contenido con Mariana, vive en `quiz_templates` (o sea, migración +
`db push`) y cambiaría el resultado de **todo el mundo**, no solo de los
empatados. El árbol ataca el síntoma más caro sin ese riesgo. Queda abierto.

**Detección de Delfín por eje separado.** Hoy el Delfín se sigue declarando por
dominancia, igual que antes. Se dejó así a propósito: cambiar el criterio de
quién ES Delfín mueve el horario de gente que ya tiene su cronotipo activo, y
eso no se decide en un run de deuda. Lo que sí se cerró es que un Delfín ya
nunca se comunica sin su madre. Separar el eje pide banco nuevo, o sea el punto
anterior.

### Nadie pierde su cronotipo

`user_chronotype` no se recalcula sola: solo se reescribe si la persona vuelve a
hacer el test. Quien ya lo tiene guardado no se entera de nada. Y quien contesta
claro y sale un animal por goleada obtiene el mismo resultado que antes: hay una
prueba dedicada a eso (`NO ROMPER · quien contestó claro sale igual que antes
del árbol`), que corre la regla vieja contra la nueva sobre cinco perfiles.
