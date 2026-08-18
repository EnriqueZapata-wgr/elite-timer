# La pasarela central de alta y el cuidado del cliente

Diseño del recorrido completo entre que alguien decide pagar y que está adentro, usando la
aplicación y la comunidad, atendido por alguien que sabe quién es.

**Este documento no elige herramientas.** Cuando nombra una es como ejemplo de categoría,
porque la elección depende de presupuesto y de qué conectores se puedan activar, y esa
conversación es del dueño con quien construya. Lo que sí decide es la **forma**: qué pasos
existen, qué dato viaja, quién responde por cada uno y en cuánto tiempo se sabe que falló.

El criterio de calidad es uno solo y viene del encargo: **ningún paso puede depender de que
alguien se acuerde de hacerlo a mano.** Un paso manual documentado y visible no es un hueco.
Un paso manual que vive en la memoria de una persona sí lo es.

---

# Parte 0. Lo que ya existe, para no reinventarlo

Antes de proponer nada hay que saber que **la mitad de esto ya está construida**. Lo que
falta no es el motor de cobro, es el tramo que va del cobro a la persona atendida.

| Pieza | Dónde vive | Estado |
|---|---|---|
| Cobro web con firma verificada | `supabase/functions/payment-webhook/index.ts` | Funciona. Stripe con HMAC real y tolerancia de 5 minutos. Conekta solo con token compartido |
| Idempotencia de cobros | `payment_webhook_events`, índice único `(provider, event_id)` | Funciona |
| Cobro por tienda | `supabase/functions/revenuecat-webhook/index.ts` | Funciona, autenticado por token compartido |
| Código de activación | `activation_codes` + RPC `redeem_activation_code` | Funciona. Un uso, formato `ATP-XXXX-XXXX`, sin caracteres ambiguos |
| Contabilidad de vigencias | `tier_grants`, `tier_history`, `resolve_effective_tier`, `apply_effective_tier` | Funciona. Precedencia tienda sobre web sobre gratis |
| Expiración diaria | Cron `tier-expiry-daily`, 09:00 UTC | Funciona |
| Correo transaccional | Un proveedor de correo, dentro del webhook de pago | **Solo manda el código.** Si falta la llave, queda marcado como pendiente manual |
| Alta manual | Diseñada en `R and D/ARGOS_COSTOS_2026-08/ALTA_MANUAL_ATP.md` | Diseñada, no construida |
| Comunidad | Una constante con la dirección, en `src/constants/brand.ts` | **Es un enlace.** No hay alta, ni baja, ni verificación de nada |
| CRM | No existe | No existe |
| Afiliados | `affiliates`, `affiliate_codes`, `affiliate_wallets`, `affiliate_earnings` | Tablas creadas y vacías. Nadie las escribe. No hay motor de comisiones ni captura del código en el registro |

**La lectura honesta:** el cobro está resuelto y la entrega no. Y el encargo es exactamente
sobre la entrega.

## La decisión previa de pagos, releída con el modelo nuevo

La decisión vive en `R and D/DECISION_PUENTE_DE_PAGO.md` y su construcción en
`R and D/AWAY_RUN_MB13_PUENTE_DE_PAGO.md`. Se escribió el 28 de julio, cuando había tres
planes y recargas consumibles. Esto sobrevive y esto no:

**Sobrevive intacto, y es lo mejor que se escribió:**

- El mecanismo del código de activación como puente entre el correo del cobro y el correo
  de la cuenta. La frase original sigue siendo cierta: *"Aquí es donde se rompen estos
  sistemas."*
- La regla de silencio: la aplicación nunca menciona la ruta web, solo reconoce la cuenta.
  Es obligación de tienda, no preferencia.
- La resolución de vigencia del lado del servidor, nunca del cliente.
- El argumento que forzó el modelo híbrido: la tienda no dice quién refirió a quién, así que
  un sistema de afiliados no se puede liquidar sobre compras hechas adentro de la aplicación.
  Ese argumento **no cambió con el pivote**, sigue en pie.

**Queda obsoleto:**

- Toda la aritmética de comisiones, calculada sobre planes de 399, 999 y 1,499.
- Los identificadores de derecho de la tienda, configurados como tres niveles con ruta de
  mejora entre ellos. Con un solo plan sobra el escalón, y hay que rehacer la configuración.
- La sección de recargas consumibles. Esa venta se apagó.
- La tabla de comisiones de afiliado, expresada en una moneda interna que ya no se vende.

**Y aparece una tensión nueva que la decisión original no tenía que resolver, porque
entonces la fecha estaba lejos.** Está en la Parte 6.

---

# Parte 1. La forma del recorrido

La idea central es que **no hay cuatro flujos, hay cuatro traductores y un flujo.**

Cada puerta de entrada habla su propio idioma. La web habla de sesiones de pago, la tienda
habla de eventos de suscripción, una transferencia habla de una clave de rastreo. Lo primero
que hace la pasarela es traducir todo a la misma frase:

> **Alguien, identificado por este correo, pagó esta cantidad, por esta vía, con este
> identificador externo, en esta fecha, y quizá venía referido por este código.**

