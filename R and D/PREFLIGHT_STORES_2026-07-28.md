# 📱 Preflight de tiendas · ATP v1.9.0

**Fecha:** 2026-07-28 · Auditoría de `app.json`, `eas.json`, permisos, assets y binario contra los requisitos de App Store Connect y Play Console.

---

# 🔴 Lo que bloquea

## 1 · El .ipa que ya tienes no se puede instalar directo
`eas.json:11-17` — el perfil `beta` no declara `distribution`, y el default de EAS es `store`. Ese binario se firma con certificado de distribución y perfil de App Store: **no entra por sideload, ni Diawi, ni Apple Configurator.** Solo sirve subido a App Store Connect.

**Dos caminos:**
- **TestFlight** (recomendado): `eas submit -p ios --profile beta`. El .ipa actual sirve tal cual. Hasta 10,000 testers externos, sin registrar dispositivos. Ojo: los externos pasan por Beta App Review de Apple; los internos, hasta 100 y con rol en App Store Connect, entran sin revisión.
- **Build interno:** agregar `"distribution": "internal"` al perfil, `eas device:create` para registrar UDIDs, y rebuild. Instalación por link, sin Apple de por medio. Sirve para ti y Mariana, no escala a founders.

El APK de Android sí se instala directo tal cual.

## 2 · La tienda de H+ es rechazo casi seguro
`app/economy/shop.tsx:140-162` muestra precios en pesos y un botón que dice literalmente **"Comprar (dev)"**, y `shop-service.ts:31-36` llama una RPC revocada desde el cliente, así que **la compra siempre falla**.

Está a dos toques de HOY, y también se llega desde `braverman-premium.tsx`, `ArgosVoiceMode.tsx` y `argos-chat.tsx`. Moneda virtual con precio en pesos vendida fuera del sistema de pagos de la tienda, con la función rota encima.

**Sale del binario, o se convierte en consumible real de IAP.** Ya está en el brief de MB-12.

## 3 · Los corchetes legales bloquean el registro, no solo Ajustes
`legal-texts.ts:26,80,100` con `[RAZÓN SOCIAL]`, `[CALLE, NÚMERO...]` y `[10]` se renderizan desde `app/register.tsx:178`, o sea **antes de crear la cuenta**, además de `settings/legal.tsx` y `AuthLinksFooter.tsx`. Es lo primero que ve el reviewer.

Las versiones en somosatp.com sí están completas y vivas. El problema es solo el espejo dentro de la app.

## 4 · El paywall no lleva la disclosure obligatoria
`app/paywall.tsx` ya tiene restaurar compras (`:211`) y los links a privacidad, términos y reembolsos (`:47-51`), que es lo que la mayoría olvida. **Falta lo que va pegado al botón de compra:** duración del periodo, precio por periodo, y la frase de renovación automática.

Y hay que aclarar que los 14 días de prueba aplican **solo a Base mensual**. Los términos publicados dicen 7 días en anual: hoy la app y el contrato no coinciden.

## 5 · Los precios del paywall y de los términos no coinciden
`somosatp.com/terminos` §5.1 dice **ATP Pro $1,499 MXN/mes**. El paywall lee de RevenueCat, donde Pro va entre $799 y $999. **El reviewer abre el link desde el paywall y ve otro precio.** Alinear antes de enviar.

## 6 · Si los productos no están listos, el reviewer ve un paywall muerto
`paywall.tsx:115,156` — si los IAP no están *Ready to Submit* en App Store Connect y activos en Play Console al momento de la revisión, el reviewer ve los dos planes en "Muy pronto" con los botones deshabilitados. Eso es rechazo directo por app incompleta.

---

# 🟠 Alto

## 7 · Un permiso de ubicación que contradice tu propio aviso
`app.json:44` declara `ACCESS_FINE_LOCATION`. El único consumidor es `uv-service.ts:132-137`, que pide precisión baja: **`ACCESS_COARSE_LOCATION` basta.**

Y tu propio Aviso de Privacidad dice *"geoposición gruesa; nunca ubicación precisa continua"* (`legal-texts.ts:30`). El manifiesto contradice el contrato. Play escruta esto en Data Safety. **Quitar FINE.**

## 8 · Health Connect: el link de privacidad va al lugar equivocado
`plugins/with-health-connect-delegate.js:56-84` apunta el `activity-alias` de permisos a `.MainActivity`. Google exige que ese intent aterrice **en la política de privacidad**, no en el home. Enrutarlo a `/legal/aviso`.

## 9 · El icono de iOS queda sobre blanco, no sobre tu negro
`assets/images/icon.png` es 1024×1024 con canal alfa y el contenido ocupa el 95% del lienzo.

Expo aplana la transparencia en prebuild sobre **blanco**, así que no habrá rechazo por alfa, pero **tu marca lima y verde termina compuesta sobre fondo blanco en vez del negro de ATP**, y al estar casi a sangre, la máscara de esquinas de iOS recorta el glifo.

**Entregar un `ios.icon` dedicado:** 1024×1024, opaco, fondo negro, sin esquinas redondeadas pre-aplicadas, con alrededor de 10% de margen.

## 10 · El icono adaptativo de Android se va a recortar
`adaptive-icon.png` tiene el contenido a radio 403 px contra un radio seguro de 338. **En máscaras circulares se corta el logo.** Reducirlo alrededor de 16%.

---

# 🟡 Medio

## 11 · Dos textos de permiso están flojos
Cuatro de seis están muy bien. El de HealthKit es el mejor de todos: *"lee tus entrenamientos... Solo lectura, nada se escribe ni se comparte."*

**Los dos que hay que reescribir:**

