# 🌅 AWAY RUN MB-20 · El día: Tareas, Agenda, instalar y el tour

**Rama:** `feat/mb20-el-dia` · worktree propio.
**⛔ Ramifica de main DESPUÉS del merge de MB-19.** Este run vive dentro de la carcasa que MB-19 construye: usa sus tabs, su `<AppIcon>`, su `app-registry` y su `<ArgosOrb>`.

**Trae UNA migración** (pieza 3). Todo lo demás es JS/TS y sale por OTA.

---

## La tesis del run

Enrique lo dijo así: **"HOY lo que busca es que sea tu checklist del día. Fin. Nada más."**
Y sobre su uso real: *"entro a buscar una meditación y de pasada palomeo lo que ya hice. Normalmente palomeo casi todo al final del día."*

Todo lo que sigue se juzga con una pregunta: **¿cuántos segundos tarda alguien en palomear su día?** Si una decisión suma segundos, está mal.

## Las reglas del run
1. Solo `str_replace` quirúrgico. Un commit por pieza.
2. `tsc`, Vitest y **`npm run censo`** en verde antes de cada commit.
3. Cero em dash en copy de usuario. Cero nombres propios. Español de México.
4. **Ningún dato del usuario se infiere ni se rellena.** Si no lo registró, no existe.

---

# PIEZA 1 · TAREAS y AGENDA: una lista, dos lentes

**El hallazgo que ordena todo:** HOY y Agenda hoy se parecen y confunden porque **son la misma cosa vista distinto.** Una sola fuente de verdad, dos presentaciones.

- **TAREAS** = el checklist del día. Agrupado por momento, sin horas.
- **AGENDA** = la misma lista con horarios y notificaciones.

Un toggle arriba cambia de lente. **Nunca dos listas, nunca dos fuentes.**

## 1.1 · La estructura de TAREAS

```
Hoy                                    [78]
sábado 1 de agosto

  ( Tareas )  ( Agenda )

  ▓▓▓▓▓▓▓░░░  8 de 13

  MAÑANA
   ◯  💧 Hidratación      1.2 de 2.5 L        [+250 ml]
   ◯  ⏱ Romper ayuno      en 1 h 42 min         🔔
   ✓  💊 Suplementos AM   3 pendientes
   ✓  🏋 Entrenar          Empuje · 45 min        ›
  TARDE
   ...
  NOCHE
   ...

  ☀ UV 7 ahora · ventana 10:20 a 11:00      + agregar
```

- **Agrupado por momento del día**: mañana / tarde / noche. Reutilizar el modelo de
  `SUPP_TIMINGS` que ya existe en suplementos, generalizado.
- **Auto-foco:** al abrir, la vista arranca posicionada en el bloque de la hora actual.
  A las 10 pm te recibe NOCHE. Los otros bloques siguen ahí, arriba y abajo.
- **Progreso por bloque, no solo del día**: "3 de 4 de la mañana" motiva más que "8 de 13".
  Mostrar ambos: el global arriba, el del bloque en su encabezado.
- El **ATP Score** ya no vive aquí (decisión de Enrique: sale de HOY; el motor sigue vivo).
  El `[78]` del boceto se retira.

## 1.2 · Los dos gestos, que son el corazón de la pieza

| Gesto | Qué hace |
|---|---|
| **Tap simple** | **Navega** a la función. Tocar "Meditar" te lleva a meditar. |
| **Tap largo** | **Palomea.** Un gesto físico, satisfactorio, imposible de disparar por accidente. |

**El tap largo tiene retroalimentación en tres capas:** el círculo se llena progresivamente
mientras mantienes (unos 350 ms), vibración al completarse, y la fila se atenúa. Si sueltas
antes, el llenado se revierte. **Sin esa animación de llenado el gesto se siente roto**, porque
el usuario no sabe que está pasando algo.

## 1.3 · La paloma inteligente (decisión textual de Enrique)

Palomear una **experiencia** no regala el check: pregunta primero.

> Tocas la paloma de **Meditar** →
> **"¿Ya meditaste?"**
> **SÍ** → captura de minutos y segundos → se registra la sesión de verdad
> **NO** → navega a Meditar

Así el registro es honesto y se incentiva usar lo interno, sin castigar a quien lo hizo por fuera.

**Qué filas llevan paloma inteligente:** las que tienen una función con registro propio
(Meditar, Entrenar, Respirar, Journal, N-Back, Cardio).
**Qué filas se palomean directo:** las binarias sin duración (Suplementos, hábitos simples).
**Qué filas no se palomean, sino que capturan inline:** Hidratación (botón +250 ml).
**Qué filas solo navegan:** **Ayuno va a su pantalla y fin** (decisión de Enrique).

## 1.4 · El recordatorio contextual (idea de Enrique)

Si el usuario repite el patrón **tap → navega → regresa sin hacer nada** tres veces en una
sesión, la orbe lanza una burbuja de chat:

> *"Para palomear un hábito, mantén presionado."*

Se muestra **máximo una vez por semana** y nunca durante el tour. Es enseñanza en el momento
exacto de la confusión, que es cuando sirve. Contador local, no se envía a ningún lado.

## 1.5 · AGENDA: la misma lista con horas

- Misma fuente, ordenada cronológicamente con su hora a la izquierda.
- **Se completa con el mismo tap largo**, sin entrar a detalle. Ese era el reclamo directo:
  *"más de un click para completar una tarea."*
- Aquí sí se ven y editan los horarios de notificación de cada tarea.
- **Sin fotos**: iconografía, texto y estado. Es superficie de acción.

## 1.6 · La card de la orbe en TAREAS

El Morning Report vive aquí como card, y **se COLAPSA, no se descarta** (decisión de Enrique).

```
◉ ARGOS
  · Día 1 de tu ciclo
  · Dormiste 6:40
  Hoy: come antes de las 4 pm
  Ver explicación ›                    ⌃
```

Formato escaneable en menos de 5 segundos: qué detectó en bullets, qué hacer, y el desarrollo
detrás de "Ver explicación". Su contenido cambia con la hora del día. Colapsada recuerda su
estado; al día siguiente vuelve a abrir.

---

# PIEZA 2 · Instalar = activar el hábito

**La metáfora que hace todo entendible:** activar un hábito no es llenar un formulario,
es **instalar una app**. Todos ya saben hacer eso.

## 2.1 · El gesto

- En la sala ATP, cada app tiene su estado: instalada o no.
- **"+ agregar" en TAREAS** abre la sala ATP en modo selección.
- Al instalar: **aparece su fila en TAREAS y su widget queda disponible.** Nada más.
- Desinstalar la quita de TAREAS. **Los datos históricos NO se borran**: si la reinstalas,
  tu historia sigue ahí. El dato del usuario es sagrado.

## 2.2 · Los ajustes por app, en DOS niveles

⚠️ **La trampa documentada:** Habitify tiene ajustes riquísimos por hábito y su crítica número
uno es *"tanta configuración que mantener la app compite con hacer los hábitos"*. Por eso:

**Al instalar, solo lo mínimo:** en qué momento del día vive y si notifica. Dos preguntas,
con default inteligente ya elegido. **Instalar debe seguir sintiéndose como un gesto.**

**Todo lo demás vive en la pantalla de ajustes de esa app**, a la que entras cuando quieres:
horarios finos, sonido, vibración, permisos, ver sus registros, meta o cantidad. Estilo iOS:
una lista de filas agrupadas, cada una con su control.

## 2.3 · Qué apps son instalables

En `app-registry` (creado en MB-19), la bandera `installable`. Instalables son las de hábito
recurrente: Hidratación, Suplementos, Ayuno, Meditar, Respirar, Journal, Emociones, Entrenar,
Sol, N-Back, Sueño. **No instalables** las de consulta o herramienta: Labs, 1RM, Recetas,
Ajustes, f.lux. Esas viven en la sala ATP y no generan fila en TAREAS.

---

# PIEZA 3 · La zona del cuerpo y lo que falte persistir (única migración)

Verificar que la columna `body_zone` de MB-17 esté aplicada. **Si TAREAS necesita persistir
algo nuevo** (por ejemplo el orden personalizado de la sala ATP o el estado de instalación
por app), va aquí, en **una sola migración idempotente** con su RLS.

Preferir `user_day_preferences`, que ya existe, antes que crear tabla nueva.
⚠️ Recordar la doctrina: un electrón booleano nuevo requiere tres lugares o falla en silencio.

---

# PIEZA 4 · El tour guiado por la orbe

**Reemplaza al tour de 7 pantallas de bienvenida.** Decisión de Enrique: la orbe recorre la
app **pantalla por pantalla**, señalando y explicando.

## 4.1 · Cómo funciona

- La orbe aparece con una **burbuja que señala** un elemento real de la pantalla, sobre el
  contenido real (no un carrusel de ilustraciones).
- Cada paso tiene **"Siguiente"**, y en TODOS **"Terminar tour"** visible para quien ya la
  conoce. Nadie queda atrapado.
- Se puede retomar después desde Ajustes. No se lanza dos veces solo.
- Si el usuario navega por su cuenta, el tour se pausa y ofrece continuar; no lo secuestra.

## 4.2 · El guion (12 pasos, uno por concepto)

