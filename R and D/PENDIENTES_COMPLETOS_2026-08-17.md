# Pendientes completos · 17 de agosto de 2026

Barrido de todo el repo para autorizar o descartar cada cosa. 15 días para el
1 de septiembre. Un solo desarrollador. **No quedan builds:** el binario 2.2.0
(Android 23, iOS 5) es el último, y ya lleva HealthKit, Health Connect, la
cámara y los widgets. Todo lo que sigue viaja por OTA salvo donde se diga.

---

# TABLERO

| Grupo | Cuántos |
|---|---|
| 1 · Bloquea el lanzamiento | **16** |
| 2 · Duele pero no bloquea | **25** |
| 3 · Deuda | **17** |
| 4 · Espera a otra persona | **17** |
| 5 · Muerto por el pivote | **8** |
| **Total** | **83** |

## Las tres cosas que yo haría primero

**1. Correr la app en el teléfono y `npm test` en tu máquina, hoy.**
Nada de este ciclo ha corrido en un dispositivo: ni el tema claro en 70
archivos, ni el día 1 nuevo, ni el gate de login, ni la salud del sistema. Los
agentes no pudieron correr `vitest` porque el `node_modules` tiene binarios de
Windows. Todo lo demás en esta lista es una hipótesis hasta que esto pase. Y
como no quedan builds, si aparece un bug de nivel nativo no hay plan B.

**2. Mandar el cuadernillo de la matriz a firma clínica, hoy mismo.**
Es lo único que depende de otra persona y tiene el peor daño posible: hoy la app
le dice a una mujer con T3 en el piso que está en 100 de 100, y le dice a
cualquier mujer que suba LDH normal que pida atención médica. Son datos, no
código, y se arreglan por OTA en minutos una vez firmados. Lo que no se puede
acelerar es la firma.

**3. El paquete de cumplimiento que cabe en una tarde de OTA.**
Razón social y domicilio en el aviso de privacidad, la cifra de la cláusula
Founders, borrar el texto donde la app le confiesa al usuario que está a medio
hacer, el disclaimer de ARGOS completo y no truncado, el Hba1c con 19 decimales,
y tematizar el contenedor de navegación para matar el destello negro. Seis
cosas chicas, todas de rechazo o de credibilidad, ninguna de más de un rato.

## Veredicto sobre el 1 de septiembre

**Alcanzable, pero no por el camino que la lista sugiere.** Los bloqueantes de
código son casi todos chicos y de OTA. Lo que decide la fecha son cuatro cosas
que no dependen de escribir código:

- La **firma clínica** de los 13 casos de la matriz. Si no llega esta semana, o
  sales con datos de salud que sabes que están mal, o no sales.
- Los **datos de la razón social**. Sin eso el aviso de privacidad no identifica
  al responsable, y eso es rechazo en revisión, no un detalle.
- Los **4 secrets y los productos en las tiendas**, más el tiempo de revisión de
  Apple, que no controlas.
- Que el **device test no encuentre nada estructural**. Aquí está el riesgo real:
  el plan de reversión completo asume que todo se apaga por OTA, y eso es cierto
  para las 11 banderas, pero no para un bug nativo. Un solo problema de ese tipo
  te obliga a un build y el build reinicia la revisión de la tienda.

Dos cosas de esta lista yo no las dejaría pasar calladas y las dos son de
criterio, no de tiempo: **los pesos de la Edad ATP son placeholder** (el número
que vende el producto no se calcula con el algoritmo real) y **el motor
funcional copia umbrales masculinos al arreglo femenino**, incluida
testosterona. Ninguna de las dos es un bug que se vea. Las dos son información
de salud equivocada con la firma de la casa encima.

## Cómo leer cada renglón

`OTA` significa que viaja en una actualización de JavaScript. `BUILD` significa
que exige compilar, o sea que en este ciclo es imposible. El esfuerzo es
relativo entre renglones: `trivial`, `chico`, `medio`, `grande`.

---

# 1 · BLOQUEA EL LANZAMIENTO

**L-1 · El aviso de privacidad y los términos no dicen quién es el responsable**
`src/constants/legal-texts.ts:39,93` conserva el placeholder literal
`[RAZÓN SOCIAL, S.A.S. de C.V.]` y `[DOMICILIO, QUERÉTARO, MÉXICO]`. Un aviso de
privacidad que no identifica al responsable no cumple la ley mexicana y es
rechazo directo en tiendas para una app de salud.
`OTA` · `trivial` en código · **Decisión: dar los datos de la sociedad, o
decidir que se publica como persona física.** Es trámite, no programación.

**L-2 · La cláusula Founders promete un reembolso con un número inventado**
`legal-texts.ts:113` dice reembolso prorrateado sobre una vida esperada de
referencia de `[10]` años. Es una cifra con consecuencia jurídica, escrita como
placeholder.
`OTA` · `trivial` · **Decisión: fijas el número o quitas la cláusula.**

