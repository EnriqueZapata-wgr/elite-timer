# Fable Mega-Sprint — AGENDA-COMPLETE (cierre AGENDA para lanzamiento)

**Para:** Fable 5 CC · **Después de:** Task 2 deploy push notifications reportado OK
**Branch:** `feat/agenda-complete-launch`
**Owner:** Enrique · **Reviewer:** Cowork audita + Enrique merge

---

## 0. Contexto y por qué este sprint

AGENDA es el corazón del "asistente de vida saludable" (memoria `project_agenda_como_asistente`). Sin push funcionando + sync HOY↔Agenda + inbox + templates completos, la propuesta de valor se rompe. Este sprint la cierra al 100% para lanzamiento en 3 semanas.

Task 2 (que acabas de terminar) desplegó la infraestructura de push. Este sprint la conecta con el resto de la app.

---

## 1. Alcance total (5 features en 1 sprint)

### F1 — Sync HOY↔Agenda (bidireccional)

**Objetivo:** cuando el user completa un electrón en HOY, si tiene evento de agenda de misma categoría/día → se marca completed también. Reversible.

**Cambios:**

Archivo: `src/services/agenda-service.ts` — agregar helper:

```typescript
/**
 * Marca eventos de agenda del día que matchean una categoría como completed.
 * Idempotente: si ya están completed no hace nada.
 * Se llama cuando user completa un electrón booleano en HOY.
 */
export async function syncCompletionFromElectron(
  userId: string,
  electronSource: string,  // 'sunlight', 'cold_shower', 'grounding', etc.
  completed: boolean,      // true = completar, false = revocar
): Promise<{ affected: number }> {
  const today = getLocalToday();
  
  // Mapeo electron source → categoría agenda que matchea
  const SOURCE_TO_CATEGORY: Record<string, string[]> = {
    sunlight: ['sol-am', 'sol-pm', 'despertar'],
    cold_shower: ['exercise', 'otros'],  // baño frío
    grounding: ['otros', 'exercise'],
    meditation: ['mind', 'meditacion'],
    breathwork: ['mind', 'meditacion'],
    lentes_rojos: ['sleep', 'otros'],
    supplements: ['supplement'],
    strength: ['exercise', 'entrenar'],
    checkin: ['mind', 'otros'],
    journal: ['mind', 'otros'],
    no_alcohol: [],  // no matchea evento agenda directamente
    no_processed_foods: ['meal', 'nutrition'],
    screen_time_cutoff: ['off-pantallas', 'sleep'],
    sleep: ['sleep', 'recovery'],
  };
  
  const categories = SOURCE_TO_CATEGORY[electronSource] ?? [];
  if (categories.length === 0) return { affected: 0 };
  
  // Buscar logs pendientes hoy en esas categorías
  const { data: logs } = await supabase
    .from('agenda_event_logs')
    .select('id, agenda_events!inner(category)')
    .eq('user_id', userId)
    .eq('date', today)
    .in('status', completed ? ['pending', 'snoozed'] : ['completed'])
    .in('agenda_events.category', categories);
  
  if (!logs || logs.length === 0) return { affected: 0 };
  
  const newStatus = completed ? 'completed' : 'pending';
  const completedAt = completed ? new Date().toISOString() : null;
  
  const { error } = await supabase
    .from('agenda_event_logs')
    .update({ status: newStatus, completed_at: completedAt })
    .in('id', logs.map(l => l.id));
  
  if (error) throw error;
  
  DeviceEventEmitter.emit('day_changed');
  return { affected: logs.length };
}
```

Archivo: `src/components/hoy/HoyEditorialSection.tsx` — en `toggleBoolean(cardKey)`:

Después del `await awardBooleanElectron(...)` o `await revokeBooleanElectron(...)`, agregar:

```typescript
await syncCompletionFromElectron(userId!, source, next).catch((e) => {
  logWarn('[HoyEditorial] sync HOY→Agenda failed', e);
});
```

**Reverso (Agenda→HOY):** cuando user completa un evento en /agenda vía EventActionModal, si su categoría matchea un electron source booleano, también dar award del electrón. Archivo: `app/agenda.tsx` o donde vive la lógica de "Completar" del EventActionModal.

Helper reverso:

