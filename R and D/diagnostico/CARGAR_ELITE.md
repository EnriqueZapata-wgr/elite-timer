# Cargar una evaluación Elite: guía para Enrique (10 minutos)

Fecha: 6 de septiembre de 2026; actualizada el 20 de septiembre de 2026 (migración 324, carga completa) y el 21 de septiembre de 2026 (migración 325: siembra del perfil, rutinas y comidas). Ruta 3.7 de ATP 3.0. Complementa a `ESQUEMA_ELITE_V3.md` (qué es el JSON) y a `scripts/elite/obtener-jwt.md` (cómo sacas tu sesión). Todo se hace desde Git Bash en la raíz del repo, con tu cuenta de admin. Nadie más lo puede hacer: los RPC comprueban `role='admin'`.

Requisitos que se cumplen una sola vez: las migraciones 314, 315, 318, 321, 323, 324 y 325 ya empujadas con `npx supabase db push` (en ese orden: la 325 lee lo que deja la 324) (si el paso 5 responde `HTTP 404`, falta ese push), y que el cliente ya haya creado su cuenta en la app con el correo que te dio (sin cuenta no hay `user_id` y no hay dónde cargar). La 323 no es opcional: el gate de admin de la carga lee `profiles.role`, y es la 323 la que blinda esa columna (sin ella, cualquiera podía nombrarse admin con una consulta y cargar evaluaciones).

Qué cambió el 20 de septiembre: el paso 5 llama a `elite_cargar_completa`, que hace lo de siempre (`elite_cargar_evaluacion`) y además, en la misma transacción, deja al cliente como tu cliente activo en `coach_clients` (sin eso no le podías asignar rutinas ni verlo en la consola), escribe su plan de alimentación en `nutrition_plans` desde la sección `alimentacion`, pone sus metas de proteína y agua del día solo si él no tenía las suyas, y lleva sus marcadores medidos a `lab_values` para que el expediente de labs, el comparador y ARGOS los vean. Nada de esto pisa un dato del cliente: lo que ya existía se respeta y se te dice en los avisos.

## Los siete pasos

### 1. Preparar el JSON (lo entrega el equipo)

Tú entregas los insumos como siempre (laboratorios, genética si ya llegó, cruces, plan). El equipo los convierte con el generador de siempre al formato `elite_v3` (la plantilla es `R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json`: mismas claves, misma profundidad) y te deja un archivo, por ejemplo `clientes/omar_v1.json`. Revísalo tú antes de cargarlo: nombre preferido correcto, que no diga "tienes [enfermedad]" y que cada afirmación tenga respaldo. El validador no ve eso.

El campo `version` del JSON manda: debe ser el número de evaluaciones Elite previas de ese cliente más 1 (la primera es `1`, la revisión o corrección siguiente es `2`, y así). Cuenta solo las evaluaciones Elite (`elite_v3`), no otras filas de `functional_dx`. Si no coincide, el RPC la rechaza con `version_mismatch` y te dice la versión que espera.

Desde el 21 de septiembre (migración 325) el JSON admite además, todos opcionales, los datos que la app siembra y convierte (ver la sección "325: qué siembra y qué convierte" al final): `cliente.fecha_nacimiento`, `estatura_cm`, `peso_kg`, `nivel_fitness` (`principiante`, `intermedio` o `avanzado`) y `fc_reposo`; `alimentacion.metas.kcal_dia`, `grasa_g_dia` y `carbohidrato_g_dia`; `alimentacion.comidas[]` (momento, hora, nombre, componentes, notas) y `entrenamiento.rutinas[]` (nombre, objetivo, días de la semana con 1 = lunes, ejercicios con series, reps, descanso y, si quieres clip, `slug`). El paso 2 dice cuáles faltan.

Dos cosas que conviene saber de las rutinas antes de escribir el JSON (revisión en frío del 21 de septiembre con los dos primeros clientes reales):