`NSSpeechRecognitionUsageDescription` (`app.json:18` y `:93`) — hoy dice *"ATP necesita reconocimiento de voz para transcribir lo que dices"*. Es circular: explica la función con la función. Es el patrón exacto que Apple rechaza.
> **Propuesto:** *"ATP convierte tu voz en texto para que registres comidas, entrenamientos y notas de journal hablando, sin teclear."*

`NSMicrophoneUsageDescription` (`app.json:17` y `:92`) — *"para que puedas hablar con ARGOS"*. "ARGOS" no significa nada para quien revisa.
> **Propuesto:** *"ATP necesita el micrófono para que puedas dictar tus registros y conversar por voz con ARGOS, tu asistente de rendimiento, en vez de escribir."*

Ambos están declarados dos veces, en `ios.infoPlist` y en el plugin. Gana el plugin. **Cambiar en los dos lados.**

## 12 · Los permisos, uno por uno: todo lo demás cuadra
Cámara, micrófono, audio, los cuatro de Health Connect y HealthKit están todos declarados **y usados de verdad**. No hay ninguno declarado de más ni usado sin declarar, salvo el FINE_LOCATION del punto 7.

`UIBackgroundModes: ["audio"]` está justificado por el player de Mente. **Apple lo prueba:** verifica en el build de revisión que una meditación siga sonando con la pantalla bloqueada.

## 13 · PostHog arranca antes del consentimiento
`app/_layout.tsx:138-144` inicializa PostHog con captura de ciclo de vida **antes de cualquier consentimiento**, mientras el opt-out vive en `settings/privacy.tsx:106`. Tu política publicada dice que analytics es **opt-in**.

O el default arranca apagado, o se corrige el texto de la política. Hoy no coinciden.

Lo bueno: session replay desactivado, y Sentry con `sendDefaultPii: false` más `scrubSentryEvent`.

## 14 · ATT no aplica, y está bien así
No hay `expo-tracking-transparency` ni debe haberlo: PostHog no recolecta IDFA y el `identify` es de primera parte. **Pero sí hay que llenar las etiquetas de privacidad** de App Store (Salud y Forma Física, Información Sensible, Identificadores, marcados como vinculados al usuario pero **no** usados para rastreo) y el Data Safety de Play declarando datos de salud.

---

# 🟢 Fricción

## 15 · El segundo envío a TestFlight va a ser rechazado
`app.json:14` tiene `buildNumber: "1.9.0"` fijo y el perfil `beta` no tiene `autoIncrement`, que solo está en `production`. **El segundo upload de la misma versión rebota por número de build repetido.** Agregar `"autoIncrement": true` al perfil beta.

## 16 · El reviewer no puede ver nada sin cuenta
`app/index.tsx` manda a login y luego a onboarding obligatorio. **Necesitas una cuenta demo con datos poblados** (perfil completo, algún laboratorio, historial de entrenos, Pro activo), y no encontré ninguna documentada en el repo.

En las notas de revisión hay que explicar qué es ARGOS, que HealthKit es solo lectura de entrenamientos, y el modelo de suscripción.

## 17 · Congela el canal OTA durante la revisión
`app/_layout.tsx:93-100` busca y aplica actualizaciones en el arranque en frío, con reload. Si publicas un OTA mientras te revisan, el reviewer ve un reinicio raro a medio uso.

## 18 · Sueltos
- `submit.production` en `eas.json:31` está vacío. `eas submit` te lo va a pedir interactivo.
- `expo-notifications` se usa (`push-notification-service.ts:41-55`) pero no está en el array de plugins. **Verifica que exista la APNs Key en las credenciales de EAS**, si no truena en la primera pantalla que pida el token.
- El perfil `beta` genera APK. **Play no acepta APK para release**, necesitas el AAB del perfil `production`.

## ✅ Lo que ya está resuelto y Apple exige
Borrado de cuenta dentro de la app (`settings/privacy.tsx:384` y `settings/cuenta.tsx:100`), restaurar compras en dos lugares, y age gate de 18 años.

---

# 📋 Antes de subir

**iOS**
1. Sacar del binario las recargas de H+ con precio en pesos y el botón "Comprar (dev)".
2. Rellenar o retirar los corchetes de `legal-texts.ts`.
3. Bloque de renovación automática en el paywall, y aclarar que el trial de 14 días es solo Base mensual.
4. Crear los IAP en App Store Connect y confirmar que `offerings.current` devuelve packages.
5. Alinear el precio de Pro entre el paywall y los términos publicados.
6. Reescribir los dos textos de permiso (voz y micrófono), en los dos lugares.
7. Icono dedicado: 1024×1024, opaco, negro, con margen.
8. `"autoIncrement": true` en el perfil beta.
9. Cuenta demo poblada con Pro activo, más notas de revisión.
10. Etiquetas de privacidad de App Store.
11. Verificar la APNs Key y que el audio de Mente siga sonando con pantalla bloqueada.
12. Congelar el canal OTA durante la revisión.
13. **Inscribirte al Small Business Program.** Es 15% contra 30%.

**Android**
1. Mismo fix de la tienda de H+ y de los corchetes legales.
2. Quitar `ACCESS_FINE_LOCATION`.
3. Enrutar `ViewPermissionUsageActivity` a la política de privacidad.
4. Presentar la declaración de Health Connect en Play Console: justificación por cada uno de los cuatro permisos, video de la funcionalidad y URL de política.
5. Rehacer el icono adaptativo con el logo 16% más chico.
6. Completar Data Safety: salud, biométricos, ubicación aproximada, fotos, audio y analytics, con el opt-out visible.
7. Build con perfil `production` para obtener AAB.
8. Content rating, categoría Salud y Forma Física, y declarar la URL de borrado de cuenta desde web.
