# Esquema `elite_v3`: la evaluación ATP Elite dentro de la app

**Fecha:** 6 de septiembre de 2026 (noche ATP 3.0, agente A4); campos de perfil, comidas y rutinas agregados el 21 de septiembre de 2026 (migración 325, ver la sección "Lo que siembra y lo que se convierte"). **Paso de la ruta:** 3.1. **Código:** `src/services/elite/elite-v3-core.ts` (tipos, validador, resumen para ARGOS, filas de suplementos) y su test `src/services/elite/__tests__/elite-v3-core.test.ts`. **Ejemplo real anonimizado:** `elite_v3_ejemplo_omar_anonimizado.json` (pasa el validador; es la referencia de cómo se ve un documento completo). Sin em dashes.

## Qué es

Es el entregable de 12 secciones que hoy Enrique produce como HTML (formato Omar, `Omar_DX_v3.html`, descrito en `SPEC_DIAGNOSTICO_V3.md`) convertido a un objeto de datos, más los tres manuales que vende el brochure Elite 2026 (qué comer, qué suplementar con dosis y hora, cómo entrenar y descansar). La app lo guarda, lo navega en "Mi evaluación Elite", enciende Genética con él, carga el plan de suplementos en el módulo que ya existe y se lo da a ARGOS como contexto. No es un motor: nada aquí calcula rangos ni estados. Todo lo que dice lo escribió y firmó una persona (`interpretado_por`).

## Vocabulario (heredado del formato Omar, sin cambios)

| Campo | Valores | Significado |
|---|---|---|
| `estado` | `att`, `sub`, `opt`, `null` | ▲ pide acción · ◆ en rango, no en su mejor punto · ● donde queremos · sin valor |
| `fuente` | `gen`, `lab`, `ctx` | genética · laboratorio (incluye composición corporal y sensor de glucosa) · contexto (entrevista, cuestionarios, Braverman, hábitos) |
| `evidencia` | `1`..`4`, `null` | escalera de cuatro peldaños: 1 fuera del rango del laboratorio · 2 dentro del laboratorio, fuera del criterio funcional · 3 criterio funcional interpretativo · 4 hay señal, no hay prueba · `null` si el clínico no lo anotó |
| `estimado` | booleano | el "(ESTIMADO, no medido)" del HTML. Va en el flag, no en el nombre |

Nota sobre chips: el HTML de Omar pinta "Braverman" con el chip de genética y "Composición" con el de laboratorio. En el esquema Braverman es `ctx` (es un cuestionario) y Composición es `lab` (es una medición). Es una decisión de este esquema, documentada aquí para que la pantalla no la contradiga.

## Cabecera (obligatoria)

```
schema: 'elite_v3'
version: entero >= 1 (número de revisión de la evaluación)
generado_en: fecha ISO
interpretado_por: { evaluacion: string; genetica?: string }
cliente: { nombre_preferido, sexo: 'male'|'female', edad, fecha_toma: 'YYYY-MM' o 'YYYY-MM-DD',
           fecha_nacimiento?: 'YYYY-MM-DD'|null, estatura_cm?: number|null, peso_kg?: number|null,
           nivel_fitness?: 'principiante'|'intermedio'|'avanzado'|null, fc_reposo?: number|null }
```

Los cinco campos opcionales de `cliente` (21 de septiembre de 2026, migración 325) son lo que cardio y fitness necesitan para calcular; la carga los siembra en el perfil del cliente solo donde él no tiene ya el suyo. Ausente = `null`. Rangos que el validador exige si vienen: fecha real entre 1900 y hoy, estatura 100 a 250 cm, peso 30 a 300 kg, FC en reposo 30 a 120.

`interpretado_por.evaluacion` es quien firma el documento. `interpretado_por.genetica` es quien firma la interpretación genética y es obligatorio si `genetica.hallazgos` trae algo: la app es agnóstica del proveedor (pivote 1.3, punto 1). `fecha_toma` admite solo mes porque el formato Omar dice "mayo 2026" y el día no se inventa.