```typescript
// En agenda-service.ts:
const CATEGORY_TO_ELECTRON: Record<string, string> = {
  'sol-am': 'sunlight',
  'sol-pm': 'sunlight',
  'meditacion': 'meditation',
  'off-pantallas': 'screen_time_cutoff',
  'sleep': 'sleep',
  // ...
};

export async function syncElectronFromEvent(
  userId: string,
  category: string,
  completed: boolean
): Promise<void> {
  const source = CATEGORY_TO_ELECTRON[category];
  if (!source) return;
  // Verificar si el electron es booleano (no cuantitativo ni verified)
  if (['meditation', 'strength', 'breathwork'].includes(source)) return; // verified, no auto-award
  if (completed) await awardBooleanElectron(userId, source, { idempotencyKey: `agenda-sync:${userId}:${source}:${getLocalToday()}` });
  else await revokeBooleanElectron(userId, source);
  DeviceEventEmitter.emit('electrons_changed');
}
```

**Criterio de aceptación F1:** tap LUZ SOLAR en HOY → evento agenda "Luz solar + infrarroja" hoy pasa a completed. Tap de nuevo → vuelve a pending. Reverso: completar evento "Luz solar" en /agenda → LUZ SOLAR card en HOY se palomea.

---

### F2 — Permisos push notif en onboarding

**Objetivo:** pedir permiso de push al finalizar onboarding, no aleatoriamente después. Fallback en primer evento con notify_min si el user rechazó.

**Cambios:**

Archivo nuevo: `app/onboarding/notifications.tsx`

Screen con:
- Titular: "Activa recordatorios"
- Copy: "ARGOS te avisará cuando toque cada acción de tu protocolo. Sin recordatorios, la app funciona pero pierde el 60% de su poder."
- Imagen editorial B/N (reusa `assets/images/hoy-extra/screen-cutoff.png` o similar)
- Botón grande lima "Activar recordatorios" → `registerForPushNotificationsAsync()`
- Botón secondary "Ahora no" → skip
- Al final: `router.replace('/onboarding-complete')`

Integrar en flow onboarding: después de voice-config (última pantalla actual) → notifications → complete.

Verificar rutas actuales en `app/index.tsx` sección `switch (step)`. Agregar `case 'voice_config'` con next = `/onboarding/notifications` en vez de `/onboarding/summary`. Actualizar `onboarding_step` enum si es necesario en migración chica.

Fallback: si user ya pasó onboarding sin dar permiso, al crear/editar evento con `notify_min > 0` en EventFormModal, hacer check + prompt inline:

```typescript
// En EventFormModal, antes de save si notify_min > 0:
const { status } = await Notifications.getPermissionsAsync();
if (status !== 'granted') {
  Alert.alert(
    'Necesitamos permiso',
    'Para enviarte este recordatorio, necesitamos permiso de notificaciones. ¿Activar ahora?',
    [
      { text: 'Ahora no', style: 'cancel' },
      { text: 'Activar', onPress: () => registerForPushNotificationsAsync(userId) },
    ]
  );
}
```

**Criterio F2:** signup nuevo llega a /onboarding/notifications tras voice-config. Tap "Activar" → OS prompt → token registrado en `user_notification_tokens`. Tap "Ahora no" → skip. Users existentes ven prompt inline al configurar notify_min.

---

### F3 — Notif inbox (campana + /notifications)