| # | Pantalla | Qué explica |
|---|---|---|
| 1 | TAREAS | "Esto es tu día. Todo lo que te toca, en una lista." |
| 2 | TAREAS · una fila | **Los dos gestos**: tocar te lleva, mantener presionado palomea. Que el usuario lo pruebe ahí mismo antes de avanzar. |
| 3 | TAREAS · hidratación | Lo que se captura sin salir. |
| 4 | TAREAS · card de la orbe | "Aquí te digo lo que veo cada mañana." |
| 5 | Toggle Agenda | "La misma lista, con horarios." |
| 6 | Tab ATP | "Todas tus herramientas. Se buscan o se ordenan como quieras." |
| 7 | ATP · una app | **Instalar = activar el hábito.** |
| 8 | Tab SALUD | Las cuatro puertas y qué contesta cada una. |
| 9 | SALUD · Edad ATP | Qué es y qué NO es: una ventana educativa al estado interno, no un diagnóstico. |
| 10 | **Electrones y H+** | El concepto que hoy nadie entiende y por el que existe este tour. Qué ganas, para qué sirven, cómo se usan. |
| 11 | Tab TRIBU | Qué encuentras ahí. |
| 12 | La orbe | "Soy ARGOS. Tócame cuando quieras. Si cambio de color, es que tengo algo que decirte." |

**Copy del tour:** frases de una o dos líneas, del cuerpo y de la experiencia, cero jerga.
Toda sigla se explica la primera vez. Sin promesas médicas. **Es el copy más leído de toda la
app: merece el mismo rigor que el resto.**

## 4.3 · Los estados de la orbe se conectan aquí

- `idle` respirando en reposo.
- `alerta` cuando hay algo sin leer: insight nuevo, notificación pendiente, tarea vencida.
- `escuchando` y `pensando` en ARGOS.
- **Nunca parpadea rápido, nunca se pone roja de alarma.** Si algo es grave se dice con
  palabras, no asustando.

⚠️ **`setOrbState` existe, está testeado, y NADIE LA LLAMA.** El estado `alerta` está muerto
desde MB-19: el mecanismo se entregó y el disparador quedó pendiente para este run. Verificado
por grep: fuera del contexto, la única aparición es un `useState` local del modo voz.
**Este run pone el disparador.**

## 4.4 · Una sola presencia de ARGOS (prerequisito del tour)

**El tour enseña a la orbe. Si ARGOS se dibuja distinto en cada pantalla, el tour enseña una
mentira.** Por eso esta pieza vive aquí y no en MB-21.

Hoy hay **tres dibujos en once puntos de montaje**: `ArgosOrb` (esfera con degradado, 5
estados), `ArgosAvatar` (una figura geométrica distinta por estado, con azul y rojo en su
paleta) y un `<Ionicons name="eye">` copiado a mano en cuatro pantallas.

**La orbe es ARGOS en todas partes.** `ArgosAvatar` se retira y sus tres consumidores pasan a
la orbe. El ojo se reemplaza por `<ArgosMark size={20} />`: la orbe en reposo, estática, para
burbujas y cards de insight, donde la respiración no se ve y solo gasta batería.

⚠️ **El estado rojo del avatar viola la regla dura.** Cuando ARGOS no está disponible se dice
**con palabras**, con la orbe apagada. Nada de tache rojo.

Y que `argos-orb-core.ts` **importe** los colores de `brand.ts` en vez de copiarlos, como hace
hoy.

El resto del overhaul de ARGOS (sesiones, panel de conversaciones, la pantalla de chat) es
**MB-21** y va después de este run.

---

# 📦 ENTREGA

Un commit por pieza, en orden 1 → 2 → 3 → 4. `tsc`, Vitest y `npm run censo` en verde en cada uno.

**⚠️ El censo es especialmente crítico en este run:** TAREAS absorbe funciones que antes tenían
card propia en HOY y en habits-portal. **Ninguna puede quedar sin puerta.** Si una app deja de
tener fila porque no está instalada, **sigue estando en la sala ATP**: eso cuenta como puerta.

**Verificación en dispositivo, obligatoria:**
1. Abrir TAREAS y contestar "¿qué me toca ahora?" en menos de 3 segundos.
2. Abre enfocado en el bloque de la hora actual.
3. **Tap largo palomea con su animación de llenado y su vibración.** Soltar antes lo revierte.
4. **Tap simple en Meditar navega a meditar.**
5. **Tap largo en Meditar pregunta "¿ya meditaste?"** → SÍ abre captura de minutos → se registra.
6. Hidratación suma 250 ml sin salir de la lista.
7. Ayuno navega a su pantalla.
8. El toggle Agenda muestra la MISMA lista con horas, y se completa igual con tap largo.
9. La card de la orbe se colapsa y recuerda su estado.
10. Instalar una app desde "+ agregar" la hace aparecer en TAREAS.
11. Desinstalar y reinstalar **conserva el historial**.
12. El tour corre los 12 pasos, con "Terminar tour" visible en todos, y se puede retomar.
13. Repetir tap-navegar-regresar tres veces dispara la burbuja del tap largo, una sola vez.
14. **Todo lo que existía antes sigue teniendo camino.** Recorrido con la lista del censo.

**Fuera de alcance:** los assets de iconos (se montan aparte cuando lleguen), los widgets de
sistema operativo, y cualquier feature nueva. Este run cierra la arquitectura V2.
