# 🚶 Recorrido UX de Enrique · app por app

**Fecha:** 1-ago-2026 · Device test sobre MB-19.1, Galaxy S24 Ultra.
Enrique entra a cada icono y dice qué pasa y qué debería pasar. **Esto es materia prima de
MB-20 y de los runs que sigan.** Se va llenando conforme avanza.

Etiquetas: **🐞 BUG** (está roto) · **✂️ AJUSTE** (se arregla en un run existente) ·
**🏗️ PROYECTO** (necesita su propio run y decisión) · **❓ DECISIÓN** (pendiente de Enrique)

---

# 🧠 MENTE

## 1 · Meditar

Entra bien y funciona bien.

**🐞 Las imágenes tardan hasta 5 segundos en cargar.** En un S24 Ultra. *"Se ve chafa."*
En un teléfono modesto va a ser peor.
→ Existe `scripts/optimize-images.js` en el proyecto. Medir el peso real de los assets de
meditación antes de asumir la causa: puede ser tamaño de archivo, puede ser que se carguen
todas de golpe sin `placeholder` ni caché.

**🐞 No hay reproductor. El audio se queda huérfano.**
Hoy: sales con atrás, no hay confirmación, **el audio sigue sonando** y no aparece en ningún
lado, ni en la barra de notificaciones del sistema. Si vuelves a entrar a la misma meditación,
**arranca otra vez y se empalman dos reproducciones.**

Lo que Enrique quiere, en orden de ambición:
1. Mínimo: al salir, confirmar o cerrar el audio. Que nunca queden dos.
2. Bien: un **banner de reproducción** dentro de la app, visible desde cualquier pantalla.
3. Ideal: **control desde la notificación del sistema**, como YouTube o Spotify, para que
   siga sonando con la app cerrada y se pueda pausar desde ahí.

⚠️ **El nivel 3 requiere modo de audio en segundo plano: es cambio nativo, no sale por OTA.**
Hay que planearlo con un build, no con una actualización.

## 2 · Respirar

**✂️ Las cards son inconsistentes.** Unas salen con imagen editorial en blanco y negro y otras
a color. *"Pareciera que no están habilitadas."* Unificar el tratamiento de todas.

**🐞 En Box Breathing, los ciclos dicen segundos.** El menú muestra `18 s` donde son **18
ciclos**. Etiqueta equivocada.

**Bien:** 4-7-8 perfecto. Energizante perfecto. El disclaimer sale bien y funciona.

**🏗️ Wim Hof se queda a medias y merece la versión completa.**
Hoy: después del disclaimer sale una burbuja de **60 segundos** para hacer las 30
respiraciones. El ritmo no lo marca nada.

Lo que debe ser:
- **La burbuja marca el ritmo** de cada inhalación y exhalación, una por una.
- **Número de respiraciones configurable** (25, 30, 50, lo que el usuario elija).
- **La retención dura lo que el usuario aguante**, no un tiempo fijo.
- **Registro de retenciones**, como en la app oficial del método.
- **Estadísticas en la comunidad.**

Razón de Enrique: *"si ya estamos haciendo disclaimer y cumpliendo con el compliance, podemos
irnos al sistema completo."*

**✂️ Las últimas sesiones de abajo están todas en lima.** Que tomen el color del módulo.

## 3 · Emociones

*"De mis favoritos, funciona espectacular."*

**✂️ Las cards no tienen tratamiento editorial** y las que tienen están en blanco y negro sobre
fondo negro. Que tengan card editorial y color, para darles vida.

**🐞 "¿Cómo estás?" y "Explorar territorio" llevan al mismo lugar y hacen lo mismo.**
Dos puertas, un destino. Probablemente quedó así en la migración al plano 12×12: registrar y
explorar deberían ser cosas distintas.

**Acierto grande: "Tu historia".** *"Me encanta."* Quiere que crezca:
- **✂️ Que incluya sueño, entrenamiento y ayuno**, no solo emociones.
- **🐞 Verificar que la concatenación de datos sea correcta:** tiene datos de sol y de ayunos,
  y **la pantalla parece vacía**. O no los está cruzando, o no los está mostrando.
