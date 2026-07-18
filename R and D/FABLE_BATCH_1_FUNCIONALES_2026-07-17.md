# 🎸 FABLE · BATCH 1 — Bugs funcionales "que deje de sentirse roto" (2026-07-17)

**Para:** agente Code (CC)
**Rama:** `fix/batch1-funcionales` (una sola rama, merge tras auditoría Cowork)
**Deploy:** OTA (`eas update --branch preview`) — todo es JS/TS + 0 migraciones nativas. La única migración (opcional, #17 opción B) es idempotente.
**Doctrina activa:** español MX · explicar siglas · guiar con ejemplos · str_replace quirúrgico (NUNCA reescribir archivos) · `require()` estático · `generateUUID` (no `crypto.randomUUID`) · `getLocalToday()`/`parseLocalDate()` · `npx tsc --noEmit` limpio antes de push · delivery doc al final.
**Rúbrica Done:** compila + comprensible + editorial + invita a la acción + **probado como usuario real en su estado concreto** (un link válido al lugar equivocado = tan roto como un 404).

---

## RESUMEN

9 fixes funcionales, casi todos quirúrgicos. El bloque nace de la sesión de bugs de Enrique (`TRIAGE_BUGS_ENRIQUE_30_HACIA_BETA_2026-07-17.md`, Batch 1). El P0 es clínico/seguridad (#4: un HOMBRE ve "estás embarazada"). Los demás son routing granular del HOY (#1), desconexión HOY↔Mi Protocolo (#3b, parcial — el resto es Batch 4/#30), sync de electrón journal (#17), navegación del check-in (#20), racha de check-in (#21), notificaciones de agenda (#28), dedup agenda motor↔manual (#29) y una decisión de producto (#2, N-Back — solo documentar).

### Tabla de fixes

| # | Sev | Archivo:línea | Causa raíz | Fix |
|---|-----|---------------|------------|-----|
| **#4** | **P0 clínico** | `src/services/supplements-service.ts:43-55` (`isPregnancyActive`) + espejo `src/services/interventions/prescription-service.ts:260-261` | El flag embarazo/lactancia NO gatea por `biological_sex`. Lee `cycle_settings.pregnancy_status.is_pregnant` y `client_profiles.cycle_modality==='pregnancy'` sin verificar sexo → un hombre con dato residual/seed dispara el banner. | Gatear por sexo: si `biological_sex !== 'female'` → `return false` ANTES de mirar los flags. Aplicar en ambos lectores. |
| **#1** | Alta | `src/services/day-compiler.ts:37-45` (`VERIFIED_ELECTRON_ROUTES`) + `:176-181` (`ELECTRON_ROUTES`) · `src/constants/hoy-cards.ts:32,34,36,41,49` (route) · `src/components/hoy/HoyEditorialSection.tsx:403,421,462` (onTap hardcoded) | Routing hub-para-todo (regla "2da pasada" vieja): meditación/breathwork/checkin/journal → `/mente`; hidratación → `/nutrition`. | Routing GRANULAR: meditación→`/meditation`, breathwork→`/breathing`, checkin→`/checkin`, journal→`/journal`, agua→`/hydration`. Proteína→`/nutrition` se QUEDA (decisión #70 aprobada). |
| **#3b** | Alta (parcial) | `src/services/hoy/visibility-service.ts:28-41` (`getCardsVisible`) · `app/(tabs)/index.tsx:194,416,422` | Las cards del HOY se gatean SOLO por `client_profiles.hoy_cards_visible` (config manual de "Configura HOY"). Cero conexión con Mi Protocolo (`user_interventions`). El flag `INTERVENTIONS_DRIVE_HOY=true` ya dirige la AGENDA, pero NO las cards editoriales. | Bridge quirúrgico: unir a `cardsVisible` los cardKeys cuyo concepto ∈ Mi Protocolo activo. Fusión completa = Batch 4/#30 (documentar el límite). |
| **#17** | Alta | `src/services/day-compiler.ts:246-254` (`verifiedCompleted`) — journal NO es verificado · award en `app/journal.tsx:287` | Al guardar journal se hace `awardBooleanElectron('journal')` + emits, pero NO se escribe el blob `daily_electrons`. El compiler lee `completed` de journal desde el blob (no de `journal_entries`) → la card nunca palomea. | Opción A (limpia, recomendada): volver `journal` electrón VERIFICADO (derivar `completed` de `journal_entries` de hoy, como `checkin`). |
| **#20** | Alta | `app/checkin.tsx` (flujo `step` 1→4, sin BackHandler) · `src/components/ui/PillarHeader.tsx:33` → `src/components/ui/BackButton.tsx:21` (`router.back()`) | El check-in es multi-paso por estado interno, pero el back (header + hardware Android) hace `router.back()` → sale de la pantalla completa; si `/checkin` es la única ruta en el stack, sale de la app. | Back consciente del paso: si `step>1` → `setStep(step-1)`; si `step===1` → `router.back()`. Interceptar hardware back (Android) + pasar `onPress` a `PillarHeader`/`BackButton`. |
| **#21** | Media | `app/checkin.tsx:142-152` (query streak) — la lógica pura `src/services/journal-logic.ts:22-45` está OK | La racha se recalcula solo al GUARDAR (paso 4) y solo si `>1` se muestra; no hay racha visible en el mapa inicial (paso 1). Riesgo real: la racha "viva" no se muestra al entrar, solo tras registrar → percepción de "mal contada". | Cargar y mostrar la racha AL ENTRAR (en el `useEffect` de mount, paso 1), reusando `computeJournalStreak`. Confirmar dedup por día (ya lo hace). |
| **#28** | Alta | `app/journal.tsx:110-124` (path que SÍ funciona, notif LOCAL) vs `src/services/agenda-service.ts` + edge `dispatch-agenda-notifications` (path push server que NO llega) | El recordatorio de journal usa `Notifications.scheduleNotificationAsync` (DAILY, on-device) → funciona sin infra. La agenda depende 100% de push server (token + cron + `notify_at`) → frágil, no llega. | Copiar el mecanismo del journal: agendar notificaciones LOCALES por evento desde el cliente. Crear servicio compartido con IDs namespaced (NO `cancelAllScheduledNotificationsAsync`, que borraría el recordatorio de journal). |
| **#29** | Media | `src/services/agenda-service.ts:270-315` (`syncInterventionEvents`) + core `src/services/interventions/intervention-agenda-core.ts:519` (`planInterventionEventSync`) | El cleanup por familia canónica (`planAgendaCleanup`) EXCLUYE eventos `source='manual'` ("manual jamás se tocan", línea 281). Si el user tiene un evento manual del mismo concepto que una intervención del motor → ambos aparecen. | Al planear inserts de intervención, si `canonicalConcept` ya existe como evento MANUAL activo → NO insertar la intervención (suprimir el duplicado del motor, conservar el del user). Respeta "dato user sagrado". |
| **#2** | Doc | `supabase/migrations/197_nback_challenge.sql` (existe) · sin UI · task #45 pendiente | N-Back Challenge tiene migración + spec + tests, sin UI. NO es bug. | SOLO documentar el estado + la decisión pendiente de Enrique (surface "próximamente" vs oculto). NO implementar. |

---

## DETALLE POR FIX

### #4 · [P0 CLÍNICO/SEGURIDAD] Suplementos le dice a un HOMBRE "estás embarazada"

**Dónde:** `src/services/supplements-service.ts:43-55`

```ts
export async function isPregnancyActive(userId: string): Promise<boolean> {
  try {
    const [cycleRes, profileRes] = await Promise.all([
      supabase.from('cycle_settings').select('pregnancy_status').eq('user_id', userId).maybeSingle(),
      supabase.from('client_profiles').select('cycle_modality').eq('user_id', userId).maybeSingle(),
    ]);
    const status = (cycleRes.data as any)?.pregnancy_status;
    if (status && typeof status === 'object' && status.is_pregnant === true) return true;
    return (profileRes.data as any)?.cycle_modality === 'pregnancy';
  } catch { return false; }
}
```

**Causa raíz:** NUNCA verifica `biological_sex`. Un usuario masculino con un dato residual/seed en `cycle_settings.pregnancy_status` o `client_profiles.cycle_modality` dispara `true`. El embarazo es biológicamente imposible para `biological_sex === 'male'` → gatear es la raíz correcta (no parchar el dato).

**Fix quirúrgico:** añadir `biological_sex` al `select` de `client_profiles` y cortocircuitar:

```ts
const [cycleRes, profileRes] = await Promise.all([
  supabase.from('cycle_settings').select('pregnancy_status').eq('user_id', userId).maybeSingle(),
  supabase.from('client_profiles').select('cycle_modality, biological_sex').eq('user_id', userId).maybeSingle(),
]);
// Gate por sexo biológico: el embarazo/lactancia solo aplica a usuarias femeninas.
// Un male/null NUNCA activa la máscara (bug clínico #4).
if ((profileRes.data as any)?.biological_sex !== 'female') return false;
const status = (cycleRes.data as any)?.pregnancy_status;
if (status && typeof status === 'object' && status.is_pregnant === true) return true;
return (profileRes.data as any)?.cycle_modality === 'pregnancy';
```

**Espejo obligatorio:** `src/services/interventions/prescription-service.ts:260-261` tiene el MISMO gap (lee `pregnancy_status.is_pregnant` sin sexo). Aplicar el mismo gate (fetch `biological_sex` del perfil y `return false` si no es female) para que el motor de intervenciones tampoco contraindique por "embarazo" a un hombre.

**Copy del banner** (`app/supplements.tsx:241-242`): dejar el texto tal cual; el fix es que `pregnancyActive` nunca sea `true` para un hombre. (No tocar el banner.)

**Verificar el dato de Enrique (debug, no fix):** su fila probablemente tiene `pregnancy_status.is_pregnant=true` o `cycle_modality='pregnancy'` residual. El gate lo neutraliza sin depender de limpiar la fila; opcionalmente reportar en el delivery doc si conviene un cleanup SQL idempotente aparte.

---

### #1 · Cards de HOY con routing granular (#90)

**Tres capas a tocar** (la card real usa onTap hardcoded en HoyEditorialSection; los otros dos mapas son fallback/próximo-electrón):

1. `src/components/hoy/HoyEditorialSection.tsx` (onTap directos):
   - Línea **403** card `checkin`: `onTap={() => go('/mente')}` → `go('/checkin')`
   - Línea **421** card `journal`: `onTap={() => go('/mente')}` → `go('/journal')`
   - Línea **462** card `agua`: `onTap={() => go('/nutrition')}` → `go('/hydration')`
   - `meditacion`/`breathwork` se renderizan vía `renderElectronCard` (línea 361: `go(spec.route || el?.pillarRoute || '/kit')`) → se corrigen al arreglar `hoy-cards.ts` (abajo).

2. `src/constants/hoy-cards.ts` (spec.route, fuente de los electron cards):
   - Línea **32** `checkin`: `route: '/mente'` → `'/checkin'`
   - Línea **34** `agua`: `route: '/nutrition'` → `'/hydration'`
   - Línea **36** `meditacion`: `route: '/mente'` → `'/meditation'`
   - Línea **41** `breathwork`: `route: '/mente'` → `'/breathing'`
   - Línea **49** `journal`: `route: '/mente'` → `'/journal'`
   - Línea **33** `proteina`: `route: '/nutrition'` → **NO tocar** (decisión #70 aprobada).
   - Actualizar el comentario de cabecera (líneas 27-29) que dice "tap de card → HUB del pilar" — ya no es cierto para Mente.

3. `src/services/day-compiler.ts` (fallbacks del próximo-electrón / tap desde index.tsx:583):
   - `VERIFIED_ELECTRON_ROUTES` (37-45): `meditation:'/meditation'`, `breathwork:'/breathing'`, `checkin:'/checkin'` (hoy los 3 → `/mente`). `strength`/`cardio`→`/fitness-hub` y `supplements`/`period_log` se quedan.
   - `ELECTRON_ROUTES` (176-181): `meditation:'/meditation'`, `breathwork:'/breathing'`; añadir `checkin:'/checkin'` y `journal:'/journal'`. `no_alcohol` sigue `/nutrition`.
   - Actualizar el comentario 34-36.

**Rutas granulares confirmadas existentes:** `/checkin` (`app/checkin.tsx`), `/meditation` (`app/meditation.tsx`), `/breathing` (`app/breathing.tsx`), `/journal` (`app/journal.tsx`), `/hydration` (`app/hydration.tsx`). Todas registradas en `app/_layout.tsx`.

**Rúbrica:** probar cada card tocándola: debe abrir su pantalla específica, no un hub donde el usuario "se pierde".

---

### #3b · Cards de HOY fijadas a "Configura HOY", no a Mi Protocolo

**Diagnóstico exacto:** el flag `INTERVENTIONS_DRIVE_HOY` (`src/constants/flags.ts`) YA es `true` → `day-compiler.buildAgenda` (`:688-709`) dirige la AGENDA desde `user_interventions` (Mi Protocolo). PERO las cards editoriales del HOY (`HoyEditorialSection`, orden `HOY_SECTIONS`) se muestran gateadas SOLO por `getCardsVisible` (`src/services/hoy/visibility-service.ts:28-41`), que lee `client_profiles.hoy_cards_visible` — la config manual de "Configura HOY"/EditDayModal (`app/(tabs)/index.tsx:416,422`). Cero lectura de `user_interventions`. Resultado: el motor prescribe X pero HOY muestra la config vieja.

**Fix quirúrgico (cubre el set solapado):** cuando `INTERVENTIONS_DRIVE_HOY` esté ON, derivar `cardsVisible` de Mi Protocolo:
1. Cargar el protocolo activo con `getMyProtocol(userId)` (ya importado en day-compiler; exponer/consumir en el HOY).
2. Mapear cada intervención activa → su `cardKey` de HOY vía `canonicalConcept()` (`src/services/interventions/intervention-agenda-core.ts:240`) contra los conceptos de `HOY_CARD_SPECS`. Construir un mapa `intervencion→cardKey` (nuevo helper puro, testeable).
3. `cardsVisible = union(universalesBaseline, cardKeysPrescritos)` — reemplaza el uso puro de `getCardsVisible` en `index.tsx:416,422` cuando el flag está ON. Baseline universal mínimo = las cuantitativas/siempre-relevantes (proteína, agua, sueño) para no dejar el HOY vacío.

**Límite honesto (documentar en el brief de entrega):** el catálogo tiene ~59 intervenciones y HOY solo ~20 cardKeys; muchas intervenciones (oil pulling, ayuno de sardinas, etc.) NO tienen card editorial. Esas siguen viviendo en la AGENDA / Mi Protocolo. La FUSIÓN completa HOY↔Agenda↔Mi Protocolo es **Batch 4 / #30** (sprint conceptual). Este fix hace que las cards RESPONDAN a Mi Protocolo para el set mapeado — deja de sentirse "fijado a la config vieja" — sin pretender el 1:1 total. Si el mapeo concepto→card queda ambiguo para alguna intervención, NO inventar card: dejarla en agenda y anotarlo.

---

### #17 · Completar Journal NO palomea el electrón en HOY

**Causa raíz:** `journal` es booleano NO verificado. En `day-compiler.ts:246-254`, `verifiedCompleted` solo incluye `meditation/breathwork/strength/supplements/period_log/checkin/cardio`. Para journal, el compiler lee `completed` del blob `daily_electrons` (`:334`). Pero `app/journal.tsx:287` solo hace `awardBooleanElectron('journal')` + emits — NUNCA escribe el blob. → la card queda pending para siempre.

**Fix — Opción A (limpia, recomendada, sin migración):** volver `journal` un electrón VERIFICADO, espejo exacto de `checkin`:
1. En `compileDay` (`:208-237`), añadir a `Promise.all` una query de conteo:
   ```ts
   supabase.from('journal_entries').select('id', { count: 'exact', head: true })
     .eq('user_id', userId).eq('date', today),
   ```
2. En `verifiedCompleted` (`:246-254`) añadir: `journal: (journalCountRes.count ?? 0) >= 1,`
3. Añadir `'journal'` a `VERIFIED_ELECTRON_KEYS` (`:29-31`) y a `VERIFIED_ELECTRON_ROUTES` (`:37-45`) con `journal: '/journal'` (consistente con #1). `journal` sigue en `MANDATORY_BOOLEANS` para que su card exista; `verifiedCompleted` gana sobre el blob.
4. `reconcileVerifiedLedger` (`:415`) ya alinea `electron_logs` con `journal_entries` de forma idempotente (award/revoke) — sin cambios extra.
5. En `HoyEditorialSection.tsx` la card journal ya navega (no togglea) y el guard de verificados (`:284`) la protege — verificar que sigue OK.

> Opción B (parche, NO preferida): que `journal.tsx` haga read-modify-write del blob `daily_electrons`. Frágil (writes concurrentes) y no maneja borrado de la entrada. La Opción A es la que respeta "todo limpio".

**Rúbrica:** escribir una entrada de journal → volver a HOY → la card JOURNAL palomea "Registrado hoy" sin recargar la app; borrar la entrada → despalomea.

---

### #20 · Check-in emocional: "atrás" en cierto punto SACA de la app

**Causa raíz:** el flujo es multi-paso por `step` (1=mapa, 2=emociones, 3=contexto, 4=done) SIN interceptar el back. El back del header (`PillarHeader`→`BackButton`, `router.back()`) y el hardware back de Android salen de `/checkin` completa. Si `/checkin` es el único elemento del stack (entrada directa desde card), sale de la app.

**Fix quirúrgico:**
1. `src/components/ui/PillarHeader.tsx`: aceptar prop opcional `onBack?: () => void` y pasarla a `BackButton` (`onPress={onBack}`). `BackButton` ya soporta `onPress` (`:21`).
2. `app/checkin.tsx`: definir `const handleBack = () => { if (step > 1 && step < 4) setStep(step - 1); else router.back(); };` y pasarlo: `<PillarHeader pillar="mind" title="Check-in" onBack={handleBack} />` (`:202`).
3. Interceptar hardware back (Android) con `BackHandler.addEventListener('hardwareBackPress', ...)` dentro de un `useEffect`/`useFocusEffect`: si `step>1 && step<4` → `setStep(step-1); return true` (consumir); si no → `return false` (default). Importar `BackHandler` de `react-native`.

**Rúbrica:** en paso 2 y 3, back (header y botón físico Android) regresa AL PASO ANTERIOR, no sale de la app. En paso 1, back sale al HOY. En paso 4 (done), "Volver" sigue con `router.back()`.

---

### #21 · Rachas de check-in mal contadas

**Diagnóstico:** la lógica pura `computeJournalStreak` (`src/services/journal-logic.ts:22-45`) es CORRECTA — dedup por día (`new Set`), ancla hoy/ayer, rompe en hueco. `date-helpers` (`getLocalToday`/`toLocalDateString`) son consistentes en TZ local. El defecto de percepción: la racha SOLO se calcula al guardar (paso 4, `:142-152`) y solo se muestra si `>1`. Al ENTRAR al check-in (paso 1) no hay racha visible aunque exista una viva → "no la cuenta".

**Fix:**
1. En el `useEffect` de mount (`app/checkin.tsx:59-63`), cargar la racha: query `emotional_checkins` (created_at, desc, limit 400) → `computeJournalStreak(dates)` → `setCheckinStreak(...)`. Mostrarla en el mapa (paso 1) junto a "CHECK-INS RECIENTES".
2. Reusar exactamente el mismo bloque de query que ya existe en `handleSave` (`:143-151`) — extraer a un helper local `loadCheckinStreak()` y llamarlo en mount y tras guardar (DRY).

**Rúbrica:** con 3 días consecutivos previos, entrar al check-in muestra "🔥 3 días" en el paso 1 (no solo después de registrar). Con 2 check-ins el MISMO día, la racha no salta a 2 por día (dedup ya lo cubre — confirmar en test).

---

### #28 · Agenda no manda notificaciones (journal SÍ)

**Path que funciona (copiar):** `app/journal.tsx:110-124` — `scheduleReminder` usa `Notifications.scheduleNotificationAsync({ trigger: { type: DAILY, hour, minute } })`, notificación LOCAL on-device. No depende de servidor.

**Path roto:** agenda depende del edge `dispatch-agenda-notifications` (push): requiere token registrado (`push-notification-service.ts`, solo device físico + permiso), `notify_at` en `agenda_event_logs`, y el cron del edge. Cualquier eslabón faltante = no llega.

**Fix quirúrgico:** agendar notificaciones LOCALES por evento de agenda desde el cliente, replicando el journal.
1. Crear `src/services/agenda-local-notifications.ts` con `syncAgendaLocalNotifications(userId, date)`: lee `getAgendaForDate` (eventos activos con hora + `notifyMinutesBefore`), y por cada uno con notif > 0 programa una `scheduleNotificationAsync` con trigger de fecha/hora (`type: DATE` a `scheduled_at - notify`), guardando el `identifier` devuelto en un mapa namespaced (ej. AsyncStorage `@atp/agenda_notif_ids`).
2. **CRÍTICO:** NO usar `cancelAllScheduledNotificationsAsync` (journal lo usa en `:111,139` y borraría lo de agenda, y viceversa). Cancelar SOLO por identifier propio (`cancelScheduledNotificationAsync(id)`) antes de re-agendar. Idealmente refactorizar journal para también usar identifiers namespaced (evita que journal borre agenda). Documentar este landmine en el delivery doc.
3. Disparar `syncAgendaLocalNotifications` al entrar a `/agenda` y tras `createCustomEvent`/`updateAgendaEvent`/`generateAgendaEvents`.
4. Mantener el push server como refuerzo (no removerlo); el local garantiza que llegue.

**Rúbrica:** crear un evento de agenda con recordatorio 10 min antes → la notificación local dispara a la hora en device (probar en device físico, con app en background). El recordatorio de journal SIGUE funcionando (no se pisan).

---

### #29 · Agenda con eventos repetidos (motor + manual)

**Causa raíz:** `syncInterventionEvents` (`src/services/agenda-service.ts:270-315`) hace cleanup por familia canónica con `planAgendaCleanup` (`:283`) pero, por doctrina "dato user sagrado", los eventos `source='manual'`/`'manual_override'` NUNCA se tocan (comentario `:281`). El dedup de inserts (`planInterventionEventSync`, `intervention-agenda-core.ts:519`) tampoco compara contra manuales. → intervención del motor + evento manual del mismo concepto coexisten.

**Fix quirúrgico (respeta user sagrado):** al planear los inserts de intervención, SUPRIMIR (no insertar) la intervención cuyo `canonicalConcept` ya exista como evento MANUAL activo. Se conserva el del user; se elimina el duplicado del motor.
- En `planInterventionEventSync` (`intervention-agenda-core.ts:519`): antes de generar `inserts`, construir `manualConcepts = Set(rows.filter(r => (r.source==='manual'||r.source==='manual_override') && r.is_active).map(r => canonicalConcept(r.name)))` y filtrar `desired` para excluir los cuyo concepto ∈ `manualConcepts`.
- Mantener la función PURA (ya recibe `rows`) → añadir/actualizar test en `intervention-agenda-core` con un fixture: 1 evento manual "Meditar 08:00" + intervención `meditacion_manana` mismo concepto → resultado: 0 inserts de esa intervención, el manual intacto.
- No borrar filas manuales; no desactivar el manual.

**Rúbrica:** con un evento manual y una intervención del mismo concepto, la agenda muestra UNO (el manual). Relacionado a #87 (56 eventos duplicados) — este fix ataca la raíz del solape motor↔manual.

---

### #2 · N-Back no aparece (NO es bug — documentar)

**Estado verificado:** existe `supabase/migrations/197_nback_challenge.sql` (lógica + tabla), spec cerrado (task #44 completada), sin UI. Task #45 "N-Back Challenge implementación completa (V1.5 · 20-30h Fable)" está PENDIENTE. Es un módulo V1.5, no un bug.

**Acción para CC:** NO implementar. Documentar en el delivery doc:
- Decisión pendiente de Enrique: (a) surface una card "Próximamente" en el pilar Mente, o (b) dejar oculto hasta V1.5.
- Si Enrique elige (a): es 1 card editorial estática con estado `disabled`/"Próximamente" que NO navega (o navega a un placeholder). Trivial, pero esperar su decisión.

---

## TEST GUARDS (obligatorios antes de push)

- `npx tsc --noEmit` → 0 errores.
- **#4 — probar como usuario HOMBRE:** con una fila que tenga `pregnancy_status.is_pregnant=true` O `cycle_modality='pregnancy'` y `biological_sex='male'` → `isPregnancyActive` devuelve `false`; el banner NO aparece. Añadir/actualizar test unitario del lector (mock supabase) para `male + pregnancy_status.is_pregnant=true → false` y `female + is_pregnant=true → true`. Repetir para `prescription-service`.
- **#1:** test o smoke de que cada card navega a su ruta granular (`/checkin`, `/meditation`, `/breathing`, `/journal`, `/hydration`); proteína sigue en `/nutrition`.
- **#17:** test del compiler: `journal_entries` count ≥1 hoy → `booleanElectrons.find(journal).completed === true`.
- **#20:** test/smoke de `handleBack`: `step=2 → step=1`; `step=1 → router.back()`.
- **#21:** test de `computeJournalStreak` con múltiples check-ins mismo día (dedup) + racha viva ancla ayer.
- **#28:** smoke en device físico (background). Confirmar que journal + agenda no se pisan (identifiers namespaced).
- **#29:** test puro de `planInterventionEventSync` con evento manual del mismo concepto → 0 inserts de la intervención duplicada.

## INVARIANTES

1. Un usuario con `biological_sex !== 'female'` NUNCA activa máscara de embarazo (supplements NI prescription-service).
2. Cada card del HOY navega a su pantalla ESPECÍFICA (granular), salvo proteína→/nutrition (aprobado).
3. `journal` completado (≥1 entry hoy) ⇒ card palomea, derivado de `journal_entries`, no del blob.
4. El back del check-in nunca saca de la app estando en pasos intermedios.
5. La racha de check-in es visible al entrar (no solo al guardar) y dedup por día.
6. Journal y Agenda NO se pisan sus notificaciones locales (identifiers namespaced; nada de cancelAll global).
7. Eventos manuales del user son sagrados: el dedup suprime el duplicado del MOTOR, nunca el manual.
8. 0 migraciones nativas → deploy OTA. `INTERVENTIONS_DRIVE_HOY` se queda en `true`.

## DELIVERY DOC (al terminar)

Entregar `R and D/FABLE_BATCH_1_DELIVERY_2026-07-17.md` con: qué se tocó por fix (archivo:línea antes→después), decisión #17 (A vs B) tomada, límite documentado de #3b (qué queda para Batch 4/#30), el landmine de notificaciones de #28 (journal/agenda identifiers), estado #2 (esperando decisión Enrique), resultado `tsc`, y checklist de la rúbrica probada como usuario real (incluida la prueba como HOMBRE para #4).