## Secciones (las 15 son obligatorias; el contenido puede ir vacío o en `null`)

| Sección | Qué trae | Obligatorio dentro |
|---|---|---|
| `inicio` | edad cronológica, Edad ATP, diferencia en años, frase lead, semanas del programa | todo puede ser `null` |
| `conteo` | total medido, cuántos piden acción, valores medidos, hallazgos de ADN, ejes de química, `mueven_tu_caso {att, sub, opt}`, ritmo de envejecimiento en meses, calidad del estudio 0..100 | todo puede ser `null` |
| `edades` | real, sangre (PhenoAge), vida, ATP, SF en %, `detalle[]` de bloques `{titulo, parrafos[]}` | `detalle` arreglo |
| `sistemas[]` | por sistema: `key` de dominio de la matriz, nombre, score 0..100, estado, `por_que` | `key`, `nombre`, `por_que`; `estado` null si `score` es null |
| `contexto` | `parrafos[]`, `cita` (respuesta libre de la persona), `antecedentes[]` | arreglos |
| `marcadores` | `intro`, `grupos[] {nombre, marcadores[]}`, `notas[]` ("algo honesto sobre este estudio") | `grupos` |
| `composicion` | `reparto` (peso, grasa, músculo y resto en % y kg) y `filas[]` de marcadores (peso, % grasa, % músculo, grasa visceral, estatura, edad corporal) con su meta en `objetivo` | `filas` |
| `braverman` | `intro`, `naturaleza` y `desgaste` por eje (`dopamina`, `acetilcolina`, `serotonina`, `gaba`), `lecturas[]`, `ejes[] {eje, titulo, nivel dom/medio/bajo, texto}`, `cierre[]` | `naturaleza`/`desgaste` pueden ser `null` si no hay test |
| `genetica` | `intro`, `hallazgos[]`, `resumen[]` ("lo que tu genética NO explica") | `hallazgos` vacío = evaluación sin genética (Entrega 1) |
| `cruces` | `hilo {variable, en, de}` (la variable que aparece en N de N cruces) y `lista[]` | `lista` |
| `medico` | `intro`, `fuera_del_tuyo[]` (dentro del rango del laboratorio, fuera del nuestro), `pendientes[]`, `advertencias[]` | `pendientes` |
| `cierre` | `palancas` (exactamente tres), `vigencia`, `firma`, `disclaimer` | `palancas` |
| `alimentacion` | `prioriza[]`, `evita[]`, `ventana {inicio, fin}` en HH:MM o `null`, `horarios[] {momento, que}`, `notas[]`, opcional `metas {proteina_g_dia, agua_ml_dia, kcal_dia?, grasa_g_dia?, carbohidrato_g_dia?}` (números mayores que cero o `null`; desde el 20-sep-2026 alimentan `nutrition_plans` y las metas del día del cliente cuando él no tiene las suyas; kcal, grasa y carbohidrato desde el 21-sep-2026) y opcional `comidas[]` (ver abajo) | arreglos |
| `suplementos[]` | el plan (ver abajo) | puede ir vacío |
| `entrenamiento` | `base`, `sesiones[] {tipo, frecuencia_semana, duracion, intensidad, nota}`, `descanso[]`, `notas[]`, y opcional `rutinas[]` (ver abajo) | arreglos |
| `html?` | HTML completo del entregable (opcional; cabe en JSONB) | exento del candado de texto: lo produce el generador de Enrique |

### Marcador (`EliteMarcador`)