- **El catálogo de ejercicios está en inglés.** `exercise_matrix` es el catálogo MoveKit (214 ejercicios: `Barbell Bench Press`, `Machine Leg Press`, `Band High Face Pull`). Un nombre en español no empareja con nada: con los JSON de los dos primeros clientes, 0 de 23 y 0 de 16 ejercicios encontraron clip. La forma de fijarlo es poner en el bloque `"slug": "dumbbell-bench-press"` con el slug exacto del catálogo (la lista está en `supabase/migrations/223_exercise_matrix_seed_v2.sql`, primera columna de cada fila; el builder de la app guarda ese mismo slug en `blocks.matrix_slug` cuando asignas un ejercicio, aunque en pantalla muestra el nombre). El nombre en español que escribas en `ejercicio` se conserva como etiqueta para el cliente. Sin slug, la carga intenta por nombre (solo pega si lo escribes en inglés) y por familia cuando esa familia tiene un solo ejercicio en el catálogo; si no, el bloque corre como tiempo y te lo dice por nombre.
- **Las reps mandan el tiempo solo si son limpias.** Un bloque sin clip corre como cronómetro; el tiempo por serie sale de `reps` solo cuando es `"8"`, `"8-10"` (4 segundos por repetición con el último número), `"30 s"` o `"45 min"`. Si escribes prosa (`"10 por lado"`, `"6 reps"`, `"8 min · 8 al minuto"`, `"15 dejando 2 en el tanque + 3 mini"`) el bloque queda en 40 segundos fijos y te lo avisa por nombre: no se adivina un número dentro de una frase. Pon el número limpio en `reps` y la explicación en `notas`.

Dos campos que conviene llenar bien desde el 20 de septiembre:

- `cliente.fecha_toma` con día (`2026-05-14`, no solo `2026-05`): es la fecha con la que los laboratorios entran al expediente. Si solo trae el mes, entran con el día 1 y queda anotado que el día se asumió.
- `alimentacion.metas` (opcional): `{ "proteina_g_dia": 150, "agua_ml_dia": 2800 }`. Es lo que va a las metas del día del cliente (proteína en gramos, agua en mililitros) cuando él no tiene ya las suyas. Sin este campo, sus metas se quedan como están.

### 2. Preparar el payload

```bash
node scripts/elite/preparar-payload.js clientes/omar_v1.json <user_id>
```

El `user_id` es el uuid de la cuenta del cliente. Si no lo tienes: `bash scripts/elite/curl-elite.sh quien correo@del.cliente` (requiere el JWT del paso 3) o Supabase > Authentication > Users.

El script valida el JSON con el mismo validador que usa la app (`validarEliteV3`), calcula el resumen para ARGOS y las filas del plan de suplementos, y escribe `clientes/omar_v1.payload.json`. Si algo no valida, imprime la ruta exacta del error (por ejemplo `cierre.palancas[0].titulo: palabra roja (tratamiento)`) y no escribe nada: se corrige el JSON y se repite. Salida real con el ejemplo de Omar:

```
Payload listo para elite_cargar_evaluacion
  cliente:              O. (male, 38 anios, toma 2026-05)
  user_id destino:      00000000-0000-4000-8000-000000000001
  version elite_v3:     1  (debe ser: evaluaciones Elite previas del usuario + 1; la primera es 1)
  secciones:            15 de 15
  marcadores:           34 (15 piden accion)
  hallazgos geneticos:  22
  suplementos (filas):  6
  raices detectadas:    3 (resistencia_insulina, hiperinsulinemia, deficit_sueno_profundo)
  labs a lab_values:    25 filas (11 marcadores fuera; fecha 2026-05-01, dia 1 asumido)
  resumen_argos:        1796 caracteres (tope 1800)
  quality_level:        5 (con genetica)
  html incluido:        no
  archivo:              clientes/omar_v1.payload.json (82.9 KB)
```

