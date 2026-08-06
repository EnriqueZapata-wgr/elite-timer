# 🗺️ AWAY RUN MB-15 · El plano 12×12 con zoom

**Rama:** `feat/mb15-plano-12x12` · worktree propio.
**Depende de:** el commit `bdb818c` en `main`, que ya trae las coordenadas. **Ramifica de main después de que Enrique lo empuje.**

## Qué se construye

El Mood Meter de verdad: **un plano continuo de 12×12 donde la posición es el significado.** Eje horizontal = qué tan agradable. Eje vertical = cuánta energía. Se recorre arrastrando y se acerca con pinch, como How We Feel.

Lo que hay hoy (`MoodGrid.tsx`, cuatro tarjetas que llevan a una lista de píldoras en scroll) **se reemplaza**. Era un paso intermedio y no cumple: abandonó lo espacial, que es justo lo que da el valor.

## Los datos ya están y no se tocan

`src/data/emotions-library.ts` ya trae en cada una de las 144 emociones:

- **`gridCol`** 1 a 12 — eje de agrado. 1 es lo que peor se siente, 12 lo mejor.
- **`gridRow`** 1 a 12 — eje de energía. **1 es la fila de abajo.**

Las 144 celdas son únicas. **Encimarse es imposible por construcción**, que era el defecto original de la espiral. Las coordenadas las revisó Enrique una por una: **no las recalcules, no las reordenes, no las derives de `energy` ni de `intensity`.** Son la fuente de verdad de la posición.

---

# LAS CUATRO REGLAS QUE NO SE ROMPEN

Cada una corresponde a un fracaso anterior. No son preferencias.

## 1 · Cero SVG. En ningún lugar de esta pantalla.
Las celdas son `View`. Las palabras son `Text` de React Native.

**Por qué:** `react-native-svg` no pinta texto en Android en este proyecto, con `fontFamily` y sin él. Se intentó dos veces. El componente que falla sale del camino, no se le busca el arreglo.

## 2 · Una sola transformación nativa sobre el contenedor.
Un `Animated.View` que envuelve la cuadrícula completa, con `scale` y `translateX/translateY` en shared values de reanimated.

**Por qué importa:** el transform nativo escala **todo el subárbol**, incluidas las palabras. **No hay matemática de tamaño de fuente, no hay renderizado condicional de etiquetas, no hay cálculo de si cabe.** A zoom bajo las palabras se ven chiquitas y eso está bien: es exactamente el comportamiento de How We Feel. A zoom alto se leen.

Todo intento previo de decidir cuándo mostrar una etiqueta terminó en etiquetas invisibles. **Aquí no se decide: se escala.**

## 3 · El toque son `Pressable` reales en cada celda.
Sin hit-testing por coordenadas, sin matemática inversa del transform. Un `Pressable` dentro de un contenedor transformado responde en cualquier nivel de zoom, y eso es gratis.

**Por qué:** la rueda calculaba el toque desde coordenadas polares y no respondía. Aquí no hay nada que calcular.

## 4 · El color sale de la POSICIÓN, no de la emoción.
```
const pleasant = gridCol >= 7;
const high     = gridRow >= 7;
```
Cuatro familias cromáticas, una por cuadrante del plano. El tono dentro de la familia puede variar con la distancia al centro, pero **el matiz lo define en qué mitad del plano cae la celda.**

**Por qué:** hoy cada emoción carga su propio color y por eso había amarillos dentro del rojo. Verificado que ninguna emoción cruzó frontera al reordenar, así que posición y `quadrant` coinciden: **usa la posición de todos modos**, para que siga siendo cierto si mañana se mueve una palabra.

---

# COMPORTAMIENTO

## Estado inicial
El plano completo visible, con los cuatro cuadrantes distinguibles por color y **una etiqueta por cuadrante encima** (`Text` normal, fuera del contenedor transformado, para que no escale): *"con mucha energía y no se siente bien"* y sus tres hermanas. Ese es el mapa general.

## Acercarse
- **Pinch** con `Gesture.Pinch`, sobre el punto medio de los dedos.
- **Arrastrar** con `Gesture.Pan`. ⚠️ Ponle `.maxPointers(1)` o el pan y el pinch escriben el mismo shared value y pelean.
- Combínalos con `Gesture.Simultaneous`.
- **Tocar una etiqueta de cuadrante** acerca a ese cuadrante. Es el atajo para quien no descubre el pinch, y no cuesta nada.
- Límites: escala entre 0.6 y 4.5. **Clampea el desplazamiento** para que el plano no se pueda sacar de la pantalla.

Todo el gesto en worklets. `cancelAnimation` en el `onBegin` del pan para que sea interrumpible.

## Elegir
Tocar una celda la selecciona con borde. Se pueden elegir varias, como hoy. Al seleccionar aparece **su descripción**, que ya existe en la librería y está bien escrita.

## Lo que sigue igual
- **La búsqueda.** Es lo único del módulo que siempre funcionó.
- **Todo el tramo A de MB-12**: los 8 IDs de crisis, el banner de nivel 2, la regla de trayectoria, la puerta a acompañamiento, sin racha ni celebración sobre una crisis.
- **El mapa de cuerpo de MB-14**, condicionado a desagradable con intensidad 7 o más.
- **La frase de cierre de MB-14**, suprimida cuando hay señal de crisis.

El plano cambia **cómo se elige** la emoción. Nada de lo que pasa después se toca.

---

# 📦 ENTREGA

Solo JS y TS. `react-native-gesture-handler` y `react-native-reanimated` **ya están en el proyecto** y ya se usaban en la rueda: no se instala nada. Si algo pide una dependencia nueva o un cambio nativo, **para y avisa**: pierde el OTA y con él la capacidad de iterar rápido, que es lo que más falta ha hecho en este módulo.

`npx tsc --noEmit` y Vitest en verde. Cero em dash en copy de usuario.

## Verificación en dispositivo · obligatoria y sin atajos

Este módulo ya se declaró listo tres veces y falló tres veces en el teléfono. **Cada punto se prueba en un Android físico o no se reporta.**

1. **Las 144 palabras se ven.** Acerca hasta que se lean y recorre los cuatro cuadrantes. Ni una celda muda.
2. **El pinch acerca y aleja**, y el arrastre recorre. Los dos a la vez sin pelearse.
3. **Tocar una celda responde**, a zoom mínimo y a zoom máximo.
4. **El plano no se puede sacar de la pantalla** ni dejar en negro.
5. **Ningún color fuera de su mitad**: nada amarillo a la izquierda, nada azul a la derecha.
6. **Las palabras coinciden con su lugar.** "Sin esperanza" abajo a la izquierda, "En éxtasis" arriba a la derecha, "En calma" abajo a la derecha, "En pánico" arriba a la izquierda.
7. **"Sin esperanza"** lleva a acompañamiento con banner, sin frase de cierre y sin racha.
8. **Emoción desagradable intensa** ofrece el mapa de cuerpo; una agradable no.

**Fuera de alcance:** la rueda sunburst como ejercicio de exploración, que va después y sin bloquear a nadie.
