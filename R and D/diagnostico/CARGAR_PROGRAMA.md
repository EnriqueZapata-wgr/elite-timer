# Cargar un programa (nivel 2): guía para el coach

Fecha: 8 de octubre de 2026. Complementa a `CARGAR_ELITE.md` (la carga Elite, que sigue igual) y a `ESQUEMA_ELITE_V3.md` (qué es el documento). Todo se hace desde Git Bash en la raíz del repo, con la cuenta de admin de Enrique.

## Qué es un programa

Es el mismo documento de la evaluación Elite (`elite_v3`) con una línea más: `"tipo": "programa"`. Lleva el plan completo (alimentación, suplementos, entrenamiento con rutinas, tres palancas y, si quieres, prácticas asignadas) y una evaluación ligera: las secciones de la evaluación (edades, marcadores, composición, química cerebral, genética, cruces) pueden ir vacías. Lo que llenes se le muestra al cliente; lo que dejes vacío no aparece.

El cliente de un programa usa la misma app que el de Elite (HOY, MI PROGRAMA, ARGOS, PROGRESO, TÚ) con dos diferencias: nunca lee la palabra "Elite" y no ve secciones vacías. Si en alguna pantalla de un cliente de programa ves "Elite", es un error de la app: avísale al equipo.

Requisitos que se cumplen una sola vez: los mismos de `CARGAR_ELITE.md` (migraciones 314, 315, 318, 321, 323, 324 y 325) y, para las prácticas, la 329. Sin la 329 la carga funciona igual; solo las prácticas se quedan sin asignar y el paso 5 te lo dice. El cliente necesita la versión de la app que ya trae el nivel 2: una versión anterior no sabe leer un programa sin fecha de toma y le diría que no se pudo leer.

## Los siete pasos

### 1. Escribir el documento

Parte de la plantilla `R and D/diagnostico/programa_ejemplo.json` (una clienta inventada, Ana Ejemplo, sin datos reales de nadie). Copia el archivo, por ejemplo a `clientes/ana_programa_v1.json`, y cambia lo de tu cliente. Lo que importa de un programa:

- `"tipo": "programa"`. Sin esta línea el documento es una evaluación Elite y se le exige todo lo de Elite. Se escribe así, en minúsculas; cualquier otro valor no valida.
- `version`: el número de documentos previos de ese cliente más 1 (el primero es `1`). Cuentan los programas y las evaluaciones Elite juntos: si el cliente pasa de programa a Elite, la evaluación Elite es la siguiente versión.
- `cliente`: `nombre_preferido`, `sexo` (`male` o `female`, el que el cliente declaró; nunca se supone), `edad`. `fecha_toma` va en `null` si no hubo toma de sangre. Si sí hubo, pon la fecha con día (`2026-09-20`): es con la que los laboratorios entran a su expediente. Los datos de perfil (`fecha_nacimiento`, `estatura_cm`, `peso_kg`, `nivel_fitness`, `fc_reposo`) son opcionales y la carga solo los siembra donde el cliente no tiene los suyos.
- `inicio.programa_nombre`: cómo se llama su programa ("Fuerza y sueño"). Una línea, hasta 60 caracteres, y no puede decir "Elite". Es el título que el cliente ve. Sin nombre, la app dice "Mi programa completo".
- `inicio.programa_inicio`: el día en que arranca, `YYYY-MM-DD`. Manda sobre la fecha de carga: si cargas el jueves un programa que empieza el lunes, el cliente ve que su programa está por empezar y el lunes amanece en la semana 1, día 1. Sin esta fecha, la semana 1 empieza el día de la primera carga.
- `inicio.programa_semanas`: la duración (12, por ejemplo). Sin ella la app cuenta 52 semanas.
- Las 15 secciones tienen que existir aunque vayan vacías (así las leen también las versiones anteriores de la app). Vacía quiere decir: números en `null`, listas en `[]`, textos en `null`. La plantilla trae todas vacías en la forma correcta; si no vas a llenar una, déjala como está.
- `cierre.palancas`: exactamente tres, con `titulo`, `por_que` y `como`.
- El plan: `alimentacion` (con `metas` y `comidas` si las tienes), `suplementos` (con dosis y momento; si no fijas dosis, `null`) y `entrenamiento` (con `rutinas` y el `slug` del catálogo de ejercicios para que corran con clip; ver `CARGAR_ELITE.md`, paso 1). Los suplementos, dosis y rutinas de la plantilla son de ejemplo para mostrar el formato, no una recomendación.
- `practicas` (opcional, también vale en Elite): hasta 12, sin repetir. Cada una es `{ "key": "respiracion_478", "hora": "22:15", "nota": "Ya en la cama, cuatro ciclos." }`. `key` es la clave exacta del catálogo de prácticas (`src/constants/interventions-catalog.ts`, campo `key`); `hora` es reloj de 24 horas (`07:30`, no `7:30`) o `null` si no tiene hora fija; `nota` es tu indicación corta para ese cliente (hasta 200 caracteres) o `null`.

