# La comunidad dentro de la app
## Lo que ya está construido, lo que está vacío, y el puente que falta

**Fecha:** 11 de agosto de 2026
**Encargo:** que la app tenga acceso directo a la comunidad, que haya avisos de la comunidad dentro de la app, y al revés.

---

# 0 · La buena noticia, y no me la esperaba

**La capa social dentro de la app ya está construida.** Fui a ver la base de datos de producción antes de proponer nada:

| Tabla | Filas | Lectura |
|---|---|---|
| `user_notifications` | **230** | ✅ El sistema de avisos funciona y ya se usa |
| `user_notification_tokens` | 2 | ⚠️ Solo dos dispositivos registrados para push |
| `social_notifications` | 5 | ✅ Existe y ya disparó |
| `friendships` | 3 | ✅ Existe y ya se usó |
| `community_presence` | 4 | ✅ Existe |
| **`activity_feed`** | **0** | 🔴 Construida y **vacía** |
| **`challenges`** | **0** | 🔴 Construida y **vacía** |
| **`challenge_participants`** | **0** | 🔴 Construida y **vacía** |

Y hay una edge function, `dispatch-social-notifications`, en la versión 10, o sea que ya se ha iterado.

> **Esto no es un proyecto de construir. Es un proyecto de conectar y de llenar.**

El hueco más caro de esa tabla es `challenges` en cero. **Los retos son el mecanismo del día 10 del Customer Journey**, el momento en que se acabó la novedad y todavía no hay resultado. Es la pieza que sostiene la etapa donde se pierde a la gente, y está construida sin usarse.

---

# 1 · El puente que falta, en las dos direcciones

## De la comunidad hacia la app

Lo que pasa en la comunidad tiene que llegar al teléfono sin que la persona abra otra aplicación.

| Evento en la comunidad | Qué aparece en la app |
|---|---|
| Se abre el reto del mes | Tarjeta en HOY, con botón de entrar. Escribe en `challenges` y `challenge_participants` |
| Se agenda el Zoom mensual | Aviso a los dos días y a la hora, por tier. Prioridad de pregunta visible para Pro |
| Contestaron la pregunta que votó | Aviso directo, con la marca de tiempo del video |
| Alguien de su círculo por perfil publicó algo relevante | Entra a `activity_feed`, sin push, para que no sature |
| Anuncio de los fundadores | Push solo a Founders |

**La regla de saturación:** solo el reto, el Zoom y la respuesta a su pregunta llevan push. Todo lo demás vive en el feed dentro de la app y espera a que la persona entre. Un usuario que recibe tres notificaciones sociales al día apaga las notificaciones, y ahí perdiste también el recordatorio de sus hábitos.

## De la app hacia la comunidad

Esto es lo que casi nadie hace, y es lo que hace que la comunidad no se sienta pegada con cinta.

| Lo que hace en la app | Qué aparece en la comunidad |
|---|---|
| Llega a 7 días de racha | Entrada automática en su círculo por perfil. Sin números privados, solo el hecho |
| Baja su Edad ATP en el re-cálculo | Tarjeta que puede compartir. **Siempre opcional**, nunca automática |
| Completa un reto | Su nombre en la tabla del reto y el premio en H+ |
| Termina su primera semana | Se le presenta a su círculo, con su dolor, no con su nombre |

🔴 **Y la línea que no se cruza:** nada de salud sale de la app hacia la comunidad sin que la persona lo apriete. Ni un valor de laboratorio, ni un peso, ni un síntoma. **Solo hechos de constancia**, que son los que la tribu celebra bien. Un dato clínico en un muro es un problema de privacidad y también es la manera más rápida de que alguien deje de registrar con honestidad.

---

# 2 · Los círculos por perfil son la pieza que amarra todo

Ya está decidido en la estructura de valor y aquí es donde se vuelve técnico: **la comunidad no es un solo cuarto, son diez.**

Cuando alguien contesta las tres preguntas de entrada y le toca su pack, **queda automáticamente en el círculo de ese perfil.** El que trae "no puedo apagar la cabeza" entra con los demás que traen eso mismo.

Eso resuelve el problema más aburrido de las comunidades: que el primer día entras a un muro de gente que no se parece a ti hablando de cosas que no te tocan. Aquí entras a un cuarto donde la primera frase que lees es tu propia frase.

Y del lado de los datos ya se puede hacer solo: el pack está en el perfil, el círculo se deriva del pack, y `activity_feed` ya existe para alimentarlo.

---

# 3 · Lo que hay que decidir, y no lo puedo decidir yo

**Uno. ¿La comunidad vive en Skool o dentro de la app?** El brief de comunidad dice Skool. Las tablas dicen que hay una comunidad nativa a medio construir. Las dos pueden convivir, con Skool como el lugar de las sesiones y los hilos largos, y la app como el lugar de los retos, la racha y el aviso. Pero eso hay que decidirlo antes de escribir código, porque el puente se construye distinto en cada caso.

**Dos. ¿Quién llena `challenges`?** Un reto al mes necesita un dueño, una fecha y un premio en H+. Si nadie lo agenda, la tabla se queda en cero y el día 10 del journey sigue vacío.

**Tres. `COMUNIDAD_FIRMADA` sigue en false.** Los cuatro beneficios que dependen de la nutrióloga siguen ocultos en la página de Founders y siguen sin autorizarse. **Se van a vender 92 fundadores este trimestre.** La comunidad tiene que existir antes o al mismo tiempo que la primera venta, no después.

---

# 4 · Y una cosa chiquita que va a doler si no se ve ahora

**`user_notification_tokens` tiene dos filas.** O sea que hoy solo dos dispositivos pueden recibir push.

Todo lo de arriba, todo el puente, toda la conversación de retención y de comunidad, **pasa por que el permiso de notificaciones se pida bien y se acepte.** Si la app pide el permiso en la pantalla uno, antes de haber dado nada, la mitad de la gente dice que no y ya no hay puente que valga.

**El permiso de notificaciones se pide después de la Edad ATP**, cuando la persona ya vio su número y quiere saber qué sigue. Ese es el único momento del recorrido donde decir que sí es obvio.
