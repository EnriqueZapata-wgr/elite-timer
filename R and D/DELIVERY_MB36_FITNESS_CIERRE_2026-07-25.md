# 🏁 DELIVERY · MB-3.6 — CIERRE TOTAL DE FITNESS

**Fecha:** 2026-07-25 · **Rama:** `feat/mb36-fitness-cierre` (desde `main` a981c9c) · **NO mergeada, versión NO tocada.**
**Verificación:** `npx tsc --noEmit` = 0 · **2118 tests verdes** (30 nuevos) · `npx eslint` sin errores nuevos (los warnings que quedan son preexistentes).
**Commits:** 5 atómicos, uno por bloque. **Cierra en BUILD NATIVO** (deps de salud + expo-video de MB-3.5).

---

## ✅ ESTADO POR BLOQUE — los 5 al 100%

### Bloque 1 · Arquitectura de navegación — 100%
- **Hub abre con LA SESIÓN DE HOY** (patrón Oura). El motor es determinista, así que el hub REGENERA la sesión de hoy sin persistirla (seed `userId|fecha|0` + las prefs del generador, ahora compartidas vía `generator-prefs.ts` — incluye el último objetivo/enfoque para paridad hub↔generador). Estados honestos: `primer_uso` (pregunta el nivel), `sin_prefs` (CTA "Genera tu sesión", misma jerarquía distinto copy), `lista` (qué toca + cuánto dura + EMPEZAR directo al runner), `entrenado` (completado + qué logró + cardio del día; "entrenar otra vez" queda como quiet, no como si nada). Semana en secundario; 3 navegaciones en filas terciarias.
- **Fusión Fuerza + Récords** en `/fitness-strength`: hero RENDIMIENTO (nivel + PRs + mejor 1RM) + BENCHMARKS con variantes + TUS MARCAS (filtros por músculo, tabla por rep-range, progresión expandible, historial, borrar con long-press). `/personal-records` → redirect; el tab Progreso re-exporta la fusionada. **El percentil placeholder (`totalPRs*5+20`) se RETIRÓ** — era dato inventado.
- **`/timer` muerta** → redirect a `/fitness-hiit`; CTA "Abrir timer libre" retirado.
- **Métodos ATP dentro de la biblioteca** (tab `MÉTODOS ATP`, re-estilizados a tokens); `/training-methods` → redirect. `/fitness-explore` ELIMINADA (menú de 1 item tras la mudanza) — el hub va directo a la biblioteca.
- **ARGOS retirado de Fitness** ("ARGOS, ajústala" fuera del generador — hoy genera desde cero ignorando el algoritmo; vuelve cuando tome el output del generador como input).
- **Nivel al perfil** (mig **224** `profiles.fitness_level`, idempotente + constraint): lo pregunta el hub la primera vez, editable en **Ajustes › Salud y protocolo › FITNESS**, el generador lo lee del perfil y lo escribe al cambiarlo. AsyncStorage queda solo como caché offline.

### Bloque 2 · Movilidad completa — 100%
- **Evaluación guiada real** de los **7 tests** que persiste `mobility_assessments` (4 bilaterales → 11 columnas): un test por paso con por-qué + cómo-se-hace paso a paso + anclas de puntuación concretas ("mis manos quedan a más de 20 cm…"). Toe touch y knee-to-wall son **medida física en cm**; los demás son auto-evaluación 0-10 con anclas — **la UI lo dice tal cual** ("los de cm son medida física; los demás tu auto-evaluación").
- **Scoring transparente** (`mobility-core.ts`, puro, 8 tests): toe touch lineal (0 cm=8, +5=10, −20=0), knee-to-wall 12 cm=10; bilaterales promedian y **flaggean asimetría ≥2**; overall solo de lo capturado (vacío = null, sin inventar). Comparación contra la última evaluación **anterior a hoy** con deltas por test.
- **Rutinas de movilidad**: objetivo `movilidad` en EL MISMO motor (cero segundo generador) — pool sin recorte de enfoque, bloques 2×45 s con anti-repetición y seed determinista, aviso honesto si el pool no llena el tiempo. Accesible desde el generador (chip Movilidad) y desde la evaluación (`?objetivo=movilidad`). 6 tests nuevos en el core.
- **Reactivada en Mi Fitness** (ya no placeholder oculto).

