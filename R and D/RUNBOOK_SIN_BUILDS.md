# Runbook · qué hacer si algo sale mal y no hay builds

**Situación:** el binario 2.2.0 (Android 23, iOS 5) es el último. Todo lo que
entró después de compilarlo viaja por OTA. Este documento existe para que
cualquier problema se pueda apagar sin compilar.

La buena noticia es que la restricción es menos apretada de lo que parece: los
builds son el recurso escaso, los OTA no. El binario ya lleva HealthKit, Health
Connect, la cámara y los widgets, que era todo lo nativo pendiente. Nada de lo
que sigue necesita compilar.

---

# ORDEN DE DESPLIEGUE, SIEMPRE ESTE

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx tsc --noEmit
npm test
npx supabase db push
npm run sourcemaps:ota
```

`db push` va ANTES del OTA. Si el JavaScript sale primero, la app busca tablas
que todavía no existen y truena.

El OTA se publica SOLO con `npm run sourcemaps:ota`, nunca con `eas update` a
secas. El script hace las dos cosas: publica y sube los sourcemaps. Correrlos
por separado publica dos actualizaciones con mapas que no corresponden, y
entonces los stacktraces de Sentry mienten.

**Migración pendiente de aplicar: `275_insight_ventana_y_cuota_ponderada.sql`.**

---

# EL INTERRUPTOR DE PÁNICO

Todo lo riesgoso de este ciclo está detrás de una constante en
`src/constants/flags.ts`. Ponerla en `false`, correr `tsc`, y publicar el OTA
revierte el comportamiento sin tocar datos y sin compilar.

| Bandera | Qué apaga | Qué NO deshace |
|---|---|---|
| `LOGIN_PASA_POR_GATE` | Vuelve a entrar directo a las pestañas sin pasar por el gate de onboarding y consentimientos | Nada. Es solo ruteo |
| `DIA_1_SIEMBRA_SUAVE` | Deja de sembrar el día 1 con tareas explícitas | Lo ya sembrado se queda. No le quita nada a quien ya entró |
| `SALUD_DEL_SISTEMA_ALIMENTA_EL_DIA` | Los datos de HealthKit y Health Connect dejan de alimentar el día, los electrones y la lectura | Los electrones ya pagados NO se devuelven. Es historial del usuario y es sagrado |
| `RANGOS_UNA_SOLA_FUENTE` | La calificación de laboratorio vuelve al motor legacy | Nada. Es presentación |
| `INSIGHT_EN_VENTANA` | El insight vuelve a dispararse uno por uno | Nada |

**Aviso antes del primer OTA:** con `SALUD_DEL_SISTEMA_ALIMENTA_EL_DIA` en
`true` y la economía encendida, los electrones de pasos (20 H+) y de sueño
(30 H+) empiezan a pagarse desde el primer día, con tope de uno diario cada uno
e idempotencia por usuario y fecha. Si prefieres observar antes de que corra
dinero, publica con esa bandera en `false` y enciéndela en el siguiente OTA.

---

# LO QUE ENTRÓ, POR SI HAY QUE REVERTIR ALGO PUNTUAL

Todo lo que no tiene bandera se revierte con `git revert <hash>`, y todos son
independientes entre sí.

## Bloqueante legal, lo más importante del ciclo
`46c2b9b` · `login.tsx` hacía `router.replace('/(tabs)')` y con eso alguien
entraba a la app sin pasar por el onboarding ni aceptar los consentimientos
CB-2, CB-3 y CB-4. En una app de salud eso es cumplimiento, no cosmética.

Había un segundo agujero que no estaba en el análisis y era peor: el gate usaba
`.single()`, así que un perfil inexistente lanzaba error, caía al `catch`, y
terminaba abriendo la puerta. La ausencia de perfil ABRÍA el paso. Ahora usa
`.maybeSingle()`.

Se gateó por `onboarding_step` y no por `user_consent_log` a propósito: esa
tabla nace en la migración 209 y la 032 marcó a todos los usuarios previos como
completados, así que tienen cero filas de consentimiento. Gatear ahí los habría
mandado a firmar otra vez lo que ya firmaron.

## Día 1 y adopción
`972c2e6` `4a06e37` `0603f19` `4017763` `1875627` `4d5996e` · siembra explícita
al cerrar el onboarding, estado casi vacío en HOY, `/packs/armar` como llamada a
la acción de primera clase, `seedInitialApps` movido al cierre del onboarding,
dos chips de navegación en el chat, y el "¿qué es esto?" cableado en el
encabezado, que aparece en unas 50 pantallas de una sola edición.

`99ff86c` `a425ca4` · tres acciones destructivas que solo existían como
pulsación larga ahora tienen entrada visible.

## Salud del sistema operativo
`bee6b84` `09b24b5` · los datos por fin llegan al día, a los electrones y a la
lectura. Un dato importado NUNCA pisa uno que el usuario escribió a mano.

## Rangos y QR
`a63555c` · se acabaron las dos verdades sobre rangos funcionales.
`93d297b` · el QR clínico NO se construyó, a propósito. Ver la sección de
huecos honestos.

## Costos
`f3abb54` `d1d1217` `1a0d568` `4a3e367` · el insight ya no lleva el cerebro de
26,000 tokens y hay un candado que impide que vuelva, la cuota diaria dejó de
cobrar lo mismo por una extracción barata que por una consulta con cerebro
completo, y los llamadores que no son el chat dejaron de pagar por una caché
que no podían aprovechar.

---

# HUECOS HONESTOS

Estos NO están resueltos y es mejor que estén escritos que descubiertos.

**El QR clínico no existe.** No es olvido: un hospital escanea con la cámara del
sistema operativo, así que el código tiene que abrir un navegador, y para eso
hace falta `associatedDomains`, que es configuración nativa y por lo tanto un
build. Las otras tres decisiones pendientes (dónde vive el documento, quién
puede entrar y si queda rastro, y qué significa exactamente "historia clínica
completa" cuando ya hay cuatro documentos distintos construidos) están escritas
en el encabezado de `QrFicha.tsx`.

**La siembra del día 1 no viene del pack.** El pack se elige después de la
pantalla de notificaciones, así que al cerrar el onboarding todavía no existe.
Se siembran tres universales y el pack se aplica encima de forma aditiva. El
parámetro está construido pero el llamador le pasa `null`.

**El día 1 son ocho filas, no tres.** Los cinco obligatorios no son
deseleccionables y existen para tapar un bug del toggle silencioso. Quitarlos
dejaría al usuario sin forma de reencenderlos. Ocho sigue siendo el techo que la
doctrina ya fijaba.

**Tres errores en la matriz funcional, que necesitan firma clínica y no la mía:**
`ldh` está en unidades distintas para hombres y mujeres, `acido_urico` se
contradice entre dominios, y `apolipoproteinas_b` tiene sus cortes fuera de
orden. La matriz es la fuente de verdad del algoritmo y no se toca sin revisión.

**`calculateHealthScore` sigue en el motor legacy.** Es el score que se
persiste, con sus propios pesos. Cambiarlo mueve un número ya guardado en base y
no cabía detrás de una bandera de presentación.

**`cardio_hr_wearable` sigue sin cablear.** Necesita frecuencia cardiaca por
sesión de ejercicio y la tabla solo guarda la de reposo del día. No hay fuente.

---

# LO QUE NO SE HA VERIFICADO

Dicho sin adornos, porque es el riesgo real de este ciclo.

**Nada de esto ha corrido en un teléfono.** Ni la salud del sistema, ni el día 1
nuevo, ni el gate de login, ni el tema claro en 70 archivos. Los tests están en
verde, pero un test no ve un contraste ilegible ni una pantalla que no monta.

Los agentes que escribieron este código no pudieron ejecutar `vitest`: el
`node_modules` del proyecto tiene binarios de Windows y ellos corren en Linux.
Verificaron con arneses propios. **La corrida que cuenta es `npm test` en tu
máquina.**

`ClientDetailScreen.tsx` es el archivo de mayor riesgo acumulado: 4,166 líneas
con mil doscientas de diferencia por el tema claro. Compila, pero es el primero
que hay que mirar en pantalla.

---

# CÓMO SE VERIFICA TODO DE UNA SOLA PASADA

```
.\scripts\audit-visual.ps1 -Tema oscuro
```

Cubre 306 pantallas, incluidas por fin las dinámicas: los reportes por dominio,
el motor de cuestionarios, los packs, el Centro y las pestañas. Antes solo veía
192 y dejaba fuera justo lo más nuevo.

Antes de correrlo: diez minutos de apagado de pantalla, y **apagar el filtro de
luz azul**, que tiñe las capturas de ámbar y ensucia la revisión de color.

Si una pantalla tumba la app, el barrido se recupera solo y sigue.
