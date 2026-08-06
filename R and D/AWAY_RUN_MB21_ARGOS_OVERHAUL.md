# 🐺 AWAY RUN MB-21 · El overhaul de ARGOS

**Rama:** `feat/mb21-argos` desde `main` · worktree propio.
**Va DESPUÉS de MB-20.** Trae migración (pieza 2). El resto es JS/TS.

Levantado sobre un inventario real de la superficie ARGOS, no sobre impresiones.
Cada número de aquí está verificado en el código.

---

# El diagnóstico en tres frases

**ARGOS se dibuja de tres formas distintas en once lugares.** No hay una criatura, hay tres.

**Nunca empiezas de cero.** Siempre retomas la última conversación, tenga la edad que tenga, y
el botón de "nueva conversación" no sobrevive a cambiar de tab.

**El chat son 800 líneas en un archivo, sin un solo test**, fuera del design system, con la
lista de mensajes sin virtualizar y el historial completo viajando al modelo en cada turno.

---

# PIEZA 1 · Una sola presencia

⚠️ **Si MB-20 ya unificó la presencia, esta pieza se salta.** Verificar antes de empezar.

Hoy conviven **tres dibujos**:

| Dibujo | Qué es | Dónde |
|---|---|---|
| `ArgosOrb` | esfera con degradado lima a teal, 5 estados, respira | tab bar, meet, modo voz, selector de voz |
| `ArgosAvatar` | **una figura geométrica distinta por estado**: anillos, barras azules, estrella, tache rojo | header del chat, estado vacío del chat, botón flotante |
| `<Ionicons name="eye">` | un ojo, copiado a mano | burbujas del chat, HOY, notificaciones, nutrición |

No comparten lenguaje visual ni paleta: el avatar mete azul y rojo, la orbe solo lima y teal.
**El usuario ve tres seres y le decimos que es uno.**

## Qué se hace

**La orbe es ARGOS en todas partes.** `ArgosAvatar` se retira. Sus tres consumidores pasan a
`ArgosOrb` con el estado equivalente:

| Antes | Ahora |
|---|---|
| `unavailable` (tache rojo) | ⚠️ **no se resuelve con la orbe**: ver abajo |
| `speaking` | `hablando` |
| `thinking` | `pensando` |
| `idle` | `idle` |
| `offline` (bullseye gris) | orbe apagada, sin animación |

⚠️ **El estado rojo del avatar viola la regla dura de la orbe** (nunca se pone roja de alarma).
Cuando ARGOS no está disponible **se dice con palabras**, con la orbe apagada y un texto claro
arriba del input. Esa era la doctrina desde el principio y el avatar la rompía.

**El ojo también se retira.** En las burbujas y en las cards de insight va una orbe chiquita
(16 a 20 px), estática, sin animación: a ese tamaño la respiración no se ve y solo gasta
batería. Un solo componente `<ArgosMark size={20} />` que dibuja la orbe en reposo.

**Y la paleta deja de estar duplicada:** `argos-orb-core.ts` copia los hex de `brand.ts` en vez
de importarlos. Que los importe.

---

# PIEZA 2 · Sesiones: abrir la app es empezar de nuevo

**Decisión de Enrique.** Hoy `autoLoadRecent` (`argos-chat.tsx:184-193`) carga la última
conversación **sin importar de cuándo sea**. Abres la app un martes y sigues una charla de hace
tres semanas.

Y hay un bug encima: **el botón "nueva conversación" del header no sobrevive a salir de la
pantalla.** Limpia los mensajes, pero al volver a enfocar, `autoLoadRecent` ve la lista vacía y
recarga la última. Como ARGOS es un tab, basta cambiar de tab y volver.

## La regla nueva

**Una sesión de app es una conversación.** Al abrir la app en frío, ARGOS arranca en blanco.
Dentro de la misma sesión, salir y volver al tab retoma lo que estabas diciendo.

Implementación:
- Un identificador de sesión en memoria que nace con el proceso de la app.
- `autoLoadRecent` solo retoma si la conversación pertenece a la sesión actual.
- El botón "nueva" cierra la conversación **de verdad**: marca que esta sesión ya no retoma
  nada, para que volver al tab no la resucite.
- La conversación anterior **no se borra**: sigue en el historial. Empezar de cero no es perder.