A partir de ahí el recorrido es uno solo. Eso es lo que hace que no haya huecos: no hay
cuatro caminos con cuatro maneras distintas de fallar.

## El evento normalizado

Un solo formato, sin importar la puerta:

| Campo | Para qué |
|---|---|
| `origen` | web, tienda, alta manual, cortesía |
| `id_externo` | El identificador del proveedor. Con `origen`, forma la llave de idempotencia |
| `correo_de_cobro` | El correo con el que se pagó. **No es necesariamente el de la cuenta** |
| `tipo` | alta, renovación, cancelación, reembolso, rebote |
| `monto`, `moneda`, `fecha` | Contabilidad y avisos de renovación |
| `vigencia_hasta` | Hasta cuándo alcanza lo pagado |
| `codigo_afiliado` | Si venía referido. Nulo en compras de tienda, por diseño de la tienda |

La tabla que recibe esto ya existe (`payment_webhook_events`) y ya es idempotente. Lo que
hay que hacer es que las cuatro puertas escriban ahí, no solo dos.

## Los doce pasos

Cada paso dice qué pasa, qué dato viaja, quién responde y cuánto puede tardar. La columna
de alarma es la importante: **es el momento en que el sistema deja de esperar y avisa.**

| # | Paso | Qué dato viaja | Responsable | Objetivo | Alarma |
|---|---|---|---|---|---|
| 1 | Intención de compra | Correo, plan, código de afiliado si lo hay | La página, el panel de alta o la tienda | Inmediato | No aplica |
| 2 | Cobro confirmado | Confirmación del proveedor | El proveedor de cobro | Segundos a minutos | 24 h sin desenlace |
| 3 | Evento normalizado y guardado | El evento completo, crudo y traducido | El receptor de avisos del proveedor | 2 s | Falla de escritura, inmediata |
| 4 | Resolución de la persona | Correo de cobro contra el padrón | El motor de la pasarela | 1 s | Inmediata |
| 5 | Derecho de acceso otorgado | Identificador de membresía, vigencia | Contabilidad de vigencias, ya existente | 2 s | 5 min |
| 6 | Código de activación emitido | Código de un uso, atado al cobro | Base de datos | 2 s | 5 min |
| 7 | Correo con el acceso | Código, instrucciones, recibo | El proveedor de correo | 60 s | **15 min** |
| 8 | La persona canjea y queda vinculada | Código contra cuenta | La persona | Minutos a días | 48 h sin canje, recordatorio |
| 9 | Invitación a la comunidad | Nombre y correo, nada más | La cola de provisión | 5 min | **1 h** |
| 10 | Entrada a la comunidad confirmada | Confirmación de que aceptó | Reconciliador diario | 24 h | **72 h sin aceptar** |
| 11 | Alta en el registro de clientes | Identidad comercial y estado de la membresía | La cola de provisión | 5 min | 1 h |
| 12 | Arranque acompañado | Señal de primer uso | Momentos fijos, ver Parte 4 | Días 1, 7 y 30 | Día 7 sin primer día completo |

## Por qué la provisión tiene que ser una cola, y no una función

Del paso 5 al 11 hay cuatro destinos distintos: la aplicación, el correo, la comunidad y el
registro de clientes. **Fallan por separado, y ese es el punto entero del encargo.**

Si el cobro llama a una función que hace las cuatro cosas seguidas, la tercera que falle
deja las dos primeras a medias y nadie se entera. Es exactamente el hueco de "le llegó el
acceso a la aplicación pero no a la comunidad".

La forma correcta es que **el cobro no haga el alta: el cobro crea tareas.** Una tabla de
tareas de provisión, con una fila por destino:

```
membresia_id · destino · estado · intentos · ultimo_error · reintentar_a · confirmado_en
```

Un proceso periódico, cada pocos minutos, toma lo pendiente y lo intenta. Reintenta con
espera creciente. Lo que lleva más tiempo del que le toca sin confirmarse sube a una lista
de atención humana.

Esto tiene una consecuencia práctica valiosa: **el destino puede ser manual sin romper el
diseño.** Si el alta en la comunidad no se puede automatizar a tiempo, la tarea existe
igual, aparece pendiente en el tablero, y alguien la cierra a mano. Sigue sin haber hueco,
porque el sistema sabe que está pendiente. Lo que abre huecos no es el trabajo manual, es el
trabajo invisible.

---

# Parte 2. Las cuatro puertas

Las cuatro terminan en el mismo evento normalizado. Cambia el traductor y cambian las
reglas que no se pueden negociar.

## Puerta A. La web

La página cobra, el proveedor confirma, el receptor de avisos traduce. Es la puerta que ya
funciona y la única donde la comisión es baja, la atribución de afiliado sobrevive y el
control es propio.

Regla dura heredada y vigente: la aplicación **nunca** menciona esta ruta. No hay enlace, no
hay texto, no hay insinuación. Solo reconoce la cuenta que ya tiene derecho.

## Puerta B. El panel de alta

