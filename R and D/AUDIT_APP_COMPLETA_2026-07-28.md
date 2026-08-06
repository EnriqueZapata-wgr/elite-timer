# 🔬 Audit de app completa · 200 rutas

**Fecha:** 2026-07-28 · **Autor:** Cowork
**Método:** navegador sobre `expo start --web` hasta que cayó el servidor, y de ahí lectura de código con seis auditores en paralelo. Cada hallazgo trae archivo y línea, verificado contra el código, no inferido.

**Cobertura:** las ~200 rutas de `app/`. Economía · Comunidad · Afiliados · Ajustes · Perfil · Legal · Nutrición y flujos de comida · Fitness completo · Mente · Emociones · Sueño · Salud · Ciclo · Tests · ARGOS · Edad ATP.

---

# 🔴 P0 · LO QUE NO PUEDE SALIR ASÍ

## P0-1 · La red de contención emocional está desconectada de la única persona que la necesita

`emotion-navigation-core.ts:33` → `CRISIS_EMOTION_IDS = new Set(['panicked'])`.
**Una sola palabra de 144.** `hopeless` ("Sin esperanza", intensidad 10), `depressed` ("Con depresión") y `empty` ("Vací@") existen en el catálogo (`emotions-library.ts:198,199,221`) **y no disparan absolutamente nada.** Se guardan en `emotional_checkins`, la pantalla avanza al paso 3, dice "Check-in registrado" y suelta el confeti de racha.

Y lo peor: **la pantalla de acompañamiento existe y está bien hecha.** `emotion-navigation.tsx:101-129` tiene su rama de crisis con banner y "Ahora mismo no toca analizar nada". Pero a `/emotion-navigation` solo se llega desde `checkin.tsx:377`, **y ese bloque está gateado por `!panicSelected`** (línea 366).

**O sea: al único usuario que hoy puede activar la rama de crisis, se le esconde la puerta.**

Alguien registra "Sin esperanza" y ATP le contesta con confeti. No es un bug de UX, es la promesa central del módulo al revés.

**Arreglo:** ampliar el set de crisis, y abrir la puerta en vez de cerrarla — la rama de contención debe ser el destino cuando hay crisis, no la excepción que se salta.

## P0-2 · Siguen saliendo dosis de suplementos en dos archivos que no barrí

**Este es mi error.** Barrí `seed-protocols.ts` e `interventions-catalog.ts` y te dije que estaba limpio. **No revisé los cuestionarios.**

`functional-quizzes.ts` — 14 líneas con dosis literales bajo el encabezado **"RECOMENDACIÓN"**:
> *Ashwagandha 300mg antes de dormir, fosfatidilserina 200mg* · *GABA 500mg* · *CoQ10 200mg, PQQ 20mg, NMN 250mg* · *L-glutamina 5g, zinc carnosina 75mg* · *Betaína HCL con pepsina*

`braverman-questions.ts:62+` alimenta una sección titulada **"PLAN DE SUPLEMENTOS PERSONALIZADO"** en `braverman.tsx:782-833`, que imprime dosis por nivel de deficiencia: Fenilalanina 500/1000/2000 mg, Tirosina, Huperzina-A, GABA 1000 mg.

**Un cuestionario de autoreporte generando un plan de dosificación es lo más expuesto que tiene la app.**

## P0-3 · Diagnóstico afirmado, no observado

Mismos archivos, agrupados en pantalla bajo el título **"QUÉ DETECTAMOS"** (`functional-quiz.tsx:416`):

- *"Posible resistencia a insulina… Esto es **reversible**"* (`:156`)
- *"Patrón de fatiga adrenal"* (`:157`) · *"Posible intestino permeable"* (`:264`) · *"Inflamación crónica sistémica"* (`:317`)
- *"Signo clínico de hiperinsulinemia"*, que aparece como flash **durante** el quiz (`:130` → `functional-quiz.tsx:322`)
- `braverman.tsx:776`: *"Tu deficiencia principal en {X} **puede estar causando**: {síntomas}"* — causalidad directa desde un autoreporte

El descargo de `functional-quiz.tsx:491-494` es `fontSize: 9` en `#444` sobre `#000`. Ilegible, y la pantalla ni siquiera usa `MedicalDisclaimerGate`.

