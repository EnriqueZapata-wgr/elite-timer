# 📦 DELIVERY · MB-5 — P0 + EMOM real + constructor + barrida editorial

**Rama:** `feat/mb5-fitness-p0` (desde `main`, post MB-SEC-1) · **2026-07-26**
**Verificación:** `npx tsc --noEmit` = 0 · Vitest **2,217 tests / 214 archivos verdes** (incluye 10 nuevos de emom-core) · eslint 0 errores nuevos (solo warnings preexistentes) · `expo config --type prebuild` resuelve el plugin nuevo sin error.
**NO mergeada · versión intacta (1.7.0 / versionCode 17) · SIN db push** (migraciones 231-233 esperan audit Cowork).

---

## 🔴 BLOQUE 0 · P0

### 0.1 · `exercise_logs.metadata` — migración 231
Verifiqué el esquema **directo contra information_schema del remoto**: la columna no existe y el código la escribe en 5 call sites. `231_exercise_logs_metadata.sql` la agrega (idempotente, tabla con RLS ya activa).

**Barrida de fantasmas (el "vale la pena una pasada" del brief):** extraje TODAS las escrituras Supabase del código (~70 tablas) y las crucé contra el esquema remoto completo. Resultado:
- ✅ Todas las columnas explícitas que el código escribe existen — **salvo dos hallazgos**:
- 🔴 **`user_symptoms` NO EXISTE en el remoto** (verificado contra `pg_class`). La migración 202 (Mega-Sprint B) quedó **marcada como aplicada por el migration repair del Track C pero nunca se ejecutó** → `db push` la salta → todo `user-symptoms-service.ts` (pilar Salud) falla en remoto desde entonces. Fix: **migración 233** re-emite la 202 verbatim (era 100 % idempotente) con número nuevo.
- 🟡 Ya en producción estaban fallando también las stats del hub (comentario "HOTFIX schema: exercise_logs no tiene `date`" en fitness-hub.tsx:86 — hoy la columna SÍ existe; no lo toqué, es cosmético y funciona).

### 0.2 · El trabajo del usuario es sagrado
- `saveWorkoutSession` ahora es **idempotente**: `sessionId` estable por sesión + upsert de `workout_sessions` + limpieza de logs del intento fallido antes de re-insertar → reintentar NUNCA duplica.
- Fallo de guardado → la sesión completa se **persiste en AsyncStorage** y el diálogo ofrece 3 salidas: **Reintentar · Volver a la sesión (estado intacto) · Salir** — con copy explícito de que NO se perdió nada.
- **Flush automático** al abrir el hub de Fitness: las pendientes se re-suben solas; electrón de strength solo si la sesión recuperada es de HOY (cero retroactividad, misma doctrina que el import de cardio). La fecha de la sesión sale de `endedAt`, no del día del flush.
- `log-exercise` (métodos sueltos): el catch terminal que se tragaba el trabajo ahora ofrece Reintentar.

### 0.3 · Crash de Health Connect — CAUSA RAÍZ (✅ confirmada por Sentry, coincide con el diagnóstico)
**Doble confirmación:** el análisis estático del código nativo de la librería llegó a la misma conclusión que después validó Sentry (issue 7634111992): `UninitializedPropertyAccessException: lateinit property requestPermission has not been initialized` en `HealthConnectPermissionDelegate.launchPermissionsDialog` (línea 45) · SM-S928B · Android 16 · app 1.7.0+17 · sin manejar (UncaughtExceptionHandler).

- La hipótesis original del rationale **no era la causa**: el `app.plugin.js` de `react-native-health-connect@3.5.3` SÍ genera ese intent-filter, y está registrado en app.json.
- **La causa real:** la librería exige `HealthConnectPermissionDelegate.setPermissionDelegate(this)` en `MainActivity.onCreate` (su README) — y su plugin de Expo SOLO parcha el AndroidManifest, nunca MainActivity; en Expo managed no hay MainActivity en el repo, así que el registro jamás ocurrió. `requestPermission()` es el **único método del módulo Kotlin sin try/catch** (`HealthConnectManager.kt:66-76`) y ejecuta `requestPermission.launch(...)` sobre la **`lateinit var` sin inicializar** dentro de una corrutina sin handler → **muere el proceso**. Inatrapable desde JS: la promesa jamás se rechaza (por eso no se intentó "atraparlo" — la mitigación JS es NO entrar al camino roto).
- **Fix nativo:** `plugins/with-health-connect-delegate.js` (registrado en app.json) inyecta en prebuild: (a) el `setPermissionDelegate` en MainActivity.kt, (b) el activity-alias `VIEW_PERMISSION_USAGE`/`HEALTH_PERMISSIONS` que Android 14+ exige para el link de política de privacidad. **Requiere BUILD nativo.**
- **Blindaje JS (nunca un crash, en CUALQUIER binario):**
  1. Si la lectura ya está concedida → se lee directo, **sin abrir ningún diálogo** (camino seguro en todos los binarios, y más rápido).
  2. Gate por `versionCode` del BINARIO (expo-application): en el 1.7.0 (vc 17) jamás se llama `requestPermission` → pantalla honesta con **"Abrir Health Connect"** (concesión manual, API segura) + "Ya di el permiso — leer". `PRIMER_VERSION_CODE_CON_DELEGATE = 18`: ⚠️ **si el próximo build no sube versionCode a ≥18, ajustar esa constante.**
  3. Denegado → vuelve al consentimiento, sin drama.

