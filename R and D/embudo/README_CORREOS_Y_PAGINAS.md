# Correos y páginas del embudo · ATP

**21 de agosto de 2026 · segunda pasada, con las correcciones de auditoría aplicadas**

Cinco correos y tres páginas. Todo autocontenido, sin librerías externas, para que entren a Hostinger sin tocar nada del sitio que ya está publicado.

---

## Lo primero, porque bloquea todo lo demás

**Hay dos listas de precios distintas viviendo en el repo y no coinciden.**

| Plan | `stripe/crear-productos.mjs` | `ALTA_MANUAL_ATP.md` |
|---|---|---|
| Individual mensual | $890 | $890 |
| Individual anual | $7,900 | $7,900 |
| **Dúo mensual** | **$1,490** | **$1,580** |
| **Dúo anual** | **$12,900** | **$13,900** |
| **Familiar mensual** | **$2,790** (4 plazas) | **$2,250** (3) · **$3,000** (4) |
| **Familiar anual** | **$24,900** (4 plazas) | **$19,900** (3) · **$26,900** (4) |
| Founder | $8,900 / 36 meses | $8,900 / 36 meses |

El script de Stripe no contempla Familiar de tres plazas, y donde sí coinciden en concepto difieren en monto. El que corras primero es el que queda vivo, y el otro se vuelve una promesa que alguien va a cobrarte. **Esto se decide antes de correr `crear-productos.mjs` en modo vivo**, porque después ya hay precios publicados con `lookup_key` y moverlos implica crear precios nuevos y desactivar los viejos.

---

## Los cinco correos

Están en `correos/`. Cada uno viene en tres piezas: el HTML, la versión de texto plano con el mismo nombre y extensión `.txt`, y su línea de asunto en `asuntos.json`.

| Archivo | Asunto | Cuándo sale |
|---|---|---|
| `01-acceso-listo` | Tu acceso a ATP ya quedó | El webhook confirma el pago. Es el correo que cierra la venta |
| `02-comprobante-recibido` | Recibimos tu comprobante | Llega un comprobante de transferencia |
| `03-activacion-pendiente` | Tu pago de ATP sigue sin canjearse | Desde el tablero de rezagados |
| `04-contrasena` | Restablece tu contraseña de ATP | Supabase Auth, recuperación |
| `05-cobro-fallido` | No pudimos cobrar tu renovación | `invoice.payment_failed` |

**Manda siempre las dos partes, HTML y texto.** Resend acepta `html` y `text` en la misma petición. Un correo transaccional sin parte de texto plano sube el puntaje de spam justo en el mensaje que más importa que llegue.

**Los correos están probados contra Outlook.** Los botones llevan su VML para que no colapsen en el motor de Word, la barra de degradado y los separadores llevan `mso-line-height-rule:exactly` para que no se inflen, y hay `bgcolor` de respaldo en cada celda con color. También llevan `color-scheme: light only`, porque sin eso el modo oscuro de Apple Mail invierte la tarjeta clara y el texto se vuelve ilegible.

### Las variables

Los correos del webhook usan llaves dobles simples. Resend no las sustituye solo: el reemplazo se hace donde hoy se arma el texto, en `sendCodeEmail` dentro de `payment-webhook/index.ts`.

| Correo | Variables |
|---|---|
| `01` | `{{nombre}}` `{{codigo}}` `{{vence}}` `{{url_acceso}}` `{{email}}` `{{whatsapp_e164}}` `{{whatsapp_visible}}` |
| `02` | `{{nombre}}` `{{referencia}}` `{{fecha_recepcion}}` |
| `03` | `{{nombre}}` `{{fecha_pago}}` `{{codigo}}` `{{url_acceso}}` |
| `05` | `{{nombre}}` `{{gracia}}` `{{url_portal}}` |

**`04-contrasena` es distinto**, porque no lo manda el webhook sino Supabase, y Supabase usa plantillas de Go. Sus variables ya van escritas en la sintaxis correcta: `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .TokenHash }}`. Se pega tal cual en Authentication, Email Templates, Reset Password. La liga se arma con `token_hash` a propósito y no con `{{ .ConfirmationURL }}`, porque los escáneres de seguridad de los correos corporativos abren las ligas antes que la persona y queman el enlace de un solo uso. Con `token_hash` eso no pasa.

`{{whatsapp_e164}}` es el número sin signos ni espacios, como `5214421234567`. `{{whatsapp_visible}}` es el mismo número como lo lee un humano. **Ese mismo par de nombres se usa en las páginas**, para que no haya dos formas de escribir el mismo dato.

### Dos cosas que hay que arreglar en el código antes de mandar el primero

**La etiqueta del plan está mal.** `sendCodeEmail` construye *ATP Base*, *ATP Pro* o *ATP Clínico*, y esos nombres ya no existen. Desde la migración de membresía única solo hay un nivel, y el catálogo que se vende se llama Individual, Dúo, Familiar y Founder. Hoy alguien que compra Individual recibe la bienvenida a *ATP Pro*, un producto del que nunca oyó hablar. La etiqueta sale de `metadata.atp_id`.

