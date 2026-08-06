# 🏪 Configuración de tiendas · paso a paso

**Para:** Enrique. Esto no lo puede hacer CC, es captura en los paneles de Apple, Google y RevenueCat.
**Regla de oro:** los identificadores de abajo **no son sugerencias**. El código hace match contra ellos. Si no coinciden, el paywall muestra "Muy pronto" aunque todo lo demás esté perfecto.

---

# ⚡ PASO 0 · Antes que nada

## 0.1 · Small Business Program de Apple
`developer.apple.com/app-store/small-business-program/`

**Es 15% contra 30%.** No es automático, se solicita, y se renueva cada año. Con tus números entras sin problema. Solicítalo hoy: aplica desde el mes siguiente a la aprobación, así que cada semana de retraso cuesta.

## 0.2 · Lo equivalente en Google
Play Console aplica **15% automático** sobre el primer millón de dólares al año. No hay que pedir nada, pero verifica en **Play Console → Configuración de pagos** que tu perfil de pago esté completo.

## 0.3 · Contratos de App Store Connect
**App Store Connect → Business.** Si hay un acuerdo pendiente de aceptar, **nada de lo demás funciona**: no puedes crear productos ni recibir pagos. Es lo que casi te truena el primer envío.

---

# 🔑 EL CONTRATO QUE EL CÓDIGO EXIGE

Sacado de `src/services/subscription/tier-logic.ts:19-23` y `app/paywall.tsx:64-72`.

## Entitlements en RevenueCat
Estos tres nombres, exactos, en minúsculas:

| Entitlement | Tier que otorga |
|---|---|
| `atp_base` | base |
| `atp_pro` | pro |
| `atp_clinician` | clinician |

⚠️ **Es `atp_clinician`, con n al final.** El código no reconoce `clinico` ni `clinician_mx`.

## Cómo encuentra el paywall cada plan
`findPackage` arma un texto con el identificador del paquete **más** el del producto, lo pasa a minúsculas, y busca que **contenga** `base` o `pro`. Además exige que el tipo de paquete sea **MONTHLY** o **ANNUAL**.

Traducción práctica: mientras el identificador lleve `base` o `pro` en minúsculas y el paquete esté marcado como mensual o anual, funciona.

## El trial ya no está escrito a mano
`trialLabel` lee el `introPrice` del producto real. **Si no configuras la oferta introductoria en la tienda, el trial simplemente no se muestra.** Y el porcentaje de ahorro se calcula de los precios reales: si el anual no es más barato que doce mensualidades, el badge no aparece.

---

# 🍎 PASO 1 · App Store Connect

## 1.1 · Grupo de suscripciones
**Monetization → Subscriptions → Create Subscription Group.**

Nombre: `ATP Membresías`

⚠️ **Base y Pro van en el MISMO grupo.** Es lo que permite que alguien suba de Base a Pro sin cancelar. En grupos separados, el usuario termina pagando las dos.

Dentro del grupo, orden de niveles: **Pro arriba de Base.** Eso define qué cuenta como upgrade.

## 1.2 · Las cuatro suscripciones

| Product ID | Nombre de referencia | Duración | Precio MXN |
|---|---|---|---|
| `atp_base_monthly` | ATP Base Mensual | 1 mes | $399 |
| `atp_base_yearly` | ATP Base Anual | 1 año | $3,190 |
| `atp_pro_monthly` | ATP Pro Mensual | 1 mes | $999 |
| `atp_pro_yearly` | ATP Pro Anual | 1 año | $7,990 |

Los anuales dan **33% de ahorro** contra doce mensualidades, y como el badge se calcula solo, va a decir 33 sin que lo escribas.

**Localización de cada una** (App Store Localization, español de México):

- **ATP Base Mensual** · Display Name: `ATP Base` · Descripción: `Tus siete pilares completos, tu Edad ATP y ARGOS con tu contexto. Todo lo que necesitas para empezar a medirte de verdad.`
- **ATP Base Anual** · Display Name: `ATP Base anual` · Descripción: `Un año de ATP Base. Tus siete pilares, tu Edad ATP y ARGOS, al precio de ocho meses.`
- **ATP Pro Mensual** · Display Name: `ATP Pro` · Descripción: `Todo lo de Base, sin límites de ARGOS, con lectura de laboratorios y protocolos avanzados.`
- **ATP Pro Anual** · Display Name: `ATP Pro anual` · Descripción: `Un año de ATP Pro. Sin límites de ARGOS, con laboratorios y protocolos, al precio de ocho meses.`

