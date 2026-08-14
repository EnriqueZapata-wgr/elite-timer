# Alta manual en somosatp.com
## La pantalla desde la que Enrique da de alta a alguien como si hubiera pagado por Stripe

**Fecha:** 14 de agosto de 2026
**Para qué:** vender por transferencia, en persona o por WhatsApp, y que el sistema reaccione **exactamente igual** que si el pago hubiera entrado por Checkout.

---

# 0 · La lista de precios que queda fijada

| Plazas | **Por plaza** |
|---|---|
| 1 · Individual | **$890** |
| 2 · Dúo | **$790** |
| 3 a 4 · Familiar | **$750** |
| 10 a 49 · Empresa | $740 |
| 50 a 199 | $690 |
| 200 a 499 | $590 |
| 500 o más | **$445**, el piso |

| Paquete | Mensual | Anual |
|---|---|---|
| Individual | $890 | $7,900 |
| Dúo | $1,580 | $13,900 |
| Familiar 3 | $2,250 | $19,900 |
| Familiar 4 | $3,000 | $26,900 |
| **Founder** | | **$8,900 por 36 meses**, 60 plazas |

**El individual se queda en $890, así que la geometría del Founder no se movió:** $890 × 10 = $8,900, diez meses pagados y treinta y seis recibidos, 72.2% de descuento.

---

# 1 · ✅ La buena noticia: esto ya está construido en un 80%

`payment-webhook/index.ts` **ya hace toda la secuencia que quieres.** Recibe un pago, crea el `tier_grant`, genera el `activation_code`, y manda el correo por Resend.

> **Lo que falta no es la tubería. Es una llave para abrirla a mano.**

## 🔴 Y por eso la regla de arquitectura más importante de todo este documento

> ## **No se construye un camino nuevo. Se le pone una segunda entrada al que ya existe.**

Si el alta manual escribe por su cuenta en `tier_grants`, en seis meses vas a tener **dos versiones de la misma lógica** que se van separando: una manda correo y la otra no, una calcula la fecha de vencimiento de una forma y la otra de otra, y vas a tener que arreglar cada bug dos veces.

**La forma correcta:**

1. Sacar la lógica de otorgamiento de `payment-webhook` a un módulo compartido, `_shared/grant-membership.ts`.
2. `payment-webhook` lo llama cuando entra Stripe o Conekta.
3. Una función nueva, **`admin-grant`**, lo llama cuando lo activas tú.
4. **Las dos entradas, la misma tubería.** Mismos correos, misma idempotencia, misma auditoría.

---

# 2 · Idempotencia, y aquí hay un truco elegante

La tabla `payment_webhook_events` ya tiene un **índice único en `(provider, event_id)`**. Se reutiliza tal cual:

| Campo | Qué se le pone en un alta manual |
|---|---|
| `provider` | `manual` |
| `event_id` | **`manual:CLAVE-DE-RASTREO-SPEI`** |
| `raw_payload` | El formulario completo, tal como lo llenaste |

> **Si capturas dos veces la misma transferencia, la base la rechaza sola. No hay forma de darle doble membresía a nadie por error.**

Y `raw_payload` guardando el formulario **te deja la evidencia de la venta para siempre**, que es exactamente lo que hace el webhook con los pagos de Stripe.

---

# 3 · La pantalla, campo por campo

## Bloque 1 · Quién

| Campo | Tipo | Nota |
|---|---|---|
| Nombre completo | texto | |
| **Correo** | email | **Es la llave.** Con esto se busca o se crea el usuario |
| WhatsApp | teléfono con lada | Para el enlace de envío |
| ¿Cómo llegó? | select | orgánico, referido, empresa, evento. Sirve después |

## Bloque 2 · Qué compró

| Campo | Tipo | Nota |
|---|---|---|
| **Paquete** | select | Individual, Dúo, Familiar 3, Familiar 4, Empresa, **Founder** |
| **Periodo** | select | Mensual, Anual, **36 meses (Founder)** |
| Plazas | número | **Se llena solo** desde el paquete. Editable solo en Empresa |
| **Monto cobrado** | número | **Se llena solo** con el precio de lista. Editable, y si cambias se pide una nota |
| Fecha de inicio | fecha | Por defecto hoy |

