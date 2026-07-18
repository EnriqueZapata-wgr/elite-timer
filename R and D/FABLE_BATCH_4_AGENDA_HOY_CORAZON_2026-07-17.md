# ❤️ BRIEF 4 · CORAZÓN de ATP — unificar Agenda ↔ HOY (2026-07-17)

**Para:** agente Code (CC)
**Origen:** `R and D/TRIAGE_BUGS_ENRIQUE_30_HACIA_BETA_2026-07-17.md` · BATCH 4 (#30) — absorbe #3b, #28, #29 (+ #87, #90).
**Palabra de Enrique:** _"Agenda es el orden, HOY son las acciones con recompensa y links, pero se unen."_
**Regla de oro (rúbrica):** _comprensible + editorial + invita a la acción + cada card se gana su lugar + probado como usuario real. Un link válido al lugar equivocado = roto._

---

## 1. Resumen ejecutivo

Agenda y HOY se sienten como **entes separados** cuando deberían ser **UNO**: la misma prescripción
del motor (**Mi Protocolo** = perfil del usuario), vista de dos formas.
- **AGENDA** = el orden cronológico del día.
- **HOY** = las mismas acciones, pero como cards con **recompensa (electrones)** + **links** + el
  "por qué" epigenético.
Reglas del comportamiento unificado:
- Acción **ya hecha** → aparece **tachada, SIN notificación**.
- Acción **no hecha** → **recordatorio/notificación**.
- Todo **vinculado a MI PERFIL** (prescripción del motor), no genérico.

**Insight de código (crítico):** la infraestructura del swap YA EXISTE y el flag
`INTERVENTIONS_DRIVE_HOY = true` YA está encendido. HOY y AGENDA **ya derivan ambos de Mi Protocolo**
(`user_interventions` activas). El problema NO es que no compartan fuente — **es que son dos
derivaciones PARALELAS de esa fuente, con dos lecturas distintas del estado hecho/no-hecho**, más
dos capas superpuestas en HOY (agenda-de-protocolo vs cards-de-electrón-configuradas). Eso produce
el drift que Enrique siente. El corazón de este sprint es **colapsar a UN estado compartido
hecho/no-hecho por ítem** y **un solo path de notificación que sí funciona**.

---

## 2. Estado real del código (lo que encontré — anclas)

### La fuente ya es común (flag ON)
`src/services/interventions/intervention-agenda-core.ts` centraliza la decisión con
`selectAgendaDrivers(INTERVENTIONS_DRIVE_HOY)`: con flag ON, las intervenciones activas ("Mi
Protocolo") son el driver de **ambas** superficies; los protocolos legacy quedan demotados.
`src/constants/flags.ts` → `INTERVENTIONS_DRIVE_HOY = true`.

### Pero hay DOS derivaciones + DOS lecturas de estado
| Superficie | Archivo | Cómo deriva | Cómo lee "hecho" |
|---|---|---|---|
| **HOY** | `src/services/day-compiler.ts` (`compileDay` → `buildAgenda`) | Construye `AgendaItem[]` **en memoria en cada compile** vía `interventionAgendaItems(...)`. Además arma cards de **electrones booleanos/cuantitativos** por separado. | `completed` de intervención = `getTodayCompletions` (`intervention_completions`). Electrones verificados = actividad real (mind_sessions, exercise_logs…). Electrones no-verificados = blob `daily_electrons`. **NO lee `agenda_event_logs`.** |
| **AGENDA** | `src/services/agenda-service.ts` (`generateAgendaEvents` → `agenda_events` + `agenda_event_logs`; `getAgendaForDate`) | **Persiste** eventos e instancias diarias vía `syncInterventionEvents` (plan puro en `intervention-agenda-core.ts`). | `status` de `agenda_event_logs` (pending/completed/…). Completar corre `completeInterventionByKey` **o** `syncElectronFromEvent`. |

→ **Dos verdades del mismo día.** HOY re-deriva de `intervention_completions`/actividad; AGENDA lee
`agenda_event_logs.status`. Convergen "por los lados" (`syncCompletionFromElectron` /
`syncElectronFromEvent` / `completeInterventionByKey` + emits `day_changed`/`electrons_changed`),
pero **no hay un único campo hecho/no-hecho por ítem** → drift, y la sensación de dos apps.

### #3b — HOY no refleja del todo Mi Protocolo
Con flag ON, `buildAgenda` sí usa intervenciones para el **timeline**, pero las **cards de electrón**
del HOY (`booleanElectrons`/`quantitativeElectrons` en `day-compiler`, specs en
`src/constants/hoy-cards.ts` + orden `HOY_CARD_ORDER_DEFAULT`) siguen saliendo de la **config
manual** (`user_day_preferences.active_boolean_electrons` + `MANDATORY_BOOLEANS`), no de la
prescripción. Esa es la capa "configura hoy" que no responde a Mi Protocolo.

### #28 — notificaciones: hay un path que SÍ funciona (copiarlo)
- **FUNCIONA (local, on-device):** `app/journal.tsx` (líneas ~110-140) usa
  `Notifications.scheduleNotificationAsync` con trigger **`SchedulableTriggerInputTypes.DAILY`**
  (`hour`/`minute`). Se dispara en el device, sin servidor, sin push token, sin cron. Confiable.
  **Footgun:** usa `Notifications.cancelAllScheduledNotificationsAsync()` → **borra TODAS** las
  notifs locales (si agenda también agenda local, se pisan).
- **NO funciona confiable (server push):** la agenda depende de la Edge Function
  `supabase/functions/dispatch-agenda-notifications` (cron) que lee
  `agenda_event_logs.notify_at <= now AND notified_at IS NULL` y manda push por Expo. Requiere: (a)
  cron realmente agendado, (b) push token registrado (`push-notification-service.ts` — muchos users
  saltan el permiso en onboarding `app/onboarding/v2/notifications.tsx`), (c) prefs habilitadas
  (`notification-prefs-core.ts`), (d) `notify_at` no-null. **Y muchos eventos nacen con
  `notify_minutes_before = 0`** (cronotipo y custom en `agenda-service.ts` → `notify_at = null` →
  nunca se despachan). Solo los de intervención heredan `INTERVENTION_NOTIFY_MINUTES_BEFORE = 10`.
- Inbox in-app: `src/services/user-notifications-service.ts` + campana
  `src/components/hoy/notification-bell-core.ts` + `src/services/hoy/notifications-service.ts`
  (cuenta pending de `agenda_event_logs`). Todo eso queda; solo cambia **quién dispara la notif**.

### #29 / #87 — dedup ya existe pero el user aún ve duplicados
`intervention-agenda-core.ts` ya trae dedup semántico fuerte: `canonicalConcept` + `FAMILY_RULES`
(familias cross-vocabulario) + `planAgendaCleanup` (3 pases + retiro del driver protocolo) +
`FAMILY_REPEATS_PER_DAY`. Corre en `agenda-service`. Pero task #87 ("56 eventos duplicados") sigue
abierto → o el cleanup no cubre el caso real, o **HOY y AGENDA muestran sets distintos** (dos
derivaciones) y el user percibe duplicación entre superficies. La unificación lo cierra por diseño.

### Estados visuales que ya existen (para tachado vs recordatorio)
- `EditorialCard` (`src/components/hoy/EditorialCard.tsx`) tiene estado **`done`**: velo oscuro +
  badge "Hecho hoy ✓" + check circle lleno. Ese es el "tachado".
- `AgendaMiniCard` (`src/components/agenda/AgendaMiniCard.tsx`) renderiza `status` en AGENDA.

---

## 3. Arquitectura propuesta — UN corazón

### Principio
**Una sola fuente (Mi Protocolo del perfil) → un solo estado compartido hecho/no-hecho por ítem →
dos vistas del mismo estado (AGENDA cronológica, HOY con recompensa) → un solo path de notificación
(local, on-device) derivado de ese estado.**

### 3.1 Un solo estado del día (colapsar las dos lecturas)
Elegir `agenda_event_logs` como **la instancia diaria canónica con `status`** (ya persiste,
ya alimenta inbox/campana/dispatch). Regla:
- **Un solo writer de compleción:** completar en HOY o en AGENDA escribe el MISMO
  `agenda_event_logs.status = 'completed'` + corre `completeInterventionByKey` (que ya otorga el
  electrón `intervention` + emits). Hoy AGENDA ya lo hace (`app/agenda.tsx handleComplete`); **HOY
  debe hacer lo mismo** en vez de escribir solo `intervention_completions`.
- **Un solo reader de "hecho":** `compileDay` debe leer el `status` de `agenda_event_logs` del día
  para marcar `AgendaItem.completed`, en lugar de re-derivar de `intervention_completions` a solas.
  Reconciliar (no duplicar) con los electrones verificados de actividad real
  (`VERIFIED_ELECTRON_KEYS`) — la actividad real sigue siendo señal válida, pero converge al mismo
  campo. Idempotente (patrón ya usado en `reconcileVerifiedLedger`).
- Resultado: HOY y AGENDA muestran **exactamente el mismo hecho/no-hecho**, sin drift.

> Extraer la lógica de merge de estado a un núcleo puro testeable (p.ej.
> `src/services/hoy/day-state-core.ts`): dado {items de protocolo, `agenda_event_logs`,
> completions de intervención, actividad verificada} → devuelve el set unificado con un `done` por
> ítem. Ambos servicios (`day-compiler`, `agenda-service`) consumen el mismo núcleo. Patrón `*-core`
> del repo (sin RN/supabase → vitest).

### 3.2 HOY refleja Mi Protocolo (#3b)
Las cards de acción del HOY deben salir de la **prescripción** (Mi Protocolo activo), no de la
config manual. Propuesta:
- Las intervenciones activas + universales P1 + informativos (comidas/sueño/ayuno) son el set base
  de cards del día (ya es el set del timeline).
- La config manual (`user_day_preferences`) pasa a ser **override opt-in** (el user puede
  encender/apagar extras), no la fuente por defecto. Doctrina memoria
  `feedback_guiado_no_prisionero.md`: guiado, no prisionero — default = prescripción, personalizar
  = opción.
- Cuidar `MANDATORY_BOOLEANS`/electrones verificados: no perder journal/cardio/etc. — reconciliar
  con el set de protocolo, no duplicar (un concepto = una card; usar `canonicalConcept`).

### 3.3 Tachado vs recordatorio (comportamiento del corazón)
- **Hecho → tachado, sin notif:** al marcar `completed`, **cancelar la notificación local
  programada** de ese ítem y renderizar estado `done` (velo + "Hecho hoy ✓" en HOY;
  tachado/checked en AGENDA).
- **No hecho → recordatorio:** programar notificación **local** a la hora del ítem (o `hora −
  notify_minutes_before`).
- Todo por **MI PERFIL**: el copy y el "por qué" vienen de la intervención prescrita (subtitle "Mi
  Protocolo" ya se setea en `interventionAgendaItems`), nunca genérico.

### 3.4 Notificaciones que SÍ funcionan (#28) — replicar el path de journal
Crear un servicio **`src/services/agenda/local-agenda-notifications.ts`** que replique el patrón
local de `journal.tsx` pero **sin `cancelAll`**:
- `scheduleNotificationAsync` por ítem **pendiente** del día, con trigger por hora (DAILY o por
  fecha/hora del día), `content` con el nombre del ítem + "Mi Protocolo".
- **Identificadores estables** por ítem (usar `agenda_event_logs.id` o `event_id`) para poder
  **cancelar solo ese** (`cancelScheduledNotificationAsync(id)`) al completarse — nunca
  `cancelAllScheduledNotificationsAsync`.
- **Unificar el reminder de journal** al mismo servicio (hoy hace `cancelAll` → si agenda agenda
  local, journal las borra). Migrar journal a cancel por-id para que coexistan. Este es un fix
  obligatorio o el corazón rompe el journal-reminder que hoy sí sirve.
- Re-programar en cada entrada a HOY/AGENDA (idempotente: cancelar+reprogramar el set del día, o
  diff contra lo ya agendado).
- Respetar `notification-prefs-core.ts` (quiet hours, canal `agenda`, modo silent) en cliente —
  la misma decisión pura `shouldNotify` ya existe; reutilizarla local.
- **Mantener** `dispatch-agenda-notifications` como backup server-side (no romperlo), pero el beta
  **no depende** de él. Nota: setear `notify_minutes_before` > 0 en los eventos de cronotipo/custom
  para que, si el server sí corre, tampoco los ignore.

### 3.5 Dedup como invariante compartido (#29/#87)
Con un solo compile/estado, HOY y AGENDA muestran el MISMO set → la duplicación entre-superficies
desaparece por construcción. Además: auditar el caso real de #87 (56 eventos) — probable acumulado
histórico en `agenda_events` de días con flag OFF/ON mezclados; correr `planAgendaCleanup` con
`retireProtocolDriver` y validar que barre los zombies. Agregar test del escenario de #87.

---

## 4. Fases

### Fase 1 — UN estado compartido (§3.1) · núcleo del corazón
`day-state-core.ts` puro + `compileDay` lee `agenda_event_logs.status` + HOY completar escribe el
mismo log (un writer). Test del merge de estado. **Sin esto, nada de lo demás importa.**

### Fase 2 — HOY = Mi Protocolo (§3.2, #3b)
Cards de acción derivan de la prescripción; config manual → override opt-in; reconciliar
mandatory/verificados sin duplicar.

### Fase 3 — Notificaciones locales (§3.4, #28)
`local-agenda-notifications.ts` + migrar journal a cancel-por-id + programar pendientes / cancelar
hechos + respetar prefs. Backup server intacto.

### Fase 4 — Tachado/recordatorio + dedup invariante (§3.3/3.5, #29/#87)
Cablear estado `done` (cancel notif + tachado) en ambas superficies; auditar/cerrar #87 con test.

---

## 5. Archivos clave a tocar

| Archivo | Qué |
|---|---|
| `src/services/day-compiler.ts` | F1: leer `agenda_event_logs.status`; F2: cards desde prescripción. |
| `src/services/agenda-service.ts` | F1: un solo writer de compleción; F4: validar cleanup. |
| `src/services/interventions/intervention-agenda-core.ts` | F1/F4: núcleo puro ya vive aquí; extender merge de estado / dedup. |
| **nuevo** `src/services/hoy/day-state-core.ts` | F1: merge puro hecho/no-hecho (testeable). |
| **nuevo** `src/services/agenda/local-agenda-notifications.ts` | F3: notifs locales por-id. |
| `app/journal.tsx` | F3: migrar de `cancelAll` a cancel-por-id (coexistencia). |
| `app/(tabs)/index.tsx` (HOY) | F1/F2/F3: completar → mismo log; programar/cancelar notif; cards de prescripción. |
| `app/agenda.tsx` | F1/F4: ya escribe log; alinear con writer único + estado `done`. |
| `src/components/hoy/EditorialCard.tsx` / `src/components/agenda/AgendaMiniCard.tsx` | F4: estado `done`/tachado. |
| `src/constants/hoy-cards.ts` | F2: orden/specs si el set pasa a prescripción. |
| `src/services/notification-prefs-core.ts` | F3: reutilizar `shouldNotify` en cliente. |

---

## 6. Test guards

- Suites existentes a mantener verdes: `intervention-agenda-core.test.ts`,
  `intervention-service-core.test.ts`, `notification-prefs-core.test.ts`,
  `notification-bell-core.test.ts`, `notifications-service.test.ts`, `agenda-*.test.ts`.
- **Nuevos (vitest, `*-core`):**
  - `day-state-core`: mismo ítem con completion de intervención, con `agenda_event_logs.completed`,
    con actividad verificada → un solo `done=true`; sin ninguno → `done=false`; drift entre fuentes
    se resuelve determinístico.
  - notifs locales (extraer decisión pura): dado items {pending, done} + prefs → set de ids a
    programar y a cancelar; respeta quiet hours/silent; hecho ⇒ cancelado.
  - dedup #87: input con zombies de protocolo + dupes por familia → set final sin duplicados; HOY y
    AGENDA producen el MISMO set.
- **Prueba como usuario real (rúbrica):** en device — hacer una acción en HOY ⇒ se tacha en HOY **y**
  en AGENDA sin notif; dejar una pendiente ⇒ llega recordatorio local a su hora; el journal-reminder
  sigue llegando (no lo mató la agenda); cada card lleva a su destino correcto (link válido al lugar
  correcto).

---

## 7. Invariantes (no negociables)

1. **str_replace quirúrgico** — nunca reescribir `day-compiler.ts`/`agenda-service.ts` completos.
2. `generateUUID` (nunca `crypto.randomUUID`); `getLocalToday()`/`parseLocalDate()` para fechas.
3. Emits tras cambios: `DeviceEventEmitter.emit('electrons_changed')` (electrones) /
   `'day_changed'` (nutrición/ayuno/estado del día). Ya se usan; mantener.
4. Electrón booleano nuevo = 3 lugares (memoria `reference_nuevo_electron_3_lugares.md`) — si se
   toca el set de cards, no dejar el 3º.
5. Idempotencia: reconciliaciones y programación de notifs deben poder re-correr sin duplicar
   (mismo patrón que `reconcileVerifiedLedger` / `ensureLogsForDate` / claves de idempotencia
   `user:source:día`).
6. `npx tsc --noEmit` = 0 errores antes de push. Delivery **OTA** (`eas update --branch preview`) —
   es JS/TS + Edge no-nativo. **Si se agregan migraciones** (poco probable; el modelo ya existe),
   idempotentes (`IF NOT EXISTS`) + `npx supabase db push` post-merge (reglas #12 CLAUDE.md).
7. NO romper el path server (`dispatch-agenda-notifications`): queda como backup, no se depende de
   él para beta.
8. Copy user-facing español MX, sin nombres propios; toda recomendación es "de ATP/ARGOS".

---

## 8. Doctrina (por qué este es EL sprint que hace que "se sienta ATP")

Agenda y HOY no son dos features: son dos vistas del mismo latido (el perfil prescrito). Cuando el
usuario hace algo, el sistema entero lo sabe **una vez** y reacciona coherente en ambas superficies:
tachado sin ruido si ya lo hizo, recordatorio si no. Eso es lo que separa "un tracker con dos
pantallas" de "un sistema operativo de rendimiento". La infraestructura del swap ya está y el flag ya
está ON — el trabajo es **colapsar dos verdades en una** y **poner el path de notificación que sí
dispara** (local, como journal). Memorias vivas:
`project_agenda_como_asistente.md` (agenda = asistente de vida, no tracker),
`feedback_datos_maquina_validados_datos_user_sagrados.md` (el `custom_time`/override del user es
SAGRADO; la máquina se auto-valida — respetarlo en el merge de estado),
`project_doctrina_menu_navegacion_vs_consulta_datos.md` (un dato = un lugar).
