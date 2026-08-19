/**
 * ATP · Alta de productos y precios en Stripe
 * ------------------------------------------------------------------
 * Ejecuta:   STRIPE_SECRET_KEY=sk_test_... node crear-productos.mjs
 * Antes:     npm i stripe
 *
 * Es IDEMPOTENTE: si vuelves a correrlo no duplica nada, porque busca
 * por lookup_key en los precios y por metadata.atp_id en los productos.
 *
 * 🔴 LO QUE ARREGLA
 * Los dos únicos pagos que han entrado en produccion (5 y 10 de agosto)
 * fallaron con "missing_or_invalid_tier_metadata". El webhook lee
 * metadata.tier de la sesion de checkout y solo acepta base | pro | clinician.
 * Este script pone ese metadata en los cuatro lugares donde tiene que ir:
 * producto, precio, payment link y subscription_data.
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error('Falta STRIPE_SECRET_KEY'); process.exit(1); }
const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

const MONEDA = 'mxn';
const SITIO = 'https://somosatp.com';

/* Todos los planes traen exactamente lo mismo, asi que todos son tier "pro".
   Lo que cambia es cuantas plazas y por cuanto tiempo. */
const CATALOGO = [
  { id:'individual', nombre:'ATP Individual',
    desc:'Membresia ATP para una persona. App completa con IA, comunidad, mentorias grupales semanales y todas las actualizaciones.',
    plazas:1,
    precios:[
      { lookup:'atp_individual_mensual', monto:89000,  intervalo:'month', dias:35   },
      { lookup:'atp_individual_anual',   monto:790000, intervalo:'year',  dias:370  },
    ]},
  { id:'duo', nombre:'ATP Duo',
    desc:'Membresia ATP para dos personas. Cada quien con su cuenta y su expediente privado.',
    plazas:2,
    precios:[
      { lookup:'atp_duo_mensual', monto:149000,  intervalo:'month', dias:35  },
      { lookup:'atp_duo_anual',   monto:1290000, intervalo:'year',  dias:370 },
    ]},
  { id:'familiar', nombre:'ATP Familiar',
    desc:'Membresia ATP para hasta cuatro personas. Cada quien con su cuenta y su expediente privado.',
    plazas:4,
    precios:[
      { lookup:'atp_familiar_mensual', monto:279000,  intervalo:'month', dias:35  },
      { lookup:'atp_familiar_anual',   monto:2490000, intervalo:'year',  dias:370 },
    ]},
  { id:'founder', nombre:'ATP Founder',
    desc:'Ronda fundadora. Treinta y seis meses de membresia completa, con el precio congelado los tres anios.',
    plazas:1,
    precios:[
      { lookup:'atp_founder_36m', monto:890000, intervalo:null, dias:1095 },
    ]},
];

const meta = (p, pr) => ({
  tier: 'pro',                    // <- lo que el webhook exige. base | pro | clinician
  duration_days: String(pr.dias), // <- vigencia del grant
  atp_id: p.id,
  atp_plazas: String(p.plazas),
  atp_precio: pr.lookup,
});

async function buscarProducto(atpId){
  const r = await stripe.products.search({ query:`metadata['atp_id']:'${atpId}' AND active:'true'`, limit:1 });
  return r.data[0] ?? null;
}
async function buscarPrecio(lookup){
  const r = await stripe.prices.list({ lookup_keys:[lookup], limit:1 });
  return r.data[0] ?? null;
}

const salida = [];

for (const p of CATALOGO) {
  let prod = await buscarProducto(p.id);
  if (prod) {
    prod = await stripe.products.update(prod.id, { name:p.nombre, description:p.desc, metadata:{ atp_id:p.id, atp_plazas:String(p.plazas), tier:'pro' }});
    console.log(`= producto ya existia, actualizado: ${p.nombre} (${prod.id})`);
  } else {
    prod = await stripe.products.create({ name:p.nombre, description:p.desc, metadata:{ atp_id:p.id, atp_plazas:String(p.plazas), tier:'pro' }});
    console.log(`+ producto creado: ${p.nombre} (${prod.id})`);
  }

  for (const pr of p.precios) {
    let precio = await buscarPrecio(pr.lookup);
    if (precio) {
      console.log(`  = precio ya existia: ${pr.lookup} (${precio.id})`);
    } else {
      precio = await stripe.prices.create({
        product: prod.id,
        currency: MONEDA,
        unit_amount: pr.monto,
        lookup_key: pr.lookup,
        ...(pr.intervalo ? { recurring:{ interval: pr.intervalo } } : {}),
        metadata: meta(p, pr),
      });
      console.log(`  + precio creado: ${pr.lookup} (${precio.id})`);
    }

    const esSuscripcion = Boolean(pr.intervalo);
    const link = await stripe.paymentLinks.create({
      line_items: [{ price: precio.id, quantity: 1 }],
      currency: MONEDA,
      // 🔴 ESTE metadata es el que llega a checkout.session.completed
      metadata: meta(p, pr),
      // 🔴 Y este hace que el tier viaje tambien en cada invoice.paid
      ...(esSuscripcion ? { subscription_data:{ metadata: meta(p, pr) } } : {}),
      after_completion: { type:'redirect', redirect:{ url:`${SITIO}/gracias?plan=${p.id}` }},
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      custom_text: { submit: { message: 'Te llega tu codigo de activacion por correo en menos de un minuto.' } },
    });
    salida.push({ plan:p.nombre, precio:pr.lookup, monto:(pr.monto/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'}), price_id:precio.id, link:link.url });
    console.log(`  + payment link: ${link.url}`);
  }
}

console.log('\n================ ENLACES PARA COPIAR ================\n');
console.table(salida);
console.log('\nPendiente manual en el dashboard de Stripe:');
console.log(' 1. Activar meses sin intereses (installments) en Settings > Payment methods, para los precios anuales.');
console.log(' 2. Activar SPEI y OXXO si los quieres dentro de Stripe.');
console.log(' 3. Confirmar que el endpoint del webhook apunta a payment-webhook y escucha:');
console.log('    checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted');