### Bloque 3 · Cardio completo — 100%
- **3.1 Registro 2 taps**: disciplina + duración preset (15/20/30/45/60/90 u "Otra") → GUARDAR. Distancia/FC/RPE/notas **opcionales y plegadas** ("Más detalles"); sugerencia "La última vez: 45:00 · 5.2 km — tocar para repetir" prellena todo. Distancia ahora opcional en el servicio (sin ella no hay pace ni chequeo de PRs — y está bien).
- **3.2 Import desde apps de salud**: **Health Connect (Android) + HealthKit (iOS)** — Strava/Garmin/Samsung/Google Fit escriben ahí; una integración, todas las fuentes. Pantalla de **consentimiento propia ANTES del permiso del sistema** (qué se lee y para qué; solo lectura; solo entrenamientos — minimización). Import manual default; **auto-sync opt-in** (nunca sincroniza sin activarlo; corre al abrir Cardio, últimos 3 días). Estados vacíos honestos (sin app / binario viejo / no soportado).
- **DEDUPE doble candado** (mig **225**): `external_id` único parcial por usuario + heurística (fecha + disciplina + duración ±10% o ±90 s) contra TODO lo del día incluidas sesiones manuales, e intra-lote (dos fuentes con el mismo workout). **9 tests.**
- **ECONOMÍA capeada**: los importados otorgan igual que el manual (`awardBooleanElectron('cardio')`, idempotente 1/día server-side) pero **solo si hay entrenamiento nuevo de HOY — cero retroactividad** (test). Import histórico entra al historial sin mover la economía, y la UI lo explica.
- **3.3 La sesión unifica**: `cardio_sessions.workout_session_id` (mig 225) — al guardar la sesión de fuerza se **adopta el cardio del día** y el cierre muestra "CARDIO DE HOY · TAMBIÉN CUENTA". El estado `entrenado` del hub también lo enseña. Fail-soft si la migración no ha corrido.

### Bloque 4 · Upgrade UI/UX ATP editorial — 100%
- **Cero hex crudo en el pilar** (verificado por grep): `log-exercise` (72 hex → tokens + 7 `Pressable` planos → `AnimatedPressable` spring), `strength-session`, `fitness-hiit` (el naranja `#fb923c` era un 4º color fuera de la doctrina → **amber de marca**), `fitness-cardio` (azul → `SEMANTIC.info`), `fitness-train`, biblioteca, detalle, generador. Las pantallas nuevas (hub, fuerza fusionada, movilidad, log-cardio, import) nacieron con tokens.
- **Un protagonista por pantalla**: hub=sesión de hoy · fuerza=hero rendimiento (glow único) · movilidad=score (glow único) · runner y detalle=clip · log-cardio=flujo de 2 taps.
- **Movimiento**: spring+haptic en todo lo táctil, stagger `FadeInDown/Up .delay(i*40).springify()` en listas, `LayoutAnimation.easeInEaseOut` en plegados (log-cardio), nada entra desde scale(0). **Reduce-motion**: Reanimated 3 desactiva las layout animations cuando el sistema lo pide (comportamiento default, verificado en docs de la lib — nada custom que lo rompa).
- **§4.5 Placa anatómica**: `ExerciseClip` con **fade real poster→clip (220 ms ease-out, sin parpadeo)** + marco hairline cálido + viñeta sutil arriba/abajo — el fondo crema del clip queda montado deliberado en el dark. Aplica en runner, detalle y biblioteca sin tocar a los consumidores.

### Bloque 5 · Cierres finos — 100%
- **Broad jump ACTIVADO limpio**: el runner detecta benchmarks de distancia (`esBenchmarkDistancia`) y captura **DISTANCIA (cm)** por intento ("INTENTO N", reps ya no significaban nada); cm viajan por `SessionSet → exercise_logs.metadata.distance_cm → puente Edad ATP`; nudge Tier B = `cm / estatura` (target 1×estatura, estándares prácticos; estatura de `health_measurements` con fallback `client_profiles`). **Sin estatura o sin distancia → se omite** (relativo o nada, sin mentir). 4 tests.
- **Dead-hang verificado**: `dinamica='Isométrico'` en la matriz → el runner pide SEG, el puente lee reps=segundos, targets 120 s H / 90 s M. 3 tests que lo fijan.
- Huecos MB-3.5 (`log-exercise`, HIIT) barridos en el Bloque 4.

---

## 📚 LIBRERÍAS ELEGIDAS (Health Connect / HealthKit) — ⚠️ BUILD NATIVO

| | Librería | Versión | Config plugin |
|---|---|---|---|
| Android | `react-native-health-connect` | 3.5.3 | SÍ — propio (`react-native-health-connect` en plugins; agrega el intent-filter de rationale). Permisos `android.permission.health.READ_EXERCISE/READ_DISTANCE/READ_HEART_RATE/READ_TOTAL_CALORIES_BURNED` agregados a `android.permissions`. |
| iOS | `@kingstinct/react-native-healthkit` | 14.0.2 | SÍ — propio, con `NSHealthShareUsageDescription` (copy de solo-lectura), `NSHealthUpdateUsageDescription: false`, `background: false` (entitlement HealthKit). |