**L-3 · Tres errores de la matriz que dan un veredicto de salud equivocado**
De los 13 casos documentados, tres ya están dañando: `t3_libre` está etiquetada
en ng/dL con bandas de pg/mL, así que una T3 en el piso puntúa 100 de 100 con
texto tranquilizador (falso negativo silencioso); `ldh` en mujeres trae copiada
la banda del NLR (0.1 a 1.5), así que el 100% de las mujeres que suba un LDH
normal ve "pide atención"; `apolipoproteinas_b` tiene el segundo corte en 0 y
todo el intervalo de 0 a 39 mg/dL puntúa 50.
`OTA` · `chico` una vez firmado · **Decisión: no es tuya, es firma clínica (F-1).
Lo tuyo es mandarlo hoy.**

**L-4 · El motor funcional usa umbrales de hombre para mujeres**
`src/data/functional-health-engine.ts:19-25` lo declara en su propio
encabezado: declara 144 parámetros y define 98, y copia los umbrales masculinos
al arreglo femenino en casi todos, **incluida testosterona**. Sigue vivo para
`calculateHealthScore`, que es un score que se persiste, y para PhenoAge. Cero
tests.
`OTA` · `medio` · **Decisión: aceptas salir así y lo documentas, o defines con
firma clínica los umbrales femeninos de los parámetros que más se ven.** Ojo:
corregirlo mueve números ya guardados en base.

**L-5 · La Edad ATP se calcula con pesos placeholder**
`src/constants/edad-atp-v2-model.ts:201-205` lo dice literal: `SF_DOMAIN_WEIGHTS`
es placeholder, faltan los rangos por parámetro (9 bandas por 140 entradas),
faltan las tablas de norma de las sub-edades y las normas del test de reacción
están aproximadas. Es el número que vende el producto entero.
`OTA` · `grande` · **Decisión: sales con el número como está y lo llamas
estimación en la interfaz, o congelas la Edad ATP detrás de una bandera hasta
tener la matriz completa.** No hay tercera opción honesta.

**L-6 · La app le confiesa al usuario que está a medio hacer**
`app/settings/experiencia.tsx:104`: "El modo claro va llegando por partes: el
marco ya cambia, pero varias pantallas siguen en oscuro mientras terminamos la
migración". Verificado: **sigue en el código.**
`OTA` · `trivial` · **Decisión: borrarlo. Pero borrarlo sin cerrar L-8 es
esconder el problema, no resolverlo.**

**L-7 · Cada navegación en tema claro da un destello negro**
`app/_layout.tsx:74` sigue montando `DarkTheme` en el contenedor de navegación,
con la nota "tránsito MB-31B". Es la causa de las dos capturas 100% negras y de
la banda negra en recuperar contraseña. Era la acción número 2 de la auditoría y
está abierta. Verificado en código.
`OTA` · `chico` · Decisión: ninguna, es ejecución.

**L-8 · La primera pantalla después de pagar sale en negro sobre tema claro**
`register` y `reset-password` son formularios negros con placeholders grises que
no leen como campos. Siguen en la lista: `builder`, `protocol-explorer`,
`medidas` y composición corporal. La bandera `AUTH_RESPETA_EL_TEMA` ya está
encendida y los commits de marca arreglaron la legibilidad del login, así que
esto está a medio cerrar.
`OTA` · `medio` · Decisión: ninguna, es ejecución. **No verificado en device
cuánto quedó realmente cerrado con la bandera encendida.**

**L-9 · El disclaimer médico de ARGOS se corta a media frase**
En una ruta sale truncado con elipsis y en la otra no aparece porque lo desplaza
la barra de pestañas. Es exactamente el texto que revisan Apple y Google en una
app de salud.
`OTA` · `chico` · Decisión: ninguna.

**L-10 · Un dato de salud con 19 decimales y en la escala equivocada**
`clinical-system` muestra `Hba1c: 0.0540000000000000006` cuando debería decir
5.4%, y ningún lab de esa pantalla muestra unidades. La pantalla además no tiene
una sola entrada desde la interfaz de usuario.
`OTA` · `trivial` · **Decisión: la borras (es la recomendación) o arreglas el
formato.**

**L-11 · El paywall no se ha visto con precios reales**
En la corrida de capturas renderizó "Precios sin conexión" y el botón decía "Sin
conexión". Ya se arregló para fallar honesto y recuperable, pero un paywall sin
precio es rechazo en revisión y esto no se puede juzgar desde una captura.
`OTA` para arreglar, **verificación en device obligatoria** · `chico` ·
Depende de L-12.

**L-12 · Los 4 secrets, los productos en las tiendas y el aviso publicado**
Stripe, Conekta, RevenueCat y Resend en Supabase; los productos creados en App
Store y Play más el Small Business Program; y el aviso de privacidad publicado
en el dominio. Sin RevenueCat no hay compra, y sin compra no hay app.
Fuera de código · `medio` en tiempo tuyo · **Solo tú.**

