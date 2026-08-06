# 🔒 AWAY RUN MB-22.1 · cerrar la fuga y no quitarle nada a nadie

**Rama:** seguir en `feat/mb22-centro`. Un commit por pieza.
`tsc`, Vitest y `npm run censo` en verde antes de cada commit.

---

# 🚨 PIEZA 1 · El ciclo de acompañante se cuela a los reportes del usuario

## La fuga

`src/services/reports-service.ts:449-471` (`getCycleReport`) consulta `cycle_daily_logs`
**directo, sin ningún gate**: ni `biological_sex`, ni modo, ni `getCycleInfo`.
`app/reports.tsx:133` la llama y `:249-256` pinta la sección Ciclo con **días de periodo,
energía promedio, humor promedio y número de registros** en cuanto hay logs.

**Un hombre que sigue el ciclo de su pareja o de su hija va a ver esos días y esos promedios de
energía y humor como métricas SUYAS en sus reportes.**

## Por qué se escapó, y la lección

Antes de MB-22 un hombre **no podía abrir `/cycle` ni crear filas** en esa tabla, así que la
falta de gate era inofensiva. MB-22 no introdujo el bug: **lo armó.**

⚠️ Es el patrón que hay que buscar siempre que se abre una puerta nueva: **código inofensivo
que se vuelve peligroso porque cambió quién puede llegar a él.**

## El arreglo

Gatear `getCycleReport` con `canAccessCycle(sex, mode)`, o esconder la sección cuando el modo
sea acompañante. **Y busca si hay más de esta clase:** cualquier consulta directa a
`cycle_daily_logs`, `cycle_periods` o `cycle_settings` que no pase por la raíz. Enumera lo que
encuentres, aunque hoy no fugue.

---

# 🚨 PIEZA 2 · Nadie puede perder apps de su cuadrícula

**Ocho apps no tienen ningún electrón**, así que nunca estuvieron en `installedApps`:
`rachas, movilidad, rm, records, recetas, lista-compra, labs, protocolos`.

**Al aplicar el OTA desaparecen de la sala de TODOS los usuarios actuales**, sin aviso.
Recuperarlas exige entrar al Centro e instalarlas una por una.

## La regla

**A quien ya tiene la app, no se le quita nada.** Sembrar `installedApps` en el primer arranque
con **todo lo que hoy es visible**, para que nadie pierda acceso. La limpieza es para quien
empieza de cero, no para quien ya está adentro.

Que sea idempotente y que corra una sola vez por usuario.

---

# 🚨 PIEZA 3 · Una mujer nueva no ve Ciclo

`period_log` no está en `DEFAULT_BOOLEANS`, así que **una usuaria que se registra hoy no ve
Ciclo en su cuadrícula.** Tiene que ir a buscarlo al Centro.

Es medio producto para la mitad de la audiencia, y es lo primero que verían Mariana o Pato.

**Decisión de Enrique:** Ciclo entra al set inicial **cuando `biological_sex` es female**, en
modo propio. Para los demás sigue estando en el Centro, instalable en cualquier modo.

---

# 🟠 PIEZA 4 · El blindaje no está amarrado donde vive el riesgo

La capa pura sí está probada: aflojar `cycle-access-core.ts:39` truena su test. **Pero la raíz
no:**

- **Cero** archivos de test importan `cycle-service`. Hacer que `getCycleInfo` **devuelva datos
  en acompañante no truena nada.**
- **Cero** tests mencionan `cycleMode` o `user_app_modes`. El filtro de `period_log` en
  `day-compiler.ts:398` **se puede borrar sin que falle nada.**
- **Cero** tests cubren `app-mode-service.ts`.

**Que existan tests en esos tres puntos, y que la mutación truene.** Reporta el resultado real
de las mutaciones, no la intención.

Y agrega uno para la fuga de la pieza 1, que es la que ya nos mordió.

---

# 🟡 PIEZA 5 · Lo chico

**5.1 · La descripción de Cardio dice algo que la pantalla no hace.** `app-registry.ts:95` dice
*"Correr, bici, caminar y remo"*. Las disciplinas reales (`fitness-cardio.tsx:37-41`) son
**Correr, Ciclismo, Natación y Remo**. Inventa caminar y omite natación. Es justo la categoría
que el brief prohibía. **Las otras 24 salieron limpias**, verificadas contra su pantalla.

**5.2 · El selector de modo va DEBAJO del botón de instalar** (`app/centro/[appKey].tsx:220`).
Una mujer que quiere seguir el ciclo de su hija, si toca instalar primero, **se instala como
propio, enciende `period_log` y le nace fila en TAREAS** antes de poder corregir.
**Que el modo se elija antes de instalar.**

**5.3 · Em dash en copy de usuario:** `app/centro/[appKey].tsx:415`, `${label} — ${hours} horas`.
El ratchet solo cubre `label` y `description` del registro, no las pantallas.

**5.4 · Corrige el reporte.** Afirma que la Edad ATP no consume ciclo por ninguna vía. Sí lo
hace: `app/edad-atp/biomarkers.tsx:28` y `:101` llaman `getCycleInfo`. **El comportamiento es
correcto** (en acompañante devuelve null y cae a "fase desconocida"), pero la frase es falsa y
alguien la va a usar como premisa.

**5.5 · "Wim Hof" es nombre propio en copy visible** (`app-registry.ts:76`). Aquí nombra una
técnica, así que puede quedarse, pero **que sea decisión escrita y no descuido.**

---

# 🟡 NOTAS, no de este run

- **`goals.protein_goal_g` no tiene writer** desde el commit `0a9241c` del 14-jul-2026, cuando
  murió ATP PROTOCOLOS. La leen `day-compiler.ts:351` y la adherencia; **nadie puede fijarla.**
  Deuda previa, pero significa que la meta de proteína de la card de HOY es un número que el
  usuario no puede cambiar.
- `compileDay` suma una consulta más al `Promise.all` (`user_app_modes`) en cada compilación.
- `kit.tsx:96` hace `router.replace('/centro')` desde un tab para el deep link `kit?agregar=1`.
  Verificar en device que no deje el tab raro.

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: **el resultado real de las mutaciones** de la pieza 4, y
**qué otras consultas directas a tablas de ciclo encontraste** en la pieza 1.

**Verificación en dispositivo:**
1. Instalar Ciclo en modo acompañante, registrar días, **y abrir Reportes: la sección Ciclo NO
   aparece.**
2. Un usuario que ya tenía apps **no pierde ninguna** al actualizar.
3. Una cuenta nueva con sexo femenino **ve Ciclo** en su cuadrícula.
4. En la ficha de Ciclo, **el modo se elige antes de instalar.**
5. Cardio dice natación, no caminar.