Lee el resumen: si dice `quality_level 4 (sin genetica)` cuando sí mandaste genética, el JSON trae `genetica.hallazgos` vacío y hay que regresarlo al equipo.

La línea `labs a lab_values` dice cuántos marcadores van a entrar al expediente de labs del cliente y cuántos se quedan fuera. Abajo, en los avisos, están por nombre y motivo: los estimados (no medidos), la composición corporal, los wearables y los cálculos (relación TG/HDL) no van a `lab_values` porque no son laboratorios; un marcador "sin clave canónica" es uno que el documento nombra con una clave que la app no conoce (con el ejemplo de Omar: osmolalidad, peso, estatura). Esos se leen en la evaluación, no en el expediente; si quieres que entren, el equipo le pone la clave canónica en el JSON (`src/constants/lab-canonical-map.ts` y la matriz V7/V6 son la lista).

### 3. Obtener tu JWT

Sigue `scripts/elite/obtener-jwt.md` (un bloque para pegar en la terminal; pide tu correo y contraseña y deja el token en la variable `ATP_JWT`). Dura 1 hora. Nunca lo pegues en un chat, en un correo ni en un archivo del repo.

### 4. Generar el código y mandárselo al cliente

```bash
bash scripts/elite/curl-elite.sh codigo correo@del.cliente
```

Genera un código `elite` de un solo uso, ligado a ese correo (informativo), con 365 días de membresía a partir del canje (12 meses de Pro incluidos en Elite; pasa `[dias]` al final si el contrato dice otra cosa) y 30 días para canjearlo. Imprime algo como:

```
Codigo Elite generado:
  codigo:      ATP-AB12-CD34
  para:        correo@del.cliente
  tier:        elite por 365 dias desde el canje
  canjear antes de: 2026-10-06 (vigencia del codigo, no de la membresia)
```

Mándale el código al cliente por el canal que uses con él y dile dónde va: en la app, Ajustes > Membresía > "Tengo un código de activación" (es la vía para servicios contratados con ATP; en la app no se vende Elite y no hay que mencionar precios ni pagos por fuera).

### 5. Cargar la evaluación

```bash
bash scripts/elite/curl-elite.sh cargar clientes/omar_v1.payload.json
```

Llama a `elite_cargar_completa` con tu JWT (migración 324; envuelve a `elite_cargar_evaluacion`, de la 318 y 321). En una sola transacción escribe: una fila nueva en `functional_dx` (`model='enrique'`, `generated_by='manual'`, `quality_level` 5 con genética o 4 sin ella, la evaluación completa en `sources_snapshot.elite_v3`), las filas del plan en `user_supplements` (`source='coach'`, `is_plan=true`), tu vínculo activo con el cliente en `coach_clients`, su plan de alimentación en `nutrition_plans` (`Plan Elite vN`, con `created_by` tú), sus metas de proteína y agua en `user_day_preferences.goals` solo donde no tenía las suyas, y sus marcadores medidos en `lab_values` (`source='elite'`, fecha = la toma del documento, sin pisar un valor que ya existiera para ese dato y esa fecha).

Dos detalles que conviene tener claros antes de correrlo:

- `coach_clients.coach_id` es **quien corre el script**: el usuario del JWT del paso 3. Por eso el JWT tiene que ser el de Enrique. Si lo corre otra cuenta admin, el cliente queda vinculado a esa cuenta y no a Enrique (y la consola de coach y las rutinas se verían desde ahí).
- Al cargar la sección `alimentacion`, **todo plan activo previo** del cliente en `nutrition_plans` (la versión anterior, o uno creado desde el panel de coach) pasa a `paused` para dejar vigente el de esta versión; se avisa con `nutrition_plan_pausado`. No se borra ninguno.

Si todo sale bien imprime:

```
Evaluacion cargada (esta respuesta es la verificacion oficial):
  dx_id:                 <uuid de la fila>
  version_elite:         1  (fila functional_dx version 1)
  quality_level:         5 (con genetica)
  suplementos insertados:           6
  suplementos actualizados:         0
  suplementos desactivados:         0
  suplementos pausados respetados:  0
  ya eran ficha del cliente:        0  (no se duplicaron)
  raices detectadas:                3
  vinculo coach-cliente:            creado (Enrique ya es su coach activo)
  plan de alimentacion:             escrito (<uuid del plan>)
  metas del dia escritas:           ninguna
  laboratorios a lab_values:        24 escritos, 1 ya existian, 11 fuera por tipo o clave  (fecha 2026-05-01)
```

Después de ese bloque, desde el 21 de septiembre, el mismo comando sigue solo con la siembra (325): imprime `Siembra y conversion (325) para <user_id>...`, tres líneas (`perfil`, `rutinas`, `comidas`) y un segundo bloque `AVISOS de la siembra (325)`. Si esa parte falla (por ejemplo `HTTP 404` porque falta el push de la 325), la evaluación ya quedó cargada y se repite sola con `bash scripts/elite/curl-elite.sh sembrar <user_id>`.

**Esa respuesta es la verificación oficial de la carga.** Guárdala (copia y pega en tu nota del cliente): trae el `dx_id` de la fila. Los contadores de suplementos dicen qué pasó con el plan: insertados (nuevos), actualizados (ya existían con ese nombre y se les puso la dosis nueva), desactivados (del plan anterior y ya no están en este) y pausados respetados (el cliente los había pausado y se quedan así: dato del usuario sagrado). Las cuatro líneas nuevas dicen qué pasó con el vínculo, el plan de comida, las metas y los labs; debajo vienen los `AVISOS` cuando algo se respetó o se quedó fuera:

- `coach_client_inactivo`: el vínculo existía pero el cliente (o tú) lo había puesto inactivo; no se reactiva desde una carga. Si el cliente está de acuerdo, se reactiva desde el panel de coach.
- `sin_plan_alimentacion`: la sección `alimentacion` vino vacía; Comida no muestra plan.
- `nutrition_plan_pausado`: el cliente tenía otro plan activo (por ejemplo la versión anterior) y pasó a pausa; nada se borró.
- `metas_del_cliente_respetadas`: ya tenía fijada su meta de proteína o agua y se dejó la suya; la del plan se lee en la evaluación.
- `labs_dia_asumido`: `fecha_toma` traía solo el mes; los labs entraron con el día 1 y quedó anotado.
- `labs_existentes_respetados`: ese dato ya tenía un valor vivo con esa fecha (lo capturó o corrigió el cliente, o lo dejó una versión anterior de la evaluación) y no se pisó. Consecuencia real: una **corrección de un valor de laboratorio en una versión nueva con la MISMA `fecha_toma` no entra** a `lab_values` (la fila vieja sigue viva y gana). Para corregir una errata hay que anular a mano la fila vieja en la base (`lab_values.is_voided = true`; si vino de una evaluación anterior, se ubica por su `metadata->>'dx_id'` y la clave del marcador) y después cargar la versión nueva; si no, la evaluación trae el valor corregido pero el expediente de labs conserva el dato viejo.
- `marcadores_sin_clave` y `marcadores_fuera_de_labs`: lo que no entró al expediente, por nombre y motivo (ver paso 2).
- `sin_lab_values`: el payload se armó con un `preparar-payload.js` anterior al 20 de septiembre; vuelve a armarlo.

Si responde `version_mismatch`, el mensaje dice la versión que la base espera; se corrige `version` en el JSON, se repite el paso 2 y este. Cualquier otro `ok: false` dice por qué (usuario inexistente, JSON que no valida en el servidor); nada se escribe a medias.

No importa si el cliente ya canjeó el código o todavía no: la evaluación se enciende por existir, no por el tier.