Para transferencias, cobros fuera de línea, cortesías y correcciones. Está diseñado en
`ALTA_MANUAL_ATP.md` y su regla fundacional es la correcta: *"No se construye un camino
nuevo. Se le pone una segunda entrada al que ya existe."*

La idempotencia aquí es por la clave de la transferencia. Sin eso, dos clics del operador
son dos membresías.

Esta puerta es también la herramienta de recuperación de todos los fallos de la Parte 3. Es
la que más se va a usar en las primeras semanas y la que menos se ve en los diagramas.

## Puerta C. La tienda

El usuario que descubre la aplicación en la tienda compra adentro. La tienda cobra comisión
y valida el recibo. La contabilidad llega por aviso del intermediario de suscripciones.

Tres diferencias que cambian el diseño y que no son negociables:

1. **La tienda no dice quién refirió a quién.** La atribución de afiliado se pierde. No hay
   arreglo, es así.
2. **El reembolso y la cancelación no los controlas.** El usuario los pide en la tienda. Tú
   te enteras después, por aviso. Cualquier promesa de "yo te lo cancelo" es falsa.
3. **El acceso empieza antes que tu aviso.** El componente de compra dentro de la aplicación
   ya le dio acceso localmente. Tu aviso es contabilidad, no autorización. Esto es bueno:
   esta puerta casi no puede producir el hueco de "pagué y no entré" del lado de la
   aplicación. Sí puede producirlo del lado de la comunidad, porque ahí el aviso es la única
   señal que tienes.

## Puerta D. El registro de clientes

Un alta originada por quien atiende: alguien cerró por conversación y quiere darlo de alta
sin salir de donde trabaja. Funcionalmente es la puerta B con otra pantalla enfrente, y así
debe construirse. Nunca como un segundo motor.

## La regla que amarra las cuatro

**El derecho de acceso vive en un solo lugar y es la base de datos de la aplicación.** No en
la tienda, no en el proveedor de cobro, no en la comunidad, no en el registro de clientes.
Los cuatro son satélites que reportan hacia adentro o reciben desde adentro. Cuando dos
digan cosas distintas, gana la base de datos. Esto ya está implementado en la resolución de
vigencia efectiva y hay que respetarlo, no reemplazarlo.

---

# Parte 3. Cuando algo falla

Aquí es donde se abren los huecos de verdad. Para cada caso: cómo se detecta, en cuánto
tiempo, quién se entera y cómo se recupera.

**El principio:** detectarlo tarde es lo mismo que no detectarlo. Y detectarlo porque el
cliente reclamó no es detectarlo, es que el cliente hizo el trabajo.

## 3.1 Pagó y no le llegó el acceso

Es el más grave porque el cliente pagó y no tiene nada.

- **Cómo se detecta.** La tarea de provisión de correo lleva más de 15 minutos sin
  confirmarse. No se espera al reclamo.
- **En cuánto.** 15 minutos.
- **Quién se entera.** Quien atiende, por el canal de guardia. Y el tablero lo muestra en
  rojo.
- **Cómo se recupera.** Tres capas, en orden: reintento automático con espera creciente;
  botón de reenvío en el panel; y **autoservicio en la aplicación**, donde la persona
  escribe el correo con el que pagó y recibe otra vez su código. La tercera capa es la que
  quita presión real, porque funciona a las tres de la mañana de un domingo.
- **Nota de fondo.** Hoy el correo transaccional está a medias y el correo de autenticación
  usa el servicio compartido de desarrollo. **Con eso, este fallo no es un caso raro: es el
  caso normal.** Está en la Parte 6 como bloqueante número uno.

## 3.2 Le llegó a la aplicación pero no a la comunidad, o al revés

El más probable de todos, porque la comunidad es el eslabón que no controlas.

- **Cómo se detecta.** Reconciliación diaria: se toma el padrón de miembros con derecho
  vigente en la base de datos y se compara contra el padrón de la comunidad. La diferencia
  simétrica es la lista de trabajo del día. Dos listas: los que deberían estar y no están, y
  los que están y ya no deberían.
- **En cuánto.** 24 horas como máximo. Para el alta individual, la alarma de la tarea es de
  1 hora.
- **Quién se entera.** Quien atiende recibe la lista de diferencias. Si la lista viene vacía,
  también se avisa, porque un reconciliador que dejó de correr se ve igual que uno que no
  encontró nada.
- **Cómo se recupera.** La diferencia genera tareas de provisión, del mismo tipo que las del
  alta. Si el alta en la comunidad es manual, la tarea es manual y visible.
- **Advertencia.** Si la comunidad no ofrece manera programática de leer su padrón, la
  reconciliación se vuelve una exportación periódica cargada a mano. **Eso hay que
  verificarlo antes de prometer 24 horas**, y es una de las decisiones de la Parte 7.

## 3.3 Pagó dos veces

Son dos fallos distintos que se confunden todo el tiempo.

**Caso A, doble cargo del mismo proveedor.** Lo detiene la idempotencia por proveedor más
identificador externo. Ya está resuelto. Requiere que las cuatro puertas la usen, incluida
la manual.

