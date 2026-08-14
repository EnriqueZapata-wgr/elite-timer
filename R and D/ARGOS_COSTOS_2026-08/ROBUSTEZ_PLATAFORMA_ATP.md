# ¿Aguanta la plataforma 100 o 500 personas de golpe?
## Auditoría de pagos, correo, alta y notificaciones, contra código y producción

**Fecha:** 14 de agosto de 2026
**Método:** lectura del repo con cita de archivo, más consultas de solo lectura a producción (`itqkfozqvpwikogggqng`, Postgres 17.6, us-east-1, `ACTIVE_HEALTHY`).

---

# 0 · 🔴 La respuesta corta es que la pregunta está mal planteada

**No es si aguanta 500. Es que no ha aguantado 1.**

| Tabla | Filas hoy |
|---|---|
| `payment_webhook_events` | **2** |
| **`tier_grants`** | **0** |
| **`activation_codes`** | **0** |
| **`subscription_events`** | **0** |

Y los dos únicos eventos de pago que han existido:

| Fecha | Proveedor | Evento | Estado | Error |
|---|---|---|---|---|
| **5 ago 2026** | Stripe | `checkout.session.completed` | **`needs_review`** | `missing_or_invalid_tier_metadata` |
| **10 ago 2026** | Stripe | `checkout.session.completed` | **`needs_review`** | `missing_or_invalid_tier_metadata` |

> ## **Dos de dos fallaron. El 100%.**
> **Dos personas completaron un pago en Stripe y ninguna recibió tier, ni código de activación, ni correo.** `email_status` está en `null` en las dos.

**Esto hay que atenderlo hoy, y en dos frentes:** arreglar la causa, y **hablarle a esas dos personas**, que pagaron el 5 y el 10 de agosto y siguen sin nada.

## La causa, y es buena noticia

**No es un bug de código. Es configuración del lado de Stripe.** El webhook está pidiendo un campo `tier` en el metadata de la sesión y no lo está recibiendo, así que el código hace exactamente lo correcto: no adivina, marca `needs_review` y guarda el payload crudo.

**Se arregla poniendo el metadata en el Payment Link o en el Price de Stripe.** Es media hora. **Lo que no se arregla solo es que nadie lo había visto**, y eso sí es un problema de proceso: **no hay alerta cuando un pago cae en `needs_review`.**

---

# 1 · Lo que sí está bien construido, y es bastante

**No es un producto frágil. Es un producto bien hecho al que nunca le ha pasado la corriente.**

## Pagos

`supabase/functions/payment-webhook/index.ts`, 622 líneas:

| | |
|---|---|
| Proveedores | **Stripe y Conekta**, en el mismo endpoint |
| Verificación de firma | HMAC-SHA256 propia, con tolerancia de 5 minutos (líneas 79-108) |
| **Idempotencia** | **Índice único `(provider, event_id)`** con upsert `ignoreDuplicates` (líneas 476-490) |
| Auditoría | **Guarda el payload crudo siempre**, pase lo que pase |
| Procesamiento | En segundo plano con `EdgeRuntime.waitUntil` (línea 509) |
| Si falla | Responde 500 **para que el proveedor reintente** |
| Dónde escribe | `tier_grants` y `activation_codes` vía RPC `apply_effective_tier`, **nunca directo a `profiles`** |

**Eso es arquitectura de pagos correcta.** Idempotente, auditable y con reintento. **Si un pico de 500 pagos entra al mismo tiempo, esta función no se cae ni duplica cobros.**

## El alta de usuario

| | |
|---|---|
| `app/register.tsx` | **Self-service puro.** `supabase.auth.signUp` directo, sin aprobación manual ni cola |
| Trigger `handle_new_user()` | Liviano, con tres bloques try/catch independientes que no tumban el alta si algo falla |
| **¿Llama a IA al registrarse?** | **No.** Verificado, y hay un test en CI que lo garantiza |

> **Ese último punto es el que salva el escenario de 500.** Si el onboarding disparara una llamada a un modelo, 500 altas serían 500 llamadas simultáneas y un pico de costo. **No pasa.** `personalize-interventions.ts` es 100% determinístico y el test lo verifica.

## Notificaciones de agenda

`dispatch-agenda-notifications/index.ts`, 470 líneas, está endurecida en serio: **lotes de 100, reintento con backoff, corta-circuitos si más de la mitad de los lotes falla, cola de mensajes muertos con invalidación automática de tokens, enfriamiento de 30 minutos por usuario, y tope de 500 registros por corrida.**

## Seguridad

**Cero advertencias de nivel ERROR.** Nueve tablas con RLS activo y sin política, que significa cerradas, no abiertas. Lo único accionable: **la protección contra contraseñas filtradas está apagada** y se enciende con un clic.

---

# 2 · 🔴 Qué se rompe primero con 100 personas de golpe

## Uno. El correo. Y es el que de verdad importa

| | |
|---|---|
| SMTP propio configurado | **No.** `supabase/config.toml` no tiene bloque `[auth]` con SMTP |
| Quién manda la confirmación de cuenta | **El mailer compartido de Supabase** |
| Qué dice Supabase de ese mailer | Que es **para desarrollo**, con un límite de unos pocos correos por hora ⚠️ |
| Proveedor transaccional que sí existe | **Resend**, pero **solo dentro de `payment-webhook`** (líneas 116-146), únicamente para el código de activación |

> **Sin correo de confirmación, la persona no entra. Y con 100 altas en una tarde, la mayoría no lo recibe.**

