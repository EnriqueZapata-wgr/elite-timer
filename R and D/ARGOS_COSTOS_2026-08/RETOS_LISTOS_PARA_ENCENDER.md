# Los retos: está todo construido y vacío
## Diez retos listos para insertar, uno por perfil

**Fecha:** 11 de agosto de 2026
**Fuente:** esquema de `challenges` y `challenge_participants` leído en producción, más el código de `settle-challenge` v12 y `_shared/challenge-criteria.ts`.

---

# 0 · Lo que encontré

**El motor de retos está terminado y es de buena calidad.** No es un esqueleto, es producción:

- `challenge-criteria.ts` es **lógica pura**, sin dependencias de Deno ni de Node, y la importan el cliente, la edge function y las pruebas. Una sola verdad, tres consumidores. Eso está bien pensado.
- `settle-challenge` **re-valida el criterio del lado del servidor** y el comentario lo dice explícito: *"no confía en el cliente"*.
- La liquidación es **idempotente**: la RPC no vuelve a pagar si ya se liquidó.
- El caller solo puede liquidar **su propia** participación.

**Y `challenges` tiene cero filas.** Todo eso está apagado porque nadie ha escrito un renglón.

Esto importa más de lo que parece: **el reto es el mecanismo del día 10 del Customer Journey**, el momento donde se acabó la novedad y todavía no hay resultado. Es la pieza que sostiene la etapa donde se pierde a la gente, y lleva meses construida sin usarse.

---

# 1 · Los siete criterios que el motor sabe evaluar

Esto es lo que faltaba para poder escribir un reto. Sacado del código, no inventado.

| `type` | Qué cuenta | Usa `target` | Usa `days_required` |
|---|---|---|---|
| `daily_steps` | Un día cuenta una vez si pasa el umbral | Pasos del día | Días necesarios |
| `sleep_quality` | Igual, un día por vez sobre umbral | Calidad mínima | Días necesarios |
| `days_streak_habit` | **Racha consecutiva.** Se reinicia si se rompe un día | no | Días de racha |
| `cardio_minutes` | Minutos acumulados | Minutos totales | no |
| `meditation_minutes` | Minutos acumulados | Minutos totales | no |
| `food_logged` | Cuenta de registros | alternativo | Registros necesarios |
| `lab_uploaded` | Cuenta de laboratorios subidos | alternativo | Registros necesarios |

**Dos detalles del código que cambian cómo se diseña un reto:**

`days_streak_habit` **reinicia la racha a 1** si el día no es consecutivo. Es el criterio más duro de los siete y no perdona un solo día. Para un reto de entrada eso es demasiado castigo, así que va en los retos de nivel medio, no en el primero.

`daily_steps` y `sleep_quality` **acumulan días sueltos, no consecutivos.** Son mucho más amables y son los correctos para el primer reto de alguien.

## 🕳️ Y dos huecos honestos

**No hay criterio de fuerza.** El perfil de *Ganar músculo* no tiene con qué medirse: `cardio_minutes` mide otra cosa. Hoy se puede resolver con `days_streak_habit` sobre el hábito de entrenar, pero es un parche. Si se quiere un reto de fuerza de verdad, hay que agregar un tipo al motor.

**No hay criterio de Edad ATP.** El reto más obvio del producto, *baja tu Edad ATP*, no se puede armar. Y es el que mejor cerraría el ciclo del día 30, cuando se ofrece el re-cálculo.

---

# 2 · Los diez retos, uno por perfil

Diseñados con tres reglas: **el primero de cada persona no se puede perder**, el premio es H+ y no dinero, y ninguno pide algo que la app no mida ya.

| # | Perfil | Reto | Criterio | Objetivo | Entrada | Premio |
|---|---|---|---|---|---|---|
| 1 | Bajar revoluciones | **Diez minutos que no le debes a nadie** | `meditation_minutes` | 150 min en el mes | 0 | 1,500 |
| 2 | Dormir mejor | **Doce noches** | `sleep_quality` | 12 días sobre umbral | 0 | 2,000 |
| 3 | Energía estable | **Tres semanas sin apagarte** | `days_streak_habit` | 21 días de racha | 250 | 3,500 |
| 4 | Bajar grasa | **Todo lo que entra** | `food_logged` | 60 registros | 0 | 2,500 |
| 5 | Ganar músculo | **Doce sesiones** | `days_streak_habit` | 12 días de racha | 250 | 3,000 |
| 6 | Volver a moverme | **Empieza el lunes, otra vez** | `daily_steps` | 15 días sobre 7,000 | 0 | 2,000 |
| 7 | Cuidar mi glucosa | **Llega con algo en la mano** | `lab_uploaded` | 1 laboratorio | 0 | 2,500 |
| 8 | Foco y claridad | **Noventa minutos de cabeza quieta** | `meditation_minutes` | 90 min | 0 | 1,200 |
| 9 | Mi ciclo a mi favor | **Un ciclo completo** | `days_streak_habit` | 28 días de racha | 250 | 4,000 |
| 10 | Cumplir años sin envejecer | **La foto de tu punto de partida** | `lab_uploaded` | 2 laboratorios | 0 | 3,000 |

## Por qué la entrada es cero en siete de diez

`entry_cost_protons` existe y sirve, pero **cobrar por entrar a tu primer reto es cobrar por intentar.** En los tres que sí cobran, la entrada de 250 H+ es simbólica y el premio es de diez a dieciséis veces esa cantidad: sirve para que el reto se sienta serio, no para hacer dinero.

