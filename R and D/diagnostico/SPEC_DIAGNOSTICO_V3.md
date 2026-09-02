# SPEC · Diagnóstico v3 ("Mi Mapa Funcional", pendiente 3.12 del backlog / 3.1 de la noche)

> **Decisión de Enrique, 1 de septiembre de 2026 (cierra la pregunta 1 y cambia el alcance):**
> La app y el diagnóstico calculan la Edad ATP con motores distintos **a propósito**, y está bien.
> El diagnóstico recibe más información y es más preciso; la app es una herramienta soft, un
> cálculo previo, no la intervención directa de expertos. No hay que flaguear la discrepancia
> al cliente ni unificar motores. **El DX de Omar se entregó como referencia de cómo se ve un
> entregable completo**: la navegación, las secciones, cómo se ven los labs, los cruces
> (cuestionarios × Braverman × laboratorios × estilo de vida × síntomas, y genética después).
> El trabajo es pulir la pestaña de diagnóstico de la app para que se vea y se navegue así,
> con los datos que la app ya tiene, no reimplementar el Algoritmo V7.


**Fecha:** 31 de agosto de 2026, madrugada. **Autor:** agente de producto (noche 4).
**Estado:** especificación para implementar. No se tocó código ni base.
**Entrada:** `R and D/diagnostico/Omar_DX_v3.html` (expediente real de un cliente de
Elite Diagnostics, formato nuevo). En este documento NO se copian sus valores ni su
nombre: se usan placeholders. El archivo contiene datos de salud de una persona real;
no lo muevas de esa carpeta ni lo subas a ningún chat.

---

## 0. Resumen ejecutivo (léelo aunque no leas el resto)

1. **El DX v3 no es un documento nuevo: es la salida del motor Edad ATP "Algoritmo Excel
   V7" puesta en prosa.** Los tres números grandes ("Tu sangre", "Tu vida", "Tu edad
   ATP"), el ritmo de envejecimiento en meses, el "51.5% que resume todo tu estudio" y la
   "calidad del estudio" son, uno por uno, `phenoage`, `edad_biologica_con_ajuste`
   (G36), `algoritmo_excel` (G37), `ritmo_envejecimiento`, `sf_score` y `ce`. Verifiqué
   la aritmética contra el ejemplo: `G37 = 0.75 × G36 + 0.25 × PhenoAge` y
   `ritmo = 12 + ((75 − SF×100) × edad^0.75) / 100` reproducen los números mostrados.
   Todo eso existe en `src/services/edad-atp/algoritmo-excel-service.ts`,
   `phenoage-service.ts`, `sf-9band-service.ts` y `load-all-params.ts`.
2. **Pero producción no corre esa tubería.** `computeEdadAtpV2()` (lo que lee la
   pantalla vieja de diagnóstico y `result-preview`) corre `motor-v2-service` (cinco
   áreas ciegas ancladas + modulador de hábitos). La tubería Excel solo la ejercitan
   tests y las sub-edades. Consecuencia: **hoy la app y el DX v3 darían dos "Edad ATP"
   distintas para la misma persona.** Es la pregunta 1 para Enrique y bloquea la
   sección 02 del documento.
3. **Los "diez sistemas" son los diez dominios de la matriz V7/V6**, con el mismo
   nombre y el score 0-100 de `scoreDomain()`. Ya se calcula para cuatro dominios
   (sub-edades); extenderlo a diez es trivial y no requiere firma.
4. **"Marcador por marcador" ya existe en la app como ficha por biomarcador**
   (`ficha-biomarcador-core.ts`, `app/edad-atp/lab/[key].tsx`) con el mismo semáforo
   de tres estados (▲ Pide acción = `atencion`, ◆ En rango no en su mejor punto =
   `aceptable`, ● Donde queremos = `optimo`). Lo que NO existe es el objetivo por
   persona ("Te queremos en X") cuando difiere de la banda óptima de la matriz.
5. **"Las conexiones entre ellos" ya existe como Mi lectura** (`lectura-core.ts`, 10
   reglas de cruce con hallazgo / lógica / convergencia / regla / bandera y chips de
   fuente). El DX v3 usa exactamente esa estructura. Falta el "hilo" (la variable que
   aparece en N de N cruces) y faltan reglas de cruce que el ejemplo usa y el catálogo no
   tiene (hígado + alcohol, acelerador/freno con Braverman, reflujo/lactosa).