**Objetivo:** la campana del header de HOY (task #3) muestra badge con contador real de notifs no leídas. Tap → `/notifications` con historial.

**Cambios:**

Migración `150_user_notifications.sql` (rango Fable, evita colisión con CC actual 100-149):

```sql
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,  -- 'agenda_reminder' | 'insight' | 'lab_ready' | etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,  -- eventId, route, etc.
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON user_notifications(user_id, created_at DESC) WHERE read_at IS NULL;

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_notifications_own ON user_notifications FOR ALL USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
```

Aplícala vía tu MCP execute_sql.

Extender Edge Function `dispatch-agenda-notifications/index.ts`: después de disparar push a Expo, insertar row en `user_notifications`:

```typescript
// Después del fetch a Expo push API con success:
await supabase.from('user_notifications').insert({
  user_id: log.user_id,
  type: 'agenda_reminder',
  title: 'ATP — Próximo evento',
  body: `${event?.name ?? 'Evento'} · en breve`,
  data: { logId: log.id, eventId: log.event_id, category: event?.category, route: '/agenda' },
});
```

Re-deploy la Edge Function con el update.

Componente nuevo: `src/components/hoy/NotificationBellIcon.tsx`

```tsx
export function NotificationBellIcon() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  
  const load = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);
    setUnreadCount(count ?? 0);
  }, [user?.id]);
  
  useFocusEffect(useCallback(() => {
    load();
    const sub = DeviceEventEmitter.addListener('notifications_changed', load);
    return () => sub.remove();
  }, [load]));
  
  return (
    <Pressable onPress={() => router.push('/notifications')}>
      <View>
        <Ionicons name="notifications-outline" size={22} color="#fff" />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <EliteText style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</EliteText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
```

Wire en el header del HOY (buscar donde vive el header actualmente en `app/(tabs)/index.tsx` — probablemente cerca del saludo "Buenos días · Enrique").

Screen nueva: `app/notifications.tsx`

Lista de notificaciones con:
- Header "NOTIFICACIONES" + botón "Marcar todas leídas"
- Lista scrollable de `user_notifications` DESC created_at
- Cada item: título · body · tiempo relativo · tap → navigate a `data.route`
- Al tap, marca `read_at = now()`
- Empty state: "No tienes notificaciones. Configura recordatorios en tu agenda para no perderte nada."

Estilo editorial consistente con resto de la app.

**Criterio F3:** llega push al device → badge campana muestra "1". Tap campana → `/notifications` con la notif. Tap la notif → marca leída + navega a /agenda. Badge baja a 0.

---

### F4 — Templates enriched (otros protocolos)

**Objetivo:** Sprint I solo enriched "Protocolo energía y vitalidad". Los demás templates existentes tienen los mismos issues (sin rutina nocturna, sin notify defaults, "Eliminar café" como evento). Aplicar mismo tratamiento a todos.

**Cambios:**

Migración `151_protocol_templates_enrich_all.sql`:

```sql
-- Marcar prohibiciones como restrictions en TODAS las plantillas (idempotente)
UPDATE protocol_templates
SET default_actions = (
  SELECT jsonb_agg(
    CASE
      WHEN a->>'name' ILIKE '%eliminar%' OR a->>'name' ILIKE '%sin alcohol%' 
        OR a->>'name' ILIKE '%no alcohol%' OR a->>'name' ILIKE '%no proces%'
        OR a->>'name' ILIKE '%no caf%' OR a->>'name' ILIKE '%sin caf%'
        OR a->>'name' ILIKE '%evitar%'
      THEN a || '{"action_type":"restriction","default_time":null}'::jsonb
      ELSE a
    END
  )
  FROM jsonb_array_elements(default_actions) AS a
);

-- Agregar rutina nocturna a los demás templates que no la tengan
-- Query los que NO tienen ningún evento después de las 20:00
WITH templates_sin_nocturna AS (
  SELECT id FROM protocol_templates pt
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(pt.default_actions) AS a
    WHERE (a->>'default_time')::time >= '20:00'::time
      AND (a->>'name' ILIKE '%journal%' OR a->>'name' ILIKE '%medita%')
  )
)
UPDATE protocol_templates
SET default_actions = default_actions || jsonb_build_array(
  jsonb_build_object(
    'name', 'Journal · descarga del día', 'phase', null, 'category', 'mind',
    'default_time', '21:00', 'duration_min', 10, 'action_type', 'action',
    'notify_minutes_before', 10,
    'instructions', 'Escribe 3 gratitudes + 1 aprendizaje del día.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  ),
  jsonb_build_object(
    'name', 'Lentes rojos · bloqueo luz azul', 'phase', null, 'category', 'optimization',
    'default_time', '21:15', 'duration_min', 1, 'action_type', 'action',
    'notify_minutes_before', 5,
    'instructions', 'Blockea luz azul 1h antes de dormir.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  ),
  jsonb_build_object(
    'name', 'Off-pantallas', 'phase', null, 'category', 'rest',
    'default_time', '21:30', 'duration_min', 1, 'action_type', 'action',
    'notify_minutes_before', 0,
    'instructions', 'Guarda pantallas. 30 min de baja estimulación.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  ),
  jsonb_build_object(
    'name', 'Meditación · 10 min', 'phase', null, 'category', 'mind',
    'default_time', '21:45', 'duration_min', 10, 'action_type', 'action',
    'notify_minutes_before', 5,
    'instructions', 'Meditación silenciosa o guiada.',
    'chronotype_offsets', '{"bear":0,"lion":-60,"wolf":60,"dolphin":0}'::jsonb
  )
)
WHERE id IN (SELECT id FROM templates_sin_nocturna);

-- Agregar notify_minutes_before default para acciones que no lo tengan
UPDATE protocol_templates
SET default_actions = (
  SELECT jsonb_agg(
    CASE 
      WHEN a->>'notify_minutes_before' IS NULL AND (a->>'action_type' IS NULL OR a->>'action_type' = 'action')
      THEN a || jsonb_build_object('notify_minutes_before',
        CASE 
          WHEN a->>'category' = 'nutrition' AND a->>'name' NOT ILIKE '%supplement%' THEN 15
          WHEN a->>'category' = 'fitness' THEN 30
          WHEN a->>'category' = 'rest' AND a->>'name' ILIKE '%dormir%' THEN 30
          WHEN a->>'category' = 'optimization' AND a->>'name' ILIKE '%supp%' THEN 5
          ELSE 5
        END
      )
      ELSE a
    END
  )
  FROM jsonb_array_elements(default_actions) AS a
);
```

Aplícala vía MCP.

**Criterio F4:** query todos los templates, verificar que ninguno tiene "Eliminar" en timeline (todos son restrictions). Todos tienen al menos Journal+Meditación en rutina nocturna. Todos tienen notify_minutes_before ≥ 0 en cada acción.

---

### F5 — Auditoría bugs residuales de agenda

**Objetivo:** después del merge de Sprint I + este mega-sprint, verificar que los bugs reportados por Enrique el 1-jul están todos cerrados.

**Bugs reportados:**
1. Duplicados en auto-gen
2. Palomeado difícil
3. Editar no persiste
4. Sync HOY↔Agenda ausente

**Chequeos:**
- F1 arriba resuelve #4 explícitamente
- Sprint I ya arreglaba #2 (idempotency electron_logs)
- Para #1 (duplicados): verificar via MCP query `SELECT event_id, date, COUNT(*) FROM agenda_event_logs GROUP BY event_id, date HAVING COUNT(*) > 1`. Si hay duplicados post-Sprint I, causa raíz en `generateAgendaEvents`. Investigar.
- Para #3 (edit no persiste): reproducir en device o revisar `updateAgendaEvent` en agenda-service.ts. Verificar que hace UPDATE (no INSERT), UPDATE responde con data, y emit day_changed.

**Deliverable:** reporte al final de qué encontraste + fixes si aplican.

---

## 2. Deploy y verificación

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
git checkout main
git pull origin main
git checkout -b feat/agenda-complete-launch

# Cambios por feature (commits granulares):
#   F1: sync HOY↔Agenda
#   F2: onboarding notifications screen
#   F3: user_notifications tabla + bell + inbox screen + edge update
#   F4: templates enriched migration
#   F5: bug audit + fixes si aplican

npx tsc --noEmit
vitest run

git push origin feat/agenda-complete-launch
# Cowork audita
# Enrique merge + OTA
```

Migraciones 150 y 151 las aplicas TÚ vía MCP execute_sql (rango 150-199 asignado a ti para evitar colisión con CC actual 100-149).

---

## 3. Reporta al terminar

Tabla con:
- Feature | commit sha | delta líneas | migración aplicada? | verificación end-to-end
- Bugs de F5 encontrados y su fix (o "no encontrado, revalidar en device")
- Cualquier decisión de criterio que hayas tomado (con razón)
- Cualquier scope de las 5 features que NO cerraste y por qué

---

## 4. Notas no negociables

- str_replace quirúrgico
- TypeScript clean antes de push
- Migraciones idempotentes
- Emit correctos: `electrons_changed`, `day_changed`, `notifications_changed`
- Sync HOY↔Agenda con guard `.catch()` para no romper el toggle si falla
- F5 no bloquea las otras 4: si no encuentras nada raro, reporta "audit clean" y termina

**FIN BUZÓN**