🔴 **Los precios se leen de una sola fuente**, la misma que usa la app y la que usará la página pública. **Nunca escritos a mano en el formulario**, porque el día que cambien vas a tener tres listas distintas.

## Bloque 3 · Cómo pagó

| Campo | Tipo | Nota |
|---|---|---|
| **Método** | select | SPEI, efectivo, terminal, cortesía, canje |
| **Referencia** | texto | **Clave de rastreo del SPEI o folio.** Obligatoria salvo cortesía. **Es la llave de idempotencia** |
| Fecha del pago | fecha | |
| Comprobante | archivo, opcional | Se guarda en Storage |
| Notas internas | texto largo | Solo tú lo ves |

## Bloque 4 · Qué se dispara

| Casilla | Por defecto |
|---|---|
| ☑ Enviar correo de bienvenida con el código | **encendida** |
| ☑ Registrar consentimiento del titular | **encendida y obligatoria** |
| ☐ Preparar mensaje de WhatsApp | apagada, y si la enciendes te da el enlace listo |

---

# 4 · Qué pasa cuando le das a "Dar de alta"

| # | Paso | Si falla |
|---|---|---|
| 1 | Verifica que quien llama es administrador | Corta ahí |
| 2 | **Busca `manual:REFERENCIA`.** Si ya existe, muestra el resultado anterior | **No duplica nada** |
| 3 | Registra el evento con el formulario completo en `raw_payload` | Aborta antes de tocar nada más |
| 4 | Busca el usuario por correo, y si no existe lo crea | |
| 5 | Crea el `tier_grant` con tier, plazas y vigencia | Marca `needs_review` |
| 6 | Ejecuta `apply_effective_tier` | |
| 7 | **Genera un `activation_code` por plaza** | |
| 8 | Manda el correo de bienvenida por Resend | **`email_status = pending_manual`**, no se pierde el alta |
| 9 | Te devuelve en pantalla: **los códigos, el estado del correo y el botón de WhatsApp** | |

> **Ningún paso posterior puede borrar el registro del paso 3. Aunque todo lo demás truene, la venta queda asentada.**

---

# 5 · Los correos, que hoy no existen

**Resend ya está integrado y con llave.** Falta escribir tres cosas y apuntarlo como SMTP de Supabase Auth.

| Correo | Cuándo | Qué lleva |
|---|---|---|
| **Bienvenida** | Al instante | Su código, el enlace de descarga, y **una pregunta de vuelta**, no un folleto |
| **Recordatorio** | A las 48 horas, si no activó | Un solo empujón. No tres |
| **Aviso de renovación** | **5 días naturales antes de cada cobro** | **Requisito de ley desde el 13 de diciembre de 2025** |

**El tercero no aplica al Founder ni al anual prepagado dentro del plazo**, porque no hay cobro recurrente. **Sí aplica al mensual desde el primer día.**

⚠️ **Estás en Supabase Pro, pero el mailer de Auth sigue siendo el compartido si no configuras SMTP propio.** Apuntar Resend es una pantalla de configuración y es lo que evita que 60 altas se queden sin correo. **Confirma también si tu cuenta de Resend está en el plan gratuito**, porque ahí hay tope diario.

---

# 6 · WhatsApp, en dos fases, y la primera es hoy

## Fase 1 · El enlace, que no cuesta ni requiere permiso de nadie

La pantalla genera un enlace `wa.me` con el mensaje ya escrito, con su nombre y su código. **Tú das clic y se abre WhatsApp con todo listo. Mandas tú.**

| | |
|---|---|
| Costo | **cero** |
| Aprobación de Meta | **ninguna** |
| Tiempo de construcción | **una tarde** |

> **Para 60 founders vendidos uno a uno a gente cercana, esto no es el parche. Es lo correcto.**
> **Un mensaje que mandaste tú vale más que uno automático, y la ronda es de personas cercanas.**

## Fase 2 · La API, cuando haya volumen

Manda solo, con plantillas aprobadas. Pero antes hay que aceptar lo que pide:

| Requisito | Nota |
|---|---|
| Cuenta de WhatsApp Business y número dedicado | No puede ser tu número personal |
| **Verificación de negocio con Meta** | 🔴 **Necesita la sociedad constituida.** Igual que el B2B |
| Plantillas de utilidad aprobadas una por una | Días de revisión |
| Regla de la ventana de 24 horas | Fuera de ella, solo plantillas |