⚠️ **Cerrar la app no es lo mismo que mandarla al fondo.** Si el usuario contesta una llamada y
vuelve a los treinta segundos, eso es la misma sesión. Usar el estado de la app y un umbral
razonable, no el simple hecho de perder el foco. **Que sea un valor con nombre y con test**, no
un número suelto en medio de una función.

## La migración

`argos_conversations` guarda **todos los mensajes en una columna JSONB**, y cada turno reescribe
la fila entera (`argos-service.ts:1682-1689`). Con conversaciones que nunca se cortan, eso
crece sin techo.

Con sesiones, las conversaciones se acotan solas y el problema se alivia. **La migración de este
run es mínima**: una columna para marcar el cierre de la conversación (o el ancla de sesión) y
su índice. Idempotente, con RLS.

**No** se parte `messages` en una tabla de mensajes en este run. Es tentador y es otro proyecto.
Dejarlo escrito como deuda.

---

# PIEZA 3 · El panel de conversaciones

`app/argos/conversations.tsx` ya existe (175 líneas) y funciona: lista, previsualización,
borrar. Le falta lo que lo vuelve usable cuando hay cincuenta.

- **Agrupar por fecha**: Hoy, Ayer, Esta semana, Más atrás.
- **Buscar** por contenido, no solo por título.
- **Renombrar.** El título hoy son los primeros 50 caracteres del primer mensaje, así que la
  mitad se llaman "hola". Que se pueda editar, y que ARGOS proponga un título cuando la
  conversación tenga sustancia.
- **Marcar cuál es la conversación abierta ahora.**
- **Paginación.** Hoy hay un tope duro de 50 y no hay forma de ver más.
- **Navegar con `push`, no con `replace`** (líneas 59 y 99). Con `replace` el panel desaparece
  del historial y el regreso se siente roto.

Y que sea alcanzable como se espera: **desde el header del chat, y también deslizando** si eso
encaja con el resto de la app. Hoy solo hay un icono en el header.

---

# PIEZA 4 · La pantalla de chat

`app/argos-chat.tsx` son **800 líneas en un archivo**, con los estilos escritos a mano en el
JSX. **No importa `brand.ts` ni `constants/theme`**: usa hexadecimales crudos, incluido un
`#a8e02a` en minúsculas que es el lima de marca duplicado.

## 4.1 · Se parte

Como mínimo: la burbuja de mensaje, el estado vacío, el header, el input. Y la lógica de envío
a un hook o a un core puro que se pueda testear.

## 4.2 · La lista se virtualiza

Hoy es un `ScrollView` plano (línea 524). Con conversaciones acotadas por sesión el dolor baja,
pero el historial largo sigue siendo `ScrollView`. **`FlatList` con `inverted`**, que además
resuelve el auto-scroll sin el truco de `onContentSizeChange`.

## 4.3 · Entra al design system

Todos los colores desde `brand.ts`, tipografía desde `constants/theme`. Y el teclado con el
manejo estándar de la app, no con un listener propio de `Keyboard` y padding a mano (línea 696).

## 4.4 · Lo que Enrique quiere que se sienta mejor

- **El estado vacío** con seis sugerencias hardcodeadas (líneas 89-96) debería proponer algo
  **de hoy**: lo que registraste, lo que falta, lo que ARGOS notó. Reutilizar la lógica que ya
  arma la card de la orbe en TAREAS.
- **Long-press abre un `Alert` nativo** con Copiar y Editar. Un menú propio, en el lenguaje de
  la app.
- **El dictado envía directo** sin dejar revisar (`handleVoiceTranscript`, línea 412). Que
  deposite el texto en el input y el usuario decida.
- **No hay adjuntos.** Ni foto, ni PDF de labs. **El proxy ya soporta documentos**
  (`argos-proxy/index.ts:625`) y el chat nunca los manda. ⚠️ Con una salvedad: el fallback a
  Gemini se deshabilita cuando hay PDF. Si se abren adjuntos, hay que decidir qué pasa cuando
  Anthropic esté caído y el usuario mandó un PDF, y decírselo con palabras.

---

# PIEZA 5 · De dónde vienes sí importa

Hay **ocho caminos** que abren el chat y **siete llegan sin contexto de pantalla**. El
mecanismo `?from=` existe, está testeado, y **solo lo usa Nutrición**.

Que todas las entradas manden su origen. ARGOS abriéndose desde Glucosa debería saber que
vienes de Glucosa.

## 5.1 · El bug que deja a ARGOS inalcanzable

