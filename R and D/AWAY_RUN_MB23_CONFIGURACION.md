# ⚙️ AWAY RUN MB-23 · Configuración, el tope de HOY y el retiro del acompañante

**Rama:** `feat/mb23-config` desde `main` (con MB-22 mergeado) · worktree propio.
**Trae migración** (pieza 3). `tsc`, Vitest y `npm run censo` en verde antes de cada commit.

---

# PIEZA 1 · HOY abre arriba

## Qué pasa

Cada vez que se abre la app, HOY arranca **casi hasta abajo**. No es un bug: es el auto-foco
haciendo lo que se especificó, saltar al bloque de la hora actual.

**Se diseñó cuando TAREAS eran filas compactas.** Con las cards editoriales, cada una ocupa
media pantalla, así que saltar a NOCHE significa pasar por encima de diez cards y aterrizar sin
el saludo, sin la card de ARGOS y sin el progreso del día: **justo lo que te ubica.**

Y la guarda lo empeora: scrollea si **hay alguna tarea hecha**, o sea casi siempre.

## Qué hacer

**Retirar el auto-scroll.** HOY abre arriba, siempre.

Se van `focusMomento`, `pickFocusMomento`, `captureBlockY`, `captureContainerY`, `onRequestScroll`
y el `scrollTo` de `app/(tabs)/index.tsx:329`. **Y sus tests**, que hoy prueban una regla que deja
de existir.

⚠️ **Lo que NO se toca:** el reparto de hechas contra pendientes, los bloques por momento y su
progreso. Eso se queda igual.

---

# PIEZA 2 · Se retira el modo acompañante del ciclo

## Por qué

Decisión de Enrique. El modo acompañante hace que él lleve **un calendario aparte** del de ella,
tecleado a mano con lo que cree saber. **Son dos registros del mismo cuerpo y el suyo siempre va
a estar mal.** No sirve.

Lo correcto es asomarse **al de ella**, con su permiso, que ella ve y puede revocar. Eso es su
propio proyecto: flujo de invitación, consentimiento, panel de quién me ve, revocación
instantánea y cobertura en el aviso de privacidad. **No es de este run.**

## Qué hacer

- Ciclo queda instalable **solo en modo propio**. Fuera el selector de modo de su ficha.
- ⚠️ **Nada se borra.** Si alguien ya instaló en acompañante, sus registros se conservan. Que su
  fila pase a propio **solo con confirmación explícita suya**, con el copy que ya existe
  (*"todo este calendario contará como TU ciclo"*), y si no confirma, la app queda desinstalada
  y los datos ahí.
- Las migraciones 249, 250 y 251 **no se revierten.** `user_app_modes` se queda: lo va a usar el
  proyecto de permisos.
- Los blindajes (`canAccessCycle` con modo, el filtro de `period_log`, el gate de
  `getCycleReport`) **se quedan tal cual.** Costaron caro y protegen el día que vuelva.

---

# PIEZA 3 · Los avisos, modelo mixto

## La decisión

> *"El general dependería apagar todas las notificaciones, va en configuración general. Y la
> configuración de cada app es si cada app te da avisos, a qué hora, cómo, y bajo qué
> condiciones."*

**En Ajustes general se queda el interruptor maestro y las categorías**, que ya existen:
agenda, ARGOS, rachas, comunidad, sistema, más las horas de silencio.

**En la ficha de cada app entra lo suyo:** si avisa, a qué hora, y bajo qué condición.

⚠️ **El general manda.** Si el maestro está apagado, ninguna app avisa aunque su ficha diga que
sí. Y las horas de silencio aplican a todo. **Que eso quede en el código y en un test**, no en la
buena voluntad.

## Las condiciones, que es lo que lo vuelve inteligente

Un recordatorio a una hora fija se ignora en tres días. Uno que llega **cuando importa**, no.

| App | Condición |
|---|---|
| Hidratación | solo si vas atrasado a esa hora |
| Ayuno | cuando se abre o se cierra tu ventana |
| Sol | cuando abre tu ventana de vitamina D |
| Suplementos | por horario de toma, que ya existe por suplemento |
| Meditación, Respirar, Journal | hora fija, y solo si no lo has hecho hoy |
| Ciclo | cuando se acerca tu periodo |

