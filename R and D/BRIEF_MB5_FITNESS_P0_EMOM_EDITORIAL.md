# 🔥 MEGA BRIEF · MB-5 — P0 bugs + EMOM real + constructor + barrida editorial (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb5-fitness-p0` desde `main` (ya trae MB-4, MB-4.1, MB-SEC-1). NO merge, tsc + tests verdes, **NO tocar la versión**. Cowork audita.
**Origen:** device test real de Enrique sobre el build **1.7.0** (el primero con Fitness nativo completo). Su veredicto: *"vamos muy bien, está muy chingón, ya corren los videos"* — y una lista de mejoras.
**Cierra en build nativo.** Encadena los bloques EN ORDEN; el 0 es sagrado.

---

# 🔴 BLOQUE 0 · P0 — LO QUE ROMPE

### 0.1 · `exercise_logs.metadata` NO EXISTE — se pierden las sesiones *(el peor)*
Enrique terminó una sesión y salió: **`Could not find the 'metadata' column of 'exercise_logs' in the schema cache`**. Reintentó, falló otra vez, y solo pudo "salir sin guardar" → **perdió el entrenamiento**.
**Verificado por Cowork contra el remoto:** `exercise_logs` tiene `id, user_id, exercise_id, execution_log_id, block_id, set_number, reps, weight_kg, rpe, notes, logged_at, rir, date, session_id, matrix_slug`. **No hay `metadata`.** Pero el código la escribe en 5 lugares (`log-exercise.tsx` 495/510/525/538 y `workout-session-service.ts` 192) — es deuda vieja que solo salió a la luz ahora que se usan los métodos en sesión.
**Default:** migración idempotente `ALTER TABLE exercise_logs ADD COLUMN IF NOT EXISTS metadata jsonb;` **+ barrer si hay otras columnas que el código escribe y no existen** (mismo patrón, otras tablas — vale la pena una pasada).

### 0.2 · No se puede volver a la sesión tras un error de guardado
El diálogo solo ofrece **Reintentar** o **Salir sin guardar**. No hay forma de regresar al entrenamiento y seguir. **Default:** tercera opción **"Volver a la sesión"** que conserva el estado, y que el fallo de guardado **no destruya lo hecho** — persistir localmente para reintentar después (el trabajo del usuario es sagrado, no se pierde por un error de red o de esquema).

### 0.3 · CRASH al conectar con apps de salud
"CONECTAR Y LEER" → la app crashea (Sentry `ATP-MOBILE-E`, issue 7634111992).
### ✅ CAUSA RAÍZ CONFIRMADA (Sentry + verificación de la librería) — no adivines, es esto
```
UninitializedPropertyAccessException: lateinit property requestPermission has not been initialized
culprit: dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate.launchPermissionsDialog (línea 45)
device: SM-S928B · Android 16 · app 1.7.0+17 · handled: no · UncaughtExceptionHandler
```
**El porqué:** `react-native-health-connect` **exige** registrar el delegado de permisos en `MainActivity.onCreate`:
```kotlin
HealthConnectPermissionDelegate.setPermissionDelegate(this)
```
(está en su propio README, sección de setup). **Y su plugin de Expo (`node_modules/react-native-health-connect/app.plugin.js`) SOLO toca el AndroidManifest — NO parcha MainActivity.** Verificado por Cowork. Como ATP es Expo managed y no tiene MainActivity en el repo, ese registro nunca ocurrió → el `ActivityResultLauncher` queda sin inicializar → `lateinit` revienta al abrir el diálogo.

**Default:** **config plugin propio** que aplique un mod `withMainActivity` agregando el import y la llamada a `setPermissionDelegate(this)` en `onCreate`. Ojo: el registro de un `ActivityResultLauncher` debe pasar **antes** de que la Activity arranque, así que va en `onCreate`, no después.
**Además, blindar el flujo igual:** Health Connect no disponible / no instalado / permiso negado → mensaje claro y salida elegante, **nunca crash**. Prueba los tres caminos.
⚠️ **Es cambio nativo:** no se puede verificar por OTA, necesita build. Y el `try/catch` de JS **nunca** iba a atrapar esto (excepción Kotlin sin manejar en worker de corrutina) — no lo intentes por ahí.
ℹ️ Descartado por Cowork: el código **sí** hace `getSdkStatus()` antes de `initialize()` (correcto) y los `recordType` pedidos **sí** coinciden con los permisos del manifest. El problema es solo el delegado.

### 0.4 · Apple Health en el copy
La pantalla dice "Strava, Garmin, Samsung Health y Google Fit". **Falta Apple Health** (iOS ya está integrado vía HealthKit). Corregir el copy para que nombre lo que aplica según plataforma.

---

# 💪 BLOQUE 1 · EMOM DE VERDAD *(criterio de Enrique — es su método)*

### 1.1 · El EMOM no es 10×10 fijo, es **X×X**
Hoy está hardcodeado a 10 rondas × 10 reps. **Enrique:** *"el EMOM autoajustable no siempre es 10 de 10, es X de X, y el autoajuste viene en X+1 respecto a X×X."*
**Default:** parametrizar rondas y reps. El usuario (o el generador) define X reps × N rondas; la serie de paga sigue siendo la **X+1** con la deuda acumulada. **La regla de peso NO se toca** (deuda 0 → sube · deuda > última serie → baja · si no → mantiene).

