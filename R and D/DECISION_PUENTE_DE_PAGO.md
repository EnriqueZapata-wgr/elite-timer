# 💳 El puente de pago · tres caminos y sus números

**Fecha:** 2026-07-28 · **Para:** decisión de Enrique
**Por qué existe este documento:** hoy un founder que abra el paywall no tiene ningún camino para pagar dentro de la app, y el tier se mueve a mano en la base. Es el bloqueador real de la beta.

---

## Lo primero, porque cambia el marco

**México no es Estados Unidos ni la Unión Europea.**

Tras el fallo de Epic contra Apple, las apps en la tienda **de EE.UU.** pueden poner un botón que lleve a pagar afuera. En la UE existe el permiso de enlace externo con sus propias cuotas. **Fuera de esas dos jurisdicciones, sigue prohibido dirigir al usuario a pagar fuera de la app desde adentro.**

Nuestros usuarios están en México. Así que en la tienda mexicana la regla de siempre aplica: **si un usuario de iPhone puede suscribirse, tiene que poder hacerlo con compra in-app.**

La guideline que sí nos sirve es la **3.1.3(b), servicios multiplataforma**: puedes dejar que alguien entre a contenido que compró en tu sitio web, **siempre que ese mismo contenido también se pueda comprar dentro de la app**. Y con una condición dura: no puedes dirigir al usuario de iOS hacia el otro método de pago, ni desde adentro ni con comunicaciones que desalienten la compra in-app.

**Traducción práctica:** puedes cobrar en la web y que la persona entre a la app con su cuenta. Lo que no puedes es poner un botón adentro que diga "paga en somosatp.com".

**Y esto no aplica a la beta.** En TestFlight y en el APK interno no hay tienda de por medio. Para los founders, cualquiera de los tres caminos funciona hoy. La decisión es para el lanzamiento público, y conviene tomarla ahora porque define qué construimos.

---

## Los números, con tu pricing real

Base $399 · Pro $799→$999 · Clínico $1,499 (MXN/mes)

| | Apple / Google | Stripe México |
|---|---|---|
| **Comisión** | 15% con el Small Business Program (menos de $1M USD de ingresos netos el año anterior). Sin el programa: 30% el primer año, 15% a partir del mes 13 de suscripción continua. | 3.6% + $3 MXN por transacción local. +2% si hay conversión de moneda. |
| **Sobre Base $399** | $59.85 → recibes **$339.15** | $17.36 → recibes **$381.64** |
| **Sobre Pro $999** | $149.85 → recibes **$849.15** | $38.96 → recibes **$960.04** |
| **Diferencia por usuario Base** | | **$42.49 al mes** |
| **A 1,000 suscriptores Base** | | **~$42,500 MXN al mes** |

**El Small Business Program hay que solicitarlo**, no es automático, y se renueva cada año. Con tus números entras sin problema. Inscríbete antes de publicar: es la diferencia entre 15% y 30%.

Conekta hay que cotizarlo aparte. En México sus tarifas se negocian por volumen y el pago en efectivo por OXXO tiene una estructura distinta a la de tarjeta. No pongo un número que no verifiqué.

---

# Opción A · Todo por compra in-app

RevenueCat con los productos configurados en App Store Connect y Play Console. Es lo que el código ya espera.

**A favor**
- Es el único camino totalmente limpio para la tienda. Cero riesgo de rechazo por pagos.
- La fricción de compra es la más baja que existe: Face ID y listo. La conversión de un checkout nativo le gana a un checkout web por bastante.
- Apple y Google se encargan de reintentos de cobro, impuestos, reembolsos y cancelaciones. Eso es trabajo que no haces.
- El código del paywall ya está escrito. Falta configurar productos, no programar.

**En contra**
- $42,500 MXN al mes a los 1,000 suscriptores Base, contra la ruta web.
- **Rompe tu sistema de afiliados.** Apple no te dice quién refirió a quién ni te deja repartir el cobro. El wallet unificado de clínicos, centros, coaches e influencers no puede liquidarse sobre compras in-app. Esto no es un detalle: es un pilar de tu modelo B2B2C.
- Cambiar precios implica pasar por la tienda.

# Opción B · Todo por la web

Stripe y Conekta en somosatp.com. La app solo reconoce la cuenta.

**A favor**
- La comisión más baja, con diferencia.
- El sistema de afiliados funciona: tú controlas la atribución y la liquidación.
- Cambias precios, pruebas ofertas y armas escaleras cuando quieras, sin pedirle permiso a nadie.
- Es lo que ya tienes construido del lado comercial.

