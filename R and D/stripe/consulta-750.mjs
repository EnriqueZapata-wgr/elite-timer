/**
 * Enlace de pago de $750 MXN para consulta nutricional
 * ------------------------------------------------------------------
 * Ejecuta:   STRIPE_SECRET_KEY=sk_test_... node consulta-750.mjs
 * Antes:     npm i stripe
 *
 * POR QUÉ NO CREA EL PRODUCTO DESDE CERO
 * Ya existe un producto de consulta nutricional en la cuenta. Crear uno
 * paralelo dejaría dos productos con el mismo nombre y precios distintos, y
 * dentro de un mes nadie sabría cuál es cuál en los reportes. Este script
 * BUSCA el que ya está, le agrega un precio nuevo de 750, y genera el enlace.
 *
 * POR QUÉ COPIA LA METADATA EN VEZ DE ESCRIBIRLA
 * El webhook de ATP exige `metadata.tier` con valor base, pro o clinician, y
 * los dos únicos pagos de producción (5 y 10 de agosto) fallaron justamente
 * por no traerlo. PERO una consulta no es una membresía: no debe otorgar tier
 * ni vigencia. Si le pusiéramos `tier: pro` para "que no falle", le estaríamos
 * regalando la membresía a quien paga una consulta.
 * La salida correcta es que el enlace nuevo se comporte IGUAL que el que ya
 * existe y ya funciona. Por eso se copia su metadata tal cual.
 *
 * ES IDEMPOTENTE: si lo vuelves a correr no duplica el precio, porque lo busca
 * por lookup_key.
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Falta STRIPE_SECRET_KEY.');
  console.error('  STRIPE_SECRET_KEY=sk_test_... node consulta-750.mjs');
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

const MODO = key.startsWith('sk_live') ? 'PRODUCCIÓN' : 'prueba';
const MONTO = 75000;              // 750.00 MXN en centavos
const MONEDA = 'mxn';
const LOOKUP = 'consulta_nutricional_750';
const BUSQUEDA = 'consulta';      // con qué se filtran los productos existentes

console.log(`\nModo: ${MODO}\n`);

// ── 1. Encontrar el producto que ya existe ─────────────────────────────────
const todos = await stripe.products.list({ active: true, limit: 100 });
const candidatos = todos.data.filter((p) =>
  p.name.toLowerCase().includes(BUSQUEDA),
);

if (candidatos.length === 0) {
  console.error(`No encontré ningún producto activo cuyo nombre incluya "${BUSQUEDA}".`);
  console.error('Productos activos en la cuenta:');
  for (const p of todos.data) console.error(`  · ${p.name}  (${p.id})`);
  console.error('\nNo creo uno nuevo a ciegas. Dime cuál es y lo apunto.');
  process.exit(1);
}

if (candidatos.length > 1) {
  console.error('Encontré más de un producto que podría ser. NO voy a adivinar:');
  for (const p of candidatos) console.error(`  · ${p.name}  (${p.id})`);
  console.error('\nPon el id correcto en la constante PRODUCTO_ID y vuelve a correr.');
  process.exit(1);
}

const producto = candidatos[0];
console.log(`Producto: ${producto.name}  (${producto.id})`);

// ── 2. Ver cómo está configurado el precio que ya funciona ─────────────────
const preciosExistentes = await stripe.prices.list({ product: producto.id, active: true, limit: 10 });
const modelo = preciosExistentes.data[0];
if (modelo) {
  const m = (modelo.unit_amount ?? 0) / 100;
  console.log(`Precio de referencia: $${m} ${modelo.currency.toUpperCase()} · ${modelo.type}`);
  console.log(`Metadata que se va a copiar: ${JSON.stringify(modelo.metadata)}`);
} else {
  console.log('El producto no tiene precios activos; el nuevo va sin metadata heredada.');
}

// ── 3. Crear el precio de 750, sin duplicar ────────────────────────────────
const yaExiste = await stripe.prices.list({ lookup_keys: [LOOKUP], limit: 1 });
let precio = yaExiste.data[0];

if (precio) {
  console.log(`\nEl precio ya existía, lo reuso: ${precio.id}`);
} else {
  precio = await stripe.prices.create({
    product: producto.id,
    unit_amount: MONTO,
    currency: MONEDA,
    lookup_key: LOOKUP,
    // Pago único, como una consulta. Si el de referencia fuera recurrente,
    // revísalo antes de usar este enlace.
    metadata: { ...(modelo?.metadata ?? {}), atp_origen: 'consulta-750' },
  });
  console.log(`\nPrecio creado: ${precio.id}  ($${MONTO / 100} ${MONEDA.toUpperCase()})`);
}

// ── 4. El enlace de pago ───────────────────────────────────────────────────
const enlace = await stripe.paymentLinks.create({
  line_items: [{ price: precio.id, quantity: 1 }],
  metadata: { ...(modelo?.metadata ?? {}), atp_origen: 'consulta-750' },
});

console.log('\n────────────────────────────────────────');
console.log('  ENLACE DE PAGO');
console.log(`  ${enlace.url}`);
console.log('────────────────────────────────────────\n');

if (MODO === 'prueba') {
  console.log('Ojo: esto es modo PRUEBA. Nadie te va a pagar con este enlace.');
  console.log('Para el de verdad, vuelve a correrlo con la llave sk_live.\n');
}