**Caso B, pagó por dos vías distintas.** Compró en la web y después, sin darse cuenta, se
suscribió desde la tienda. **La idempotencia no lo detecta**, porque son dos cobros
legítimos con identificadores legítimos.

- **Cómo se detecta.** En el momento de otorgar el derecho: si ya hay uno vigente de otro
  origen, **no se apila la vigencia en silencio**. Se aplica y se marca como duplicado
  probable.
- **En cuánto.** Inmediato, en el mismo paso 5.
- **Quién se entera.** Quien atiende, ese día. No es urgencia de minutos, es urgencia de
  horas, y es una conversación agradable: alguien pagó de más y le vas a devolver dinero.
- **Cómo se recupera.** Se conserva la vía con mejor economía para el cliente y se cancela
  la otra. **Si la sobrante es de tienda, tú no puedes reembolsarla**, se acompaña a la
  persona a pedirla y se le compensa con vigencia. Esa asimetría hay que escribirla en el
  guion de atención, no improvisarla.

## 3.4 Canceló, o le rebotó la renovación

Son cosas distintas y tratarlas igual cuesta clientes.

**Cancelación.** No es fin de acceso. Es fin de renovación. El acceso corre hasta donde
alcanzó lo pagado. El código actual ya lo hace bien: recorta la vigencia, no la borra.
Se detecta por aviso del proveedor, en minutos. El paso que falta es que **la salida de la
comunidad se agende para la fecha de vencimiento**, no para hoy.

**Rebote de renovación.** La tarjeta falló.

- **Cómo se detecta.** Aviso del proveedor, en minutos.
- **Qué se hace.** Ventana de gracia con el acceso intacto. Cortar el acceso el mismo día
  que rebota una tarjeta es castigar a alguien por un problema de su banco.
- **Quién se entera.** Quien atiende, el mismo día, con nombre.
- **Cómo se recupera.** Aquí es donde el modelo premium se gana el precio: **un rebote es una
  llamada o un mensaje de persona, no una secuencia de tres correos automáticos con asunto
  en mayúsculas.** El cobro se reintenta solo. Lo que no se reintenta solo es la relación.

**Obligación legal aparte:** el aviso de renovación con varios días de anticipación antes de
cada cobro es requisito desde el 13 de diciembre de 2025. No es cortesía y no se salta.

## 3.5 Pidió reembolso

El más olvidado, porque se atiende la mitad que duele en el bolsillo y se olvida la otra.

- **Cómo se detecta.** Aviso del proveedor, o registro manual si fue por transferencia.
- **En cuánto.** Minutos si es por proveedor.
- **Cómo se recupera.** Por el mismo camino, al revés. El reembolso genera tareas de
  revocación con los mismos cuatro destinos: revocar vigencia, sacar de la comunidad,
  actualizar el registro de clientes, y confirmar por correo. **La revocación usa la misma
  cola y las mismas alarmas que el alta.** Sin esto, la persona se queda en la comunidad
  para siempre y nadie lo nota, que es el estado por defecto de casi todos estos sistemas.
- **Regla de trato.** Reembolso concedido no cancela la relación. La salida se acompaña y se
  registra el motivo, porque el motivo de salida es el dato más caro que vas a recolectar
  este año.

## 3.6 Cambió de correo

Este no es un fallo, es el problema de identidad disfrazado de trámite. Va completo en la
Parte 5.

Resumen: si la liga entre sistemas es el correo, cambiar el correo rompe todo. Si la liga es
un identificador propio, cambiar el correo es una tarea de provisión más. La diferencia
entre las dos arquitecturas se decide en una tarde, y se paga durante años.

---

# Parte 4. Qué tiene que saber el registro de clientes

El encargo pide criterio, no lista de campos. El criterio es este.

## Tres capas, y solo tres

**Capa 1. El contrato.** Paga o no paga, desde cuándo, por qué puerta entró, cuánto lleva,
cuándo renueva, cuánto ha pagado en total, y si alguna vez rebotó. Es la capa fácil y sale
sola de la pasarela.

**Capa 2. La entrega.** ¿Tiene de verdad las dos cosas que compró? ¿Entró a la aplicación?
¿Entró a la comunidad? ¿Cuándo fue la última vez que usó cada una? Esta capa es la que casi
nadie construye y es donde vive el fallo 3.2. Un cliente que paga y no tiene acceso es
invisible en cualquier registro que solo mire la capa 1.

**Capa 3. La relación.** Cuándo fue la última vez que una persona de ATP habló con esta
persona, quién habló, de qué, y qué quedó pendiente. En un modelo de membresía única con
pocos clientes, **esta capa vale más que las otras dos juntas**, porque es la única que se
puede accionar hoy.

## Qué señal predice que alguien se va

La respuesta intuitiva es "dejó de abrir la aplicación", y es tarde. Cuando alguien deja de
abrir, ya decidió. Las señales útiles son más tempranas:

**Señal 1, y es la más fuerte: no arrancó.** Si a los siete días la persona no completó su
primer día completo, la probabilidad de que renueve cae. El arranque es el predictor, no la
constancia. Esta señal se conoce **antes** de que la persona se sienta culpable, que es la
ventana donde todavía se puede ayudar sin incomodar.