- **✂️ Que las correlaciones de abajo se expliquen mejor.** Hoy no se entiende qué se
  correlaciona con qué.
- **🏗️ Correr un demo con perfil de mujer** para ver cómo se ven las correlaciones con el ciclo.
  Es de las cosas que más pueden diferenciar el módulo y hoy nadie lo ha visto.

**❓ Navegar emociones no debería ofrecerse siempre.**
Enrique: la navegación es para **emociones desagradables que hay que mover**. En emociones
placenteras no hace falta, y ofrecerla siempre abarata el gesto.

**Mi recomendación:** que la oferta dependa del cuadrante.
- **Desagradable, cualquier energía** → se ofrece navegar. Es el caso para el que se diseñó.
- **Agradable** → no se ofrece mover, se ofrece **quedarse**: registrar qué lo produjo. En la
  literatura de regulación emocional eso es tan válido como bajar de un estado feo, y encaja
  con la doctrina de ATP mejor que empujar a alguien que está bien.
- **Excepción:** agradable con energía muy alta a las 11 de la noche sí merece una oferta, pero
  de bajar revoluciones para dormir, no de "navegar".

## 4 · Journal

Entra bien y manda a donde debe.

**🏗️ Los journals deben sentirse como una conversación, no como una lista.**
Enrique: *"se ve tieso, estático."* Lo que quiere: **una pregunta por pantalla**, su cuadro de
texto, una reflexión, y continuar a la siguiente. Modo formulario guiado.
Aplica a gratitud, a descarga emocional y a descarga mental.

**❓ ¿Agregar más tipos de journal?** Pendiente de decidir cuáles.

**🐞 La casita flotante estorba en esta pantalla.**

**🐞 Sale la orbe vieja de ARGOS, no la nueva.** ✅ Confirmación en dispositivo del hallazgo del
inventario: es `ArgosAvatar`, el componente que dibuja una figura distinta por estado. Lo
resuelve la pieza 4.4 de MB-20.

## 5 · Sueño

**🏗️ No hay nada. Solo "Próximamente" y un botón de conectar que lleva a ajustes, donde también
dice "próximamente".**

Enrique lo puso en términos claros: *"sin sueño estamos a ciegas con una tercera parte de lo que
sucede en la vida de los clientes."*

Quiere integraciones: **Garmin, Oura, Ultrahuman**, y como mínimo **Google Health y Apple
Health**.

⚠️ **Esto necesita investigación antes de un brief**, y no es solo técnica:
- Apple Health y Health Connect son la vía directa y no dependen de nadie: **por ahí se empieza.**
- Las APIs de fabricantes (Oura, Garmin, Ultrahuman) **requieren aprobación de socio**, con
  tiempos y a veces costo. Eso se solicita con semanas de anticipación, no se programa.
- Hay que definir **exactamente qué paquete de datos** se extrae de cada fuente, porque lo que
  entrega cada una es distinto y el motor de Edad ATP espera campos concretos.

## 6 · N-Back

*"Uno de los grandes aciertos de la plataforma. Me encanta. No habría que hacerle mucho más."*
Las estadísticas le encantan. Entra directo desde el botón al módulo.

**Nada que hacer.**

## 7 · Rachas

Entra bien y funciona.

**❓ El nombre confunde: no se entiende que es solo de Mente.** Enrique pide recomendación.

**Mi recomendación: no anclarlo a Mente. Sacarlo de Mente.**
La razón de que hoy sea solo de Mente es histórica: nació dentro del hub de Mente y lo
rescatamos ahí cuando el hub se retiró. Pero rachas y medallas **no son un tema de Mente**,
son un tema de constancia, y la constancia es de toda la app.

Lo natural es que crezca hacia lo que Enrique pide abajo: el baúl de reconocimientos. Mientras
tanto, dos caminos honestos:
- **(a)** Se queda en Mente y se llama **"Rachas de Mente"**, explícito.
- **(b)** Sale de la sección Mente y pasa a cubrir todos los pilares.

**(b) es lo correcto**, pero es más trabajo. **(a) es un cambio de una línea** y quita la
confusión hoy. Recomiendo (a) ahora y (b) cuando se construya el perfil.

