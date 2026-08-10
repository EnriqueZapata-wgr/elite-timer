# 📲 DELIVERY MB-32 · Los widgets

**Rama:** `feat/mb32-widgets` · 2026-08-10 · TRAE CÓDIGO NATIVO, exige BUILD (sin OTA).
**Versión en `app.json`: NO se tocó** (regla 11: el bump va con el build, después del merge).

---

# 🚨 PIEZA 0 · Cómo se resolvió el candado (lo primero a auditar)

**En una línea: el widget NO escribe, y los escritores canónicos quedaron blindados
contra el pisado.** Son tres capas, cada una con su test:

## Capa 1 — El nativo no conoce la base

El Kotlin de `modules/atp-widgets` no tiene URL de Supabase, ni llave, ni cliente
HTTP: **un tap encola una ACCIÓN** (`{id, kind, source/ml, next}`) en
SharedPreferences y pinta el cambio optimista localmente. Nada más.

## Capa 2 — Un solo ejecutor, los mismos writers

La cola la drena **únicamente** `src/services/widgets/widget-actions.ts`, en el
runtime de JS, por EXACTAMENTE los mismos writers que la UI:

| Acción del widget | Writer (el mismo de la app) |
|---|---|
| `toggle_habit` | `persistBooleanToggle` (tarea-actions) |
| `add_water` | `addWater` (hydration-service, el de la acción de notificación MB-30B) |

El drenador llega por tres puertas **al mismo runtime**: HeadlessJsTaskService
(tap con app muerta o viva, `allowedInForeground=true`), replay al arrancar la
app (`WidgetSyncBridge`, doctrina cold start MB-30B) y AppState→active. Si el
servicio no puede arrancar, plan B del brief: **se abre la app** y ella drena.
Dedup por id de acción (anillo de atendidos, espejo de `markResponseHandled`).

## Capa 3 — El writer mismo ya no puede pisar (la lección de B6b)

El miedo real no era duplicar: era **PISAR** el blob `daily_electrons`. La nota
B6b del FIFO decía que el botón de sol esperaba "un writer atómico por-fuente".
**Ese writer ahora existe y es el mismo `persistBooleanToggle`:**

1. **Serialización** (`src/services/hoy/day-write-lock.ts`): TODO
   leer-mezclar-escribir del día entra a UNA cadena de promesas. En Android la
   app, el widget y el handler frío comparten un proceso y un runtime (el
   headless reusa el ReactContext): encadenar ahí serializa de verdad. Entraron
   los TRES escritores del blob/día: `persistBooleanToggle`, `addWater` y
   `syncElectronFromEvent` (agenda, que ya leía fresco pero corría sin candado).
2. **Lectura fresca**: la base de la mezcla es lo que hay EN la base en ese
   momento, no el mapa que el caller compiló hace rato. El `currentStates` del
   caller solo siembra el primer write del día (blob inexistente = nada que
   pisar). Un compile viejo de TareasView ya no puede borrar lo que el widget
   escribió en medio, ni al revés.

**Sin doble conteo:** el award sigue idempotente por `user:source:día` (el 23505
colapsa) y el widget nunca palomea VERIFICADOS (su check nace de actividad real;
la fila abre la app, y el core además tira esas acciones como malformadas).

**Límite honesto:** la atomicidad es por-DISPOSITIVO (un proceso). Dos teléfonos
escribiendo el mismo día a la vez siguen en leer-mezclar-escribir serializado
por separado; la mezcla server-side (RPC `jsonb ||`) queda anotada en el FIFO
como hardening opcional. No es regresión: hoy ese caso ya existía y peor.

**Consecuencia colateral buena:** con el writer ya seguro desde handler frío, el
botón de sol de B6b se puede sumar en una línea al catálogo de notificaciones.
No se hizo (fuera del alcance); anotado en el FIFO.

---

# PIEZAS 1-3 · Lo entregado (Android)

## Pieza 1 · Hábitos (4x2)
Los hábitos del MOMENTO actual (espejo de `momentoForHour`), pendientes primero,
4 renglones y pie "+N pendientes más en ATP". Palomear pinta al instante
(optimista) y sincroniza por la cola; el resultado REAL corrige o revierte.
Graduados y en reposo NO viajan al snapshot (filtro del compile + defensa doble
en `buildHabitosSnapshot`). El fondo abre la app (HOY). Snapshot = piggyback del
compile de HOY: misma fuente única, cero queries extra.

## Pieza 2 · Agua (2x2)
Cuánto llevas, cuánto falta, barra en el color de concepto agua y el **+250**
(el único lima del widget, píldora con texto negro: 13.36 AAA). El total real
de `addWater` manda sobre el optimista. El fondo abre `atp://hydration`.

## Pieza 3 · Ayuno (2x2, SOLO lectura)
El contador corre en un `Chronometer` del sistema (tictac nativo, cero
despertares de la app) anclado a `fast_start`, con meta y hora de inicio. Sin
ayuno activo lo dice. Todo tap abre `atp://fasting`: abrir y cerrar ventana se
decide EN la app. Lectura por `getActiveFast` (fasting-service).

## Diseño (manual de marca)
Fondo SÓLIDO por tema (negro puro 3.5 / card acero `#E9EEF1` 3.6 con su borde),
nunca transparente. Tema: el snapshot viaja con `mode + despertar + corte` y el
Kotlin resuelve los cuatro modos con la MISMA semántica de `theme-mode-core`
(espejo con test de contrato). Poppins vía `res/font` (Regular + SemiBold,
~310 KB). Lima contado: el check palomeado y el +250, nada más; en claro jamás
como texto. Colores de concepto (agua `#60A5FA`, ayuno `#6B46C1`) como icono,
iguales en ambos temas. Copy es-MX sin em dash y sin promesas.