### 0.4 · Copy por plataforma
El card de consentimiento ahora dice en iOS "Strava, Garmin y tus demás apps escriben en Salud de Apple (Apple Health)…" y en Android mantiene Strava/Garmin/Samsung Health/Google Fit.

---

## 💪 BLOQUE 1 · EMOM X×X

- **`emom-core.ts` nuevo (puro, 10 tests):** clasifica el ejercicio por carga desde la matriz (`cargable` + `equipoRequisitos` + `cualidades` + `nivel`) y propone el X×X.
- **Rangos propuestos (PARA VETO DE ENRIQUE):**

| Clase | Criterio de derivación | Reps (default) | Rondas (default) |
|---|---|---|---|
| **Carga externa** | cargable Y algún requisito es puro implemento de carga (barra/mancuerna/KB/máquina/cable/smith/landmine/disco) | 6-12 (**8**) | 6-12 (**10**) |
| **Corporal exigente** | peso corporal con `fuerza`/`hipertrofia` o nivel Intermedio+ (pull-ups, dips, push-ups; dominadas lastradas caen aquí, no en carga) | 8-20 (**12**) | 6-12 (**10**) |
| **Corporal metabólico** | metabólico/resistencia de nivel Principiante (mountain climbers, crunch, jumping jacks) | 20-40 (**25**) | 8-15 (**10**) |

  Principiante arranca en el piso del rango (hereda la filosofía del 8×8). Límites duros del ajuste manual: 1-60 reps · 3-20 rondas (guiado, no prisionero).
- **Runner EMOM:** fase "ready" con steppers RONDAS × REPS + etiqueta de clase + rango sugerido; el usuario ajusta antes de iniciar. Botones de reps con **paso adaptativo** (target 10 → de 1 en 1 como antes; target 25 → saltos de ~3) + **ajuste fino ±1** para el dato exacto (la deuda se calcula con reps exactas). Captura de rondas pendientes ahora selecciona + confirma (antes un tap coarse commiteaba).
- **La regla de peso NO se tocó** (deuda 0 → sube · deuda > última serie → baja · si no → mantiene; serie de paga = X+1).
- **Generador:** bloques EMOM llevan su prescripción (`RoutineBlock.emom`) y su tiempo real (N min + 1 de paga) — el presupuesto de sesión ya no cuenta un EMOM como series estándar. Planes viejos sin el campo corren con los defaults previos (compat total; 33 tests del generador verdes).
- `log-exercise`: si el ejercicio tiene `matrix_slug`, deriva la prescripción de la matriz; sin traza → defaults.

---

## 🏗️ BLOQUE 2 · CONSTRUCTOR Y RUTINAS (migración 232)

### 2.1 · Constructor lee la matriz
- **`MatrixExercisePicker` nuevo:** los 214 ejercicios con el MISMO buscador y 4 ejes de filtro de la biblioteca (Músculo/Equipo/Patrón/Nivel), cards con poster y badge CLIP.
- El bloque guarda **`matrix_slug`** (columna nueva en `blocks`, mig 232) + resuelve/crea la fila espejo en `exercises` (FK clásica del engine). Fail-soft doctrina anti-fantasma: si la 232 no está aplicada, el guardado reintenta sin el slug en vez de tirar la rutina.
- **Herencia en ejecución:** `routine-execution` muestra el **CLIP en loop** del catálogo en la transición de cada ejercicio trazado.

