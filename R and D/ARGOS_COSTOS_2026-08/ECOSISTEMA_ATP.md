# Cómo ATP se siente premium
## El número que no se redondea, y el ritmo que convierte una app en un lugar

**Fecha:** 14 de agosto de 2026

**Las dos preguntas de Enrique son la misma pregunta.** *"$990, ah, mil pesos"* solo es un problema si la categoría en la cabeza de la persona es **app**. Si la categoría es **mi salud**, mil pesos es barato.

> **El precio no se defiende con el precio. Se defiende con la categoría.**

Este documento resuelve las dos: primero el número, que es lo fácil, y luego el ritmo, que es lo que de verdad cambia la categoría.

---

# PARTE 1 · El número

## El problema del redondeo es real

| Precio | Cómo lo lee la cabeza |
|---|---|
| **$990** | *"novecientos noventa"* → **redondea a mil** |
| $950 | *"novecientos cincuenta"* → no redondea, pero suena a número raro |
| **$890** | *"ochocientos noventa"* → **no redondea. Vive en los ochocientos** |
| $1,190 | *"mil ciento noventa"* → cruza a propósito, sin disculparse |

## Y $890 tiene una geometría que $990 no tiene

> **$890 × 10 = $8,900 exacto.**

El anual que te gustó sale de una multiplicación limpia: **dos meses de regalo, sin inventar nada, sin tachado forzado.**

Y el número anual, $8,900, **no se redondea a nada.** No es "casi diez mil", es ocho mil novecientos. Es su propio número, y eso lo hace sonar considerado en vez de aproximado.

| | $890 | $990 |
|---|---|---|
| Cómo se lee | ochocientos noventa | **mil** |
| Anual con 2 meses de regalo | **$8,900 exacto** | $9,900 |
| Founder $4,990 | **5.6 meses**, "pagas seis" | 5.0 meses |
| Descuento de Founder | 84%, creíble | 86%, creíble |
| Miembros que necesitas | **236 a 301** | 212 a 270 |

**Lo que cuesta bajar de $990 a $890: entre 25 y 31 personas más.** Ese es el precio exacto de que nadie diga "mil pesos".

**Mi voto es $890 al mes y $8,900 al año**, y el argumento de peso no es el redondeo, es que **la aritmética del anual queda limpia** y eso se nota en la página.

## Las tres reglas de cómo se dice el precio

**Uno. El precio nunca va primero.** El orden es: qué es → contra qué compite → cuánto cuesta. Si la persona lee el número antes de tener una referencia, lo compara contra la nada, y contra la nada todo es caro.

**Dos. El anual es el titular. El mensual es la alternativa.**

> **$8,900 el año.**
> *O $890 al mes, si prefieres ir mes con mes.*

Presentado así, **la palabra "mil" nunca aparece en la conversación.**

**Tres. Nunca el precio por día.** *"Solo $30 al día"* es lo que hace el gimnasio y la aseguradora, y comunica *"sé que esto es caro, déjame hacértelo chiquito"*. **Una marca premium dice su precio completo y deja que el valor lo sostenga.** Empequeñecer el número es admitir que no lo vale.

---

# PARTE 2 · Qué hace que se sienta un ecosistema y no una app

## La definición, en una línea

> **Una app es algo que abres. Un ecosistema es algo donde pasan cosas sin que las pidas.**

Esa es toda la diferencia, y se construye con siete cosas. **Las siete ya existen en tu producto o están a un paso.**

---

## 1 · Que te hablen primero

Lo que separa a un instrumento de un acompañante es **quién empieza la conversación.**

| Ya existe | Qué hace |
|---|---|
| `argos_daily_insights` | El insight diario llega solo |
| `weekly_insights` | El resumen semanal, los domingos |
| `agenda_events` y su cron | Los avisos de tu día |

🔴 **Y esto es lo que hay que cuidar:** un insight genérico rompe el efecto en vez de crearlo. *"Recuerda tomar agua"* dice que nadie te está viendo. **El insight tiene que citar algo tuyo:** lo que registraste ayer, la racha que llevas, el valor que se movió.

