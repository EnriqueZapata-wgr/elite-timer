# 🧠 AWAY RUN MB-26 · El día inteligente

**Rama:** `feat/mb26-dia` desde `main` · worktree propio (el checkout principal es de Enrique).
**Trae migración.** `tsc`, Vitest y `npm run censo` en verde antes de cada commit.
Migraciones idempotentes + RLS + policy, aplicadas con `npx supabase db push`.

⚠️ **Antes de tsc:** si truena en rutas (`Href`, `/packs`, `/centro`), tu
`.expo/types/router.d.ts` está viejo. Regenéralo arrancando expo unos segundos. **Nos ha
costado tres veces.** Y si puedes dejarlo resuelto de raíz (script que lo regenere antes
del typecheck), hazlo y repórtalo.

---

# EL DIAGNÓSTICO

HOY de Enrique: **17 renglones.** No es que haya hecho algo mal.

**HOY tiene puerta de entrada y no tiene puerta de salida.** Encender es la única operación
que la app conoce: todo hábito que alguna vez encendiste vive ahí para siempre. No existe
"esto ya lo domino" ni "esto no ahorita".

Con esa arquitectura **cada pack nuevo empeora la app.** Por eso este bloque va antes que
peso, rutinas y nutrición: el techo se pone antes de seguir construyendo.

---

# PIEZA 1 · Tres estados del hábito

Hoy un hábito solo puede estar encendido o apagado (`electron-prefs`). Se vuelven **tres**,
y **nada se borra nunca**:

| Estado | Qué significa |
|---|---|
| **activo** | lo estás trabajando ahora. Ocupa renglón en HOY con su hora. |
| **graduado** | ya es parte de ti. **Sale de la lista, se sigue midiendo.** |
| **reposo** | no ahorita. Sale de HOY, conserva historial y racha, vuelve cuando quieras. |

**Migración `255_habit_states`:** estado por hábito y por usuario, con `graduated_at` /
`paused_at`. Idempotente, RLS, policy. **Quien no tenga fila = activo** (el comportamiento
de hoy: nadie pierde nada al actualizar).

⚠️ **Los `MANDATORY_BOOLEANS` pueden graduarse y reposar como cualquiera.** Lo que NO
pueden es desaparecer sin dejar rastro: siguen contando para reportes y Edad ATP. Lee el
comentario de `day-booleans.ts:40-48` antes de tocar nada ahí — el bug de `checkin` nació
justo de un hueco así.

⚠️ **Los electrones verificados** (`VERIFIED_ELECTRON_KEYS`) graduados **siguen otorgando
su electrón** cuando hay actividad real. Graduar quita el renglón, **nunca el crédito.**

---

# PIEZA 2 · Graduación

**La regla:** un hábito activo que se cumple **30 de los últimos 35 días** es candidato a
graduarse.

- La app **propone**, el usuario acepta. ⚠️ **Nunca gradúa solo:** quitarle a alguien un
  renglón sin permiso es quitarle algo que ganó.
- **Si recae** (se le va 5 de 7 días), **vuelve solo a activo** y se avisa sin regaño.
- El estante de graduados es visible: *"esto ya es parte de ti"*. Es premio, no archivo.

⚠️ **El historial está en `daily_electrons` por fecha.** Calcula sobre eso; **no inventes
tabla de rachas nueva** — `mente-streaks-*` ya existe y es de otro dominio.

---

# PIEZA 3 · El techo del día

**Ocho renglones activos.** No es configuración: es el default que protege el día.

- Encender el noveno (a mano o por pack) **avisa y ofrece qué mandar a reposo**, con
  candidatos sugeridos (los que llevas más tiempo fallando).
- **El usuario puede pasarse si insiste.** Guiado, no prisionero: se avisa una vez y se
  respeta la decisión.
- ⚠️ **El techo cuenta activos, no graduados.** Graduar libera renglón: ese es el premio.

---

# PIEZA 4 · Ordenar mi día

La salida al desmadre que ya existe. En HOY (abajo, donde hoy está *"Elegir mis hábitos"*)
y en el Centro.

Ofrece **tres caminos, uno por pantalla**:

1. **Empezar de cero:** todo a reposo y reconstruyes. ⚠️ El copy debe decir clarísimo que
   **nada se desinstala y nada se borra**: solo salen de la lista.
2. **Quedarme con lo esencial:** deja activos los de tu pack aplicado más reciente, el
   resto a reposo.
3. **Que ARGOS proponga:** lee tu adherencia real y sugiere qué graduar, qué dejar y qué
   parkear. ⚠️ **Propone; el usuario acepta o edita.** Nada se mueve solo.

⚠️ **Este flujo NO desinstala apps.** Son cosas distintas y el copy tiene que separarlas.

---

# PIEZA 5 · Las horas dejan de ser texto y se vuelven REGLA

**El cambio de fondo del run.**

Hoy `habit-times-service` guarda `"07:30"`. Por eso quien viaja a Alemania sigue con
horarios de México, y cambiar tu hora de despertar no recorre nada.

**Se guarda la regla** (`{ancla: 'despertar'|'dormir'|'uv', offsetMin}`) y la hora absoluta
**se calcula al compilar el día**, contra el reloj local y el horario real del usuario.
`PackHora` de `pack-core.ts:66` ya es exactamente esta forma: **reúsala, no la dupliques.**

