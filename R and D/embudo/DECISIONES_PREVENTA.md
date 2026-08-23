# DECISIONES · Preventa del 27 de agosto de 2026

**Ubicación canónica:** `R and D/embudo/DECISIONES_PREVENTA.md`
**Última actualización:** 23 de agosto de 2026 · Stripe montado, legal publicado,
canales de tienda decididos
**Para qué sirve:** fuente única de verdad del lanzamiento. Si un agente, un
desarrollador o Enrique necesita saber qué se decidió y por qué, se lee esto
antes de proponer nada. Si algo contradice a este archivo, gana este archivo
hasta que Enrique diga lo contrario y se actualice aquí.

---

## 1. Alcance: dos fechas, no una

**27 de agosto · preventa.** Se vende la membresía completa, que incluye la
comunidad y la app. Lo que se **entrega** ese día es la comunidad y las
mentorías grupales; la app todavía no existe públicamente. Una sola suscripción
mensual, un solo producto de Stripe. Ver la sección 1-ter.

**6 de septiembre · lanzamiento de la app.** Ese día los que ya pagaron reciben
su acceso a la app, sin costo adicional, al mismo correo.

Consecuencia que ya costó un error: **ningún correo, pantalla o página del 27
debe prometer descargar la app.** Las pantallas de confirmación de los enlaces
de 449 y 620 ya dicen "comunidad ahora, app el 6 de septiembre". La del enlace
de 890 sí habla de la app, porque esa ventana empieza el 7 de septiembre.

**Las tiendas no bloquean el 27. Bloquean el 6 de septiembre.** Ver sección 8-bis.

## 1-bis. La escala esperada, y por qué importa

**Alrededor de diez membresías por semana.** Enrique, 23 de agosto.

Ese número es el que autoriza que casi todo sea manual y que no se automatice
nada por adelantado. Cuarenta altas al mes se invitan a mano en media hora a la
semana. Cualquier propuesta de automatizar invitaciones, bajas o mensajería
tiene que justificarse contra este número, no contra un escenario de mil altas.

## 1-ter. Qué incluye la membresía

Confirmado por Enrique el 23 de agosto de 2026.

**Es una sola membresía que contiene las dos cosas: la comunidad y la app.**
No son dos productos ni dos precios. Quien paga, paga por ambas.

Incluye:

- **La app ATP completa**, sin niveles. Todas las funciones para toda persona
  miembro. Técnicamente es el tier `pro` de la base de datos.
- **La comunidad.**
- **Mentorías grupales semanales**, incluidas en la membresía, sin costo
  adicional.

**Todo el acompañamiento es grupal.** No se ofrece, no se promete y no se
insinúa tiempo de consulta individual dentro de la membresía. La consulta
clínica individual con Mariana es un servicio aparte, con su propio precio, y
no forma parte de esto.

**El matiz de las dos fechas:** la membresía incluye las dos cosas desde que se
contrata, pero **la app se entrega el 6 de septiembre**, porque hasta entonces
no está disponible. Lo que se recibe el 27 de agosto es la comunidad y las
mentorías. El correo de bienvenida tiene que decir exactamente eso: qué
recibes hoy, y qué recibes el 6.

## 2. La escalera de precios

| Ventana | Precio mensual MXN | Qué es |
|---|---|---|
| 27 al 30 de agosto | **449** | Preventa a la comunidad de Mariana |
| 31 de agosto al 6 de septiembre | **620** | Segunda ventana |
| Del 7 de septiembre en adelante | **890** | Precio oficial, sin fecha de término |

Reglas de la escalera:

- Son **tres precios sobre el mismo producto**, no tres productos. El derecho
  de acceso se ata al producto en Stripe, así que los tres otorgan lo mismo.
- Son **tres enlaces de pago distintos**, porque el precio de un enlace no se
  puede editar después de creado (verificado contra la doc de Stripe).
- **El precio se congela solo.** Stripe nunca migra una suscripción a un precio
  nuevo salvo que se le pida explícitamente. Quien entra a 449 se queda en 449
  mientras no cancele.
- **Quien cancela y vuelve entra al precio vigente**, no al promocional. Está
  escrito en la cláusula 5 de los términos.