**Sube el logo antes de mandar el primero.** Los correos apuntan a `https://somosatp.com/correo/logo-atp.png` y las páginas a `/correo/logo-atp-blanco.png`. Los dos archivos van en esta entrega, sacados del lockup vertical oficial del repo. Si esa ruta no existe, el correo llega con un cuadro roto donde debería estar la marca.

---

## Las tres páginas

Están en `paginas/`. Modo oscuro, riel de firma con el degradado corriendo toda la altura, Poppins.

**Sube también `htaccess.txt` renombrado a `.htaccess`, con el punto adelante.** Sin él, Hostinger devuelve un 404 a `/mi-acceso/TOKEN` antes de que el navegador alcance a correr nada, y la página nunca aparece. El archivo también habilita `/gracias` y `/reset-password` sin la extensión.

### `gracias.html` → `somosatp.com/gracias`

Es a donde Stripe redirige después del checkout, y hoy esa ruta no existe, así que **todo el que paga aterriza en un 404**. La página confirma el pago, dice qué va a pasar en el próximo minuto, y sobre todo da la salida cuando no pasa: si en cinco minutos no llegó nada, hay un botón de WhatsApp con el mensaje ya escrito.

Stripe ya manda `?plan=individual` en la liga, por si quieres personalizar el texto por plan.

Variables: `{{WHATSAPP_E164}}` y `{{WHATSAPP_VISIBLE}}`.

### `mi-acceso.html` → `somosatp.com/mi-acceso/{token}`

Esta es la pieza que quita el punto único de falla. Hoy, si el correo no llega, la persona no tiene nada. Con esta página, el correo y el WhatsApp dejan de ser el portador del código y pasan a ser dos caminos al mismo lugar.

Necesita un endpoint que reciba el token y devuelva este JSON. La constante `ATP_ENDPOINT` está declarada arriba del script, aislada, para que no la tengas que buscar:

```json
{ "nombre":"Enrique", "codigo":"ATP-7K3M-92QX",
  "vence":"25 de septiembre de 2026",
  "plan":"ATP Individual, mensual", "ya_activada": false }
```

**El token tiene que ser opaco y de un solo propósito.** Nada de correo, nada de teléfono, nada de id de usuario en la liga. Se genera junto con el código de activación, se guarda al lado, y no da acceso a nada más que a esos cuatro campos. La página lo borra del historial en cuanto termina de cargar, corta el intento a los doce segundos si el endpoint no responde, y en cualquier fallo ofrece WhatsApp en vez de dejar a la persona sin salida.

Variables: `{{URL_APP_STORE}}` `{{URL_PLAY_STORE}}` `{{URL_SKOOL}}` `{{URL_FUNCION_ACCESO}}` `{{WHATSAPP_E164}}` `{{WHATSAPP_VISIBLE}}`.

### `reset-password.html` → `somosatp.com/reset-password`

Acepta las tres formas en que Supabase puede mandar el enlace, porque la app móvil y la web no siempre usan el mismo flujo:

Si viene con `?token_hash=`, que es lo que arma la plantilla de correo de esta entrega, la página llama a `POST /auth/v1/verify` y obtiene la sesión. Si viene con el token en el fragmento, que es el flujo implícito de siempre, lo usa directo. Y si viene con `?code=`, que es PKCE, intenta canjearlo con el verificador guardado en ese navegador, y cuando no lo encuentra, que es lo que pasa si el cambio se pidió desde la app, muestra una pantalla que le dice a la persona que abra el correo en el teléfono. Esa última no es un error, es un límite real de PKCE: el verificador vive en el aparato que pidió el cambio y no viaja.

**No carga ninguna librería externa.** Todo va contra la API REST de Supabase con `fetch`. Una página de recuperación que depende de un CDN se queda colgada para siempre el día que el CDN esté bloqueado, y ese día la persona no puede entrar a su cuenta.

También muestra el mensaje de error real de Supabase en vez de tragárselo, que es lo que evita que alguien pida un enlace nuevo cincuenta veces cuando el problema era la contraseña.

Variables: `{{SUPABASE_URL}}` y `{{SUPABASE_ANON_KEY}}`, que son públicas por diseño.

Para que Supabase mande ahí, pon esa URL en Authentication, URL Configuration, Redirect URLs.

---

## Lo que sigue faltando

`/terminos`, `/privacidad` y `/precios` siguen sin existir y están referenciadas desde el código. Las dos primeras son requisito de las tiendas, así que bloquean la publicación de la app además del embudo. `/precios` bloquea la venta el día que alguien pregunte cuánto cuesta y no haya a dónde mandarlo.

Falta también la página que recibe comprobantes de transferencia. Hoy ese camino existe solo en la cabeza de quien atiende el WhatsApp, y el correo `02-comprobante-recibido` promete una revisión que nadie está midiendo. Cuando exista el tablero de rezagados, esa promesa se vuelve medible.
