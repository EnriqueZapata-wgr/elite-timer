# 🎯 AWAY RUN MB-25 · El motor de packs

**Rama:** `feat/mb25-packs` desde `main` · worktree propio (el checkout principal es de Enrique).
**Trae migración** (pieza 2). `tsc`, Vitest y `npm run censo` en verde antes de cada commit.
Migraciones idempotentes + RLS + policy, y se aplican con `npx supabase db push`, **nunca**
con execute_sql.

## Qué es esto

> *"La distancia entre dolor y solución es implementación."*

Un **pack** configura la app completa de un jalón: instala apps, enciende hábitos con su
hora, fija metas y configura avisos. El usuario contesta **tres preguntas** y sale con la
app armada para SU dolor. Es el salto de hazlo-tú a hazlo-contigo.

**Contexto completo:** `R and D/CASOS_DE_USO_10_PERFILES.md` y
`R and D/PLAN_MAESTRO_V2_A_V21.md`. Léelos antes de escribir una línea.

⚠️ **Pack, protocolo y paquete de salud son el MISMO mecanismo.** Este motor lo van a
reusar MB-28 (paquetes de salud) y el futuro de protocolos. Diseña el modelo como registro
de datos, no como código por pack.

---

# PIEZA 1 · El modelo

`src/constants/packs.ts` — un registro declarativo, hermano de `app-registry.ts`:

- `key` estable (ej. `dormir-mejor`) — **esto jamás cambia**.
- `nombre` y `paraQuien` (copy). ⚠️ **Los nombres están pendientes de firma de Mariana:**
  por eso key estable y nombre string. Cambiar un nombre firmado = cambiar un string.
- `instala`: appKeys que existen en `app-registry.ts`.
- `enciende`: electron keys que existen en `electrons.ts`, cada uno con su **momento del
  día y hora relativa** (ver pieza 3: las horas se anclan a la vida del usuario).
- `metas`: las que el pack fija (proteína vía `protein-goal-service`, agua, ventana de
  ayuno — usa los servicios que YA existen; si a alguna meta le falta writer, repórtalo,
  no lo inventes).
- `avisos`: qué apps avisan y a qué hora, sobre `user_app_notification_prefs` con
  `updateAppAviso` de `app-avisos-service.ts`. **El maestro general sigue mandando.**
- `argosFoco`: una línea que describe en qué se fija ARGOS para este pack (se guarda; su
  consumo en contexto es de MB-31, no de este run).

**Contrato en test:** cada appKey de cada pack existe en el registro, cada electron key
existe en electrons. Un pack con una llave rota debe tronar en CI, no en producción.

---

# PIEZA 2 · El motor

`src/services/pack-core.ts` (puro, testeable) + `src/services/pack-service.ts` (efectos).

**Activar un pack:**
1. Instala sus apps con `installApp()` — el camino que ya existe, ningún atajo paralelo.
2. Enciende sus hábitos con las horas ya ancladas a la vida del usuario.
3. Fija sus metas por los servicios existentes.
4. Configura sus avisos con `updateAppAviso`.
5. Registra la activación (migración `254_user_packs`): `user_id, pack_key, activated_at,
   intensidad, wake_time, sleep_time, active`. Idempotente, RLS, policy.

**Reglas duras:**
- **Re-activar es idempotente:** no duplica hábitos, no duplica avisos, no pisa ajustes
  que el usuario ya cambió a mano después de activar.
- **UN pack activo a la vez** (default bakeado; Enrique puede vetarlo). Activar otro
  pregunta primero, y el cambio NO desinstala nada del anterior: solo re-sintoniza.
- **Desactivar = dejar de agrupar y medir. NADA se desinstala, NADA se borra.** Es la
  doctrina de intervenciones: el dato del usuario es sagrado. Las apps y hábitos quedan
  como estén y el usuario decide.
- Si un paso falla a media activación, **reporta el estado real**: nunca dejes al usuario
  creyendo que tiene un pack a medias sin saberlo.

---

# PIEZA 3 · La entrada de tres preguntas

Flujo nuevo, alcanzable desde **el Centro** (sección nueva arriba: la pieza 5) y desde
el onboarding existente (`app/onboarding`) como paso opcional al final — **sin rehacer el
onboarding**, solo un enlace de salida: *"¿Quieres que armemos tu app por ti?"*