**🐞 Las meditaciones parecen no registrarse.** Enrique no está seguro de haber terminado una,
así que **hay que reproducirlo a propósito**: terminar una meditación completa y verificar que
la racha se mueva.

**✂️ La pantalla necesita upgrade visual.** *"Un poquito más de diseño y no tan lima
brutalista."*

**🏗️ El perfil con banner de logros.**
Referencia de Enrique: **Clash Royale.** Cada logro desbloquea una medalla o un banner
específico, el usuario arma su banner, y **cuando la comunidad entra a tu perfil ve lo que has
logrado.**

Piezas: catálogo de logros, desbloqueo, personalización del banner, perfil público, y un **baúl
de reconocimientos** al que Rachas se conecta.
Es un proyecto grande y toca comunidad. Va después de V2.

---

# 🏋️ CUERPO

**❓ El nombre de la sección no convence.** Enrique propone **FITNESS** en vez de "Cuerpo".
Y con ese nombre entra algo que hoy no está: **composición corporal**, aunque el dato viva en
Salud. *"Que esté encadenado a todos los valores a lo largo y ancho de la app."*

## 8 · Entrenar

Se ve bien y le gusta la pantalla de ATP Fitness.

**❓ "Hoy toca hipertrofia empuje" y él nunca configuró eso.** No sabe cómo se elige.

**🏗️ Falta asignar rutinas a días.** Es lo que bloquea que la use de verdad. Dos caminos:
al crear la rutina se elige el día, o un calendario semanal donde se asigna qué toca cada día
(fuerza, cardio, yoga, lo que sea).

**✂️ Los timers personalizados obligan a pasar por el constructor completo.** Quiere poder
configurar un timer básico rápido, sin el constructor.

**🐞 Colores legacy en HIIT:** amarillos que no van con Fitness.

**Acierto grande: la biblioteca de ejercicios.** *"Exquisita, me encanta."* Y en particular
**los banners de Edad ATP en los ejercicios que la impactan**: *"un deleite."*

⚠️ **La frase que importa de todo este bloque:** *"No he usado mucho la aplicación para entrenar
porque todavía no es amigable y no es fácil."* El dueño no usa su propio módulo de entrenamiento.
Eso es la señal más fuerte del recorrido y ordena la prioridad: **asignación de rutinas a días
y una interfaz de ejecución fácil.**

## 9 · Cardio

**🐞 EL BUG DURO, con causa raíz encontrada. El import NUNCA ha funcionado.**

El error de la captura: `new row for relation "cardio_sessions" violates check constraint
"cardio_sessions_source_check"`.

```
036_fitness_deep.sql:  source TEXT DEFAULT 'manual'
                       CHECK (source IN ('manual','wearable','strava','garmin'))

health-import-core.ts:19   type HealthSource = 'health_connect' | 'healthkit'
health-import-service.ts:314   source: w.source
```

**Ninguno de los dos valores que manda el import está permitido por la restricción.** No es que
falle a veces: **falla siempre, para todos, en las dos plataformas.** Y como es un solo `insert`
con todas las filas, los 71 entrenamientos se caen juntos.

Arreglo: migración idempotente que agregue `'health_connect'` y `'healthkit'` a la restricción.
Y un test que cruce los valores que el código puede mandar contra los que la tabla acepta,
porque este error es de una familia que va a volver.

**🐞 La sincronización automática tampoco funciona**, y es el mismo motivo: usa la misma ruta de
inserción. El interruptor está prendido y no ha pasado nada.

**🐞 El import revuelve caminatas y actividades diminutas.** Salen entradas de 10 minutos con
0.01 km. Verificado en el código: **no hay ningún filtro.** Todo lo que Health Connect devuelva
como sesión de ejercicio entra, y lo que no está en el mapa de disciplinas cae como "Otro", que
es por lo que la lista está llena de "Otro".

Hace falta: **duración mínima, distancia mínima, y una lista de disciplinas que sí importamos.**
Y que el usuario pueda desmarcar antes de importar, no después.

**🐞 La pantalla de conectar no menciona Apple Health.** Dice Google Health, Samsung Health y
Garmin. El código sí lee HealthKit (`leerIOS`). Es copy incompleto.