**L-13 · Cuatro migraciones sin aplicar al remoto**
`275_insight_ventana_y_cuota_ponderada`, `276_drop_admin_reports_rpcs`,
`290_membresia_unica` y `295_techo_por_gasto`. Las cuatro dicen en su segunda
línea que el agente no las corre. El orden del runbook es `db push` **antes** del
OTA: al revés, la app busca columnas que no existen y truena.
`OTA` más `db push` · `trivial` · **Solo tú** (el CLI está ligado a tu máquina).

**L-14 · Nada de este ciclo ha corrido en un teléfono**
Ni el tema claro en 70 archivos, ni el día 1, ni el gate de login, ni la salud
del sistema, ni los cierres del pilar Mente. `ClientDetailScreen.tsx` es el de
mayor riesgo acumulado: 4,166 líneas con 1,200 de diferencia por el tema claro.
Y `npm test` no lo pudo correr ningún agente.
Verificación · `medio` · Decisión: ninguna, es la primera cosa que haría.

**L-15 · ARGOS puede mandar al usuario a una pantalla que no existe**
Esto **no estaba anotado en ningún documento** y es el hallazgo que más me
preocupa. La tabla de rutas que usa el navegador de ARGOS
(`src/constants/app-routes.generated.ts`) incluye **10 plantillas dinámicas sin
resolver**, entre ellas `/tests/q/[id]`, `/reports/[dominio]`,
`/packs/[packKey]` y `/salud/intervenciones/[key]`. Ni `RUTAS_VETADAS` ni
`PREFIJOS_VETADOS` ni la capa de ejecución filtran rutas con corchetes. Si el
resolvedor elige una, empuja la ruta literal y el usuario aterriza en
"Evaluación no encontrada" con un solo botón de regreso. Mecanismo verificado en
código; **lo que no pude verificar sin correr el resolvedor es si el ranking
llega a ofrecerlas.** Relacionado: de las 33 rutas `/tests/q/*` que emite el
generador, solo 6 evaluaciones tienen `live: true`, y el motor muestra ese mismo
error cuando la familia del motor no está implementada.
`OTA` · `chico` (filtrar corchetes en el resolvedor es una línea) ·
Decisión: ninguna.

**L-16 · El proxy de ARGOS confía en el `userId` que le manda el cliente**
`supabase/functions/argos-proxy/index.ts:938` saca `userId` del cuerpo de la
petición y no lo verifica contra el JWT. Con ese dato se decide la cuota, el
gasto acumulado, el tier efectivo y el registro. Quien lo manipule puede
atribuirle consumo a otra cuenta, y con el techo de fraude encendido eso
significa poder tumbarle el acceso a otra persona. Los documentos internos lo
clasifican como "no bloquea el launch, pero debe estar antes de abrir registro
masivo". **No comparto ese juicio si abres registro el 1 de septiembre**, porque
el día que abres es el día del registro masivo.
`OTA` (es edge function) · `chico` · **Decisión tuya: lo arreglas antes de
abrir, o aceptas el riesgo por escrito.**

---

# 2 · DUELE PERO NO BLOQUEA

**D-1 · El check-in emocional es el peor caso de legibilidad de la app**
Las cuatro etiquetas de cuadrante van sobreimpresas en grande encima de la
retícula, cada una tintada del color de su cuadrante (amarillo sobre amarillo,
verde sobre verde), tapan unas seis emociones cada una, y las 144 celdas rotulan
a 9 o 10 px. Encima hay 450 px de vacío arriba mientras la retícula va apretada.
Es tu diferenciador declarado número uno contra la competencia.
`OTA` · `medio` · Decisión: ninguna, el arreglo está descrito.

**D-2 · Cuatro reportes con datos que no se leen**
Ayuno (barras blancas sobre tarjeta verde pálido y 30 etiquetas del eje X
encabalgadas), emociones (número y etiqueta en gris claro sobre burbuja del
mismo tono de la cuarta fila para abajo), economía (valores en lima sobre verde
pálido), adherencia (puntos de 10 px donde "registrado sin llegar a la meta" no
se distingue del lleno). `OTA` · `medio`

**D-3 · Fuerza y benchmarks: lima sobre oliva**
Los chips de variantes y los nombres de grupos musculares mueren a media línea.
`OTA` · `chico`

**D-4 · El encabezado choca con la barra de estado y con su propio botón**
El botón de casa se monta sobre el título en cinco pantallas, el encabezado se
dibuja a la altura del reloj del sistema en siete rutas, y aparece un **segundo
botón de casa flotante** en seis pantallas más, tapando contenido. La misma
pantalla con otra ruta sí respeta el margen seguro, así que es la ruta y no el
componente. `OTA` · `chico`

