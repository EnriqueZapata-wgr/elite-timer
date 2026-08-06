# 💳 AWAY RUN MB-13 · El puente de pago

**Rama:** `feat/mb13-puente-pago` · worktree propio.
**Por qué existe:** hoy un founder que pague en somosatp.com no tiene forma de quedar con su tier en la app. Se mueve a mano en la base. **Es el bloqueador de la beta.**

## Por qué este brief no depende de la decisión A / B / C

`R and D/DECISION_PUENTE_DE_PAGO.md` plantea tres caminos. **Lo que se construye aquí hace falta en los tres**, y también en la beta de esta semana:

- Si el pago es solo web, esto ES el puente.
- Si es solo compra in-app, esto sigue siendo necesario para founders, afiliados, cortesías y soporte.
- Si es híbrido, que es lo recomendado, esto es exactamente la mitad web.

Lo único que cambia entre escenarios es **quién dispara el alta**. La resolución del tier y el canje del código son los mismos.

## Reglas del run
1. Solo `str_replace` quirúrgico, nunca reescribir archivos completos.
2. Migraciones **idempotentes** (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`) y con RLS obligatoria: cada `CREATE TABLE` lleva su `ENABLE ROW LEVEL SECURITY` y su policy.
3. `generateUUID`, nunca `crypto.randomUUID`. `getLocalToday()` / `parseLocalDate()` para fechas.
4. `npx tsc --noEmit` en verde antes de cada commit.
5. **Cero em dash en copy de usuario.**
6. Nada de esto puede resolverse en el cliente. El tier lo decide el servidor, siempre.

---

# PIEZA 1 · Códigos de activación

## 1.1 · Tabla

`activation_codes`, con RLS:

| Columna | Notas |
|---|---|
| `code` | Único. Legible en voz alta: sin 0/O ni 1/I/l. Formato `ATP-XXXX-XXXX` |
| `tier` | `base` / `pro` / `clinico` |
| `duration_days` | Null significa sin vencimiento |
| `max_uses` | Default 1 |
| `used_count` | Default 0 |
| `expires_at` | Vencimiento del código, distinto del vencimiento del tier |
| `source` | `founder` / `afiliado` / `cortesia` / `soporte` |
| `issued_to_email` | Opcional: a quién se le mandó |
| `redeemed_by` | Array de user_id |
| `metadata` | jsonb |

**Policy:** el usuario **no** puede leer esta tabla. El canje pasa por RPC con `security definer`. Un usuario que pueda listar códigos, los canjea todos.

## 1.2 · RPC de canje

`redeem_activation_code(p_code text)`, `security definer`, que:
1. Normaliza a mayúsculas y quita guiones y espacios. La gente los teclea como quiere.
2. Valida: existe, no vencido, `used_count < max_uses`, y **este usuario no lo canjeó antes**.
3. Escribe `profiles.tier` y `tier_expires_at` calculado con `duration_days`.
4. Incrementa `used_count` y agrega el user_id a `redeemed_by`, **en la misma transacción**.
5. Devuelve un resultado tipado: `ok` / `not_found` / `expired` / `exhausted` / `already_redeemed`.

**Nunca devuelvas un mensaje genérico.** Cada caso tiene copy propio: alguien que ya lo canjeó necesita oír algo distinto de alguien que se equivocó de código.

## 1.3 · Pantalla de canje

En Ajustes, junto a Suscripción. Y **también accesible desde el paywall**, porque ahí es donde va a estar quien pagó y no ve su plan.

Copy sugerido, ajústalo si suena a máquina:
> **Tengo un código**
> Si compraste en la web o te invitaron, aquí lo activas.

Estados: cargando, y uno por cada resultado del RPC. Con `haptic.success()` **después** de confirmar, nunca antes.

Al terminar: `DeviceEventEmitter.emit('day_changed')` y refrescar el tier en memoria sin pedir que reinicie la app.

---

# PIEZA 2 · La resolución del tier deja de ser un lugar

Hoy el tier vive en `profiles.tier` y lo tocan RevenueCat, esta pieza nueva y las manos de Enrique. **Tres escritores sobre un campo y ningún árbitro.**

## 2.1 · Fuente única

Una función server-side que resuelva el tier efectivo con esta precedencia:

1. **Suscripción activa de RevenueCat** — si existe y está vigente, gana.
2. **Tier por código o webhook** — si está vigente (`tier_expires_at` nulo o futuro).
3. **`free`**.

El cliente **no** calcula esto. Lo consulta. `argos-proxy/index.ts:318-343` ya resuelve el tier desde el servidor y es el patrón correcto: cópialo, no lo reinventes.

## 2.2 · Que el vencimiento se aplique solo

Hoy nada baja a alguien cuando su `tier_expires_at` pasa. Un cron diario que degrade a `free` a quien venció, con su registro en una tabla de historial.

**Sin esto, cualquier cortesía es permanente.**

---

# PIEZA 3 · Webhook de pago web

> Solo si la decisión es B o C. Si es A, se salta y se retoma después.

## 3.1 · Edge function `payment-webhook`

Recibe Stripe y Conekta. Requisitos que no son negociables:

**Verificar la firma.** Un webhook sin verificación de firma es un endpoint donde cualquiera se regala Pro.

**Idempotente.** Los proveedores reintentan. Guarda el `event_id` en una tabla y si ya lo procesaste, responde 200 y no hagas nada. **Un cobro no puede dar dos meses.**

**Responder rápido.** Confirma recepción y procesa después. Si tardas, el proveedor reintenta y multiplicas el problema.

**Guardar el payload crudo** en una tabla de eventos, como ya hace `revenuecat-webhook`. Cuando algo se caiga, ese registro es la única forma de saber qué pasó.

## 3.2 · El amarre entre el pago y la cuenta

**Aquí es donde se rompen estos sistemas.** El correo del checkout y el del registro en la app no siempre coinciden, y cuando no coinciden, alguien pagó y no entra.

El flujo que resuelve las dos cosas:

1. Llega el pago.
2. Se genera un `activation_code` de un uso, atado a ese pago.
3. **Se manda por correo al que pagó**, con instrucciones de una línea.
4. Si además el correo coincide con una cuenta existente, se le aplica el tier directo **y aun así se le manda el código**, por si tiene otra cuenta.

Así, el código funciona sin importar con qué correo se registre. Y sirve igual para la beta de esta semana, donde no hay webhook todavía y los códigos se generan a mano.

## 3.3 · La baja

Cancelación o cobro fallido en Stripe tiene que quitar el tier. **Si no, regalas Pro para siempre.**

Respeta la vigencia pagada: quien canceló a mitad del mes conserva hasta que termine. Bajarlo el mismo día es una forma barata de perder a alguien que quizá regresaba.

---

# PIEZA 4 · Que Enrique pueda emitir códigos sin abrir la base

Un RPC de admin (gated por `profiles.role = 'admin'`) que genere lotes:

```
generate_activation_codes(
  p_count int, p_tier text, p_duration_days int,
  p_source text, p_expires_at timestamptz
)
```

Devuelve la lista de códigos. Con eso emites los de los founders sin escribir SQL a mano cada vez.

**Fuera de alcance de este run:** una pantalla de administración. El RPC basta por ahora.

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: qué quedó, con archivo y línea, y el resultado de `tsc`.

**Verificación obligatoria, no la des por hecha:**
1. Un código de un uso se canjea una vez y a la segunda dice "ya lo usaste".
2. Dos usuarios distintos con el mismo código de un uso: el segundo recibe `exhausted`.
3. Un código vencido no aplica nada.
4. Un tier con `tier_expires_at` en el pasado se degrada solo al correr el cron.
5. El mismo evento de webhook procesado dos veces deja el tier igual, no acumula.
6. **Un usuario normal no puede leer `activation_codes`.** Intenta un select con RLS activa y confirma que devuelve vacío.

**Lo que NO entra:** la pantalla de administración, el sistema de afiliados completo, y los datos fiscales del contrato.