## 1.3 · La prueba gratis
**Solo en `atp_base_monthly`.**

Subscription → Introductory Offers → Create:
- Tipo: **Free Trial**
- Duración: **14 días**
- Países: México (y los demás donde vendas)

⚠️ Tus términos publicados dicen **7 días en anual**. O lo configuras también, o corriges el texto de la web. **Hoy la app y el contrato no coinciden**, y el revisor abre el link desde el paywall.

## 1.4 · Los tres consumibles de H+
**Monetization → In-App Purchases → Consumable.**

| Product ID | Nombre de referencia | H+ | Precio MXN |
|---|---|---|---|
| `atp_hplus_small` | Paquete Chico | 10,000 | $99 |
| `atp_hplus_medium` | Paquete Medio | 50,000 | $399 |
| `atp_hplus_large` | Paquete Grande | 200,000 | $1,199 |

Coinciden con `proton_packages` en la base. Descripciones:

- `10,000 H+ para tus consultas a ARGOS, análisis de comida por foto y lectura de laboratorios.`
- `50,000 H+ con 20% extra. Para quien usa ARGOS a diario.`
- `200,000 H+ con 40% extra. El mejor precio por H+.`

⚠️ **Consumable, no Non-Consumable.** Si te equivocas ahí, el usuario solo puede comprar el pack una vez en su vida.

## 1.5 · Clínico
`atp_clinician` **no lo crees como producto de tienda.** Es venta consultiva a $1,499 y se entrega por código de activación, que es justo lo que construye MB-13. Así te ahorras un producto que nadie va a comprar desde el teléfono.

---

# 🤖 PASO 2 · Google Play Console

## 2.1 · Suscripciones
**Monetize → Subscriptions.** Los **mismos Product ID** que en Apple, exactos. RevenueCat los une por identificador.

Cada suscripción lleva un **plan base**: `monthly` o `yearly`. Mismos precios.

La prueba gratis en Play va como **oferta** dentro del plan base mensual de Base: 14 días, elegibilidad "usuarios nuevos".

## 2.2 · Consumibles
**Monetize → In-app products.** Los tres `atp_hplus_*` con los mismos identificadores y precios.

## 2.3 · Lo que Play pide y Apple no

**Declaración de Health Connect.** Play te va a pedir justificación **por cada uno** de los cuatro permisos `android.permission.health.*`, más un **video** mostrando la funcionalidad y la URL de tu política de privacidad. Es de lo que más tarda: prepáralo antes.

⚠️ Y ojo con lo que ya te marqué: `wearable-service.ts:42-62` es un stub desactivado. **Google verifica que cada permiso tenga uso demostrable.** O grabas el import funcionando de verdad, o recortas permisos.

**Data Safety.** Está en `R and D/COMPLIANCE_DATOS_STORES.md`, tabla B, listo para capturar. Marca también la casilla de **datos visibles públicamente** por el bucket de avatares.

**Content rating.** Categoría Salud y Forma Física, **clasificación 18+**. Con la edad mínima ya en 18, no entres a 12+ o 13+: ahí aplican las políticas de Familias que **prohíben analytics de terceros**, y tendrías que sacar PostHog.

---

# 🧩 PASO 3 · RevenueCat

Es la capa que une las dos tiendas. **Este paso es el que hace que el paywall deje de decir "Muy pronto".**

## 3.1 · Entitlements
**Project → Entitlements → New.** Los tres nombres exactos: `atp_base`, `atp_pro`, `atp_clinician`.

A cada uno le adjuntas sus productos:
- `atp_base` → `atp_base_monthly` y `atp_base_yearly`, de iOS y de Android
- `atp_pro` → `atp_pro_monthly` y `atp_pro_yearly`, de iOS y de Android
- `atp_clinician` → sin productos. Se otorga por código de activación

## 3.2 · Offering
**Project → Offerings → New.** Identificador `default`, y **márcalo como Current**.

⚠️ El código lee `offerings.current`. **Si ninguna offering está marcada como current, el paywall se queda mudo.** Es el error más común y no da ningún mensaje.

Dentro de la offering, cuatro paquetes:

| Package | Tipo | Producto |
|---|---|---|
| `$rc_monthly` | Monthly | `atp_base_monthly` |
| `$rc_annual` | Annual | `atp_base_yearly` |
| `pro_monthly` | Monthly | `atp_pro_monthly` |
| `pro_annual` | Annual | `atp_pro_yearly` |