**No arranques por aquí.** La Fase 1 te resuelve los primeros cien miembros.

---

# 7 · 🔴 Seguridad: lo que NO se hace

**Esta pantalla puede regalar membresías. Si se filtra, cualquiera se da de alta gratis.**

| Nunca | Siempre |
|---|---|
| 🔴 **La llave `service_role` en la página de Hostinger** | La página usa la llave pública. La `service_role` vive **solo dentro de la función** |
| 🔴 Comprobar "si el correo es el de Enrique" en el navegador | **La función verifica el rol contra la base**, del lado del servidor |
| 🔴 Confiar en la contraseña de carpeta de Hostinger | Sesión de Supabase Auth, con enlace mágico a tu correo |
| 🔴 Que el precio venga del formulario sin validar | **La función revalida** el monto contra la lista oficial y marca si no cuadra |
| | **Cada alta guarda quién la hizo, desde dónde y cuándo** |

**Y la arquitectura sale barata justamente por esto:** la página es HTML y JavaScript estáticos con `supabase-js` desde CDN. **No necesita servidor, no necesita PHP y no guarda un solo secreto.** Hostinger nada más sirve el archivo.

---

# 8 · La segunda pantalla, que vale tanto como la primera

**Una lista. Sin ella no vas a poder manejar 60 founders.**

| Columna | Para qué |
|---|---|
| Nombre, correo, paquete, monto | Lo básico |
| **¿Activó?** | **La columna que más vas a mirar** |
| Días desde el alta sin activar | A quién le hablas hoy |
| Códigos usados y sin usar | Para Dúo, Familiar y Empresa |
| Vence el | Renovaciones |
| Estado del correo | Quién no lo recibió |
| **Contador: 47 de 60 plazas** | La promesa que le hiciste a cada founder |

> **Vender 60 plazas y que 20 nunca activen es el peor escenario de la ronda, y sin esta pantalla no te enteras hasta que es tarde.**

---

# 9 · Paquetes de varias plazas

Un Familiar de 4 genera **cuatro códigos**, no uno.

**Lo más simple que funciona:** el titular recibe los cuatro en su correo y los reparte. **Cada código crea una cuenta independiente**, con su propia privacidad y sus propios datos de salud, colgada del mismo `tier_grant`.

🔴 **Y la línea que no se cruza, que ya estaba puesta: el titular paga, pero no ve la salud de nadie.** Ni de su pareja ni de sus hijos. **Comparten membresía, no expediente.**

---

# 10 · Orden de construcción

| # | Qué | Esfuerzo | Qué desbloquea |
|---|---|---|---|
| **1** | Sacar la lógica a `_shared/grant-membership.ts` | Medio día | Que no haya dos verdades |
| **2** | Función `admin-grant` con verificación de rol e idempotencia | Un día | El corazón |
| **3** | Apuntar Resend como SMTP de Supabase Auth | **Una pantalla** | Que los correos lleguen |
| **4** | Escribir el correo de bienvenida | Un texto | El día uno del miembro |
| **5** | La pantalla de alta, estática en somosatp.com | Un día | **Ya puedes vender** |
| **6** | El botón de WhatsApp con `wa.me` | Una tarde | El canal que sí abren |
| **7** | La pantalla de lista | Un día | Manejar la ronda |
| **8** | Arreglar el metadata de Stripe | Media hora | El lanzamiento público |
| 9 | Correo de recordatorio a 48 horas | Medio día | Activación |
| 10 | Aviso de 5 días antes de renovar | Medio día | Requisito legal del mensual |

**Del 1 al 6 son unos cuatro días de trabajo.** Y al terminarlos:

> **Puedes vender los 60 founders por transferencia, cobrar, dar de alta, mandar el código y darles la bienvenida, sin depender de Stripe ni de la tienda de apps.**

---

## Lo que esto cambia de fondo

**Hoy dependes de que una pasarela funcione para poder vender. Con esto, la pasarela pasa a ser una comodidad.**

El camino manual no es el plan B: **es el camino principal de la ronda Founder, porque a personas cercanas se les cobra por transferencia y se les habla por WhatsApp.** Stripe entra después, cuando le vendas a alguien que no conoces.

**Y de paso, el bug del metadata deja de ser un bloqueo y se vuelve un pendiente.**
