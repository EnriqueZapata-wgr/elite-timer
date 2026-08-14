# PENDIENTE · Cronotipo con árbol de decisión

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