---

# PIEZA 4 · Las dos plataformas, con honestidad

## Android — entregado completo

**Decisión reportable: RemoteViews clásico, NO Glance.** Glance exige cablear el
compilador de Compose (`org.jetbrains.kotlin.plugin.compose`) dentro del gradle
del expo-module; en este entorno el Kotlin no se puede compilar (mismo caso
MB-30B) y un gradle mal cableado rompería el build COMPLETO de la app en el
merge. RemoteViews cubre todo lo pedido con API estándar y conservadora, y da
gratis el `Chronometer` vivo del ayuno (que Glance no tiene). Si el audit
prefiere Glance, es un swap de la capa de render: el candado, la cola, el
snapshot y los tests no cambian.

**Qué necesitó:**
- Módulo local `modules/atp-widgets` (patrón `atp-night-filter`): 3 providers +
  `WidgetTapReceiver` + `AtpWidgetActionService` (HeadlessJsTaskService) +
  `WidgetStore` (SharedPreferences).
- Entry custom `index.js` (package.json `main`): registra la tarea headless
  ANTES del router — el servicio arranca el bundle sin Activity.
- **Permiso nuevo: `WAKE_LOCK`** (normal, se concede solo, sin prompt).
  Justificación: mantener el proceso despierto los ~2 s del registro tras un
  tap (patrón documentado de `HeadlessJsTaskService.acquireWakeLockNow`). No
  se agregó a `app.json` porque el manifest del módulo lo mergea (mismo
  mecanismo que night-filter); si se quiere visible para revisión de tiendas,
  es una línea en `app.json` al hacer el build.
- Sin `RECEIVE_BOOT_COMPLETED`, sin foreground services nuevos, sin Glance ni
  dependencias nuevas de gradle. Cero dependencias npm nuevas.

**Riesgos honestos para el audit y el build:**
1. **El Kotlin no se compiló en este entorno** (no hay SDK de Android aquí).
   Está escrito conservador (framework + org.json + java.time, minSdk 26 lo
   cubre); su primera compilación real es el build, doctrina MB-30B. El audit
   debería ojear los 8 `.kt`.
2. **HeadlessJsTaskService con new architecture** (`newArchEnabled: true`, RN
   0.81): soportado vía ReactHost desde 0.77, pero es el punto que verificaría
   primero en device (tap con app muerta → electrón registrado al abrir).
   Si fallara, el plan B ya existe y queda solo: abrir la app + replay.
3. Si el compile del módulo no resolviera las clases de React
   (`HeadlessJsTaskService`), el fix es una línea en su build.gradle
   (`compileOnly com.facebook.react:react-android`); expo-modules-core la
   expone normalmente.
4. El momento del widget se recalcula cada 30 min (mínimo del sistema): al
   cruzar las 12:00/18:00 puede tardar hasta media hora en cambiar de bloque
   si nadie lo toca. El contenido real siempre está al día vía push + optimista.

## iPhone — NO cupo en este run, y esto es lo que exigiría

**No se instaló nada** (regla del brief: versión mínima es decisión de Enrique).

1. **Un target nativo nuevo** (WidgetKit extension, SwiftUI). Expo CNG no crea
   targets extra: haría falta `@bacons/apple-targets` (config plugin, el
   estándar de facto para esto en Expo) o mantener `ios/` a mano. Son:
   dependencia nueva, target firmado aparte en EAS (credenciales por bundle id
   `com.atpperformance.app.widgets`) y App Group para compartir el snapshot.
2. **Versión mínima: NO exige subirla.** Widgets solo-mostrar funcionan desde
   iOS 14; los interactivos exigen iOS 17+. El proyecto hereda el mínimo de
   Expo SDK 54 (iOS 15.1). El camino honesto: widget que muestra en 15.1-16.x
   (tocar abre la app) e interactivo en 17+. El copy no promete paridad.
3. **El hueco real es el candado:** iOS no tiene HeadlessJsTaskService. Un
   AppIntent (iOS 17) corre en el proceso de la extensión, donde NO hay runtime
   de JS: el tap solo podría encolar y el drenado esperaría a la próxima
   apertura de la app (palomeo optimista con sync tardío), o el botón abre la
   app directo. Escribir a Supabase desde Swift está prohibido por la pieza 0.
   **Esa decisión (sync tardío vs abrir la app) es de producto y es de Enrique.**

Un widget de Android que funciona vale más que dos a medias: Android va
completo; iOS queda especificado para su propio run.

---

# PIEZA 5 · Tests (resultados reales)

*Se llena en el commit de la pieza 5 con los números de la corrida real.*

---

# 📋 Verificación en device (Enrique, S24, DESPUÉS del build)

1. Agregar el widget de hábitos → palomear SIN abrir la app.
2. Abrir ATP: el hábito palomeado y el electrón contado UNA vez.
3. Palomear en el widget con la app abierta: nada más se borra.
4. +250 de agua desde la pantalla de inicio (y verlo en HOY).
5. El ayuno corriendo sin abrir nada.
6. Tema claro en Ajustes → el widget en acero.
7. Cerrar sesión → los widgets quedan en "Abre ATP".
8. Tap del widget con la app MUERTA (forzar cierre) → abrir después: el
   registro llegó (este es el que valida HeadlessJS en new arch).