### 1.2 · Candado de carga: qué ejercicio sirve para EMOM y con cuántas reps
**Enrique:** *"mountain climbers no sirve para EMOM con 10 reps — no es carga significativa. Push-ups sí, pull-ups sí. Crunch tampoco, salvo con muchas reps. 25 mountain climbers en 8-15 rondas sí sería buena idea."*
**Default:** el EMOM debe proponer **reps acordes a la carga del ejercicio**, no un número fijo:
- Ejercicios **cargables** (barra, mancuerna, máquina, lastrados) → reps bajas (**6-12**), donde la carga hace el trabajo.
- Peso corporal **de alta demanda** (pull-ups, dips, push-ups) → reps medias (**8-20**).
- Peso corporal **de baja demanda / metabólicos** (mountain climbers, crunch, jumping jacks, escaladores) → **reps altas (20-40)** y más rondas (**8-15**), o no se ofrecen para EMOM.
**Esto sale de la matriz:** usa `cargable`, `Unidades equipo`, `cualidades` y `nivel` para derivar el rango. **Propón el rango por defecto y deja que el usuario lo ajuste** (guiado, no prisionero). Enrique revisa los rangos después.

---

# 🏗️ BLOQUE 2 · CONSTRUCTOR Y RUTINAS

### 2.1 · El constructor no puede usar los ejercicios de la matriz *(con clip)*
Hoy "Asignar ejercicio" no llega al catálogo nuevo. **Enrique:** *"quiero poder seleccionar mis ejercicios en video para tener todas las funcionalidades. Sería la parte más pro de las rutinas."*
**Default:** el selector del constructor lee de **`exercise_matrix`** (214 ejercicios, con clip, músculo, equipo, método) con el mismo buscador y filtros que la biblioteca. Una rutina construida así **hereda todo**: clip en la ejecución, métodos ATP aplicables, benchmark de edad si corresponde.

### 2.2 · Compartir rutinas personalizadas con la comunidad
Ya existe infraestructura (`create_routine_share`, `clone_from_share`). **Default:** cablear el compartir/clonar **para rutinas del patrón nuevo**, con la capa social que ya existe. Privacidad: compartir es explícito, nunca por defecto.

### 2.3 · Limpieza de "Mis rutinas" *(Enrique: "hay todo un desmadre")*
Su catálogo tiene ~25 rutinas viejas, muchas duplicadas ("Push Power - Hipertrofia Avanzada" ×10) y varias con **"0 ejercicios · toca para editar"**.
**Default:** herramienta de limpieza **con confirmación explícita del usuario** — nunca borrado silencioso. Propuesta: marcar las rutinas que no cumplen el patrón nuevo (0 ejercicios, o sin `matrix_slug`) y ofrecer archivarlas/eliminarlas en lote, mostrando qué se va. **De aquí en adelante, solo se guardan y comparten rutinas del patrón nuevo.**
⚠️ **Son datos reales de Enrique** — que la operación sea reversible o al menos muy explícita.

---

# 🎨 BLOQUE 3 · BARRIDA EDITORIAL GRADIENTE *(lo que más pidió)*
**Enrique:** *"aún falta editorial gradiente"* — lo repitió en casi todas las pantallas. La vara: `docs/DESIGN_SYSTEM.md` (los 4 ejes) y la referencia lograda es **Mente V1.5.2** y el hub de Fitness (que sí le gustó).

| Pantalla | Qué pidió |
|---|---|
| **Biblioteca** | *"está perfecta, funciona perfecto"* — solo **gradiente en botones y en los autofiltros** (chips Músculo/Equipo/Patrón/Nivel). |
| **Movilidad (evaluación)** | **Los botones siguen hiperoscuros** — es el bug de opacidad apilada. Subir a editorial gradiente. |
| **Cardio (hub y registrar)** | *"muy basic, estilo legacy"* → subir a ATP gradiente. El botón **GUARDAR SESIÓN se ve hiperoscuro** (mismo bug). |
| **Fuerza / benchmarks (ELITE)** | Se ve bien pero **muy verde brutalist**. Subir a gradiente; el card superior a **editorial gradiente**. ⚠️ **La palabra "ELITE" ahí es el NIVEL del atleta, NO la marca vieja — se queda.** Revisar que las etiquetas de nivel corran bien. |
| **Constructor** | Subir al molde editorial. |
| **Sesión / runner** | Ya mejoró mucho; rematar al mismo nivel. |

**Bug transversal a cazar:** varios botones se ven "apagados como si tuvieran algo encima" (movilidad, guardar sesión de cardio). Es el patrón de `opacity` apilada sobre color ya muted que el design system prohíbe. **Barrer TODO el pilar** buscando ese antipatrón, no solo las dos pantallas nombradas.

---

# 🧭 BLOQUE 4 · UX FINA DE CARDIO
1. **"Otra" no es intuitiva.** Enrique no supo que ahí se ponía tiempo personalizado. **Default:** que el selector de duración muestre la opción de tiempo custom de forma evidente (ej. reloj/stepper visible desde el inicio, no escondido tras "Otra").
2. **Título truncado: "REGISTRAR CARD…"** — verificar que diga **"Registrar cardio"** y que el header no corte. Revisar otros títulos largos del pilar.

---

## Protocolo
`feat/mb5-fitness-p0` desde `main`. Migraciones **idempotentes + RLS**. `npx tsc --noEmit` (0) + tests verdes + eslint sin errores nuevos. NO merge, NO tocar versión.
**Delivery con:** causa raíz confirmada del crash de Health Connect (y en qué plataforma/versión lo probaste), los rangos de reps propuestos por tipo de carga para que Enrique los vete, qué encontró el barrido del antipatrón de opacidad, y checklist de device-test por bloque.
