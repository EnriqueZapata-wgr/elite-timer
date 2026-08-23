# Backlog maestro · levantamiento del 23-ago-2026

Este documento existe porque las listas dictadas se han perdido antes. Nada de lo
que está aquí se cierra sin dejar escrito qué se hizo y dónde. Si algo no está en
esta lista, no existe; si está y se cierra, se marca aquí mismo con fecha.

Lanzamiento: **6 de septiembre de 2026**. Faltan 14 días.

Estados: `SIN EMPEZAR` · `DIAGNOSTICADO` (causa raíz encontrada, sin código)
· `EN CURSO` · `LISTO` · `NECESITA A ENRIQUE`

---

## Respuestas de Enrique · 23-ago, noche

1. **Estudios:** *"no, nunca abre el explorador de archivos"*. **Esto tumbó el
   diagnóstico.** Ver la corrección en 1.3.
2. **Ovulación:** *"quiero que tomemos documentación real, no estar inventando"*.
   Hecho: `R and D/CICLO_OVULACION_BASE_DOCUMENTAL_2026-08-23.md`, con ASRM, Wilcox,
   Bull, Johnson, OMS, NICE, CDC y SOGC. La fórmula actual no existe en la literatura.
3. **Recetas:** para TODOS, y que sirvan ingredientes y pasos, porque son materia
   prima de nutrición y Súper. Decidido: se puebla `recipes` como catálogo público
   y `RecetasTab` une públicas + del usuario. NO se mutilan hacia `user_recipes`.
4. **Mi protocolo:** la decisión fue separar **intervención** de **caso de uso** e
   irnos por casos de uso. Existe `R and D/CASOS_DE_USO_DESTINOS_2026-08-20.md` y la
   rama se llamó `feat/casos-de-uso`. Falta cotejar qué se aplicó y qué no.
5. **Mapa funcional:** Enrique mandará el documento actualizado (está en rediseño).
   Queda como pendiente activo en FIFO.
6. **Electrones:** se quitó la economía de protones, así que varios placeholders ya
   no tienen sentido y no habrá transacciones. El reinicio del 1-sep deja de ser
   solo un borrado: hay que decidir qué estructuras se retiran. Ver sección 2.

---

## CORRECCIÓN al diagnóstico de subir estudios (1.3)

La hipótesis del candado pegado **era incorrecta**, por dos razones que el cuatro
ojos encontró:

- **Línea del tiempo:** la hoja modal se envió el 12 de junio con exactamente el
  patrón acusado, y hubo subidas exitosas el 18 y el 19. Si esa fuera la causa, el
  apagón sería del 12.
- **Plataforma:** la colisión "selector nativo vs. Modal cerrándose" solo existe en
  iOS, donde el picker se presenta sobre el view controller del Modal. **Enrique
  está en Android**, donde es un Intent sobre la misma Activity. El arreglo no le
  habría servido de nada.

Y el candado no explica el PRIMER intento: empieza libre.

**Lo que se hizo entonces:** en vez de seguir adivinando, se instrumentó. Cuatro
migajas de log que separan las tres causas posibles, que hoy producen el mismo
silencio: (a) `onSelect` nunca corre, (b) corre `onCancel` en vez de `onSelect`,
(c) `getDocumentAsync` se llama y nunca resuelve. Con el log, el próximo intento
da la respuesta en un intento en vez de por eliminación.

Además se cerraron fallas reales que el cuatro ojos encontró de paso:
- El candado ahora tiene DUEÑO (token). Sin eso, un flujo viejo que termina tarde
  soltaba el candado que ya había tomado uno nuevo.
- Se retiró el listener de `AppState` que liberaba el candado en `active`: en
  Android, abrir el selector manda la app a segundo plano y volver lo desarmaba
  justo cuando debía sostenerlo.
- El `FileReader` no tenía `onerror` ni `reject`: si fallaba, la promesa quedaba
  colgada para siempre, sin catch, sin finally y sin mensaje.
- El lanzamiento diferido ahora se cancela al salir de la pantalla.
- El fallback de "PDF no disponible" perdía el tipo elegido y metía todo al motor
  como sangre.
- Todos los `return` mudos dejan mensaje visible.

**Sigue abierto:** qué se publicó (OTA o build) el 18 o 19 de junio. Es el
sospechoso con motivo y oportunidad, y nadie lo ha revisado.

---

## Lo que necesito de ti