El candado de texto es el mismo de Elite: ningún texto lleva raya larga ni las palabras que el informe legal prohíbe (la lista está en `ESQUEMA_ELITE_V3.md`, "Lo que el validador hace cumplir", punto 5). El script te dice la ruta exacta de lo que hay que cambiar.

### 2. Preparar el payload

```bash
node scripts/elite/preparar-payload.js clientes/ana_programa_v1.json <user_id>
```

Es el mismo script de Elite. Valida el documento con el validador de la app, revisa que cada práctica exista en el catálogo y escribe `clientes/ana_programa_v1.payload.json`. Salida real con la plantilla:

```
Payload listo para elite_cargar_evaluacion
  tipo:                 programa (nivel 2): "Fuerza y sueño"
  cliente:              Ana Ejemplo (female, 34 anios, sin toma de sangre)
  user_id destino:      00000000-0000-4000-8000-000000000001
  version elite_v3:     1  (debe ser: documentos previos de este cliente, programa o Elite, + 1; el primero es 1)
  duracion e inicio:    12 semanas, empieza el 2026-10-12
  secciones:            15 de 15
  evaluacion:           sin contenido (lo esperado en un programa: el cliente no ve secciones vacias)
  suplementos (filas):  3
  practicas asignadas:  5 (hidratacion_matutina 07:00, exposicion_solar_matutina 07:30, caminata_postprandial, pantallas_off_60min 21:30, respiracion_478 22:15)
  resumen_argos:        653 caracteres (tope 1800)
  quality_level:        4 (sin genetica)
  perfil (325):         faltan fc_reposo
  rutinas (325):        2 (5 ejercicios, 5 con slug del catalogo; 2 con dias de la semana)
  comidas (325):        3
  html incluido:        no
  archivo:              clientes/ana_programa_v1.payload.json (10.7 KB)
```

Si una práctica no existe en el catálogo, el script se detiene, no escribe nada y te sugiere las más parecidas:

```
El documento asigna 1 practica(s) que no existen en el catalogo. No se escribio ningun payload.
  - practicas[0].key "respiracion_4_7_8" no existe en el catalogo. Las mas parecidas: respiracion_478 (Respiración 4-7-8 pre-sueño); ...
```

Debajo pueden salir avisos que no detienen nada pero conviene leer: programa sin nombre, sin día de inicio o sin duración; un día de inicio que cae muy lejos (revisa el año); un programa sin prácticas; marcadores con valor y sin `fecha_toma` (se leen en el documento pero no entran al expediente de laboratorios, porque la fecha de la muestra no se inventa); la palabra "Elite" en algún texto del documento, con su ruta; y prácticas que el catálogo marca como pendientes de validación del equipo.

### 3. Obtener tu JWT

Igual que en Elite: `scripts/elite/obtener-jwt.md`. Dura 1 hora y vive solo en la variable `ATP_JWT` de tu terminal. Nunca lo pegues en un chat, un correo ni un archivo del repo.

### 4. Generar el código