### 2.2 · Compartir — y un bug real de la infra existente
- 🔴 **Hallazgo:** `clone_routine` (remoto, verificado con `pg_get_functiondef`) copiaba los bloques con lista explícita **SIN `exercise_id` ni `suggested_rest_seconds`, y la rutina SIN `mode`** → clonar un share **perdía los ejercicios y convertía la rutina en timer**. La 232 reescribe la RPC copiando todo + `matrix_slug` (mismo SECURITY DEFINER + search_path de MB-SEC-1).
- **Gate de compartir:** rutinas de fuerza solo se comparten si TODOS sus ejercicios están trazados a la biblioteca (patrón nuevo); timers comparten igual que antes. Compartir sigue siendo explícito, nunca por defecto. ⚠️ Flag: decidí que los timers NO se gatean — veto de Enrique si quería el candado total.

### 2.3 · Limpieza de "Mis rutinas"
- Detección automática (solo MARCA): **vacías** (0 ejercicios) · **duplicadas** por nombre (se conserva la más reciente) · **patrón viejo** (ejercicios sin matrix_slug).
- Banner → modal con la lista completa (nombre + motivo), checkboxes des-marcables, y dos salidas: **ARCHIVAR (reversible** — `routines.archived_at`, mig 232; se ocultan sin borrarse**)** o **Eliminar definitivamente** con doble confirmación que avisa que archivar es la opción segura. Cero borrado silencioso.
- ⚠️ Antes del db push de la 232, TODO el catálogo actual de Enrique quedará marcado "patrón viejo" (ninguna rutina existente tiene matrix_slug) — es correcto según el brief, pero que lo sepa al abrir la pantalla.

---

## 🎨 BLOQUE 3 · BARRIDA EDITORIAL — hallazgo del antipatrón

### El bug transversal "botones apagados" NO era opacity: era el fill del CTA
`GradientCTA pillar="fitness"` rellenaba el botón con `PILLAR_GRADIENTS.fitness` — un **gradiente de FONDO** (lima al 25 % → negro al 95 %) con texto `onAccent` (oscuro) encima → botón casi negro con texto ilegible: exactamente el "apagado como si tuviera algo encima". Afectaba los 16 usos del pilar (Movilidad, GUARDAR SESIÓN de cardio, import, hub, runner, generador). **Fix de raíz en el componente:** el fill primario es SIEMPRE la molécula brillante lime→teal; `pillar` ahora solo tiñe el glow. Un cambio, 16 botones curados.

### Opacity apilada real encontrada (y corregida)
| Archivo | Qué era | Fix |
|---|---|---|
| `strength-session.tsx:578` | progressBar con `opacity: 0.9` sobre ELEVATION[1] | opacity fuera |
| `mobility-assessment.tsx:495` | `howText` TEXT.primary + `opacity: 0.85` | token `TEXT.secondary`, sin opacity |
| `builder.tsx` (×3) | pressed `opacity: 0.6/0.8` + saving `0.5` en la barra inferior | AnimatedPressable (spring); saving 0.7 con label GUARDANDO… |
| `programs.tsx:337` | menú ⋮ con pressed opacity+scale manual | AnimatedPressable |
| `programs.tsx:633` | `cardLastUsed` textSecondary + `opacity: 0.7` | token `TEXT.tertiary` |

**No tocados (legítimos):** watermark decorativo `opacity: 0.06` (programs), estados disabled `0.7` con label explícito (log-exercise — patrón permitido por el DS), `withOpacity()` en todo el pilar (es el helper correcto), SVG opacity de las gráficas de fuerza.

### Por pantalla
- **Biblioteca:** tabs + autofiltros (los 4 ejes) + opciones activas con degradado molécula; eje abierto sin valor conserva el tinte sutil.
- **Movilidad:** curada por el fix de GradientCTA + howText.
- **Cardio hub:** CTA "REGISTRAR SESIÓN CARDIO" de azul plano legacy → GradientCTA editorial.
- **Registrar cardio:** GUARDAR curado (raíz) + chips activos (disciplina/duración) con degradado.
- **Fuerza:** hero RENDIMIENTO al **molde editorial** (imagen sex-aware como el hub + overlay + jerarquía); "ELITE" intacto como NIVEL; etiquetas largas (PRINCIPIANTE) ahora encogen en vez de cortarse.
- **Constructor:** barra inferior al primitivo táctil estándar + GUARDAR con degradado de marca.
- **Runner:** progressBar sin opacity; ya venía al nivel.

---

