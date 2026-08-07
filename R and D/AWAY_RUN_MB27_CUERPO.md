# 💪 AWAY RUN MB-27 · Cuerpo

**Rama:** `feat/mb27-cuerpo` desde `main` · worktree propio.
**Trae migración.** `tsc`, Vitest y `npm run censo` en verde antes de cada commit.

> 🛫 **MODO REMOTO VIGENTE (6 al 9 de agosto).** Este run NO se mergea, NO corre
> `db push` y NO sale por OTA. Lee el bloque **PROTOCOLO DE CIERRE** al final antes
> de empezar: el protocolo normal está suspendido y el cierre es distinto.

⚠️ **Antes de tsc:** si truena en rutas (`Href`, `/packs`, `/centro`), regenera
`.expo/types/router.d.ts`. MB-26 dejó `scripts/regen-router-types.js` y el paso en CI:
úsalo, no lo redescubras.

⚠️ **`goals.habit_times` cambió en MB-26.** Ya no es `string`, es `string | {ancla, offsetMin}`.
Cualquier lector nuevo que asuma string se rompe. Los únicos lectores legítimos son
`habit-times-core`, `habit-times-service`, `day-compiler` y `pack-service`. **No agregues un
sexto: pasa por `resolverHabitTimes`.**

---

# EL DIAGNÓSTICO

MB-25 dio el motor y MB-26 le puso techo al día. **Los dos operan sobre hábitos que ya
existían.** Este run construye lo que falta: el cuerpo.

Cuatro de los diez perfiles siguen bloqueados por tres huecos, y son perfiles caros:
**Bajar grasa** (el comercialmente más grande), **Ganar músculo**, **Volver a moverme** y
**Mi ciclo a mi favor**.

**El hallazgo que abarata este run:** los tres huecos NO son de cero. La infraestructura
existe y está huérfana o duplicada. Este run conecta más de lo que construye.

| Hueco | Lo que se creía | Lo que hay de verdad |
|---|---|---|
| **H1** peso y medidas | no existe nada | existen **tres** tablas solapadas y dos pantallas de captura. Falta app, gráfica y **decidir cuál manda** |
| **H2** rutina al día | hay que construirlo | `scheduled_routines` + RPC `get_today_routines` existen desde la migración **001**. **Cero consumidores en `app/`** |
| **H4** fase del ciclo | Entrenar no sabe nada | `getPhase()` existe y es canónico, pero está **triplicado con umbrales distintos** y nunca llega a Entrenar |

⚠️ **Antes de escribir código nuevo, verifica si ya existe.** Este run se ganó revisando
migraciones viejas, no inventando tablas.

---

# PIEZA 0 · Los fixes de MB-26 que ya están en main

Van adentro de este run porque **tocan las mismas superficies** que las piezas 1 a 4. La
regla del plan maestro es que cada superficie se toca una vez.

## 0.1 · `esHoraValida` acepta lo que la base rechaza 🔴

**El único de los seis que rompe algo hoy.** `esHoraValida` en `pack-core.ts` usa
`/^(\d{1,2}):(\d{2})$/` y acepta `"7:00"`. El CHECK de `user_packs` (migración 254) exige
`^[0-2][0-9]:[0-5][0-9]$`. Quien escriba `7:00` en la entrada de packs **pasa la validación
del cliente y truena al guardar**, en el último paso, después de que todo lo demás ya se
aplicó.

- **Alinea el cliente con la base**, no al revés. Normalizar a dos dígitos es aceptable;
  aceptar y guardar `7:00` no lo es.
- ⚠️ **El CHECK también acepta `29:59`**, que el cliente sí rechaza. La validación de rango
  se queda en el cliente: no relajes el CHECK.
- **Test de mutación:** cambiar la regex a `\d{1,2}` debe tronar un test.

## 0.2 · El techo cuenta renglones que HOY nunca pinta

`evaluarEncendido` (`techo-core.ts`) mete los nuevos en `booleans`, pero `renglonesDeHoy`
solo filtra `steps` y `sleep` de la lista de quants. Instalar la app sueño o encender el
quant Sueño **suma un renglón fantasma**: el aviso "tu día ya está lleno" se dispara con 8
renglones reales, no 9.

- El filtro de quants sin fuente debe aplicarse **también** a los candidatos nuevos, no solo
  a los persistidos.