**🐞 No hay historial ni estadísticas.** Tocar Correr, Ciclismo, Natación o Remo lleva **todo al
mismo lugar**: registrar. No hay interfaz de cardio, no hay histórico, no hay progreso.

**🏗️ Lo que Enrique quiere en cardio:** VDOT, VO2max estimado, ritmo óptimo, zonas
cardiovasculares. *"Robustecer mucho el módulo."*

**✂️ Cardio es azul y Fitness es lima.** Unificar.

⚠️ **Y una nota de método:** hay que investigar **cómo exporta datos cada plataforma** antes de
seguir parchando. Hoy el import trata a Health Connect y a HealthKit como si entregaran lo
mismo, y no es así. Esto se conecta directo con lo de Sueño: **es la misma investigación.**

## 10 · Movilidad

**🐞 Entra directo a la evaluación.** No hay antesala para elegir entre **evaluar** y **hacer
una rutina de movilidad**. Falta esa pantalla.

**🏗️ No existen rutinas de movilidad.** Quiere cuatro o cinco prehechas, de las reconocidas.

**🐞 Al terminar el test no hay opción de guardar.** Dice "Listo" y no pasa nada: sin histórico,
sin progreso en el tiempo, sin reconocimiento ni hito.

**✂️ Demasiado texto en la evaluación.** *"Alguien que no alcanza a ver bien se puede abrumar."*
(El botón que se ilumina al seleccionar sí le gustó.)

**🏗️ Accesibilidad, y es más grande que movilidad:**
- Tamaño de fuente configurable, o que respete el del sistema.
- **MODO CLARO.** *"Ya me han dicho personas que no se sienten cómodas leyendo esto porque no
  alcanzan a ver bien."* Todo se construyó en oscuro porque es la identidad de ATP, pero el
  claro falta. **Es su propio proyecto y toca cada pantalla.**

## 11 · 1RM

**🐞 La app está mal concebida: hoy no es 1RM, es un registro de ejercicios.** Manda a
"selecciona un ejercicio y registra" con los de benchmark. **Eso pertenece a Récords.**

**🏗️ Lo que 1RM debe ser:** una calculadora y asistente que estime la fuerza máxima **sin que la
persona tenga que hacer un esfuerzo máximo**, y que muestre los porcentajes de trabajo (80%,
100%, 120%).

Con dos cosas que Enrique pide explícitamente:
- **Guía para ejercicios lastrados.** En dominadas o fondos con peso, ¿el cálculo es peso
  corporal más el lastre, o solo el excedente? *"Eso serviría muchísimo para orientar."*
- **Registro por ejercicio detrás del cálculo**, no solo calcular y olvidar.

## 12 · Récords

*"Una pantalla muy bonita, me encanta."* Los benchmarks y los pesos máximos estimados le gustan.

**✂️ Demasiado lima.** Le falta tratamiento editorial.

**✂️ Aquí es donde debe vivir el registro de ejercicios** que hoy está mal puesto en 1RM.

**❓ ¿Registrar ejercicios que no sean benchmark?** A pelotear: puede valer la pena o puede
complicar de más.

**🏗️ Compararse.** Contra población general por edad y sexo, y contra la comunidad ATP,
también filtrando por gente comparable. Es de las cosas que más pueden enganchar y conecta con
el perfil con banner de logros del bloque de Rachas.

---

# 🥑 NUTRICIÓN

**❓ La sección se llama "Hábitos diarios" y no le queda.** Contiene Comida, Hidratación, Ayuno,
Suplementos, Recetas y Lista de compra: **eso es Nutrición.** Cambiar el nombre de la sección.

**🐞 Redundancia de arquitectura, y es la doctrina que ya escribimos.**
Tocar **Comida** en el launcher abre **ATP Nutrición**, un hub que contiene las mismas apps que
ya están afuera en el launcher. Dos capas para lo mismo.

La regla: **si una app vive en el launcher, no vuelve a vivir dentro de un hub.** Lo que sí debe
quedarse dentro de ATP Nutrición es lo que no tiene lugar propio, como preferencias de comida.

**🏗️ Y al revés: el escáner de etiquetas debe salir al launcher.** Hoy está enterrado dentro de
ATP Nutrición y es de las piezas más valiosas del pilar.

