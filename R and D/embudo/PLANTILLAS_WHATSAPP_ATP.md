# Plantillas de WhatsApp · ATP

**21 de agosto de 2026 · listas para mandar a aprobación hoy**

---

## Antes de pegarlas, tres cosas que definen si pasan

**Las tres van en categoría `UTILITY`, no `MARKETING`.** Ahí está la diferencia entre pagar unos centavos por mensaje y pagar cuatro veces más, y sobre todo la diferencia entre poder escribirle a alguien fuera de una ventana de conversación o quedarte esperando a que él escriba primero. Una plantilla utility se sostiene porque hay una transacción de por medio: alguien pagó, alguien mandó un comprobante, alguien tiene un pago sin canjear.

**El texto no toca salud por ningún lado.** Sin biomarcadores, sin laboratorios, sin edad biológica, sin una sola promesa. Estas plantillas hablan de un pago, un código y un enlace, y ahí se acaban. Eso también las mantiene lejos de la revisión de contenido, que es lo que puede convertir una aprobación de minutos en una espera de un día entero.

**El texto tampoco vende.** No hay precios, ni planes, ni "aprovecha", ni "última oportunidad", ni el lema de la marca en el pie de página. El clasificador de Meta lee el mensaje completo, pie incluido, y una frase de campaña ahí abajo te reclasifica la plantilla entera sin avisarte.

---

## Plantilla 1 · `atp_acceso_listo`

**Cuándo se dispara:** cuando el webhook confirma el pago y ya existe el código de activación. Es el mensaje que cierra la venta.

**Categoría:** UTILITY · **Idioma:** es_MX

**Encabezado** (texto)

```
Tu acceso a ATP ya quedó
```

**Cuerpo**

```
Hola {{1}}, recibimos tu pago y tu cuenta ya está activa.

Tu código de activación es {{2}} y tu membresía corre hasta el {{3}}.

En la página de abajo tienes ese mismo código, los enlaces para descargar la app en iPhone y en Android, y la entrada a la comunidad. Si algo no te abre, responde a este mensaje y lo vemos contigo.
```

**Pie de página**

```
Te escribimos por tu compra de ATP.
```

**Botón** (URL con sufijo variable)

| Campo | Valor |
|---|---|
| Texto del botón | `Abrir mi acceso` |
| URL | `https://somosatp.com/mi-acceso/{{1}}` |
| Ejemplo del sufijo | `k7m2p9x4qh` |

> El ejemplo que pide Meta es **solo el sufijo**, no la liga completa. Si pegas la URL entera ahí, la plantilla se rechaza.

**Valores de ejemplo para la aprobación**

| Variable | Ejemplo |
|---|---|
| {{1}} | Enrique |
| {{2}} | ATP-7K3M-92QX |
| {{3}} | 25 de septiembre de 2026 |

> ⚠️ La variable de la URL es un token opaco de un solo uso. Ahí nunca va el nombre, ni el correo, ni el teléfono.

---

## Plantilla 2 · `atp_comprobante_recibido`

**Cuándo se dispara:** cuando alguien manda su comprobante de transferencia o de depósito. Es el acuse que evita que la persona se quede en el aire mientras alguien verifica a mano.

**Categoría:** UTILITY · **Idioma:** es_MX

**Encabezado** (texto)

```
Recibimos tu comprobante
```

**Cuerpo**

```
Hola {{1}}, ya nos llegó tu comprobante y está en revisión.

La verificación tarda un día hábil como máximo. En cuanto quede confirmada te llega por aquí mismo tu código de activación y el enlace para entrar.

Si el comprobante salió cortado o le falta algo, responde a este mensaje y lo corregimos sin que tengas que volver a empezar.
```

**Pie de página**

```
Te escribimos por tu compra de ATP.
```

**Sin botón.** Todavía no hay a dónde mandar a la persona, y un botón que no lleva a ningún lado es motivo de rechazo.

**Valores de ejemplo**

| Variable | Ejemplo |
|---|---|
| {{1}} | Mariana |

---

## Plantilla 3 · `atp_activacion_pendiente`

**Cuándo se dispara:** desde el tablero de rezagados. Alguien pagó, tiene código, y su cuenta sigue sin abrirse. Este es el mensaje que recupera a la gente que se cayó por algo tan tonto como que el correo se fue a spam.

**Categoría:** UTILITY · **Idioma:** es_MX

**Encabezado** (texto)

```
Tu pago de ATP sigue sin canjearse
```

**Cuerpo**

```
Hola {{1}}, tu pago del {{2}} sigue sin canjearse. La membresía ya está corriendo, pero tu cuenta todavía no se abre con el código que te mandamos.

Puede ser que el correo se haya ido a spam. Abajo está la página con tu código y los enlaces de descarga, sin que tengas que buscar nada.

Si ya lo intentaste y no jaló, responde a este mensaje y lo resolvemos contigo hoy.
```

**Pie de página**

```
Te escribimos por tu compra de ATP.
```

**Botón** (URL con sufijo variable)

| Campo | Valor |
|---|---|
| Texto del botón | `Abrir mi acceso` |
| URL | `https://somosatp.com/mi-acceso/{{1}}` |
| Ejemplo del sufijo | `k7m2p9x4qh` |

**Valores de ejemplo**

| Variable | Ejemplo |
|---|---|
| {{1}} | Paulina |
| {{2}} | 22 de agosto de 2026 |

> 🔴 **Esta es la que hay que vigilar.** Un recordatorio que la persona no pidió es justo lo que Meta tiende a mover a MARKETING, aunque el disparador sea una transacción real. Por eso el cuerpo abre nombrando el pago y la fecha, para que la liga con la transacción quede a la vista del clasificador desde la primera línea. Aun así, revisa su categoría en el listado en cuanto se apruebe.

