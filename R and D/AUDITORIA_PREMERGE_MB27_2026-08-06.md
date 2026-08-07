# 🔴 AUDIT DE COWORK · MB-27 · VEREDICTO ROJO. No mergea todavía.

Sigue el MODO REMOTO: correcciones en la MISMA rama feat/mb27-cuerpo,
commits nuevos, push, y te detienes. Sin merge, sin db push, sin OTA,
sin tocar app.json. Las migraciones 256 y 257 siguen pendientes de push.

Buen run de fondo: los dos dictámenes son correctos, las migraciones están
bien escritas, cinco de los seis fixes de la Pieza 0 quedaron cerrados de
verdad, y el copy bidireccional del ciclo sí suma. El diff de la 254 es puro
comentario, sin DDL: correcto, era el riesgo grave.

Lo que sigue son 8 bloqueantes y 10 menores. Un commit por bloqueante.
Al terminar, reporta qué caso concreto probaste para cada uno.

--------------------------------------------------------------------------

# 🔴 B1 · La fase del ciclo sigue dando dos respuestas

Consolidaste la función getPhase pero NO la fuente ni el largo del ciclo.
Los argumentos siguen difiriendo:

- /cycle (app/cycle.tsx:265,281): inicio desde cycle_daily_logs vía
  findLastPeriodStart, largo = observedCycleLength(periods) ?? settings,
  CON guarda de frescura (day > cycleLen + 14 → null).
- Entrenar y day-compiler (cycle-service.ts:126): inicio desde
  cycle_periods[0].start_date, largo = settings.avg_cycle_length SIEMPRE,
  SIN guarda de frescura.

Caso que falla sin que ningún dato esté viejo: usuaria con ciclo observado
de 31 días, ajuste manual en 28, en su día 14. /cycle calcula round(31*0.46)
= 14 y dice Folicular. Entrenar calcula round(28*0.46) = 13 y dice Ovulación.

Y hay una TERCERA respuesta dentro de la misma pantalla: las bandas del
calendario (app/cycle.tsx:677,681) cortan con settings.avg_cycle_length
mientras la card usa el observado. Card "Folicular" sobre banda de ovulación.

El comentario de src/services/cycle/cycle-phase-core.ts:11-13 afirma "los
datos vienen de cycle_periods, una fuente, una función". Es FALSO para la
card de /cycle. Corrige el comentario o corrige el código, pero que
concuerden.

Qué se espera: UNA sola resolución de {inicio, cycleLen, periodLen} que
consuman las tres superficies, con la guarda de frescura adentro. Decide y
defiende cuál fuente manda (observado vs ajuste manual, logs vs periods);
lo que no se vale es que sigan siendo dos.

El ratchet actual (cycle-phase-core.test.ts:70-74) es textual y su regex deja
pasar app/cycle.tsx:302, que conserva Math.round(cl / 2) para ovulación y
ventana fértil. El test nuevo debe comparar la fase ENTRE superficies con los
mismos datos, no cada una por su lado.

# 🔴 B2 · El fix 0.4 abrió un salto de techo silencioso

app/centro/[appKey].tsx:120 evalúa el techo con togglesForApp(app.key), que
EXCLUYE los MANDATORY. Pero install-service.ts ahora reactiva los MANDATORY
vía habitosQueEnciende. Se evalúa una lista y se enciende otra.

Caso: usuario con 8 renglones activos y cardio en reposo instala la app
Cardio. togglesForApp('cardio') devuelve vacío, el techo dice 8, no avisa, y
la instalación lo deja en 9 sin decir nada. Igual con journal y con Emociones.

Qué se espera: el techo evalúa exactamente la misma lista que se va a
encender.

# 🔴 B3 · /plan-entrenamiento es una cuarta puerta que no respeta el techo