⚠️ **Empieza por hora fija más "solo si no lo has hecho".** Las condicionales de verdad
(atrasado en agua, ventana de UV) necesitan datos en el momento de disparar, y eso es del
despachador, no del cliente. **Si alguna no se puede hoy, déjala fuera y repórtalo.**

## La migración

Preferencias de aviso **por app**: si avisa, a qué hora, y su condición. Idempotente, con RLS y
su policy. Y **quien no tenga fila hereda el comportamiento de hoy**, que es el default de su
categoría.

---

# PIEZA 4 · Las demás configuraciones de la ficha

**Empieza por mover lo que existe.** Inventar es lo último.

**4.1 · Ya movido en MB-22, verificar que siga bien:** meta de agua, meta de ayuno, recordatorio
de journal, enlace a horarios de suplementos.

**4.2 · Lo que falta y es barato:**
- **Meta de proteína.** La leen HOY y adherencia, y **perdió su editor** cuando murió ATP
  PROTOCOLOS el 14 de julio. Hoy es un número que el usuario no puede cambiar. Devuélvele su
  editor, escribiendo en `goals.protein_goal_g`, que ya es la fuente.
- **En qué momento del día vive** cada hábito. Hoy la hora canónica está escrita en el código
  (sol a las 7:30, ayuno a las 9:00) y nadie puede moverla.

**4.3 · Profundidad, y el arreglo que lleva días pendiente.**
El patrón "simple contra completo" existe en tres lugares y **ninguno se llama igual**: nutrición
simple o completo, salud en modo denso, y ayuno estimado o medido.

⚠️ **Y el de nutrición no hace lo que promete:** el interruptor solo esconde o muestra cards en
el hub, **no cambia la pantalla de registro**, que es donde el usuario espera ver calorías y
macros porque eso dice el nombre del ajuste. **Arréglalo o renómbralo**, pero no puede seguir
prometiendo de más.

Unifica el nombre de los tres. Un concepto que se aprende una vez.

---

# 🔊 PIEZA 5 · Audio: lo que se puede hoy y lo que no

## Lo que NO se puede todavía, y por qué

Enrique quiere **volumen separado de voz, binaural y cuencos.** Hoy **cada pieza es un solo
archivo ya mezclado**: un player, un `volume`. La voz y el fondo vienen fundidos desde el ffmpeg
del pipeline. **Separar volúmenes de algo ya mezclado no se puede.**

**El camino barato, para cuando se decida:** la pieza queda **solo voz**, y debajo corre un
**loop ambiental** de dos o tres minutos que se repite — binaural, cuencos, lluvia o silencio.
Dos players, pero el loop **no tiene con qué desfasarse**. Seis u ocho loops sirven para toda la
biblioteca, en vez de re-renderizar cada pieza en tres versiones.

**El costo es contenido, no código:** re-renderizar las piezas actuales sin fondo. **Eso es de
Enrique, no de este run.**

## Lo que SÍ se puede ahora

Lo que no depende de separar la mezcla:

- **Volumen de la pieza**, que ya existe en el player y no está expuesto.
- **Campana al empezar y al terminar**, o silencio.
- **Vibración en vez de sonido**, para respiración con el teléfono en silencio, que es como se
  usa de verdad.

⚠️ **NO construyas deslizadores de voz y ambiente por separado.** Con un archivo mezclado
moverían lo mismo, y un control que miente es peor que no tenerlo.

---

# 📦 ENTREGA

Un commit por pieza. Migración idempotente con RLS.

En el reporte: **qué condiciones de aviso se pudieron y cuáles no**, y **qué ajustes moviste
contra cuáles inventaste** (idealmente cero inventados).

**Verificación en dispositivo:**
1. Abrir la app: **HOY arranca arriba**, con el saludo y la card de ARGOS a la vista.
2. Ciclo ya no ofrece modo acompañante, y **quien lo tenía no perdió sus registros.**
3. En la ficha de una app se puede **apagar su aviso y cambiar su hora**.
4. Con el maestro apagado en Ajustes general, **ninguna app avisa** aunque su ficha diga que sí.
5. La meta de proteína **se puede cambiar** y HOY la refleja.
6. Meditación tiene volumen y campana, **y no hay deslizadores de voz y ambiente por separado.**