- ⚠️ Kingstinct v14 **arrastra `react-native-nitro-modules` 0.36** (peer dep, ya en package.json) — una dep nativa más en el build.
- Ambas van con **lazy require + fail-soft** (doctrina "nativos nuevos SIEMPRE lazy require"): en el binario actual la pantalla de import dice honesto "llega con la próxima versión" y no crashea. **Nada de esto funciona por OTA — requiere el build.**

## 🗄️ MIGRACIONES (db push tras merge, protocolo de siempre)
- **224** `profiles.fitness_level` (idempotente, constraint por DO-block).
- **225** `cardio_sessions.external_id` + índice único parcial `(user_id, external_id)` + `cardio_sessions.workout_session_id` FK. Idempotente; RLS ya existente en ambas tablas (no se crean tablas).

---

## 🃏 §4.4 — TABLA card → dato → veredicto (para veto de Enrique)

**Aplicados (casos obvios):**

| Card | Dato | Veredicto |
|---|---|---|
| Fuerza · hero RENDIMIENTO | Nivel (ELITE/AVANZADO…) | **Protagonista** ✔ |
| Fuerza · hero | PRs totales · Mejor 1RM est. | Soporte ✔ |
| Fuerza · hero | ~~"Último PR" (peso + ejercicio)~~ | **SE FUE (aplicado)** — vivía también en la tabla de marcas con badges HOY/PR!. Un dato = un lugar. |
| Fuerza · hero | Percentil "%" | **SE FUE (aplicado, Bloque 1)** — era fórmula inventada (`PRs*5+20`), no un dato. |
| HIIT · card de preset | ~~metaText ("20/10 x 8 · 4 min")~~ | **SE FUE (aplicado)** — repetía la descripción (y en EMOM/AMRAP repetía el nombre) dentro de la MISMA card. La descripción absorbe la duración total. |
| Log-cardio | Distancia/FC/RPE/notas visibles siempre | **SE PLEGARON (aplicado, Bloque 3)** — el caso común es disciplina+duración. |
| Hub · card semana | "PRs nuevos" de la semana | Soporte ✔ — scope semanal, distinto del "PRs" de la sesión de hoy (etiquetados). |

**Propuestos SIN ejecutar (dudosos — esperan tu veto):**

| Card | Dato | Propuesta |
|---|---|---|
| Fuerza · card de benchmark | PR actual + 1RM est. (p.ej. "100kg · 120kg 1RM") | El MISMO número vive en la tabla TUS MARCAS más abajo. Propuesta: la card de benchmark se queda como **acceso a registrar** (nombre + badge + variantes) y el número vive solo en la tabla. En contra: ver tu PR junto al botón de registrar motiva el registro. **Tu llamada.** |
| Runner · progreso | "EJERCICIO 2 / 6" (texto) + barra de progreso | Texto y barra son el mismo dato en dos formas. Propuesta: solo barra con label compacto encima. En contra: en el gym el número se lee más rápido que una barra. |
| Detalle de ejercicio | Familia en el header ("Sentadilla") + "FAMILIA SENTADILLA · 4 VARIANTES" | Mismo dato dos veces en la pantalla. Propuesta: la sección diga solo "4 VARIANTES". |
| Cardio hub · card de disciplina | "Última: 5.2 km en 30:00" | También aparece en log-cardio como sugerencia "la última vez… tocar para repetir". **Propósito distinto** (consulta vs prefill) — propongo DEJARLO, documentado. |
| Hub · entrenado | Kg de hoy (hero) + kg de la semana (card semana) | Scopes distintos y etiquetados, adyacentes. Propongo DEJARLO; si molesta, la card semana puede ocultarse el día que ya entrenaste. |

---

## 🚩 FLAGS HONESTOS (lo que debes saber)