1. **¿Qué quieres cambiar primero?** → elige el pack (cinco cards, nombre + paraQuien).
2. **¿A qué hora despiertas y a qué hora te duermes?** → **ancla TODAS las horas del
   pack**: las horas de un pack son relativas (ej. "sol: despertar + 30 min", "corte
   cafeína: despertar + 5 h", "bajar revoluciones: dormir − 90 min") y aquí se vuelven
   absolutas. Esta pregunta es la diferencia entre un aviso útil y uno que se ignora.
3. **¿Cuánto quieres que te empuje?** → **suave** enciende solo los hábitos core del pack
   (3), **con todo** enciende los seis. Cada hábito del pack se marca `core: true/false`
   en el registro.

Al confirmar: pantalla de resumen (*"esto se instaló, esto se encendió, así te avisamos"*)
con el estilo editorial de siempre. **Una acción por pantalla, español MX, cero jerga,
CERO em dash, cero nombres propios.**

⚠️ El cuestionario largo NO se toca en este run. Que recomiende packs al terminar es nota
para MB-28.

---

# PIEZA 4 · Los cinco packs

Del doc de casos de uso, los cinco sin bloqueo estructural:

| key | nombre propuesto | instala | enciende (core en negrita) |
|---|---|---|---|
| `bajar-revoluciones` | Bajar revoluciones | respirar, meditar, emociones, journal, sueno | **breathwork**, **checkin**, **meditation**, journal, screen_time_cutoff |
| `dormir-mejor` | Dormir mejor | sueno, meditar, respirar, sol, suplementos | **sleep**, **sunlight**, **screen_time_cutoff**, red_glasses, breathwork |
| `energia-estable` | Energía estable | comida, glucosa, ayuno, sueno, sol, labs | **protein**, **water**, **glucose_log**, sunlight, sleep |
| `foco-claridad` | Foco y claridad | nback, meditar, sueno, ayuno, comida, emociones | **nback**, **meditation**, **sleep**, screen_time_cutoff, protein |
| `longevidad` | Cumplir años sin envejecer | edad-atp*, labs, protocolos, sol, ayuno, cetonas, entrenar, sueno | **lab_upload**, **functional_quiz**, **sunlight**, strength, sleep, intervention |

*Si `edad-atp` aún no es app instalable (eso es de MB-28), el pack instala lo que sí
existe y lo reporta — **no adelantes trabajo de MB-28.**

**El copy de cada pack** (qué es, para quién, qué esperar): escríbelo con el criterio de
la ficha del Centro — honesto, del cuerpo, sin promesas médicas, **nunca un beneficio
inventado**. Todo queda marcado para revisión de Enrique y Mariana.

⚠️ **Ningún pack nombra enfermedad, diagnóstico ni tratamiento.** Ni en nombre, ni en
copy, ni en comentario de código visible.

---

# PIEZA 5 · Packs en el Centro

Sección nueva **arriba del Centro**: *"Ármala por mí"* (o el copy que fluya con el design
system — lee `docs/DESIGN_SYSTEM.md` antes).

- Cinco cards de pack (nombre + paraQuien). Card → ficha del pack.
- **Ficha del pack:** qué es, qué instala, qué enciende, y el botón que arranca las tres
  preguntas (la 1 ya viene contestada si entras por aquí).
- Si hay un pack activo: se ve cuál, desde cuándo, y su botón de desactivar **con el copy
  honesto de la pieza 2** (nada se borra, nada se desinstala).

⚠️ **Este run NO toca HOY ni TAREAS.** Los hábitos del pack aparecen ahí por el camino de
siempre (instalar = activar, MB-20). Cero UI nueva en HOY.

---

# PIEZA 6 · Tests que amarran

1. **Contrato del registro** (pieza 1): llaves de apps y electrones existen. Mutar una
   llave a algo inexistente truena.
2. **Idempotencia:** activar dos veces = mismo estado. La mutación (quitar el guard)
   truena.
3. **Anclaje de horas:** con despertar 7:00 y dormir 23:00, las horas absolutas del pack
   salen bien; con despertar 5:00, se corren. Casos borde: hora que caería después de
   dormir se recorta.
4. **Desactivar no destruye:** después de desactivar, `installedApps` y los hábitos
   siguen igual. La mutación (que desinstale) truena.
5. **Suave contra con todo:** suave enciende solo los core.

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: qué metas tenían writer y cuáles no, qué copy quedó
pendiente de firma, y el resultado de las cinco mutaciones.

**Verificación en dispositivo (Enrique):**
1. Tres preguntas → pack activo: las apps aparecen en la sala, los hábitos en TAREAS con
   su hora anclada a TU horario, los avisos configurados en su ficha.
2. Re-entrar y re-activar el mismo pack: nada se duplica.
3. Desactivar: las apps y hábitos siguen; solo el pack deja de figurar como activo.
4. Suave enciende 3; con todo enciende todos.
5. Con el maestro de notificaciones apagado, el pack no logra que nada avise.

---

# 🔒 PROTOCOLO DE CIERRE (nuevo — aplica a este MB y a todos los que siguen)

**Al terminar el run: reporta y DETENTE. No merges sin el verde del audit de Cowork.**

Con el verde:
1. Desde tu worktree: `tsc`, Vitest y censo en verde.
2. Merge a `main`. ⚠️ **Si el merge dice "Aborting": DETENTE y reporta. Jamás fuerces,
   jamás muevas archivos de Enrique sin avisar.**
3. Sobre el RESULTADO del merge: `tsc`, Vitest y censo OTRA VEZ. (Correr checks en un
   merge que abortó ya nos dio verdes falsos dos veces.)
4. `git push`.
5. `eas update --branch preview`. ⚠️ **La versión de `app.json` NO se toca en un OTA.
   Nunca.**
6. Reporta el cierre. Enrique solo verifica en dispositivo.