## 0.3 · `hoy-habitos` no ve los estados

La pantalla lee solo `electron-prefs`. Un hábito mandado a reposo por `/ordenar-dia` o por el
Alert del techo **se sigue viendo encendido ahí**. La única forma de sincronizar hoy es
apagarlo y volverlo a prender.

- Que lea `getHabitStates` y refleje reposo y graduado.
- ⚠️ **Sin fila = activo** sigue mandando. Si la lectura falla, la pantalla se comporta como
  hoy. Fail-open, igual que MB-26.

## 0.4 · `togglesForApp` excluye los MANDATORY 🔗 pega en la pieza 4

`installApp` no reactiva `cardio`, `journal`, `checkin`, `screen_time_cutoff` ni
`no_processed_foods`, porque `togglesForApp` los deja fuera. Si el usuario los mandó a
reposo, reinstalar su app **no los devuelve**.

- ⚠️ **Esto es exactamente el toggle silencioso que MB-26 dice cerrar.** Y pega directo en la
  pieza 4: un usuario con `cardio` en reposo importa su cardio y no ve nada.
- Que `reactivarHabitos` alcance también a los MANDATORY de la app que se instala.
- **Test de mutación:** mandar `cardio` a reposo, instalar la app Cardio, y `cardio` debe
  volver a activo.

## 0.5 · `buildAgenda` usa el despertar crudo

Recibe `wakeFromPrefs` directo, no el `despertar` resuelto con cronotipo y default que MB-26
introdujo. **La agenda y las tareas pueden usar horas de despertar distintas para el mismo
usuario el mismo día.**

- Pásale el resuelto. Es un solo hilo, pero es incoherencia visible.

## 0.6 · El comentario mentiroso de la 254 🆓

El encabezado de `254_user_packs.sql` dice *"UN pack activo a la vez (active)"*. MB-26 P7.1
lo invalidó: los packs se acumulan y `active` quedó **vestigial, siempre true**. Quien lea la
migración desde SQL concluye algo falso.

- Corrige el texto del comentario en el archivo de migración y marca `active` como vestigial.
- ⚠️ **No borres la columna ni escribas una migración para tumbarla.** Es texto, no esquema.

---

# PIEZA 1 · H1 · Peso y medidas

**Desbloquea "Bajar grasa", el perfil comercialmente más grande.** Es el pack cuyo resultado
hoy no podemos mostrar.

## 1.1 · La decisión que va primero: cuál tabla manda

**Hay tres tablas de composición corporal y ninguna es obviamente la buena.** Antes de tocar
UI, dictamina esto y repórtalo:

| Tabla | Origen | Quién escribe hoy | Qué tiene de único |
|---|---|---|---|
| `body_measurements` | mig **007** | **solo el panel de coach** (`client-profile-service`) | brazo, pierna, pecho, fotos, `measured_by` |
| `health_measurements` | mig **030** | **el usuario**: onboarding, `/health-input`, `/edad-atp/composition` | `UNIQUE(user_id, date)`, cuello, alimenta Edad ATP |
| `edad_atp_body_composition` | mig 071 | nadie | fallback muerto |

**El criterio, y la recomendación:** `health_measurements` es la canónica del usuario. Es la
que ya llena, la única con unicidad por día, y la que alimenta Edad ATP y el score. La
migración **256 es un ALTER a `health_measurements`** que le agrega lo que solo tiene la otra:
`arm_cm`, `leg_cm`, `chest_cm`.

⚠️ **`body_measurements` NO se tumba ni se migra.** Es del panel clínico de Mariana, con
`measured_by` y fotos: **es otro dominio, con otro dueño y otra policy.** Que el coach mida a
su cliente y que el usuario se mida solo son dos cosas distintas, y está bien que vivan
aparte. Misma conclusión que el backlog sacó del panel clínico.

⚠️ **Si tu dictamen es distinto, defiéndelo en el reporte antes de escribir la migración.**
No hagas la migración y luego expliques.

## 1.2 · El bug latente que sale gratis aquí 🔴

`nutrition-score-service.ts:28` toma el peso corporal de `body_measurements`, **que ningún
flujo de usuario final llena.** Resultado: la meta de proteína cae siempre al default aunque
el usuario haya capturado su peso en el onboarding.