## Lo que cuestan de verdad los premios

Un premio de 2,500 H+ se ve como **$24.75** al precio del paquete chico. **Lo que cuesta servirlo son unos 9 chats con ARGOS, o sea $4.57 reales.** El premio se percibe cinco veces más caro de lo que cuesta, y eso es exactamente lo que debe hacer una moneda interna.

---

# 3 · El SQL, listo para correr

Fechas de ejemplo para septiembre. Cambiar `start_date` y `end_date` al mes que se abra.

```sql
insert into challenges
  (name, description, category, entry_cost_protons, prize_protons, criteria, start_date, end_date, electron_multiplier, active)
values
  ('Diez minutos que no le debes a nadie',
   'Ciento cincuenta minutos de respiración o meditación en el mes. No importa si son diez de un jalón o dos de tres.',
   'mente', 0, 1500, '{"type":"meditation_minutes","target":150}', '2026-09-01','2026-09-30', 1.0, true),

  ('Doce noches',
   'Doce noches del mes por encima de tu umbral de sueño. No tienen que ser seguidas.',
   'sueno', 0, 2000, '{"type":"sleep_quality","target":70,"days_required":12}', '2026-09-01','2026-09-30', 1.0, true),

  ('Tres semanas sin apagarte',
   'Veintiún días seguidos cumpliendo tu hábito ancla. Si rompes un día, la racha vuelve a empezar.',
   'energia', 250, 3500, '{"type":"days_streak_habit","days_required":21}', '2026-09-01','2026-09-30', 1.5, true),

  ('Todo lo que entra',
   'Sesenta registros de comida en el mes. Dos al día. No se trata de comer distinto, se trata de verlo.',
   'nutricion', 0, 2500, '{"type":"food_logged","days_required":60}', '2026-09-01','2026-09-30', 1.0, true),

  ('Doce sesiones',
   'Doce días seguidos con tu sesión hecha.',
   'fitness', 250, 3000, '{"type":"days_streak_habit","days_required":12}', '2026-09-01','2026-09-30', 1.2, true),

  ('Empieza el lunes, otra vez',
   'Quince días del mes arriba de siete mil pasos. No seguidos. Este es para el que siempre lo deja el jueves.',
   'fitness', 0, 2000, '{"type":"daily_steps","target":7000,"days_required":15}', '2026-09-01','2026-09-30', 1.0, true),

  ('Llega con algo en la mano',
   'Sube un laboratorio este mes. Uno. Para que la próxima consulta empiece distinto.',
   'salud', 0, 2500, '{"type":"lab_uploaded","days_required":1}', '2026-09-01','2026-09-30', 1.0, true),

  ('Noventa minutos de cabeza quieta',
   'Noventa minutos de práctica en el mes. Tres al día bastan.',
   'mente', 0, 1200, '{"type":"meditation_minutes","target":90}', '2026-09-01','2026-09-30', 1.0, true),

  ('Un ciclo completo',
   'Veintiocho días seguidos de registro. Un ciclo entero, para que la próxima vez ya sepas qué esperar.',
   'ciclo', 250, 4000, '{"type":"days_streak_habit","days_required":28}', '2026-09-01','2026-09-30', 1.5, true),

  ('La foto de tu punto de partida',
   'Dos laboratorios este mes. El punto contra el que vas a comparar todo lo demás.',
   'salud', 0, 3000, '{"type":"lab_uploaded","days_required":2}', '2026-09-01','2026-09-30', 1.0, true);
```

⚠️ **Antes de correrlo hay que verificar dos cosas** que no pude ver desde fuera:

1. **Los valores válidos de `category`.** La columna es `text` sin restricción, así que acepta cualquier cosa, pero si la app filtra por categoría, estas ocho tienen que coincidir con las que espera. Vale la pena revisar contra las llaves de pilar del cliente.
2. **El umbral de `sleep_quality`.** Puse `target: 70` como marcador. Hay que ver en qué escala viene la calidad de sueño en la app antes de encenderlo, porque si la escala no es de 0 a 100 el reto se vuelve imposible o trivial.

---

# 4 · Lo que falta para que un reto se sienta vivo

Insertar las filas enciende el motor. Que la gente los juegue necesita tres cosas más, y las tres tocan el puente con la comunidad:

**El aviso de apertura.** Cuando arranca el reto, tarjeta en HOY y push. Es de las tres únicas cosas que merecen push, junto con el Zoom y la respuesta a su pregunta.

**El progreso visible.** `challenge_participants.progress` ya guarda el avance en jsonb. Sin una barra que se mueva, el reto es un formulario.

**La tabla del reto en su círculo por perfil.** El reto de *Doce noches* solo lo están jugando los del perfil de dormir. Verlos ahí es la mitad del valor, y `activity_feed` ya existe para eso y también está en cero.

---

# 5 · Lo que yo recomendaría hacer primero

No los diez. **Dos.**

El de **Doce noches** y el de **Empieza el lunes, otra vez**, porque los dos usan criterios que acumulan días sueltos y no castigan romper una racha. Son los correctos para probar el ciclo completo con gente real: insertar, participar, avanzar, liquidar, cobrar el premio.

Cuando esos dos den la vuelta entera sin atorarse, se encienden los otros ocho. Y los tres de racha, que son los duros, van hasta el final.