app/plan-entrenamiento.tsx:93 llama reactivarHabitos(userId, ['strength'])
sin pasar por evaluarTechoEncendido. techo-service.ts:4-6 documenta el
contrato: "las puertas de encendido llaman evaluarTechoEncendido ANTES de
encender". Las otras tres puertas lo respetan.

El Alert con "Dejarlo así" está bien y es la mitad correcta. Falta evaluar el
techo antes de ofrecer.

# 🔴 B4 · savePlanSemanal destruye el plan y luego dice "intenta de nuevo"

plan-semanal-service.ts:76-101 hace DELETE y luego INSERT, sin transacción ni
RPC.

Caso: plan de lunes y jueves guardado. El usuario agrega sábado. Falla el
INSERT. La pantalla dice "No se pudo guardar, intenta de nuevo"
(app/plan-entrenamiento.tsx:74) y el plan YA se borró. Vuelve y Entrenar le
dice "Dime qué días entrenas", como si nunca hubiera configurado nada.

Esto pasa HOY SIEMPRE, porque la migración 257 no está aplicada y el INSERT
falla por columna inexistente.

Regla 6 de continuidad: el dato del usuario es sagrado. Upsert, RPC
transaccional, o borrar solo después de que el insert confirme.

# 🔴 B5 · La Pieza 2 quedó detrás de la puerta que nadie usa

app-registry.ts:96 rutea la app "Entrenar" a /fitness-hub, NO a
/fitness-train. El hub sigue diciendo "HOY TOCA + enfoque leído de
AsyncStorage" (fitness-hub.tsx:224-234) y su botón arranca la sesión directo.

Caso: jueves = Tracción en mi plan; mi última pref del generador es full
body. Abro Entrenar desde el Centro, el hub dice "HOY TOCA Full body" y con
un tap arranco la sesión equivocada. La respuesta correcta vive un nivel
abajo, donde casi nadie llega.

Qué se espera: que la asignación del día mande en la puerta real que usa el
usuario, o que las dos superficies contesten lo mismo. Decide cuál y
repórtalo.

Relacionado (MENOR, mismo commit): app/routine-generator.tsx:118-189 persiste
el enfoque del deep link en fitness_generator_prefs_v1, así que abrir el plan
reescribe la pref del generador. Y con objetivo 'movilidad'
(routine-generator-core.ts:252) el filtro ignora matchEnfoque, así que el
hero anuncia "HOY TE TOCA EMPUJE" y el generador arma movilidad de cuerpo
completo.

# 🔴 B6 · Precedencia de peso invertida contra health-score

nutrition-score-core.ts:85 (elegirPesoKg) toma health_measurements primero.
health-score-service.ts:137 toma body_measurements primero y
health_measurements solo como complemento.

Caso: cliente de coach con 92 kg medidos ayer por su coach en
body_measurements y 105 kg del onboarding de hace un año en
health_measurements. La meta de proteína usa 105 y el score de salud usa 92.
Dos pesos para la misma persona el mismo día.

El comentario del código dice "mismo patrón que health-score-service". No lo
es.

Qué se espera: no elegir TABLA, elegir MEDICIÓN MÁS RECIENTE. Las dos traen
fecha (date y measured_at). Compáralas. Y alinea las dos superficies.

# 🔴 B7 · Dos filas para el mismo día, resultado no determinista

plan-semanal-service.ts:25-29 consulta sin ORDER BY y asignacionDeHoy
(plan-semanal-core.ts:76-80) toma la primera que empate el día. Nada impide
que convivan una fila con routine_id (del coach o de ScheduleModal) y otra
con focus: savePlanSemanal solo borra las de focus.

Caso: el coach me agendó "Piernas de acero" el lunes; yo puse lunes = Empuje.
Postgres no garantiza orden, así que unos días Entrenar dice una cosa y otros
la otra. Silencioso y difícil de reproducir.

Qué se espera: regla de precedencia explícita y un ORDER BY que la
implemente. Decide si gana el coach o el usuario y defiéndelo.

