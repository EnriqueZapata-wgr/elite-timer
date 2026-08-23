# Estación de lanzamiento · ATP

**Fecha oficial de lanzamiento: 6 de septiembre de 2026.**

Este archivo es el registro de lo decidido y lo pendiente. Se escribe aquí lo
que no cabe en un commit y no debe vivir en la memoria de nadie.

---

## Ayuno: los dos primeros del levantamiento, cerrados (23-ago-2026, noche)

Sin migración. Dos archivos: `app/fasting.tsx` y `src/services/fasting-service.ts`.

**AY-G1 · la meta que ves ya es la de tu ayuno.** El efecto que cargaba la meta
del perfil leía `activeFast` de un closure congelado (null en el primer ciclo),
así que si esa consulta resolvía al último pisaba el `target_hours` del ayuno en
curso: 20 h dibujadas contra 16, anillo lleno cuatro horas antes.

El primer intento fue un ref, y el cuatro ojos lo tumbó con razón: tapaba una de
las dos carreras y la otra quedaba cubierta por casualidad, y solo 1 de los 16
sitios que tocan `activeFast` fijaba el ref. Quedó rediseñado en dos efectos
declarativos: (a) el `target_hours` del ayuno en curso manda siempre, y cubre
también las cuatro salidas tempranas de error de `loadActiveFast` que antes
dejaban el anillo contra el default de 16:8; (b) la meta del perfil solo siembra
el estado SIN ayuno, con cleanup que descarta la escritura si el ayuno llega
mientras esperamos. La carrera ya no se parcha: no existe.

**AY-G2 · la columna `date` es el día del ayuno.** `startFast` escribía la fecha
de hoy aunque «¿Empezaste antes?» apuntara a ayer, y `updateFast` corregía
`fast_start` sin tocar nunca `date`. Ahora las dos salen del inicio real, y
`startFast` hoistea un solo golpe de reloj para que `fast_start` y `date` no
puedan caer en días distintos por milisegundos.

Verificado contra la base en vivo antes de tocar nada: la migración 070 sí está
aplicada, el viejo `UNIQUE(user_id, date)` ya no existe y el único índice único
es parcial sobre `status = active`. Mover `date` no puede chocar con nada.

**Destapado por AY-G2, decisión tuya:** el electrón de ayuno se archiva con la
fecha de CIERRE (`electron-service.ts`), y ahora la adherencia pinta el día de
INICIO. Con «¿Empezaste antes?» los dos caen en días distintos. Antes coincidían
por accidente. Hay que decidir cuál día es el canónico y alinear los dos; no lo
toqué porque cambia qué día se ve cumplido en el calendario.

Pendiente de este bloque: `npx tsc --noEmit` y `npm test` completos. Mi acceso al
disco por red muere a los 45 s y `tsc` no cabe; corrió el parser de TypeScript
sobre los dos archivos (sintaxis limpia) pero eso no sustituye el chequeo de tipos.

---

## Migración 308: aplicada y verificada (23-ago-2026)

Corrida por el dueño desde el worktree `cowork-casos`. No basta con que el CLI
diga "up to date": eso significa lo mismo si ya se aplicó que si no encontró
nada. Se comprobó contra la base, consulta por consulta:

- `lab_revision` existe, con RLS encendido y sus dos políticas.
- El índice `ux_lab_values_un_vivo` existe.
- La llave vieja con `source` adentro ya no existe.
- `lab_uploads.upload_type`, `lote_upload_ids` y `lote_fallos` existen.
- Las tres funciones existen, son SECURITY DEFINER, y tienen EXECUTE para
  `authenticated`. Sus firmas coinciden EXACTO con lo que manda la app
  (`p_es_humano`, `p_fuera_confirmado`): un desajuste ahí rompería el colector
  en tiempo de ejecución sin que ninguna prueba lo viera.
- **Cero grupos con más de un valor vivo** por usuario, dato y fecha, sobre 709
  valores vivos. La regla ya está impuesta por la base sobre datos reales.
- Cero filas temporales colgadas.

Verificación completa: `npx tsc --noEmit` limpio y `npm test` en 4540 verdes.

## Cerrado la noche del 22-ago-2026

### El colector de laboratorios, completo

Es el corazón de la app y era lo que Enrique pidió cerrar primero. Los nueve
GRAVE de la auditoría del 21-ago quedaron cerrados, y el cuatro ojos encontró
seis más que también se cerraron. Lo esencial:

**El paso intermedio existe de verdad.** Lo extraído vivía en un Map de memoria
de la sesión de JavaScript: la extracción nunca llegaba a la capa del colector.
Ahora hay una tabla, `lab_revision`, con una fila por dato, con su propia
fecha, que nace al abrir la revisión y MUERE en la aprobación, dentro de la
misma transacción que escribe en el expediente. Las correcciones de la persona
se guardan ahí conforme las hace, así que una recarga a media revisión ya no
las pierde.

**Un solo dato vivo.** Un índice único parcial deja a lo más un valor vivo por
usuario, dato y fecha, sin importar el origen. Y una sola puerta de escritura,
`lab_valor_guardar`, que anula el anterior y escribe el nuevo en un acto. La
llave vieja, que llevaba el origen adentro y era la raíz del problema del
colesterol 672 contra 172, se eliminó.

**La excepción que preguntaste el 21-ago quedó bien resuelta.** Son dos
preguntas distintas y ahora son dos parámetros: quién escribe (una persona
siempre puede corregir su propio dato) y si el valor cae fuera de rango y ella
lo sostiene (eso es lo que se protege contra los parsers). La primera versión
las mezclaba, y el efecto era el contrario del buscado: marcaba TODO lo
capturado a mano como intocable, así que subir el PDF del mismo estudio no
podía corregir nada, ni un dedazo de la propia persona.

**De paso salió un defecto viejo**: `isLabValueValid` no resolvía alias, así
que preguntar el rango con la clave canónica en español no encontraba nada y
devolvía "válido" por omisión. Todo el camino ya canonicalizado se saltaba la
validación clínica entera, en silencio.

### La pantalla de Súper

La lista de compras pasó a ser una sección; la pantalla ahora es leer etiquetas
y saber elegir, que es lo que pediste.

El reparto de trabajo es deliberado: **el modelo transcribe, el código decide**.
El modelo copia la tabla nutrimental y la lista de ingredientes y nada más; el
juicio lo hace código puro y probado. Así el resultado es el mismo siempre y se
puede explicar renglón por renglón.

Se leen dos cosas porque ninguna alcanza sola:

- **Los sellos que le tocan** por la NOM-051, con la Tabla 6 de la norma. Ni un
  umbral inventado, y cada sello dice con qué número se prendió.
- **Qué trae su lista de ingredientes.** Los sellos miden CANTIDAD, no dicen
  QUÉ es la cosa: un tocino y un producto prensado con forma de tocino pueden
  traer los mismos sellos. Se marcan los ingredientes que no existen en una
  cocina, con el para qué de cada uno.

Y hay un testigo: se compara lo calculado contra los sellos que de verdad
vienen impresos en el empaque, y cuando no coinciden la pantalla lo dice y le
cree al empaque.

Sobre el "score" que pediste verbatim: lo que hay es un resumen de conteos
verificables (cuántos sellos, cuántos tipos de ingrediente de fábrica, cuántos
criterios no se pudieron evaluar). Un número del 0 al 100 sería un veredicto, y
para darlo habría que ponderar un sello contra otro, cosa que ni la norma hace.
Si lo quieres de todas formas, se puede, pero hay que decidir la ponderación a
mano y sabiendo que es nuestra, no de nadie más.

---

## Decisiones que necesito de ti

1. **La ruta del coach sigue guardando sin que el cliente confirme.** Lo
   peligroso ya está cerrado (las unidades se convierten, y la escritura pasa
   por la misma puerta). Lo que falta es que el cliente pueda revisar antes, y
   eso necesita una pantalla que hoy no existe en el panel del coach.

2. **Hay dos lectores de etiqueta con doctrinas opuestas conviviendo.** El nuevo
   (Súper) no emite juicio de salud. El viejo, `analyzeLabelPhoto` en
   `nutrition-service.ts`, que usa el sensor de foto del registro de comida, le
   pide al modelo un score de 0 a 100 con criterios como "¿ingredientes
   limpios?" y "sal marina mejor que sal refinada". Es exactamente la clase de
   resolución paralela que llevamos meses cerrando. Hay que decidir cuál vive.

3. **La NOM-051 condiciona algunos criterios a que el nutrimento sea AÑADIDO.**
   Por eso la leche entera sin azúcar no lleva sello de grasas saturadas y
   nuestro cálculo sí se lo pondría. El testigo contra el empaque lo compensa,
   pero cerrarlo bien exige leer el texto del DOF con calma.

---