1. **Import de salud sin device-test**: el mapeo Health Connect (aggregates `DISTANCE.inMeters`, `BPM_AVG`, `ENERGY_TOTAL.inKilocalories`) y HealthKit (`queryWorkoutSamples`) está escrito contra los typings reales de las libs instaladas, pero **no he podido correrlo en un device** (requiere build). Es EL punto crítico del checklist de device-test.
2. **HealthKit: FC media omitida** en el import iOS — requiere un query extra por workout (estadísticas asociadas); decidí minimización sobre completitud. Distancia/calorías/duración sí van. Si la quieres, es un `getStatistic('HKQuantityTypeIdentifierHeartRate')` por workout (~1 llamada extra c/u).
3. **Evaluación de movilidad sin clips**: el bucket no tiene clips de los 7 tests (los MoveKit son ejercicios, no assessments). La pantalla guía con instrucciones numeradas + anclas concretas por test. Si quieres ejemplo en video, es asset MoveKit/MJ pendiente — la pantalla los adopta sin cambio estructural.
4. **Los tests 0-10 de movilidad son auto-evaluación** con anclas (no medición instrumental); los de cm sí son medida física. La UI lo dice explícito en el resultado — cero pretensión clínica.
5. **Pool de movilidad = ~18 ejercicios** del catálogo actual (cualidades movilidad/recovery/estabilidad + 4 estiramientos). Una sesión honesta da ~30-36 min sin repetir; el motor lo avisa ("tu pool da para ~X min"). Crecerá cuando la matriz taggee más movilidad.
6. **Fix de tiempo en isométricos** (core del generador): el hold fuera de recovery se subcontaba (35 s de hold contados como 5 s). Corregido — los tiempos estimados de rutinas con isométricos suben un poco. Tests verdes.
7. **`strength-session` pasa `nivelMetodo='intermediate'` hardcodeado a los métodos** (preexistente de MB-3). Ahora que el nivel vive en el perfil se podría cablear — no lo toqué por no ensanchar el brief. Candidato a MB-3.7.
8. **Auto-sync** corre al enfocar el hub de Cardio (opt-in): si el usuario nunca abre Cardio, no sincroniza — deliberado (nada de background tasks en este batch).
9. **router.d.ts** actualizado a mano con cuidado (quitar `/fitness-explore`, agregar `/cardio-import`) — `expo start` lo regenerará idéntico; si Cowork lo regenera y difiere en orden, es cosmético.
10. **eslint**: 0 errores; los warnings que quedan en `log-exercise` (hooks deps, unused vars) y en el test del bridge (`import/first` por `vi.mock`) son **preexistentes**, no de esta corrida.

## 📱 CHECKLIST DEVICE-TEST (por bloque)

**Bloque 1**
- [ ] Hub: primera vez sin nivel → pregunta nivel → lo guarda (verlo en Ajustes › Salud › FITNESS).
- [ ] Hub sin prefs → "GENERA TU SESIÓN" → generador; tras generar una vez, al día siguiente el hub muestra "HOY TOCA …" con EMPEZAR directo al runner (misma rutina que daría el generador).
- [ ] Entrenar y volver al hub → estado completado con logros; cardio del día listado si lo hay.
- [ ] `/personal-records` y tab Progreso → pantalla fusionada Fuerza; deep-link `/timer` → HIIT; `/training-methods` → biblioteca tab Métodos.
- [ ] Cambiar nivel en el generador → se refleja en Ajustes (y al revés).

**Bloque 2**
- [ ] Evaluación completa (7 tests, saltando uno) → resultado con overall + asimetrías; repetirla otro día → deltas vs anterior.
- [ ] Guardar sin red → resultado avisa "no se guardó en la nube".
- [ ] Generador con objetivo Movilidad → sesión solo de estiramientos/movilidad; correrla en el runner (holds de 45 s hablados) → se guarda y aparece en el hub como entrenado.

**Bloque 3** *(post-build nativo)*
- [ ] Registro manual: 2 taps (disciplina + 30′) → guardado + electrón; card del HOY palomea.
- [ ] "La última vez … tocar para repetir" prellena duración y distancia.
- [ ] Import Android: consentimiento → permisos Health Connect → lista de workouts (con Strava/Garmin sincronizando a HC) → importar → sin duplicados al reimportar ni contra un manual del mismo día.
- [ ] Import iOS: ídem con Salud de Apple.
- [ ] Importar solo workouts de días pasados → NO otorga electrón (la UI lo dice); importar uno de hoy → 1 electrón (y no más aunque importes 3).
- [ ] Auto-sync ON → abrir Cardio importa silencioso los últimos 3 días.
- [ ] Binario actual (sin build): pantalla de import dice "llega con la próxima versión" sin crashear.
- [ ] Guardar sesión de fuerza con cardio previo el mismo día → cierre muestra "CARDIO DE HOY".

**Bloque 4** *(visual, pantallazos para Cowork)*
- [ ] Hub / Fuerza / Movilidad / log-cardio / import / HIIT / biblioteca+Métodos / detalle / runner / cierre — 4 ejes: ¿protagonista claro? ¿respira? ¿lima solo donde debe? ¿cards despegadas?
- [ ] Clip (post-build): poster→clip sin parpadeo; el crema se ve montado (marco + viñeta), no flotando.
- [ ] Reduce motion ON en el sistema → la app no marea.

**Bloque 5**
- [ ] Broad jump en sesión → pide DISTANCIA (CM); cierre muestra "Broad jump ×estatura" en la señal de edad SI hay estatura declarada; sin estatura no aparece (y no miente).
- [ ] Dead hang → pide SEG; señal de edad con progreso hacia 120 s (H) / 90 s (M).

## ⏭️ DESPUÉS DE ESTE DELIVERY (no lo hice yo, por protocolo)
1. Audit Cowork (código + visual con pantallazos del device-test).
2. Merge → `npx supabase db push` (migs 224 + 225) → bump de versión → **build nativo** (health libs + nitro + expo-video de MB-3.5) → OTA no sirve para esto.