**La prueba de una línea: si el insight de hoy le sirviera igual a otra persona, no sirve.**

Esa es también la razón real por la que el insight sube a Sonnet con cerebro. No es un gasto: **es la diferencia entre un recordatorio y alguien que te conoce.**

---

## 2 · Que se note que hay gente adentro

| Existe | Filas hoy |
|---|---|
| `community_presence` | 4 |
| `friendships` | 3 |
| **`activity_feed`** | **0** 🔴 |
| **`challenges`** | **0** 🔴 |

**Un muro vacío es peor que no tener muro.** Es la prueba visible de que estás solo, y en un producto que vende tribu, eso mata.

**Lo primero que hay que hacer, y no es código: llenarlo.** El feed se alimenta solo con hechos de constancia: *alguien llegó a 7 días de racha, alguien completó el reto, alguien entró al círculo de dormir*. Eso ya está construido.

**Y los retos son el corazón del ritmo, y están en cero.** El motor está terminado, revalidado del lado del servidor, con liquidación idempotente. Solo le faltan filas.

---

## 3 · Que haya ritmo, no solo pantallas

Esto es lo que más se parece a un ecosistema y lo que menos se nota que falta.

| Cuándo | Qué pasa | De dónde sale |
|---|---|---|
| **Cada mañana** | Tu insight, citando algo tuyo | `argos_daily_insights` |
| **Cada día** | Tu día armado, con tus horarios reales | packs y las tres preguntas |
| **Domingo** | Tu resumen de la semana | `weekly_insights` |
| **Día 10 del mes** | **Arranca el reto**, cuando se acabó la novedad | `challenges` |
| **Una vez al mes** | **La sesión en vivo**, con las preguntas votadas | lo que ya das |
| **Día 30** | **Recálculo de tu Edad ATP**, y qué la movió | `RecalculateDiff.tsx` |
| **Cada trimestre** | Tu diagnóstico funcional se actualiza | `functional_dx` |

> **Un calendario compartido es lo que convierte usuarios en miembros. Si el jueves siempre pasa algo, el jueves te acuerdas de que perteneces.**

---

## 4 · Que el sistema te recuerde

`argos_dx_memory` y `functional_dx` ya existen. Lo que falta es que **se note**.

La frase que crea la sensación: *"Hace tres meses me dijiste que las tardes eran lo peor. Mira esto."*

**Nada hace sentir más acompañado que alguien que se acuerda de lo que dijiste.** Y nada hace sentir más solo que un producto que te pregunta lo mismo cada vez.

---

## 5 · Que haya lugares, no pantallas

Y esto ya lo hiciste bien sin darte cuenta. **Tus pestañas se llaman como lugares, no como funciones:**

**HOY · Salud · Tribu · Progreso · Biblioteca · Kit · Yo**

Ninguna se llama "Dashboard", "Ajustes" o "Mi cuenta". **Tribu es un lugar. Kit es un lugar. Yo es un lugar.** Eso es arquitectura de ecosistema y ya está en producción.

**La regla para lo que venga: si una pantalla nueva se puede llamar como un lugar, se llama como un lugar.**

---

## 6 · Que puedas ver a los tuyos, sin ver su salud

| Existe | Para qué |
|---|---|
| `cycle_companions` | Compañero de ciclo, ya construido |
| `friendships` | Ver la racha de los tuyos |
| `challenge_participants` | La tabla del reto |
| `mood_shares` | Compartir cómo vas, si tú quieres |

🔴 **La línea que no se cruza: se comparte constancia, nunca salud.** Rachas, retos completados, presencia. **Ni un valor de laboratorio, ni un peso, ni un síntoma, jamás, ni siquiera con permiso.** Un dato clínico en un muro es un problema legal y es la forma más rápida de que alguien deje de registrar con honestidad.

---

## 7 · Que el servicio se sienta cercano, sin tiempo individual

Esto es lo que pediste y sí se puede dar en formato grupal. **Cercanía no es exclusividad, es respuesta y memoria.**