## Levantamiento de ayuno, fitness y widgets

Diagnóstico con números, sin tocar código. Ordenado por gravedad.

### Ayuno

- **La meta que ves puede no ser la de tu ayuno.** Dos consultas independientes
  fijan el protocolo y gana la que resuelva al último. Con un ayuno de 20 h y
  la meta guardada en 16, el anillo se llena al 100 % cuatro horas antes, dice
  "ya llegaste", y cambia hasta el mapa de fases. La base y ARGOS siguen en 20.
- **La columna `date` no siempre es el día del ayuno.** "¿Empezaste antes?"
  escribe la fecha de hoy aunque el ayuno haya empezado ayer, y editar el
  inicio nunca la corrige. Esa columna es la llave del calendario de
  adherencia, los reportes y la tira semanal: un día se pinta cumplido y el
  vecino vacío.
- **El ayuno olvidado solo se cierra si abres la pantalla de Ayuno.** Mientras
  tanto HOY empuja "ya puedes romper el ayuno" todos los días, ARGOS conversa
  sobre 216 h, y el widget sigue contando. Y cuando por fin lo cierras entre
  120 y 144 h, te da el electrón del tier más alto en el mismo gesto en que te
  dice "olvidaste cerrar tu ayuno".
- **Se puede cerrar dos veces el mismo ayuno**: ninguna mutación filtra por
  estado. Con dos dispositivos, un ayuno bien medido de 16.2 h se sobreescribe
  con 19 h y nadie se entera.
- **Seis definiciones distintas de "cumplí mi ayuno"**, todas mostradas a la
  misma persona. Un ayuno de 15.3 h con meta de 16 sale cumplido en el
  calendario, parcial en el historial, al 95 % en la tira, y con el electrón de
  12 h.
- El reporte de ayuno cuenta días, no ayunos, y se traga el error de la
  consulta: una falla de red se ve igual que "aún no tienes ayunos".

Por dónde: los dos primeros, juntos. Son los que dan un número equivocado sobre
el propio cuerpo y ninguno necesita migración.

### Fitness

La palabra que usaste, consolidar, es exacta. El motor y el escritor de
sesiones están bien; lo que no está consolidado es la capa de LECTURA.

- **`execution_logs` no tiene un solo escritor y tres pantallas la leen.** La
  pantalla que la escribía murió. Resultado medido: entrenas 3 días, el hub
  dice 3, `/progress` dice 0 entrenos y 0 horas, `/history` dice "sin
  sesiones", y `/reports` dice 0 sesiones por semana mientras el reporte de
  adentro dice 3. Y la gráfica de frecuencia no cae al estado vacío: pinta ocho
  barras en cero como si fueran datos.
- **Una rutina de intervalos no cuenta como entrenamiento.** El timer escribe
  en `cardio_sessions` y el hub solo mira `workout_sessions`. Corres un Tabata
  de 20 minutos y el hub sigue diciendo "sesión lista, empezar" el mismo día.
  Y si la escritura falla, se descarta en silencio.
- **Cinco copias de la fórmula de Epley en TypeScript, más una en SQL que no
  está en el repo.** 100 kg por 8 reps se muestra como 127, como 126.7 y como
  126.67 en la misma sesión. Y hay un trigger en la base escribiendo
  `personal_records` cuya definición nadie puede leer ni versionar.
- **`personal_records` guarda una fila por ejercicio, pero dos pantallas están
  escritas para varias.** La pestaña de fuerza del reporte dice "primera marca
  del rango" para todo, siempre, y la tabla de rep ranges de `/fitness-strength`
  sale vacía salvo una celda, o vacía entera si el PR fue a 8 repeticiones.
- **Sin tope de repeticiones**: teclear 100 en vez de 10 con 100 kg crea un PR
  de 433 kg que, por el diseño del índice, nunca se puede corregir solo.
- La ventana de alimentación que pone el coach no llega a ninguna pantalla del
  usuario: el único lector es el prompt de la IA.

Por dónde: matar `execution_logs` primero. Cinco funciones reescritas contra
`workout_sessions` arreglan `/progress`, `/history` y la card de reportes de un
golpe, y hacen que las dos superficies dejen de contradecirse.

### Widgets

El candado de escritura está bien hecho. Lo que no está pulido es todo lo
demás, y hay dos cosas que ponen números falsos enfrente del usuario.

