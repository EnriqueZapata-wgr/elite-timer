# ¿Salen los 449 al mes? Modelo de costos de ATP Pro

Fecha: 4 de septiembre de 2026. Acompaña al libro `ATP_Modelo_costos_Pro_449_vs_399.xlsx` (hojas Supuestos, Unidad, Escenarios, Founders, Fuentes). Revisado bajo principio de cuatro ojos: un agente levantó precios vigentes de cada proveedor (página oficial abierta el 4 de septiembre), yo construí el modelo con los datos reales de uso de `argos_logs`, y un revisor recalculó cada fila a mano y corrigió nueve puntos que ya están integrados. Sin em dashes.

## Respuesta corta

Sí salen. A 449 MXN con IVA incluido, cada suscriptor Pro deja entre 278 MXN (tienda) y 318 MXN (web) al mes después de IVA, comisión del canal, RevenueCat y toda la IA que consume un usuario promedio. Eso es 72% a 82% de margen sobre el ingreso sin IVA. A 399 deja 242 a 277. La IA no es el problema: cuesta 47 MXN por usuario promedio al mes, 17% de lo que te deposita el canal, y un usuario tendría que gastar más de 18 USD al mes en ARGOS (siete veces el promedio medido) para que su suscripción dejara de dejar dinero.

Lo que sí mueve la aguja no es 449 contra 399 sino tienda contra web: cada suscriptor que paga por Stripe en vez de por Apple o Google deja 35 a 40 MXN más al mes, casi lo mismo que la diferencia de precio. Bajar a 399 y además cobrar en tienda es pagar dos veces.

## De dónde sale cada número

Precio con IVA 449. Sin IVA: 387.07. Apple (Small Business Program, menos de 1M USD al año) y Google Play (suscripciones) cobran 15% sobre el precio sin IVA: 58.06. RevenueCat 1% del MTR: 4.49 (solo aplica al pasar de 2,500 USD de MTR mensual en tiendas, unos 118 suscriptores con el mix supuesto; el modelo lo carga siempre para no subestimar). Neto tienda: 324.52. Por Stripe: 3.6% sobre 449 = 16.16, más 3 MXN fijos, más Billing 0.7% = 3.14. Neto web: 364.76.

IA por suscriptor promedio al mes, al FIX de 16.956: ARGOS 2.4 USD = 40.69 MXN (la medición que calibró el proxy; el tester más intenso de agosto gastó 1.6 USD), lectura de laboratorios 0.10 USD por estudio y medio estudio al mes = 0.85 MXN (estimado, pendiente medir en lab-parser-worker), voz 0.30 USD = 5.09 MXN. Total 46.63 MXN. En Escenarios se usa además un promedio ponderado con 10% de usuarios intensos (8 USD al mes), que sube la IA a 2.96 USD.

Usuarios gratis: 20 por cada Pro (5% de conversión; base razonable en salud freemium MX es 4%, optimista 6%, pesimista 2%), 0.10 USD por alta y 0.03 USD al mes por usuario gratis activo. Cuestan unos 17 MXN por suscriptor Pro al mes.

Fijos: Supabase Pro 25 USD, Apple Developer 8.25 USD al mes, dominio y otros 10 USD; Sentry, PostHog y Resend gratis hasta ciertos escalones que el modelo aplica por columna (Resend Pro 20 USD arriba de 1,500 usuarios, Sentry Team 26 USD arriba de 2,500, Expo EAS Starter 19 USD arriba de 1,000 MAU y 0.005 USD por MAU arriba de 3,000). Contador 2,500 MXN al mes (estimado).

## Cuántos suscriptores hacen falta

Con el mix 45% App Store, 35% Google Play, 20% web y una meta personal de 40,000 MXN al mes antes de ISR (edítala en Escenarios!B7):

| Escenario | Suscriptores Pro |
|---|---|
| Solo cubrir infraestructura y contador (a 449) | 14 |
| 449 con el mix de canal | 168 |
| 449 todo por web (Stripe) | 150 |
| 399 con el mix de canal | 196 |
| 399 todo por web | 174 |

Tabla de Escenarios (449, mix): 25 suscriptores dejan 3,300 MXN al mes; 50 dejan 9,600; 100 dejan 22,400; 250 dejan 60,300; 500 dejan 124,800; 1,000 dejan 253,600. Todo antes de ISR.

## Founders y anual

Founders a 8,900 por web deja 7,349 netos. Un Founder promedio consume 2,800 MXN de IA en cinco años (contribución 4,551); un Founder intenso consume 8,495 y agota el neto en 52 meses: a cinco años queda 1,146 MXN en negativo, sin contar la hora con Enrique. Por eso Founders necesita una de dos cosas: definirse como "5 años de Pro" en vez de vitalicio, o llevar una política de uso justo de ARGOS (el umbral de aviso de 150 MXN al mes ya existe en el proxy). Founders nunca debe venderse por tienda: la diferencia es de 916 MXN por venta. Los 50 Founders por web son 367,451 MXN netos después de IVA y comisión (445,000 de caja bruta).

Anual a 3,990 es 26% de descuento frente a 12 meses de 449 (estándar de mercado). Deja 2,702 al año por web y 2,321 por tienda después de toda la IA, incluido el Diagnóstico ATP automático (0.20 USD por generación).

## Lo que el modelo no incluye y hay que tener presente

Reembolsos y pagos fallidos (2 a 5% de la facturación en suscripciones), churn (el modelo es de estado estable), la garantía de 7 días, el costo de oportunidad de la hora con Enrique en Founders, y el IVA de las comisiones de Apple y Google si el contador dice que no es acreditable (celda Supuestos!B20; cuesta unos 8 MXN por suscriptor y sube el equilibrio de 168 a unos 175). Las retenciones de ISR e IVA que Apple aplica a personas físicas son anticipos de impuestos, no costo, y por eso no están.

## Recomendación

Precio Pro 449 al mes y 3,990 al año. No bajar a 399: la diferencia de 36 a 41 MXN por suscriptor no cambia la decisión de compra de quien ya paga 40,000 por Elite ni de quien busca "entender sus laboratorios", y sí te cuesta 28 suscriptores más de equilibrio. Poner toda la energía en que el pago sea por web: landing con Stripe, precio igual en tienda y web (Apple no permite decir dentro de la app que afuera es más barato, pero sí puedes vender en la web y dejar que la app solo "restaure" la suscripción). Con 20% de pago web el equilibrio es 168; con 100% es 150.

Pendiente medible esta semana: costo real de una lectura de laboratorios (el modelo usa 0.10 USD estimado) y egress de Supabase si los audios de meditación se sirven desde Storage (el revisor estimó 1.5 a 3 MXN por suscriptor si los gratis también escuchan).