El código de un programa es de nivel premium, con `codigos.js`:

```bash
node scripts/elite/codigos.js generar --correo correo@del.cliente --dias 365 --tier premium
```

(`curl-elite.sh codigo` emite códigos de nivel Elite; para un programa usa este.) Mándale el código al cliente y dile dónde va: en la app, Ajustes > Membresía > "Tengo un código de activación". La app reconoce que es un programa por el documento, no por el código.

### 5. Cargar

```bash
bash scripts/elite/curl-elite.sh cargar clientes/ana_programa_v1.payload.json
```

Hace lo mismo que con una evaluación Elite (`elite_cargar_completa`, y después la siembra de perfil, rutinas y comidas de la 325) y al final asigna las prácticas con `elite_cargar_practicas` (329): enciende las del documento y las marca como asignadas por ti, no revive las que el cliente pausó o descartó, y pone en pausa las que tú habías asignado y ya no vienen en esta versión.

La respuesta arranca con `Programa cargado (esta respuesta es la verificacion oficial)` y el `dx_id`. Guárdala. Un aviso `sin_raices` de la carga es lo esperado en un programa sin evaluación.

Si la 329 todavía no está en la base, verás:

```
  NOTA: la funcion elite_cargar_practicas todavia no existe en la base: la migracion 329 esta pendiente.
  Este documento asigna 5 practica(s) y NO se asignaron. Todo lo demas si quedo cargado.
```

La carga no falla por eso. Cuando la 329 esté empujada, corre solo ese paso:

```bash
bash scripts/elite/curl-elite.sh practicas <user_id>
```

### 6. Verificar

```bash
bash scripts/elite/curl-elite.sh ver <user_id>
```

Lista los documentos del cliente (programas y evaluaciones Elite juntos). Las mismas notas de `CARGAR_ELITE.md`, paso 6: la verificación oficial es la respuesta del paso 5.

### 7. Recargar con una versión nueva

Nunca se edita un documento cargado. Para cambiar algo (otra rutina, otro suplemento, otra práctica, otro nombre, otra fecha de inicio) copia el JSON, sube `version` en 1, haz el cambio y repite los pasos 2 y 5. Qué pasa al recargar:

- El cliente ve la versión nueva; las anteriores quedan guardadas.
- Prácticas: las nuevas se encienden; las que quitaste y él tenía activas pasan a pausa; las que él pausó no se reviven.
- Suplementos, rutinas y plan de comida: igual que en Elite (`CARGAR_ELITE.md`).
- Día de inicio: manda el de la versión vigente. Si lo borras, la semana vuelve a contarse desde la primera carga.
- Si el cliente sube a Elite, su evaluación Elite se carga como la versión siguiente, sin `tipo` (o con `"tipo": "elite"`), y desde ese momento la app le habla como a un cliente Elite.

## Qué ve el cliente

- **HOY y MI PROGRAMA** con el nombre de su programa, en qué semana va ("Fuerza y sueño · Semana 3 de 12 · Día 17") o, antes del día de inicio, que su programa está por empezar y cuándo.
- **Su programa completo**: el plan (alimentación, suplementos, entrenamiento), las tres palancas y, solo si las llenaste, las secciones de la evaluación. Si no hay evaluación, nunca se le dice "tu evaluación": se le dice "tu programa".
- **Suplementos** con las fichas que asignaste, **Entrenar** con sus rutinas agendadas y **Comida** con su plan. Las fichas que tú fijaste no las puede editar ni borrar (con la 329, tampoco desde fuera de la app); sí pausarlas.
- **Prácticas** asignadas por ti, con la hora y la nota que pusiste.
- **ARGOS** con el contexto de su programa: el resumen que arma el paso 2 le dice que es un programa con evaluación ligera, qué trae y qué no (por ejemplo, que no hay laboratorios ni genética).
- **PDF** (el que arma la app cuando el documento no trae `html`) con el nombre de su programa como título, sin la palabra Elite y sin secciones vacías.

Escribe aquí la fecha y el tiempo de tu primera carga de un programa real: ________.