```
key: slug (clave canónica de la matriz V7/V6 cuando existe: ggt, homair, glucosa_en_ayuno; slug propio si no: osmolalidad)
nombre: en lenguaje llano, como lo escribe el clínico
valor: number | null      unidad: string | null (solo si el documento la trae)
rango_lab: {min, max} | null   (rango de referencia del laboratorio, solo si el documento lo trae)
objetivo: {min, max} | null    ("Te queremos en"; un solo lado = el otro en null: {min: null, max: 30})
estado, fuente[], evidencia, estimado, nota?
```

Reglas: `estado` debe ser `null` si `valor` es `null`; `min <= max`; un rango no puede tener ambos lados en `null` (se usa `null` en el rango entero). El objetivo es un campo aparte del rango: nunca se deriva del piso del riel (SPEC 1.2, sección 05).

### Hallazgo genético

`{ tema, titulo, gen, variante, genotipo?, hallazgo, implicacion, que_hacer, evidencia, fuente: 'gen' }`. `gen` y `variante` van en `null` cuando el documento habla en lenguaje llano y no nombra el gen (el formato Omar). Sin parser en 3.0: se escribe a mano.

### Cruce

`{ titulo, fuentes[], hallazgo, consecuencia, accion, evidencia, con_que_cruza?, falta_medir? }`. `hallazgo` = los números que lo dispararon; `consecuencia` = "cómo lo sabemos" (la lógica); `accion` = "la regla" (qué hacer, metas y cuándo se mide).

### Pendiente (`medico.pendientes[]`)

`{ que, por_que, con_quien }`. Es lo que todavía no se mide (estudios, valoraciones), nunca conclusiones. `con_quien` es el único campo de todo el esquema donde el vocabulario clínico es libre (ahí sí cabe "tratamiento" o "médico"), porque nombra a un tercero.

### Suplemento del plan

`{ nombre, dosis_cantidad, dosis_unidad ('mg'|'mcg'|'g'|'UI'|'ml'), unidades_por_toma, momento, por_que, duracion?, advertencia? }`, alineado a `user_supplements` de la migración 312: `dosis_cantidad` es `amount_per_unit`, `dosis_unidad` es `amount_unit`, `unidades_por_toma` es `units_per_dose`, `momento` es `timing` (`morning`, `with_food`, `afternoon`, `evening`, `bedtime`; `null` si el manual no fija la hora y la fila toma el default `morning` de la 055), `por_que` es `reason`. `suplementosAFilas(e, userId)` devuelve las filas con `source: 'coach'`, `is_plan: true`, `is_active: true`, `dosage` como texto (raya cuando no hay cantidad) y `notes` con duración y advertencia. Las inserta el RPC `elite_cargar_evaluacion` (ruta 3.2); ATP no inventa dosis: si el manual no la fija, va `null`.

### Comida del plan (`alimentacion.comidas[]`, migración 325)

```
{ momento: 'desayuno'|'comida'|'cena'|'colacion'|'pre_entreno'|'post_entreno',
  hora: 'HH:MM' | null, nombre: string, componentes: string[], notas: string | null }
```

Ausente = `[]`. `hora` es reloj de 24 horas (`07:30` sí, `7:30` y `25:00` no); `null` cuando el manual no fija la hora. Van tal cual a `nutrition_plans.meals` del `Plan Elite vN` de esa versión (`elite_cargar_comidas`) y Comida las pinta por momento bajo "Tu plan de Enrique". No se derivan calorías ni macros de las comidas: las metas con número van en `metas`.

### Rutina del plan (`entrenamiento.rutinas[]`, migración 325)

```
{ nombre: string, objetivo: string | null,
  dias_semana: number[] | null,          // 1 = lunes ... 7 = domingo, sin repetidos; null = sin agenda
  bloques: [{ ejercicio: string, series: number | null, reps: string | null, descanso_s: number | null, notas: string | null,
              slug?: string | null }],   // slug exacto de exercise_matrix (barbell-bench-press); fija el clip
  notas: string | null }
```

