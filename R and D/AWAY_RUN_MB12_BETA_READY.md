# 🚑 AWAY RUN MB-12 · Beta-ready

**Origen:** `R and D/AUDIT_APP_COMPLETA_2026-07-28.md` (200 rutas, seis auditores en paralelo).
**Rama:** `feat/mb12-beta-ready` · **worktree propio, no el checkout de Enrique.**

## Reglas del run
1. **NUNCA reescribir archivos completos.** Solo `str_replace` quirúrgico.
2. `npx tsc --noEmit` en verde antes de cada commit de tramo.
3. Migraciones idempotentes (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`).
4. `generateUUID`, nunca `crypto.randomUUID`. `getLocalToday()` / `parseLocalDate()` para fechas.
5. Un commit por tramo, con el prefijo del tramo en el mensaje. Los tramos son independientes: si uno se atora, sigue con el siguiente y repórtalo.
6. **Cero copy con nombres propios de personas.** Toda recomendación es de ATP o de ARGOS.

---

# TRAMO A · SEGURIDAD EMOCIONAL
> Lo único que no admite "en la siguiente".

## A-1 · Ampliar el set de crisis con dos niveles

Hoy `src/services/emotion-navigation-core.ts:33` es `new Set(['panicked'])`. Una palabra de 144.

**Reemplazar por dos niveles.** No los unifiques: si el banner de la Línea de la Vida sale con cualquier mal día, la gente aprende a ignorarlo, y entonces no sirve el día que importa.

```ts
/** Nivel 1 — rompe el flujo: acompañamiento, nunca reframing ni análisis. */
const CRISIS_EMOTION_IDS = new Set([
  'hopeless',   // Sin esperanza · intensidad 10
  'depressed',  // Con depresión · 9
  'trapped',    // Sin salida · 8
  'empty',      // Vací@ · 8
  'helpless',   // Sin defensa · 8
  'numb',       // Sin sentir · 7
  'abandoned',  // Con abandono · 9
  'panicked',   // En pánico · 10
]);

/** Nivel 2 — además muestra CrisisSupportBanner (Línea de la Vida). */
const CRISIS_HOTLINE_IDS = new Set(['hopeless', 'depressed', 'trapped']);
```

Los IDs están verificados contra `src/data/emotions-library.ts` líneas 127-221.

**Por qué esos tres en nivel 2:** desesperanza y sensación de estar sin salida son los dos marcadores mejor establecidos de riesgo. El resto acompaña, pero no dispara el teléfono por sí solo.

**Regla adicional de nivel 2 — la trayectoria, no el momento:**
el banner también se muestra si el usuario eligió **cualquier** emoción del nivel 1 en **3 o más check-ins dentro de los últimos 7 días**, aunque hoy no haya tocado una del nivel 2. Un mal día es un mal día; tres en una semana es otra cosa.
Consulta sobre `emotional_checkins`, con `getLocalToday()` / `parseLocalDate()`.

## A-2 · Abrir la puerta que hoy está cerrada

`app/checkin.tsx:366` gatea el bloque que empuja a `/emotion-navigation` con `!panicSelected`.
**Está invertido.** `emotion-navigation.tsx:101-129` ya tiene la rama de crisis bien hecha ("Ahora mismo no toca analizar nada" + `TOOL_CRISIS`), y al único usuario que puede activarla se le esconde.

- Quitar la negación: cuando hay señal de crisis, `/emotion-navigation` es **el destino**, no la excepción.
- Cuando NO hay crisis, el flujo sigue exactamente igual que hoy.

## A-3 · Nada de celebración sobre una crisis

En `app/checkin.tsx`, cuando la selección toca nivel 1:
- **Sin confeti, sin racha, sin "Check-in registrado ✓".**
- El check-in **sí se guarda** (el dato importa, y es su registro).
- La confirmación cambia a algo que reconozca sin analizar. Copy sugerido, ajústalo si algo suena a máquina: *"Queda registrado. No tienes que hacer nada más ahora."*

## A-4 · Cablear el banner que ya existe

`src/components/global/CrisisSupportBanner.tsx` y `src/services/crisis-detection-core.ts` ya están construidos, con el número oficial de la Línea de la Vida (800-911-2000, CONASAMA). Hoy solo se usan en ARGOS.

Montar `<CrisisSupportBanner />` en la rama de crisis de `emotion-navigation.tsx` cuando aplique nivel 2. **No dupliques el número ni el texto** — importa las constantes.

## A-5 · Verificación obligatoria del tramo A
Prueba manual y repórtala:
1. Check-in con "Sin esperanza" → aterriza en acompañamiento, con banner, sin confeti, y el registro queda en la base.
2. Check-in con "Sin sentir" → acompañamiento, **sin** banner.
3. Check-in con "Con alegría" → flujo normal intacto, con su racha.
4. Tres check-ins con emociones de nivel 1 en 7 días → el cuarto muestra banner aunque sea "Sin sentir".

---

# TRAMO B · RIESGO LEGAL
> Los dos archivos que se me pasaron en el barrido anterior, más los contratos.

## B-1 · Sacar todas las dosis de `src/constants/functional-quizzes.ts`

Líneas 99, 101, 157, 158, 159, 211, 213, 214, 264, 265, 266, 317, 318, 320. Hoy dicen cosas como *"Ashwagandha 300mg antes de dormir, fosfatidilserina 200mg"*.

**Regla de reemplazo:** se puede **nombrar** el nutriente, el alimento o el hábito. **Nunca la cantidad, la vía ni el horario.**

Antes → después:
- `Ashwagandha 300mg antes de dormir, fosfatidilserina 200mg` → `Ashwagandha y fosfatidilserina son los que suelen acompañar este patrón. Las cantidades dependen de ti: eso lo define quien te lleva.`
- `CoQ10 200mg, PQQ 20mg, NMN 250mg` → `CoQ10, PQQ y NMN son los que se asocian a este patrón mitocondrial.`
- `L-glutamina 5g, zinc carnosina 75mg` → `L-glutamina y zinc carnosina son los que suelen aparecer aquí.`

Aplica el mismo criterio a las 14. Cambia también el encabezado **"RECOMENDACIÓN"** → **"QUÉ SUELE ACOMPAÑAR ESTE PATRÓN"**.

## B-2 · Sacar el plan de dosis de Braverman

`src/constants/braverman-questions.ts:62+` alimenta la sección **"PLAN DE SUPLEMENTOS PERSONALIZADO"** en `app/braverman.tsx:782-833`, con dosis por nivel de deficiencia (Fenilalanina 500/1000/2000 mg, Tirosina, Huperzina-A, GABA 1000 mg).

**Un cuestionario de autoreporte no genera un plan de dosificación.**
- Título → **"QUÉ SE ASOCIA A TU PERFIL"**
- Quitar todas las cantidades; conservar los nombres.
- Cerrar la sección con: *"Esto es orientación educativa. Qué tomar y cuánto se define con quien te lleva."*

## B-3 · Observación, no diagnóstico

`functional-quizzes.ts`:
- `:156` *"Posible resistencia a insulina… Esto es **reversible**"* → quitar la afirmación de reversión y el nombre de la condición. Describir el **patrón observado**, no la etiqueta.
- `:157` "Patrón de fatiga adrenal" · `:264` "Posible intestino permeable" · `:317` "Inflamación crónica sistémica" → mismo criterio: describe lo que el cuestionario observó, no lo que "es".
- `:130` *"Signo clínico de hiperinsulinemia"* aparece como flash **durante** el quiz (`functional-quiz.tsx:322`). Quitar "clínico" y la etiqueta.

`app/functional-quiz.tsx:416`: **"QUÉ DETECTAMOS"** → **"QUÉ OBSERVAMOS"**. Detectar es de un aparato de diagnóstico; observar es de un cuestionario.

`app/braverman.tsx:776`: *"Tu deficiencia principal en {X} **puede estar causando**: {síntomas}"* → romper la causalidad. Algo como: *"Este perfil suele venir acompañado de: {síntomas}"*.

## B-4 · Fuera el nombre propio

`app/braverman.tsx:314` y `:369` nombran a una persona real como autoridad, en pantalla.
- `:314` *"Evaluación clínica de neurotransmisores del Dr. Eric R. Braverman"* → **"Tu perfil de neurotransmisores"**
- `:369` *"Basado en 'The Edge Effect' del Dr. Eric R. Braverman"* → **"Basado en el modelo de perfiles de neurotransmisores"**

El nombre **sí puede quedarse en comentarios de código y documentos internos.** Es el copy de usuario el que no lo lleva.

Del mismo tipo, misma pasada:
- `app/journal.tsx:59-66` — quitar las firmas "— Séneca", "— Marco Aurelio", "— Epicteto". La cita se queda; la atribución sale.
- `app/mente/nback/como-jugar.tsx:84-86` — *"el **único** entrenamiento de memoria de trabajo con evidencia real de transferir a inteligencia fluida (Jaeggi 2008)"*. Tres problemas en una frase: un absoluto falso, un nombre propio, y contradice a `saber-mas.tsx:51` de la propia app. **Alinea el tutorial con el artículo**, que ya está bien escrito: *"te prometemos el entrenamiento, no el milagro"*. Mismo ajuste en `nback/index.tsx:166`.

## B-5 · Disclaimers donde hoy no hay

- `app/braverman-premium.tsx` y `app/salud/intervenciones/rationale.tsx` renderizan markdown de LLM **sin ningún disclaimer**. Montar `MedicalDisclaimerGate`.
- `app/functional-quiz.tsx:491-494` — el descargo es `fontSize: 9` en `#444` sobre `#000`. Ilegible. Subir a legible y montar `MedicalDisclaimerGate` como en braverman.
- `app/quiz-take.tsx` — sin disclaimer, y `:104` **preselecciona todas las recomendaciones**, así que el usuario acepta protocolos por omisión. Montar disclaimer y **arrancar con todo deseleccionado**.
- `app/argos-chat.tsx` — montar `MedicalDisclaimer feature="argos"`; el copy ya existe en `medical-disclaimers.ts:32`.
- `feature="nutrition"` está definido (`medical-disclaimers.ts:38`) y **no se usa en ningún lado**. Montarlo en `food-scan`, `food-text`, `nutrition`, `my-recipes` y `argos-recipes`, que estiman macros con IA.
- `app/ketones-log.tsx:235` monta `feature="glucose"`, cuyo copy habla de diabetes. Crear la key `'ketones'` con copy propio.
- `app/supplements.tsx:855` — el pie dice *"las **sugerencias de suplementación** son orientativas"* mientras `:394` declara *"Esto es tu registro. No es recomendación."* **El pie contradice el sprint entero.** Reescribir el disclaimer de suplementos para que hable de registro, no de sugerencia.
- `app/solar.tsx:245` — *"Exponte 10-15 min **sin protección**…"* es una dosis de exposición y la advertencia vive en otra pantalla. Traer la contraindicación (fotosensibilidad, antecedente de melanoma, fármacos fotosensibilizantes) a la misma card.

## B-6 · Un solo contrato, sin corchetes

`src/constants/legal-texts.ts:26,80,100,140` tiene placeholders literales visibles al usuario: `[RAZÓN SOCIAL, S.A.S. de C.V.]`, `[CALLE, NÚMERO, COLONIA, C.P., QUERÉTARO, MÉXICO]`, `[10]`, `[Querétaro / Ciudad de México]`.
Y hay **dos versiones distintas del mismo contrato**: `settings/legal.tsx:63,71` abre el in-app; `paywall.tsx:47-51` abre `somosatp.com/privacidad` y `/terminos`, que sí están completos y fechados 6-jul-2026.

**Decisión bakeada: fuente única = la publicada en somosatp.com.**
- `settings/legal.tsx` abre las mismas URLs que el paywall.
- Los textos in-app quedan solo como respaldo sin conexión; **si se conservan, hay que rellenar los corchetes** — y eso depende de datos que solo tiene Enrique. Mientras no los tenga, **no se muestran**.
- Un solo lugar donde vive el contrato, y es el que el usuario acepta.

**⚠️ Veto de Enrique:** si prefieres el texto in-app como principal, mándame razón social, domicilio fiscal y jurisdicción y lo rellenamos en vez de redirigir.

## B-7 · Edad mínima
`app/profile.tsx:87` acepta de 13 años; la política publicada dice 18+ y el flujo no tiene consentimiento parental en ningún punto. **Subir el mínimo a 18** y alinear el mensaje de validación.

---

# TRAMO C · NO PERDER DATOS DEL USUARIO

## C-1 · El entrenamiento no se puede perder

`app/strength-session.tsx` — las series viven solo en `useState:288`.

1. **Stash incremental.** Cada vez que se cierra una serie, persistir el estado a AsyncStorage bajo una key con el id de sesión. No al final: en cada serie.
2. **Recuperación al montar.** Si existe stash de una sesión no cerrada, ofrecer retomarla.
3. **`:400-401`** — `finalizar()` hace `if (!user) { router.back(); return; }`. Si la auth expiró en un entreno de 90 minutos, se pierde todo, en silencio. **Nunca descartar sin avisar:** guardar el stash, avisar al usuario que hay que reconectar, y reintentar el guardado cuando vuelva la sesión.
4. `app/execution.tsx:244` — el botón atrás sale del timer sin confirmar y sin guardar. Poner el mismo `Alert` de confirmación que ya tiene `strength-session.tsx:582`.
5. `app/mobility-assessment.tsx:165-173` — `terminar()` arranca con `if (!user) return;`: el CTA final queda muerto tras 6 minutos de captura. Ir a `resultado` con el score local calculado y avisar que no se subió.
6. `app/builder.tsx:245-258` — la guardia de "cambios sin guardar" solo cuelga de `ScreenHeader onBack`. El botón físico de Android y el swipe-back de iOS la esquivan. Cablearla al evento de navegación.

## C-2 · El guardado que falla no puede otorgar el premio

`app/execution.tsx:141-158` — el `insert` a `cardio_sessions` no desestructura `{ error }`, así que `awardBooleanElectron` corre igual. El usuario ve el electrón palomeado por un entrenamiento que no existe, y el reconcile se lo quita después. **Otorgar solo después de confirmar el insert.**

---

# TRAMO D · LA CLASE `{error}`
> Un solo arreglo conceptual repetido en 30+ sitios. El de mayor rendimiento del run.

**El problema:** `supabase-js` no lanza en 4xx. El error llega en `{ error }` y un `try/catch` nunca lo ve. Resultado: **cuando el servidor falla, la app le dice al usuario que sus datos no existen.**

## D-1 · Helper compartido
Crear un helper que distinga los tres estados —`cargando` / `vacío` / `falló`— y devuelva `null` (no `[]`, no `0`) cuando hay error, para que la UI pueda diferenciar. `src/services/checkin-service.ts` (`saveCheckin`) ya propaga bien el error: úsalo de modelo.

## D-2 · Sitios a corregir

**Los que pintan cero o vacío falso:**

| Archivo:línea | Hoy le dice al usuario |
|---|---|
| `mente.tsx:81-101` | "Escribe tu primera entrada", racha 0 |
| `mente-streaks-service.ts:32-49` | Las 4 rachas en 0 y "faltan 7 días para tu medalla" |
| `my-chronotype.tsx:118`, `sleep.tsx:56` | "Aún no conocemos tu cronotipo" |
| `nback-service.ts:87,97,106` | Usuario de N=5 degradado a tutorial de N=1 |
| `journal.tsx:186-189` | **Las entradas desaparecen de la pantalla** |
| `cycle-charts.tsx:66-71` | "Registra al menos 3 días" |
| `cycle-history.tsx:39-44` | "Sin ciclos registrados aún" |
| `cycle.tsx:224-231` | Card "Sin datos de ciclo" |
| `fitness-hub.tsx:100-115` | **0 sesiones y 0 volumen junto al PR que sí cargó** |
| `economy/admin.tsx:64,69,77` | Electrones y H+ en cero |
| `economy/convert.tsx:26,35` | "Tienes 0 E-", MÁX no responde, CTA muerto |
| `lista-compra.tsx:48` | "Sin recetas con ingredientes" |
| `ketones-log.tsx:60,99` | "Sin mediciones" o lista congelada |
| `historia-clinica/index.tsx:30` | Contador "0 de M completados" |
| `settings/legal.tsx:48-52` | "Ver documento" como si nunca hubiera aceptado nada |
| `settings/privacy.tsx:81-92` | Oculta una baja ya programada, y rompe el guard `inFlight` |
| `afiliados/dashboard.tsx` (`affiliate-service.ts:121-132`) | **"$0.00"** como balance real |
| `comunidad/buscar.tsx:166-169` | *"Solo aparecen perfiles que activaron aparecer en el buscador"* — **culpa al otro usuario de nuestro error de red** |

**Los que confirman sin verificar:**
- `comunidad/perfil/[userId].tsx:152-156,171-177` — "Gracias. Recibimos tu reporte" aunque falle, y bloquear sin mirar el resultado. **Son acciones de seguridad.**
- `profile.tsx:229-232` — "Perfil guardado ✓" aunque falle. Se pierde fecha de nacimiento y sexo, que alimentan Edad ATP.
- `fitness-strength.tsx:266-279,576-586` — borrar y reconstruir un PR falla mudo.
- `my-routines.tsx:143,222,249` — `catch { /* silenciar */ }` en duplicar y eliminar.
- `food-text.tsx:246` — `haptic.success()` **antes** del `await saveFoodLog`. El usuario siente el buzz de éxito y después ve el error.

**Los que se cuelgan para siempre** (falta `.catch` o `setLoading(false)`):
`salud/cuestionario-maestro/index.tsx:54-75` · `historia-clinica/[category].tsx:36` · `salud/mi-expediente/index.tsx:38-59` · `exercise-detail.tsx:380` · `exercise-library.tsx:60` · `mente/nback/sesion.tsx:120-148` · `meditation.tsx:107` · `breathing.tsx:224` · `builder.tsx:270` · `afiliados/dashboard.tsx:91` · `cycle-charts.tsx:106` y `cycle-history.tsx:61` (vacías durante `'checking'`, no solo `'blocked'`).

**El patrón a copiar:** `routine-generator.tsx:139-145` ya lo tiene resuelto — estado de error + botón Reintentar. Replícalo.

## D-3 · El origen de los dos bugs de datos que Enrique ya vio

`app/fitness-hub.tsx:91-119` — **"0 sesiones/sem con volumen y un PR"**, tres defectos apilados:
1. `:100-115` no lee `{ error }` → si `exercise_logs` falla, sesiones y volumen quedan en 0 mientras `personal_records` (query aparte) sí trae el PR.
2. Cuenta días únicos de `exercise_logs`, **no de `workout_sessions`**, que existe y se escribe bien (`workout-session-service.ts:184`, con `date` local). Una semana entrenada solo con timer HIIT o cardio da 0 sesiones. **Cambiar la fuente a `workout_sessions`.**
3. `:106` corta un timestamp **UTC**; en México un entreno de las 7 pm cae al día siguiente.
4. `:96` tiene el **único `toISOString().split('T')[0]` que queda en `app/`**. Viola la regla técnica #3. → `getLocalToday()`.

Revisar con el mismo criterio la **racha récord en 0 con 31 ayunos** de `/reports` (card IDENTIDAD): verificar que la regla de gracia no esté anulando el histórico.

## D-4 · Rate limit que se lee como falla de red
`anthropic-client.ts:176` lanza `ArgosRateLimitError`, y `food-text.tsx:441`, `argos-recipes.tsx:68,88` lo muestran como "Problema de conexión". El usuario reintenta contra un límite. **Mensaje propio** que diga qué pasó y cuándo se libera.

---

# TRAMO E · PROMESAS Y PUERTAS

## E-1 · Nada que cobre sin poder pagar

- **Retos** (`challenges.tsx:42`): `joinChallenge` debita H+ reales, pero `settleChallenge` (`challenge-service.ts:85`) **no se invoca desde ningún archivo del repo** y nada alimenta `progress`. **Decisión bakeada: ocultar la entrada a Retos hasta que exista la liquidación.** Cobrar por un premio inalcanzable no puede quedarse.
- **Referidos** (`referrals.tsx:63`): promete H+ y `recordReferralSignup` / `markReferralPaid` no se llaman desde ningún lado. **Ocultar** hasta que haya backend. Y arreglar `:38`: el link es `https://atp.app/r/${code}` — **el dominio es somosatp.com**.
- **Tienda** (`shop.tsx:217-222`): dice "Incluido con Pro" pero `braverman-premium.tsx:119` cobra 1,000 H+ a todos, que es la doctrina correcta. **Corregir el copy, no el cobro.** Y quitar el botón **"Comprar (dev)"** (`:148`) con toda la sección RECARGAS, que siempre falla por el anti-minteo.
- `economy/history.tsx:30,33` muestra claves de base de datos al usuario (`action_spent · food_estimate_photo`, `reason` en snake_case). Traducir a español.
- `challenges.tsx:92` muestra `Reto 3f7a91c2…` en vez del nombre, y `:49` muestra el error crudo de Postgres en un Alert.

## E-2 · Paywall que no se queda mudo

`useSubscription.ts:~105` descarta el error de `getOfferings()` y deja `offerings` en `null`; `paywall.tsx:59-72` exige que el identificador contenga "base"/"pro" **y** el `packageType` correcto. Cualquier desviación → botón muerto sin explicación.

- Estado de **carga** real (hoy los primeros frames ya dicen "Muy pronto").
- Estado de **error** con reintento, distinto de "no disponible".
- **Quitar los textos fijos** "14 días de prueba gratis" (`:132-134`) y "AHORRAS 33%" (`:189`): deben salir del producto real o no mostrarse. Si no coinciden, es publicidad falsa (Apple 3.1.2).
- Añadir la disclosure obligatoria de suscripción auto-renovable con duración y precio por periodo.

> **Pendiente de Enrique, no de CC:** el puente de pago. Si el founder paga en somosatp.com vía Stripe/Conekta, falta el mecanismo que le deje su tier en la app. Hoy se mueve a mano en la base. **Sin eso no hay beta con founders.**

## E-3 · La puerta perdida de los electrones

Barrido completo de `app/` y `src/`: **nadie escribe `active_boolean_electrons`.** Solo hay lectura (`day-compiler.ts:257`) y el default de la migración `043`. Todo usuario queda clavado de por vida en los 6 booleanos por default.

`hoy_cards_visible` sí tiene su writer en `src/services/hoy/visibility-service.ts:100`. **Construir el writer equivalente y su pantalla**, junto a la gestión de cards de HOY, que es donde el usuario ya va a decidir qué ve.
Después de escribir: `DeviceEventEmitter.emit('electrons_changed')`.

## E-4 · Rutas sin enlace

| Ruta | Qué hacer |
|---|---|
| `food-preferences` | **Enlazar desde Nutrición.** No es opcional: `argos-recipes.tsx:160` promete que "ARGOS cruza tus labs, **alergias**, objetivo y ciclo" y hoy el usuario no puede capturar alergias en ningún lado. Es una promesa vacía **con implicación de alergias**. |
| `programs`, `standard-programs`, `create-routine`, `create-program` | **Borrar.** `create-routine.tsx:89` guarda en AsyncStorage, un store paralelo que nadie lee: la rutina desaparece. `programs.tsx` duplica `my-routines` y tiene `Última vez: Nunca` hardcodeado en cada card. |
| `smart-shopping` | **Borrar.** 27 líneas, un `EmptyState`, sin funcionalidad. |
| `argos-routine` | **Borrar.** ARGOS fue retirado de Fitness. |
| `dev/index`, `dev/goal-tree-smoke` | **Cerrar con gate.** `settings/dev` sí está blindado (`:21-23`), su destino no. Un deep link deja a cualquier founder disparando llamadas al LLM con costo. Copiar el `Redirect` de `settings/dev.tsx`. |

## E-5 · Ciclo — modo compañero

El gate único vive en `cycle-access-core.ts:13-15` (`return biologicalSex === 'female'`) y `use-cycle-gate.ts:30-41` ni siquiera lee `cycle_modality`.

Para que `'partner'` funcione hacen falta **tres** cosas, no una: leer la modalidad, un **modo lectura** del ciclo de la pareja vinculada en `cycle_companions` (hoy `cycle.tsx` renderiza el ciclo *propio*), y una entrada de navegación (`habits-portal.tsx:52,87` filtra con `femaleOnly` puro).

**Decisión bakeada: retirar el modo compañero de la UI para la beta.** Es una feature, no un arreglo, y hoy es código muerto que promete algo que no existe. Se retoma completo después.
Además: `cycle-settings.tsx` es la única pantalla del pilar **sin `useCycleGate`** — ponérselo.

**⚠️ Veto de Enrique:** si quieres el modo compañero en la beta, dilo y lo mando como away run propio con las tres piezas.

## E-6 · Doctrina en el prompt de recetas

`src/services/argos-service.ts:1874-1878` — el prompt que genera **todas** las recetas dice:
> *"FILOSOFÍA NUTRICIONAL ATP: Priorizar proteína (2.0-2.5 g/kg) · **Grasas saludables como fuente principal de energía**"*
> y `:1942`: *"Priorizar proteína animal de calidad"*

**Eso es grasa-céntrico y proteíno-céntrico, y ATP no es ninguna de las dos.** ATP es **comida limpia y flexibilidad metabólica**; el macro es consecuencia, no objetivo.

Reescribir el bloque de filosofía en esa dirección: comida real y sin procesar, densidad de nutrientes, flexibilidad metabólica, y el macro como resultado de comer limpio.
Y en `argos-recipes.tsx:37`, quitar "alta proteína" como preselección; `GOALS` (`:24-31`) hoy tiene 4 de 6 objetivos de macro — reemplazar por objetivos de comida, no de macro.

## E-7 · Circuito de recetas y comida

- `argos-recipes.tsx:212-272` solo ofrece "Generar otra receta", no escribe a `user_recipes`. Y `lista-compra.tsx:116` dice *"Guarda recetas de ARGOS (traen ingredientes)"*. **Añadir Guardar receta.**
- `food-scan.tsx`: `handleSaveWithout:571` otorga el electrón y `handleConfirmSave:494-551` **no**. Quien hace el flujo completo con IA saca 0; quien lo salta saca 8. **El incentivo está invertido.** Otorgar en ambos.
- `food-scan.tsx:366,382` suben base64 a resolución completa de cámara. **`expo-image-manipulator` ya está instalado** y solo se usa en `profile.tsx:147`. Redimensionar antes de enviar: es la palanca de costo documentada, sin aplicar.
- `ketones-log.tsx:94-102` no otorga electrón ni emite eventos; `glucose-log.tsx:105` sí. Como el GKI necesita las dos lecturas, media pieza del diferenciador no premia nada. Añadir `awardBooleanElectron` + `electrons_changed` + `day_changed`.

## E-8 · Ajustes → Comunidad, muerta para todo usuario nuevo

`settings/comunidad.tsx:47-53` — `getMyPublicProfile` devuelve `null` si no hay fila en `user_profile_public`. La migración `177` **solo hace backfill de usuarios existentes** y su trigger declara que no la crea; `syncPublicProfile` no se invoca desde ningún punto de la app.
Los 9 toggles quedan `disabled` sin explicación. Y al guardar username sí se crea la fila, pero `:71` deja el estado en `null`: **siguen muertos hasta salir y volver a entrar.**

Crear la fila al primer acceso, y refrescar el estado tras el alta.

## E-9 · Sueltos que valen la pena

- `quiz/chronotype.tsx:75-77` — copy visible al usuario: **"Quiz no disponible. Ejecuta la migración 025."**
- `quiz/chronotype.tsx:114-141` — si falta `chronotype_schedules`, no guarda nada pero igual navega al home. El usuario "activa" su cronotipo y no queda dato.
- `quiz/chronotype.tsx:165` dice "2 minutos"; `my-chronotype.tsx:163,288` dice "5 min". Unificar.
- `quizzes.tsx:39-42` — `useEffect` con deps vacías y `if (!user?.id) return`: en arranque frío los checkmarks nunca aparecen. Añadir `user?.id` a deps.
- `fitness-strength.tsx:266` usa `onConflict: 'user_id,exercise_id,rep_range'` contra `'user_id,exercise_id'` en `log-exercise.tsx:472` y `workout-session-service.ts:249`. Uno no corresponde al índice único real. Alinear.
- `exercise-detail.tsx:399-502` — `MatrixExercise` (`exercise-matrix.ts:200-224`) **no tiene campo de instrucciones**. La ficha entrega solo tags y un clip que casi nunca existe. Un usuario que no conoce el movimiento se queda sin nada. Añadir el campo y una descripción corta a los ejercicios más usados.
- `profile.tsx:203-216` — "Quitar foto" no borra el archivo del bucket, y cada cambio sube uno nuevo sin borrar el anterior. Para supresión ARCO la imagen persiste. Además la URL firmada dura 1 año: **los avatares se rompen solos al vencer.**
- **Rangos hardcodeados fuera de la fuente única:** `health-input.tsx:226-233` (120/80, 140/90 y el veredicto *"PA alta — consulta médico"*) y `mis-datos-core.ts:63-77` (glucosa 70/99/125, cetonas 0.5/3.0). Deben leer de `src/constants/lab-clinical-ranges.ts`. Y el veredicto de presión no debe emitir juicio clínico.
- **Labs de mujeres sin fase del ciclo:** `argos-service.ts:1297` y `:1307` empujan ciclo y labs como dos líneas independientes, sin instrucción que las relacione. El dato emocional sí viaja con reglas duras pegadas (`:1290-1295`) — copiar ese patrón para que ARGOS lea los labs en contexto de fase.
- `settings/conexiones.tsx:246-255` — el botón de wearables es un `View` sin `onPress` que dice "Próximamente", bajo un copy que afirma "Conecta Apple Health o Google Health para datos automáticos". Y `(tabs)/yo.tsx:260-271` promete Apple Watch/Oura/Garmin y navega al hub genérico. **Alinear la promesa con lo que existe.**
- `amigos.tsx:127-132` quita la solicitud de la UI sin revertir si el RPC falla.

---

# 📦 ENTREGA

Un commit por tramo. En el reporte final, por tramo:
- Qué se hizo, con archivo:línea.
- Qué **no** se pudo hacer y por qué.
- El resultado de `npx tsc --noEmit`.
- La verificación manual de **A-5**, que es obligatoria y no se puede dar por hecha.

**Lo que NO entra en este run** (para que no lo intentes): el puente de pago Stripe/Conekta → tier, el modo compañero completo de Ciclo, el backend de retos y referidos, y rellenar los datos fiscales del contrato.
