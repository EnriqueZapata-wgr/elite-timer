# 🎯 Los 10 perfiles · casos de uso que configuran la app

**Fecha:** 5-ago-2026 · Enrique + Cowork
**Estado:** propuesta para revisión. Los nombres necesitan visto bueno de Mariana antes de código.

---

## La idea en una frase

> *"La distancia entre dolor y solución es implementación. Queremos estar lo más arriba
> posible en la escala hazlo-tú / hazlo-contigo / hazlo-por-ti."*

Cada perfil genera **un pack**: un conjunto que instala apps, enciende hábitos con su horario,
fija metas, configura avisos y le dice a ARGOS en qué fijarse.

**Y el pack es el mismo mecanismo** que ya decidimos para los protocolos y para los paquetes de
salud. Se construye una vez y sirve para las tres cosas.

---

## Anatomía de un pack

| Campo | Qué es |
|---|---|
| **Instala** | apps que aparecen en la sala ATP |
| **Enciende** | hábitos que nacen en TAREAS, con su momento y su hora |
| **Fija** | metas: agua, proteína, ventana de ayuno, ventana de sueño |
| **Avisa** | qué notifica y bajo qué condición |
| **Mide** | los registros con los que se sabe si está funcionando |
| **ARGOS mira** | el foco de su contexto para este perfil |
| **NO instala** | lo que deliberadamente se queda fuera |

⚠️ **La última fila es la que define el pack.** Cualquiera hace una lista de lo que ayuda. Lo
difícil es decidir qué se queda fuera aunque también ayude. Un pack de quince cosas se abandona
en una semana.

---

## ⚠️ La regla de nombres, no negociable

**Ningún pack puede nombrar una enfermedad, un diagnóstico ni un tratamiento.**

| ❌ Nunca | ✅ Así |
|---|---|
| Tratar mi diabetes | Cuidar mi glucosa |
| Controlar mi ansiedad | Bajar revoluciones |
| Curar mi insomnio | Dormir mejor |
| Revertir mi resistencia a la insulina | Cuidar mi glucosa |

Lo encuentra exactamente la misma persona buscando exactamente lo mismo, y **no hacemos ninguna
declaración médica.** Es el mismo criterio de `MedicalDisclaimer` y del posicionamiento
*"no cura, te optimiza"*.

---

# LOS 10 PERFILES

---

## 1 · Bajar revoluciones

**Quién es.** Profesional de 40 y tantos con la agenda llena. No duerme mal por el cuerpo:
duerme mal por la cabeza. Trae los hombros arriba desde hace años y ya no lo nota.

**Su dolor.** *"No puedo apagar la cabeza."*

| | |
|---|---|
| **Instala** | Respirar · Meditar · Emociones · Journal · Sueño |
| **Enciende** | `breathwork` · `checkin` · `meditation` · `journal` · `screen_time_cutoff` |
| **Mide** | coordenada del check-in en el tiempo, sesiones de respiración, hora real de dormir |
| **ARGOS mira** | qué días se dispara la coordenada y qué los precede |
| **NO instala** | Comida, Entrenar, Glucosa, Labs |

🕳️ **Hueco honesto.** Sin wearable no medimos HRV. **El estrés aquí es auto-reportado**, y eso
está bien mientras no prometamos lo contrario.

---

## 2 · Dormir mejor

**Quién es.** Se acuesta a la 1 revisando el teléfono, despierta a las 7 arrastrando, y a las
11 de la mañana ya va por el tercer café.

**Su dolor.** *"Duermo ocho horas y amanezco cansado."*

| | |
|---|---|
| **Instala** | Sueño · Meditar · Respirar · Sol · Suplementos |
| **Enciende** | `sleep` · `sunlight` · `red_glasses` · `screen_time_cutoff` · `breathwork` |
| **Fija** | ventana de sueño según cronotipo · cocina cerrada 3 h antes |
| **Avisa** | ventana de sol al abrirse · corte de cafeína · hora de bajar revoluciones |
| **Mide** | hora real de dormir, minutos de sol antes de las 10, cafeína después de las 12 |
| **ARGOS mira** | la distancia entre tu hora objetivo y la real, y qué la mueve |
| **NO instala** | Comida, Entrenar, Glucosa, Journal, Récords, Labs |

🕳️ **Hueco honesto.** **No hay medición objetiva de calidad de sueño.** Medimos la hora de
acostarse, que es lo único accionable sin wearable, y es honesto decirlo así.

---

## 3 · Energía estable

**Quién es.** Come "bien" según él. Arranca fuerte, se cae a las 3 de la tarde, y lo resuelve
con café y algo dulce. Lleva años pensando que así es la vida adulta.

**Su dolor.** *"A media tarde me apago."*

| | |
|---|---|
| **Instala** | Comida · Glucosa · Ayuno · Sueño · Sol · Labs |
| **Enciende** | `protein` · `water` · `sunlight` · `sleep` · `glucose_log` |
| **Fija** | meta de proteína · meta de agua |
| **Mide** | glucosa antes y dos horas después de comer, proteína del día, hora de dormir |
| **ARGOS mira** | qué comidas preceden la caída |
| **NO instala** | Entrenar, 1RM, Récords, Ciclo, N-Back |

