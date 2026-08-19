# 08 · El punto único de falla es una persona

**Escrito el 18 de agosto de 2026.**

Ningún otro documento del proyecto dice esto, y hay que decirlo porque es el riesgo más
grande del lanzamiento y el único que no se arregla programando.

---

## El hecho

**El dueño es el único desarrollador, el único titular de las cuentas y la única persona
que puede correr `npm test`.**

No es una figura retórica. La entrevista de entrega tiene **once respuestas que terminan en
"esto lo tiene que contestar el dueño"**, y no son preguntas de opinión: son inventarios de
accesos, valores de variables de entorno, quién aplicó qué migración, si hay respaldos
contratados, a quién se le debe moneda interna, qué se le pidió ya a terceros. Son datos
que solo viven en la cabeza de una persona.

A doce días del lanzamiento, **la definición de "terminado" del proyecto depende de que una
sola persona corra un comando en una sola máquina.**

---

## Por qué nadie más puede correr las pruebas

Esta es la parte concreta y la que más sorprende, porque suena a detalle técnico y no lo
es.

El `node_modules` del repositorio trae binarios compilados para Windows, incluidos paquetes
con sufijo de plataforma en el nombre (`@esbuild/win32-x64`,
`@rollup/rollup-win32-x64-msvc`). Los agentes corren en Linux. Y `npm install` está
**prohibido** porque un agente ya destruyó el entorno así una vez.

Resultado: **ningún agente de este ciclo pudo ejecutar `vitest`. Ni una prueba.**

Que el problema es real y que ya se buscó salida se prueba solo: en el repositorio existen
`scripts/run-tests-sin-vitest.js` y `scripts/shim-vitest.js`. **Nadie escribe un shim de
vitest si vitest corre.** Son la muleta viva de este problema.

### Ya costó un bug real que sigue en producción

Esto no es un riesgo hipotético. Hay dos reglas de racha distintas conviviendo en el
código: `computeJournalStreak` no da día de gracia y `computeStreak` sí. El comentario del
propio código dice que la fusión no se hizo **porque vitest no arrancaba en ese entorno**.
La consecuencia documentada: dos pantallas muestran números distintos de la misma racha.

Un problema de entorno se convirtió en un bug de producto. Casi seguro no es el único.

---

## Qué implica en la práctica

No en abstracto. Esto es lo que pasa el día que el dueño no está disponible:

- **Nada se puede declarar terminado.** Todo lo que este handoff marca "en verde" es
  hipótesis hasta que alguien corra la suite en Windows. Un agente puede escribir código,
  escribir pruebas y dejarlas listas; no puede verificar.
- **Nada se despliega.** El CLI de Supabase está ligado a su máquina, así que no hay
  `db push`. El canal de OTA y las credenciales de EAS son suyos, así que no hay
  `eas update`. **No hay forma de sacar un parche de emergencia sin él.**
- **Nada se compila.** El binario 2.2.0 es el último antes del lanzamiento. Si aparece un
  bug nativo, la única persona que puede generar un build es él, y compilar reinicia la
  revisión de la tienda.
- **La tienda no se atiende.** Las cuentas de desarrollador de Apple y Google están a su
  nombre. Un rechazo en revisión se queda parado hasta que él lo lea.
- **La base no tiene segundo par de ojos.** La entrevista encontró que hay objetos de base
  editados fuera del repositorio, por el editor de SQL, y que el repositorio no se entera.
  Solo una persona sabe qué se editó y cuándo.
- **Los secretos no están escritos en ningún lado.** Los valores de las variables de
  entorno no viven en ningún documento. Si se pierden, no se recuperan: se rotan, y rotar
  algunas implica redesplegar.

Y el escenario que hay que decir en voz alta porque es el que gobierna todo: **si esa
persona se enferma la semana del lanzamiento, el lanzamiento no ocurre.** No se atrasa por
falta de código. Se atrasa porque nadie más puede apretar el botón.

---

## Qué lo reduce

Ordenado por lo que más quita a cambio de menos esfuerzo. Ninguna de estas necesita
contratar a nadie.

### 1. Que las pruebas corran en Linux (medio día, y desbloquea a todos los agentes)

Es la de mayor rendimiento de la lista, porque convierte "solo él puede verificar" en
"cualquiera puede verificar".

**Lo que no funciona:** `npm rebuild` sobre el árbol existente. El problema no es solo que
los binarios estén compilados para Windows, es que hay paquetes que **por nombre** son de
otra plataforma.

**Lo que hay que intentar primero:** un `node_modules` separado para Linux, sin tocar el de
Windows. O bien `npm ci` con `--prefix` a otra carpeta, o un contenedor con el repositorio
montado y el `node_modules` **fuera** del volumen montado. Con eso, correr solo vitest, sin
Expo.

**Lo que no se hace nunca:** `npm install` sobre el árbol existente. Ese precio ya se pagó
una vez.

### 2. Un inventario de accesos escrito (dos horas)

Un documento, fuera del repositorio, con: qué cuenta, quién es el titular, dónde está el
segundo factor, y qué pasa si esa cuenta se pierde. No los valores de los secretos, que no
van en un documento: **dónde vive cada uno y quién lo puede rotar.**

Esto no es burocracia. Hoy la respuesta a "¿quién puede entrar a la consola de Supabase si
el dueño no contesta?" no está escrita en ninguna parte.

### 3. Integración continua que corra la suite sola (medio día, después del punto 1)

No hay `.github/workflows` con un job de pruebas. No hay artefacto de corrida, no hay
registro, no hay fecha de la última suite verde. Por eso la entrevista **no pudo responder
cuándo corrió `npm test` completo por última vez**, y esa pregunta debería tener respuesta
automática.

Con el punto 1 resuelto, esto es un archivo de configuración. Y a partir de ahí, "está en
verde" deja de ser una afirmación de alguien y pasa a ser un hecho con fecha.

### 4. Un segundo par de manos con acceso de solo lectura (una hora)

No un segundo desarrollador. Alguien de confianza con acceso de lectura a Supabase y a los
paneles de las tiendas, que pueda **mirar y avisar** aunque no pueda tocar. Reduce la clase
de riesgo donde el problema es que nadie se enteró, que es la más barata de cubrir.

### 5. Dejar de editar la base fuera del repositorio (regla, cero esfuerzo)

Ya está en `CLAUDE.md` como regla 12 y se rompió al menos dos veces. La consecuencia
verificada: el permiso que la migración 296 intenta cerrar se reabrió por una edición que
el repositorio nunca vio, y el guard estático siguió en verde porque lee el archivo de
migración y no la base.

**Mientras se pueda editar la base por fuera, ningún guard estático dice la verdad**, y el
único que sabe qué pasó de verdad es la persona que lo editó. Eso es el punto único de
falla otra vez, disfrazado de detalle de proceso.

---

## Lo que hay que aceptar

Nada de esta lista se termina antes del 1 de septiembre, y no debería intentarse. El
lanzamiento sale con este riesgo puesto.

Lo que sí cambia hoy, y por eso existe este documento, es que **el riesgo deja de ser
invisible.** Un handoff que no lo nombra le entrega al que llega un proyecto que parece
tener redes y no las tiene: la suite en verde que nadie corrió, el plan de reversión que
nadie puede ejecutar sin el dueño, el despliegue que depende de una máquina.

El punto 1 es el que yo haría primero, y lo haría antes del lanzamiento y no después,
porque es el único de la lista que además hace más rápido todo lo demás.
