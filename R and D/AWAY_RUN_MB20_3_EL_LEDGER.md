# 🔒 AWAY RUN MB-20.3 · el ledger deja de ser un arma cargada

**Rama:** seguir en `feat/mb20-1-editorial`. Un commit por pieza.
**Cero migraciones de esquema.** `tsc`, Vitest y `npm run censo` en verde antes de cada commit.

## Por qué existe este run

Dos cambios de **presentación** del run anterior llegaron al **ledger** y borran electrones ya
ganados. Los dos están confirmados contra la base de producción, no deducidos.

La causa común es más grande que los dos bugs: **el reconcile revoca electrones a partir de
`verifiedCompleted`**, así que cualquier cambio en cómo se deriva "completado" puede destruir
datos del usuario. Este run arregla los dos casos **y le pone el seguro al arma.**

---

# 🚨 PIEZA 1 · Entrenar: la consulta que borra el electrón

## El bug

`day-compiler.ts:205`:

```ts
supabase.from('exercise_logs').select('date')
  .eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
```

`exercise_logs.date` es **nullable, sin default y sin backfill** (`045_fitness_deep.sql:38`). En
`ORDER BY date DESC` Postgres pone **NULLS FIRST**, así que una sola fila con fecha nula se lleva
el `limit(1)`.

**En producción:** 110 de 206 filas tienen `date` nulo, y **los 2 usuarios con datos tienen una
fila nula arriba.**

## El daño

`verifiedCompleted.strength` (`day-compiler.ts:253`) es **false siempre**, incluso justo después
de entrenar. Y como `strength` sigue dentro del reconcile (`:395`, que solo excluye `meditation`
y `breathwork`), **cada compilación de HOY llama a `revokeBooleanElectron` y borra el
`electron_logs` del día.** Peso 3.0, el más caro del día.

La consulta anterior era inmune: contaba filas con `date = today` y las nulas no contaban.

## El arreglo

Excluir los nulos explícitamente (`.not('date','is',null)` o `nullsFirst: false`).

⚠️ **Y el mismo patrón en `nback_sessions.date`**, también nullable (`218_nback_v1.sql:23`). Hoy
no hay nulos en producción, pero es la misma bomba sin detonar.

`cardio_sessions.date` y `journal_entries.date` son `NOT NULL DEFAULT CURRENT_DATE`: esos están
bien, **verifícalo antes de tocarlos.**

---

# 🚨 PIEZA 2 · Suplementos: el "cambio menor" que cuesta el electrón

## El bug

El run anterior cambió la fuente a `user_supplements` con `.eq('is_active', true)`, y
`supplementsTodayProgress` descarta los logs que no estén en esa lista
(`supplements-adherence-core.ts:177`).

`supplements` **también está en el reconcile.** Si `completed` cae a falso, no se despalomea la
card: **se borra el electrón del día.**

**En producción:** hay **143 logs con `taken = true` que pertenecen a suplementos hoy inactivos**,
en 2 usuarios. Desactivar un suplemento después de registrarlo ya es algo que la gente hace.

## El arreglo

**Separar las dos preguntas, que nunca debieron ser una:**

- **`completed`** se deriva como antes: **cualquier log con `taken = true` de hoy**. Si te lo
  tomaste, te lo tomaste, aunque después desactivaras ese suplemento.
- **El "X de Y" de la card** usa los suplementos **activos**, que es lo que tiene sentido mostrar.

El hallazgo de CC sobre `user_supplements.dose_times` era correcto y el embed sin round trip
extra se conserva. **Lo que se separa es qué alimenta el ledger y qué alimenta la card.**

---

# 🔒 PIEZA 3 · El seguro del reconcile

Esta es la pieza que importa más que las dos anteriores, porque evita las siguientes.

## El problema de fondo

El reconcile revoca un electrón cuando `verifiedCompleted[k]` es `false`. Pero **hoy no
distingue dos cosas que son completamente distintas:**

| Situación | Qué significa | Qué debe pasar |
|---|---|---|
| La fuente dice que **no lo hizo** | evidencia positiva de ausencia | revocar está bien |
| La consulta **falló, vino vacía o la fuente no está disponible** | no sabemos | **NUNCA revocar** |

Los dos bugs de arriba son del segundo tipo: una consulta empezó a devolver algo inútil y el
sistema lo interpretó como *"no lo hizo"*.

**La regla:** *la ausencia de evidencia no es evidencia de ausencia.* Cuando no sabemos, **el
dato del usuario gana.**

## Qué construir

1. Que `verifiedCompleted` pueda expresar **tres estados**, no dos: hecho, no hecho, y **no se
   sabe**. Si la consulta de esa llave falló o no pudo evaluarse, es "no se sabe".