🕳️ **Hueco honesto.** Amarrar la caída con la comida **exige que registre las dos cosas**, y esa
es la fricción más alta de los diez packs. Es el que más necesita que Comida sea rápida de usar.

---

## 4 · Bajar grasa

**Quién es.** Ha bajado y subido lo mismo tres veces. Sabe qué hacer, no sostiene el cómo.

**Su dolor.** *"Bajo y lo recupero todo."*

| | |
|---|---|
| **Instala** | Comida · Ayuno · Entrenar · Cardio · Recetas · Lista |
| **Enciende** | `protein` · `water` · `no_processed_foods` · `strength` · `cardio` |
| **Fija** | meta de proteína · ventana de ayuno |
| **Mide** | proteína diaria, ventana cumplida, sesiones de fuerza por semana |
| **ARGOS mira** | adherencia a proteína contra sesiones de fuerza |
| **NO instala** | N-Back, Journal, Labs, Cetonas |

🕳️ **Hueco grande.** **No existe app de peso corporal ni de medidas.** Es el pack cuyo resultado
no podemos mostrar. Sin eso, este perfil no está cubierto de verdad.

---

## 5 · Ganar músculo

**Quién es.** Entrena desde hace rato, ya no progresa, y no lleva registro de nada.

**Su dolor.** *"Entreno duro y me veo igual."*

| | |
|---|---|
| **Instala** | Entrenar · 1RM · Récords · Comida · Recetas · Lista · Suplementos |
| **Enciende** | `strength` · `protein` · `supplements` · `sleep` |
| **Fija** | meta de proteína alta |
| **Mide** | cargas por ejercicio, 1RM estimado, proteína diaria, sesiones por semana |
| **ARGOS mira** | si la carga sube y si la proteína la acompaña |
| **NO instala** | Glucosa, Cetonas, Emociones, N-Back |

🕳️ **Hueco grande.** **No hay asignación de rutina al día.** El usuario tiene que decidir cada
día qué entrena, que es justo lo que un pack debería resolverle. Este perfil lo sufre más que
ninguno.

---

## 6 · Volver a moverme

**Quién es.** Lleva tres años sin entrenar. Se siente ridículo empezando y por eso no empieza.
**No quiere un programa: quiere no fallar el primer mes.**

**Su dolor.** *"Empiezo el lunes y para el jueves ya lo dejé."*

| | |
|---|---|
| **Instala** | Movilidad · Entrenar · Rachas |
| **Enciende** | `steps` · `strength` |
| **Fija** | meta de pasos conservadora |
| **Mide** | racha, sesiones por semana |
| **ARGOS mira** | la racha, y aparece cuando está por romperse |
| **NO instala** | **casi todo.** Este pack es deliberadamente el más chico de los diez. |

🕳️ **Hueco.** Mismo que el 5: **sin rutina asignada**, y aquí duele más porque este usuario no
sabe qué hacer en el gimnasio. Falta también una progresión de principiante absoluto.

---

## 7 · Cuidar mi glucosa

**Quién es.** Le salió el estudio alterado, o ya trae diagnóstico y tratamiento con su médico.
**Quiere un vehículo donde quede todo registrado y que pueda enseñarle a su doctor.**

**Su dolor.** *"Voy con el doctor y no sé qué contarle."*

| | |
|---|---|
| **Instala** | Glucosa · Comida · Ayuno · Cetonas · Labs · Entrenar · Sol |
| **Enciende** | `glucose_log` · `protein` · `no_processed_foods` · `water` · `strength` · `lab_upload` |
| **Fija** | meta de proteína · ventana de ayuno conservadora |
| **Mide** | glucosa en ayuno y postprandial, GKI, HbA1c de laboratorio |
| **ARGOS mira** | qué comidas mueven la glucosa de esta persona en particular |
| **NO instala** | N-Back, Récords, 1RM, Journal |

⚠️ **Es el pack con más carga legal de los diez.** ATP acompaña y registra; **no ajusta
medicación, no interpreta estudios y no sustituye a nadie.** El copy de entrada debe decirlo sin
rodeos y Mariana debe firmarlo.

🕳️ **Hueco grande.** **No existe exportar un reporte para el médico.** Y ese es literalmente el
trabajo que este usuario nos está contratando a hacer. Sin eso, el pack promete algo que no
entrega.

---

## 8 · Foco y claridad

**Quién es.** Trabaja con la cabeza. Siente que perdió filo, se distrae, relee el mismo párrafo
tres veces.

**Su dolor.** *"Ya no me concentro como antes."*