**Señal 2: silencio en dos canales a la vez.** Ni aplicación ni comunidad en catorce días.
Uno solo no dice nada, hay gente que solo lee. Los dos juntos sí.

**Señal 3: el primer ciclo de renovación.** El momento con más abandono de cualquier
membresía es el segundo cobro. No es una señal de comportamiento, es una fecha, y por eso es
la más fácil de atender: se sabe con un mes de anticipación.

**Señal 4: pidió ayuda y nadie contestó.** Cualquier mensaje entrante sin respuesta en 24
horas es una alarma, no una tarea pendiente.

## Qué se hace con la señal

Aquí está la parte que hay que decir con claridad, porque contradice el reflejo de
automatizar todo:

**La señal no dispara un correo automático. Dispara una tarea con nombre y contexto.**

La razón entera del modelo premium es bajar el abandono por cercanía, no por retención
forzada. Un correo automático de "te extrañamos" con el nombre insertado hace lo contrario
de lo que se compró: le dice a la persona que del otro lado no hay nadie. Con decenas o
pocos cientos de clientes, la respuesta correcta es que alguien escriba, y que ese alguien
sepa a quién le toca hoy y por qué.

**Lo único que el registro de clientes tiene que resolver en su primera versión es esa
pregunta: a quién le escribo hoy, y qué le digo.** Todo lo demás es adorno.

## Los momentos fijos, que valen más que cualquier puntaje

Antes de construir cualquier modelo de predicción, cinco momentos de calendario cubren la
mayor parte del valor:

| Momento | Qué se hace | Automático o humano |
|---|---|---|
| Día 0 | Bienvenida, acceso, invitación a la comunidad | Automático |
| Día 2 sin canjear el código | Recordatorio con el código otra vez | Automático |
| Día 7 sin primer día completo | Mensaje de persona, preguntando qué se atoró | **Humano** |
| Día 30 | Conversación de ajuste | **Humano** |
| Cinco días antes de cada renovación | Aviso de cobro | Automático, y es obligación legal |
| Día del rebote | Contacto directo | **Humano** |

## Una advertencia sobre la herramienta

Con menos de cien clientes, un registro bien pensado en una hoja de cálculo alimentada por
la pasarela hace este trabajo completo, y tiene una ventaja que ninguna herramienta da:
**obliga a descubrir cuáles columnas importan de verdad antes de pagar por una.** La
herramienta se elige cuando el trabajo manual empiece a doler, y va a doler en un número
concreto de clientes que hoy nadie conoce. Comprar antes es comprar a ciegas.

Lo que sí hay que construir desde el principio, herramienta o no, es la **salida de datos**
de la pasarela hacia donde sea que viva el registro. Esa salida es la pieza permanente. El
destino es reemplazable.

---

# Parte 5. La identidad, que es el problema de fondo

La misma persona existe en cuatro lugares: la aplicación, la comunidad, el cobro y el
registro de clientes. **Este es el punto exacto donde estos sistemas se rompen**, y se rompe
siempre por la misma razón: se usa el correo como pegamento.

## Por qué el correo no sirve de identidad

Tres hechos incómodos:

1. **El pago puede ocurrir antes de que exista la cuenta.** En ese momento el único dato es
   el correo del cobro, y nada garantiza que sea el correo con el que se va a registrar.
2. **El correo del cobro es del método de pago, no de la persona.** Se paga con la tarjeta
   de la empresa, con el correo de trabajo, con la cuenta del cónyuge.
3. **El correo cambia.** La gente cambia de trabajo y de proveedor.

Cualquier arquitectura donde el correo sea la llave entre sistemas produce, con el tiempo,
personas duplicadas, accesos huérfanos y reembolsos que revocan la cuenta equivocada.

## El ancla: un identificador de membresía propio

**Se crea un registro comercial en el momento del cobro, que existe aunque todavía no haya
cuenta.** Ese registro tiene un identificador propio, permanente, que nunca cambia. Le
llamamos identificador de membresía.

```
membresia_id     ← permanente, nace con el primer cobro, nunca cambia
  correo_de_cobro ← puede haber varios, con historial
  user_id         ← nulo hasta que alguien canjea el código. Se llena una vez
  id_en_cobro     ← identificador del cliente en el proveedor de pago
  id_en_comunidad ← identificador del miembro en la comunidad
  id_en_registro  ← identificador del contacto en el registro de clientes
```

Los cuatro sistemas guardan el identificador de membresía como campo propio. La comunidad
suele permitir un campo personalizado o una etiqueta; si no lo permite, la liga se mantiene
del lado de la pasarela, en esa misma tabla, y la comunidad queda como el eslabón débil que
hay que reconciliar más seguido.

**La liga entre sistemas nunca es el correo. Siempre es el identificador de membresía.**

## Cómo se cierra el vínculo con la cuenta

