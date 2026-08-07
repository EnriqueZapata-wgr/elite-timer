# 🔴 VUELTA 3 · MB-27. Audit de Cowork sobre 84f2e91: SIGUE ROJO.

Cerrados limpio: B2 y B7. A medias: B3. No cerrados: B1, B4, B5, B6, B8.

Sigue el MODO REMOTO: misma rama feat/mb27-cuerpo, commits nuevos, push, y
te detienes. Sin merge, sin db push, sin OTA, sin tocar app.json. Las
migraciones 256 y 257 siguen pendientes y esta vuelta no debe agregar
ninguna.

MÉTODO, y esto es lo más importante de la vuelta:
Cuatro de las ocho correcciones anteriores arreglaron el caso exacto del
audit y rompieron el sistema alrededor. El caso del audit es un EJEMPLO, no
la especificación. Antes de dar por cerrado cada hallazgo, enumera en el
reporte qué OTROS casos pasan por la línea que tocaste y qué pasa con cada
uno. Si no puedes enumerarlos, no está cerrado.

--------------------------------------------------------------------------

# 🔵 CAMBIO DE DOCTRINA · EL TECHO DEJA DE SER UN LÍMITE

Decisión de Enrique, y manda sobre lo que diga MB-26:

  "Yo no quiero techo. Puede instalar todo si quiere. Solo orientar."

El techo de 8 renglones nació para proteger el día y se convirtió en un
portero. Se retira como límite y se queda como información.

## Qué MUERE

- El Alert interruptivo "Tu día ya está lleno" en las CUATRO puertas:
  app/centro/[appKey].tsx, app/hoy-habitos.tsx, app/packs/armar.tsx y
  app/plan-entrenamiento.tsx. Encender es encender. Cero fricción, cero
  confirmación, cero "¿seguro?".
- TECHO_RENGLONES como umbral que decide si se avisa o no.
- Con esto MUEREN, sin arreglarse, tres hallazgos: B3 (media puerta),
  el aviso falso en apps que no encienden nada, y el techo inalcanzable
  desde el día uno (los 5 MANDATORY más los defaults ya rebasaban 8, así que
  el aviso le salía a todo usuario nuevo en cada instalación).
- ⚠️ NO borres B2. Ya está cerrado y su lógica (que se evalúe la misma lista
  que se enciende) sigue siendo correcta para el CONTEO. Solo deja de
  bloquear.

## Qué VIVE

- La graduación, el reposo y /ordenar-dia: intactos. La puerta de salida era
  lo valioso de MB-26 y no se toca.
- Los candidatos a reposo, o sea "lo que más te ha costado": siguen
  existiendo, pero viven en /ordenar-dia, que es donde el usuario va cuando
  QUIERE ordenar. No se le empujan cuando está haciendo otra cosa.
- El conteo de renglones activos: sigue calculándose. Cambia dónde se
  muestra.

## Qué NACE

Un renglón discreto en HOY, siempre visible, sin umbral:

  "20 hábitos activos · ordenar mi día"  → lleva a /ordenar-dia

⚠️ Siempre visible, no a partir de un número. Si lo condicionas a un umbral
reinventaste el techo con otro nombre. Es un dato honesto que está ahí para
quien lo quiera mirar.

⚠️ Tono: informa, no regaña. Nada de "demasiados", "llena", "excede",
"deberías". El número y la salida. Que se sienta como el marcador de tu
propio día, no como una advertencia.

⚠️ Jerarquía: es un renglón discreto, no una card ni un banner. Lee el design
system: esto NO es protagonista de la pantalla.

Reporta el copy exacto que elegiste y por qué.

# 🔴 N1 · REGRESIÓN NUEVA · una sesión de fuerza entra como cardio

src/services/fitness/health-import-core.ts:141-149.

Al condicionar el piso a distanciaPropia, se lo quitaste TAMBIÉN a
discipline: 'other', que era donde más falta hacía.

