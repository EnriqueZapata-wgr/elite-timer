# 📲 AWAY RUN MB-32 · Los widgets

**Rama:** `feat/mb32-widgets` desde `main` (en `fd65bc3`) · worktree propio.
**TRAE CÓDIGO NATIVO Y NECESITA BUILD.** `tsc`, Vitest y `npm run censo` en verde antes de
cada commit.

🚨 **NO toques `"version"` en `app.json`.** El bump va con el build, al final, como manda la
regla 11 de `CLAUDE.md`.

## Por qué ahora y no después

Los widgets estaban en la visión de ATP desde el principio — **sesiones cortas** — y se
cayeron del plan maestro completo.

**Y el momento es este porque el build de v2.0.0 todavía NO se subió a tiendas.** Widgets
ahora = una sola revisión de tienda con todo adentro. Widgets después = subir, volver a
compilar y volver a pasar revisión. **La ventana se cierra el día que se publique.**

## La tesis

> *"El mejor interfaz es no tener interfaz."*

Palomear un hábito dentro de la app son cuatro toques y la decisión de abrirla. **Desde la
pantalla de inicio es uno.** Eso no es una mejora de comodidad: es la diferencia entre que
alguien sostenga el hábito o lo abandone.

---

# 🚨 PIEZA 0 · EL CANDADO QUE MANDA SOBRE TODO

**Un widget que palomea un hábito está escribiendo en el ledger de electrones desde FUERA
de la app.** Esa es exactamente la ruta paralela que nos ha mordido tres veces: el import
de cardio, el check-in que no palomeaba, los escritores de comida del panel de coach.

🚨 **TODA escritura del widget entra por el MISMO camino que la app:**

| Acción | Camino canónico, sin excepción |
|---|---|
| Palomear hábito | `persistBooleanToggle` (`src/services/hoy/tarea-actions.ts:30`) |
| Sumar agua | `addWater` (`src/services/hydration-service.ts:72`) |
| Ayuno | `fasting-service` (solo LECTURA en este run) |

⚠️ **Si el widget no puede llamar a esos servicios directamente** (porque el widget nativo
vive fuera del runtime de JavaScript), **el widget NO escribe: despierta a la app para que
ella escriba.** Prefiero un widget que abre la app medio segundo a uno que inventa su
propio camino a la base.

⚠️ **Y hay un riesgo peor que el de duplicar: el de PISAR.** `persistBooleanToggle` lee el
mapa de estados del día, lo mezcla y lo escribe. Dos escrituras concurrentes (una del
widget, una de la app abierta) pueden borrarse entre sí. **Es exactamente por eso que
MB-30B dejó fuera el botón de sol en las notificaciones.** Lee esa nota antes de diseñar.

**Reporta cómo resolviste esto ANTES de escribir el widget.** Es la decisión de arquitectura
del run y quiero saberla.

---

# PIEZA 1 · El widget de hábitos ← el que cambia la app

Los hábitos activos de hoy, en la pantalla de inicio, **palomeables sin abrir nada.**

- Muestra los del momento actual, no los diecisiete del día. **Cabe lo que cabe.**
- Palomear pinta el cambio de inmediato y sincroniza.
- **Respeta los tres estados de MB-26:** los graduados y los que están en reposo no
  aparecen.
- Tocar el fondo abre HOY.

⚠️ **Diseño según el manual de marca:** el widget vive en la pantalla de inicio del
usuario, **no dentro de nuestra app.** Tiene que verse bien sobre cualquier fondo que la
persona tenga. Fondo oscuro sólido, no transparente, y el acento lima con la misma
disciplina de siempre.

⚠️ **Y respeta el tema:** si el usuario está en claro, el widget en claro.

---

# PIEZA 2 · El widget de agua

El más repetido del día y el más tonto de tener que abrir la app para hacerlo.

Cuánto llevas, cuánto te falta, y **el botón de +250**.

⚠️ `addWater` es el escritor canónico y ya lo usa la acción de notificación de MB-30B.
**Mismo camino, cero excepciones.**

---

# PIEZA 3 · El widget de ayuno

**Solo lectura en este run.** El contador corriendo y la ventana.

**No es acción, es presencia:** ver la hora sin buscarla es lo que sostiene el ayuno.
Abrir y cerrar ventana se hace en la app, donde hay contexto para decidir.

---

# PIEZA 4 · Las dos plataformas, con honestidad

## Android — el terreno bueno

⚠️ **Ya está probado que el Kotlin compila** (`modules/atp-night-filter` pasó a la
primera). Widgets con Glance son sólidos y los interactivos funcionan bien.

**Android es la plataforma de referencia de este run.**

## iPhone — más limitado, y el copy no puede mentir

🚨 **Los widgets interactivos de iOS exigen iOS 17 o superior.** En versiones anteriores el
widget **solo muestra**; tocarlo abre la app.

⚠️ **Verifica qué necesita el proyecto** (librería, target nativo, versión mínima) **y
repórtalo ANTES de instalar nada.** Si exige subir la versión mínima de iOS y dejar fuera
teléfonos, **eso es decisión de Enrique, no tuya.**

⚠️ **El copy no promete paridad.** Si en iPhone viejo el widget solo muestra, lo dice.

**Si iOS no cabe en este run, entrega Android completo y repórtalo.** Un widget de Android
que funciona vale más que dos a medias.

---

# PIEZA 5 · Tests

1. **Una escritura, un camino:** el widget escribe por `persistBooleanToggle` y `addWater`.
   La mutación que escriba directo a la base **truena**.
2. **Sin doble conteo:** palomear en el widget y luego abrir la app **no da dos electrones**.
3. **No pisa el día:** el widget escribiendo con la app abierta **no borra otros estados**.
   ⚠️ Este es el test que más importa del run.
4. **Graduados y en reposo NO aparecen** en el widget.
5. **El widget respeta el tema** del usuario.
6. **Sin sesión iniciada, el widget no truena** y lleva a abrir la app.

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 🟡 LO QUE NO ES DE ESTE RUN

Abrir y cerrar ayuno desde el widget · widgets de la pantalla de bloqueo · complicaciones
de reloj · cualquier cosa que no sea hábitos, agua y ayuno.

---

# 📦 ENTREGA

Un commit por pieza. En el reporte:

🚨 **Cómo resolviste el candado de la pieza 0**, en detalle. Es lo primero que voy a auditar.

Y además: qué necesitó cada plataforma · si iOS cupo y con qué versión mínima · qué
permisos nativos nuevos agregaste con su justificación · el resultado real de las
mutaciones.

**Actualiza `R and D/FIFO_PENDIENTES.md`.**

**Verificación en dispositivo (Enrique, en su S24):**
1. El widget de hábitos en la pantalla de inicio, **palomeando sin abrir la app.**
2. Abrir ATP después: **el hábito está palomeado y el electrón se contó UNA vez.**
3. Palomear en el widget con la app abierta: **nada más se borra.**
4. El +250 de agua suma desde la pantalla de inicio.
5. El ayuno se ve corriendo sin abrir nada.

---

# 🔒 PROTOCOLO DE CIERRE

**Al terminar: reporta y DETENTE. No merges sin el verde del audit de Cowork.**

⚠️ **Sin OTA: este run trae código nativo.** El build va después del merge, con el bump de
versión, y **sigue sin subirse a tiendas** hasta que lo legal de Enrique esté listo.

⚠️ **Si para entonces hay un arreglo del crash de sueño listo, entra al MISMO build.**