## P0-4 · Un nombre propio de persona real como autoridad, en pantalla

`braverman.tsx:314` y `:369`:
> *"Evaluación clínica de neurotransmisores **del Dr. Eric R. Braverman**"* · *"Basado en 'The Edge Effect' del **Dr. Eric R. Braverman**"*

Rompe la regla dura: **toda recomendación es de ATP o de ARGOS.** Y "Evaluación clínica" es lenguaje de diagnóstico.

Del mismo tipo, menor: `journal.tsx:59-66` firma citas con "— Séneca", "— Marco Aurelio", "— Epicteto", y `nback/como-jugar.tsx:84` cita "(Jaeggi 2008)".

## P0-5 · Los documentos legales tienen corchetes de plantilla

`legal-texts.ts:26,80,100,140`, que es lo que renderizan `/legal/aviso` y `/legal/terminos`:

> *"**[RAZÓN SOCIAL, S.A.S. de C.V.]** … con domicilio en **[CALLE, NÚMERO, COLONIA, C.P., QUERÉTARO, MÉXICO]**"*
> *"vida esperada de referencia de **[10]** años"* · *"tribunales competentes de **[Querétaro / Ciudad de México]**"*

Y hay **dos versiones distintas del mismo contrato conviviendo**: `settings/legal.tsx:63,71` abre los documentos in-app (con placeholders) mientras `paywall.tsx:47-51` manda a `somosatp.com/privacidad` y `/terminos`, que sí están publicados, completos y fechados 6-jul-2026.

**El usuario acepta un texto y lee otro.** Un revisor de App Store ve corchetes en el contrato.

## P0-6 · Un entrenamiento en curso se puede perder entero

`strength-session.tsx` — las series viven **solo en `useState`** (`:288`). Si el sistema mata la app durante el entreno (llamada, memoria, crash), se pierde todo lo registrado. `stashPendingSession` solo se dispara cuando el guardado ya falló (`:433`).

Peor, `:400-401`: `finalizar()` arranca con `if (!user) { router.back(); return; }`. **Si la sesión de auth expiró durante un entreno de 90 minutos**, el usuario toca TERMINAR, la pantalla se cierra, y todo se evapora. Sin alerta, sin stash.

`execution.tsx:244`: el botón atrás sale del timer sin confirmar y sin guardar.

**En una app de gimnasio, esto es lo peor que puede pasar.** Un founder que pierde su sesión no vuelve.

---

# 🟠 P1 · MENTIRAS AL USUARIO Y PROMESAS SIN RESPALDO

## P1-1 · Los retos cobran la entrada y nunca pueden pagar el premio

`challenges.tsx:42-47` debita H+ reales vía `joinChallenge`. Pero `settleChallenge` (`challenge-service.ts:85`) **no se invoca desde ningún archivo del repo**, y nada alimenta `progress`. El participante queda en `active` de por vida.

**Cobramos y el premio es inalcanzable por diseño.**

## P1-2 · Referidos promete H+ que nadie acredita, con un link a un dominio ajeno

`referrals.tsx:63` promete "Cuando un amigo se suscriba, ganas H+", pero `recordReferralSignup` y `markReferralPaid` (`referral-service.ts:57,66`) no se llaman desde ningún lado. El registro queda `pending` para siempre.

Y `referrals.tsx:38` comparte `https://atp.app/r/${code}`. **El dominio es somosatp.com.** Es un link muerto que ya viaja por WhatsApp.

## P1-3 · La tienda promete gratis lo que el motor cobra

`shop.tsx:217-222` dice "Incluido con Pro — o con cualquier Boost activo". `braverman-premium.tsx:119-129` cobra 1,000 H+ **a todos** (que es la doctrina correcta). El usuario Pro toca esperando gratis y le descuentan 1,000 H+.

Además `shop.tsx:148` tiene un botón que dice literalmente **"Comprar (dev)"**, y `mockPurchase` llama `award_protons`, revocada al cliente por anti-minteo — **siempre falla**.

## P1-4 · El paywall se queda mudo si RevenueCat no responde