| Promesa | Cómo se cumple sin horas individuales |
|---|---|
| **Toda pregunta en la comunidad se contesta en menos de 24 horas** | Es la promesa de servicio más poderosa y más barata que existe. Se cumple con presencia, no con consultas |
| **Un mensaje de bienvenida real el día uno** | Escrito para que se sienta escrito. Una pregunta de vuelta, no un folleto |
| **Alguien nota cuando desapareces** | A los 7 días sin registrar, llega algo. Y no es un push automático: es una pregunta |
| **Tu pregunta se vota y se contesta con tu nombre** | En la sesión mensual. Grupal, y aun así personal |
| **Cuando cancelas, alguien pregunta por qué** | La cancelación en dos toques, y después una pregunta honesta |

> **La cercanía premium no es que te atiendan a ti solo. Es que nunca te quedes esperando.**

---

# PARTE 3 · Las cinco cosas que matan la sensación premium

Y todas son gratis de evitar.

**Uno. Un muro vacío.** Ya está en cero. Se arregla llenándolo.

**Dos. Un insight genérico.** *"Toma agua"* le dice a la persona que nadie la está viendo.

**Tres. Cualquier medidor.** Un contador de tokens, de mensajes o de H+ por preguntar convierte el producto en un taxi. Ya está decidido que se va.

**Cuatro. Una notificación que no valía la pena.** Cada push que no aportó nada le resta un poco al siguiente. **Tres al día y la persona apaga las notificaciones, y ahí perdiste también los recordatorios de sus hábitos.**

**Cinco. Que te contesten en tres días.** Una sola vez basta para romper la promesa de "acompañamiento".

---

# PARTE 4 · Cómo se cuenta, sin decir "app"

**La palabra "app" no debería aparecer en la venta.** No por estilo: porque **la palabra elige la categoría**, y en la categoría de las apps hay cosas gratis que hacen la mitad de esto.

| En vez de | Di |
|---|---|
| "la app" | **ATP**, o *tu instrumento* |
| "una suscripción" | **una membresía** |
| "usuarios" | **miembros** |
| "funciones" | **lo que trae** |
| "el chat de IA" | **ARGOS**, y que sea un él, no un qué |
| "la comunidad" | **la Tribu** |

Y la frase que ya salió del material y que es la mejor que hay:

> **"ATP no es una app con comunidad. Es una tribu con un instrumento muy bueno."**

## El orden de la conversación de venta

1. **El dolor, con su frase.** *"Duermo ocho horas y amanezco cansado."*
2. **Que no está solo.** 62% de los trabajadores mexicanos, tercer lugar del mundo.
3. **Qué hace ATP**, en dos líneas y sin jerga.
4. **Contra qué compite.** Una consulta cuesta $1,500 y dura cuarenta minutos.
5. **Y hasta aquí, el precio.** $8,900 el año.

**Si el precio sale antes del paso 4, se compara contra la nada y suena caro. Si sale después, se compara contra una consulta y suena obvio.**

---

# Lo que hay que hacer, en orden

| # | Qué | Esfuerzo |
|---|---|---|
| **1** | **Llenar `challenges` y encender el feed** | Es SQL. El motor ya está |
| **2** | **Que el insight diario cite algo tuyo** | Cerebro al insight, ya está especificado |
| 3 | Escribir el calendario del ritmo y publicarlo a los miembros | Un documento |
| 4 | La promesa de 24 horas en la comunidad, escrita | Una línea, y cumplirla |
| 5 | El mensaje de bienvenida del día uno | Un texto |
| 6 | Quitar la palabra "app" de todo el material de venta | Una pasada |

**Los dos primeros son los que más mueven la aguja, y los dos ya están construidos.** Lo único que les falta es contenido.

---

## La idea de fondo

**Lo premium no es lo que cobras. Es que nunca haya un momento en que la persona sienta que le tocó lo barato.**

Sin medidor, sin versión chica, sin funciones apagadas, sin esperar respuesta. Pagas una cosa, te llevas todo, y hay gente adentro.

**Eso, en el mercado de las apps de salud, casi nadie lo hace. Y no cuesta un peso más de servir.**