Los identificadores `$rc_monthly` y `$rc_annual` son los que RevenueCat trae por defecto. **Funcionan porque el match mira también el identificador del producto**, que sí lleva `base`. Si te da más confianza que sea explícito, nómbralos `base_monthly` y `base_annual`.

## 3.3 · Los consumibles
Los tres `atp_hplus_*` **no van en la offering** y **no llevan entitlement**. Se compran directo por producto.

⚠️ **La acreditación de H+ va en el webhook, nunca en el teléfono.** `award_protons` está revocada al cliente por diseño anti-minteo. Eso lo construye CC en MB-13, pero del lado de RevenueCat hay que apuntar el webhook a tu edge function.

## 3.4 · Las llaves ya están puestas
`app.json:127-128` ya tiene `revenuecatIosKey` y `revenuecatAndroidKey`. No las toques.

---

# 📝 PASO 4 · Metadata de la ficha

## 4.1 · Cuenta demo para el revisor
**Sin esto te rechazan**, porque `app/index.tsx` manda a login antes de mostrar nada.

Registra una cuenta desde la app con un correo tipo `review@somosatp.com` y **avísame**: yo le pongo Pro, H+, un expediente con laboratorios, historial de entrenos y check-ins, para que el revisor vea una app viva y no una vacía.

En **App Review Information** pones ese correo y su contraseña.

## 4.2 · Notas para el revisor
Texto para pegar, en inglés porque el revisor de Apple lo lee en inglés:

> ATP is a health and performance tracking app. Demo account credentials are provided above and include an active Pro subscription with sample data.
>
> **ARGOS** is our AI assistant (Anthropic Claude). It provides educational guidance only. The app does not diagnose, treat, cure or prevent any disease, and displays medical disclaimers throughout.
>
> **HealthKit** is read-only. We import workout type, duration, distance, active energy and average heart rate to populate the Fitness section. We never write to HealthKit.
>
> **Subscriptions** are auto-renewing. Base includes a 14-day free trial on the monthly plan. H+ are consumable in-app credits used for AI features; they carry no monetary value outside the app.
>
> The app is intended for users 18 and older.

## 4.3 · App Privacy Labels
Tabla A de `R and D/COMPLIANCE_DATOS_STORES.md`, lista para capturar.

**Lo importante:** en todas las categorías, **"usado para rastreo" es No**. No hay IDFA ni SDK publicitario, verificado con grep sobre todo el proyecto. Y por lo mismo **la app no debe pedir el permiso de rastreo**, ni lo pide.

## 4.4 · Congela el canal OTA
`app/_layout.tsx:93-100` busca y aplica actualizaciones al arrancar. **Si publicas un OTA mientras te revisan, el revisor ve un reinicio raro a media prueba.** No corras `eas update` durante la revisión.

---

# 📋 EL ORDEN, PORQUE HAY DEPENDENCIAS

**Hoy mismo, en paralelo:**
1. Solicitar el Small Business Program
2. Aceptar los contratos pendientes en App Store Connect
3. Crear la cuenta demo desde la app y avisarme

**Cuando los contratos estén activos:**
4. Grupo de suscripciones y las cuatro suscripciones en Apple
5. La prueba gratis en `atp_base_monthly`
6. Los tres consumibles
7. Lo mismo en Play Console

**Cuando los productos existan en las dos tiendas:**
8. RevenueCat: entitlements, offering marcada como **current**, y los paquetes
9. **Verifica en la app que el paywall ya muestra precios reales.** Si sigue diciendo "Muy pronto", el problema casi siempre es que ninguna offering está marcada como current

**Al final, cuando MB-13 esté mergeado:**
10. Apuntar el webhook de RevenueCat a la edge function
11. Data Safety, declaración de Health Connect con video, y content rating 18+
12. Privacy labels y notas del revisor

---

## ⚠️ Los tres errores que más cuestan

**Base y Pro en grupos de suscripción separados.** El usuario que quiere subir de plan termina pagando los dos, y te enteras por un reclamo.

**Ninguna offering marcada como current.** El paywall se queda mudo sin decir nada, y vas a buscar el error en el código donde no está.

**Los H+ creados como Non-Consumable.** El usuario compra su pack una vez y nunca puede volver a comprar. Se arregla creando productos nuevos, no editando los viejos.