Mecanismo exacto: `useSubscription.ts:~105` llama `getOfferings()` en un `try/catch` que descarta el error y deja `offerings` en `null`. `paywall.tsx:59-72` exige que el identificador contenga literalmente "base"/"pro" **y** que el `packageType` sea MONTHLY/ANNUAL. Cualquier desviación → `pkg = null` → "Disponible pronto" + botón muerto.

**Sin error, sin reintento, sin estado de carga.** Los primeros frames ya dicen "Muy pronto" mientras la petición está en vuelo.

Y `:132-134` afirma "14 días de prueba gratis" y `:189` "AHORRAS 33%" **como texto fijo**, independiente del producto real. Si no coinciden, es publicidad falsa (Apple 3.1.2). Falta también la frase obligatoria de suscripción auto-renovable.

## P1-5 · El prompt de recetas contradice la doctrina

`argos-service.ts:1874-1878`, que genera **todas** las recetas:
> *"FILOSOFÍA NUTRICIONAL ATP: Priorizar proteína (2.0-2.5 g/kg) · **Grasas saludables como fuente principal de energía**"*

Y `:1942`: *"Priorizar proteína animal de calidad"*.

**Eso es literalmente grasa-céntrico y proteíno-céntrico.** ATP es comida limpia y flexibilidad metabólica; el macro es consecuencia, no objetivo. Refuerzo en pantalla: `argos-recipes.tsx:37` preselecciona "alta proteína" y 4 de los 6 objetivos son de macro.

## P1-6 · El incentivo de comida está invertido

`food-scan.tsx`: `handleSaveWithout` (`:571`) otorga el electrón. `handleConfirmSave` (`:494-551`), **que es el camino principal con IA**, no lo otorga.

**Quien hace el flujo completo saca 0 electrones. Quien lo salta saca 8.**

## P1-7 · La foto va al LLM sin comprimir

`food-scan.tsx:366,382` usan `launchCameraAsync({ quality: 0.6, base64: true })` sin redimensionar. `expo-image-manipulator` **ya está instalado** y solo se usa en `profile.tsx:147`.

Es exactamente la palanca de costo que documentamos, sin aplicar. Cada scan sube base64 a resolución completa de cámara.

## P1-8 · "Perfil guardado ✓" aunque no se haya guardado

`profile.tsx:229-232`: los tres writes están en un `try/catch` que nunca ve el `{error}`. Si RLS rechaza, el usuario ve confirmación de éxito **y su fecha de nacimiento y sexo no se guardaron** — que es justo lo que alimenta Edad ATP y los rangos por sexo.

## P1-9 · Reportar y bloquear confirman sin verificar

`comunidad/perfil/[userId].tsx:152-156,171-177`: `onReport` alerta "Gracias. Recibimos tu reporte" aunque `reportUser` devuelva `'error'`. `onBlock` hace `router.back()` sin mirar el resultado.

**Son acciones de seguridad.** El usuario cree que se protegió y puede no haber pasado nada.

---

# 🟡 P2 · LA CLASE DE BUG QUE ATRAVIESA TODA LA APP

**`supabase-js` no lanza en 4xx. El error llega en `{ error }` y un `try/catch` nunca lo ve.**

Los seis auditores encontraron el mismo patrón de forma independiente. **Más de 30 sitios.** El síntoma siempre es el mismo y es grave por lo que comunica:

> **Cuando el servidor falla, la app le dice al usuario que sus datos no existen.**

| Pantalla | Lo que ve el usuario cuando falla la red |
|---|---|
| `mente.tsx:81-101` | "Escribe tu primera entrada", racha 0 — a alguien con 90 días |
| `mente/progreso.tsx` | Las 4 rachas en 0 y "faltan 7 días para tu medalla" |
| `my-chronotype.tsx:118` | "Aún no conocemos tu cronotipo · HACER EL TEST" |
| `nback-service.ts:87` | Usuario de N=5 degradado a tutorial de N=1 |
| `journal.tsx:186` | Las entradas recientes **desaparecen** de la pantalla |
| `cycle-charts.tsx:66` | "Registra al menos 3 días" |
| `cycle-history.tsx:39` | "Sin ciclos registrados aún" |
| `fitness-hub.tsx:100-115` | **0 sesiones, 0 volumen — junto al PR que sí cargó** |
| `economy/admin.tsx:64` | Electrones y H+ en cero |
| `lista-compra.tsx:48` | "Sin recetas con ingredientes" |
| `comunidad/buscar.tsx:166` | *"Solo aparecen perfiles que activaron aparecer en el buscador"* — **culpa al otro usuario de nuestro error de red** |
| `afiliados/dashboard.tsx` | **"$0.00"** como balance real del afiliado |