### 6. Verificar

La verificación oficial ya la tienes: es la respuesta `ok: true` del paso 5 con su `dx_id`. Como apoyo (desde la 324 el paso 5 te deja como coach activo del cliente en `coach_clients`, así que este comando sí ve sus filas):

```bash
bash scripts/elite/curl-elite.sh ver <user_id>
```

Lista `id, version, quality_level, created_at` de las evaluaciones Elite de ese usuario. Limitación real de la base: `functional_dx` solo la puede leer su dueño o su coach activo; el admin no tiene política de lectura. Si `ver` dice "sin evaluaciones visibles" pero el paso 5 respondió `ok: true`, la fila existe (el RPC es SECURITY DEFINER y ya la escribió); no repitas la carga, porque la segunda vez sería una versión 2 rechazada por `version_mismatch`. Si quieres verla con tus ojos: Supabase > SQL con un SELECT por `dx_id`, o el paso 7.

### 7. Qué ve el cliente

Al canjear el código, la pantalla le confirma la activación con la fecha de vencimiento y su cuenta pasa a `elite` (Pro incluido, sin candados). La carga no manda ningún aviso automático al cliente: avísale tú que ya está su evaluación. Cuando abre la app ve:

- **Mi evaluación Elite** (pantalla `/salud/evaluacion-elite`; se llega por la tarjeta dentro del Mapa funcional ATP y desde Genética): las secciones del formato Omar navegables, con los tres estados (pide acción, en rango no en su mejor punto, donde queremos), chips de fuente, escalera de evidencia y botón de PDF.
- **Genética** encendida en el launcher, con los hallazgos de la sección `genetica`. Para todos los demás sigue apagada con "Disponible en ATP Elite".
- **Suplementos** abre con la cabecera "Tu plan de Enrique" (cuántos, desde cuándo, enlace al porqué en la evaluación), cada fila con la etiqueta "Asignado por Enrique" y su porqué, contando adherencia como las demás. Las fichas del plan no se eliminan con un gesto: el cliente puede pausarlas (quedan a la vista en "En pausa" y él las reanuda); el plan lo ajustas tú con una versión nueva.
- **Alimentación y entrenamiento** dentro de la evaluación (secciones `alimentacion`, `entrenamiento` y `cierre`), con enlace a Comida y a Entrenar. Comida además tiene el plan en `nutrition_plans` (desde la 324) y, si el manual traía metas con número, sus metas del día de proteína y agua.
- **Laboratorios** (`/edad-atp/labs`, el comparador y ARGOS) con los marcadores medidos de la evaluación, fechados con la toma del documento y etiquetados "Evaluación Elite".
- **ARGOS** contesta con el contexto de su evaluación (el `resumen_argos` que preparaste en el paso 2) cuando pregunta por un marcador, un suplemento o su plan.

Si el código vence y no hay un contrato nuevo, la cuenta pierde el nivel Elite pero la evaluación, su Genética, el plan de suplementos y el contexto de ARGOS se quedan (dato del usuario sagrado).

## 325: qué siembra y qué convierte

Decisión del dueño (8 y 20 de septiembre): el plan de entrenamiento y de alimentación se convierten en rutinas y comidas dentro de la app, y la carga siembra lo que cardio y fitness necesitan para calcular (hasta ahora el cliente del día uno veía "falta tu fecha de nacimiento", "sin FC máxima ni reposo no hay estimación" y nivel sin declarar). Lo hacen tres funciones de la migración 325 que `cargar` llama después de `elite_cargar_completa`, y que `sembrar <user_id>` corre solas. Las tres leen la evaluación Elite vigente del cliente, exigen tu sesión de admin, son idempotentes (la segunda corrida no duplica nada y lo dice) y **solo rellenan lo vacío**: un dato que el cliente ya puso nunca se pisa.