2. **El reconcile solo revoca con evidencia positiva.** Con "no se sabe", deja el electrón en paz.
3. **Toda revocación deja rastro** en el log de la app, con la llave y el motivo. Si un día
   volvemos a borrar electrones sin querer, que se pueda ver.

## Y los tests que lo amarran

- Una consulta que falla **no revoca**.
- Una consulta que viene vacía **por error de la fuente** no revoca; una que viene vacía **porque
  de verdad no hay actividad** sí.
- **Prueba de mutación obligatoria:** rompe a propósito una de las consultas del reconcile
  (devuelve `null`, o un error) y verifica que **ningún** electrón se borre. Reporta el resultado
  real, no la intención.

⚠️ Si al construir esto descubres que el reconcile no puede distinguir los dos casos sin
rediseñarlo, **para y repórtalo.** Es mejor sacar `strength` y `supplements` del reconcile hoy y
hacerlo bien después, que dejar el arma cargada.

---

# 🟠 PIEZA 4 · Las rutas: podar y que el test sirva

## 4.1 · De nueve entradas, siete son duplicado

`VERIFIED_ELECTRON_ROUTES` se conservó como "primera capa granular". Pero **siete de sus nueve
entradas son idénticas al puente**, y solo dos divergen de verdad:

```
checkin   /checkin      el puente diría /emotions
cardio    /log-cardio   el puente diría /fitness-cardio
```

Las otras siete son duplicado puro: el día que el registro mueva `meditar` a otra ruta, TAREAS
va a seguir mandando a `/meditation` y **nada va a avisar.**

**Dejar solo esas dos, con su motivo escrito al lado.** Todo lo demás resuelve por el puente.

## 4.2 · El test se compara contra sí mismo

`tareas-core.test.ts:231-235` itera `Object.entries(VERIFIED_ELECTRON_ROUTES)` y asegura que
`routeForBool(key)` devuelva esa ruta. Como esa constante **es** la primera capa de
`routeForBool`, **el test no puede fallar.**

Probado por mutación: cambiar `checkin` a `/pantalla-que-no-existe` deja **los 55 tests en verde
y el censo en verde.**

## 4.3 · El test que sí sirve

Que **cruce cada ruta contra los archivos reales de `app/`** y falle si apunta a una pantalla
que no existe. Aplícalo a `VERIFIED_ELECTRON_ROUTES`, a `QUANT_ROUTES` y a las rutas del
registro de apps.

⚠️ **Por qué hace falta un test y no basta el tipado:** `Href` cazaría una ruta inventada, pero
`.expo/types/router.d.ts` está destrackeado y el CI no lo regenera, así que en CI el tipo degrada
y no caza nada. **Esa decisión fue mía y este es su costo.** Un test que lee `app/` no depende de
archivos generados.

---

# 🟡 PIEZA 5 · Notas del audit

**5.1 · `optimize-images` degrada en cada corrida.** `SKIP_IF_SMALLER_KB = 200` y 7 de los 11
JPEG quedaron arriba de ese umbral, así que volver a correrlo los re-encodea q85 sobre q85 y el
guard de tamaño no lo frena. **Pérdida generacional acumulada.** Marca de "ya optimizado", o
salto por dimensiones (ya están todos a 2048 px).

**5.2 · `nback` ordena por `completed_at` y compara `date`** (`day-compiler.ts:224`). Campos
distintos para ordenar y para decidir. Hoy no falla, pero una sesión que cruza medianoche
desalinea.

**5.3 · `pillarRoute` no salió del modelo** como decía el reporte. Salió de `TareaBoolLike`, pero
sigue en `day-compiler.ts:64` y se puebla en `:383`, igual que `description` en `:382`. Su único
consumidor es `HoyEditorialSection.tsx`, que el censo ya marca como archivo que nadie importa.
**Bórralos junto con el archivo huérfano**, o dilo si algo todavía lo necesita.

**5.4 · Los JPEG quedaron progresivos** (mozjpeg por default). `expo-image` los decodifica bien,
pero es un cambio de formato interno que no estaba declarado.

---

# 📦 ENTREGA

Un commit por pieza. En el reporte:

1. **El resultado real de la prueba de mutación del reconcile.** Es la más importante del run.
2. Si el reconcile no pudo distinguir los dos casos, **qué se hizo en su lugar.**
3. Cuántas rutas quedaron en `VERIFIED_ELECTRON_ROUTES` y por qué cada una.

**Verificación en dispositivo:**
1. Registrar un entrenamiento → **la card Entrenar se palomea y muestra su dato.**
2. Volver a HOY varias veces → **el electrón de fuerza sigue ahí.** Este es el crítico.
3. Registrar un suplemento, desactivarlo, y volver a HOY → **el electrón sigue ahí.**
4. Las cards siguen mandando a donde deben, y las que no tienen ruta siguen sin flecha.