El código de activación ya resuelve esto y hay que dejarlo como está. El código nace atado
al identificador de membresía. Cuando alguien lo canja desde la aplicación, la cuenta que lo
canjeó queda escrita en `user_id`. **Ese es el momento del matrimonio, y ocurre una sola vez
por membresía.**

Dos casos de borde que hay que cubrir:

- **Un código canjeado por la cuenta equivocada.** Ocurre cuando alguien lo comparte. La
  reversión existe, es manual, y requiere que el panel de alta permita desvincular. Sin ese
  botón, la única salida es tocar la base de datos a mano, que es como se rompen las cosas.
- **Una persona con dos identificadores de membresía.** Pagó dos veces por vías distintas,
  caso 3.3. Hay que poder fusionarlas: una queda como principal, la otra apunta a ella, el
  historial de cobros se conserva completo. **Fusionar borrando historial es perder la
  contabilidad**, y no se hace.

## Qué pasa cuando se desincronizan

Se desincronizan. No es una posibilidad, es un hecho, porque son cuatro sistemas con cuatro
disponibilidades distintas. El diseño no evita la desincronización, la **detecta y la
corrige**.

**Una sola regla, y hay que grabarla:** el derecho de acceso lo decide la base de datos de
la aplicación. Cuando dos sistemas discrepen, el que está mal es el otro, y se corrige hacia
él, nunca hacia adentro. Nada de lo que diga la comunidad o el registro de clientes puede
otorgar ni quitar acceso.

**El reconciliador diario** toma el padrón de miembros vigentes y lo compara contra los
otros tres. Produce cuatro listas:

1. Vigentes que no están en la comunidad, y deberían.
2. En la comunidad que ya no están vigentes, y deberían salir.
3. Vigentes que no están en el registro de clientes.
4. Cobros activos en el proveedor sin membresía vigente del lado de la aplicación. **Esta
   cuarta es la peor de todas**, porque significa alguien pagando por algo que no tiene, y
   es la que nadie construye.

Cada línea de cada lista genera una tarea de provisión. Ninguna se resuelve sola en
silencio y ninguna espera a que alguien la note.

## El cambio de correo, resuelto

Con la identidad anclada:

- Cambiar el correo en la aplicación no toca la membresía, ni el cobro, ni el historial.
- Dispara **una** tarea: actualizar el correo en la comunidad, porque ahí la identidad sí es
  el correo y no hay manera de evitarlo.
- El correo del proveedor de cobro **no se cambia automáticamente**, porque pertenece al
  método de pago. Si la persona quiere cambiarlo, es un trámite aparte y consciente.
- El registro de clientes guarda el correo actual y el historial de correos anteriores. Sin
  el historial, un cobro viejo se vuelve un huérfano.

---

# Parte 6. Lo mínimo indispensable para el 1 de septiembre

Antes de la lista, dos cosas que hay que decir aunque incomoden.

## La tensión que nadie ha resuelto todavía

**Si el 1 de septiembre significa publicar en las tiendas con una membresía de paga, la
compra dentro de la aplicación no es opcional.** La regla de la tienda de Apple es explícita:
una aplicación que da acceso a contenido de paga tiene que ofrecer la compra adentro. No
alcanza con que la gente entre con una cuenta comprada en la web. Eso está escrito en la
decisión original y sigue vigente.

Y los productos configurados en las tiendas están armados con los tres niveles viejos, con
un grupo escalonado que asume ruta de mejora entre planes. **Con un solo plan hay que
rehacer esa configuración**, y la aprobación de productos de suscripción tiene tiempos de
revisión que no controlas.

De ahí sale la primera decisión, y es la que ordena todo lo demás:

> **¿El 1 de septiembre es publicar en las tiendas, o abrir la venta?**

Si es abrir la venta a la ronda de fundadores por web y transferencia, la puerta de tienda
no bloquea nada y estas dos semanas alcanzan bien. Si es publicar en tiendas, la puerta de
tienda es bloqueante, hay que rehacer productos y hay que meter tiempo de revisión externa
en el calendario. **Son dos planes distintos y no se pueden hacer los dos.**

## El bloqueante real, que no es de la pasarela

**El correo.** Hoy el correo de autenticación usa el servicio compartido de desarrollo de la
plataforma, que tiene límites bajos y entrega poco confiable, y el correo transaccional solo
manda el código de activación. Sin correo confiable no hay confirmación de cuenta, no hay
código, no hay bienvenida y no hay aviso de renovación.

**Sin esto, todos los demás huecos son teóricos, porque el flujo se cae en el primer paso.**
Es lo primero que hay que arreglar y no depende de ninguna decisión pendiente.

## Imprescindible

1. **Correo propio configurado**, tanto el de autenticación como el transaccional, con
   dominio verificado. Bloqueante absoluto.
2. **Una puerta de cobro viva y completa**, más el panel de alta manual. Cuál sea depende de
   la decisión de arriba.
3. **La cola de provisión con estado por destino y reintentos.** Aunque tres de los cuatro
   destinos se atiendan a mano en septiembre. Lo que importa no es que sea automático, es
   que sea visible.