**Es un solo arreglo conceptual repetido:** distinguir *vacío* de *falló*, y nunca pintar cero sin saber que es cero.

## P2-b · El origen de los dos bugs de datos que ya habías visto

**"0 sesiones/sem con volumen y un PR"** — `fitness-hub.tsx:91-119`, tres defectos apilados:

1. `:100-115` no lee `{ error }` → si `exercise_logs` falla, sesiones y volumen quedan en 0 mientras `personal_records` (query aparte) sí devuelve el PR. **Reproduce exactamente lo que viste.**
2. Cuenta días únicos de `exercise_logs`, **no de `workout_sessions`** (que existe y se escribe bien). Una semana entrenada solo con timer HIIT o cardio da 0 sesiones.
3. `:106` corta un timestamp **UTC**. En México (UTC-6) un entreno de las 7 pm cae al día siguiente.

Y `:96` tiene el **único `toISOString().split('T')[0]` que queda en `app/`** — viola la regla técnica #3.

---

# 🟢 P3 · PANTALLAS MUERTAS, HUECAS O INALCANZABLES

## Confirmado: `active_boolean_electrons` no lo escribe nadie

Barrido completo de `app/` y `src/`: **solo hay lectura** (`day-compiler.ts:257`) y el default de la migración `043`. Los únicos writers de `user_day_preferences` son goals, `disabled_protocol_events` y `custom_agenda_actions`.

**Todo usuario queda clavado de por vida en los 6 booleanos por default.** Comparar con `hoy_cards_visible`, que sí tiene su writer en `visibility-service.ts:100`.

## El modo compañero de Ciclo está construido y es inalcanzable de punta a punta

El gate único vive en `cycle-access-core.ts:13-15` → `return biologicalSex === 'female'`, consumido por `use-cycle-gate.ts:30-41`, que **ni siquiera lee `cycle_modality`**.

Para que `'partner'` funcione hacen falta tres cosas, no una:
1. Que el hook lea `cycle_modality` y permita `female || modality === 'partner'`
2. Un **modo lectura** en `cycle.tsx` — hoy renderiza el ciclo *propio* del usuario, no el de la pareja vinculada en `cycle_companions`
3. Una entrada de navegación: `habits-portal.tsx:52,87` filtra la card con `femaleOnly` puro, así que un hombre con `modality='partner'` **no tiene ninguna ruta** a `/cycle-settings` para meter el código de invitación

La UI existe (`cycle-settings.tsx:264-301`, `onboarding-v2-core.ts:107-110`). El camino, no.

## Rutas sin ningún enlace en toda la app

| Ruta | Estado |
|---|---|
| `food-preferences` | **Y de ella depende una promesa:** `argos-recipes.tsx:160` dice "ARGOS cruza tus labs, **alergias**, objetivo y ciclo". El usuario nunca puede capturar alergias. |
| `smart-shopping` | 27 líneas, un `EmptyState`, nada más |
| `programs` / `standard-programs` / `create-routine` / `create-program` | 4 rutas muertas. `create-routine.tsx:89` guarda en AsyncStorage, **un store paralelo que nadie lee** — la rutina desaparece |
| `argos-routine` | Sin enlace; ARGOS fue retirado de Fitness |
| `dev/index`, `dev/goal-tree-smoke` | **`settings/dev` sí está blindado, su destino no.** Un deep link deja a cualquier founder disparando llamadas al LLM con costo |

## Circuito roto: la receta de ARGOS no se puede guardar

`argos-recipes.tsx:212-272` solo ofrece "Generar otra receta". No escribe a `user_recipes`. Y `lista-compra.tsx:116` le dice al usuario *"Guarda recetas de ARGOS (traen ingredientes)"*.