**`elite_sembrar_perfil`.** De `cliente.*` a donde la app lo lee: sexo, fecha de nacimiento y estatura a `client_profiles` (si no tiene fila, la crea); peso, estatura y FC en reposo a `health_measurements` (una fila `source='elite'`, fechada con la toma del documento o con `generado_en`; es la tabla que leen cardio, Edad ATP y el puente de edad); nivel a `profiles.fitness_level`. La FC en reposo solo entra si el cliente no tiene ninguna medición propia, ni manual ni de wearable. Avisos: `perfil_respetado` (lo que ya tenía, con su valor), `perfil_sin_datos` (lo que el documento no trae), `perfil_valores_fuera_de_rango` (se ignoró por forma), `sin_perfil_que_sembrar`.

**`elite_cargar_rutinas`.** Cada `entrenamiento.rutinas[]` se vuelve una rutina real del cliente en Mis rutinas (dueño el cliente, `original_creator_id` tú, nombre tal cual, sin " (copia)"), con un bloque por ejercicio (series, descanso y la prescripción en la etiqueta, tope 80 caracteres: "Sentadilla con barra · 3 x 8-10"; la prescripción completa y tus notas van en las notas del bloque), y se agenda en su semana (`scheduled_routines`, `assigned_by` tú) por cada día único de `dias_semana`; el hub de Entrenar la muestra como "Asignada por Enrique". El clip sale del catálogo `exercise_matrix` (en inglés, ver el paso 1): primero por el `slug` del bloque, después por nombre, al final por familia única; con clip el runner registra series, sin clip corre como bloque de tiempo (40 s por serie salvo reps limpias) y se avisa por nombre.

Qué pasa con las versiones: al cargar una versión nueva de la evaluación (v2, v3...) que traiga rutinas, las rutinas que esta misma carga creó para la versión anterior se **archivan** (`archived_at`, igual que la limpieza de Mis rutinas: siguen en la base y se recuperan) y sus agendas puestas por ti se apagan, para que el hub corra la versión nueva y no la vieja. Las que el cliente borró o archivó no se tocan ni se recrean; una agenda que el cliente puso él mismo tampoco. Si el cliente tiene una rutina PROPIA con el mismo nombre que una de la evaluación, la de la evaluación se crea aparte, se avisa, y no se agenda en los días donde la propia ya está: la propia manda y el cliente decide.

Avisos: `sin_rutinas`, `rutina_ya_cargada` (y si el cliente la borró o la archivó, no se recrea), `rutinas_version_anterior_archivadas` (nombres y versión), `rutina_duplicada_en_documento` (dos rutinas con el mismo nombre en el JSON: entra la primera), `rutina_con_nombre_del_cliente`, `rutina_sin_agenda`, `slug_no_encontrado` (el slug no existe en el catálogo: cópialo tal cual), `ejercicios_fuera_del_catalogo` (sin clip, por nombre), `duracion_no_derivada` (reps en prosa: 40 s fijos, por nombre), `bloque_fuera_de_rango` (series fuera de 1..20 o descanso fuera de 0..600: se ignora ese dato), `rutinas_invalidas`, `sin_vinculo_coach_activo`, `catalogo_no_disponible` y `archivado_sin_columna` (falta la 220 o la 232 en la base). Nunca borra nada; lo único que archiva y desactiva son las rutinas y agendas que ella misma creó para una versión anterior.

**`elite_cargar_comidas`.** `alimentacion.comidas[]` va a `nutrition_plans.meals` y `metas.kcal_dia`, `grasa_g_dia`, `carbohidrato_g_dia` a las metas del plan, **solo en el `Plan Elite vN` de esa misma versión** que dejó la 324 y solo donde estaba vacío. Comida las pinta bajo "Tu plan de Enrique", por momento, con hora, nombre y componentes. Avisos: `sin_comidas`, `sin_plan_elite` (la 324 no creó el plan, por ejemplo porque `alimentacion` vino sin prioriza, evita, ventana, horarios ni metas de proteína o agua; no se crea otro desde aquí), `comidas_ya_cargadas`, `metas_del_plan_respetadas`, `comidas_invalidas`, `comidas_hora_invalida`, `plan_elite_no_activo`.