1. **Subir estudios (bloqueante).** Cuando falla, ¿es también en el PRIMER intento
   después de cerrar la app por completo y reabrirla? Si el primero sí abre el
   explorador y solo fallan los siguientes, confirma la hipótesis del candado
   pegado. Es la única pregunta que no puedo contestar leyendo código.
2. **Recetas.** Las 10 recetas del repo, ¿son catálogo para TODOS los usuarios o
   solo tuyas? La respuesta cambia la tabla destino y si hay cambio de código.
   Ver 1.2: hoy no caben completas en la tabla que la pantalla lee.
3. **Ovulación.** Autoriza el cambio de fórmula a fase lútea fija
   (`ovulación = inicio + largo − 14`). Cambia el día que ve una persona que
   busca o evita embarazo. No lo toco sin tu sí explícito. Ver 1.4.
4. **Mi protocolo.** Dijiste que autorizaste una propuesta de reducción y no está.
   Necesito el nombre del documento o la fecha de esa conversación para no
   reinventarla.
5. **Mapa funcional.** El documento de ATP diagnosis que me pasaste: dime cómo se
   llama o dónde vive. No lo encuentro por nombre.
6. **Ajustes / Stripe.** El enlace del portal de cliente de Stripe, cuando puedas.
7. **Ayuno, día canónico.** El electrón se archiva con la fecha de CIERRE y la
   adherencia ahora pinta la de INICIO. ¿Cuál manda?

---

## 1 · Diagnosticado esta noche, con causa raíz

### 1.1 · Hidratación tarda ~10 s · `DIAGNOSTICADO`

**No es la base.** `hydration_logs` tiene índice único `(user_id, date)` y cero
triggers. Verificado contra el proyecto real. El problema es 100 % cliente y son
dos cosas encadenadas:

**(a) La card de HOY no pinta hasta que el servidor contesta.**
`src/components/hoy/TareasView.tsx:171-181`. `handleInline` solo hace
`await addWater(...)` y no toca estado local: el número sale de `CompiledDay`, así
que es físicamente imposible que suba antes de que termine el recompile. Prueba
limpia: `app/hydration.tsx:64-73` SÍ es optimista y de esa pantalla nadie se queja.

**(b) Un toque recompila el día entero DOS veces.**
`src/services/hydration-service.ts:119-120` emite `day_changed` y
`electrons_changed`. `app/(tabs)/index.tsx:123` y `:131` escuchan uno cada uno y
ambos llaman `loadDay(true)`. Sin dedupe ni guard de in-flight. Cada `compileDay`
son 23 queries en paralelo más 12-15 round-trips SERIALES.
**Total: 60-80 llamadas de red por un toque, contra 3 necesarias.**

Duplicación medida dentro de un solo compile: `user_chronotype` se consulta
9 veces, `user_day_preferences` 4 veces.

**Plan, en orden de impacto:**
1. Optimismo local en `TareasView.tsx:171` (el patrón ya existe en el archivo, en
   el `setOverrides` de palomeos, línea 159). Esto solo cierra la queja.
2. `hydration-service.ts:119-120`: emitir solo `day_changed`.
3. `app/(tabs)/index.tsx:96-133`: guard de promesa en vuelo + debounce ~150 ms.
   Defensa en profundidad: hay 36 sitios que emiten `day_changed`.
4. Evento barato `hydration_changed` con el total en el payload; HOY parcha `day`
   sin recompilar. Aquí el toque baja a 3 llamadas.
5. `day-compiler.ts`: paralelizar 393/406/462, reusar `prefsRes` en 462 y 993,
   pasar el cronotipo ya leído a `buildAgenda`, y cambiar los bucles seriales de
   `awardBooleanElectron`/`revokeBooleanElectron` (662, 672) por `Promise.all`.
   Esto acelera TODA la app, no solo agua.

### 1.2 · Las recetas no aparecen · `DIAGNOSTICADO` · `NECESITA A ENRIQUE`

Son dos fallos encadenados, no uno:

- Las 10 recetas existen en `src/data/starter-recipes.ts` (array `RECIPES`).
  Ese archivo exporta `seedRecipes()` y **esa función no se llama desde ningún
  lugar del código**. La tabla `recipes` tiene **0 filas**.
- Aunque corriera, `seedRecipes()` inserta en `recipes` y la pantalla
  (`RecetasTab.tsx:87-98`) lee de `user_recipes`. **Tablas distintas.** Ninguna
  pantalla de la app lee de `recipes`: es código muerto de la migración 027.

RLS no esconde nada; las políticas son correctas. `user_recipes` tiene 2 filas,
las dos de otra usuaria y duplicadas entre sí (el insert de creación no deduplica:
pendiente aparte).