**La ironía es que ya tienes Resend integrado y con llave.** Falta apuntarlo como SMTP de Auth, que es una pantalla de configuración.

⚠️ *El límite exacto hay que confirmarlo en el dashboard, porque cambia por plan. La conclusión no cambia: **el mailer compartido no es para producción y Supabase lo dice.***

## Dos. No existe el día uno

**No hay correo de bienvenida.** La única referencia en todo el repo es un `TODO(#132)` sin implementar en `account-deletion-processor/index.ts` línea 136.

**Eso choca de frente con lo que decidimos para la sensación premium**, donde el mensaje de bienvenida del día uno era uno de los seis puntos. **Hoy la persona paga, entra, y no la saluda nadie.**

## Tres. El push prácticamente no existe

| | |
|---|---|
| `profiles` | 13 |
| `user_notification_tokens` | **2** |

**Dos dispositivos pueden recibir una notificación.** Si el push es el canal de acompañamiento diario, hoy no hay canal. **Y el permiso se pide una sola vez: si no se pide bien en el onboarding, se perdió.**

## Cuatro. Deuda conocida y confesada

`dispatch-social-notifications/index.ts` manda en lotes de 100 pero **sin reintento ni corta-circuitos**. El comentario en la línea 11 del propio archivo lo dice: *"sin el hardening v7 de agenda: deuda"*. **Con 500 miembros activos, ese es el que truena.**

## Cinco. RevenueCat, dos detalles

**Nunca ha disparado**, `subscription_events` está en 0. Y cuando dispare: el insert de auditoría **no es idempotente por `event.id`**, así que un reintento duplica filas (no corrompe el tier, la parte de `tier_grants` sí está protegida). Además el bearer se compara sin comparación de tiempo constante.

## Seis. Cuatro perfiles huérfanos

**`profiles` tiene 13 filas y `auth.users` tiene 9.** Cuatro perfiles sin usuario. Con 13 filas es una curiosidad. **Con 500 es un problema de conteo, de facturación y de reportes**, y hay que entender de dónde salen antes de escalar.

---

# 3 · ✅ La buena noticia para la ronda Founder

**La ronda de 60 no depende del bug de Stripe.**

Se cobra por SPEI, o sea por transferencia, que ya se conciliaba a mano de todos modos. Y el camino manual existe y está construido: **`tier_grants` más `activation_codes` más el RPC `apply_effective_tier`.**

> **Se pueden generar 60 códigos de activación a mano y mandarlos. Hoy. Sin tocar Stripe.**

**Lo que sí bloquea el bug es el lanzamiento público de $890 y $7,900**, porque ahí el cobro sí pasa por Checkout.

---

# 4 · Entonces, ¿aguanta 100? ¿Aguanta 500?

| Componente | 100 de golpe | 500 de golpe |
|---|---|---|
| Base de datos | ✅ De sobra | ✅ De sobra |
| Alta y creación de perfil | ✅ Liviano y sin IA | ✅ |
| Webhook de pagos | ✅ Idempotente y con reintento | ✅ **cuando se arregle el metadata** |
| **Correo de confirmación** | 🔴 **Se satura** | 🔴 **Se satura** |
| Correo de bienvenida | 🔴 No existe | 🔴 No existe |
| Push | 🔴 2 tokens | 🔴 2 tokens |
| Notificaciones sociales | ⚠️ Sin reintento | 🔴 Sin reintento |
| Cron de agenda | ✅ Tope de 500 por corrida | ⚠️ **Revisar el tope** |

> **La infraestructura aguanta. La capa de comunicación no.**
> **Y con este producto, la capa de comunicación no es un accesorio: es el producto.**

⚠️ **Pregunta abierta que cambia varios renglones: ¿en qué plan está Supabase, Free o Pro?** El plan define límites de correo, de funciones y si hay respaldo. **Es un dato tuyo que yo no tengo.**

---

# 5 · Lo que hay que hacer, en orden

| # | Qué | Esfuerzo | Bloquea |
|---|---|---|---|
| **1** | **Poner `tier` en el metadata de Stripe y correr un pago de prueba de punta a punta** | Media hora | **Todo el lanzamiento público** |
| **2** | **Contactar a las dos personas que pagaron el 5 y el 10 de agosto** | Dos mensajes | Es tu reputación |
| **3** | **Alerta cuando un pago caiga en `needs_review`** | Un trigger | Que no vuelva a pasar en silencio |
| **4** | **Apuntar Resend como SMTP de Supabase Auth** | Una pantalla | **Cualquier entrada mayor a 20 personas** |
| **5** | **Escribir y conectar el correo de bienvenida** | Un texto y una función | La sensación premium del día uno |
| **6** | Pedir permiso de push en el onboarding, no después | Una pantalla | Todo el acompañamiento diario |
| **7** | Portar el hardening de agenda a `dispatch-social` | Está el modelo al lado | 500 miembros activos |
| **8** | Entender los 4 perfiles huérfanos | Una consulta | Conteos y facturación |
| **9** | Idempotencia por `event.id` en `revenuecat-webhook` | Un índice único | Solo si vuelve la venta por tienda |
| **10** | Confirmar plan de Supabase y encender protección de contraseñas filtradas | Dos clics | |

---

## La conclusión, en una línea

**Construiste bien la parte difícil y dejaste sin construir la parte fácil.**

El webhook de pagos es mejor que el de muchas empresas con equipo. **Y no hay quien mande un correo de bienvenida.** Los primeros cuatro puntos de la lista se resuelven en un día de trabajo, y sin ellos ninguna ronda de 60 ni de 500 llega completa a la puerta.