Lo que la 325 no hace, a propósito: no inventa datos (la edad no se vuelve fecha de nacimiento, un número dentro de una frase de reps no se vuelve tiempo), no revive vínculos inactivos, no crea planes de comida, no borra nada, y no manda las reps del clínico al runner con clip (ese runner usa 10 reps por default; las reps van en la etiqueta y en las notas del bloque, visibles en el builder y en el runner de tiempo). Para revertir: las rutinas de una evaluación están en `elite_rutinas_cargadas` por `dx_id` (se archivan con `archived_at`), la fila de `health_measurements` lleva `source='elite'` (cardio la muestra como "de tu evaluación Elite"), y `meals` se vacía con `[]`.

## Política de versiones (no negociable)

- **Una versión nueva por cada corrección o revisión. Nunca UPDATE.** `functional_dx` es append-only: la fila vieja se queda con `is_current=false` y la nueva sube con `version + 1`. Para corregir, el equipo entrega el JSON con `version` incrementado y repites los pasos 2, 5 y 6. La pantalla del cliente muestra la vigente y permite navegar a las anteriores (ruta 3.10, "Evolución").
- **La genética entra en la segunda entrega como versión 2.** La Entrega 1 del brochure (semana 2 o 3, laboratorios y contexto) se carga con `genetica.hallazgos` vacío y queda con `quality_level 4`. Cuando llega la interpretación genética (semana 8), el equipo produce el JSON completo con `version: 2` y se carga como fila nueva: `quality_level 5`, Genética se enciende en ese momento. No se edita la versión 1 para meterle la genética.
- **Un código por contrato.** Renovaciones (6 o 12 meses): código Elite nuevo en el paso 4 más versión nueva en el paso 5; nunca se alarga un grant a mano.
- **Las filas del plan de suplementos de una versión anterior no se borran** desde aquí; qué hace el RPC con ellas (desactivar o dejar) está escrito en la migración 318. El cliente tampoco las borra: desde el módulo de Suplementos solo puede pausarlas (quedan a la vista en "En pausa" y él las reanuda cuando quiera); el plan lo ajustas tú con una versión nueva.
- Si te equivocaste de `user_id`, no hay borrado: avísale al equipo, se anota en `tier_history`, y se carga bien al cliente correcto. Por eso el paso 2 imprime el nombre del cliente junto al `user_id`: léelos juntos antes del paso 5. Lo que la 324 escribió se puede anular sin tocar nada del cliente: las filas de `lab_values` llevan `metadata->>'dx_id'` de la evaluación (se anulan con `is_voided`), el plan de comida se llama `Plan Elite vN` (se pone en `paused`), y el vínculo en `coach_clients` se pone en `inactive`.

## Cronómetro

Medido el 6 de septiembre de 2026 con el ejemplo de Omar (`elite_v3_ejemplo_omar_anonimizado.json`, 22 hallazgos genéticos, 6 suplementos) en la máquina de desarrollo: el paso 2 tarda 0.7 segundos en Node 22 y produce un payload de 76 KB. Los pasos 4, 5 y 6 se probaron contra un PostgREST simulado en local con el contrato exacto de la migración 318 (cabeceras, cuerpo, consulta y respuesta): la 318 todavía no está en producción (falta el `db push`). Con el JWT ya en la terminal, el flujo completo de los pasos 2 a 6 son cuatro comandos y menos de 2 minutos de teclado; la primera vez, incluyendo el paso 3 y leer esta guía, cabe en los 10 minutos que pide la ruta. Anota aquí tu tiempo real la primera vez que cargues a un cliente: ________.