Caso: sesión de fuerza en el gym (Health Connect tipo 80 → 'other'), 45 min,
20 m de distancia agregada por caminar entre máquinas. Duración pasa,
esCaminata false pasa, 'other' con distancia positiva pasa, y el piso ya no
aplica. SE IMPORTA COMO CARDIO. Y importOtorgaElectron (línea 206) solo pide
dateLocal === hoy && durationSeconds > 0, así que le otorga el electrón de
cardio por haber levantado pesas. Igual con yoga, pilates y básquet.

Antes de e44ac07 esos 20 m lo mataban.

Son DOS preguntas distintas que colapsaste en una bandera:
  1. ¿La distancia es ruido ambiental? Solo en los indoor MAPEADOS (alberca,
     remo de máquina, caminadora). Ahí el piso no debe aplicar.
  2. ¿'other' tiene evidencia de ser ejercicio? La distancia era su único
     discriminante. Ahí el piso SÍ debe seguir aplicando, siempre.

Sepáralas. Y de paso: una carrera outdoor real con GPS fallido (40 m en 30
minutos) hoy se pierde en silencio; decide si merece salvavidas por duración
y defiéndelo.

El copy de app/cardio-import.tsx:261 y :352 dice "los registros con GPS menor
a 150 metros se quedan fuera" y ya no es cierto. Alinéalo en el mismo commit.

# 🔴 B1 · El ciclo: la resolución es única, la precedencia creó un zombi

La función quedó única y las bandas migraron. Bien. Pero decidir que
cycle_periods manda choca con cómo se llena esa tabla.

app/cycle.tsx:429 sigue igual: if (d.is_period) await recalcPeriods().
cycle_periods SOLO se reconstruye al MARCAR, nunca al desmarcar.

Caso: ciclos reales 24-jul, 23-jun, 23-may. La usuaria marca por error el
20-ago. recalcPeriods escribe start 2026-08-20. Luego DESMARCA. saveEditor no
recalcula porque is_period es false. Los logs quedan bien, cycle_periods
queda con basura.

ANTES: /cycle leía logs y volvía sola a "Día 28, Lútea" al instante.
AHORA: /cycle, Entrenar, day-compiler, ARGOS, recetas y prescripción dicen
todas "Día 1, Menstrual" hasta que vuelva a marcar un período.

Convertiste un error local y auto-reparable en uno global y permanente.

Agravante: el hueco 24-jul a 20-ago son 27 días y pasa el filtro de
cycle-length-core.ts:35 (20 a 45), así que observedCycleLength promedia sobre
un ciclo que nunca existió, y la card afirma "promedio de tus últimos 3
ciclos registrados" sobre basura.

Camino sugerido, defiéndelo o propón mejor: recalcPeriods debe correr ante
CUALQUIER cambio de is_period, no solo al marcar. Cubre también el caso de
app/cycle.tsx:454, donde desmarcar TODOS los días deja cycle_periods intacta.

Y quedaron DOS ANCLAS en el mismo calendario: las bandas de fase usan
resolucion.inicio (app/cycle.tsx:693) pero predictions sigue anclado a
lastPeriodStart de logs (líneas 309, 313, 317), y isOv/isFert se evalúan
ANTES que la banda (673-674), así que ganan. Card "Día 1 Menstrual" con el
punto de ovulación en otra fecha, en un solo scroll. Math.round(cl / 2) sigue
vivo y sigue aparte.

SERIO: la guarda de frescura se metió una capa demasiado arriba.
emotion-history-service.ts:213 depende de getCycleInfo; ahora una usuaria con
último inicio hace 46 días pierde el overlay de fase de los 30 días
completos, incluidos los que sí se podían resolver.

SERIO: el largo cambió de fuente en silencio fuera de /cycle. El brief pedía
que SIEMPRE se diga de dónde salió el número; fitness-train.tsx pinta fase y
día sin una palabra de procedencia.

El ratchet volvió a ser textual (fs.readFileSync + toMatch). Por eso no
detectó nada de esto. El test tiene que comparar la fase ENTRE superficies
con los mismos datos.