**Quien solo usa ARGOS nunca puede llenar su lista de compra.**

## Spinners infinitos y pantallas negras

- `salud/cuestionario-maestro/index.tsx:54-75` — IIFE sin `try/catch`, `setLoading(false)` nunca corre
- `historia-clinica/[category].tsx:36` — `.then()` sin `.catch`
- `salud/mi-expediente/index.tsx:38-59` — header y nada más
- `exercise-detail.tsx:380` — "Cargando…" para siempre cuando el catálogo viene vacío
- `mente/nback/sesion.tsx:120-148` — un puntito suspensivo blanco sobre negro
- `meditation.tsx:107` y `breathing.tsx:224` — "Cargando catálogo…" indefinido / la sección guiada simplemente no aparece
- `builder.tsx:270` — `return null` mientras carga: pantalla negra
- `afiliados/dashboard.tsx:91` — `<View style={st.screen} />`: negro sin spinner
- `cycle-charts.tsx:106` y `cycle-history.tsx:61` — vacías durante el estado `'checking'`, no solo `'blocked'`

## Ajustes → Comunidad queda muerta para todo usuario nuevo

`settings/comunidad.tsx:47-53`: `getMyPublicProfile` devuelve `null` si no existe fila en `user_profile_public`. La migración `177` **solo hace backfill de usuarios existentes** y su trigger declara explícitamente que no la crea. `syncPublicProfile` no se invoca desde ningún punto de la app.

Los 9 toggles quedan `disabled` sin explicación. Y al guardar username sí se crea la fila, pero `:71` mantiene el estado en `null` — **siguen muertos hasta salir y volver a entrar**.

## Otros que valen la pena

- **`solar.tsx:245`** — *"Exponte 10-15 min **sin protección**… Brazos y piernas al sol."* Es una dosis de exposición. La advertencia de melanoma vive en otra pantalla, en un Alert que se ve una vez.
- **`quiz-take.tsx:104`** — **preselecciona todas las recomendaciones** y `handleAccept` activa protocolos. El usuario acepta por omisión, no por decisión. Sin disclaimer.
- **`braverman-premium.tsx` y `salud/intervenciones/rationale.tsx`** — renderizan markdown de LLM **sin ningún disclaimer en pantalla**.
- **`nback/como-jugar.tsx:84`** — *"el **único** entrenamiento de memoria de trabajo con evidencia real de transferir a inteligencia fluida"*, mientras `saber-mas.tsx:51` de la misma app dice lo correcto: *"te prometemos el entrenamiento, no el milagro"*. El tutorial es puerta obligada; el artículo es opcional.
- **`quiz/chronotype.tsx:75`** — copy visible al usuario: **"Quiz no disponible. Ejecuta la migración 025."**
- **`quiz/chronotype.tsx:114-141`** — si falta `chronotype_schedules`, no guarda nada pero igual navega al home. El usuario "activa" su cronotipo y no queda dato.
- **`programs.tsx:361`** — `Última vez: Nunca` hardcodeado en cada card.
- **`ketones-log.tsx`** — no otorga electrón ni emite eventos (`glucose-log` sí), y monta `MedicalDisclaimer feature="glucose"`, cuyo copy habla de diabetes.
- **`supplements.tsx:855`** — el pie legal dice *"las **sugerencias de suplementación** son orientativas"* mientras la línea 394 declara *"Esto es tu registro. No es recomendación."* **El disclaimer contradice el sprint entero.**
- **`profile.tsx:87`** — acepta de 13 años; la política publicada dice 18+, y no existe consentimiento parental en ningún flujo.
- **`profile.tsx:203`** — "Quitar foto" solo pone `avatar_url = null`; **el archivo se queda en el bucket**. Y la URL firmada dura 1 año: los avatares se rompen solos al vencer.
- **`quizzes.tsx:39-42`** — `useEffect` con deps vacías y `if (!user?.id) return`: en arranque frío los checkmarks nunca aparecen.
- **`fitness-strength.tsx:266`** — `onConflict: 'user_id,exercise_id,rep_range'` contra `'user_id,exercise_id'` en los otros dos writers. Uno de los dos no corresponde al índice real.
- **Rangos hardcodeados fuera de la fuente única:** `health-input.tsx:226-233` (120/80, 140/90 y el veredicto *"PA alta — consulta médico"*) y `mis-datos-core.ts:63-77`, conviviendo con `lab-clinical-ranges.ts`, que es de donde deberían salir.
- **Labs de mujeres sin fase del ciclo:** `argos-service.ts:1297` y `:1307` empujan ciclo y labs como dos líneas **independientes**, sin instrucción que las relacione — a diferencia del dato emocional, que sí viaja con reglas duras pegadas.
- **Rate limit disfrazado de error de red:** `anthropic-client.ts:176` lanza `ArgosRateLimitError` y las pantallas lo muestran como "Problema de conexión". El usuario reintenta contra un límite.

