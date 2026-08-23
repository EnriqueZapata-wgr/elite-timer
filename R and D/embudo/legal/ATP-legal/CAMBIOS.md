# Qué cambió respecto a `src/constants/legal-texts.ts`

Base: `src/constants/legal-texts.ts` en el repo, versión 1.0.
Publicado como versión 1.1. Aquí está cada edición y por qué, para que nada
entre a la web sin que tú lo hayas visto.

---

## Decisión que rompe una regla escrita en el propio archivo

El encabezado de `legal-texts.ts` dice, literal:

> "NADA se publica con el nombre personal de Enrique. El responsable siempre es la SAS."

Tú decidiste lo contrario el 23 de agosto: **el responsable eres tú, persona
física con actividad empresarial**, porque la SAS no existe todavía y sin
términos publicados no hay casilla de consentimiento en Stripe, y sin casilla
no hay lanzamiento el 27.

Es la decisión correcta y quiero dejar claro por qué: quien va a cobrar el 27
eres tú, quien va a recibir los datos de salud eres tú, y un contrato tiene que
nombrar a quien realmente presta el servicio. Un contrato a nombre de una
sociedad que no existe no es más discreto, es inejecutable.

Cuando la SAS se constituya, se sustituye el responsable y se avisa el cambio
con 30 días de anticipación. Eso ya está previsto en la cláusula 12 de los
Términos y en la 12 del Aviso, así que no hay que inventar nada.

**Pendiente para el desarrollador:** `legal-texts.ts` tiene que actualizarse
con el mismo texto, o la app y la web van a decir cosas distintas sobre quién
es el responsable, que es exactamente el tipo de contradicción que un
consumidor usa en una reclamación.

---

## Datos publicados (versión final del 23 de agosto)

- **Responsable:** Enrique Zapata Ezquerro, persona física con actividad
  empresarial, RFC ZAEE900718DG9
- **Domicilio:** Circuito Petirrojo 129, Zibatá, El Marqués, Querétaro, México,
  C.P. 76269
- **Jurisdicción:** Querétaro
- **Garantía de siete días:** SÍ, incluida en la cláusula 5


---

## Términos y Condiciones

**1. Responsable.** Sustituido `[RAZÓN SOCIAL, S.A.S. de C.V.]` por persona
física con RFC. Domicilio ahora pide código postal explícito.

**5. Membresía, precios y pagos.** Es la cláusula que más cambió, y era
necesario porque describía un producto que ya no es el que vas a vender.

- **Se eliminó el periodo de prueba de 14 días.** Ya no existe. Una escalera
  de precios con fecha de término y una prueba de dos semanas se estorban
  entre sí: quien entra el 28 a 449 no habría pagado hasta el 11 de
  septiembre, cuando el precio ya es otro.
- **Se agregó la cláusula de precio congelado.** Dice que el precio que
  contratas se conserva mientras la suscripción siga activa e ininterrumpida,
  y que si cancelas y vuelves, entras al precio vigente. Esto no es adorno:
  es exactamente lo que Stripe hace por omisión, y ponerlo por escrito
  convierte el comportamiento del sistema en una promesa que puedes sostener.
- **Se agregó qué pasa con un cobro fallido**: reintentos hasta dos semanas,
  aviso, y suspensión si no se completa. Antes no decía nada, y suspender el
  servicio de alguien sin haberlo advertido en el contrato es terreno feo.
- Se quitó la referencia a `somosatp.com/precios`, que no existe todavía.
- Se quitó Conekta de los procesadores. No lo estás usando.
- La cancelación ya no dice "Ajustes, Suscripción" dentro de la app, porque
  esa pantalla no existe. Ahora dice el portal de suscripción de Stripe, que
  es lo que realmente vas a mandarles.
- **Garantía de siete días: incluida.** Decidida el 23 de agosto. Devolución
  completa y sin preguntas si cancela dentro de los siete días naturales
  siguientes al primer pago, solicitándolo a hola@somosatp.com desde el correo
  con el que contrató. Aplica una sola vez por persona y cubre solo el primer
  pago. Fuera de esa ventana, los pagos no son reembolsables salvo obligación
  legal expresa.
- **Operativamente:** la devolución se hace a mano desde el panel de Stripe. La
  comisión de Stripe no se devuelve, así que cada garantía ejercida cuesta unos
  veinte pesos además del importe.

**6. Programa Founders. Se eliminó de la versión publicada.** Tenía un
placeholder sin resolver, los `[10]` años de vida esperada de referencia, que
define el prorrateo del reembolso si ATP cierra. Es una cifra con consecuencia
jurídica y no se inventa. Como el Founder no sale el 27, la cláusula regresa en
septiembre con el número decidido. Las cláusulas siguientes se renumeraron.

**14. Jurisdicción.** Se resolvió a Querétaro, coherente con el domicilio.

---

## Aviso de Privacidad

**1. Responsable.** Mismo cambio.

**2 f) Datos de pago.** Se quitó Conekta. Quedó Stripe para web y Apple y
Google para compras dentro de la app.

**2 a).** Se agregó teléfono a los datos de contacto, porque Stripe lo va a
recoger en el cobro y porque el WhatsApp de acceso depende de él. Recoger un
dato que el aviso no menciona es la falta más común y la más fácil de evitar.

**3. Finalidades.** Se agregó una finalidad primaria nueva: enviarte avisos
operativos por correo y por WhatsApp (confirmación de pago, acceso, códigos,
renovación, cobros fallidos). Es primaria, no secundaria, porque sin esos
mensajes no hay forma de entregarte el servicio. Las secundarias se
renumeraron.

**5. Transferencias.** Se agregaron los proveedores que sí vamos a usar y no
estaban: **Resend** (envío de correo, EE.UU.), **Meta Platforms y 360dialog**
(mensajería por WhatsApp, EE.UU. y Alemania), **Hostinger** (alojamiento del
sitio, Unión Europea). Se quitaron **Conekta** y **Vercel**, que no se usan.

---