# 🔴 B4 · Ya no destruye, pero miente y revive días apagados

plan-semanal-service.ts:135-141: si la poda falla, logWarn y return ok: true.
El comentario dice "el próximo guardado limpia". Eso cubre cambios, NO
borrados.

Caso: plan lunes = empuje, jueves = tracción. El usuario APAGA el lunes y
guarda. Entra la fila nueva de jueves, la poda revienta. Quedan la vieja de
lunes y las nuevas. planDeFilas elige el más nuevo POR DÍA, y para lunes no
hay nada más nuevo que le gane: el lunes VUELVE. Y la pantalla ya dio
haptic.success().

Peor: plan vacío (sin insert) con poda fallida = el plan entero sobrevive y
el usuario recibe éxito.

Si la poda falla, el guardado no fue exitoso. Dilo.

# 🔴 B5 · La red decide qué rutina te toca hoy

today-session-service.ts:67,71,97. El enfoque asignado viaja por red y prefs
sale de AsyncStorage, sin caché local de la asignación.

Caso: martes = tracción asignado. 8am con señal: "TU PLAN · HOY TOCA
Tracción", lista A. 1pm en el gimnasio sin señal, useFocusEffect recarga, la
asignación da null, enfoqueUsado cae a la pref vieja: mismo seed, enfoque
distinto, OTRA rutina, y el kicker pierde el "TU PLAN".

Rompe el determinismo que el propio servicio documenta. Cachea la asignación
del día en local y úsala cuando la red falle.

# 🔴 B6 · Dos huecos, uno nuevo

1. Filtro asimétrico. health-score-service.ts:109 (getLatestMeasurement)
   ordena por date DESC LIMIT 1 SIN .not('weight_kg','is',null); nutrition sí
   filtra. Caso: hoy el usuario captura solo cintura (fila con weight_kg
   null), tenía 90 kg el 1-ago ahí y su coach midió 95 kg el 1-jul. Nutrition
   elige 90, health-score ve null y elige 95. Dos pesos el mismo día, justo
   lo que prometiste cerrar.

2. Mezcla de épocas (regresión nueva). El peso se elige por recencia pero
   body_fat_pct, muscle_pct y visceral_fat siguen atados a body?.X ?? default
   sin prueba de recencia. Caso: body_measurements de 2024 con 100 kg y 30 %
   de grasa; health_measurements de 2026 con 80 kg sin grasa. Antes: peso y
   grasa de la misma medición. Ahora: peso de 2026 con grasa de 2024, y de
   ahí sale un FFMI que nunca existió y la edad biológica construida sobre
   él.

La recencia se aplica al REGISTRO, no a un campo suelto. Si tienes que
completar un campo desde el otro registro, decide una regla explícita y
defiéndela en el reporte.

# 🟡 ABIERTOS DE LA VUELTA 1, no se tocaron

1. El plan propio se filtra al panel del coach.
   coach-panel-service.ts:268-271 no filtra routine_id, y savePlanSemanal
   escribe assigned_by: userId, así que ClientDetailScreen.tsx:3552 pinta
   borde TEAL. Un cliente con plan de 5 días le muestra al coach cinco chips
   "Rutina" como si él los hubiera asignado.
2. ?focus=weight_kg sigue sin abrir el teclado. Ya hay highlight y ya está en
   rutas, pero highlight es solo tinte: falta autoFocus y scroll. Es el punto
   1 del device test.

# 📦 REPORTE

Un commit por bloque. En el reporte, además de lo de siempre:
1. El copy exacto del renglón de conteo en HOY y por qué ese.
2. Por cada hallazgo cerrado, la ENUMERACIÓN de los otros casos que pasan por
   la línea que tocaste, con qué pasa en cada uno.
3. Tu decisión y defensa en: recalcPeriods, el salvavidas de la carrera con
   GPS fallido, y la regla para completar campos entre registros de distinta
   fecha.