## 13 · Comida

⚠️ **Otra vez la señal fuerte: *"no la he usado porque yo no acostumbro registrar comida. No sé
de qué manera podemos hacerlo más fácil, porque ni yo lo utilizo."***
El registro de comida es el que más fricción tiene de toda la app. **Antes de agregarle campos,
hay que resolver por qué nadie lo usa.**

**🐞 No hay tipo de comida.** No puede elegir desayuno, comida, cena ni colación: *"es foto,
texto y guardado, fin."*
Verificado: **la base de datos SÍ tiene `meal_type`** con los seis valores
(`046_frequent_foods.sql:6`), y `food-scan.tsx:321` acepta `mealType` como parámetro. **La
capacidad existe y la entrada que él usó no la ofrece.** Es cablear, no construir.

**🐞 El modo completo no cambia lo que esperaba.** Verificado en código: el interruptor sí
funciona, pero **solo controla qué cards se ven en el hub** (`isFeatureVisible`, que en simple
esconde recetas, suplementos, glucosa y escáner). **No cambia la pantalla de registro**, que es
donde él esperaba ver calorías y macros. La expectativa es razonable y el nombre del ajuste la
alimenta: si se llama "registrar calorías y macronutrientes", debe cambiar el registro.

## 14 · Hidratación

**🐞 El encabezado dice NUTRICIÓN, no HIDRATACIÓN.** Confirmado: `app/hydration.tsx:93` lo tiene
escrito a mano.

**🏗️ El módulo está escueto: son tres botones y ya.** Falta todo lo que lo haría valioso:
histórico, porcentaje de días logrados, promedio diario, en qué días toma más agua y en cuáles
menos.

**🏗️ Y no engancha con ATP Science**, que ya está en línea. No explica por qué tomar agua ni
enlaza la literatura que ya escribimos.

## 15 · Ayuno

Funciona bien. Es de los módulos más sanos del recorrido.

**🏗️ Le faltan las estadísticas**, que es lo mismo que le falta a hidratación y a suplementos:
ayuno promedio, el más largo, el más corto, el último, desde cuándo. Hoy el histórico es una
lista interminable.

Que al hacer scroll en la pantalla principal aparezcan los análisis, no solo el registro.

## 16 · Suplementos

*"Se siente robusta."* Funciona.

**🏗️ Falta adherencia por suplemento**, y esta es la prioridad del módulo según Enrique. Qué
días sí y qué días no, con qué frecuencia, la estadística de cada uno. *"Que entrar a un
suplemento no sea solo palomear, también sea conocer mis estadísticas."*

**Referencia explícita: la app "Hábitos"**, que Enrique usa desde hace años y es *"una joya"* y
*"en gran parte la inspiración para el seguimiento de hábitos de ATP"*. **Ahí está registrado su
entrenamiento del récord Guinness de pull ups.**
→ Vale la pena pedirle una exportación de esa data: sirve como referencia de formato **y** como
dato real para probar los reportes.

**✂️ La card de dar de alta un suplemento no es flexible.**

## 17 · Recetas y Lista de compra

**🏗️ El proyecto más grande del pilar, y el que Enrique cree que lo vuelve incomparable.**

*"Recetas y guías de compra para saber elegir los alimentos de manera correcta."* Lo que quiere:

- **Listas de súper inteligentes**, calculadas a partir de lo que la persona come.
- **Recetas prefabricadas** entre las que elegir, con preferencias alimenticias.
- **Guía de compra:** qué buscar y qué ingredientes evitar en un empaquetado.

Y ya existe la pieza que lo hace posible: **`aditivos-alimentarios.com`, la plataforma que ya
está vinculada** y que usa el escáner de etiquetas. La guía de compra puede salir de ahí.

Enrique lo reconoce como módulo olvidado. **Es el que más upside tiene del pilar.**

---

# 🩺 SALUD (la sección del launcher)

**❓ El nombre choca con el tab SALUD.** Dos cosas distintas con el mismo nombre.
Propuesta: la sección del launcher se llama **MEDIR** o **BIOMARCADORES**, porque eso es lo que
contiene: sol, glucosa, cetonas, ciclo, labs. El tab SALUD es el lugar donde se **leen** los
datos; esta sección es donde se **capturan**.