Ausente = `[]`. `bloques` trae al menos un ejercicio; `series` entero 1 a 20; `reps` texto libre (`"10"`, `"8-12"`, `"30 s"`, `"45 min"`); `descanso_s` 0 a 600; `slug` opcional con forma de slug (minúsculas, dígitos y guiones). La carga (`elite_cargar_rutinas`) la convierte en una rutina real del cliente (`routines` + `blocks`, un bloque `work` por ejercicio con `rounds` = series y `rest_between_seconds` = descanso) y la agenda en `scheduled_routines` por cada día único de `dias_semana` con `assigned_by` = quien la cargó.

**El catálogo está en inglés.** `exercise_matrix` (migración 220, seed 223) es el catálogo MoveKit: 214 ejercicios con `nombre` en inglés (`Barbell Bench Press`, `Machine Leg Press`, `Band High Face Pull`) y `familia` en español (`Press de pecho`, `Peso muerto`, `Face pull`). Un nombre en español como `Press de banca con mancuernas` no empareja con nada (revisión en frío del 21 de septiembre: 0 de 23 y 0 de 16 en los dos primeros clientes reales). La forma de fijar el clip es `slug`: la carga empareja primero por `slug` exacto contra `exercise_matrix.slug`, después por nombre normalizado (solo pega si el documento lo escribe en inglés) y al final por `familia` cuando esa familia tiene una sola fila en el catálogo (`Curl femoral`, `Puente de glúteo`); nunca por prefijo ni parecido. Con emparejamiento, el runner corre el bloque con clip y registro de series y el nombre en español se conserva como etiqueta del bloque (`label`, tope 80 caracteres; la prescripción completa y las notas van a `notes`, tope 500). Un `slug` que no existe se avisa (`slug_no_encontrado`) y el bloque sigue por nombre.

Sin emparejamiento, el bloque corre como tiempo y la carga lo avisa por nombre (`ejercicios_fuera_del_catalogo`). El tiempo se deriva **solo** cuando `reps` es limpio: `"8"` u `"8-10"` (4 s por repetición con el último número), `"30 s"`, `"45 min"` (tope 1800 s). Con prosa (`"10 por lado"`, `"6 reps"`, `"8 min · 8 al minuto"`, `"15 dejando 2 en el tanque"`) queda en 40 s fijos por serie y se avisa (`duracion_no_derivada`): no se adivina un número dentro de una frase. Para que un ejercicio sin clip corra con el tiempo correcto, escribe `reps` limpio y deja la explicación en `notas`.

## Lo que el validador hace cumplir (`validarEliteV3`)

Sin librerías. Devuelve `{ ok: true, valor }` o `{ ok: false, errores[] }` con la ruta exacta de cada error (`marcadores.grupos[0].marcadores[3].estado: ...`).

1. Cabecera y las 15 secciones presentes; tipos y enums de cada campo.
2. `estado` en `null` cuando `valor` (o `score`) es `null`; `evidencia` en 1..4 o `null`; rangos con `min <= max`; scores y calidad en 0..100; `palancas` exactamente tres; `fuente` con al menos un chip válido.
3. Dosis: `dosis_cantidad` y `unidades_por_toma` mayores que cero o `null`; unidad obligatoria cuando hay cantidad.
4. `interpretado_por.genetica` obligatorio si hay hallazgos genéticos.
4b. (325) `cliente.fecha_nacimiento` real y no futura; estatura 100..250; peso 30..300; FC en reposo 30..120; `nivel_fitness` en su enum; `comidas[].momento` en su enum y `hora` de reloj; `rutinas[].dias_semana` enteros 1..7 sin repetir; `bloques` con al menos un ejercicio, series 1..20, descanso 0..600, `slug` con forma de slug o `null` (que exista en el catálogo lo avisa la carga, no el validador). Todo opcional: el ejemplo de Omar no trae nada de esto y valida igual. El valor devuelto sale normalizado: los cinco campos del cliente y las cinco metas siempre presentes (número o `null`), `comidas` y `rutinas` siempre arreglos, `slug` de cada bloque siempre presente (texto o `null`).
5. **Candado de texto** sobre TODO string del objeto (menos `html`): cero em dashes, y ninguna palabra roja del informe legal (diagnóstico, diagnosticar, tratamiento, terapéutico, previene, cura, receta médica, médico de IA, chequeo, clínicamente validado; se comparan sin acentos) salvo en `medico.pendientes[].con_quien`. "Tienes [enfermedad]" no se detecta por regex: queda para la revisión humana antes de cargar.