**Gratis con esto:** viajas y todo se recorre solo · cambias tu horario y no reconfiguras
nada · el pack no reescribe horas cuando cambia tu vida.

**El horario base sale del cronotipo** (que ya existe) **y lo pisa el horario real.** Si el
lobo se levanta a las 6 por los niños, **la app se ajusta a su vida** y aparte le dice qué
le está costando. ⚠️ **No preguntes más:** el cronotipo ya está, y despertar/dormir ya los
da el pack. Menos decisiones, no más.

⚠️ **Compatibilidad:** quien ya tenga override absoluto en `goals.habit_times` **lo
conserva** como regla fija. Nadie pierde su hora al actualizar.

---

# PIEZA 6 · El sol se ancla al UV real

Hoy `sunlight` vive a las 07:30 fijas. **La app ya sabe tu ventana buena de vitamina D**
por tu ubicación (`uv-service.ts`: `fetchUVData`, `getCurrentLocation`) — la pantalla de
HOY ya la muestra.

**Ancla `sunlight` a esa ventana**, no a que despiertes. Es dato que ya pagamos y no
usamos.

⚠️ **Degrada con gracia:** sin permiso de ubicación, sin red o sin dato de UV, **cae a
despertar + 30** y lo dice. Nunca dejes el hábito sin hora.

---

# PIEZA 7 · Los packs, corregidos

Sale de la verificación en dispositivo de MB-25:

**7.1 · Fuera "desactivar".** Un pack **no es un modo, es un instalador.** Desactivar no
hacía nada visible: un botón que miente por omisión.
- Se **aplican y se acumulan**; puedes aplicar varios.
- **La fila de `user_packs` se queda** (hace idempotente el re-aplicar y la va a leer
  ARGOS en MB-32). Lo que se va es el botón y el concepto de "pack activo" en la UI.
- El copy pasa de *activar* a **aplicar**.

**7.2 · Fuera la pregunta de suave contra con todo.** Menos decisiones.
**El pack entra por etapas:** aplica sus **tres core** y los demás llegan **cuando
sostienes los primeros** (misma señal que la graduación: 14 de 21 días). El usuario puede
adelantarlos si quiere. ⚠️ `core: true/false` **ya está en el registro de packs**: úsalo,
no lo redefinas.

**7.3 · Aplicar respeta el techo** de la pieza 3.

---

# PIEZA 8 · Copy viejo que ya choca

- **"Ajustar Mi Protocolo"** (abajo en HOY) es nombre muerto desde que murió ATP
  PROTOCOLOS y ahora choca de frente con los packs. Renómbralo con el criterio del design
  system, o retíralo si su destino ya lo cubre otra entrada. **Reporta qué decidiste.**
- Barre lo que quede de *activar/desactivar pack* en copy, tests y comentarios visibles.

---

# PIEZA 9 · Tests que amarran

1. **Nada se borra:** graduar y reposar conservan historial; el hábito vuelve a activo con
   su racha intacta. La mutación que borre truena.
2. **Verificado graduado sigue dando electrón** con actividad real.
3. **Graduación:** 30/35 propone, 29/35 no. Recaída 5/7 devuelve a activo.
4. **Techo:** el noveno avisa; forzar se respeta; graduados no cuentan.
5. **Horas como regla:** mismo hábito, dos zonas horarias, dos horas absolutas correctas.
   Cambiar despertar recorre todo. **Override absoluto previo se conserva.**
6. **Sol sin ubicación** cae a despertar + 30 y no queda sin hora.
7. **Etapas:** aplicar enciende 3; a los 14/21 propone el siguiente.
8. **Quien no tenga fila de estado sigue activo** (nadie pierde nada al actualizar).

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 🟡 LO QUE NO ES DE ESTE RUN

- Peso, rutinas y fase del ciclo (eso es MB-27).
- Que ARGOS opere los packs solo (MB-32).
- Anclar las horas canónicas de TODOS los hábitos al cronotipo con criterio fisiológico
  fino (meditar = despertar + 45, cardio según si entrenas mañana o tarde). **Este run deja
  la maquinaria; la tabla de criterios la revisa Enrique después.**

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: qué decidiste con "Ajustar Mi Protocolo", el resultado
real de las 8 mutaciones, y **cuántos hábitos activos le quedarían hoy a un usuario
existente** con estas reglas.

**Verificación en dispositivo (Enrique):**
1. HOY ofrece **ordenar mi día**; "empezar de cero" deja la lista limpia **y las apps
   siguen instaladas.**
2. Un hábito con 30 días **se ofrece graduar**; al aceptar sale de la lista y sigue en
   reportes.
3. Encender el noveno **avisa y ofrece qué parkear.**
4. Cambiar la hora de despertar **recorre las horas de los hábitos anclados.**
5. Luz solar cae en **tu ventana real de UV**, no a las 7:30 fijas.
6. Aplicar un pack **enciende 3, no 6**, y ya no existe "desactivar".

---

# 🔒 PROTOCOLO DE CIERRE

**Al terminar: reporta y DETENTE. No merges sin el verde del audit de Cowork.**

Con el verde: checks en verde en tu worktree → merge a `main` (**si dice "Aborting":
DETENTE y reporta, jamás fuerces**) → checks **otra vez sobre el resultado del merge** →
`git push` → **`npx supabase db push` ANTES del OTA** (hay migración) → `eas update
--branch preview` → reporta. **La versión de `app.json` NO se toca.**
