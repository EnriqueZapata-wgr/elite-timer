# Plan del pivote limpio · 7 de septiembre de 2026

**Para:** Enrique
**Estado:** propuesta, versión 2. Nada de código hasta que apruebes o destroces.
**Método:** cinco agentes leyeron el código y la base en paralelo. Un sexto revisó este plan en frío contra el repo y tumbó seis afirmaciones de la versión 1, incluida una que habría creado un bug peor que el original. Lo que sigue ya está corregido, y la sección 2 dice qué se cayó.

---

## 1. El hallazgo que cambia el plan

**El motor de casos de uso ya existe y ya está en `main`.** La rama `feat/casos-de-uso` se fusionó hace semanas y trajo:

- `src/constants/packs.ts` con 8 casos: bajar revoluciones, dormir mejor, energía estable, foco y claridad, longevidad, cuidar glucosa, entender síntomas, salud en orden.
- `src/services/pack-prescribe-core.ts` y `pack-service.ts`: instala apps, enciende hábitos con su hora, fija metas, le dice a ARGOS en qué fijarse.
- Las pantallas `/packs/armar` (la entrada de tres preguntas) y `/packs/[packKey]`.
- El flag `CASOS_DE_USO_PRESCRIBEN` encendido.

Lo que **no** existe es el lenguaje. La app nunca dice el nombre del caso que la persona eligió, ni cuál es la señal que se va a mover, ni cuándo se nota. `QueHacerHoy`, la tarjeta que te generó confusión, lee `user_interventions` y el catálogo de 88, o sea el modelo viejo, y no menciona `user_packs` ni una sola vez. El pack sí escribe ahí abajo, así que la tarjeta **muestra el efecto del pack pero nunca su nombre**.

Faltan además las dos filas de la anatomía que tú marcaste como las que dan sentido: **Mide** (qué señal se mueve y en cuánto se nota) y **NO instala** (lo que se deja fuera a propósito). En `CASOS_DE_USO_DESTINOS_2026-08-20.md` escribiste la regla dura: *"un caso de uso solo existe si la persona puede VER moverse algo por seguirlo"*. Esa regla no está en el código.

**Con una advertencia honesta:** `user_packs` tiene 2 filas de 1 usuario en producción. El motor existe, pero nunca se ha probado con gente. Hay que tratarlo como código que funciona en teoría, no como pieza rodada.

---

## 2. Lo que la revisión en frío tumbó

Lo pongo primero porque es lo que te ahorra tiempo perdido.

1. **"Mover todos los consentimientos" era un error legal.** CB-2, el de datos sensibles de salud, sí se puede mover al momento en que el dato se toca, y así lo pide la ley. Pero **CB-3, transferencia internacional, se queda en la puerta**, porque Supabase, Sentry y PostHog son de Estados Unidos y tratan datos desde que se crea la cuenta: diferirlo es transferir antes de consentir. Y **CB-4, mayoría de edad, se queda**, porque es la condición de validez de todos los demás y sin él un menor entrega edad, sexo, talla y peso antes de que preguntes.
2. **Hay un hoyo legal abierto hoy, y es más grave que la movida que yo proponía.** En producción, `user_consent_log` tiene 3 filas en total. Cero de CB-1 a CB-5, para los 13 perfiles. Solo 1 de 13 tiene consentimiento médico registrado. El muro sí escribe, o sea que esos perfiles son anteriores a la migración que lo puso y nunca dejaron rastro. Peor: el guardia que deja entrar a la app lee `onboarding_step`, no los consentimientos. Hoy tratas datos sensibles sin bitácora que lo respalde. Eso se arregla antes que nada.
3. **Diferir el permiso de notificaciones habría roto justo el día 2 que quiero arreglar.** `aplicarPack` ya enciende los avisos, pero si no hay permiso el paso queda marcado como fallido y **nadie lo reintenta nunca**. Pedir el permiso después del armado deja los avisos apagados igual que hoy, con el arreglo encima.
4. **Los avisos del pack no son "un cable": 4 de los 8 packs tienen la lista de avisos vacía.** Energía estable, cuidar glucosa, entender síntomas y salud en orden no tienen nada que encender. Hay que escribirlos.
5. **La poda del launcher estaba inflada.** De los cuatro que llamé cascarones, solo uno lo es de verdad. Historia clínica, cuestionario maestro y mis evaluaciones son pantallas reales, y genética son 260 líneas. La poda sigue teniendo sentido por duplicación, no por vacío, y es más chica de lo que dije.
6. **La promesa de Edad ATP no se arregla bajando un umbral.** El cálculo pondera cuatro bloques y exige porcentaje de grasa para que la composición cuente. Con sexo, edad, talla, peso y cronotipo se queda muy por debajo del mínimo. La pantalla que te devuelve tu punto de partida **necesita un estimador nuevo**, chico pero nuevo. No es cableado.
7. **Quitar Skool no cuesta cuatro botones.** Son nueve archivos, y uno de ellos es lógica con prueba: el puente que aparece cuando alguien lleva unas tres semanas con el ánimo bajo. Ese botón es hoy la única salida humana que la app le ofrece a esa persona. **No se retira sin poner otra cosa en su lugar.**

Y una del revisor que no aplica: dice que falta el recordatorio de renovación a los 5 días que exige la ley del consumidor. Ya existe, se construyó esta semana y se desplegó hoy.

---

## 3. Por qué la app se siente igual, con evidencia

**a) La conversación no cambió.** Seguimos hablando de intervenciones, protocolos, mapas funcionales y marcadores. La persona no elige nada, la app le receta.

