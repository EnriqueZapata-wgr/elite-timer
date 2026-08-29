# Entrega de la noche · 29-ago-2026

Rama `overnight/28-ago`. Cinco commits nuevos, de `b5f1027` a `f485ec7`.

---

## LO PRIMERO, y es lo que cambia tu mañana

**El merge a main NO cayó.** Y no fue que se te olvidara: encontré por qué.

Un `git checkout main` se quedó **a medias**. Escribió el índice y reescribió
los 2,579 archivos del árbol con el contenido de main, pero **nunca movió
HEAD**. Git actualiza la referencia al final, y en este montaje esa escritura
falla de forma intermitente (es el mismo problema de los `index.lock` que
llevamos peleando dos noches).

El resultado era un repositorio que se veía roto: `main` seguía ocho commits
atrás, el árbol tenía el contenido de main, el índice marcaba como borrados
los archivos que solo existen en la rama, y HEAD decía `overnight/28-ago`.
La migración 309 y `fasting-stats-core.ts` habían desaparecido del disco.

**Nada se perdió.** Los commits estaban intactos; lo que estaba mal era el
árbol de trabajo. Lo reconstruí archivo por archivo desde el commit, porque
`git reset --hard` no lograba reescribir el índice en este montaje.

Y **tus cinco archivos sin commitear** (`MANUAL_DE_MARCA_ATP.md` y los cuatro
de `embudo/`) están **intactos**: los respaldé antes de tocar nada y verifiqué
md5 antes y después. Coinciden byte a byte. El respaldo sigue en
`_respaldo_enrique_20260829-040028/` por si acaso; bórralo cuando quieras.

**Dos consecuencias para ti:**

1. **La OTA que lanzaste publicó el contenido de main, no el de la rama.** En
   ese momento el árbol tenía el contenido viejo. No hizo daño (publicó lo
   que ya estaba vivo), pero el trabajo de la noche del 28 **no está en
   producción todavía**.
2. **Corrígeme si me equivoco, pero yo NO volvería a hacer el checkout desde
   este montaje.** Hazlo desde tu terminal de Windows, que es la que escribe
   el disco de verdad, y verifica con `git branch --show-current` que HEAD sí
   se movió antes de seguir.

---

## Lo que quedó hecho esta noche

### 1 · Fitness: el historial decía cero porque leía una tabla muerta

El síntoma que reportaste. No era presentación, ni RLS, ni zona horaria.

`saveWorkoutSession()` guarda en `workout_sessions`, pero cinco consultas
seguían leyendo `execution_logs`, la tabla de la época de `/execution`, que
murió en el commit `c4f846f`. **Hoy nadie la escribe**, ni la app ni el
servidor, y ni siquiera tiene `CREATE TABLE` en las migraciones.

Lo curioso es que la casa ya sabía el arreglo: `fitness-hub` lo hizo en su
día y dejó el comentario escrito. Las tres pantallas que te fallaban se
quedaron atrás.

Migradas las cinco consultas, y contando **días entrenados** y no filas, que
es como ya contaba `fitness-hub`. Sin eso, dos pantallas dirían números
distintos del mismo mes.

**Lo que NO hice, a propósito:** ningún backfill. El escritor hace `upsert`
por `id` para que un reintento no duplique; un backfill que reutilice o
invente `id` puede **pisar sesiones reales**, y uno sin deduplicar te duplica
el historial y te infla volumen y racha. No hacía falta: es cliente puro.

### 2 · La app dejó de mentir con ceros

Dos agentes barrieron los cuatro estados que más se descuidan. El patrón
estaba en todos lados: `supabase-js` **no lanza** en 4xx ni 5xx, devuelve
`{ data: null, error }`, y una decena de lecturas hacen `?? []` sin mirar el
error. O sea que la app te dice que no hiciste nada cuando lo que pasó es que
no pudo preguntar.

| Dónde | Qué pasaba |
|---|---|
| **Reportes** | Once lecturas en `Promise.all` sin `.catch`. Si UNA tronaba, las once secciones se quedaban en cero y se veía como el reporte legítimo de alguien que no hizo nada en 30 días. **Con botón de exportar a PDF "para tu consulta".** Es el único documento que sale de la app hacia un médico. |
| **Reportes (carga)** | Pintaba todos los ceros mientras cargaba. El usuario alcanzaba a leerlos y creérselos antes del salto. |
| **Suplementos** | Cero señal de carga en 901 líneas. En cada entrada, alguien con ocho fichas veía el estado vacío con el botón "CREAR MI PRIMERA FICHA". |
| **Historial** | "Sin sesiones registradas" a quien lleva meses entrenando. |
| **HOY** | Agua y proteína caían a cero por un fallo de lectura, y arrastraban el ATP Score. |

### 3 · Copy

