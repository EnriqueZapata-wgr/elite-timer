# La noche del 14 al 15 de agosto

Todo está en `main`, fusionado y con `tsc` en cero. **Nada se ha verificado en
un teléfono y nada se ha subido.** Lo que sigue son los dos bloques de comandos
que faltan y la lista honesta de lo que quedó a medias.

---

# ANTES DE CONSTRUIR, EN ESTE ORDEN

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx tsc --noEmit
npm test
npx supabase db push
```

`npm test` es el paso que ningún agente pudo dar: `node_modules` tiene binarios
de Windows y todos corrieron en Linux. Cada uno verificó su lógica con un arnés
propio, pero **la corrida oficial no existe todavía**. Si algo va a tronar, va a
tronar ahí.

`db push` aplica cuatro migraciones nuevas: 264, 265, 266 y 267. Si el OTA sale
antes que la migración, el registro de un alimento de biblioteca truena buscando
una tabla que no existe.

---

# LO QUE ENTRÓ

## Amarrado al build (no entra por OTA)

**HealthKit y Health Connect.** Permisos y cadenas de propósito en español para
las dos plataformas, servicio único que esconde la diferencia de sistema
operativo, pantalla de conexión en Ajustes, y migración 264. Además se unificó
un choque real: `expo-image-picker` y `expo-camera` escribían la misma llave de
permiso de cámara con textos distintos y ganaba el último plugin.

**La cámara ya está lista para el escáner de código de barras.** `expo-camera`
ya estaba en el proyecto. Y se corrigió que la cámara se active por gesto y no
al montar la pantalla, que es lo que venía tronando los barridos.

> **Fuera del código:** hay que actualizar la declaración de permisos de Health
> Connect en Google Play Console con los cuatro nuevos, o la revisión rebota.

## La biblioteca de alimentos

604 alimentos con 44 nutrientes cada uno y 1,946 porciones caseras, conectados
al registro por texto, con selector de porciones que abre en la porción natural
del alimento (1 tortilla, 1 taza, 1 bistec) y permite cambiar a gramos, onzas o
volumen. `src/data/food-database.ts` murió: eran 147 alimentos con cinco macros.

Se respetó la regla de que **NULL no es cero**: los totales marcan con ≥ los
nutrientes donde algún alimento no traía dato, en vez de fabricar un déficit
falso sobre el que ARGOS acabaría recomendando suplementos.

Las migraciones se renumeraron a 265 y 266 porque 258 y 259 ya estaban tomadas.

## El expediente, con el molde del portal ELITE

De las 19 secciones del portal, la app ya tenía el contenido de 14 repartido en
pantallas que funcionan. Duplicarlas habría roto "un dato, un lugar". Lo que no
existía era la capa de arriba, que es justo lo que el cliente paga.

Nació `/salud/mi-lectura`: un motor **determinista, no LLM**, que evalúa cada
valor contra la matriz V7/V6 con el mismo `score9Bands` de Edad ATP. Diez cruces
con la estructura del portal, y **convergencia obligatoria**: ningún cruce
enciende con una señal sola, porque un marcador suelto en amarillo es ruido.
Cero datos crudos: cada lectura termina en enlace a donde el dato ya vive.

Se eligió determinista sobre ARGOS por tres razones: cuesta cero H+, es
auditable, y no alucina un hallazgo, que es el riesgo más caro en salud.

## Labs a nivel premium

Se investigó la referencia (el dominio real es superpower.com). Entró el conteo
como titular, el filtro a "solo lo que pide atención" con vacío honesto, y el
delta leído contra tu ventana funcional: no "subió 12" sino "se acercó" o "se
alejó", porque bajar no siempre es mejorar.

Se rechazó a propósito su práctica de inflar el conteo con marcadores derivados
sin significado clínico: es su crítica más repetida en prensa. Aquí un parámetro
sin banda en la matriz no cuenta ni para bien ni para mal.

## ARGOS ya navega, explica y configura

Escribes "llévame a donde registro el ayuno" y se abre Ayuno. Si es ambiguo,
pregunta con opciones tocables en vez de adivinar. Ya sabe en qué pantalla
estabas y para qué sirve. Y ejecuta ocho ajustes con confirmación previa.

**Lo importante es el costo.** La resolución es local: cuesta **0 H+ y 0 cuota**,
porque no llama a ningún modelo. Solo el respaldo llama a un modelo, y bajó de
280 H+ a **20**. La IA que configura la app no es la IA que interpreta tu salud.

La migración 267 además **evita un sobrecobro**: el proxy le cobra precio de chat
a toda acción sin fila, así que sin ella navegar habría costado 280 en silencio.

## Reports cerrado

Entraron los cuatro dominios que faltaban: entrenamiento, glucosa (reusando el
GKI que ya existía en vez de escribir una tercera versión), labs con rangos
funcionales reales y contexto de fase del ciclo, y expediente. Más el export
maestro, con dos destinatarios distintos: el usuario se lleva todo crudo, el
médico sigue con el PDF de consulta que ya existía.

Un dominio que no se pudo leer entra al archivo **declarado** como no leído:
omitirlo haría creer que perdió meses de datos.

## Tema claro

Once lotes, 70 archivos. Los colores críticos bajaron de 1,270 a 976.

De los 976 que quedan, 263 son colores de dominio (semáforos, fases,
electrones) que son señal y no decoración, 167 son ternarios de tema ya
correctos, y 45 son superficies inmersivas deliberadas: un fondo oscuro en una
meditación es decisión de producto.

**La deuda real sin atender son unos 57 colores en 37 archivos chicos.**

Salieron tres bugs de contraste reales: ámbar como letra daba 1.27, el naranja
de EMOM 1.96, el rojo de MyoReps 3.19. Se conserva el color como relleno y solo
se calibró su versión de texto.

---

# LO QUE NO QUEDÓ, SIN ADORNOS

1. **Nada corrió en un teléfono.** Ni HealthKit, ni la biblioteca, ni el tema
   claro, ni ARGOS navegando. Todo es razonamiento sobre código.
2. **`npm test` no se ha corrido de verdad.** Ver el bloque de comandos arriba.
3. **Los datos de salud del sistema operativo llegan a la base y ahí se quedan.**
   `day-compiler` sigue diciendo "sin fuente hasta wearables" y los electrones de
   pasos siguen sin cablear. Eso es OTA-able después del build.
4. **Foto y código de barras siguen sin biblioteca.** La foto sigue estimando con
   IA. El código necesita la cámara del build nuevo.
5. **La fase del ciclo es la de hoy, no la del día de la muestra.** Es hueco del
   modelo de datos, no de la pantalla.
6. **`ClientDetailScreen.tsx` es el archivo de mayor riesgo de la noche**: 4,166
   líneas, mil doscientas de diff. Compila, pero es el primero que yo miraría en
   pantalla.
7. **Hay dos definiciones paralelas de rangos funcionales** en el repo
   (`src/data/functional-health-engine.ts` es legacy del coach). No se
   consolidaron.
8. Sigue faltando la **capa de adopción del cliente**, que es lo que se dijo que
   iba después de terminar la app.

---

# EL HUECO DE LAS CAPTURAS

Lo más nuevo de la reestructura nunca se fotografió: `/food-log`, los
`/reports/[dominio]`, las pestañas de `/cocina` y el motor `/tests/q/[id]`. Las
rutas dinámicas no están en el mapa del barrido y `food-log` está excluida por la
cámara. Con todo lo que entró esta noche, ese hueco creció.
