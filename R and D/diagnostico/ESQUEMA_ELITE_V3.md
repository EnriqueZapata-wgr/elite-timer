# Esquema `elite_v3`: la evaluación ATP Elite dentro de la app

**Fecha:** 6 de septiembre de 2026 (noche ATP 3.0, agente A4). **Paso de la ruta:** 3.1. **Código:** `src/services/elite/elite-v3-core.ts` (tipos, validador, resumen para ARGOS, filas de suplementos) y su test `src/services/elite/__tests__/elite-v3-core.test.ts`. **Ejemplo real anonimizado:** `elite_v3_ejemplo_omar_anonimizado.json` (pasa el validador; es la referencia de cómo se ve un documento completo). Sin em dashes.

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
cliente: { nombre_preferido, sexo: 'male'|'female', edad, fecha_toma: 'YYYY-MM' o 'YYYY-MM-DD' }
```

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
| `alimentacion` | `prioriza[]`, `evita[]`, `ventana {inicio, fin}` en HH:MM o `null`, `horarios[] {momento, que}`, `notas[]` | arreglos |
| `suplementos[]` | el plan (ver abajo) | puede ir vacío |
| `entrenamiento` | `base`, `sesiones[] {tipo, frecuencia_semana, duracion, intensidad, nota}`, `descanso[]`, `notas[]` | arreglos |
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

## Lo que el validador hace cumplir (`validarEliteV3`)

Sin librerías. Devuelve `{ ok: true, valor }` o `{ ok: false, errores[] }` con la ruta exacta de cada error (`marcadores.grupos[0].marcadores[3].estado: ...`).

1. Cabecera y las 15 secciones presentes; tipos y enums de cada campo.
2. `estado` en `null` cuando `valor` (o `score`) es `null`; `evidencia` en 1..4 o `null`; rangos con `min <= max`; scores y calidad en 0..100; `palancas` exactamente tres; `fuente` con al menos un chip válido.
3. Dosis: `dosis_cantidad` y `unidades_por_toma` mayores que cero o `null`; unidad obligatoria cuando hay cantidad.
4. `interpretado_por.genetica` obligatorio si hay hallazgos genéticos.
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

## Decisiones tomadas al escribir el esquema (para que Enrique pueda revertirlas)

- Se agregaron tres secciones a las 12 de Omar: `alimentacion`, `suplementos` y `entrenamiento`, porque el brochure vende los tres manuales y ARGOS los necesita separados.
- Braverman es `ctx`, no `gen` (ver Vocabulario).
- `medico` no repite "lo que falta por medir" de la sección `marcadores`: todo lo pendiente vive en `medico.pendientes`.
- Las palancas viven solo en `cierre.palancas` (el HTML las pinta dos veces; el JSON las guarda una).
- `unidad` va en `null` cuando el HTML no la trae (la app las tiene en la matriz por `key` y puede pintarlas; el esquema no las inventa).
- En el ejemplo, la prosa de Omar se conservó salvo tres tipos de retoque obligados por la casa: em dashes a dos puntos o coma; "No es un diagnóstico" a "No es una conclusión médica"; "chequeo" a "medición"; "diagnóstico previo / gastritis diagnosticada" a "historial médico / registrada por tu médico"; y el disclaimer del cierre sin la palabra roja. Frases como "se revierte" o "se nota en 4-8 semanas" son del clínico que firma y se dejaron tal cual: el SPEC las marca como prohibidas para copy generado por la app, no para texto firmado por una persona.