- El canal de notificaciones decía **"Avisos para no perder tu racha"**. Era
  la única cadena de la app que enmarca la constancia como algo que se pierde,
  y contradice lo que la propia app dice cuando una racha sí se rompe ("Tu
  historial y tu racha siguen intactos"). Ahora acompaña en vez de amenazar.
- **23 em dashes** de prosa en 14 archivos, limpiados, más un candado
  (`copy-sin-em-dash.test.ts`) que nace **sin lista de excepciones**. Protege
  a propósito el em dash SOLO como glifo de "no hay dato", que es el que dice
  la verdad cuando no se sabe algo.

### 4 · Candados

Los dos ratchets de literales de color ahora escanean también `.ts` (era un
punto ciego documentado) y caminan `src/screens/`, que incluye
`ClientDetailScreen` con sus 4,200 líneas. Antes esas superficies **no las
miraba nada**.

---

## Los errores que cometí, y que los cuatro ojos cazaron

Los escribo porque son la parte útil.

1. **Puse un `throw` dentro de un `try` cuyo propio `catch` lo anulaba.** Todo
   el arreglo del historial era código muerto, con copy nuevo encima que lo
   hacía más creíble.
2. **Dejé suplementos peor que antes.** Condicioné el estado vacío a una
   bandera que un camino de `loadAll` nunca ponía: si `getUser()` fallaba en
   arranque en frío, la pantalla se quedaba **en blanco para siempre**.
3. **La bandera de fallo de suplementos solo miraba las fichas**, no los logs.
   Un fallo de logs dejaba las tomas de hoy sin palomear (riesgo real de doble
   toma) y pintaba 0% de adherencia como dato bueno.
4. **Dejé la insignia del historial clavada en RUTINA** para todo, incluidas
   las sesiones manuales, porque mapeé la columna nueva y no actualicé la
   comparación.
5. **Importé `logWarn` y el logger exporta `warn`.** Habría tronado en `tsc`.

Las cinco están corregidas. Ninguna la encontré yo solo.

---

## Los comandos de tu mañana

```
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
git branch --show-current
npx tsc --noEmit
npm test
```

Debe decir `overnight/28-ago`. Si dice otra cosa, para y me avisas.

Si los dos salen verdes, **el merge, desde tu terminal de Windows**:

```
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
git checkout main
git branch --show-current
git merge --ff-only overnight/28-ago
git push
```

Metí `git branch --show-current` en medio a propósito: **si no dice `main`,
el checkout se volvió a quedar a medias y hay que parar ahí.** Es exactamente
lo que pasó anoche.

Y después:

```
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
npx supabase db push
eas update --branch preview --message "Fitness, estados de error y copy"
```

---

## Lo que hay que probar en dispositivo, en este orden

Las tres son de dos minutos y cubren lo más riesgoso de la noche:

1. **Avión encendido, arranque en frío en HOY.** Debe salir la pantalla de
   error con reintento, y el reintento debe funcionar al restaurar la red.
   Este es el cambio de comportamiento más grande: antes un fallo de 1 de 23
   consultas dejaba HOY en pie con dos ceros mentirosos; ahora deja HOY en
   negro con reintento. Es el criterio que la casa ya tenía escrito, pero es
   la pantalla más usada y merece verse.
2. **Avión encendido, entrar a Suplementos.** No debe quedarse en blanco.
3. **Entrena algo y abre `/progress` y `/history`.** Deben dejar de decir
   cero, y la insignia debe decir MANUAL o RUTINA según cómo lo registraste.

---

## Deuda que dejo dicha

- **`getMonthlyStats` usa mes calendario y `getExerciseReport('month')` usa 30
  días rodantes.** Dos criterios para la misma palabra. Hoy no se ve porque
  publican cifras distintas, pero es una contradicción viva.
- **Las cinco funciones migradas no tienen ni un test.** Las verifiqué
  ejecutándolas contra un supabase falso, pero eso no quedó en el repositorio.
  Nada impide que alguien las vuelva a apuntar a una tabla muerta.
- **Los quince colores de dominio fallan el 3:1 como icono en tema claro** (de
  1.17 a 2.90). Van siempre con su título al lado, así que no se pierde
  significado. Recalibrar quince colores de identidad sin ver un dispositivo,
  a ocho días de tienda, es el cambio que no se hace de noche.
- **El nido de nutrición de `ClientDetailScreen`** (unos 10 usos de rojo para
  scores de comida y macros) necesita una decisión tuya: si un score de
  nutrición de 45 merece el mismo rojo que una condición cardíaca presente.
  Yo creo que no, pero cambiarlo sin regla es sustituir una arbitrariedad por
  otra.
- **`app/(tabs)/kit.tsx`**: si falla la lectura del perfil, la app de CICLO
  simplemente **desaparece** del kit, sin hueco ni aviso. El default que
  eligieron es defendible, pero un error de red y un perfil sin sexo biológico
  se tratan igual. Eso merece una conversación con Mariana, no un parche
  nocturno.
- **`getWeeklyStats` es código muerto.** Nadie la llama.