- **Pega directo en "Bajar grasa" y "Ganar músculo"**, que son packs de proteína.
- Que lea de la canónica, con la otra como complemento. Mismo patrón que ya usa
  `health-score-service`.
- **Test de mutación:** usuario con peso solo en la canónica debe recibir meta calculada, no
  el default.

## 1.3 · La app y la captura

- **Nueva llave en `APP_REGISTRY`** para cuerpo y composición. ⚠️ **Cuidado con `rm`**: ya
  trae el alias `'peso'` y apunta a `/log-exercise`, que es peso levantado. **Dos cosas
  distintas con el mismo nombre.** Resuelve la colisión de alias y repórtalo.
- La captura ya existe en `/health-input` y `/edad-atp/composition`. ⚠️ **No hagas una tercera
  pantalla de captura.** Decide cuál es la puerta y conéctala, o unifica. Repórtalo.
- Registrar peso es rápido y frecuente; medidas es lento y ocasional. **No los pongas al mismo
  nivel de fricción.**

## 1.4 · La gráfica de tendencia

- `SimpleLineChart` ya existe en `src/components/charts/SimpleCharts.tsx` **y no lo usa nadie.**
  Es el hueco natural. Si necesitas banda de referencia y color por estado, el molde más fino
  es `ParameterChart` + `parameter-chart-model.ts`, que ya trae su test.
- ⚠️ **No metas una librería de charts nueva.** Solo hay `react-native-svg` y así se queda.
- ⚠️ **La gráfica no promete nada.** Muestra la tendencia; no declara si es buena ni la nombra
  como resultado de nada. Cero declaración médica.

## 1.5 · Lo que NO hace esta pieza

- No calcula porcentaje de grasa desde medidas (fórmulas de Navy y similares). Se registra lo
  que el usuario mide, no se estima.
- No mete fotos de progreso. `body_measurements` las tiene y son del panel clínico.

---

# PIEZA 2 · H2 · Rutina asignada al día

**El hueco más grande del plan, y el que Enrique sufre en carne propia:** *"no he usado la app
para entrenar porque no es fácil."* Desbloquea "Ganar músculo" y "Volver a moverme".

## 2.1 · Lo que ya existe y está huérfano

- `scheduled_routines` (migración **001**): `schedule_type` con `weekly_cycle` y
  `specific_date`, `day_of_week` 0-6, `is_active`, `assigned_by`. RLS de dueño.
- RPC `get_today_routines(p_user_id)` resuelve por día de la semana o fecha. SECURITY DEFINER.
- `src/services/schedule-service.ts` ya lo envuelve entero.
- **Consumidores en `app/`: cero.** Solo lo usa el panel de coach.

⚠️ **Empieza por dictaminar si esa tabla sirve para autoasignación** (el usuario se agenda a
sí mismo, `assigned_by = user_id`) o si necesita un ALTER. **Reusar es el default;** desviarte
exige justificarlo en el reporte. No nazca una cuarta tabla de rutinas.

## 2.2 · El hueco real de la pantalla

- `app/fitness-train.tsx` es **un menú puro**: cero Supabase, cero estado, no sabe si ya
  entrenaste hoy. El hero manda a `/routine-generator` y ya.
- Lo poco que sabe del día vive en el padre `fitness-hub.tsx` vía `getTodayFitnessState`.
- `today-session-service.ts` **regenera la rutina determinista** con
  `seed = userId|getLocalToday()|0` y **no la persiste.**
- El enfoque (full body, empuje, pierna) es una **elección manual repetida cada día** guardada
  en AsyncStorage. **Nada rota el split. Nada decide "hoy toca X".**

## 2.3 · Qué construye esta pieza

**Que el usuario diga una vez qué días entrena qué, y que la app se lo asigne.**

- Entrenar deja de preguntar y **contesta**: "hoy te toca X". Con salida clara a cambiarlo, no
  prisionero.
- ⚠️ **Respeta la doctrina de MB-26:** la rutina asignada **no puede encender `strength` por su
  cuenta.** Si el usuario mandó `strength` a reposo, la asignación **no lo revive en silencio**:
  pasa por `reactivarHabitos` con su aviso, igual que todo lo demás.
- ⚠️ **`strength` es verificado, no toggle.** Cumplir es entrenar de verdad
  (`exercise_logs` con fecha), no palomear la asignación. **La asignación no acredita el
  electrón.** Ni siquiera parcialmente.
