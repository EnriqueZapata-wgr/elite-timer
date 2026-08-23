# Correos de autenticación · ATP

**22 de agosto de 2026.** Trece plantillas en español, con marca, listas para pegar en Supabase. Aquí están todas para que existan, pero **solo una se aplica esta noche.**

---

## Esta noche, solo esto

**`autenticacion/01-confirmar-alta.html`**, que va en Authentication, Email Templates, **Confirm signup**. Con este asunto:

```
Confirma tu correo para entrar a ATP
```

Es la única que urge, y urge por un motivo concreto: en `auth.users` hay altas con 81, 86 y 95 segundos entre que se creó la cuenta y que se confirmó el correo. Ese hueco solo existe si alguien abrió un correo y le dio clic. O sea que la confirmación está encendida y **cada founder que entre el 27 va a recibir esa plantilla**, que hoy sigue en inglés y con el enlace apuntando al dominio de Supabase. Es exactamente el correo que ya vimos irse a spam, multiplicado por toda la gente del corte. Y a diferencia del de contraseña, este no tiene plan B: si no llega, la persona no puede ni entrar.

**Antes de pegarla hay que subir una página**, porque el enlace nuevo tiene que aterrizar en tu dominio y esa página todavía no existe. Está en `subir/confirmar.html`, ya con los datos de tu proyecto puestos, y va en la raíz de `public_html` junto a la de contraseña.

Para comprobar que quedó, abre `somosatp.com/confirmar.html` en el navegador. Te debe salir una página negra que dice "Este enlace ya venció", que es lo correcto porque la estás abriendo sin token.

---

## La regla, que es lo que hay que no olvidar

Todas estas plantillas llevan el enlace a **`somosatp.com`**, nunca al dominio de Supabase. Se arma con `{{ .SiteURL }}` y `{{ .TokenHash }}` en lugar de `{{ .ConfirmationURL }}`.

Eso resuelve dos cosas de golpe. Que el dominio que manda y el dominio al que lleva sean el mismo, que es lo que evita el banner rojo de phishing. Y que los escáneres de seguridad de los correos corporativos, que abren las ligas antes que la persona, no quemen un enlace de un solo uso.

---

## Lo que hay en la carpeta

### `autenticacion/`

| Archivo | Va en Supabase, Email Templates | Asunto | Se usa hoy |
|---|---|---|---|
| `01-confirmar-alta` | **Confirm signup** | Confirma tu correo para entrar a ATP | 🔴 **cada alta. Esta noche** |
| `02-restablecer-contrasena` | Reset password | Restablece tu contraseña de ATP | ✅ ya aplicada |
| `03-cambio-de-correo` | Change email address | Confirma tu correo nuevo en ATP | cuando alguien cambia su correo |
| `04-enlace-de-entrada` | Magic link | Tu enlace para entrar a ATP | sin uso, la app entra con contraseña |
| `05-invitacion` | Invite user | Te invitamos a ATP | sin uso |
| `06-reautenticacion` | Reauthentication | Tu código de confirmación de ATP | sin uso |

### `seguridad/`

Los siete avisos de la sección Security, todos apagados hoy. El primero es el que yo encendería en cuanto haya gente adentro, porque es el que le avisa a alguien que le tocaron la cuenta.

| Archivo | Va en Supabase, Security | Asunto |
|---|---|---|
| `01-contrasena-cambiada` | Password changed | Tu contraseña de ATP cambió |
| `02-correo-cambiado` | Email address changed | El correo de tu cuenta de ATP cambió |
| `03-telefono-cambiado` | Phone number changed | El teléfono de tu cuenta de ATP cambió |
| `04-metodo-vinculado` | Sign-in method linked | Se agregó una forma de entrar a tu cuenta de ATP |
| `05-metodo-quitado` | Sign-in method removed | Se quitó una forma de entrar a tu cuenta de ATP |
| `06-mfa-agregado` | MFA factor enrolled | Activaste verificación en dos pasos en ATP |
| `07-mfa-quitado` | MFA factor unenrolled | Se desactivó la verificación en dos pasos de ATP |

### Además

`INDICE.json` trae, para cada plantilla, su asunto, su preheader, dónde se pega y qué variables usa. Sirve para automatizar esto después si algún día se quiere hacer por API en vez de a mano.

Cada `.html` viene con su `.txt` al lado. Supabase no acepta la parte de texto plano en su editor, así que esos archivos son para el día que estos correos se manden desde nuestro propio código en vez de desde Supabase.

---

## Las páginas que reciben los enlaces

En `subir/` hay dos, las dos con los datos del proyecto ya puestos:

**`confirmar.html`** recibe alta nueva, cambio de correo y enlace de entrada. Distingue el caso por el parámetro `type` y muestra el mensaje que corresponde a cada uno.

**`reset-password.html`** recibe recuperación de contraseña e invitación. Es la que ya está publicada, pero **esta versión es nueva**: la anterior solo aceptaba recuperación, y esta también acepta invitación. Súbela encima cuando toque la plantilla de invitación, no urge hoy.

Las dos manejan tres estados y ninguna deja a la persona en blanco: mientras carga, cuando salió bien, y cuando el enlace venció. Cortan solas a los quince segundos si Supabase no contesta, y borran el token del historial del navegador en cuanto terminan.

---

## Lo que queda pendiente en el FIFO

Está escrito en `FIFO_PENDIENTES.md`, al final. En resumen: las cinco plantillas que no urgen, los siete avisos de seguridad, y BIMI, que es lo del ícono del remitente y que quedó parqueado a septiembre porque exige DMARC estricto y un certificado de paga anual.

Y una pregunta abierta para cuando toque BIMI: **si ATP está registrada como marca en el IMPI.** De eso depende si va certificado VMC o CMC.