4. **Un tablero de una sola pantalla:** quién pagó, quién canjeó, quién está en la comunidad,
   qué tareas llevan más tiempo del que les toca. La mitad ya está diseñada en el documento
   de alta manual.
5. **Los cuatro correos que faltan:** acceso con el código, bienvenida, recordatorio a las
   48 horas si no canjeó, y aviso de renovación con anticipación. El último es obligación
   legal.
6. **Autoservicio de recuperación del código** dentro de la aplicación. Es una pantalla y
   quita la mayoría de los mensajes de soporte de las primeras semanas.
7. **La reconciliación diaria contra la comunidad**, aunque la primera versión sea una
   exportación cargada a mano y revisada una vez al día. El hueco 3.2 es el más probable de
   todos y no puede quedar abierto en el lanzamiento.
8. **Registro del motivo de salida.** Un campo de texto y la disciplina de llenarlo. Cuesta
   nada y es el dato más valioso de los próximos seis meses.

## Puede esperar

- **La herramienta de registro de clientes.** Con la ronda de fundadores, una hoja
  alimentada por la pasarela es suficiente y además es diagnóstico. Lo que no puede esperar
  es la salida de datos desde la pasarela.
- **El alta automática en la comunidad**, si resulta que no hay manera programática de
  hacerla. Tarea manual visible, y se automatiza después.
- **El motor de comisiones de afiliados.** Las tablas están y están vacías. No bloquea
  ningún cobro. Pero ojo: **si se va a atribuir, la captura del código de referido tiene que
  existir en el registro desde el día uno**, porque una atribución que no se capturó en el
  momento no se recupera nunca. Capturar hoy y liquidar después sí se puede. Al revés no.
- **Cualquier puntaje de abandono.** Los momentos fijos de la Parte 4 cubren casi todo el
  valor y no requieren modelo.
- **La fusión de membresías duplicadas**, mientras el volumen permita hacerlo a mano y quede
  registrado.

## Lo que creo que es mala idea

**Abrir las cuatro puertas el mismo día.** Cada puerta agrega sus propios modos de falla, y
la de tienda agrega reglas de reembolso y cancelación que no controlas. Abrir las cuatro en
la semana de lanzamiento, con una sola persona atendiendo, garantiza que el primer incidente
se descubra por un cliente molesto. La secuencia sana es web y alta manual primero, tienda
después, con la reconciliación ya corriendo y probada.

**Construir el registro de clientes antes de tener clientes.** Es armar el archivero antes
de saber qué papeles vas a guardar. El orden correcto es: pasarela primero, hoja después,
herramienta cuando duela.

**Prometer alarmas de quince minutos sin decidir quién está de guardia.** Una alarma sin
alguien que la atienda es ruido, y el ruido enseña a ignorar alarmas. Con una sola persona
es más honesto declarar dos revisiones al día, cumplirlas, y subir la exigencia cuando haya
quien la sostenga.

---

# Parte 7. Privacidad y cumplimiento

Son datos de salud. La ley aplicable es la nueva ley federal de protección de datos de 2025,
con multas duplicadas y responsabilidad penal cuando hay lucro con datos sensibles. El
expediente completo está en `Business development/Legal`, y el dictamen relevante es
`DICTAMEN_LEGAL_NIVEL_A_2026-07-21.md`.

## Lo que nunca sale de la aplicación

Ni al registro de clientes, ni a la comunidad, ni a ningún tercero, ni agregado, ni
anonimizado, ni "solo para entender mejor al cliente":

Estudios de laboratorio y biomarcadores. Glucosa y cetonas. Ayuno. Ciclo menstrual,
embarazo, lactancia, libido y síntomas asociados. Diario personal, registros emocionales y
navegación de emociones. Padecimientos, historia clínica, medicamentos, suplementos e
intervenciones. Resultados de los tests y cuestionarios funcionales. Conversaciones con el
asistente. Fotografías de comida. Archivos de estudios. Peso, medidas y composición
corporal. Cualquier puntaje derivado de lo anterior, incluida la Edad ATP y el puntaje
diario.

**Este muro ya existe adentro de la aplicación y es estructural**, no una convención: la
superficie compartible es una tabla proyectada aparte con una lista blanca de campos no
clínicos, y hay pruebas automáticas que fallan si alguien intenta unir datos clínicos con la
superficie pública. **La pasarela y el registro de clientes tienen que quedar del lado de
afuera de ese mismo muro.** No se les da un camino privilegiado.

Y hay una promesa escrita en la propia interfaz, en el módulo de ciclo, que dice que esos
datos nunca se comparten. Romperla no es un problema legal antes que nada. Es un problema de
palabra.

## Lo que sí puede salir hacia el registro de clientes

- Identidad comercial: nombre, correo, teléfono si lo dio.
- Estado de la membresía: vigente o no, desde cuándo, hasta cuándo, por qué puerta.
- Historial de cobros: fechas, montos, reembolsos, rebotes.
- Origen y atribución: campaña, código de afiliado.
- **Dos derivados de uso, sin contenido:** días desde el último uso de la aplicación, y si
  completó o no su arranque.
- Historial de contacto humano.