**En contra**
- **No es suficiente por sí sola para publicar en la App Store.** Sin compra in-app, un usuario de iPhone no tiene forma de suscribirse, y eso es rechazo bajo la 3.1.1.
- No puedes mencionar el pago web desde adentro de la app. Ni un botón, ni un texto. Todo el tráfico tiene que llegar por fuera: correo, redes, tu landing.
- El cobro recurrente, los reintentos, las tarjetas vencidas y los reembolsos los operas tú.

# Opción C · Híbrido *(recomendado)*

Compra in-app disponible en la app, **y** checkout web para el tráfico que llega por tus canales.

Es lo que hace prácticamente toda app de suscripción con un negocio directo detrás, y en tu caso no es preferencia: **es lo que tu propio modelo de afiliados obliga.**

**Cómo se ve**
- El usuario que descubre ATP en la tienda compra adentro y paga la comisión. Vale la pena: ese usuario no te costó adquisición.
- El founder, el paciente de un clínico y el referido de un afiliado llegan por un link de somosatp.com, pagan por Stripe o Conekta, y **entran a la app con la cuenta que ya crearon**. Ahí la comisión es del 3.6%, y la atribución del afiliado queda registrada.
- La app **nunca** menciona la ruta web. Solo reconoce la cuenta.

**Lo que hay que construir — y es la parte que hoy no existe**

1. **El webhook.** Stripe y Conekta avisan el pago, una edge function escribe `profiles.tier` y la fecha de vigencia. Idempotente, porque los webhooks se repiten.
2. **La reconciliación en el arranque.** La app resuelve el tier server-side en cada sesión: el que venga de RevenueCat **o** el que venga del webhook, el que esté vigente. Nunca desde el cliente, que es lo que hoy ya está bien hecho en `argos-proxy`.
3. **El amarre entre el pago web y la cuenta.** El correo del checkout tiene que ser el mismo con el que se registra en la app. Si no coincide, alguien pagó y no entra. **Aquí es donde se rompen estos sistemas.** Se resuelve con un código de activación de un solo uso que se envía por correo tras el pago, y que la app canjea desde Ajustes.
4. **La baja.** Cancelar en Stripe tiene que quitar el tier. Si no, regalas Pro para siempre.

---

## Para la beta de founders, hoy

**El código de activación resuelve las dos cosas a la vez.** El founder paga en la web, recibe su código, lo canjea dentro de la app y queda con su tier. Eso funciona en TestFlight, funciona en el APK, y **es exactamente la misma pieza que vas a necesitar en el híbrido.** No es un parche que después se tira.

Lo que sí hay que arreglar en el binario antes de cualquier tienda, y ya está en el brief de MB-12:
- La sección de recargas de H+ con precios en pesos y el botón **"Comprar (dev)"** es una violación directa de la regla de pagos. Sale del binario o se convierte en consumible real.
- El paywall necesita su disclosure de renovación automática y quitar el "14 días" y el "33%" hardcodeados.

---

## Lo que necesito de ti

**Una decisión:** A, B o C.

Si es **C**, que es lo que recomiendo, lo siguiente que escribo es el away run del puente: webhook idempotente, resolución de tier server-side, código de activación y manejo de baja. Con eso la beta deja de depender de que tú muevas filas a mano.

**Y una tarea tuya que nadie más puede hacer:** inscribirte al Small Business Program de Apple antes de publicar. Es 15% contra 30%.

---

**Fuentes:**
- [App Review Guidelines · Apple Developer](https://developer.apple.com/app-store/review/guidelines/)
- [Apple must allow External Payment Links · RevenueCat](https://www.revenuecat.com/blog/growth/apple-anti-steering-ruling-monetization-strategy)
- [Apple Wins Ability to Charge Fees on External Payment Links · MacRumors](https://www.macrumors.com/2025/12/11/apple-app-store-fees-external-payment-links/)
- [The 15% App Store Fee: A Guide for Developers · RevenueCat](https://www.revenuecat.com/blog/engineering/small-business-program)
- [App Store Small Business Program · Adapty](https://adapty.io/blog/app-store-small-business-program/)
- [Comisiones de Stripe México · Wise](https://wise.com/mx/blog/comisiones-stripe-mexico)
- [Tarifas y comisiones · Stripe](https://stripe.com/pricing)