## 18 · Sol

Funciona bien y está completo. *"Es explícito, es entendible."*

**✂️ Fuera los emojis.** No le gustan en esta pantalla.

**✂️ Falta jerarquía visual.** *"Muchas veces no se sabe qué se puede expandir y qué se puede
colapsar."* Botones, texturas, tamaños de letra y color que prioricen y hagan navegable la
pantalla.

## 19 · Glucosa

Bien, pero plano.

**🏗️ Faltan históricos, estadísticas, tendencias y promedios.** Es el mismo hueco de
hidratación, ayuno y suplementos: **la app captura y no devuelve.**

**❓ Monitor continuo de glucosa: SÍ, pero no ahora.** Enrique lo quiere y lo va a hacer.
Su palabra: *"ahorita necesitamos generar dinero ya, no meterle más cosas. Las que cuestan más
trabajo y no dan valor agregado inmediato van después."*
→ Poner un **"Próximamente"** honesto en la pantalla, para que la intención esté a la vista sin
prometer fecha.

## 20 · Cetonas

Igual de bien que glucosa, y con un acierto propio: **se puede comparar aliento, orina y sangre.**

**🏗️ Que un mismo evento admita dos o tres métodos a la vez.** Así los tres valores son
comparables entre sí y producen un dato superior, no tres registros sueltos. *"Un metadato."*

**🏗️ Y las mismas estadísticas que faltan en glucosa.**

## 21 · Labs

**🏗️ El botón está mal apuntado, y esto es reestructura, no ajuste.**
Hoy Labs manda directo a la **guía de laboratorios que conviene hacerse**. Eso es un destino,
no la app.

Lo que Labs debe ser: **mis laboratorios.** Todos los últimos, gráficas, buscador de mis valores
personales, cómo he progresado en el tiempo. Información bruta, agrupada, categorizada y curada,
con reportes. **Y desde ahí, si lo necesito, ir a la guía de qué vale la pena hacerse.**

**✂️ La guía está visualmente plana.** Todo en lima, cards sin profundidad ni textura, cero
degradados ni en los botones. **Demasiado texto blanco sobre negro en letra chica:** *"no llama
la atención leer."*
→ El upgrade visual aquí no es cosmético: es lo que haría legible un módulo que hoy no se lee.

## 22 · Protocolos

**❓❓ La decisión más grande del recorrido.** Enrique: *"sigue siendo mi gran dolor de cabeza.
Ni yo le entiendo. No sé cómo configurarlo, no sé cómo pasa a mi agenda, a mi HOY, a mis
registros."* Y plantea **retirar protocolos e intervenciones** y quedarse con una app de
registro de hábitos wellness.

### Lo que hay construido, medido

**13,588 líneas** entre el catálogo y los servicios de intervenciones. Motor de personalización,
prescripción, racional por intervención, y `intervention-agenda-core` con **94 tests**.

Y el dato que cambia la conversación: **la conexión a la agenda YA EXISTE.**
`planInterventionEventSync` reconcilia intervenciones contra `agenda_events` de forma
idempotente, y `intervention_completions` guarda la compleción por intervención.

**O sea: sí pasa a la agenda. Enrique no lo sabe.** Eso no es un problema de concepto, es que
el módulo nunca se lo muestra.

**Lo que sí está podrido: hay tres generaciones de protocolos encimadas** en la base de datos.
`003_daily_protocols` (protocol_items, assignments, completions), `029_protocol_system`
(templates, user_protocols, daily_plans, action_blocks) y `user_interventions` +
`intervention_completions`. Nadie puede entender un módulo con tres modelos de datos vivos.

### Mi recomendación: no se mata, se colapsa

**El problema no es el concepto: es que "protocolo" es una palabra que el usuario tiene que
aprender, y no produce nada visible al día siguiente.** Un protocolo que no genera una acción
que palomeas es un documento, no un producto.

**Y MB-20 está construyendo justo la pieza que falta: TAREAS.**

La propuesta: **el protocolo deja de ser un concepto de usuario y se vuelve un paquete que
instala hábitos.**