- ⚠️ **`getLocalToday()` y `parseLocalDate()`** para todo lo que sea fecha. Regla 3 de
  `CLAUDE.md`, y aquí hay día de la semana de por medio, que es donde más duele.
- **"Volver a moverme" necesita lo mínimo, no un programa.** El perfil 6 no sabe qué hacer en
  el gimnasio y se siente ridículo. Si la asignación se siente como un plan de atleta, ese pack
  lo pierde. Dos días a la semana es una asignación válida y digna.

## 2.4 · Lo que NO hace esta pieza

- No hace progresión automática de cargas ni periodización.
- No toca `routine-generator-core`. El generador se queda como está: esto es **cuándo**, no
  **qué ejercicios**.
- No mete la asignación en la Agenda. Eso es su propia decisión y no cabe aquí.

---

# PIEZA 3 · H4 · Entrenar conoce la fase del ciclo

**Sale casi gratis con Entrenar ya abierto.** Desbloquea "Mi ciclo a mi favor".

## 3.1 · La deuda que hay que limpiar primero

`getPhase()` existe y es canónico en `cycle-service.ts` (umbrales 0.46 y 0.57 sobre la
duración del ciclo). **Y está triplicado:**

| Dónde | Umbrales | Fuente de datos |
|---|---|---|
| `cycle-service.ts` **canónico** | 0.46 / 0.57 | `cycle_periods` |
| `app/cycle.tsx` (`calcPhase`) | **distintos** (`ovDay = len/2`) | `cycle_daily_logs` |
| `CycleCalendar.tsx` | 0.46 / 0.57 | propia |

⚠️ **Dos fuentes y dos umbrales significa que la app puede decirle a la misma usuaria que está
en dos fases distintas el mismo día**, según la pantalla. **Antes de llevar la fase a Entrenar,
que haya una sola función y una sola fuente.** Llevar el dato a una cuarta pantalla sin
consolidar es multiplicar el bug.

- Hay una cuarta etiqueta suelta: `personalize-interventions.ts` usa `ovulatory` donde el
  canónico usa `ovulation`. **Alinéalas.**

## 3.2 · La doctrina, que es la mitad del trabajo

⚠️ **Bidireccional. Folicular intensifica, lútea escucha.** Esto **NO** es un pack de "baja el
ritmo dos semanas". Si el copy sale sonando a limitación, la pieza está mal hecha aunque el
código funcione.

- El único cruce que existe hoy vive en HOY (`day-compiler.ts`), y es **solo de resta**:
  *"reduce volumen ~25%"*, *"intensidad suave ~40% menos"*. **Falta la mitad de arriba.**
- `PHASES[x].exercise` ya trae copy por fase y hoy solo se pinta en `/cycle` y
  `/emotion-history`. **Reúsalo, no escribas un séptimo copy de fases.**
- ⚠️ **Nunca nombrar enfermedad, diagnóstico ni tratamiento.** Regla 5 de continuidad.
- ⚠️ **Informa y sugiere, no bloquea.** Ningún ejercicio se esconde ni se prohíbe por la fase.

## 3.3 · El gate

- El predicado único es `canAccessCycle` en `cycle-access-core.ts`: mujer **y** modo distinto
  de acompañante. Null o desconocido da false, fail-safe. **Úsalo. No escribas otro.**
- ⚠️ **En modo acompañante, Entrenar no muestra fase.** El acompañante ve el ciclo de otra
  persona, no entrena con él.
- ⚠️ **Sin datos de ciclo, Entrenar se comporta exactamente como hoy.** Nada de estados vacíos
  pidiendo que registre. Degrada callado.

---

# PIEZA 4 · Los bugs de cardio del recorrido

⚠️ **Dos de los tres bugs del backlog ya no son lo que dice el backlog.** Verificado contra el
código y contra la base de producción. **Lee esto antes de arreglar nada.**

## 4.1 · Bug 1, el CHECK de `source`: **YA ESTÁ ARREGLADO. No lo toques.** ✅

- La migración `246_cardio_source_health.sql` lo corrigió, y **está aplicada en producción.**
- Verificado por consulta directa: el constraint `cardio_sessions_source_check` acepta hoy
  `manual`, `wearable`, `strava`, `garmin`, `health_connect` y `healthkit`. Los seis.