**El obstáculo real, y por eso te pregunto:** los objetos de `starter-recipes.ts`
traen la forma de `recipes` (`instructions`, `description`, `prep_time_min`,
`tags`, `diet_types`). `user_recipes` (migración 054) solo tiene `name`,
`ingredients`, `total_*`, `meal_type`. **Los pasos de preparación no caben en la
tabla que la pantalla lee.** Cargarlas ahí las mutila.

Dos caminos: cargar mutiladas solo para ti (rápido, malo), o poblar `recipes`
como catálogo público y que `loadRecipes` una las públicas con las del usuario
(correcto, es cambio de código). Recomiendo el segundo.

### 1.3 · No se pueden subir estudios · `DIAGNOSTICADO` · BLOQUEANTE

**Evidencia dura:** en `lab_uploads` y en el bucket `lab-files` el último registro
es del **19 de junio**. El `storage.upload()` es la PRIMERA operación de red del
flujo. Si no hay objeto en storage, el cliente nunca llegó a la red. Eso descarta
RLS, constraints, el trigger, la edge function y todo el trabajo de anoche.
`lab_uploads.upload_type` no tiene CHECK y el único valor existente es `labs`,
que es exactamente lo que manda el cliente. La base está bien.

**Causa raíz (alta certeza):** el candado `eligiendoRef` se traga el tap en
silencio. `app/my-health.tsx:205` (PDF) y `:171` (imagen):

    if (eligiendoRef.current) return;   // return mudo: sin alert, sin log

Ese candado entró el 21-ago (`5d25124`, "una usuaria no podia subir sus estudios")
y se parchó horas después (`7eec856`), cuyo propio mensaje dice que "el candado se
quedaba encendido para siempre". El parche lo libera en `useFocusEffect` y en
`AppState → active`, y **ninguno de los dos dispara al abrir o cerrar el Modal del
picker**. Comparado contra `65e0739` (18-jun, última versión con subidas exitosas
en la base), todo el tramo previo a la red es idéntico línea por línea salvo el
candado. Es el único cambio funcional en dos meses.

Submecanismo: `handleTypeSelected:149-153` cierra el modal y en el MISMO tick
llama `DocumentPicker.getDocumentAsync()`. Pedir el picker nativo mientras el
Modal se desmonta termina en "Different document picking in progress" (el error
que reportó Pato el 21-ago) o en una promesa que nunca resuelve, y entonces el
`finally` de la línea 235 no corre y el candado queda pegado para siempre.

**Arreglo propuesto (3 piezas):** disparar el picker desde el `onDismiss` del
Modal y no en el mismo tick; darle caducidad de ~30 s al candado; y que el return
mudo deje rastro visible.

**Segundo camino silencioso, independiente:** `handlePickImage:170-201` llama
`launchCameraAsync`/`launchImageLibraryAsync` **sin pedir permiso**. Es la única
pantalla de la app que no lo hace (`SuperTab`, `PhotoSensor`, `BhaScanSheet`,
`SupplementScanSheet` y `profile` sí lo piden). Permiso denegado devuelve
`canceled:true` y hay otro return mudo.

**Latente:** `my-health.tsx:313` manda `upload_type: 'contexto'`, que no existe en
`UPLOAD_TYPES`. No rompe, pero se pierde el tipo real que la persona eligió, que
es justo el dato que la migración 308 vino a guardar.

### 1.4 · Ciclo: la doctrina NO se cumple · `DIAGNOSTICADO` · `NECESITA A ENRIQUE`

Tu sospecha era correcta. **Hay dos definiciones vivas de ovulación:**

- El punto del calendario, `app/cycle.tsx:330`: `inicio + round(largo/2) − 1`.
- La fase, `cycle-phase-core.ts:35-36`: umbrales proporcionales 0.46 / 0.57.

Hoy no se ven dos números contradictorios el mismo día por casualidad aritmética
(0.5 cae entre 0.46 y 0.57), pero son dos fórmulas independientes del mismo dato.
Donde sí se ve ya: el punto solo existe para el ciclo actual, las bandas se
proyectan al infinito. El mes que viene la usuaria ve banda de ovulación sin punto.

**El candado que debía impedirlo existe y no muerde.**
`cycle-phase-core.test.ts:224` prohíbe `const ovDay = Math.round(cycleLen / 2)`.
El código real dice `const ovDate = ... Math.round(cl / 2)`. Otro nombre de
variable, la regex no matchea, el ratchet pasa en verde con la fórmula viva.