Lo que NO valida (a propósito): coherencia clínica (si `att` es correcto para ese valor), unidades contra la matriz, ni que los conteos de `conteo` cuadren con las filas. Eso lo decide quien firma; el test del ejemplo sí comprueba que en Omar cuadran (28 filas = 13 + 7 + 8; 22 hallazgos).

## Derivados

- `nivelCalidadEliteV3(e)`: 5 si `genetica.hallazgos.length > 0`, 4 si no (`functional_dx.quality_level`, migración 170: el 5 ya está definido como "con genéticos").
- `esEliteV3(sources_snapshot)`: verdadero si el snapshot trae `elite_v3.schema === 'elite_v3'`. Es el discriminador de "tiene evaluación Elite" junto con `model='enrique'` (pivote 2.3, punto 2). Mi evaluación Elite, Genética y el contexto de ARGOS se encienden por existencia de la evaluación, no por tier.
- `resumenParaArgos(e)`: texto de hasta 1,800 caracteres para el system prompt: quién es, marcadores en `att` con valor y objetivo, hilo, palancas, plan de suplementos con dosis y momento, cruces y pendientes. Cada lista se acorta con "(+N mas)" cuando no cabe, nunca a media frase. Solo reordena texto ya validado.
- `marcadoresDe(e)`: todos los marcadores comentados (grupos más composición) en el orden del documento.

## Cómo se versiona

Cada evaluación y cada revisión (6 o 12 meses, brochure) es **una fila nueva de `functional_dx`**, nunca un UPDATE:

- `sources_snapshot = { elite_v3: <objeto validado> }` (más lo que el RPC quiera anotar: fecha de carga, quién cargó).
- `elite_v3.version` = evaluaciones Elite previas del usuario + 1 (la primera es 1). Es independiente de `functional_dx.version`: esa la calcula el RPC `elite_cargar_evaluacion` (migración 318, mismo advisory lock que `create_dx_version`) como MAX + 1 sobre todas las filas del usuario, incluidas las del mapa funcional de ARGOS. El RPC compara `elite_v3.version` contra el conteo de filas `elite_v3` previas y rechaza con `version_mismatch` (y `version_esperada`) si no coincide: un curl repetido no duplica. (Corregido el 6 de septiembre de 2026, 4EP.)
- `generated_by = 'manual'`, `model = 'enrique'`, `quality_level = nivelCalidadEliteV3(e)` (5 con genética, 4 sin), `is_current = true` (la anterior baja a `false` en la misma transacción).
- `summary_text` = `resumenParaArgos(e)` (así ARGOS y la Card A leen lo mismo sin recalcular).
- Una corrección es una versión nueva. La Entrega 1 (sin genética, `quality_level` 4) y la Entrega 2 de la semana 8 (con genética, `quality_level` 5) del brochure son dos versiones. "Evolución" es navegar entre versiones (ruta 3.10).
- El plan de suplementos de cada versión se inserta como filas nuevas de `user_supplements` (`source='coach'`, `is_plan=true`); qué hacer con las filas del plan anterior lo decide el RPC de la ruta 3.2 (dato del usuario sagrado: no se borran; se desactivan o se dejan).

## Cómo se produce un `elite_v3` desde los insumos de Enrique