- **El contador de ayuno corre para siempre.** Es el único de los tres que no
  lee la fecha del snapshot. Abres un ayuno el viernes, no entras el fin de
  semana, y el lunes el widget te presume 62 horas de ayuno. La app, en cuanto
  abras, lo va a cancelar por olvidado.
- **Con el snapshot vencido, el widget acepta toques y nunca pinta nada.** El
  agua se guarda de verdad, pero el widget sigue diciendo 0 ml. El usuario
  toca, toca y toca; termina con un litro registrado y un widget que le dice
  que no ha tomado nada.
- **Un toque con la app cerrada probablemente no escribe.** El camino principal
  y el respaldo están los dos bloqueados por restricciones de Android moderno.
  La palomita se pinta igual. Esto necesita una prueba en device antes que
  cualquier cambio de código: instalar el widget, hacer force-stop, palomear, y
  ver si llegó a la base. Es la prueba más barata de todo el diagnóstico y la
  que más información da.
- **El único push de snapshots vive dentro de la pestaña HOY**, y los deep
  links del propio widget no la montan. El camino que la app le ofrece al
  usuario es justo el que deja el widget desactualizado.
- Si la sesión expira sola, solo se limpia el widget de hábitos: agua y ayuno
  se quedan con los datos del usuario anterior en la pantalla de inicio.
- Nadie despierta a los widgets a medianoche, así que entre las 00:00 y la hora
  en que despierte el teléfono se muestran los datos de ayer como si fueran de
  hoy.
- **iOS no existe.** No está a medias: no está. Son tres vistas de WidgetKit,
  un App Group y AppIntents. Es un proyecto, no un pulido, y conviene decirlo
  así en la comunicación.

Por dónde: el contador de ayuno y el snapshot vencido. Los dos son cortos y los
dos quitan un número falso de la pantalla de inicio.

---

## Decidido y sin aplicar todavía

### Versión para el build nativo

| campo | valor hoy en app.json | valor acordado |
| --- | --- | --- |
| `expo.version` | 2.2.0 | **2.3.0** |
| `expo.ios.buildNumber` | 5 | **6** |
| `expo.android.versionCode` | 23 | 24 (sube junto, si no se dijo otra cosa) |

Decisión del dueño el 21-ago-2026, en remoto y sin terminal a la mano, así que
**app.json NO se ha tocado**. La regla del proyecto es que la versión no se
cambia sin hacer el build de inmediato, y quien puede correr el build es él.

Cuando vuelva a tener terminal, el orden es: cambiar los tres valores, `npx tsc
--noEmit`, `npm test`, y build nativo de iOS y Android en la misma sesión.

Motivo del build: Mariana y Pato están en 2.1.5, que es anterior a varias cosas
que ya viven en el código. Dos consecuencias medidas de esa distancia:

- El arreglo del colector de laboratorios (abajo) no les llega por OTA en lo
  que toca a módulos nativos.
- La voz real de ARGOS no suena en su binario. Ver la sección de voz.

---

## La voz de ARGOS: qué se sabe y qué falta

El dueño reportó que elegir voz masculina o femenina suena igual, y a TTS del
sistema. La sospecha inicial fue que ElevenLabs no hace síntesis en tiempo
real. **Los registros dicen otra cosa:** el 21-ago a las 03:01 y 03:02 hubo
tres llamadas a la edge function `argos-voice` con respuesta **200**. La voz se
pidió y llegó.

Lo que encaja con los dos hechos es que el audio llegó y **no se pudo
reproducir**: el reproductor usa `expo-audio`, que es módulo nativo, y
`argos-tts.ts` está escrito para degradar sin tronar cuando el binario no lo
trae. La versión anterior caía entonces al TTS del sistema con el tono
cambiado, que es la misma voz dos veces.

**Pendiente:** probarlo en el build 2.3.0. Si ahí tampoco suena la voz real, se
quita la pantalla de selección de voz y ARGOS se queda con una sola. Se decide
con el dato, no antes. El fingimiento ya se quitó (commit 58d1f16): hoy, si la
voz real no está, la pantalla lo dice en vez de inventar.

---

## Colector de laboratorios: auditoría del 21-ago-2026

Es uno de los motores centrales: alimenta el expediente y la Edad ATP. Se
auditó de punta a punta a raíz del bug que reportó Pato.

### Arreglado

- Una sola selección de archivo a la vez, compartida entre cámara, galería y
  PDF, y **con salida por fuera**: volver a la pantalla o traer la app al
  frente libera el candado. Sin eso, una selección que muere en segundo plano
  lo dejaba encendido para siempre y los tres botones dejaban de responder.