Relacionado: plan-semanal-service.ts:63 tienePlan: rows.length > 0 cuenta
filas del coach y specific_date vencidas, así que "Cambiar mi plan" puede
abrir en blanco. Y /plan-entrenamiento dice "Descanso" en días que el coach
sí asignó, porque planDeFilas los ignora.

# 🔴 B8 · Android: el piso de 150 m tira natación y remo reales

En Android la distancia NO viene del workout: health-import-service.ts:219 la
saca de aggregateRecord({recordType:'Distance', timeRangeFilter: ventana}),
que suma TODA la distancia del usuario en esa ventana, incluida la caminata
ambiental derivada de pasos.

Caso: nado en alberca de 40 minutos donde el teléfono acumuló 120 m de
caminata en la ventana. distanceMeters = 120, positivo y menor a 150, y
esImportable lo tira. ANTES ENTRABA. Es regresión, y no la causa el null:
la causa el ruido positivo. Mismo caso con remo en máquina y caminadora.

Qué se espera: que el piso de distancia solo aplique donde la distancia es
señal real de la actividad, no donde es ruido agregado. Ya tienes el tipo
crudo propagado: úsalo.

# 🟡 MENORES (pueden ir juntos en uno o dos commits)

1. ?focus=weight_kg NO está implementado. El campo Peso de
   app/edad-atp/composition.tsx:181 es el único sin highlight={focus === ...},
   y data-capture-routes.ts no declara weight_kg. El link solo abre editMode.
   Es el punto 1 del device test y hoy fallaría.
2. composition.tsx:126 acepta negativos. Se guarda -5, medidas-core.ts lo
   filtra con v > 0, y /medidas dice "Sin medidas registradas todavía"
   después de un guardado que la app confirmó como exitoso.
3. DECIMAL(5,1) trunca en silencio: el usuario teclea 82.37, la app confirma,
   y al volver ve 82.4 con un delta calculado sobre otro número. Redondea
   antes de escribir. Y falta CHECK de rango: 12345 revienta con 22003 y el
   usuario solo ve "No se pudo guardar".
4. El copy nuevo de cardio vive solo en el estado vacío
   (cardio-import.tsx:258). Quien importó dos carreras y no ve sus tres
   caminatas no recibe explicación. Y "unos cuantos metros" minimiza: son 150.
5. Un hábito graduado se reactiva de un toque en hoy-habitos.tsx:149 y pierde
   graduated_at sin confirmación, en una pantalla cuyo gesto natural es
   prender y apagar.
6. getCycleInfo sin guarda de frescura: usuaria que dejó de registrar hace
   seis meses ve "Fase lútea, día 187" en Entrenar. /cycle sí la protege.
   (Se resuelve con B1 si metes la guarda en la resolución única.)
7. El gate de Entrenar falla abierto: fitness-train.tsx:62 hace
   if (alive && info) setFase(...) y nunca vuelve a null. Al cambiar a modo
   acompañante sin desmontar, la tira de fase anterior se queda pintada.
8. Alias que prometen de más: app-registry.ts:112 incluye 'grasa' y
   'composición', y /medidas no muestra ninguna de las dos.
9. app/fitness-train.tsx:72 con hoy?.routine_id manda a /my-routines, no abre
   la rutina asignada. El usuario tiene que volver a buscarla.
10. no_processed_foods y screen_time_cutoff NUNCA se reactivan por
    instalación porque están en ELECTRONS_SIN_APP. No es callejón sin salida
    (/ordenar-dia los rescata), pero tu reporte dijo "los MANDATORY" sin
    precisarlo. Corrige la afirmación en el delivery.

# 📌 NOTA

CycleCalendar.tsx no tiene un solo importador vivo (grep en app/ y src/: solo
lo nombra su propio test). La consolidación y el ratchet están amarrando un
componente muerto. Decide si se borra o se conecta, y repórtalo.

No corras el device test todavía: los puntos 1, 3 y 6 fallarían por B1, B5 y
el ?focus.