## 🧭 BLOQUE 4 · UX CARDIO
1. **Tiempo custom evidente:** fuera el chip "Otra" — las cajas HRS:MIN:SEG están SIEMPRE visibles bajo los presets ("O ESCRIBE EL TIEMPO EXACTO"). Escribir deselecciona el preset; tocar preset limpia las cajas.
2. **Título truncado:** fix de raíz en `ScreenHeader` — títulos largos encogen (`adjustsFontSizeToFit`, mínimo 70 %) en vez de truncarse. Cura "REGISTRAR CARD…" y cualquier otro título largo de la app.

---

## ✅ CHECKLIST DEVICE-TEST (por bloque)

**Bloque 0 (requiere db push 231+233 y para 0.3 el BUILD nativo):**
- [ ] Terminar sesión con método → guarda sin error de metadata; ver fila en exercise_logs con metadata.
- [ ] Simular fallo (modo avión al guardar) → diálogo 3 opciones; "Volver a la sesión" conserva todo; salir y reabrir Fitness → la sesión se sube sola y el electrón cae si es de hoy.
- [ ] En binario 1.7.0 (OTA): CONECTAR Y LEER → NO crashea; muestra la ruta manual "Abrir Health Connect"; conceder a mano → "Ya di el permiso" lee entrenamientos.
- [ ] En build nuevo (vc ≥18): CONECTAR Y LEER abre el diálogo nativo de permisos; los 3 caminos (conceder / negar / sin app HC) salen elegante.
- [ ] Pilar Salud: agregar/resolver un síntoma → persiste (tabla user_symptoms ya existe).
- [ ] iOS: copy del consentimiento nombra Apple Health.

**Bloque 1:**
- [ ] Sesión generada con bloque EMOM: fase ready muestra clase + rangos; ajustar X×X y correr; deuda y serie de paga X+1 intactas; feedback de peso igual que antes.
- [ ] EMOM de mountain climbers propone ~25×10 (no 10×10); pull-ups ~12×10; press banca ~8×10.
- [ ] Plan viejo guardado ("repetir rutina") corre con 10×10 sin romperse.

**Bloque 2 (requiere db push 232):**
- [ ] Constructor → Asignar ejercicio abre el picker matriceado con filtros; guardar rutina; ejecutarla → clip en la transición.
- [ ] Compartir rutina patrón nuevo → link funciona y el CLON conserva ejercicios y modo (bug de clone_routine curado).
- [ ] Compartir rutina vieja → mensaje del gate (no error).
- [ ] Mis rutinas → banner limpieza → archivar 2-3 (desaparecen; siguen en DB con archived_at) → eliminar 1 con doble confirmación.

**Bloques 3-4 (OTA, verificación visual — mandar pantallazos):**
- [ ] Movilidad y GUARDAR SESIÓN de cardio: botones brillantes lime→teal, texto legible.
- [ ] Biblioteca: chips/tabs activos con degradado.
- [ ] Fuerza: hero editorial con imagen; nivel corre bien en pantallas angostas.
- [ ] Registrar cardio: cajas de tiempo visibles de entrada; header completo "REGISTRAR CARDIO".

---

## 🚩 FLAGS HONESTOS
1. ~~Crash HC diagnosticado solo por análisis estático~~ → **RESUELTO: Sentry confirmó el título exacto** (`lateinit property requestPermission has not been initialized`, `launchPermissionsDialog:45`, SM-S928B/Android 16/1.7.0+17). El plugin apunta al lugar correcto; queda solo la verificación en build (nativo, no verificable por OTA).
2. **`PRIMER_VERSION_CODE_CON_DELEGATE = 18`** asume que el próximo build sube versionCode; si no, ajustar la constante en health-import-service.ts.
3. **db push (231-233) va ANTES del OTA** — misma doctrina F4. La 233 revive user_symptoms; conviene re-verificar el pilar Salud tras el push.
4. Rangos EMOM = propuesta; Enrique veta tabla arriba. Kettlebell swings caen en "carga externa" (6-12) — quizá quiera reps más altas ahí.
5. Gate de compartir NO aplica a timers (decisión mía) — veto disponible.
6. La limpieza marcará TODO el catálogo actual como "patrón viejo" hasta que existan rutinas re-armadas con el picker nuevo.
7. Cambios estéticos sin verificación visual mía (no corro la app): pantallazos antes de merge, doctrina §4 del DS.
8. El fix del fill de GradientCTA cambia el look de los 16 CTAs del pilar A LA VEZ — es el diseño correcto por doctrina (§1: superficies heroicas = degradado brillante), pero es un cambio visual amplio: calibrar en UNA pantalla al primer pantallazo.