- Los mensajes técnicos en inglés ya no llegan a pantalla en ninguno de los
  cuatro puntos donde el colector muestra errores. El filtro de fugas ganó la
  familia de errores de módulo nativo, que era la que faltaba.

### Pendiente, en orden de gravedad

Nada de esto se tocó todavía: requieren decisión o trabajo con cuidado.

1. **Confirmar dos veces el mismo estudio crea dos registros.** Al guardar, el
   upload se queda en `extracted` en vez de `confirmed`, así que el aviso
   vuelve a ofrecer revisarlo.
2. **Corregir un valor no corrige el motor.** La escritura a `lab_values` usa
   `ignoreDuplicates`, así que la segunda versión del mismo parámetro para la
   misma fecha se descarta en silencio. El expediente muestra el valor
   corregido y el motor sigue con el equivocado.
3. **Si falla la escritura de los valores, la pantalla igual dice que se
   guardó.** El resultado de esa escritura no se revisa.
4. **Los archivos marcados como contexto terminan parseados como laboratorio.**
   El tipo elegido no se guarda en la base, y el resumidor de arranque vuelve a
   encolar todo lo viejo contra el prompt de labs.
5. **Varias fotos de un mismo estudio: el aviso global compite con la pantalla
   de confirmación** y puede guardar una foto suelta como si fuera el panel
   completo.
6. **Dos estudios de fechas distintas se funden bajo una sola fecha.**
7. **Una foto que falla se cae del conjunto sin avisar**, y se guarda un panel
   incompleto creyendo que está completo.
8. **La ruta del coach guarda sin confirmación y sin convertir unidades**,
   sobre el expediente del cliente.
9. **La captura manual estampa la fecha de hoy**, aunque el estudio sea viejo.

---

## Cerrado el 22-ago-2026

Cuatro motores que estaban dando números equivocados, no fallando en silencio.
Los cuatro con cuatro ojos y con el defecto medido antes de tocar nada.

- **Ciclo hormonal.** Vivían dos predicciones del próximo periodo. La tarjeta
  derivaba del largo observado y del ajuste manual; ARGOS tenía la suya, que
  aprendía con un solo ciclo y si no podía caía a 28 duro en vez de respetar el
  ajuste que la usuaria escribió. Con un intervalo de 27 días y ajuste manual
  de 32, la tarjeta decía 2 de septiembre y ARGOS 28 de agosto. Misma sesión,
  mismo cuerpo. Queda una sola cuenta. Y con retraso, ARGOS publicaba una fecha
  ya vencida con la palabra "próximo" delante: ahora dice el retraso.

- **Dual n-back.** La regla de subir de nivel era de porcentaje y empujaba
  hacia abajo a quien jugaba bien. Jaeggi cuenta errores, no porcentaje, y el
  denominador aquí es chico: la mediana de objetivos por canal es 7.75, así que
  con 7 objetivos "≥90 %" y "perfecto" son el mismo número. Medido sobre el
  generador real, un jugador con 90 % de aciertos bajaba de nivel tres veces
  más seguido de lo que subía. Con conteo de errores sube el 77 % de las veces.

- **Packs.** Dos aplicaciones del mismo pack chocaban contra el índice único y
  el conflicto tumbaba el lote completo: no entraba ninguna práctica. Y aplicar
  un pack no refrescaba la card de HOY hasta salir y volver.

- **builder.tsx**, el editor de rutinas: migrado. Era la última pantalla grande
  sin tema. De paso salieron dos defectos que ya vivían ahí: el chip de
  ejercicio en BlockCard se apagaba en claro, y el picker de ejercicios (que
  sigue sin migrar) tenía que quedar fuera del ámbito del tema o su texto se
  volvía invisible. Hay candado nuevo para que el color duro no regrese.

## Otros pendientes con nombre

- **El picker de ejercicios** (`MatrixExercisePicker`) sigue en oscuro duro.
  Hoy está fuera del ámbito del tema a propósito y hay una prueba que lo
  obliga a quedarse fuera. Cuando se migre, se borra esa prueba a mano.
- **Recetas**: 93 recetas y 149 ingredientes ya despiezados, con matriz de
  composición. Falta que la responsable clínica revise los 17 ingredientes de
  confianza baja y las recetas cuya diferencia contra la tarjeta pase del 50 %.
- **Claims clínicos de las recetas**: eliminados por decisión del dueño el
  21-ago. No se usan.