**D-5 · El bloque clínico más denso compite con su propio fondo**
El párrafo de 25 líneas del diagnóstico funcional va en gris claro sobre una foto
macro texturizada. Falta una capa de oscurecimiento detrás del texto.
`OTA` · `trivial`

**D-6 · Agenda y el hub de escritura: títulos sobre foto y truncados**
Blanco sobre foto en blanco y negro sin contraste, y títulos cortados a media
palabra ("Eliminar acei...", "Luz solar + inf..."). `OTA` · `chico`

**D-7 · Texto de un solo color sobre degradados que van de claro a negro**
Pasa en ciclo, nutrición y la tarjeta de rango de la economía. Mismo patrón, tres
lugares. `OTA` · `chico`

**D-8 · Controles que no dicen en qué estado están**
Los tres radios de modo de notificaciones salen todos vacíos, y los cuatro chips
de nivel de entrenamiento salen todos en el mismo gris sin marcar el
seleccionado. El usuario no sabe qué tiene puesto. `OTA` · `chico`

**D-9 · Fugas de idioma y markdown crudo en superficie de usuario**
"Food photo" y "Hydration tap" en el historial, "Standard / Silent / Community /
Adaptive ARGOS" en notificaciones, "COMPLIANCE" en adherencia, markdown sin
renderizar en los previos de conversaciones, y "en agenda del **user**" en una
intervención. `OTA` · `chico`

**D-10 · Las cinco barras de Edad ATP están rotuladas solo con emoji**
No hay texto que diga a qué área corresponde el número. `OTA` · `trivial`

**D-11 · La píldora de gamificación se come el título en labs**
"ATP L...", "HOM...", "BIOM...". `OTA` · `trivial`

**D-12 · El día 1 son ocho filas, no tres**
La siembra suave ya bajó de 13, pero los cinco hábitos obligatorios los fuerza el
código y no son deseleccionables: existen para tapar un bug del toggle
silencioso. Ocho es el techo de la doctrina, no el arranque.
`OTA` · `medio` · **Decisión de producto tuya: aceptas ocho o rediseñas la
obligatoriedad.**

**D-13 · La siembra del día 1 no viene del pack**
El pack se elige después de la pantalla de notificaciones, así que al cerrar el
onboarding todavía no existe. El parámetro está construido y el llamador le pasa
`null`. `OTA` · `chico`

**D-14 · El onboarding son 9 pantallas y unos 28 toques antes de la primera
acción útil**, 40 con el tour. La primera sesión del que acaba de pagar es la más
larga de toda su vida en la app, y eso choca de frente con la doctrina de
sesiones cortas. Dos pantallas se pueden plegar: una es un muro de lectura sin
input y la otra presenta una sola opción para hombres.
`OTA` · `medio` · **Decisión tuya.**

**D-15 · El tour de la orbe son 12 pasos**
Y ya existe un mecanismo mejor: el empujón contextual que aparece cuando detecta
titubeo. `OTA` · `chico` · **Decisión tuya.**

**D-16 · Nadie le dice al usuario que la orbe es el buscador de la app**
Los seis chips del estado vacío del chat son todos de contenido, cero de
navegación. La capacidad está construida, probada, cuesta cero y no consume
cuota. Cambiar dos chips enseña la sintaxis sin un tutorial. Es el mejor retorno
por esfuerzo de todo el análisis de adopción. `OTA` · `trivial`

**D-17 · Dos pantallas son irrecuperables una vez que pasas**
`onboarding/voice-config` no tiene un solo empujón en toda la app, y la
presentación de la orbe solo se puede volver a ver detrás del gate de admin. Es
la pieza de personalidad del producto y se ve una vez en la vida.
`OTA` · `chico`

**D-18 · Ajustes no tiene engranaje**
No existe un solo `router.push('/settings')` en toda la app: verificado. La única
puerta viva es un ícono entre veinte de la cuadrícula, y sobrevive porque está
cableado a mano en la lista de apps fijas. `OTA` · `chico`

**D-19 · Dos pantallas dan dos verdades del mismo dato**
`progress` dice "0 entrenos, 0 kg, 0 PRs" en agosto y `reports/entrenamiento`
lista 7 sesiones de running de esa misma semana. Rompe tu propia regla de un
dato en un solo lugar. `OTA` · `chico` · **Decisión: con cuál te quedas.**

**D-20 · Unos 40 alias y redirects que muestran exactamente la misma pantalla**
Verificado píxel a píxel en la auditoría. Bajarían de 57 a unos 15. No es gratis:
cada redirect es un enlace profundo que una notificación o ARGOS pueden estar
usando, así que se quitan junto con sus referencias. `OTA` · `medio`

**D-21 · El modo medido del ayuno está apagado esperando una prueba en device**
Es la única de las 11 banderas en `false`. El núcleo y el cableado están listos:
lo que falta es leer glucosa y cetonas en un teléfono real.
`OTA` · `trivial` una vez probado.