1. El equipo convierte el HTML o los insumos al JSON (el ejemplo de Omar es la plantilla: mismas claves, misma profundidad).
2. Se corre `validarEliteV3` (el test lo hace sobre el ejemplo; para un cliente nuevo se puede correr con el mismo runner o desde la herramienta de la ruta 3.7). Los errores dicen la ruta exacta.
3. Se revisa a mano lo que el validador no ve: "tienes [enfermedad]", afirmaciones sin respaldo, nombre preferido correcto.
4. Enrique lo carga con su JWT vía `elite_cargar_evaluacion` (ruta 3.2), nunca desde Cowork.

## Lo que siembra y lo que se convierte (migración 325, 21 de septiembre de 2026)

Decisión del dueño: el plan de entrenamiento y alimentación se convierten en rutinas y comidas dentro de la app, y la carga siembra lo que cardio y fitness necesitan. Después de `elite_cargar_completa`, el script llama con el mismo JWT a tres funciones que leen la evaluación recién guardada y solo rellenan lo vacío (lo que el cliente ya puso se respeta y se dice en avisos):

| Función | Lee del `elite_v3` | Escribe (solo si está vacío) |
|---|---|---|
| `elite_sembrar_perfil` | `cliente.sexo`, `fecha_nacimiento`, `estatura_cm`, `peso_kg`, `fc_reposo`, `nivel_fitness` | `client_profiles.biological_sex`, `date_of_birth`, `height_cm`; `health_measurements.weight_kg`, `height_cm`, `resting_hr` (fila `source='elite'` fechada con `fecha_toma` o `generado_en`; es lo que lee cardio y Edad ATP); `profiles.fitness_level` |
| `elite_cargar_rutinas` | `entrenamiento.rutinas[]` | `routines` + `blocks` del cliente (clip por `slug`, nombre o familia única de `exercise_matrix`), `scheduled_routines` por día, rastro en `elite_rutinas_cargadas` (idempotencia por cliente, evaluación y nombre). Una versión nueva archiva las rutinas que la carga creó para la anterior (`archived_at`) y apaga sus agendas del coach; las propias del cliente no se tocan |
| `elite_cargar_comidas` | `alimentacion.comidas[]` y `metas.kcal_dia`, `grasa_g_dia`, `carbohidrato_g_dia` | `nutrition_plans.meals`, `calorie_target`, `fat_target`, `carb_target` del `Plan Elite vN` de esa versión |

El detalle de avisos y de qué NO hacen está en `CARGAR_ELITE.md` (sección "325: qué siembra y qué convierte") y en la cabecera de `supabase/migrations/325_elite_sembrar_y_convertir.sql`.

## Decisiones tomadas al escribir el esquema (para que Enrique pueda revertirlas)

- Se agregaron tres secciones a las 12 de Omar: `alimentacion`, `suplementos` y `entrenamiento`, porque el brochure vende los tres manuales y ARGOS los necesita separados.
- Braverman es `ctx`, no `gen` (ver Vocabulario).
- `medico` no repite "lo que falta por medir" de la sección `marcadores`: todo lo pendiente vive en `medico.pendientes`.
- Las palancas viven solo en `cierre.palancas` (el HTML las pinta dos veces; el JSON las guarda una).
- `unidad` va en `null` cuando el HTML no la trae (la app las tiene en la matriz por `key` y puede pintarlas; el esquema no las inventa).
- En el ejemplo, la prosa de Omar se conservó salvo tres tipos de retoque obligados por la casa: em dashes a dos puntos o coma; "No es un diagnóstico" a "No es una conclusión médica"; "chequeo" a "medición"; "diagnóstico previo / gastritis diagnosticada" a "historial médico / registrada por tu médico"; y el disclaimer del cierre sin la palabra roja. Frases como "se revierte" o "se nota en 4-8 semanas" son del clínico que firma y se dejaron tal cual: el SPEC las marca como prohibidas para copy generado por la app, no para texto firmado por una persona.