- **Tarea manual con hora:** el 31 de agosto a primera hora se desactiva el
  enlace de 449 y se publica el de 620. El 7 de septiembre lo mismo con el de
  620. Un enlace desactivado no se borra y se puede reactivar por API.

## 2-bis. Lo creado en Stripe (23 de agosto, en vivo)

Cuenta **Somos ATP** · `acct_1QlCnbInek8f5auc` · livemode. Creado por Claude vía
el conector de Stripe, con autorización explícita de Enrique. No se tocó ningún
producto existente de consultas, retiros, mentorías ni genéticos.

**Producto:** `prod_V7hDmZXwLvsV83` · "Membresía ATP"
Descriptor en estado de cuenta: `ATP MEMBRESIA` · tax_code `txcd_10000000`
metadata: `tier=pro`, `kind=membresia_app` · default_price: el de 890

| Ventana | Precio | ID del precio | Enlace de pago | ID del enlace |
|---|---|---|---|---|
| 27-30 ago | 449 | `price_1U7RpJInek8f5aucSXFImfNC` | https://buy.stripe.com/7sY00jbHEdyg7Rweyx4gg0s | `plink_1U7RpoInek8f5aucHi9fg3R7` |
| 31 ago-6 sep | 620 | `price_1U7RpPInek8f5aucp4EqshFr` | https://buy.stripe.com/dRmeVd7ro9i06Ns8a94gg0t | `plink_1U7Rq0Inek8f5aucz66PCdW1` |
| 7 sep en adelante | 890 | `price_1U7RpWInek8f5auclghiFhTN` | https://buy.stripe.com/8x2aEX8vsgKs9ZE6214gg0u | `plink_1U7RqAInek8f5aucwKMd5YCt` |

Los tres precios son mensuales recurrentes en MXN con `tax_behavior=inclusive`,
que es lo que prometen los términos publicados.

**Los tres enlaces llevan, verificado en la respuesta de la API:**
- `metadata.tier = pro` (viaja en `checkout.session.completed`)
- `subscription_data.metadata.tier = pro` (viaja a la Subscription y a cada
  `invoice.paid`, o sea a las renovaciones)
- `consent_collection.terms_of_service = required` (la casilla de términos)
- `phone_number_collection.enabled = true`
- `after_completion` con mensaje propio, no la pantalla genérica de Stripe
- `inactive_message` propio, para cuando se apague el de 449 el día 31

**Para compartir, pégale el idioma al final:** `?locale=es-419`

**Imagen del producto: ya puesta.** `https://somosatp.com/atp-producto-1024-riel.png`,
subida a Hostinger y asignada al producto. El original está en
`R and D/embudo/marca/atp-producto-1024-riel.png`.


## 3. Lista de precios completa (septiembre en adelante)

La de `R and D/stripe/crear-productos.mjs`: Individual 890 mensual / 7,900
anual · Dúo 1,490 / 12,900 · Familiar de 4 plazas 2,790 / 24,900 · Founder
8,900. **Nada de esto sale el 27.**

Meses sin intereses: acotados a 3 y 6 meses, solo sobre el anual y el Founder,
en septiembre. No funcionan en modo suscripción, ni siquiera en el primer cobro.

## 4. Legal

- **Responsable: Enrique Zapata, persona física con actividad empresarial.**
  Esto **contradice a propósito** la regla escrita en el encabezado de
  `src/constants/legal-texts.ts` que dice que el responsable siempre es la SAS.
  La SAS no existe todavía y quien cobra el 27 es él. Cuando la SAS se
  constituya se sustituye y se avisa con 30 días, que ya está previsto en la
  cláusula 12.
  → **Tarea para el desarrollador:** actualizar `legal-texts.ts` con el mismo
  texto, o la app y la web van a decir cosas distintas sobre quién responde.
- **Datos del responsable, publicados:**
  Enrique Zapata Ezquerro · RFC **ZAEE900718DG9** · Circuito Petirrojo 129,
  Zibatá, El Marqués, Querétaro, México, C.P. 76269.