**D-22 · Cuatro acciones destructivas siguen existiendo solo como pulsación larga**
Eran siete y tres ya tienen entrada visible. Borrar ayuno, borrar entrada de
escritura, borrar alimento, borrar receta, quitar suplemento, borrar rutina y
desinstalar app. **No pude verificar cuáles tres quedaron cubiertas.**
`OTA` · `chico`

**D-23 · Un tercio de la auditoría visual no sirvió**
El pilar Mente, el motor de cuestionarios y buena parte de Fitness quedaron sin
auditar porque las capturas se tomaron a mitad de transición o sobre estados de
carga que nunca resuelven. Hay que volver a correrla con espera explícita antes
de cada captura. `OTA` · `chico` · **Es prerrequisito para saber qué más hay.**

**D-24 · Los umbrales del sueño son calibración de escritorio**
El score de calma y la detección de ronquido se afinaron sobre noches
sintéticas. Se ajustan en el núcleo puro, sin tocar pantalla, después de una
noche real con el teléfono en el buró. `OTA` · `chico` tras la noche.

**D-25 · El filtro nocturno no sobrevive un reinicio y el overlay no cubre toda
la barra de estado** en todos los fabricantes. Las dos son limitaciones aceptadas
a conciencia. La segunda hay que verla en device. Sin arreglo por OTA.

---

# 3 · DEUDA

**T-1 · 41 archivos huérfanos fichados y no borrados.** Se detectaron al terminar
la limpieza y no se tocaron porque la aprobación era para una lista nombrada.
Varios son motores a medio cablear, no basura: uno de ellos carga doctrina sobre
fiebre y su candado se reapunta, no se tira. `OTA` · `medio`

**T-2 · La mayoría de los servicios con efectos sigue sin tests.** 13 archivos
cubiertos y creciendo. Es la deuda que más crece con cada entrega. `medio`

**T-3 · Los sourcemaps solo suben si publicas con el script correcto.** El script
existe (`npm run sourcemaps:ota`). Publicar con `eas update` a secas deja los
stacktraces de Sentry mintiendo. `trivial`, es disciplina.

**T-4 · El insight diario sin batchear cuesta 9 veces más.** La caché acierta
0.7%. La regla escrita es que el batch va antes de cualquier decisión de meter
cerebro. `OTA` · `medio`

**T-5 · El candado de escritura del día es por proceso, no entre dispositivos.**
Dos teléfonos escribiendo el mismo día siguen en leer, mezclar y escribir. Ese
caso ya existía antes, así que es endurecimiento y no regresión. `medio`

**T-6 · Las recetas de arranque no tienen un solo importador vivo.** Cablear o
borrar. `chico` · **Decisión tuya.**

**T-7 · Cetonas de aliento, orina y sangre en un solo evento comparable.**
Necesita modelo de datos propio. `medio`

**T-8 · La frecuencia cardiaca por sesión de ejercicio no tiene fuente.** La tabla
solo guarda la de reposo del día, así que ese parámetro queda sin cablear.

**T-9 · El QR clínico no existe, y en este ciclo no puede existir.** Un hospital
escanea con la cámara del sistema, así que el código tiene que abrir un
navegador, y eso exige configuración nativa. `BUILD` · **imposible antes del 1 de
septiembre.** Hay **cuatro** decisiones no técnicas pendientes escritas en el
encabezado del componente (`src/components/salud/QrFicha.tsx:31-52`).

> **Corregido el 18 de agosto de 2026: son cuatro, no tres.** La cuarta es la que
> más muerde y es la que faltaba: **qué es "la historia clínica completa"**. Hay
> cuatro documentos ya construidos y NO son el mismo (`historia_clinica.data`, el
> reporte de consulta, el timeline del expediente y el export maestro). Alguien va
> a imprimir el equivocado. Las cuatro, en orden del archivo: (1) qué abre el que
> escanea, que es la que bloquea todo y la única que no viaja por OTA; (2) dónde
> vive el documento; (3) quién entra y si queda rastro, donde
> `user_data_access_log` ya existe con las columnas correctas y **nadie escribe en
> ella todavía**; (4) qué es la historia clínica completa.

**T-10 · ~~El motor del coach está en una rama sin mergear con 7 pendientes.~~
FALSO. El motor está en `main` desde el 2 de junio de 2026.** Los 7 pendientes
existen, pero son deuda **dentro de `main`**, no trabajo atorado en una rama.
Ninguno exige build. Uno pide una migración nueva si se quieren guardar el
mensaje del usuario y la descripción de la señal. La detección de recurrencia
está fija en falso y el detector de frenos recibe contexto vacío. `medio`