**b) La primera sesión no entrega nada.** Diez pantallas contando el registro, con cuatro bloques de consentimiento, doce datos personales y treinta segundos de cinemática de ARGOS. El único momento en que la app devuelve algo es el resultado de cronotipo, en la pantalla 8. Al llegar a Hoy, el premio por terminar es otra tarea: "sube tu primer estudio", que casi nadie trae a la mano. Y la promesa de la pantalla de perfil, *"estos datos alimentan tu Edad ATP desde el día 1"*, se rompe en la cara de la persona.

**c) Nada la trae de vuelta el día 2.** Los avisos por app nacen apagados. Los eventos de agenda se crean sin notificación. La única notificación programada del primer mes llega el día 7 y es un anuncio del paywall.

Ese es el motivo de fondo: nadie llega a querer pagar.

---

## 4. El pivote en una frase

> **ATP deja de recetar y empieza a preguntar. La persona elige a qué le va a mover la aguja, la app se arma sola enfrente de ella, y le dice qué señal va a ver moverse y cuándo.**

No se toca: el launcher y su orden personalizable, ARGOS como orbe central, la marca, Elite como servicio contratado, el árbitro de niveles y los candados de esta semana.

---

## 5. El orden, corregido

El revisor tenía razón en que mi orden no maximizaba la venta. Este es el bueno.

**Paso 0, medio día: cerrar el hoyo legal.** Que CB-1 a CB-4 queden registrados de verdad, y que el guardia lea consentimientos en lugar de `onboarding_step`. Sin esto, cualquier otra ola te deja peor de lo que estás.

**Ola 1: la primera sesión, con el idioma adentro.** Nombrar el caso no es una ola aparte, es el copy de estas pantallas.

**Ola 2: Comunidad honesta.** Dos cables cortos, y la app se ve viva.

**Ola 3: la poda.** Al final, cuando sepamos qué nadie toca por datos y no por conteo.

---

## 6. La primera sesión nueva

Seis pantallas.

1. **Correo y contraseña**, con términos, aviso de privacidad, transferencia internacional y mayoría de edad. Es el mínimo que la ley exige antes de crear la cuenta, y queda registrado.
2. **Tres preguntas.** Ya existen en `/packs/armar`.
3. **Tu caso.** La app propone uno de los 8, con su nombre, la señal que se va a mover y en cuánto se nota. Se puede cambiar.
4. **La app se arma enfrente.** Visible: las apps que se instalan en tu sala, los hábitos que se encienden con su hora, las metas, y lo que **no** se instala y por qué. Este es el momento de enganche, y es el que ninguna competencia hace.
5. **Tu punto de partida.** Edad ATP estimada con lo que ya dio, etiquetada como estimación informativa, con qué la mueve y qué dato la haría más precisa. Requiere el estimador nuevo.
6. **Tu día 1.** Tres cosas concretas, ya encendidas, con la señal arriba.

El permiso de notificaciones se pide **dentro** del paso 4, cuando la app está encendiendo los hábitos y la razón se ve sola. Y se agrega lo que hoy no existe: si el permiso llega después, los avisos del pack se reintentan en lugar de quedarse muertos.

El consentimiento de datos sensibles (CB-2) y el médico se piden en la primera pantalla que toca ese dato, con casilla no marcada y bloqueo real si dice que no.

---

## 7. Las podas

**Launcher.** Por duplicación, no por vacío: mis evaluaciones cae en la misma pantalla que historia clínica, rachas es una pestaña de reportes, lista de compra es una pestaña de recetas, récords es la misma casa que 1RM. Cronotipo sí es un redirect. Y lo más caro de todo, que es gratis de arreglar: la fila "PARA EMPEZAR" que ve una cuenta nueva trae Protocolos, que está bloqueada para Free. **La primera fila de la app estrena un candado.**

**Salud.** Diecisiete conceptos distintos, tres de ellos sinónimos tratados como cosas distintas: mapa funcional y lectura, raíz y cruce, síntoma y padecimiento. Nueve de trece pantallas están a tres toques o más. La movida de mayor rendimiento es fusionar mapa funcional y mi lectura en una sola pantalla, "Tu lectura", debajo del número de Edad ATP.

**Elite y Genética.** Cero evaluaciones en producción, así que hoy son dos candados que nadie puede abrir. Se encienden por existencia de evaluación, no por nivel.

**Comunidad.** Sale Skool, pero **antes** hay que poner otra salida para el ánimo bajo sostenido. Lo que se ve pobre es el ranking: de ocho perfiles públicos solo uno tiene nombre y los ocho tienen racha en cero, cuando la racha real ya se calcula en otro servicio y nunca se copia. Dos cables cortos. El límite legal ya está resuelto y probado: se puede rankear electrones, rango, racha y amigos, y **no** Edad ATP ni nada derivado de laboratorio, porque publicarla equivale a publicar el estudio.

---

## 8. Lo que necesito que decidas

1. **La palabra.** El copy dice "objetivo", el código dice "pack", los documentos dicen "caso de uso". Tiene que ser una y es tuya.
2. **Cuántos casos abrimos.** Los 8 que existen, o los 20 del documento de destinos.
3. **Mi Protocolo.** Desaparece como pantalla, o se queda como detalle avanzado.

---

## 9. Lo que este plan no resuelve

No trae tráfico. Con 13 perfiles de prueba, esto sube la probabilidad de que quien llegue se quede y pague, pero no hace que llegue nadie. Esa es la otra mitad, y vive en la sesión del embudo.