- **Jurisdicción: Querétaro.**
- **Garantía de siete días: SÍ.** Devolución completa y sin preguntas si
  cancela dentro de los siete días naturales siguientes al primer pago,
  pidiéndolo a hola@somosatp.com desde el correo con el que contrató. Aplica
  una sola vez por persona y cubre solo el primer pago. Se ejecuta a mano desde
  el panel de Stripe; la comisión no se devuelve, así que cada garantía
  ejercida cuesta unos veinte pesos además del importe.
- **Sin periodo de prueba.** Se eliminó el de 14 días que traía la cláusula 5.
- **Cláusula 6, Programa Founders: eliminada de la versión publicada.** Tenía
  el placeholder `[10]` años de vida esperada sin resolver, que define el
  prorrateo del reembolso si ATP cierra. Regresa en septiembre con el número
  decidido.
- **Tres páginas públicas**, generadas desde `R and D/embudo/legal/`:
  `somosatp.com/terminos.html` · `somosatp.com/privacidad.html` ·
  `somosatp.com/soporte.html`. El detalle de cada cambio respecto a
  `legal-texts.ts` está en `CAMBIOS.md`. Las tres se sirven desde Hostinger en
  `public_html`, junto con `logo-atp-blanco.png`, que llaman por ruta relativa.
- **`soporte.html`** es la URL de soporte declarada en Stripe. Cubre contacto,
  cancelación, garantía, factura, quién cobra y el aviso de que ATP no es un
  servicio de urgencias. Pendiente: agregarle el enlace del portal del cliente
  cuando esté activado.
- **Teléfono de soporte y WhatsApp: +52 442 466 6593.** Es el número que va en
  `soporte.html` (`wa.me/524424666593`) y el que se dará de alta en 360dialog
  con coexistencia cuando toque. Formato internacional sin el "1" después del
  52, que quedó obsoleto en 2019.

## 5. Contrato técnico con Stripe (esto es lo que se rompió)

El webhook `supabase/functions/payment-webhook` exige metadata en cada pago.
Sin ella el pago queda en `needs_review` y **la persona no recibe nada.**

Cada enlace de pago de la membresía necesita **las dos** claves:

```
metadata[tier]=pro                      → viaja en checkout.session.completed
subscription_data[metadata][tier]=pro   → viaja a la Subscription y de ahí a
                                          cada invoice.paid (renovaciones)
```

- **`tier` solo acepta `base`, `pro` o `clinician`.** Se usa **`pro`**, que es
  el único tier de pago que la base de datos usa hoy.
- **La metadata de un Payment Link no se pone desde el panel.** La
  documentación de Stripe no expone ese campo en la interfaz. Va por API:
  `POST /v1/payment_links/{id}`.
- `subscription_data.metadata` es **declarativo**: un update borra los valores
  previos. Hay que mandar el set completo siempre.
- La metadata del link se copia a la Checkout Session en **un snapshot único**.
  Editarla después no cambia las sesiones ya creadas.

### El webhook de Stripe, verificado el 23 de agosto

Endpoint `we_1U09XSInek8f5aucCWJHO2PS`, estado `enabled`, apuntando a
`https://itqkfozqvpwikogggqng.supabase.co/functions/v1/payment-webhook`.

Eventos suscritos, los cinco que hacen falta y ninguno de más:
`checkout.session.completed` · `invoice.paid` · `invoice.payment_failed` ·
`customer.subscription.deleted` · `customer.subscription.created`

**El "hueco de las renovaciones" que se había marcado NO existe. Se descarta.**
Antes se advirtió que el código lee `invoice.subscription_details.metadata` y
que Stripe movió ese campo a `invoice.parent.subscription_details.metadata` en
la versión `2025-03-31.basil`. La advertencia era correcta en general y
equivocada en este caso: **el endpoint está fijado a `2024-12-18.acacia`**, que
es anterior a ese cambio, así que recibe el payload con la forma vieja y el
código está bien como está.

**Pero ese pin es carga estructural.** Si alguien actualiza la versión de API
del endpoint, las renovaciones dejan de traer el tier y nadie se entera hasta
que el acceso de alguien no se extiende. Dos opciones, cualquiera sirve:
no tocar la versión del endpoint nunca, o dejar la lectura defensiva puesta:

```ts
const subMeta = (
  (object.parent as any)?.subscription_details?.metadata ??
  (object.subscription_details as any)?.metadata ?? {}
) as Record<string, unknown>;
```