**Siguiente regla: una aritmética, tres copias.** La canónica es `predecirProximo`
(`cycle-phase-core.ts:156`); `app/cycle.tsx:326` y `:163` la recalculan a mano.
Divergen con retraso real: con 5 días de atraso ARGOS dice "retrasada 5 días" y la
card dice **"~0d"**. Es el bug que el commit `94b01b5` dice haber matado,
sobreviviendo en la copia de la pantalla.

**Y hay un tercer promedio.** `/reports/ciclo` usa `ciclo-report-core.ts:40-49`,
que promedia todos los `cycle_length` sin la ventana fisiológica 20-45, sin tope
de 6 períodos y sin el mínimo de 2 ciclos que exige `cycle-length-core.ts`. Ese es
el número que la usuaria imprime para llevar al médico.

**Lo más serio, y por eso necesito tu sí:** la fórmula no tiene respaldo escrito
en ninguna parte del repo. El estándar clínico es fase lútea fija
(`ovulación ≈ largo − 14`), porque la lútea es la parte estable y la folicular la
que varía. La app asume que ambas escalan proporcionalmente. Coinciden solo en 28.

| Largo | App dice | Lútea −14 | Error |
|---|---|---|---|
| 24 | día 12 | día 10 | 2 d |
| 28 | día 14 | día 14 | 0 |
| 32 | día 16 | día 18 | 2 d |
| 35 | día 18 | día 21 | 3 d |
| 40 | día 20 | día 26 | 6 d |

Con ventana fértil de 5 días, un error de 3-6 la deja completamente fuera.

**Además:** `confidence` se calcula en `predecirProximo` y **nadie lo lee**. Campo
muerto. Y el punto de ovulación se pinta idéntico con 2 ciclos observados que con
cero datos y el 28 por defecto, sin ninguna advertencia.

**Lo que sí está bien:** la fase, el largo del ciclo y la resolución están
consolidados de verdad, con guarda de frescura adentro, y la card dice de dónde
sale el largo. Esa parte es doctrina cumplida.

---

## 2 · Reinicio de electrones · 1 de septiembre · `NECESITA A ENRIQUE`

Pediste borrar todos los electrones el 1-sep para que todos arranquen en cero.
**No es una sola tabla.** Alcance real, medido hoy:

| Tabla | Filas | Usuarios | Qué hacer |
|---|---|---|---|
| `electron_logs` | 949 | 3 | borrar |
| `electron_transactions` | 865 | 4 | borrar |
| `daily_electrons` | 146 | 4 | borrar |
| `electron_window_totals` | 0 | 0 | ya vacía |
| `electron_balance` | 4 | 4 | poner en cero, NO borrar |
| `electron_ranks` | 6 | — | **NO TOCAR**: es el catálogo de rangos, no datos de usuario |

No lo corro hasta que me lo confirmes el 1-sep. Cuando llegue el día lo hacemos en
una transacción, con conteos antes y después escritos aquí. Si quieres, dejo
programado un recordatorio para ese día.

---

## 3 · Levantado el 23-ago · pendiente de trabajar

### 3.1 · Ayuno · `SIN EMPEZAR`
- Al terminar ayuno, preguntar **"¿rompes ahora o ajustas la hora?"**. Hoy hay que
  aceptar, ir al historial, editar ayuno y capturar inicio y fin. Fricción pura.
- Estadísticas rápidas: promedio, ayuno más largo, racha. No existen.
- Ya hay doctrina documentada en `R and D` extraída de Zero Fast: usarla.

### 3.2 · Súper · `SIN EMPEZAR`
"Ya tiene datos pero no da información de fondo, es mucho texto sin más. No me
encantó." Rehacer con jerarquía visual, no muros de texto.

### 3.3 · Emociones, legibilidad en tema claro · `SIN EMPEZAR`
Los colores claros casi no se notan. Las palabras que clasifican cada cuadrante
("con mucha energía y no se siente bien", etc.) van del mismo color que su
cuadrante y no se leen encima. Necesitan sombreado grueso, marco, o ambos.

### 3.4 · Cardio como pantalla viva · `SIN EMPEZAR`
Hoy es una biblioteca de registro eterna. Con FC, tiempo total y distancia de una
corrida se puede estimar condición física. Crear **perfil de cardio**: FC máxima,
FC en reposo, LTHR2 si la saben, o extraerlos de una herramienta. Con perfil,
calcular VDOT y estimar VO2 máx, diciendo siempre que es estimación. Mostrarlo
también en el perfil de fitness.