Esos dos derivados son la solución elegante al problema entero: **dan exactamente la señal
que la Parte 4 necesita para cuidar al cliente, y no transportan un solo dato de salud.**
"Hace nueve días que no entra" es accionable. "Su glucosa subió" no le corresponde a quien
atiende cobranza, y meterlo en un registro comercial convierte ese registro en un expediente
clínico, con todo lo que eso arrastra.

## Lo que sale hacia la comunidad

Nombre y correo. Nada más. La comunidad es un lugar donde la persona publica lo que quiera
sobre sí misma, y esa es su decisión, no la tuya. ATP no publica por ella y no le manda
atributos.

## Antes de conectar cualquiera de los dos

Cuatro requisitos, y ninguno es opcional:

1. **Entrar a la lista de destinatarios del aviso de privacidad**, con nombre, país y
   salvaguarda. Hoy hay diez destinatarios enumerados y ni el registro de clientes ni la
   comunidad están en la lista. En el momento en que la comunidad reciba un correo desde la
   pasarela, deja de ser un enlace y se vuelve una transferencia de datos personales.
2. **Acuerdo de tratamiento firmado** con cada proveedor, con obligaciones equivalentes y
   prohibición expresa de usar los datos para entrenar modelos.
3. **El consentimiento de comunicaciones de marketing es opcional y separable**, no se puede
   empaquetar dentro del consentimiento obligatorio ni condicionar el alta. Ese permiso ya
   existe en la base de datos y hoy **ningún servicio lo consulta**. La pasarela tiene que
   tratarlo como candado duro. La distinción práctica: el correo con tu código, tu recibo y
   tu aviso de renovación es transaccional y no lo necesita. Cualquier cosa promocional sí.
4. **Contención por separación.** El registro de clientes no debe vivir donde viven los datos
   de salud ni tener credenciales hacia ellos. Un registro comercial comprometido tiene que
   ser un problema comercial, nunca una puerta a un expediente clínico.

## Tres huecos abiertos que tocan esto y ya están documentados

No los abre la pasarela, pero la pasarela los hereda si nadie los cierra:

- El borrado de cuenta **no borra los archivos almacenados**. Quedan huérfanas las
  fotografías y los documentos de estudios.
- La exportación de datos que la ley obliga a entregar apunta a tablas que no existen y
  falla en silencio justo en lo más sensible.
- Los enlaces firmados de documentos de laboratorio tienen vigencia de un año, que en la
  práctica es un enlace público durante un año.

---

# Parte 8. Lo que el dueño tiene que decidir antes de que alguien construya

Ninguna de estas es técnica. Todas bloquean el diseño de algo.

| # | Decisión | Qué depende de ella |
|---|---|---|
| 1 | **¿El 1 de septiembre es publicar en tiendas o abrir la venta?** | Si la puerta de tienda es bloqueante, si hay que rehacer productos, y si el calendario aguanta tiempo de revisión externa |
| 2 | **¿Hay periodo de prueba o no hay?** | Pendiente abierto desde el pivote. Cambia el recorrido completo, los correos y el momento en que se otorga el acceso |
| 3 | **¿La comunidad vive afuera o adentro de la aplicación?** | Decisión ya documentada como abierta. El puente se construye distinto en cada caso, y con la respuesta "adentro" la mitad de este documento cambia |
| 4 | **¿La comunidad permite dar de alta, dar de baja y leer su padrón de forma programática?** | Es verificación, no opinión, pero decide si el hueco 3.2 se cierra en minutos o en un día. **Hay que verificarlo esta semana** |
| 5 | **¿Cuál es la ventana real de atención?** | Determina si las alarmas se prometen en minutos o en revisiones diarias. Prometer de más es peor que prometer poco |
| 6 | **¿Cuánto paga un afiliado sobre la membresía única?** | La tabla vieja está en una moneda que ya no se vende. Sin el número no hay motor, pero la captura del código sí se puede construir antes |
| 7 | **¿Mensual, anual, o los dos?** | Ciclos de renovación, avisos legales y aritmética de reembolso proporcional |
| 8 | **¿Cuál es la política de reembolso escrita?** | Hay un documento de política en el expediente legal. Hay que confirmarlo contra el modelo nuevo, porque la tienda impone la suya y la web no |

---

## Cierre

El diseño se resume en cinco frases:

1. Cuatro puertas, cuatro traductores, **un solo recorrido**.
2. El cobro no hace el alta: **el cobro crea tareas**, con estado por destino y reintentos.
3. El derecho de acceso vive **en un solo lugar**, y los otros tres sistemas se corrigen
   hacia él.
4. La identidad se ancla a **un identificador propio**, nunca al correo.
5. Lo que no se confirmó a tiempo **suena**, y lo que no se pudo automatizar **se ve**.

Y una que no es de diseño: la razón entera del modelo premium es que del otro lado haya
alguien. Toda la automatización de este documento existe para una sola cosa, que es liberar
el tiempo de esa persona para las conversaciones que sí importan. Automatizar la
conversación misma sería automatizar justo lo que el cliente compró.