> **Corregido el 18 de agosto de 2026.** Verificado: el código vive en
> `src/lib/coach-engine/` con 17 módulos, el primer commit es del 1 de junio y el
> merge que lo cablea a producción es `b69e9d7`, del 2 de junio ("wire
> coach-engine a producción"). Las ocho ramas de la familia coach están
> mergeadas.
>
> **Qué se pierde si nunca se mergea: nada, porque no hay nada que mergear.** Lo
> que sí se perdía era el tiempo del siguiente desarrollador buscando una rama que
> no existe. Por eso se corrige aquí y no solo en el handoff: este archivo es el
> inventario que la gente abre.

**T-11 · La pantalla de ayuno tiene 1,343 líneas y 30 superficies presionables.**
La referencia del sector tiene 4. Adoptar eso no es agregar, es quitar. `medio`

**T-12 · Colores fuera de paleta y el ámbar sin legislar.** Warn, destructivo y
error viven con valores a mano, y el ámbar se usa como letra sobre tarjeta clara
en tres lugares donde no se lee. **Decisión de marca:** ¿token de advertencia o
señal? Los semáforos clínicos se quedan como señal, no como tema.

**T-13 · El score que se persiste sigue en el motor legacy.** La bandera de una
sola fuente de rangos no lo alcanza porque cambiarlo mueve un número ya guardado
en base. Relacionado con L-4.

**T-14 · No hay renderizador de PDF a imagen.** Lanza un error a propósito para
forzar el camino alterno. Está capturado por diseño, no es un crash.

**T-15 · El orquestador del coach tiene la recurrencia fija en falso** y no
enriquece el contexto con la energía del día. Degrada la calidad de las
respuestas, no corrompe datos.

**T-16 · Las 36 fichas del Centro son una plantilla con cuatro huecos** y 21 de
las 36 no llenan el quinto. En una hoja modal desde la lista, el paso extra
desaparece. Bonus feo: hoy el bloque de "Desinstalar" es el elemento más grande
de la ficha, por encima de la acción real. `OTA` · `medio` · **Decisión de
producto tuya.**

**T-17 · Los 8 packs no se distinguen entre sí.** Mismo layout y glifo gris
monocromo en los ocho. Si los packs son la puerta de entrada, elegir uno debería
ser reconocer, no leer. `OTA` · `medio`

---

# 4 · ESPERA A OTRA PERSONA

**F-1 · Firma clínica de los 13 casos de la matriz.** El cuadernillo ya está en
formato contestable con casillas de decisión, y hay un archivo de cálculo con las
13 decisiones. Tres son urgentes (L-3), dos son bidireccionales (mismo número,
dos veredictos en la misma sesión), dos son puramente de captura y se firman en
dos minutos, tres están compensadas por código, y uno es nuevo: la edad corporal
en el dominio de sueño tiene los cortes fuera de orden y contradice al mismo
parámetro en composición corporal. **Esto es el camino crítico del lanzamiento.**

**F-2 · Firma de los nombres y el copy** de los 5 packs y de los 3 paquetes de
salud. Gatea copy antes de tiendas.

**F-3 · Validación de las preguntas de historia clínica.** El encabezado del
archivo las marca como propuestas por el asistente, sin validar clínicamente.

**F-4 · El catálogo de intervenciones espera tres cosas:** validación de la
versión 3, el ciclo femenino que falta, y los protocolos sin dosis, sin ventanas
y sin criterios de entrada y salida. Una parte es especificación tuya.

**F-5 · Los rangos clínicos de laboratorio** tienen marcas de validación
pendiente en el archivo.

**F-6 · El set de iconos ATP es un encargo de diseño** y está declarado como
prerrequisito duro: sin él el springboard no arranca. Post lanzamiento.

**F-7 · La firma vertical del logo** (21 trazos sin montar) quedó fuera a
propósito. Deuda de marca con la autora del manual.

**F-8 · El nombre de la sección de escritura.** Tres candidatos. El cambio de
copy son 23 textos con archivo y línea, es OTA y se revierte con un revert.
Renombrar la ruta es la parte cara: arrastra 10 archivos, el mapa de rutas, la
regeneración de tipos, y exige dejar la ruta vieja como redirect o se rompen los
enlaces profundos. Ojo: **una línea de esto exige BUILD** (el texto de propósito
del micrófono), así que esa parte no entra en este ciclo.

**F-9 · Las ventanas horarias de las fases del ayuno.** Están marcadas como
provisionales y las cierras tú. Bloquea el contenido de la pastilla de etapa
metabólica en vivo.

**F-10 · Qué pasa con el saldo comprado y no gastado de la moneda interna**, y
con las recargas pagadas que nunca se acreditaron. Hoy se resuelve a mano, caso
por caso, y la función que las reclamaba sigue desplegada sin cliente que la
llame. Reembolso, meses de membresía o nada: es decisión de negocio.

**F-11 · Revocar las funciones de gasto de la moneda interna.** El documento lo
recomienda como cambio propio. Efecto colateral: hay un test que hoy exige que
existan y hay que reapuntarlo.

**F-12 · Qué se borra de las 16 pantallas candidatas.** Seis son limpieza sin
nada que perder (un índice de índices con 1,700 px de vacío, una pantalla sin
entradas, un fallback inalcanzable, una pantalla que es un estado, tres niveles
de menú de desarrollo). Diez tienen una decisión de producto detrás.

**F-13 · Tres decisiones de color:** el ámbar como token o como señal, el
contraste del teal del coach en tema oscuro, y confirmar que la ficha de
emergencia se quede clara en tema oscuro **como decisión y no como accidente**
(tiene sentido: la lee un paramédico).

**F-14 · Los widgets de iOS y el hueco del candado sin servicio en frío.** Está
especificado. Exige `BUILD`, así que no entra en este ciclo.

**F-15 · La grabación de sesión.** Está encendida con el enmascaramiento más
estricto, pero falta activarla en el proyecto y **revisar la primera grabación
real** de labs, escritura y chat antes de darla por garantizada. Si algo se lee,
se apaga en una línea. La navegación entre pantallas sí es visible, y eso es
inherente.

**F-16 · La arquitectura de 5 pestañas con la orbe al centro.** Seis decisiones
de peloteo, explícitamente "nada de esto es brief todavía". Post lanzamiento.

**F-17 · Qué significa el trial de 14 días sin tiers.** Estaba definido solo para
el plan mensual de entrada, que ya no existe. Hay un pendiente en el banner
superior esperando la variante de cuenta regresiva. **Decisión tuya: hay trial o
no hay.**

---

# 5 · MUERTO POR EL PIVOTE

Se listan para que los taches, no para que los hagas.

**M-1 · La cuota diaria partida por tier.** La propuesta escrita era "Sonnet:
gratis 3, base 25, pro 150". **Verificado: `TIER_DAILY_LIMITS` ya no existe en el
proxy** y quedó sustituido por el techo por gasto real, con aviso de presupuesto
que no corta y corte antifraude que sí. El diagnóstico de fondo (contar acciones
no acota el gasto) ya se resolvió mejor.

**M-2 · Toda la carpeta de precios y gating de agosto.** Cuatro documentos
construidos sobre "tres precios, no uno", que es exactamente lo contrario de la
membresía única. Sirven como historia, no como plan.

**M-3 · Ponerle una puerta visible a la economía de la moneda interna.** Era la
acción 9 de la auditoría visual, escrita el mismo día que el pivote apagó la
venta. La otra mitad de ese punto (puerta visible al hub de evaluaciones) **sigue
viva** y no está en este grupo.

**M-4 · La legibilidad de la pantalla de administración de la economía.** Tenía
dos fallos opuestos en la misma pantalla. Si la economía se apaga, la pantalla se
va con ella. **Decisión tuya: qué sobrevive de esas cinco pantallas ahora que los
electrones se quedan solo como logros.**

**M-5 · Borrar las tablas de la moneda interna y reescribir el tier de los
perfiles.** El propio documento recomienda **no hacerlo**: hay evidencia de
compras reales, y el traductor de tier ya resuelve la lectura. Técnicamente
innecesario.

**M-6 · La premisa "nuestro modelo es otro, base y pro más moneda interna"** que
sostiene una sección del análisis de adopción de la competencia. La conclusión de
esa sección (no copiar la densidad de venta cruzada) sobrevive y de hecho se
refuerza.

**M-7 · Features premium como transacción de moneda, límites duros y paywall por
plan.** Todo eso murió con el pivote. Limitar el uso de quien paga era churn.

**M-8 · La prima de la llamada por voz y el incentivo de evadirla.** Era la
segunda mitad de una nota de seguridad y era economía de la moneda interna. La
primera mitad sigue viva y es L-16.

---

# CONTRADICCIONES ENTRE DOCUMENTOS

Cuando dos documentos se contradicen significa que nadie sabe cuál es la verdad.
Estas son las que encontré.

1. **La cola declarada está seis días atrasada y da por pendiente lo que ya se
   cerró.** Dice que la entrega de widgets y el motor de temas están "entregados y
   sin mergear" y que un módulo nativo nunca se ha compilado. **Verificado que no
   es así:** están en la rama principal, hubo un bump de versión para ese build, y
   el binario actual ya los lleva. Si sigues leyendo ese archivo como fuente,
   vas a trabajar de más.
2. **El runbook lista dos migraciones pendientes y hay cuatro.** Se escribió antes
   del pivote, así que no conoce las dos de membresía única y techo por gasto.
   Corregido en L-13.
3. **Dos documentos del mismo 16 de agosto van en direcciones opuestas** sobre la
   moneda interna: uno pide hacerla más visible y el otro documenta que la venta
   ya se apagó. Resuelto en M-3 y M-4.
4. **Un documento de estado se contradice solo** sobre si la integración de salud
   nativa era del build de lanzamiento o de la fase posterior, y lo dice: "las dos
   cosas no pueden ser ciertas". Se resolvió subiéndola al build, y el binario ya
   la lleva.
5. **El age gate figuraba como bloqueante de cumplimiento sin cerrar.** Su
   especificación dice "V1.3 bloqueante, sin age gate documentado pueden
   rechazar". **Verificado que está cerrado:** migración aplicada, utilidades con
   tests, modal cableado en el onboarding, edad mínima 18 dura, y una migración
   posterior retiró el consentimiento parental porque el tier de 13 a 17 se
   eliminó. **No es pendiente. Táchalo.**

---

# LO QUE NADIE TENÍA ANOTADO

Esto es lo que pediste específicamente: lo que ningún documento tenía.

1. **Las 10 plantillas de ruta dinámicas en la tabla del navegador de ARGOS**
   (L-15). La auditoría sospechaba del síntoma y decía "hay que verificarlo en
   device". Verifiqué el mecanismo en código: las plantillas están en la tabla,
   no hay filtro de corchetes en ninguna de las tres capas, y la pantalla de
   error existe. Lo que falta es confirmar que el ranking las alcanza.
2. **El texto donde la app le confiesa al usuario que está a medio hacer sigue
   vivo** (L-6). Estaba señalado como acción y no se ejecutó.
3. **El contenedor de navegación sigue en oscuro canónico** (L-7). Era la acción
   número 2 por relación daño contra esfuerzo y quedó abierta mientras se
   cerraban cosas de más esfuerzo.
4. **El proxy no verifica el `userId` contra el JWT** (L-16). El código lo
   reconoce, pero está clasificado como "no bloquea el launch". A 15 días de
   abrir registro, ese juicio ya no aplica.
5. **De las 33 rutas de evaluaciones que emite el generador, solo 6 evaluaciones
   están marcadas como vivas.** El hub manda a la pantalla legacy y por eso el
   usuario no lo nota, pero cualquier enlace profundo directo cae en el error.
6. **No existe un solo empujón a Ajustes en toda la app** (D-18). Estaba en el
   análisis de adopción como evidencia, pero no como pendiente con dueño.

---

# LO QUE NO PUDE VERIFICAR

Lo digo en vez de rellenar.

- **Si las cuatro migraciones están aplicadas en el remoto.** No corrí nada
  contra la base. Lo único comprobable desde el repo es la declaración de cada
  archivo y los caminos alternos del cliente, y uno de ellos dice que al momento
  de escribirse la columna no existía.
- **`npm test` y `npx tsc --noEmit` en tu máquina.** No los corrí (no toco
  `node_modules`). Los agentes anteriores tampoco pudieron.
- **Cuánto del tema claro quedó realmente cerrado** con la bandera de auth
  encendida y los commits de marca. Se juzga en pantalla, no en código.
- **Cuáles tres de las siete acciones destructivas** recibieron entrada visible.
- **Si el ranking del navegador llega a ofrecer las plantillas dinámicas.**
- **El contenido de los dos archivos de cálculo** de la revisión clínica: solo
  confirmé que existen y su tamaño.
- **Nada de esta lista se ha visto en un teléfono**, que es la advertencia con la
  que abre y cierra este documento.

---

# AGREGADO A LA COLA · 17-ago-2026

## N-Back: la calificación deja fuera con un solo error

Reporte del dueño jugando el dual N-Back: **es dificilísimo subir de nivel, un
solo error te deja parado.** Su sospecha, que es una buena hipótesis y hay que
verificarla antes de tocar nada: que el porcentaje se está contando por separado
para el canal auditivo y el visual, cada uno contra el total de reactivos, en
vez de sobre los reactivos que le corresponden a cada canal. Con pocos reactivos
totales, eso hace que un fallo pese muchísimo más de lo que debería.

Dos causas posibles y no son excluyentes:
1. **La fórmula está mal**: el denominador de cada canal no es el que debe ser.
2. **Son muy pocos reactivos**: aunque la fórmula esté bien, con una serie corta
   un error mueve el porcentaje demasiado y el umbral de avance queda inalcanzable.

Dónde mirar: `src/services/mente/nback-core.ts` y `src/services/__tests__/nback-core.test.ts`
(hubo dos núcleos de N-Back y se unificaron, así que verificar que el vivo sea el
que califica). El umbral de avance y el conteo por canal se revisan juntos.

**No es urgente.** Va a la cola, no bloquea el lanzamiento. Pero ojo con una
cosa: es una de las pocas piezas de la app con las que el usuario mide su propio
progreso cognitivo, así que un umbral mal calibrado se siente como que la app
está rota o como que él no mejora. Ninguna de las dos es cierta.

Tamaño: chico si es la fórmula, mediano si hay que recalibrar la longitud de la
serie, porque eso cambia la duración de la sesión y el diseño del ejercicio.
Es OTA.