---

## Las mismas tres, en JSON, para mandarlas por API

Si prefieres no pegarlas a mano en el Business Manager, este es el cuerpo de la petición. El endpoint es `POST https://graph.facebook.com/v24.0/{WABA_ID}/message_templates` con el token de sistema en el encabezado.

```json
{
  "name": "atp_acceso_listo",
  "language": "es_MX",
  "category": "UTILITY",
  "components": [
    { "type": "HEADER", "format": "TEXT", "text": "Tu acceso a ATP ya quedó" },
    { "type": "BODY",
      "text": "Hola {{1}}, recibimos tu pago y tu cuenta ya está activa.\n\nTu código de activación es {{2}} y tu membresía corre hasta el {{3}}.\n\nEn la página de abajo tienes ese mismo código, los enlaces para descargar la app en iPhone y en Android, y la entrada a la comunidad. Si algo no te abre, responde a este mensaje y lo vemos contigo.",
      "example": { "body_text": [["Enrique", "ATP-7K3M-92QX", "25 de septiembre de 2026"]] } },
    { "type": "FOOTER", "text": "Te escribimos por tu compra de ATP." },
    { "type": "BUTTONS", "buttons": [
      { "type": "URL", "text": "Abrir mi acceso",
        "url": "https://somosatp.com/mi-acceso/{{1}}",
        "example": ["k7m2p9x4qh"] }
    ]}
  ]
}
```

```json
{
  "name": "atp_comprobante_recibido",
  "language": "es_MX",
  "category": "UTILITY",
  "components": [
    { "type": "HEADER", "format": "TEXT", "text": "Recibimos tu comprobante" },
    { "type": "BODY",
      "text": "Hola {{1}}, ya nos llegó tu comprobante y está en revisión.\n\nLa verificación tarda un día hábil como máximo. En cuanto quede confirmada te llega por aquí mismo tu código de activación y el enlace para entrar.\n\nSi el comprobante salió cortado o le falta algo, responde a este mensaje y lo corregimos sin que tengas que volver a empezar.",
      "example": { "body_text": [["Mariana"]] } },
    { "type": "FOOTER", "text": "Te escribimos por tu compra de ATP." }
  ]
}
```

```json
{
  "name": "atp_activacion_pendiente",
  "language": "es_MX",
  "category": "UTILITY",
  "components": [
    { "type": "HEADER", "format": "TEXT", "text": "Tu pago de ATP sigue sin canjearse" },
    { "type": "BODY",
      "text": "Hola {{1}}, tu pago del {{2}} sigue sin canjearse. La membresía ya está corriendo, pero tu cuenta todavía no se abre con el código que te mandamos.\n\nPuede ser que el correo se haya ido a spam. Abajo está la página con tu código y los enlaces de descarga, sin que tengas que buscar nada.\n\nSi ya lo intentaste y no jaló, responde a este mensaje y lo resolvemos contigo hoy.",
      "example": { "body_text": [["Paulina", "22 de agosto de 2026"]] } },
    { "type": "FOOTER", "text": "Te escribimos por tu compra de ATP." },
    { "type": "BUTTONS", "buttons": [
      { "type": "URL", "text": "Abrir mi acceso",
        "url": "https://somosatp.com/mi-acceso/{{1}}",
        "example": ["k7m2p9x4qh"] }
    ]}
  ]
}
```

---

## Lo que puede tumbarlas, y cómo se ve cada caso

**Reclasificación a marketing.** No te llega como rechazo. La plantilla queda aprobada, pero en la categoría cara, y te enteras hasta que ves la factura. Se revisa en el listado de plantillas, en la columna de categoría, y se apela desde ahí mismo. La apelación normalmente se resuelve en un día.

**Variable sola en su renglón.** Meta rechaza cualquier plantilla que tenga una línea con puros parámetros y nada de texto alrededor. Toda variable tiene que ir rodeada de palabras. Las tres cumplen, pero es el error más fácil de introducir si alguien edita el texto después.

**Ejemplos que no empatan.** Si el número de valores de ejemplo no coincide con el número de variables, el rechazo es inmediato y el mensaje de error no te dice cuál fue el problema. Las tablas de arriba ya traen el conteo correcto, y el ejemplo del botón lleva solo el sufijo.

**Versión de la API.** El JSON de arriba apunta a `v24.0`. Si copias un ejemplo viejo de internet con `v21.0`, esa versión ya está en su última ventana y va a dejar de responder.

---

## El orden de hoy

Creas la app de WhatsApp Business en Meta y das de alta un número **nuevo**, no el que ya usas desde el teléfono. Un número que entra a Cloud API deja de funcionar en la app de WhatsApp Business y el historial no viaja contigo. Ese camino es de un solo sentido.

Con el número dado de alta, pegas las tres plantillas y las mandas a aprobación. Eso es lo que hay que dejar corriendo antes de que acabe el día. La mayoría se resuelven en minutos, pero Meta se reserva hasta veinticuatro horas, y ese día lo quieres gastar hoy y no el martes.

Mientras se aprueban puedes seguir con todo lo demás. El número de prueba gratuito trae la plantilla de muestra `hello_world` precargada y te deja escribirle a cinco números en lista blanca, así que el circuito completo se puede probar hoy mismo sin depender de que Meta conteste.

Y el techo tampoco es un problema para el veintisiete. Un portafolio de negocio nuevo arranca en doscientos cincuenta clientes distintos cada veinticuatro horas, y ese techo sube solo conforme mandas volumen con buena calificación. El siguiente escalón son dos mil. Para el primer corte de inscripciones te sobra.