- El usuario nunca ve la palabra protocolo. Ve **"Activar pack de sueño profundo"**, y al
  activarlo **le aparecen tres filas nuevas en TAREAS**. Eso es todo lo que tiene que entender.
- Cada hábito instalado ya tiene su histórico y su adherencia, porque es una fila de TAREAS
  como cualquier otra. **Se resuelve solo el reclamo de "no sé si tiene histórico".**
- La profundidad clínica **no se tira**: sigue viva debajo, en el racional, en la
  personalización y en lo que Mariana y los clínicos prescriben. **Ese es el backend Fx, que es
  línea de ingreso.** Matar protocolos mata eso también, y hay que decirlo antes de decidir.
- Y encaja con lo que él mismo pidió: *"una app de registro de hábitos wellness"*. Es
  exactamente eso, con el catálogo clínico detrás en vez de tirado.

**La prueba de si vale la pena:** si un protocolo no se puede reducir a un puñado de hábitos
instalables, ese protocolo no sirve como producto de consumidor y se queda solo del lado
clínico. Si la mayoría sí se puede, el módulo se salva y se vuelve el más valioso.

### La prueba ya está hecha, y la hizo su propia captura

El ejercicio que iba a proponer resultó innecesario. **Las 8 intervenciones activas de Enrique
ya están escritas como hábitos:**

```
Exposición solar matutina        Hora de dormir
Grounding 10-15 min              Pantallas off 30 min antes
Hidratación matutina 500 ml      Ventana de alimentación
Eliminar aceites vegetales       Zona 2 aeróbica 2-3×/semana
```

No hay nada que traducir. **Son ocho hábitos con horario.** La pregunta de si el catálogo se
puede reducir a hábitos instalables ya tiene respuesta: **sí, y ya lo está.**

Lo que falla no es el contenido, es que viven en una pantalla aparte con botones de pausar y
palomear que no desembocan en nada que el usuario vuelva a ver.

### Cómo se vive: el UX propuesto

**1 · El protocolo desaparece como pantalla de ejecución.** Sus hábitos se mezclan en TAREAS,
en su bloque horario, junto a todo lo demás del día. "Sol de la mañana" aparece en MAÑANA al
lado de Suplementos, no en una lista aparte que hay que ir a visitar.

**2 · Una marca discreta**, un punto de color, dice que ese hábito viene de un pack. Nada más.
Tap largo palomea, tap simple abre su función y **su historial**, que ya se guarda en
`intervention_completions` y hoy no se muestra en ningún lado.

**3 · "Mi Protocolo" se convierte en "Packs":** el lugar donde **activas y desactivas**, no
donde ejecutas. Entras cuando quieres cambiar algo, no todos los días. Es el patrón de
PowerPlugs de Ultrahuman, que ya validamos en la barrida de referentes.

**4 · Un pack se activa completo y se poda.** "Pack Base · 8 hábitos" → Activar → aparecen 8
filas en TAREAS. Quitas dos, quedan seis. La advertencia que ya escribe la pantalla de hoy
("trabajas 8 a la vez, un protocolo de 5-7 se cumple más") sigue siendo válida y ahí encaja.

**5 · ARGOS propone desde el día, no desde una pantalla aparte.** El motor de personalización
ya funciona y es bueno: en la captura sugiere coherencia cardíaca con puntaje 100 y dos razones
basadas en su Braverman. Eso mismo, dicho como una pregunta en TAREAS, se acepta con un toque.

**6 · La palabra "protocolo" y la palabra "intervención" desaparecen de la interfaz.** Se dicen
"hábito" y "pack". El vocabulario clínico se queda del lado clínico, que es donde vale.

**Lo que NO se toca:** el motor de personalización, el racional por intervención, el catálogo y
la conexión con el mapa funcional. Todo eso sigue vivo debajo y es lo que Mariana y los clínicos
prescriben. **Es el backend Fx, que es línea de ingreso.**

### La deuda que sí hay que pagar

**Tres generaciones de protocolos encimadas en la base de datos.** `003_daily_protocols`,
`029_protocol_system` y `user_interventions` + `intervention_completions`. Antes de construir
esto hay que decidir cuál es el modelo vivo y retirar los otros dos. **Nadie puede mantener un
módulo con tres modelos de datos.**
