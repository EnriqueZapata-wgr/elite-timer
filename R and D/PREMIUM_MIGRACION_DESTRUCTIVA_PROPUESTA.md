# Migración destructiva propuesta — NO APLICADA

Fecha: 16-ago-2026 · Contexto: paso a membresía única
Estado: **propuesta. Nada de esto se corrió ni se dejó en `supabase/migrations/`.**

La migración que sí se escribió (`290_membresia_unica.sql`) es puramente
aditiva: acepta la etiqueta `premium` y apaga la venta de paquetes de H+. No
borra un solo registro.

Lo que sigue es lo que alguien podría querer hacer después. Cada punto tiene
lo que se gana y lo que se pierde, porque ninguno es obviamente correcto.

---

## 1. Borrar las tablas de protones

```sql
-- NO EJECUTAR SIN DECISIÓN EXPLÍCITA
DROP TABLE public.proton_transactions;
DROP TABLE public.proton_balance;
DROP TABLE public.proton_action_costs;
DROP TABLE public.proton_packages;
DROP TABLE public.pro_boosts;
```

**Se gana:** un esquema más chico y cero confusión para quien lo lea en un año.

**Se pierde, y es lo importante:** hay personas con saldo de H+ que compraron
con dinero real y personas con historial de transacciones. Ese historial es la
única evidencia de qué compró cada quien. Si mañana alguien reclama una recarga
que pagó y nunca recibió, sin esas tablas no hay forma de verificarlo ni de
responderle.

**Recomendación: no hacerlo.** El costo de conservarlas es unos megabytes.

---

## 2. Reescribir `profiles.tier` a `'premium'`

```sql
-- NO EJECUTAR SIN DECISIÓN EXPLÍCITA
UPDATE public.profiles SET tier = 'premium'
WHERE tier IN ('base', 'pro', 'clinician');
```

**Se gana:** una sola etiqueta en la base, consistente con la app.

**Se pierde:** saber quién había comprado Base y quién Pro. Eso importa para
dos cosas concretas: calcular qué le debe la empresa a quien pagó más por menos
tiempo, y entender la cohorte de precio si algún día se revisa.

No hace falta técnicamente: el código ya traduce cualquier etiqueta pagada a
membresía vigente (`tierFromProfile` en `src/services/subscription/tier-logic.ts`,
y su espejo en `argos-proxy` y `mente-audio-url`).

**Recomendación: no hacerlo**, o hacerlo copiando antes la columna a
`profiles.tier_historico`.

---

## 3. Revocar los RPC de gasto de protones

```sql
-- NO EJECUTAR SIN DECISIÓN EXPLÍCITA
REVOKE ALL ON FUNCTION public.spend_protons(uuid, bigint, text, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.convert_electrons_to_protons(uuid, bigint) FROM authenticated;
REVOKE ALL ON FUNCTION public.activate_pro_boost(uuid, bigint, integer) FROM authenticated;
```

**Se gana:** superficie de ataque más chica. Hoy esas funciones ya no se llaman
desde ningún lado, pero siguen expuestas y un cliente modificado podría moverle
el saldo a alguien.

**Se pierde:** poco. El riesgo real es que el test de superficie
(`src/services/__tests__/mbsec1-superficie.test.ts`) verifica que esas funciones
existan con sus guards, y hay que reapuntarlo en el mismo movimiento.

**Recomendación: sí hacerlo, pero como su propio cambio**, no colado en esta ola.
Es endurecimiento de seguridad, no desmontaje de producto, y merece revisarse
con esa cabeza.

---

## 4. Lo que hay que decidir antes que nada

Dos preguntas que no son técnicas y que nadie más puede contestar:

1. **¿Qué pasa con el saldo de H+ que la gente compró y no gastó?** Las opciones
   son reembolsar, convertirlo a meses de membresía, o nada. Mientras no se
   decida, el saldo sigue intacto en la base y visible en la exportación de
   datos, que es la posición honesta.

2. **¿Y las recargas pagadas que nunca se acreditaron?** Existía
   `reclaim-hplus`, una función que consultaba RevenueCat y acreditaba compras
   de consumibles perdidas. El cliente que la llamaba se retiró con la tienda.
   Si alguien pagó una recarga que nunca recibió, hoy no tiene por dónde
   reclamarla desde la app. La edge function sigue desplegada y se puede
   invocar a mano para resolver casos uno por uno.
