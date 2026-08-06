# 🟩 AWAY RUN MB-14 · Mood Meter en cuadrícula

**Rama:** `feat/mb14-mood-grid` · worktree propio.
**Urgencia:** esto sale hoy por OTA. **Solo JavaScript, cero cambios nativos.**

## Por qué se cambia

La rueda sunburst nos obliga a ganar cuatro peleas a la vez: texto dentro de SVG rotado en Android, gestos de zoom y arrastre, matemática de 144 sectores proporcionales, y coherencia de color. **En dispositivo real no se pinta una sola etiqueta y el toque directo no responde.** La rueda se ve pero es una imagen.

La cuadrícula no tiene ninguno de esos cuatro problemas: el texto es `<Text>` de React Native, el toque es `Pressable`, y el color lo define la celda.

**La rueda no se borra.** Se retira del check-in y vuelve después como ejercicio de exploración, en paralelo y sin bloquear a nadie.

---

# PIEZA 1 · La cuadrícula

## 1.1 · Pantalla uno: los cuatro cuadrantes

Cuatro tarjetas grandes, a pantalla completa, dos por dos. Nada más.

| Cuadrante | Copy | Color |
|---|---|---|
| Alta energía · Desagradable | *"Con mucha energía y no se siente bien"* | rojo/naranja |
| Alta energía · Agradable | *"Con mucha energía y se siente bien"* | amarillo/lima |
| Baja energía · Desagradable | *"Con poca energía y no se siente bien"* | azul |
| Baja energía · Agradable | *"Con poca energía y se siente bien"* | verde/teal |

**Los nombres técnicos no van en pantalla.** Nadie sabe qué es valencia ni arousal. Se describe la sensación.

Arriba, la búsqueda, que hoy es lo único del módulo que funciona bien. Se queda igual.

## 1.2 · Pantalla dos: las emociones del cuadrante

Cuadrícula de las 36 emociones de ese cuadrante. Dos o tres columnas según quepa.

Cada celda: **el nombre visible siempre**, en `<Text>` normal, y el fondo como **un tono del color del cuadrante**, más intenso mientras mayor sea la intensidad de la emoción.

⚠️ **Aquí está el arreglo de la incoherencia que Enrique detectó:** hoy cada emoción se pinta con su propio color, por eso hay amarillos y azules dentro de la sección roja. **El color de la celda sale del cuadrante, no de la emoción.** Un cuadrante, una familia cromática, sin excepciones.

Al tocar una celda: se selecciona, se marca con borde, y aparece **su descripción** debajo. Las descripciones ya existen en `emotions-library.ts` y son buenas.

Se pueden elegir varias, como hoy.

## 1.3 · Lo que se retira del check-in

- El componente `EmotionWheel` **sale del flujo de check-in**. No se borra el archivo: queda para la etapa de exploración.
- **El cuestionario de cuerpo sale como puerta de entrada.** Hoy es la única forma de navegar la rueda y solo ofrece estados negativos: pecho apretado, mandíbula, nudo, todo apagado. Si alguien se siente bien, ninguna aplica.

---

# PIEZA 2 · El cuerpo, donde sí tiene sentido

El mapa corporal **no desaparece: cambia de lugar.**

Deja de ser la puerta de entrada y **se activa solo cuando la persona elige una emoción negativa intensa.** Ahí sí aplica, ahí sí ayuda, y ahí sí las cuatro opciones que existen son las correctas.

**Regla:** aparece cuando la emoción seleccionada es de cuadrante desagradable **e** intensidad 7 o más. En cualquier otro caso no se muestra.

Copy de entrada, ajústalo si suena a máquina:
> **¿Dónde lo sientes?**
> El cuerpo contesta aunque la palabra no llegue.

Es opcional. Siempre hay salida sin contestar.

---

# PIEZA 3 · La frase al cierre

Al terminar el check-in, **una sola frase** que refuerce o replantee lo que la persona acaba de nombrar. Corta, de una o dos líneas.

## 3.1 · Las tres reglas que no se rompen

**Sin nombre de autor.** Ni Séneca, ni Marco Aurelio, ni nadie. La frase se sostiene sola. Esto ya se aplicó en MB-12 al journal y aquí aplica igual: toda voz en la app es de ATP.

**Contextual a la emoción, no aleatoria.** A quien nombró enojo le toca un encuadre distinto que a quien nombró tristeza. Un banco por cuadrante, y dentro del cuadrante rotación determinista por fecha local, para que sea la misma frase todo el día.

**🔴 Con señal de crisis, NO hay frase.** Ni filosófica ni de ningún tipo.

Esto último no es negociable y es la razón: el tramo A de MB-12 existe precisamente para que a alguien en crisis **no se le reencuadre nada**. `emotion-navigation.tsx` ya dice *"ahora mismo no toca analizar nada"*. Una frase estoica encima de "Sin esperanza" es exactamente el reframing que decidimos no hacer. Reutiliza `isCrisisOrigin` de `emotion-navigation-core.ts` para suprimirla.

## 3.2 · Tono

Del cuerpo y de la experiencia, no del aula. Sin jerga, sin sonar a tarjeta motivacional de red social. Si una frase se puede leer como reclamo para alguien que está mal, no entra.

Ocho a diez por cuadrante bastan para arrancar.

---

# LO QUE SE CONSERVA INTACTO

**Todo el tramo A de MB-12.** Los ocho IDs de crisis, los tres del banner, la regla de trayectoria, la puerta a acompañamiento, y que no haya racha ni celebración sobre una crisis. La cuadrícula cambia **cómo se elige** la emoción, no qué pasa después.

**La búsqueda**, `emotions-library.ts` con sus 144 emociones y descripciones, el guardado a `emotional_checkins`, y las pantallas de historial y perfil.

---

# 📦 ENTREGA

**Solo JavaScript y TypeScript. Ni una dependencia nueva, ni un cambio nativo.** Esto sale por `eas update` el mismo día.

`npx tsc --noEmit` y Vitest en verde. Cero em dash en copy de usuario.

**Verificación en dispositivo, obligatoria:**
1. Los nombres de las cuatro tarjetas y de las 36 celdas **se ven** en Android.
2. Tocar una celda responde y muestra su descripción.
3. Todas las celdas de un cuadrante son del mismo color, en distintos tonos. **Ningún amarillo dentro del rojo.**
4. Emoción desagradable de intensidad 8: aparece el mapa de cuerpo, y se puede saltar.
5. Emoción agradable: **no** aparece el mapa de cuerpo.
6. "Sin esperanza": acompañamiento con banner, **sin frase de cierre**, sin racha.
7. Emoción normal: sí aparece frase de cierre, y es la misma si se repite el check-in el mismo día.

---

**Fuera de alcance:** la rueda como ejercicio de exploración, que va en su propio run después.