## 6. Lo que YA EXISTE y no hay que construir

Esto se documenta porque ya se propuso construirlo dos veces por no haber
mirado el repo primero.

- **`supabase/functions/payment-webhook`** (622 líneas, desplegado,
  `verify_jwt=false`, conectado a Stripe y recibiendo eventos en vivo). Maneja
  `checkout.session.completed`, `invoice.paid`,
  `customer.subscription.deleted`, `invoice.payment_failed`. Verifica firma, es
  idempotente por índice único `(provider, event_id)`, guarda el payload crudo
  siempre, y responde rápido con procesamiento en background.
- **Tablas:** `payment_webhook_events`, `activation_codes`, `tier_grants`,
  `subscription_events`. **RPC:** `apply_effective_tier`.
- **Correo transaccional:** ya sale por Resend desde `hola@somosatp.com`. El
  dominio `somosatp.com` está verificado, con SPF, DKIM y DMARC pasando.
- **Cron de vencimiento:** `tier-expiry-daily`, migración 240.
- **`revenuecat-webhook`** para compras dentro de la app.
- **Páginas** `confirmar.html`, `reset-password.html`, `mi-acceso.html`,
  `gracias.html` escritas, en `R and D/embudo/`.
- **La cuenta de Stripe está viva** y recibiendo transferencias desde antes de
  agosto. No hay ningún trámite de activación pendiente.

## 7. Los tres pagos de agosto (resuelto, no volver a preguntar)

| Fecha | Nombre | Monto |
|---|---|---|
| 5 ago | Enrique A Acuña | 940.00 |
| 10 ago | Paulina Escobedo | 940.00 |
| 21 ago | Paulina Escobedo | 750.00 |

**Son pagos únicos de consultas de Mariana. No son suscripciones y no tienen
nada que ver con la app.** Que hayan quedado en `needs_review` es el
comportamiento correcto: el webhook rechaza todo lo que no traiga `tier`, que
es justo lo que debe hacer. No hay clientes desatendidos y no hay nada que
reparar.

**No hace falta una cuenta separada de Stripe.** El webhook ya los ignora por
diseño. Lo único que aportaría separar es limpieza de reportes, y eso se
resuelve con productos distintos dentro de la misma cuenta.

*Mejora chica opcional para el desarrollador:* que el webhook distinga
"no es de la app" de "error", para que las consultas de Mariana no aparezcan
como pendientes en el tablero de la mañana. Ejemplo: si el producto no es la
membresía, devolver `skipped` en vez de `needs_review`.

## 8. Explícitamente FUERA del alcance del 27

Página de precios con los cinco planes · Meses sin intereses · SPEI · OXXO
(además no soporta pagos recurrentes ni el portal del cliente, así que nunca
pudo ser el método de una suscripción) · Modelo de plazas del Dúo y el
Familiar · Facturación timbrada automática (depende del CSD) · Bajas
automáticas en Skool (a 40 o 60 movimientos al mes se hace a mano, automatizarlo
cuesta más que hacerlo) · Mercado Pago · WhatsApp automatizado por 360dialog
(la primera semana se contesta a mano desde la app de WhatsApp Business).

## 8-bis. Las tiendas · investigación

> ⚠️ **La recomendación de canal de esta sección quedó reemplazada por la
> sección 8-ter.** Aquí se sugería prueba cerrada en Android; se decidió
> prueba abierta. Lo que sigue vigente de esta sección son los datos duros y
> los requisitos, no la recomendación de canal.

Investigado el 23 de agosto contra documentación oficial de Apple y Google.

**El diagnóstico técnico ya existe y no hay que repetirlo:**
`R and D/PREFLIGHT_STORES_2026-07-28.md` (18 puntos, 6 bloqueadores) y
`R and D/COMPLIANCE_DATOS_STORES.md` (3 huecos reales de datos).
`R and D/PASOS_CONFIGURACION_TIENDAS.md` trae la captura de paneles.

### Lo que hace falta para el 6 de septiembre no es publicar en producción

Para meter a los miembros de la preventa a la app basta con canales de prueba,
y eso evita la revisión completa de tienda:

- **iOS · TestFlight externo.** Hasta 10,000 testers, con enlace público que no
  requiere invitar uno por uno. Sí pasa por Beta App Review; **Apple no publica
  cuánto tarda esa revisión**, así que no doy un número.
- **Android · pruebas cerradas.** Hasta 2,000 usuarios por lista. Sí pasa por
  revisión, y **Google tampoco publica plazo** para tracks cerrados.

### El reloj que sí conviene arrancar ya

Google exige, a **cuentas de desarrollador personales creadas después del 13 de
noviembre de 2023**, un mínimo de **12 testers inscritos de forma continua
durante 14 días** en una prueba cerrada **antes de poder solicitar producción**.
No aplica a cuentas de organización, que requieren D-U-N-S. Google además
sugiere cuenta de organización para apps de salud.

Ese requisito **no bloquea el 6 de septiembre** si se entrega por prueba
cerrada, porque solo gatea el paso a producción. Pero si se arranca la prueba
cerrada tarde, producción se recorre en la misma proporción.

**Dato que falta y que decide esto:** qué tipo de cuenta de Play Console existe
y cuándo se creó.

### La restricción de Apple que choca con el modelo de cobro

Guideline **3.1.3(b) Multiplatform Services**, texto oficial: una app puede dar
acceso a contenido o suscripciones adquiridas en el sitio web **"provided those
items are also available as in-app purchases within the app"**.

O sea: **cobrar solo por web y que la app únicamente valide sesión no cumple en
iOS.** Hay que ofrecer también la suscripción por compra dentro de la app. Esto
contradice la preferencia declarada de vender solo por web y hay que decidirlo.

- La categoría de "reader app" (3.1.3a) cubre revistas, periódicos, libros,
  audio, música y video. Una app de bienestar con comunidad no encaja.
- Los entitlements de enlace externo de compra existen para UE, Rusia, Corea,
  Países Bajos, Brasil, Japón y la tienda de EE.UU. **México no está en ninguna
  lista.** No aplica.

**Google es distinto y más permisivo:** la política de pagos permite
explícitamente el modelo "consumption-only", o sea que el usuario inicie sesión
y consuma lo que compró en otro lado. Lo que no se puede es enlazar a pagos
alternativos dentro de la app.

- **Las compras en TestFlight corren siempre en sandbox**, nunca cobran dinero
  real, y las suscripciones se renuevan aceleradas. Sirve para probar el flujo
  de IAP, no para facturar.


## 8-ter. Canales de tienda, decidido el 23 de agosto

Documento largo con el detalle y las fuentes:
`R and D/embudo/TIENDAS_BETA.html`

### Las decisiones

- **iOS · TestFlight con liga pública.** Hasta 10,000, una sola liga, sin pedir
  correos. Enrique lo aprobó notando que quien recibe la liga ya pagó, así que
  el riesgo de difusión abierta es aceptable.
- **Android · prueba abierta (open testing), no cerrada.** No pide correos, sin
  límite de usuarios, y la app queda pública y buscable en Play Store. Enrique:
  *"es justamente lo que queremos, no pasa nada"*. Descartada la prueba cerrada
  como canal para clientes porque exige capturar la cuenta de Google de cada
  persona, que casi nunca es el correo con el que pagó.
- **Prueba cerrada con 12 personas conocidas, en paralelo.** No es para
  clientes: es para cumplir el requisito de Google de 12 testers inscritos 14
  días continuos antes de poder solicitar producción. Abrir cuanto antes.
- **Sí se ofrece compra dentro de la app**, con una versión gratuita limitada
  que empuja al pago. Enrique: *"vamos a cumplir con sus normas y listo"*.
  Esto cumple la guideline 3.1.3(b) de Apple, que exige que lo comprado en web
  esté también disponible como compra dentro de la app, y de paso resuelve el
  bloqueador de que el reviewer no puede ver nada sin cuenta.

### Datos duros que hay que recordar

- **En TestFlight las compras corren siempre en sandbox.** Nunca cobran dinero
  real y las suscripciones se renuevan aceleradas. En Android las pruebas sí
  cobran de verdad, salvo a los correos dados de alta en *license testing*.
- **Google ya no acepta APK** para apps nuevas en ningún canal. Solo AAB.
- **La declaración de apps de salud de Google es obligatoria también para los
  canales de prueba**, no solo producción.