---

# ✅ LO QUE ESTÁ BIEN Y NO HAY QUE TOCAR

Verificado, no asumido:

- **El gate de audios de Mente es sólido de punta a punta.** Bucket privado, firma server-side, el player maneja 403 → paywall (`player.tsx:168-177`), y la policy de covers está acotada a `covers/%`.
- **El control de costo de ARGOS es correcto.** `argos-proxy/index.ts:318-343` resuelve el tier **server-side** desde `profiles.tier`; el tier que manda el cliente se usa solo para logging. No se puede escalar desde el dispositivo.
- **No se filtra nada interno a ARGOS.** `assignRule` está explícitamente excluido y no aparece en el prompt. Ni rastro de material confidencial.
- **La doctrina de ayuno está bien resuelta.** `fasting-phases.ts` retiró las fases con reloj de autofagia y `fasting.tsx:1271` usa GKI medido vs. estimado. Es la pantalla más sólida del lote de nutrición.
- **La doctrina Delfín se cumple** en `my-chronotype.tsx:246-260` y `quiz/chronotype.tsx:266-284`: se nombra como estado temporal **y** se dice el cronotipo madre real.
- **El borrado de cuenta es real y válido para Apple:** reautenticación por contraseña, gracia de 30 días, opción de cancelar. Y como el login es solo email+password, nadie queda sin poder borrarse. Existe también exportación DSAR.
- **`checkin-service.saveCheckin` sí propaga el error** — es el buen ejemplo del repo para arreglar los otros 30.
- **`log-exercise.tsx`, `cardio-import.tsx` y `routine-generator.tsx`** son los tres mejores manejos de error de Fitness. `routine-generator.tsx:139-145` tiene el patrón exacto (estado de error + Reintentar) que hay que copiar a `exercise-library`.
- **Las fechas están limpias en Nutrición:** cero `toISOString().split`, todo por `getLocalToday()`.
- **Los números de economía cuadran** entre pantallas y config: 100 E- = 300 H+, boost 500/24h y 3,000/168h, Braverman 1,000 H+.

---

# 📋 ORDEN QUE PROPONGO

**Tramo A — sale antes que nada:** P0-1 (crisis emocional), P0-2 y P0-3 (dosis y diagnóstico en los cuestionarios), P0-4 (nombre propio), P0-6 (pérdida de entrenamiento).
Son cuatro archivos y un gate. Lo de crisis y lo de dosis no admite "en la siguiente".

**Tramo B — legal y compra:** P0-5 (placeholders + doble contrato) y P1-4 (paywall). El paywall sigue trabado en tu decisión del puente de pago, que sigue abierta.

**Tramo C — la clase completa de `{error}`:** los 30+ sitios de una sola pasada, con un helper compartido. Es mecánico y de altísimo rendimiento: arregla P2-b, los falsos ceros y la mitad de las pantallas negras de un golpe.

**Tramo D — promesas sin backend:** retos, referidos, tienda. Decisión de producto: o se construye el backend, o se ocultan hasta que exista. **Cobrar entrada por un premio inalcanzable no puede quedarse.**

**Tramo E — puertas perdidas:** `active_boolean_electrons`, `food-preferences`, guardar receta de ARGOS, cerrar `/dev`, y decidir si el modo compañero se completa o se retira.
