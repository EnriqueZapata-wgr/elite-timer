# 🎛️ AWAY RUN MB-22 · El Centro ATP

**Rama:** `feat/mb22-centro` desde `main` · worktree propio.
**Trae migración** (pieza 4). El resto es JS/TS.

## La decisión

> *"Más bien creo que deberíamos tener una pantalla de instalador de apps, y ese instalador ahí
> está la configuración. Como el centro de configuración de apps de iPhone. Las apps que no te
> interesen, no las ves, no te estorban. Y las que sí quieres, las ves y listo."*

**La cuadrícula de la sala ATP muestra SOLO lo instalado.** Todo lo demás vive en el Centro.

Y con eso **muere la palomita** del mosaico: si en la cuadrícula solo hay instaladas, no hace
falta marcar cuáles lo están. La señal sobraba porque el problema era otro.

## Por qué esto y no un indicador

Una cuadrícula de 25 apps donde 8 te interesan es ruido permanente. **Las 17 que no usas no
necesitan un distintivo: necesitan no estar.**

Y hay una segunda ganancia: hoy no existe **ningún lugar donde alguien aprenda qué hace cada
app.** El registro tiene nombre y ruta, nada más. El Centro es ese lugar.

⚠️ **El riesgo documentado, y por qué esta forma lo esquiva.** En la barrida de referentes,
la queja número uno de Habitify es que *"tanta configuración que mantener la app compite con
hacer los hábitos"*. La diferencia aquí: **la configuración NO está en el camino diario.** Vives
en HOY; al Centro entras cuando quieres cambiar algo. Es el patrón de Ajustes de iOS, no el de
un panel que te recibe.

---

# PIEZA 1 · La sala ATP se limpia

- La cuadrícula lista **solo las apps instaladas**, en sus secciones de siempre.
- **Fuera la palomita** de `AppTile`. El icono conserva su color de sección.
- Arriba de todo, la **entrada al Centro**. ⚠️ Que se vea sin hacer scroll: si alguien no la
  encuentra, no puede instalar nada y la app se le queda chica para siempre.
- El buscador sigue buscando **solo entre las instaladas**. Si el término no aparece, **ofrece
  buscarlo en el Centro**: es la forma natural de descubrir que existe algo más.

⚠️ **Qué ve un usuario nuevo.** Una cuadrícula vacía es una app rota. Define un **set inicial
sensato** que se instala solo al crear la cuenta, y **repórtalo para que Enrique lo apruebe**.
Los candidatos obvios son los que ya tienen `installable: true` y peso en el día.

---

# PIEZA 2 · El Centro

Una lista de todas las apps, agrupada por sección, con su icono, su nombre y su estado.
Estilo Ajustes de iOS: filas agrupadas, sin adornos.

Cada fila entra a **la ficha de esa app**.

---

# PIEZA 3 · La ficha de cada app

Es la pantalla que hoy no existe y la que de verdad hace valer este run.

**Arriba: qué es y para qué sirve.** Dos o tres líneas honestas, en el lenguaje de siempre:
del cuerpo, sin jerga, sin promesas médicas. ⚠️ **Ese copy no existe todavía en ningún lado**:
hay que escribirlo para las 25. Si no te alcanza, deja las que no tengas **sin descripción** y
repórtalas, pero **nunca inventes un beneficio.**

**En medio: instalar o desinstalar.**
- Instalar la mete a la cuadrícula, y si genera fila, a TAREAS.
- **Desinstalar NO borra historial.** Reinstalar recupera todo. Esto ya funciona así y **no se
  puede romper**: el dato del usuario es sagrado.
- ⚠️ Y el copy tiene que decir la verdad por clase de app, que ya se resolvió con
  `installCreatesRow()`: hay cuatro que no generan fila y **no pueden prometerla.**

**Abajo: su configuración.** Lo que hoy está disperso o no existe: en qué momento del día vive,
si notifica y a qué hora, sus metas, y lo propio de cada una.

⚠️ **Empieza por lo que YA existe.** Meta de agua, meta de ayuno, horarios de suplementos y
recordatorio de journal ya viven en pantallas sueltas. **Muévelos aquí primero.** Inventar
ajustes nuevos es lo último, y probablemente no es de este run.

---

# PIEZA 4 · Ciclo deja de depender del sexo biológico

> *"Para los hombres también puedes instalar ciclo menstrual y configurarlo como: yo no tengo
> ciclo, pero quiero ver el de mi pareja, o el de mis hijas."*

Hoy Ciclo se muestra u oculta según `biological_sex`, con `canAccessCycle` como predicado único.

**Se convierte en una app instalable por cualquiera, con un modo.**

| Modo | Qué es |
|---|---|
| **Propio** | es mi ciclo. Lo de siempre. |
| **Acompañante** | sigo el ciclo de otra persona |

⚠️ **Y aquí hay que pisar con cuidado, porque es lo más delicado de todo el run.**

- **En modo acompañante NO se comparten datos de nadie.** Es un calendario que el usuario lleva
  con lo que él sabe. **No hay conexión entre cuentas en este run.** Si algún día la hay, es su
  propio proyecto, con consentimiento de las dos partes y su revisión legal.
- El copy tiene que dejarlo clarísimo: **lo que registras aquí lo registras tú.**
- **ARGOS y la Edad ATP no pueden confundir los dos modos.** Un ciclo de acompañante **no puede
  entrar al contexto de salud del usuario ni a ningún cálculo suyo.** Esto es lo que más fácil se
  rompe y lo que peor se ve si se rompe.
- **`canAccessCycle` sigue siendo la fuente única** para lo que es *propio*. No lo dupliques:
  extiéndelo con el modo.

**Migración:** modo por app instalada. Idempotente, con RLS y su policy. Y **quien hoy tiene
ciclo por `biological_sex` debe quedar en modo propio, sin perder nada.**

---

# 🟡 LO QUE NO ES DE ESTE RUN

- Conectar cuentas para compartir ciclo de verdad.
- Ajustes nuevos que hoy no existen en ninguna pantalla.
- Tocar el comportamiento de HOY. **Este run no entra a TAREAS.**

---

# 📦 ENTREGA

Un commit por pieza. Migración idempotente con RLS.

En el reporte: **el set inicial que propones**, **qué apps quedaron sin descripción**, y **qué
ajustes moviste contra cuáles inventaste** (idealmente cero inventados).

**Verificación en dispositivo:**
1. La sala ATP muestra **solo lo instalado**, y no hay ninguna palomita.
2. La entrada al Centro **se ve sin hacer scroll**.
3. Desde el Centro se instala algo y **aparece en la cuadrícula**; se desinstala y desaparece.
4. Desinstalar y reinstalar **conserva el historial**.
5. La ficha explica qué hace la app, y su copy de instalar **dice la verdad** para las cuatro
   que no generan fila.
6. Buscar algo no instalado **ofrece encontrarlo en el Centro**.
7. Un usuario nuevo **no ve una cuadrícula vacía**.
8. Un hombre puede instalar Ciclo en modo acompañante, **y ese ciclo no aparece en su Edad ATP
   ni en el contexto de ARGOS.**