`src/hooks/argos-screen-context-core.ts:39`:

```ts
if (p.includes('argos')) return 'argos';
```

`/argos-recipes` **es una pantalla de recetas**, no el chat, pero contiene la subcadena. Se
clasifica como si el usuario ya estuviera dentro de ARGOS, así que **el botón flotante se
esconde y ahí no hay ninguna forma de abrir ARGOS.**

Arreglo: que el corte sea por ruta exacta, no por subcadena. Y `recipe` debe caer en el bucket
de nutrición, que hoy solo busca `nutrition|food|fasting|hydration`. **Agregar el caso a
`argos-screen-context-core.test.ts`**, que hoy prueba `/argos-chat` y `/argos/conversations`
pero no `/argos-recipes`: por eso pasó sin ruido.

## 5.2 · Dos rutas, un componente

`(tabs)/argos` y `/argos-chat` renderizan lo mismo, así que se pueden acumular dos instancias
del chat en la pila. Hoy se parchea con un `canGoBack()` para decidir si pintar la flecha
(líneas 101-105). **Que exista una sola forma de llegar al chat** y que las demás la usen.

---

# PIEZA 6 · La ventana de contexto

`argos-chat.tsx:297` manda **el historial completo** al modelo en cada turno, sin truncar ni
resumir. Una conversación larga viaja entera, cada vez, y se paga cada vez.

Con sesiones esto se acota solo, que es la mitad del arreglo. La otra mitad: **un techo
explícito**. Los últimos N turnos completos, y si hay más, un resumen de lo anterior.

Que el techo sea una constante con nombre y con test. **Y que si se recorta, el usuario no
sienta que ARGOS "se le olvidó" de golpe:** si el resumen entra, ARGOS puede decirlo.

---

# PIEZA 7 · Los tests que no existen

**`app/argos-chat.tsx`: 800 líneas, cero tests.** Nada cubre el envío, el guard de reentrada, la
caída de streaming a no-streaming, el filtrado de mensajes degradados.

**`autoLoadRecent` no tiene test**, y es la decisión central de qué conversación abres. Es
justo lo que esta pieza cambia: **no se toca sin cubrirlo primero.**

**`buildContextPrompt` y `prepareChatTurn` no tienen test**, y arman el prompt con **25 bloques
de datos del usuario**, incluido el gate de consentimiento de memoria persistente. ⚠️ Ese gate
es lo que impide mandarle datos de salud al modelo sin permiso: **debe tener test propio**, con
el caso de consentimiento apagado y el caso de que el servicio de consentimiento falle.

Mínimo de este run: sesiones, `autoLoadRecent`, el gate de consentimiento, y el corte de
`/argos-recipes`.

---

# 🟡 DOS COSAS QUE NO SON DE ESTE RUN PERO HAY QUE DECIDIR

**`clinician` tiene menos techo que `pro`.** 100 mensajes al día contra 150
(`argos-proxy/index.ts:307-314`). Un clínico usa ARGOS más que un usuario Pro, no menos.
Parece un número mal puesto. **Decisión de Enrique.**

**El modo voz nunca se ha validado en dispositivo.** Los comentarios del propio código lo
repiten en tres archivos ("gate Enrique"). Existe el pipeline completo, existe la orbe de 220
px, existe el cobro por turno de voz. **No existe la evidencia de que funcione end to end.**
Antes de venderlo, probarlo.

---

# 📦 ENTREGA

Un commit por pieza. `tsc`, Vitest y `npm run censo` en verde en cada uno.
Cero em dash en copy de usuario. Migración idempotente con RLS.

**Verificación en dispositivo:**
1. ARGOS se ve **igual en todas partes**: tab bar, chat, burbujas, cards de insight, modo voz.
2. Cuando ARGOS no está disponible, **no hay nada rojo**: se dice con palabras.
3. Cerrar la app del todo y volver a abrir → **conversación nueva.**
4. Salir del tab y volver dentro de la misma sesión → **retoma lo que estabas diciendo.**
5. Tocar "nueva conversación", cambiar de tab y volver → **sigue nueva.** Este es el bug de hoy.
6. La conversación anterior **sigue en el historial** después de todo lo anterior.
7. El panel agrupa por fecha, busca, y permite renombrar.
8. Desde `/argos-recipes` **se puede abrir ARGOS.**
9. Una conversación de cien mensajes hace scroll fluido.