- El test `health-import-source-contract.test.ts` ya lo amarra.
- ⚠️ **Entonces el import de cardio NO está roto por el `source`.** Si sigue sin funcionar, la
  causa es otra. **Esa investigación es parte de esta pieza:** revisa permisos, el gate de
  `versionCode` (`PRIMER_VERSION_CODE_CON_DELEGATE = 18`, el binario va en 19) y el camino de
  lectura nativa. **Reporta el diagnóstico real aunque no puedas arreglarlo sin dispositivo.**

## 4.2 · Bug 2, los filtros: **arreglado a medias.** Este sí es trabajo.

Lo que ya existe en `esImportable` (`health-import-core.ts`): descarta menos de 300 segundos, y
descarta `discipline === 'other'` sin distancia.

**Los dos huecos que quedan:**

1. **No hay distancia mínima.** Un registro de 10 metros con duración de 5 minutos entra
   limpio. Si la disciplina está mapeada, ni siquiera se mira la distancia.
2. **Las caminatas entran como "Otro".** `WALKING` y `HIKING` no están en los mapas de tipos, y
   caen en `'other'` por el default. Una caminata de 30 minutos con GPS pasa el filtro.

⚠️ **Para distinguir una caminata de un "otro" desconocido hace falta el tipo crudo del
proveedor**, y hoy la disciplina ya viene colapsada antes de filtrar. Si necesitas propagar el
tipo crudo hasta `esImportable`, hazlo, **pero que `NormalizedWorkout` siga siendo un contrato
puro y testeable.** El filtro vive en el core, no en el servicio.

⚠️ **El copy ya promete las reglas actuales** en `app/cardio-import.tsx`: *"Se importan
sesiones de 5 minutos o más..."*. **Si cambias el umbral, cambia el copy en el mismo commit.**

## 4.3 · Bug 3, el copy sin Apple Health: **no se confirma como está escrito.**

El copy de consentimiento **sí ramifica por plataforma y sí menciona Apple Health** en iOS.

- Lo que sí queda desalineado: el título fijo *"Health Connect no está listo"* en la rama
  `sin_app`, que **es inalcanzable en iOS** (iOS cae en `no_soportado`). No es bug funcional,
  es un texto que solo puede leerse en Android.
- **Repórtalo así.** Si encuentras un lugar donde de verdad falte la mención, arréglalo y di
  cuál era. **No inventes un bug para poder cerrarlo.**

## 4.4 · Y lo que sí importa de cardio para este run

- ⚠️ El import acredita el electrón `cardio` **solo si hay un workout nuevo de hoy**, sin
  retroactividad. Correcto, no lo cambies.
- 🔗 **Con el fix 0.4:** un usuario con `cardio` en reposo que reinstala la app Cardio hoy no lo
  recupera. Los dos cambios se verifican juntos.

---

# PIEZA 5 · Tests que amarran

1. **Hora de pack:** `"7:00"` se normaliza o se rechaza, nunca llega a la base. La mutación que
   afloje la regex truena.
2. **Techo:** encender un quant sin fuente **no** suma renglón. El aviso aparece en el noveno
   real, no en el octavo.
3. **Estados en `hoy-habitos`:** un hábito en reposo se ve en reposo. Sin fila sigue activo.
4. **MANDATORY revive:** `cardio` en reposo + instalar app Cardio = `cardio` activo.
5. **Peso:** meta de proteína calculada con el peso que el usuario capturó de verdad, no el
   default.
6. **Medidas:** capturar dos veces el mismo día no duplica fila (unicidad por día).
7. **Rutina asignada:** el día correcto devuelve la rutina correcta cruzando zona horaria y
   cambio de día. **La asignación NO acredita el electrón `strength`.**
8. **Rutina y reposo:** con `strength` en reposo, la asignación no lo revive en silencio.
9. **Fase única:** la misma usuaria, el mismo día, da **la misma fase** en `/cycle`, en el
   calendario y en Entrenar. La mutación que cambie un umbral en un solo lugar truena.
10. **Gate:** modo acompañante no ve fase en Entrenar. Sin datos de ciclo, Entrenar igual que hoy.
11. **Cardio:** 10 metros en 6 minutos **no entra**. Una caminata **no entra**. Correr 2 km sí.
12. **`habit_times` mixto:** una entrada fija y una regla conviven; ningún lector nuevo asume
    string.

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 🟡 LO QUE NO ES DE ESTE RUN