### 3.5 · Mi protocolo · `SIN EMPEZAR` · `NECESITA A ENRIQUE`
Sigue siendo una lista interminable de intervenciones. Había una propuesta de
reducción autorizada que no se aplicó. Necesito ubicarla.

### 3.6 · Suplementación · `SIN EMPEZAR`
- Fichas fijas: deben conocer la dosis por cápsula, gota o porción.
- Escanear el suplemento y detectar cantidad de reactivo por porción.
- Registro diario variable: "hoy tomé dos porciones", "hoy una".
- **Separar protocolo establecido de rotativos/eventuales** (ashwagandha bajo
  estrés, glicina variable). Biblioteca de 50 que no se toman diario, a la mano.
- **Histórico: no se encuentra por ningún lado.** Hace falta la pantalla.
- Reportes: mapa de calor de días con suplemento, frecuencia, en general y por
  grupo. Detectar por ejemplo que los fines de semana se olvidan.

### 3.7 · Tribu y ranking · `SIN EMPEZAR`
El perfil de Mariana aparece como "A" sin nombre aunque ella ya lo modificó. Hay
un dato que no se está refrescando. (El reinicio de electrones va en la sección 2.)

### 3.8 · Fuerza · `SIN EMPEZAR`
- **No existe pantalla para configurar la semana de entrenamiento.** Ni manual, ni
  con ayuda de ARGOS, ni que la construya por ti. Debe combinar cardio, fuerza y
  rutinas.
- **No hay registro rápido de "ya entrené sin la app".** Debería ser "hice esta
  rutina, fin" o capturar los ejercicios de ese día. La ventana de registrar que
  existe solo acepta ejercicios benchmark: esa navegación no sirve.
- Se junta con el hallazgo del levantamiento anterior: `execution_logs` no tiene
  escritor y tres pantallas la leen.

### 3.9 · Agenda y notificaciones · `SIN EMPEZAR`
- Elementos fuera de tiempo y fuera de orden, sin forma clara de ajustar horarios.
- Al fondo de la pestaña de agenda, "horarios y notificaciones" muestra una lista
  enorme con cosas repetidas. Sospecha de que eso dispara las notificaciones.
- Las notificaciones funcionan pero llegan a destiempo. Manda a hacer cardio por
  la tarde cuando él solo corre en las mañanas.
- Debería ajustarse solo, aprendiendo del comportamiento, no a mano.

### 3.10 · Pantalla de menú de ARGOS · `SIN EMPEZAR`
ARGOS manda directo al chat. Falta una pantalla de menú: opciones, navegación,
configuración, generación de reportes. Que sea un asistente completo, no un chat.

### 3.11 · ARGOS lee mal los hábitos del día · `SIN EMPEZAR`
Errores al leer la cantidad de hábitos realizados. Confirmar la lectura en backend
y en frontend.

### 3.12 · Mapa funcional / diagnóstico · `SIN EMPEZAR` · `NECESITA A ENRIQUE`
Sigue en la versión vieja. Debía actualizarse con el documento de cómo se ve la
página de diagnóstico de los clientes de ATP diagnosis.

### 3.13 · Ajustes, revisión completa · `SIN EMPEZAR` · para el final
Ejemplo concreto: membresía dice "ATP premium" y método de pago enlaza a
"gestionar en Google" llevando a las suscripciones de Google, cuando en realidad
se cobra por Stripe desde el sitio web. Hay portal de cliente de Stripe habilitado.
Es solo uno de varios; la ventana entera necesita barrido.

---

## 4 · Vivos del levantamiento anterior, no cerrados

- **Ayuno:** el ayuno olvidado solo se cierra si abres la pantalla; se puede cerrar
  dos veces el mismo ayuno; seis definiciones distintas de "cumplí mi ayuno".
- **Fitness:** `execution_logs` sin escritor con tres lectores; una rutina de
  intervalos no cuenta como entrenamiento; cinco copias de Epley; sin tope de
  repeticiones (un PR de 433 kg irreparable).
- **Widgets:** el contador de ayuno corre para siempre; con snapshot vencido el
  widget acepta toques y nunca pinta; iOS no existe.
- **Labs:** la ruta del coach guarda sin que el cliente confirme; dos lectores de
  etiqueta con doctrinas opuestas; NOM-051 no modela "añadido".
- **Ayuno, decisión abierta:** el electrón usa fecha de cierre, la adherencia usa
  fecha de inicio.
- **Infra:** `argos-proxy` sin desplegar (el lector de etiquetas cae a Sonnet).
