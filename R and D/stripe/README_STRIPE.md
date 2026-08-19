# Productos de Stripe para ATP

**Fecha:** 14 de agosto de 2026

---

## 🔴 Primero, el hallazgo que hay que atender

Los dos únicos pagos que han existido en producción, el **5 y el 10 de agosto**, fallaron los dos con el mismo error: `missing_or_invalid_tier_metadata`. Nadie recibió tier, ni código, ni correo.

**La causa está en el contrato del webhook**, y viene documentada en su propio encabezado:

```
metadata.tier = 'base' | 'pro' | 'clinician'   (obligatorio)
metadata.duration_days                          (opcional)
```

El Payment Link no traía ese campo, así que el webhook hizo lo correcto: **no adivinó, marcó para revisión y guardó el pago crudo.**

## 🔴 Y aquí está la segunda parte, que es más importante

**El código solo acepta tres tiers: `base`, `pro` y `clinician`.** El catálogo nuevo tiene Individual, Dúo, Familiar, Founder y Empresa. **Si creamos los productos con `tier: 'individual'`, van a fallar exactamente igual.**

La salida es limpia y sale de una decisión que ya tomaste: **como todos los planes traen exactamente lo mismo, todos son el mismo tier.** Lo que cambia entre ellos no son las funciones, son **las plazas y la vigencia**.

Por eso el script manda:

| Campo | Valor | Para qué |
|---|---|---|
| `tier` | **`pro`** para todos | Es lo que el webhook exige y acepta hoy |
| `duration_days` | 35, 370 o 1095 | Vigencia del grant |
| `atp_plazas` | 1, 2 o 4 | **Todavía no lo lee nadie. Ver abajo** |

## ⚠️ Lo que sí requiere tocar código antes de vender Dúo y Familiar

**El webhook genera un solo código por pago.** Para Dúo y Familiar hacen falta dos y cuatro.

| Plan | ¿Funciona hoy sin tocar código? |
|---|---|
| **Individual mensual y anual** | ✅ Sí |
| **Founder, 36 meses** | ✅ Sí, es pago único con `duration_days: 1095` |
| **Dúo** | ❌ Falta que el webhook lea `atp_plazas` y genere N códigos |
| **Familiar** | ❌ Lo mismo |

**Es un cambio chico** dentro de `handlePaymentSucceeded`: leer `metadata.atp_plazas`, y en vez de un `createPaymentCode`, hacer un ciclo. La idempotencia ya está resuelta arriba, así que no se rompe nada.

---

## Cómo correrlo

```bash
npm i stripe
STRIPE_SECRET_KEY=sk_test_...  node crear-productos.mjs   # primero en modo prueba
STRIPE_SECRET_KEY=sk_live_...  node crear-productos.mjs   # después en vivo
```

**Es idempotente.** Busca los productos por `metadata.atp_id` y los precios por `lookup_key`, así que lo puedes correr las veces que quieras sin duplicar. Al final imprime una tabla con los enlaces listos para copiar.

## Lo que crea

| Producto | Precio | Monto | Vigencia |
|---|---|---|---|
| ATP Individual | mensual | $890 | 35 días |
| ATP Individual | anual | $7,900 | 370 días |
| ATP Dúo | mensual | $1,490 | 35 días |
| ATP Dúo | anual | $12,900 | 370 días |
| ATP Familiar | mensual | $2,790 | 35 días |
| ATP Familiar | anual | $24,900 | 370 días |
| ATP Founder | pago único | $8,900 | **1,095 días** |

El metadata va en **cuatro** lugares: producto, precio, payment link y `subscription_data`. El del payment link es el que llega a `checkout.session.completed`, y el de `subscription_data` es el que hace que el tier viaje también en cada `invoice.paid` de las renovaciones.

## Lo que queda a mano en el dashboard

1. **Meses sin intereses** en Settings, Payment methods, para los precios anuales. Recuerda que la comisión la absorbes tú: 4.69% a 3 meses, 7.69% a 6 y 12.89% a 12.
2. **SPEI y OXXO**, si los quieres cobrar dentro de Stripe.
3. **Confirmar el endpoint del webhook** apuntando a `payment-webhook`, escuchando `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed` y `customer.subscription.deleted`.
4. **Una alerta** cuando un pago caiga en `needs_review`. Eso es lo que hizo que los dos pagos de agosto pasaran desapercibidos.

## Y una prueba que hay que hacer sí o sí

**Antes de publicar, un pago de punta a punta en modo prueba**: comprar, ver que el evento llegue, que se cree el `tier_grant`, que salga el `activation_code` y que llegue el correo. **Si ese circuito no cierra una vez, no cierra sesenta veces.**