| | |
|---|---|
| **Instala** | N-Back · Meditar · Sueño · Ayuno · Comida · Emociones |
| **Enciende** | `nback` · `meditation` · `sleep` · `screen_time_cutoff` · `protein` |
| **Mide** | score de N-Back en el tiempo, hora de dormir, sesiones de meditación |
| **ARGOS mira** | el score contra las noches que durmió bien |
| **NO instala** | Entrenar, Cardio, Récords, Glucosa, Labs |

🕳️ **Hueco.** **N-Back es nuestra única medición cognitiva** y mide memoria de trabajo, no
atención sostenida. Es angosto para lo que el perfil promete.

---

## 9 · Mi ciclo a mi favor

**Quién es.** Mujer que entrena y trabaja fuerte, y que lleva años peleándose con dos semanas
de cada mes en vez de aprovecharlas.

**Su dolor.** *"Hay semanas en las que todo me cuesta el doble y no sé por qué."*

| | |
|---|---|
| **Instala** | Ciclo · Entrenar · Comida · Emociones · Sueño |
| **Enciende** | `period_log` · `checkin` · `strength` · `protein` |
| **Mide** | fase, síntomas, energía y humor por fase |
| **ARGOS mira** | el patrón de energía por fase de ESTA persona, no el promedio |
| **NO instala** | N-Back, Cetonas, 1RM, Labs |

⚠️ **Doctrina bidireccional**: folicular se intensifica, lútea se escucha. **No es un pack de
"baja el ritmo dos semanas."**

🕳️ **Hueco.** **Entrenar no sabe en qué fase estás.** Sin eso el pack solo informa, no adapta,
y adaptar es lo que lo haría valioso.

---

## 10 · Cumplir años sin envejecer

**Quién es.** Ya está bien y quiere estar mejor. Se hace estudios por gusto. **Es quien compra
Pro.**

**Su dolor.** *"Estoy bien, pero quiero saber si voy ganando o perdiendo."*

| | |
|---|---|
| **Instala** | Edad ATP · Labs · Protocolos · Sol · Ayuno · Cetonas · Entrenar · Sueño |
| **Enciende** | `lab_upload` · `functional_quiz` · `sunlight` · `strength` · `sleep` · `intervention` |
| **Mide** | Edad ATP, biomarcadores en el tiempo, adherencia a intervenciones |
| **ARGOS mira** | qué mueve su Edad ATP y qué no |
| **NO instala** | nada se le niega: es el perfil que sí quiere todo |

🕳️ **Hueco.** **La Edad ATP necesita laboratorios para ser precisa**, y subirlos es la fricción
más alta de la app. Es el pack que más depende de una pieza que todavía cuesta trabajo usar.

---

# 🕳️ LOS 5 HUECOS ESTRUCTURALES

El ejercicio sirvió sobre todo para esto. **Cinco huecos bloquean seis de los diez packs**, y son
el backlog real de V2:

| # | Hueco | Bloquea |
|---|---|---|
| **H1** | **No hay peso corporal ni medidas** | Bajar grasa |
| **H2** | **No hay asignación de rutina al día** | Ganar músculo · Volver a moverme |
| **H3** | **No hay reporte exportable para el médico** | Cuidar mi glucosa |
| **H4** | **Entrenar no conoce la fase del ciclo** | Mi ciclo a mi favor |
| **H5** | **Subir laboratorios es demasiado fricción** | Cumplir años sin envejecer |

⚠️ H2 y H3 son los caros. **H1 es barato** (una app de registro más una gráfica) y desbloquea el
perfil comercialmente más grande.

---

# 🚪 LA ENTRADA · tres preguntas

Quien no quiere cuestionario largo contesta tres cosas y ya tiene la app configurada:

| Pregunta | Qué configura |
|---|---|
| **¿Qué quieres cambiar primero?** | elige el pack |
| **¿A qué hora despiertas y a qué hora te duermes?** | acomoda TODOS los horarios del pack a su vida |
| **¿Cuánto quieres que te empuje?** | tres hábitos o seis |

**El cuestionario largo sigue existiendo** para quien quiera precisión, y al terminarlo recomienda
uno o dos packs con lo que respondió. **Deja de ser el peaje de entrada.**

⚠️ La segunda pregunta es la más subestimada: es la diferencia entre un recordatorio útil y uno
que se ignora a los tres días.

---

# 🧪 Y ADEMÁS ES EL PLAN DE PRUEBAS

Hoy no tenemos cómo saber si nutrición "funciona", porque no existe una definición de funcionar.

**Con un pack sí:** *¿una persona con este dolor puede completar su semana sin atorarse?*

Diez packs son **diez recorridos completos de punta a punta.** Ahí van a salir los hoyos de
recetas, lista de súper, fitness y avisos — no revisando pantallas sueltas.

---

# ⏭️ PENDIENTES ANTES DE CÓDIGO

1. **Mariana revisa los diez nombres** y el copy de entrada del 7.
2. Decidir si los packs de salud se instalan como paquete (pendiente de plática).
3. Escribir el copy de cada pack: qué es, para quién, qué esperar.
4. Decidir cuáles de los cinco huecos entran a V2 y cuáles esperan.