- **Nutrición completa** y leer etiquetas (MB-28).
- **H3** reporte para el médico y **H5** labs sin fricción (MB-29).
- Import de **sueño** y el Sleep Cycle (MB-30, y es build nativo).
- Cardio robusto: VDOT, VO2max, zonas. **Va después de que el import funcione**, no ahora.
- Progresión de cargas y periodización.
- Tumbar `daily_plans` o `protocol_system`. Ese orden ya está escrito en el backlog y no
  empieza por borrar tablas.
- Los otros 10 bugs del recorrido: viajan con el overhaul de su dominio.

---

# 📦 ENTREGA

**Un commit por pieza.** En el reporte, además del resultado de las 12 mutaciones:

1. **Cuál tabla de composición dictaminaste canónica y por qué**, y si tu conclusión difiere de
   la recomendación de la pieza 1.1.
2. **Si `scheduled_routines` sirvió para autoasignación** o necesitó ALTER, y qué ALTER.
3. **Cómo resolviste la colisión del alias `'peso'`** entre cuerpo y peso levantado.
4. **Cuál es tu diagnóstico real de por qué el import de cardio no funciona**, ahora que el
   `source` está descartado.
5. **Qué pantalla quedó como puerta de captura** de peso y medidas, y qué pasó con las otras.
6. 🛫 **La lista literal de migraciones que quedan pendientes de `db push`.** Con número y
   nombre, una por línea. Enrique las va a correr a mano al volver.

⚠️ **Si un test truena por variables de entorno faltantes, es que `.env` no viaja a la nube.**
Repórtalo tal cual y sigue. **No inventes valores.**

**Verificación en dispositivo (Enrique, cuando vuelva y salga el OTA):**

1. Registrar peso toma menos de diez segundos y la gráfica muestra la tendencia.
2. La meta de proteína usa su peso real, no el default.
3. Entrenar **le dice qué le toca hoy** sin que él elija enfoque.
4. Con `strength` en reposo, la asignación **avisa** en vez de revivirlo solo.
5. Entrenar muestra su fase (en cuenta de usuaria), y en folicular **suma**, no solo resta.
6. La misma fase se ve igual en Ciclo, en el calendario y en Entrenar.
7. Importar cardio no mete caminatas ni registros de 10 metros.
8. Un hábito en reposo **se ve en reposo** en la pantalla de hábitos.
9. Escribir `7:00` en un pack ya no truena al guardar.

---

# 🔒 PROTOCOLO DE CIERRE · 🛫 SUSPENDIDO POR MODO REMOTO

**El cierre normal NO aplica en este run.** Vigente del 6 al 9 de agosto.

## Lo que SÍ haces al terminar

1. Commits por pieza.
2. `git push` de **tu rama**, `feat/mb27-cuerpo`.
3. **Reportas y te detienes.**

## Lo que NO haces, por ningún motivo

- ❌ **No mergeas a `main`.** Ni con checks en verde, ni con el audit aprobado, ni si parece
  seguro. **Todo se queda en la rama.**
- ❌ **No corres `npx supabase db push`.** Las migraciones **se escriben y NO se aplican.**
  Dilo con esas palabras en tu reporte: *"la migración NNN queda pendiente de db push"*.
- ❌ **No corres `eas update`.** No hay OTA. Nadie va a ver esto en un teléfono hasta que
  Enrique vuelva.
- ❌ **No tocas la versión de `app.json`.**

## Por qué

Si `main` avanza y no se puede correr `db push` ni el OTA, **`main` y lo que trae el teléfono
de Enrique se desincronizan.** Con todo en ramas, nada puede romperse en vivo.

⚠️ **Al volver, el orden exacto es: `merge` → `npx supabase db push` → `eas update`.**
**Si el OTA sale antes que la migración, la app truena buscando tablas que no existen.**

---

📌 **Nota de numeración.** `PLAN_MAESTRO_V2_A_V21.md` llama MB-26 a Cuerpo y MB-27 a Nutrición.
`ESTADO_CONTINUIDAD.md` (6-ago, más reciente) manda: **MB-26 fue el día inteligente y MB-27 es
Cuerpo.** El plan maestro está corrido un número desde MB-26 y hay que actualizarlo al cerrar
este run.