6. **Genética no existe en ATP.** Ni tabla, ni parser, ni vocabulario. La sección 08
   del DX v3 (22 hallazgos en 6 temas) y sus derivados (chips "Genética" en cruces,
   "lo que tu genética dice de lo que tomas", y las frases "tu genética está protegida /
   es una fuga") **no se pueden construir**. Se propone estado vacío honesto.
7. **La prosa por persona (el "por qué" de cada sistema, el comentario de cada
   marcador, la narrativa de cada cruce, las "tres palancas") la escribió un clínico.**
   No sale de ninguna tabla. Hay tres caminos (editor para el clínico, ARGOS con
   vocabulario controlado, plantillas deterministas) y la elección cambia toda la
   arquitectura. Pregunta 2 para Enrique.
8. **Regla dura aplicada en todo el spec:** cualquier umbral, rango, objetivo o
   afirmación causal que no esté ya en la matriz V7/V6 va marcado `FIRMA MARIANA`. Hay
   más de lo que parece: las metas de composición corporal del ejemplo (≤20% grasa,
   ≥45% músculo, visceral ≤7) NO coinciden con la banda óptima de la matriz, y varios
   objetivos de marcadores tampoco.

---

## 1. Anatomía del DX v3

### 1.1 Cómo está hecho el archivo

- HTML de 1.7 MB: 1.5 MB son seis fotos JPEG en base64 (portada y fondos de sección),
  cinco SVG (logos y el diagrama del "hilo"), 34 KB de CSS y **3 KB de JavaScript que
  es solo presentación**: reveal al hacer scroll (`IntersectionObserver`), barra de
  progreso, resaltado de la nav, contador animado de `[data-count]`, toggle de tema
  claro/oscuro. **No hay ni una fórmula en el script.** Toda la lógica corrió antes,
  en el generador: el HTML es la impresión de un objeto de datos.
- Doce `<section>` con `id`: `inicio`, `conteo`, `edades`, `sistemas`, `contexto`,
  `marcadores`, `composicion`, `braverman`, `genetica`, `cruces`, `medico`, `cierre`.
  La nav superior las lista como: Dónde estás · Tus edades · Sistemas · Quién eres ·
  Marcadores · Composición · Tu cabeza · Genética · Cruces · Lo que falta cerrar ·
  Lo que sigue.
- El texto repetido delata el modelo de datos: las "tres palancas" aparecen idénticas en
  la sección 03 y en la 11; el "por qué" de cada sistema reaparece resumido dentro de los
  cruces; los objetivos del riel reaparecen en la tabla "Dentro del rango del
  laboratorio, fuera del tuyo". Es un JSON renderizado dos veces, no prosa suelta.
- Tres clases de estado recorren todo el documento y son el vocabulario visual:
  `att` (▲ rojo, "Pide acción"), `sub` (◆ ámbar, "En rango, no en su mejor punto"),
  `opt` (● verde, "Donde queremos"). Un cuarto, `out`, pinta los tramos del riel fuera
  del rango cuando el marcador está en `opt`.
- Tres chips de fuente en los cruces: `gen` (Genética, también usado para
  "Braverman"), `lab` (Laboratorio, también usado para "Composición"), `ctx`
  (Contexto).
- Anotaciones entre corchetes al final de algunos comentarios: `[Nivel 2 · aquí uso un
  criterio más estricto que el de tu laboratorio]`, `[Nivel 3 · criterio funcional]`,
  `[Nivel 4 · hay señal, no hay prueba]`. Es una escalera de evidencia de cuatro
  peldaños que el documento no define en ningún lado. Inferencia (a confirmar): 1 =
  fuera del rango del laboratorio; 2 = dentro del laboratorio, fuera del criterio
  funcional; 3 = criterio funcional interpretativo; 4 = hipótesis sin prueba.
- Etiqueta `(ESTIMADO, no medido)` en el nombre de dos marcadores de sueño más un
  párrafo `tiny est` fijo: "Este valor es una estimación a partir de tus respuestas, no
  una medición directa". Es un flag booleano por marcador, no prosa.

### 1.2 Sección por sección

Formato: **qué muestra · de qué datos sale · lógica inferida · tipo** (`CALC` sale de
una fórmula reproducible; `TABLA` sale de una tabla de la app; `EDITORIAL` lo escribió
el clínico para esa persona; `GEN` requiere genética).

#### Portada (`inicio`)
- Muestra: nombre, "Expediente de precisión · [mes año]", tres cifras: **Tu edad**
  (cronológica), **Tu cuerpo funciona como** (Edad ATP), **Diferencia** ("[n] años de
  más" / "de menos"), una frase lead y la firma del equipo.
- Datos: fecha de nacimiento, Edad ATP, fecha del levantamiento.
- Lógica: `diferencia = edad_atp − cronológica`, un decimal. El lead es plantilla con
  la diferencia redondeada a texto ("seis años y medio").
- Tipo: `CALC` + plantilla.

#### 01 Dónde estás (`conteo`)
- Muestra: titular "Medimos **[N] cosas** de tu cuerpo. De todas ellas, **[k] piden
  acción** hoy." Tres cajas: **[a] valores medidos** (sangre, sensor de glucosa 14 días,
  composición, pruebas físicas, sueño y hábitos), **[b] hallazgos en tu ADN** (agrupados
  en 6 temas), **[c] ejes de tu química cerebral** (4 de naturaleza + 4 de desgaste).
  Luego "Los **[m] que mueven tu caso**": barra apilada con tres segmentos y leyenda
  ▲ [k] Pide acción · ◆ [s] En rango no en su mejor punto · ● [o] Donde queremos. Dos
  KPI: **Tu ritmo de envejecimiento** "[r] meses por cada 12 de calendario" y **Calidad
  de tu estudio** "[q] de 100".
- Datos: conteo de parámetros con valor (los 138 de la matriz por sexo más los que no
  tienen banda), conteo de hallazgos genéticos, 8 ejes Braverman, estado de cada marcador
  comentado, `ritmo_envejecimiento`, `ce`.
- Lógica: `N = a + b + c` (en el ejemplo 126 + 22 + 8 = 156). `m = k + s + o` (13 + 7 + 8
  = 28) y `m` es el número de filas de la sección 05: **el subconjunto "que mueven tu
  caso" es exactamente la lista de marcadores que el clínico decidió comentar**; no hay
  regla visible. Ritmo: `12 + ((75 − SF×100) × edad^0.75) / 100`
  (`computeAlgoritmoExcelFromComponents`). "Envejeces [r/12] años por cada año". Calidad
  = CE (completitud), explícitamente "no es tu salud".
- Tipo: `CALC` para todo menos la selección de los "m", que es `EDITORIAL`.

#### 02 Tus edades (`edades`)
- Muestra: eje horizontal con cuatro marcas: **Tu edad real**, **Tu sangre**, **Tu
  vida**, **Tu edad ATP**; tres cards con el mismo trío y su explicación fija ("Nueve
  marcadores que miden envejecimiento. Solo ven química" / "Cómo está funcionando tu
  cuerpo hoy: tus diez sistemas, tu composición, tus pruebas físicas y tus hábitos" /
  "Las dos, combinadas con nuestra fórmula"). Un `<details>` "Leer el detalle de tus
  edades" con cinco subtítulos de prosa: qué resume el SF, qué te está costando los años
  (tres cosas), el hilo que las une, cuatro cosas que hay que cerrar, dos notas (vigencia
  de la sangre, datos estimados, fechas del programa).
- Datos: `phenoage` (nueve biomarcadores de Levine: albúmina, creatinina, glucosa, PCR,
  linfocitos %, VCM, RDW, fosfatasa alcalina, leucocitos), `edad_biologica_con_ajuste`
  (G36: cronológica × ritmo/12 + ajustes de composición), `algoritmo_excel` (G37),
  `sf_score`.
- Lógica: eje lineal con dominio `[min(edades) − 3, max(edades) + 3]` (verificado con
  las posiciones `left:%` del HTML). `edad_atp = 0.75 × vida + 0.25 × sangre`. Color:
  la más baja `opt`, la más alta `att`, ATP `fin` (acento), cronológica `cron`.
- Tipo: `CALC` para números y eje; `EDITORIAL` todo el `<details>`.

#### 03 Tus diez sistemas (`sistemas`)
- Muestra: tabla ordenada de peor a mejor. Por fila: nombre del sistema, barra 0-100 con
  punto, score, "Por qué" (2 a 5 frases). Los diez nombres del ejemplo y su clave de
  matriz: Metabolismo (`metabolismo`), Composición corporal (`composicion_corporal`),
  Vitalidad y estado mental (`vitalidad`), Hábitos y estilo de vida (`habitos`),
  Inflamación (`inflamacion`), Sistema cardiovascular (`cardiovascular`), Sistema
  hormonal (`sistema_hormonal`), Sueño y ritmo circadiano (`sueno`), Sistema inmune
  (`inmunidad`), Renal y micronutrientes (`renal_micronutrientes`). Debajo, card **Si
  solo pudieras mover tres cosas** con tres palancas numeradas.
- Datos: `scoreDomain(paramValues, MATRIZ[sexo][dominio].params)` por dominio.
- Lógica: score = Σ(score9Bands × peso) / Σ(peso presente). Color por tramo: en el
  ejemplo 29-38 rojo, 58-66 ámbar, 71-73 verde. Cortes inferidos **< 50 rojo · 50 a 69
  ámbar · ≥ 70 verde** (no hay ningún valor entre 39 y 57 ni entre 67 y 70 para afinar;
  confirmar). Orden ascendente por score.
- Tipo: `CALC` score y orden; `EDITORIAL` el "por qué" y las tres palancas.

#### 04 Quién eres (`contexto`)
- Muestra: tres párrafos de contexto de vida (edad, ocupación, viajes, rasgo de carácter,
  pareja), una cita textual de la persona "en su levantamiento", y tres párrafos de
  antecedentes (diagnósticos previos, fármacos suspendidos y su huella en labs, consumo
  de alcohol con tipo de bebida y qué le cae mal).
- Datos: perfil, cuestionario maestro (dolor mayor B.2, contexto de vida D11, consumo
  D5, medicamentos D6, antecedentes D9), padecimientos.
- Tipo: `EDITORIAL` sobre `TABLA`. La cita es la respuesta libre del cuestionario.

#### 05 Marcador por marcador (`marcadores`)
- Muestra: intro fija que explica el riel ("el bloque iluminado es el rango ideal y el
  triángulo eres tú. La línea punteada es el objetivo que te pusimos nosotros, no el
  laboratorio"). Cinco grupos con contador "[n] marcadores · [k] piden acción": Hígado y
  metabolismo (9), Corazón y grasas en sangre (7), Hormonas y tiroides (5),
  Micronutrientes e inflamación (5), Sueño (2). Cada fila es un `<details>`: nombre en
  lenguaje llano con la abreviatura entre paréntesis, valor, pill de estado; adentro el
  riel y 1 a 4 párrafos de comentario. Al final un `<details>` "Lo que falta por medir"
  (cuatro estudios ordenados, "una cosa más" por un antecedente, y "algo honesto sobre
  este estudio" listando qué fue estimado).
- Datos: último valor por parámetro (`lab_values`), rango objetivo (lo / hi), objetivo
  puntual ("Te queremos en"), estado, flag estimado, comentario.
- **Geometría del riel (reproducida desde los `left:%`):**
  - Rango de dos lados `[lo, hi]`, ancho `w = hi − lo`: dominio
    `[min(lo − 0.9w, valor − 0.3w), max(hi + 0.9w, valor + 0.3w)]`. Tramo `opt` entre
    `lo` y `hi`, tramos exteriores con la clase del estado del marcador (`att`, `sub`) o
    `out` si el marcador está en `opt`. Un `tick` con número en `lo` y otro en `hi`.
  - Rango de un lado "≤ objetivo": dominio `[0, max(objetivo × 1.7, valor × 1.14)]`,
    tramo `opt` de 0 al objetivo, tramo de estado del objetivo al final, un solo tick.
  - Marcador `you` en la posición del valor, con clase `r` cuando queda pegado al borde
    derecho (etiqueta volteada). Línea punteada `obj` siempre en `lo` (o en el objetivo).
  - Etiquetas fijas debajo: "Estás aquí" y "Te queremos en [lo]". Ojo: en el ejemplo hay
    un marcador en `opt` con rango del laboratorio donde "Te queremos en" muestra el
    piso del rango, que no es un objetivo real. **El objetivo debe ser un campo aparte
    del rango, no derivarse de `lo`.**
  - Sin riel cuando no hay rango numérico (el ejemplo lo hace con PCR convencional: solo
    comentario).
- Estados: `att` cuando el valor está fuera del rango objetivo en la dirección mala;
  `sub` cuando está dentro del rango del laboratorio pero fuera del funcional, o dentro
  del funcional pero lejos del objetivo puntual; `opt` cuando cumple. Coincide con
  `estadoDeParametro()` de `labs-premium-core.ts` (`atencion` / `aceptable` / `optimo`)
  **siempre que el rango sea el de la matriz**. Cuando el clínico puso un objetivo
  distinto, el estado lo decide el objetivo del clínico.
- Los objetivos del ejemplo NO siempre son la banda óptima de la matriz. Comparación
  de umbrales (no de valores de la persona), hombres V7:

  | Marcador | Objetivo en el ejemplo | Banda óptima matriz (S a T) | Coincide |
  |---|---|---|---|
  | T3 libre | 3.2 a 4.2 | 3.2 a 4.2 | sí |
  | Magnesio | 2.2 a 2.6 | 2.2 a 2.6 | sí |
  | Sueño profundo % | 20 a 25 | 20 a 25 | sí |
  | Eficiencia del sueño | 85 | 85 a 100 | sí |
  | Ácido úrico | ≤ 5.5 | 3.5 a 5.5 (renal) | sí |
  | GGT | ≤ 30 | 10 a 25 (aceptable hasta 35) | no: cae entre óptimo y aceptable |
  | HOMA-IR | ≤ 1.5 | 0.1 a 1 (aceptable hasta 1.5) | no: usa el techo de aceptable |
  | Insulina | ≤ 5 | 2 a 6 | no: más estricto |
  | Vitamina D | 50 a 70 | 50 a 80 | casi |
  | Testosterona total | 600 a 900 ng/dL | 7 a 12 ng/mL (700 a 1200 ng/dL) | no |
  | Cortisol matutino | 10 a 20 | 10 a 15 (aceptable hasta 17) | no |
  | B12 | ≥ 500 | 600 a 900 | no |
  | Glucosa en ayuno | 80 a 90 | 70 a 85 | no |
  | HbA1c | ≤ 5.4 | 4.9 a 5.2 (aceptable hasta 5.6) | no |
  | ApoB | ≤ 80 | 50 a 99 | no: más estricto |
  | LDL | ≤ 100 | 80 a 120 | no |
  | Triglicéridos | ≤ 100 | 30 a 70 (aceptable hasta 100) | no: techo de aceptable |
  | HDL | ≥ 40 | 60 a 100 | no: más laxo |
  | TG/HDL | ≤ 2 | 0.1 a 1.8 (aceptable hasta 2) | no: techo de aceptable |
  | Homocisteína | ≤ 8 | 5 a 9 | no |
  | Prolactina | 3.5 a 19.4 | 3 a 10 | no: es el rango del laboratorio |

  Lectura: el clínico usa **tres fuentes de marca** según el marcador: la matriz, el
  rango del laboratorio, y un criterio propio por persona. El título de la sección lo
  dice literal: "Y quién puso esa marca". **La app tiene que modelar la fuente del
  objetivo como dato** (`matriz` / `laboratorio` / `clinico`), y cualquier objetivo de
  origen `clinico` necesita `FIRMA MARIANA` o al menos autoría registrada.
- Tipo: valor, riel y estado `CALC` + `TABLA`; objetivo `TABLA` nueva; comentario
  `EDITORIAL`; "Lo que falta por medir" `EDITORIAL` (es prescripción de estudios).

#### 06 Tu composición (`composicion`)
- Muestra: barra apilada de tres segmentos **Grasa · [kg]**, **Músculo · [kg]**,
  **Hueso, agua y órganos · [kg]** con porcentaje, pie "Tus [peso] kilos, repartidos".
  Tabla de seis filas: Peso (meta "recomposición"), % Grasa corporal (meta ≤ 20), %
  Músculo (meta ≥ 45), Grasa alrededor de los órganos (nivel, meta ≤ 7), Estatura (meta
  raya), Edad corporal según tu báscula (meta ≤ [cronológica − 2]). Cada fila con barra y
  color de estado.
- Datos: peso, estatura, % grasa, kg músculo, nivel visceral, edad metabólica de
  báscula.
- Lógica: `resto% = 100 − grasa% − músculo%`; kg = % × peso. Las anchuras de las barras
  de la tabla (58%, 80%, 55%, 72%) **no se reproducen con ninguna fórmula simple**;
  parecen puestas a mano. Las metas **no son las de la matriz** (grasa óptima V7 10 a
  14%, aceptable hasta 18.5%, riesgo hasta 24%; músculo óptimo 40 a 60%; visceral óptimo
  1 a 2, aceptable hasta 9). Son metas por persona.
- Tipo: barra y kg `CALC`; metas `EDITORIAL` con `FIRMA MARIANA`.

#### 07 Tu química cerebral (`braverman`)
- Muestra: intro "La tuya es Empuje [n] · Memoria y foco [n] · Ánimo tranquilo [n] ·
  Calma [n]. No es una lista, es una PROPORCIÓN". Dos cards de barras: **Tu naturaleza**
  (4 ejes, ordenados de mayor a menor, el primero con "· dominante") y **Tu desgaste de
  hoy** (4 ejes, el primero con "· principal"). Tres cards de lectura del desgaste
  (principal, secundarios, el menor). "Tus cuatro ejes, en corto": cuatro cards con
  título "[Eje] · tu motor / tu timón / tu remanso / tu ancla" y nivel `dom` / `medio` /
  `bajo`. Cierre: "Tu plan está hecho para tu fórmula exacta".
- Datos: `braverman_results.dominance_{dopamine,acetylcholine,serotonin,gaba}` y
  `deficiency_{...}`. El HTML deja los nombres técnicos en `title=`: Dopamina = Empuje y
  metas, Acetilcolina = Memoria y foco, Serotonina = Ánimo tranquilo, GABA = Calma y
  freno. Colores fijos por eje.
- Lógica: barra relativa al máximo de su card (`width = valor / max × 100`). Nivel
  `dom` para los empatados arriba, `bajo` para el mínimo, `medio` el resto.
- Tipo: `TABLA` + `CALC`; los textos por eje `EDITORIAL`.

#### 08 Tu genética (`genetica`)
- Muestra: seis categorías numeradas (hígado y cómo limpias · corazón · metabolismo ·
  digestión · cabeza y energía · cuerpo en movimiento y minerales), 22 hallazgos con
  titular en lenguaje llano y 1 a 3 párrafos, y un `<details>` "Lo que tu genética NO
  explica" (lo protegido, lo que sí es tuyo de nacimiento, el hilo que las une).
- Datos: un reporte de secuenciación completa (externo). Ninguna tabla de ATP.
- Tipo: `GEN`. Todo el contenido es interpretación de variantes: **cada frase es una
  afirmación clínica que requiere firma**.

#### 09 El mapa de cruces (`cruces`)
- Muestra: diagrama SVG "hilo" con una variable central ("ALCOHOL, 6 de 6 cruces") y los
  seis titulares alrededor, pie "Una sola variable aparece en [n] de tus [n] cruces. Por
  eso es la primera palanca". Seis `<article>` numerados: chips de fuente, titular,
  **hallazgo** (2 a 3 párrafos con los números que dispararon), **La regla** (qué hacer,
  con metas numéricas y en qué semana se mide), opcional **Lo que falta medir** (estudio
  + "Yo te preparo la orden. Tú vas. Lo leemos juntos"), `<details>` **Cómo lo sabemos**
  (lógica) con subtítulo **Con qué más cruza** (convergencia).
- Datos: labs, genética, Braverman, composición, contexto.
- Lógica: es exactamente `Cruce` de `lectura-core.ts` (`titular`, `fuentes`,
  `hallazgo`, `logica`, `convergencia`, `regla`, `bandera`). El "hilo" es un conteo: qué
  palanca aparece en más cruces. Las reglas de cruce del ejemplo son seis; el catálogo de
  la app trae diez, y solo dos coinciden en espíritu (insulina/grasa visceral y vitamina
  D/magnesio). Las otras cuatro dependen de genética o de un dato de consumo de alcohol
  cruzado con enzimas hepáticas y Braverman.
- Tipo: estructura `TABLA` (catálogo); prosa por persona `EDITORIAL`; reglas nuevas
  `FIRMA MARIANA`.

#### 10 Lo que falta cerrar (`medico`)
- Muestra: (a) tabla **Dentro del rango del laboratorio, fuera del tuyo**: marcador,
  valor, "Tu laboratorio dice: normal", "Nosotros decimos: [rango]"; (b) card **Los
  estudios que faltan** con `<details>` de cuatro estudios numerados y por qué; (c) card
  **Lo que tu genética dice de lo que tomas** con tres puntos (un mineral a evitar en
  dosis altas, vitaminas B en forma activa, antiácidos) y la línea fija "Nunca inicies ni
  suspendas un medicamento por tu cuenta".
- Datos: (a) marcadores con estado `sub`/`att` por criterio funcional cuyo valor cae
  dentro del rango de referencia del laboratorio (necesita el rango del laboratorio por
  valor); (b) prescripción de estudios; (c) genética + suplementos.
- Tipo: (a) `CALC` si se guarda el rango del laboratorio; (b) `EDITORIAL` y es acto
  clínico; (c) `GEN`.

#### 11 Lo que sigue (`cierre`)
- Muestra: "Tres palancas. Doce semanas." Tres cards numeradas (las mismas de la
  sección 03), nota de vigencia ("Levantamiento de [mes]. Lo genético no cambia; los
  marcadores de sangre sí pudieron moverse"), firma del equipo y el disclaimer "Este
  documento es una orientación de salud funcional. No es un diagnóstico médico ni
  sustituye a tu médico tratante".
- Tipo: `EDITORIAL` + plantilla. El disclaimer ya existe en la app
  (`ResultDisclaimerFooter`).

### 1.3 Modelo de datos inferido (lo que el generador tenía en la mano)

```ts
// Propuesta de tipo para src/services/dx/dx-v3-core.ts. Todo lo marcado ? es
// opcional porque la app puede no tener la fuente. Nada aquí es un umbral.
type DxEstado = 'atencion' | 'aceptable' | 'optimo';
type DxFuenteObjetivo = 'matriz' | 'laboratorio' | 'clinico';
type DxNivelEvidencia = 1 | 2 | 3 | 4;           // definición pendiente (pregunta 6)

interface DxMarcador {
  key: string;                                    // clave canónica de la matriz
  nombreLlano: string;                            // "Enzima del hígado (GGT)"
  valor: number; unidad: string | null; medidoEn: string;
  estimado: boolean;                              // "(ESTIMADO, no medido)"
  rango: { lo: number | null; hi: number | null } | null;   // el riel
  objetivo: number | null;                        // "Te queremos en"
  fuenteObjetivo: DxFuenteObjetivo;
  estado: DxEstado;
  nivelEvidencia?: DxNivelEvidencia;
  comentario: string[];                           // párrafos; EDITORIAL
}

interface DxSistema { key: DomainKey; nombre: string; score: number; porque: string; }

interface DxCruce {                               // = Cruce de lectura-core
  titular: string; fuentes: ('gen'|'lab'|'ctx'|'braverman'|'composicion')[];
  hallazgo: string[]; regla: string; faltaMedir?: string;
  logica: string; convergencia: string; palanca?: string;   // para el "hilo"
}

interface DxV3Document {
  version: 3; generadoEn: string; levantamientoEn: string;
  persona: { nombre: string; edadCron: number; sexo: Sex };
  edades: { sangre: number | null; vida: number | null; atp: number; sf: number | null;
            ritmoMeses: number | null; calidad: number; detalle: string[] };
  conteo: { medidos: number; adn: number; ejes: number;
            queMueven: { atencion: number; aceptable: number; optimo: number } };
  sistemas: DxSistema[];                          // ya ordenados
  palancas: [string, string, string] | null;      // EDITORIAL
  contexto: { parrafos: string[]; cita: string | null; antecedentes: string[] };
  grupos: { nombre: string; marcadores: DxMarcador[] }[];
  faltaMedir: { titulo: string; porque: string }[];
  composicion: { pesoKg; estaturaCm; grasaPct; musculoPct; restoPct; visceral;
                 edadBascula; metas: Record<string, string | null> } | null;
  quimica: { naturaleza: Record<Eje, number>; desgaste: Record<Eje, number>;
             lecturas: Record<string, string> } | null;
  genetica: null;                                 // no existe en ATP
  cruces: DxCruce[]; hilo: { palanca: string; n: number; de: number } | null;
  fueraDelLab: { key: string; valor: number; labDice: string; nosotros: string }[];
}
```

---

## 2. Mapa contra la app

Verificado contra el esquema real (`information_schema`) y el código. Conteos de la
base al 31-ago: `functional_dx` 7 filas (3 personas), `lab_values` 709 valores vivos (6
personas, claves ya canónicas de la matriz: `glucosa_en_ayuno`, `homair`, `t3_libre`…),
`health_measurements` 17 filas (3 personas), `user_master_quiz` 78 respuestas (1
persona), `braverman_results` completos 4 (3 personas), `functional_quiz_results` 4 (2
personas). Es decir: **hay una sola persona con cuestionario maestro y tres con
Braverman; el spec tiene que aguantar la app vacía.**

| Sección | Dato necesario | ¿Existe en ATP? | Dónde | Qué falta |
|---|---|---|---|---|
| Portada | edad cronológica, sexo | sí | `client_profiles.date_of_birth`, `biological_sex` | nada |
| Portada | Edad ATP y delta | sí | `computeEdadAtpV2()` → `edad_atp_calculations.edad_integral`; `formatEdadDeltaValue` | decidir motor (P1) |
| 01 | conteo de valores medidos | sí | `loadAllParamValues()` (dict de hasta 138) + `lab_values` sin banda | definir qué cuenta como "medido" (¿solo con banda?) |
| 01 | hallazgos ADN | **no** | ninguna tabla | todo |
| 01 | 8 ejes Braverman | sí | `braverman_results.dominance_*`, `deficiency_*` | nada |
| 01 | "los que mueven tu caso" (subconjunto) | no | (era criterio del clínico) | regla (P4) |
| 01 | ritmo de envejecimiento | en código, no en producción | `computeAlgoritmoExcelFromComponents`; columna `edad_atp_calculations.ritmo_envejecimiento` existe pero el insert de producción no la manda | correr la tubería Excel o persistirla (P1) |
| 01 | calidad del estudio | sí | `ce_integral` (persistido) y `computeCE()` | nada |
| 02 | Tu sangre (PhenoAge) | en código | `phenoage-service.ts`, `bridgeToPhenoAge`; columna `phenoage` existe, no se llena | P1 |
| 02 | Tu vida (G36) | en código | `edad_biologica_con_ajuste` dentro de `computeAlgoritmoExcel` | no se persiste; P1 |
| 02 | Tu edad ATP (G37 / integral) | sí, pero de otro motor | motor v2 en producción | P1 |
| 02 | SF global | en código | `computeSFGlobalReal` | P1 |
| 02 | detalle en prosa | no | | EDITORIAL (P2) |
| 03 | score por sistema | en código, 4 de 10 en producción | `scoreDomain()` vía `sub-edad-*-service` | extender a 10; ninguna firma |
| 03 | "por qué" por sistema | no | | EDITORIAL (P2) |
| 03 | tres palancas | parcial | Mi lectura ordena cruces por `peso × fuerza` | EDITORIAL o derivar de cruces |
| 04 | contexto de vida | sí, escaso | `client_profiles.occupation`, `stress_level`, `primary_goal`; `user_master_quiz` D11 (estrés, turnos, horas/sem), D5.3 (bebidas/sem), D6 (fármacos), D9 (antecedentes), B.2 (dolor mayor, texto libre) | narrativa; viajes/año no se pregunta |
| 04 | cita de la persona | sí | `user_master_quiz` B.2 / B.7 | nada |
| 05 | valor y fecha por marcador | sí | `lab_values` (último por clave, `is_voided`) | nada |
| 05 | rango funcional | sí | matriz V7/V6, `functionalBand()` | 10 casos pendientes de firma ya documentados (`MATRIZ_V7_V6_10_PENDIENTES_PARA_FIRMA.md`) |
| 05 | rango del laboratorio | parcial | `lab_revision.confirmado_fuera_de_rango`, `lab_values.metadata` (verificar si el parser guarda el rango) | guardar `ref_lo/ref_hi` por valor |
| 05 | objetivo por persona y su autor | **no** | | tabla nueva `dx_targets` (P3, firma) |
| 05 | estado tres colores | sí | `estadoDeParametro()`; `ficha-biomarcador-core` | nada |
| 05 | nombre llano | sí | `getLabParamMeta()`, `biomarcador-contenido.ts` | revisar que cubra las 28 claves |
| 05 | comentario por marcador | parcial | `biomarcador-contenido.ts` (bloques por dónde cayó el valor, genéricos) | personalización EDITORIAL |
| 05 | flag estimado vs medido | parcial | `lab_values.source`, `health_measurements.source`, `edad_atp_questionnaire_responses` (todo lo de "Forms/Entrevista" es estimado por definición) | semántica explícita `estimado: boolean` |
| 05 | sueño profundo %, eficiencia | parcial | `sleep_nights` (Sleep Cycle: duración, score, ronquido) no trae fases; matriz espera `sueno_deep`, `eficiencia_del_sueno` de wearable | fuente de fases o dejar raya |
| 05 | glucosa continua (CGM) | parcial | `glucose_logs` (puntual, manual); matriz espera `tiempo_en_rango_saludable_65150_cgm`, `glucosa_media_cgm` | sin CGM se deja raya |
| 05 | "lo que falta por medir" | parcial | `bandera` de cada cruce en Mi lectura; `labs-guide` | prescripción EDITORIAL |
| 06 | peso, estatura, % grasa, músculo, visceral | sí | `health_measurements` (`muscle_mass_kg`, no %; convertir con peso) | nada |
| 06 | edad corporal de báscula | sí | `client_profiles.metabolic_age_impedance`, `edad_atp_body_composition` | nada |
| 06 | metas | no | matriz tiene bandas, no metas | `FIRMA MARIANA` o mostrar la banda óptima de la matriz como "rango ATP" |
| 07 | 8 ejes | sí | `braverman_results` | nada |
| 07 | lecturas por eje | parcial | contenido del Braverman premium (`braverman-premium-service`) | revisar si hay texto por eje reutilizable; lo personalizado es EDITORIAL |
| 08 | genética | **no** | | tabla, parser y vocabulario; TODO requiere firma |
| 09 | cruces | sí | `lectura-core.ts` (10 reglas), `app/salud/mi-lectura` | reglas nuevas (firma), campo `palanca`, hilo |
| 09 | chips de fuente | sí | `FuenteTag` (labs, cuerpo, quimica, historia, reloj, ciclo) | mapear a gen/lab/ctx; "gen" no aplica |
| 10 | dentro del lab, fuera del tuyo | parcial | ver rango del laboratorio arriba | `ref_lo/ref_hi` |
| 10 | estudios que faltan | no como dato | | EDITORIAL, acto clínico |
| 10 | genética y suplementos | no | `user_supplements` existe; genética no | GEN |
| 11 | palancas, firma, disclaimer | sí/parcial | `ResultDisclaimerFooter`; palancas = 03 | nada nuevo |
| Doc | persistencia versionada | sí, otro shape | `functional_dx` (roots + summary + snapshot, RPC `create_dx_version`) | columna `document_v3 JSONB` o tabla nueva |
| Doc | exportar PDF/HTML | sí | `dx-html.ts`, `dx-pdf-service.ts` | plantilla nueva |

Nota sobre `211_functional_score`: esa migración es el ATP Functional Score de
**suplementos** (`user_supplements.functional_score`), no tiene que ver con el
diagnóstico. Se revisó y se descarta.

---

## 3. Tres cubetas

### 3.1 Se construye con lo que hay (sin datos nuevos, sin firma)

- Portada con edad cronológica, Edad ATP del motor que esté en producción y delta.
- 01: conteo de valores medidos (parámetros con valor en el dict de 138 + labs sin
  banda), 8 ejes si hay Braverman, barra ▲◆● con **todos** los marcadores con banda
  (mientras no haya regla de subconjunto), calidad del estudio (CE). Ritmo solo si se
  decide correr la tubería Excel (cubeta 3.2).
- 03: los diez sistemas con `scoreDomain()`, ordenados, con barra y score. Sin "por
  qué" (o con un "por qué" determinista: "Lo que más pesa aquí: [dos parámetros peor
  puntuados con su estado]", que es dato, no juicio).
- 05: agrupación por dominio de la matriz, riel con la banda óptima como rango y estado
  de `estadoDeParametro()`. "Te queremos en" solo cuando `fuenteObjetivo = 'matriz'`
  (= piso o techo de la banda óptima según dirección). Comentario genérico de
  `biomarcador-contenido.ts` (ya existe por bloque). Etiqueta "estimado" para lo que
  venga de cuestionario. Enlace a la ficha existente.
- 06: barra de tres segmentos y tabla con valor y **banda óptima de la matriz como
  referencia**, sin "meta". Edad corporal de báscula si existe.
- 07: naturaleza y desgaste con los cuatro nombres llanos, dominante y principal por
  ranking. Lecturas genéricas por eje si el Braverman premium ya las tiene.
- 09: Mi lectura embebido o enlazado (los cruces que disparen con las 10 reglas
  actuales) y el "hilo" solo si se etiqueta `palanca` en las reglas existentes (es
  metadato, no umbral; pero la etiqueta la debe validar Mariana porque afirma causa).
- 10: (a) marcadores en `aceptable`/`atencion` cuyo `lab_revision.confirmado_fuera_de_rango`
  sea falso, si el dato existe; si no, se oculta. (b) banderas de los cruces como "lo
  que conviene revisar con un profesional" (copy ya validado en `lectura-core`).
- 11: top 3 cruces por impacto como "por dónde empezar" (no "palancas" con metas
  numéricas), disclaimer existente.
- Estados vacíos por sección (ver 4.2).

### 3.2 Necesita datos o core nuevo (sin firma clínica, pero con decisión de Enrique)

- **Tubería Excel en producción** para `phenoage`, G36, G37, `sf_score`, `ritmo`, y
  persistirlos en `edad_atp_calculations` (las columnas ya existen). Decisión P1.
- Tabla `dx_targets (user_id, param_key, objetivo, rango_lo, rango_hi, fuente, autor,
  nota, created_at)` append-only, RLS dueño + coach. Sin firma el campo `fuente` solo
  puede ser `matriz` o `laboratorio`.
- Rango del laboratorio por valor: `lab_values.metadata.ref_lo/ref_hi` (verificar qué
  guarda hoy el parser; si no lo guarda, ampliar `lab-parser-process`).
- Flag `estimado` explícito en el dict de parámetros (`load-all-params` sabe la fuente
  de cada uno: `Forms/Entrevista` = estimado, `Laboratorio`/`Wearable`/`Tests` = medido).
- Campo `palanca` en `ReglaCruce` y el conteo del hilo.
- `DxV3Document` persistido y versionado: columna `functional_dx.document_v3 JSONB`
  (migración 312, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) y ampliar el RPC
  `create_dx_version` con un parámetro opcional; o tabla nueva `dx_v3_documents`. Se
  prefiere la columna: reutiliza versionado, RLS y la Card A.
- Generación de prosa: si es ARGOS, un `dx-v3-prompt.ts` con salida JSON estricta y
  **vocabulario cerrado** (nunca metas numéricas, nunca estudios a pedir, nunca
  "reduce/previene/revierte"); si es el clínico, una pantalla de edición no cabe en
  una noche y es otro spec.
- Export: plantilla HTML nueva en `dx-html.ts` con la misma anatomía (sin fotos base64:
  16 MB de tope y 1.5 MB de fotos no caben en un correo).
- Contexto de vida: preguntas que faltan en el cuestionario maestro (días de viaje al
  año, horas de pantalla al día si no viene de D10, veces de entrenamiento por semana
  si no viene de `client_profiles.exercise_frequency`).

### 3.3 Necesita firma de Mariana (umbral, rango o causa)

- Los objetivos por marcador de origen `clinico` (tabla arriba: GGT ≤ 30, insulina ≤ 5,
  ApoB ≤ 80, LDL ≤ 100, HDL ≥ 40, cortisol 10 a 20, B12 ≥ 500, glucosa 80 a 90, HbA1c
  ≤ 5.4, testosterona 600 a 900 ng/dL, homocisteína ≤ 8). O se firman como "objetivo
  ATP" (tercera columna de la matriz) o se quedan como criterio por persona con autor.
- Metas de composición: grasa ≤ 20%, músculo ≥ 45%, visceral ≤ 7, edad corporal ≤
  cronológica − 2. Ninguna está en la matriz.
- Cortes de color de los sistemas (< 50 / 50 a 69 / ≥ 70). Es presentación, pero
  decide qué se pinta en rojo; va con firma o con decisión escrita de Enrique.
- La escalera de evidencia Nivel 1 a 4 y qué marcador cae en cuál.
- Las reglas de cruce nuevas que el ejemplo usa: hígado + alcohol + Braverman;
  acelerador/freno (GABA bajo + alcohol como freno prestado); insulina alta adquirida
  (HOMA + visceral + glucosa normal); reflujo/lactosa (genética: no procede); vitamina D
  y magnesio como "fuga" (ya existe parcial). Cada una afirma causalidad.
- Todo "lo que falta por medir" como lógica automática (p. ej. "tres enzimas hepáticas
  altas → ultrasonido y panel de hepatitis"; "sueño no reparador + peso → apnea"): es
  prescripción de estudios. Sin firma, la app solo dice "esto conviene revisarlo con
  un profesional" (copy de `bandera` ya validado).
- Genética entera.
- Las frases "se revierte", "baja rápido", "se nota en 4 a 8 semanas", "mejora tu
  testosterona": prohibidas en copy de la app sin firma. El generador de prosa, sea
  quien sea, tiene lista negra.

---

## 4. Propuesta de pantalla `app/salud/diagnostico/`

### 4.1 Decisión de estructura

Una sola ruta `app/salud/diagnostico/index.tsx` con scroll largo por secciones (mismo
patrón de "capítulos" que el HTML), con una barra de capítulos pegajosa arriba
(chips horizontales que hacen scroll a la sección). No pestañas: el documento se lee de
corrido y el orden es el argumento. Cada sección es un componente en
`src/components/dx/` (`DxPortada`, `DxConteo`, `DxEdades`, `DxSistemas`, `DxContexto`,
`DxMarcadores`, `DxComposicion`, `DxQuimica`, `DxCruces`, `DxFaltaCerrar`, `DxCierre`)
que recibe su trozo de `DxV3Document` y un `estado: 'ok' | 'vacio' | 'error'`.

La pantalla vieja (nivel de detalle 1-5, raíces ARGOS, historial, PDF) no se borra la
primera noche: la portada nueva absorbe el nivel de detalle como "Calidad de tu
estudio" y el CTA de generar/actualizar; las raíces y el enlace a Mi Protocolo bajan a
una sección "Lo que alimenta tu protocolo" antes del cierre, hasta que Enrique decida
(pregunta 7).

### 4.2 Orden, qué se ve sin datos, qué se oculta

| # | Sección | Se muestra si | Estado vacío (copy) | Se oculta si |
|---|---|---|---|---|
| 0 | Portada | siempre | Sin perfil: "Para leer tu cuerpo necesitamos tu fecha de nacimiento y tu sexo biológico. Están en tu perfil." Con perfil y sin Edad ATP: "Tu edad ATP se calcula cuando tengas al menos un laboratorio o tu composición corporal." | nunca |
| 1 | Dónde estás | siempre | Conteo en cero: "Todavía no medimos nada. Cada dato que subas aparece aquí con nombre, valor y el lugar donde lo queremos." | nunca |
| 2 | Tus edades | hay PhenoAge o G36 | "Tu sangre y tu vida se leen por separado cuando subas tu laboratorio (nueve marcadores de sangre) y tu composición corporal." | no hay ni labs ni composición: se muestra el vacío, no se oculta, porque es el corazón del documento |
| 3 | Tus diez sistemas | ≥ 1 dominio con CE > 0 | Por sistema sin datos: fila con raya y "Se llena con [fuente principal del dominio]" (labs / composición / cuestionario / reloj). | nunca: los diez siempre se listan, los vacíos al final |
| 4 | Quién eres | hay cuestionario maestro o perfil con ocupación/objetivo | "Esto se llena con tu cuestionario. Toma diez minutos y cambia cómo leemos todo lo demás." con CTA | nunca |
| 5 | Marcador por marcador | ≥ 1 lab | "Esto se llena cuando subas tu laboratorio. Cada valor aparece con el lugar donde lo queremos y quién puso esa marca." con CTA a `/labs-guide` | nunca |
| 6 | Tu composición | hay peso y % grasa | "Tu composición se llena con una báscula de bioimpedancia o con tu última medición en Mis datos." | nunca |
| 7 | Tu química cerebral | Braverman completo | "Tu fórmula propia sale del test Braverman. Son 313 preguntas, se contesta en dos ratos." con CTA | nunca |
| 8 | Tu genética | nunca en v1 | (sección omitida; una línea en "Lo que falta cerrar": "Genética: todavía no la leemos en la app.") | siempre en v1 |
| 9 | Las conexiones | ≥ 1 cruce disparado | Reusa los tres estados honestos de Mi lectura: sin material / con material y sin cruces / con cruces | nunca |
| 10 | Lo que falta cerrar | siempre | Lista de fuentes faltantes (reusa `computeDxQuality().missing` con sus rutas) + banderas de cruces | nunca |
| 11 | Por dónde empezar | ≥ 1 cruce | "Cuando haya lecturas, aquí van las tres que más mueven." | nunca |

Reglas de la casa que aplican: cargando / vacío real / "no se pudo leer" con reintentar
(uno por sección, porque las fuentes cargan por separado con `Promise.allSettled`; no
confundir "no pude leer labs" con "no tienes labs"); tema claro y oscuro con tokens;
estados de color `t.critico` / `t.advertencia` / `t.exito`, nunca `sinDatos` como tinta;
iconos por `AppIcon`; cero em dashes; el glifo `'—'` solo como raya de sin dato.

### 4.3 Copy de ejemplo (español de México, sin promesas)

- Portada: "Tienes [edad] años. Tu cuerpo funciona como uno de [edad ATP]. Esa
  diferencia es lo primero que vamos a mirar." (Nunca "se baja rápido".)
- Conteo: "Medimos [N] cosas de tu cuerpo. [k] piden acción hoy." Subtítulo: "No te
  damos una calificación del 1 al 100. Cada dato tiene nombre, valor y un lugar donde lo
  queremos."
- Calidad: "Calidad de tu estudio: [q] de 100. No es tu salud: es cuánta información
  tenemos para leerla."
- Edades: "Tu sangre dice una cosa. Tu vida dice otra. El número que usamos está en
  medio." Cards: "Tu sangre: nueve marcadores que miden envejecimiento. Solo ven
  química." / "Tu vida: tus diez sistemas, tu composición, tus pruebas y tus hábitos." /
  "Tu edad ATP: las dos, combinadas con nuestra fórmula."
- Sistemas: "Ordenados de peor a mejor. Ese es el orden en el que vamos a trabajar, no
  un ranking para asustarte."
- Marcadores: "Toca un renglón para abrirlo. El bloque iluminado es el rango donde lo
  queremos y el triángulo eres tú. Cuando la marca la puso ATP y no tu laboratorio, lo
  decimos."
- Objetivo de matriz: "Rango ATP: [lo] a [hi]." Objetivo de laboratorio: "Rango de tu
  laboratorio: [lo] a [hi]." Objetivo del clínico: "Objetivo de tu equipo: [x].
  Firmado por [autor]."
- Estimado: "Este valor es una estimación a partir de tus respuestas, no una
  medición directa."
- Composición: "De qué está hecho tu peso. La báscula te da el total; esto te dice
  cómo se reparte."
- Química: "Tu cabeza no es un promedio. Viene con una fórmula propia." / "Tu
  naturaleza: con qué vienes de fábrica. No se cambia ni se busca cambiar." / "Tu
  desgaste de hoy: cuánto se te ha gastado cada eje. Esto sí se mueve."
- Cruces: "No pagas por [N] datos. Pagas por las conexiones entre ellos."
- Falta cerrar: "Lo que todavía no medimos y cómo lo cerramos." Bandera: "Esto conviene
  revisarlo con tu médico. Aquí no se diagnostica."
- Cierre: "Por dónde empezar. De todo lo que leíste, esto es lo que más mueve."
- Prohibidos sin firma: reduce, previene, revierte, cura, baja rápido, se nota en N
  semanas, mejora tu [hormona], "tu genética dice".

---

## 5. Plan de implementación en noches

**Noche A · solo reordenar datos existentes (sin migración, sin firma).**
1. `src/services/dx/dx-v3-core.ts` (puro, con test ejecutado en node): arma
   `DxV3Document` desde `{ perfil, paramValues, labs canónicos, composición,
   braverman, edadCalc, cruces de lectura-core, quality }`. Incluye: conteo, diez
   sistemas con `scoreDomain`, grupos de marcadores por dominio con
   `estadoDeParametro`, riel (función pura de geometría, la de 1.2), composición con
   resto = 100 − grasa − músculo, química con ranking, top 3 cruces.
2. `src/services/dx/dx-v3-service.ts`: cosecha con `Promise.allSettled` reutilizando
   `loadAllParamValues`, `loadCanonicalLabValues`, el snapshot de Mi lectura y
   `computeEdadAtpV2`. Devuelve por fuente `ok | vacio | error`.
3. `src/components/dx/*` y la pantalla nueva con las 11 secciones, estados vacíos de
   4.2, tema claro/oscuro. La pantalla vieja queda accesible bajo la sección "Lo que
   alimenta tu protocolo" (nivel, raíces, PDF, CTA generar).
4. `node /tmp/verifica.js` sobre cada archivo; test del core con
   `ts.transpileModule` y aserciones sobre: riel de dos lados, riel de un lado, estado
   por matriz, orden de sistemas, conteo con app vacía (todo en cero, nada explota).

**Noche B · core nuevo (una migración, decisiones de Enrique ya tomadas).**
1. Según P1: correr la tubería Excel para las tres edades y persistir `phenoage`,
   `ritmo_envejecimiento`, `sf_score`, `algoritmo_excel` en `edad_atp_calculations`
   (columnas existentes; no se pisa ninguna fila anterior: es insert nuevo por
   cálculo). Sección 02 pasa de vacío a real.
2. Migración 312: `functional_dx.document_v3 JSONB` + `create_dx_version` con
   parámetro opcional `p_document_v3`. Idempotente. Enrique hace `db push`.
3. `dx_targets` (migración 313) solo con `fuente in ('matriz','laboratorio')` hasta que
   haya firma; `ref_lo/ref_hi` del laboratorio en `lab_values.metadata` desde el parser.
4. Campo `palanca` y hilo en `lectura-core` (con test), chips de fuente mapeados.
5. Export HTML/PDF con la anatomía nueva desde `DxV3Document`.
6. Si P2 = ARGOS: `dx-v3-prompt.ts` con salida JSON estricta y lista negra; parseo
   defensivo en el core (patrón `parseArgosDxResponse`). Si P2 = clínico: spec aparte
   para el editor.

**Noche C · lo que requiere a Mariana (después de la firma, no antes).**
1. Cargar objetivos `clinico` firmados a `dx_targets` con autor y fecha.
2. Metas de composición y cortes de color de sistemas como constantes con cita.
3. Reglas de cruce nuevas en el catálogo con `bandera` donde toque.
4. Escalera de evidencia 1 a 4 como campo por marcador.
5. Genética: fuera de alcance hasta que exista fuente y vocabulario firmado.

---

## 6. Preguntas para Enrique (solo las que bloquean)

1. **Motor.** Los tres números del ejemplo salen de la tubería Excel V7 (PhenoAge + SF
   + ritmo + mezcla 75/25). La app en producción muestra la Edad ATP del motor v2, que
   da otro número. ¿El DX v3 en la app usa la tubería Excel, y entonces la Edad ATP de
   toda la app cambia a ese motor, o el DX v3 se adapta al motor v2 y la sección "Tus
   edades" se rediseña (no hay "sangre vs vida" en v2)? No puedo mostrar dos edades ATP
   distintas en dos pantallas.
2. **Quién escribe la prosa por persona** ("por qué" de cada sistema, comentario por
   marcador, narrativa de cruces, tres palancas): ¿tú/Mariana en un editor, ARGOS con
   vocabulario cerrado, o plantillas deterministas? Cambia toda la noche B.
3. **Objetivos que no son de la matriz** ("Te queremos en X"): ¿son por persona (y
   entonces necesitan autor y firma en una tabla), o quieres una tercera columna
   "objetivo ATP" firmada en la matriz para todos?
4. **"Los N que mueven tu caso"**: ¿hay regla (todos los que tienen banda y no están en
   óptimo, más los óptimos que importan) o los eliges a mano? Sin regla, la app muestra
   todos los que tienen banda.
5. **Genética**: ¿se sube el reporte como PDF de contexto para ARGOS, o se omite la
   sección hasta tener tabla y vocabulario firmado? Propongo omitir en v1.
6. **Niveles de evidencia** `[Nivel 2/3/4]`: ¿cuál es la definición exacta de los cuatro
   peldaños y quién los asigna?
7. **Pantalla vieja**: ¿se reemplaza completa (nivel de detalle, raíces ARGOS, historial
   de versiones, PDF) o convive? Las raíces alimentan Mi Protocolo, así que no se pueden
   tirar sin tocar intervenciones.
8. **Datos estimados** (sueño profundo y eficiencia "a partir de tus respuestas"): ¿de
   qué fórmula salen? Sin fórmula firmada, la app pinta raya y dice "esto se mide con
   reloj o anillo".

---

## Anexo A · Lo que el HTML NO trae y hay que asumir

- No trae unidades en la mayoría de los marcadores (solo en testosterona y en los
  porcentajes). La app las tiene en la matriz y en `lab_values.unit`; se muestran
  siempre.
- No trae fecha por marcador; dice una sola fecha de levantamiento. La app tiene
  `measured_at` por valor y debe pintar "vencido" (> 1 año) como ya hace la ficha.
- No trae el rango del laboratorio salvo en dos filas de la tabla final.
- No trae fórmula para las anchuras de la tabla de composición ni para la selección
  de los "28".
- No distingue Braverman de genética en los chips (los dos usan la clase `gen`).

## Anexo B · Archivos de la app que este spec toca o reutiliza

- `app/salud/diagnostico/index.tsx` (pantalla vieja, Card A).
- `app/salud/mi-lectura/index.tsx`, `src/services/salud/lectura-core.ts` (cruces).
- `app/edad-atp/lab/[key].tsx`, `src/services/salud/ficha-biomarcador-core.ts`,
  `src/constants/biomarcador-contenido.ts` (ficha y riel).
- `src/services/edad-atp/{algoritmo-excel-service, phenoage-service, sf-9band-service,
  sf-service, load-all-params, edad-atp-v2-service, motor-v2-service}.ts` (edades y
  sistemas).
- `src/services/edad-atp/labs-premium-core.ts` (`estadoDeParametro`).
- `src/constants/edad-atp-matriz-v7-v6.ts`, `edad-atp-matriz-lookup.ts`,
  `edad-atp-v2-model.ts` (bandas, pesos, y el bloque "SIGUE ABIERTO" que ya documenta
  el problema del motor).
- `src/services/dx/{dx-quality-core, dx-engine-core, dx-engine, dx-service, dx-html,
  dx-pdf-service, dx-prompt}.ts` (nivel de calidad, versionado, export).
- `supabase/migrations/170_functional_dx.sql`, `195_create_dx_version_rpc.sql`.
- `R and D/MATRIZ_V7_V6_10_PENDIENTES_PARA_FIRMA.md` y `ATP_Firma_clinica_Mariana`
  (lo que ya está esperando firma y de lo que este spec depende).