- **Small Business Program de Apple**: 15% en vez de 30%, no es automático, se
  solicita, y aplica desde el mes siguiente a la aprobación.
- **User Choice Billing y enlaces externos de compra: México no está en ninguna
  de las dos listas**, ni la de Apple ni la de Google.

### Ni Apple ni Google publican

Plazos de revisión de TestFlight, ni de ningún canal de Google. No planear con
números inventados. Lo único oficial: Apple revisa el 90% de los envíos a App
Store en menos de 24 horas, pero eso es la revisión de tienda, no la beta.


## 9. Decisiones todavía abiertas

- **Tipo de cuenta de Play Console** (personal u organización, y fecha de
  creación). Decide si aplica el requisito de 12 testers por 14 días.
- **La liga del grupo de la comunidad** (Skool u otro), que es lo que se
  entrega el 27 y todavía no está en ningún correo ni página.
- **Cuánto le toma al dev la versión gratuita con muros de pago.** Es la única
  pieza sin estimar del 6 de septiembre y la que puede mover la fecha.
- **Teléfono obligatorio en el checkout:** Stripe solo lo ofrece como campo
  obligatorio, no hay opción de pedirlo opcional. Cuesta conversión, pero sin
  él no hay canal de soporte.

## 10. Cómo trabajar en este proyecto (calibración)

**Trato de velocidad (23 de agosto):** por omisión se trabaja bien, no rápido.
Cuando Enrique diga explícitamente que hay prisa, se acelera, y en ese caso hay
que decirle **qué verificación se está saltando**, para que sepa dónde quedó el
riesgo. La prisa se pide, no se asume.


Escrito el 23 de agosto después de que Enrique señalara un patrón real: exceso
de cautela que ha costado semanas de trabajo. Aplica a cualquier agente.

1. **Verificar antes de proponer.** Repo, base de datos, panel. Ningún plan
   propone construir algo sin haber buscado primero si ya existe. El 23 de
   agosto se propuso construir un webhook que llevaba semanas desplegado, con
   su contrato escrito en el encabezado del propio archivo.
2. **Supuesto por omisión: ya existe y ya está resuelto**, hasta que el repo o
   la base digan lo contrario. El supuesto contrario produce planes enteros de
   trámites que ya estaban hechos.
3. **Tiempos solo con fuente.** Si no se puede señalar de dónde sale el número,
   se dice "no sé cuánto tarda". Prohibido el rango defensivo inventado.
4. **Riesgos legales, fiscales y de cumplimiento: solo si bloquean algo esta
   semana.** Lo demás va a una lista de después, nunca al plan principal. Y al
   levantar un riesgo hay que decir **qué evidencia lo tumba**, para que se
   pueda cerrar en una línea.
5. **Costos con números de la documentación, sin colchón.** Nada de márgenes
   "por si acaso" que después resultan diez veces menores.
6. **Una decisión tomada no se reabre** salvo evidencia nueva y explícita. Si
   está en este archivo, está cerrada.
7. **Cuatro ojos sobre lo que se afirma, no sobre lo que se teme.** Verificar
   los datos duros contra documentación primaria, no acumular advertencias.

## 11. Bitácora de correcciones (23 de agosto)

Errores reales cometidos y corregidos el mismo día, para que no se repitan:

- Se planeó un bloque entero de "activar la cuenta de Stripe" cuando la cuenta
  llevaba meses recibiendo transferencias.
- Se propuso construir el webhook, la tabla de acceso y el tablero. Los tres
  ya existían en el repo.
- Se afirmó que el CSD del SAT se saca en media hora. Son de dos a cinco días
  hábiles: 24 a 72 horas de emisión más unas 48 de maduración.
- Se describió la coexistencia de WhatsApp como una migración con un momento de
  riesgo. No lo es: el número funciona en la app y en la API al mismo tiempo.
- Se dijo que 360dialog da 24 horas para sincronizar. Ese dato no existe en su
  documentación. El requisito real es abrir la app de WhatsApp Business al
  menos una vez cada 13 días.
- Se dio por hecho que pegar las ligas de términos en Stripe despliega la
  casilla de consentimiento. Solo habilita la opción: hay que prenderla además
  dentro de cada enlace de pago.
