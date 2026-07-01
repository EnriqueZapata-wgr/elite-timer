/**
 * /agenda (#v13h — rediseño editorial) — ventana dependiente de HOY: timeline de eventos del día
 * como mini-cards horizontales. Fondo gradient vertical + header editorial (título grande + fecha
 * lima + chip) + divisores MAÑANA/TARDE/NOCHE + FAB con glow lima. Auto-genera desde protocolo+
 * cronotipo al entrar, permite editar/completar/posponer/eliminar (EventActionModal) y crear custom
 * (FAB "+"). Atrás regresa a HOY. Sprint VISUAL: no toca agenda-service ni modales.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, DeviceEventEmitter, Alert, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/src/components/ui/Screen';
import { BackButton } from '@/src/components/ui/BackButton';
import { EliteText } from '@/components/elite-text';
import { AgendaMiniCard } from '@/src/components/agenda/AgendaMiniCard';
import { EventActionModal } from '@/src/components/agenda/EventActionModal';
import { EventFormModal, type EventFormValue } from '@/src/components/agenda/EventFormModal';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { ATP_BRAND } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import {
  generateAgendaEvents, getAgendaForDate, createCustomEvent, updateAgendaEvent,
  deleteAgendaEvent, setEventStatus, snoozeEvent, type AgendaEventInstance,
} from '@/src/services/agenda-service';

function formatToday(): string {
  const d = new Date(getLocalToday() + 'T12:00:00');
  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

/** Item de la lista: un evento o un divisor de franja horaria. */
type AgendaListItem = AgendaEventInstance | { divider: string };

/**
 * Inserta divisores MAÑANA (5-12h) / TARDE (12-18h) / NOCHE (18h+) donde cambia el rango horario.
 * NO reordena (los eventos ya vienen por hora), solo intercala labels.
 */
function insertDayPartDividers(events: AgendaEventInstance[]): AgendaListItem[] {
  const out: AgendaListItem[] = [];
  let lastPart: 'morning' | 'afternoon' | 'evening' | null = null;
  for (const ev of events) {
    const h = parseInt(ev.time.split(':')[0], 10);
    const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    if (part !== lastPart) {
      out.push({ divider: part === 'morning' ? 'MAÑANA' : part === 'afternoon' ? 'TARDE' : 'NOCHE' });
      lastPart = part;
    }
    out.push(ev);
  }
  return out;
}

export default function AgendaScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const [events, setEvents] = useState<AgendaEventInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AgendaEventInstance | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);

  const reload = useCallback(async () => {
    if (!userId) { setEvents([]); setLoading(false); return; }
    const list = await getAgendaForDate(userId, getLocalToday());
    setEvents(list);
    setLoading(false);
  }, [userId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      await generateAgendaEvents(userId, getLocalToday()); // idempotente
      if (active) await reload();
    })();
    return () => { active = false; };
  }, [userId, reload]));

  const nowMs = Date.now();
  const upcoming = events.filter((e) => e.status === 'pending' && new Date(e.scheduledAt).getTime() >= nowMs).length;

  // ── acciones ──
  const handleComplete = async () => {
    if (!userId || !selected) return;
    await setEventStatus(userId, selected.id, 'completed');
    setSelected(null);
    DeviceEventEmitter.emit('day_changed');
    reload();
  };
  const handleSnooze = async (minutes: number) => {
    if (!userId || !selected) return;
    await snoozeEvent(userId, selected.id, minutes);
    setSelected(null);
    reload();
  };
  const handleDelete = () => {
    if (!userId || !selected) return;
    const ev = selected;
    Alert.alert('Eliminar evento', `¿Quitar "${ev.name}" de tu agenda?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => { await deleteAgendaEvent(userId, ev.eventId); setSelected(null); reload(); },
      },
    ]);
  };
  const handleSaveForm = async (value: EventFormValue) => {
    if (!userId) return;
    if (formMode === 'edit' && selected) {
      await updateAgendaEvent(userId, selected.eventId, value);
    } else {
      await createCustomEvent(userId, value);
    }
    setFormMode(null);
    setSelected(null);
    DeviceEventEmitter.emit('day_changed');
    reload();
  };

  return (
    <Screen>
      {/* Fondo gradient vertical sutil (top negro · medio ligeramente más claro · bottom negro). */}
      <LinearGradient colors={['#000000', '#0A0A0A', '#000000']} style={StyleSheet.absoluteFill} />

      {/* Header editorial: back + chip a la derecha, luego título grande + fecha lima. */}
      <View style={styles.headerRow}>
        <BackButton onPress={() => router.back()} />
        <View style={styles.chip}>
          <EliteText style={styles.chipText}>{events.length} eventos · {upcoming} próximos</EliteText>
        </View>
      </View>
      <View style={styles.titleBlock}>
        <EliteText style={styles.title}>AGENDA DE HOY</EliteText>
        <EliteText style={styles.date}>{formatToday()}</EliteText>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={ATP_BRAND.lime} /></View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.2)" />
          <EliteText style={styles.emptyTitle}>Sin eventos hoy</EliteText>
          <EliteText style={styles.emptyText}>Crea tu primer evento con el botón +, o configura tu protocolo y cronotipo para auto-generarlos.</EliteText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {insertDayPartDividers(events).map((item, i) =>
            'divider' in item ? (
              <View key={`div-${i}`} style={styles.divider}>
                <EliteText style={styles.dividerLabel}>{item.divider}</EliteText>
                <View style={styles.dividerLine} />
              </View>
            ) : (
              <AgendaMiniCard key={item.id} event={item} seedKey={userId} onTap={() => setSelected(item)} />
            )
          )}
          <View style={{ height: 96 }} />
        </ScrollView>
      )}

      {/* FAB crear — glow lima real. */}
      <Pressable style={styles.fab} onPress={() => { haptic.medium(); setSelected(null); setFormMode('create'); }}>
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>

      {/* Modal de acciones al tocar una card */}
      <EventActionModal
        event={formMode ? null : selected}
        onEdit={() => setFormMode('edit')}
        onComplete={handleComplete}
        onSnooze={handleSnooze}
        onDelete={handleDelete}
        onClose={() => setSelected(null)}
      />

      {/* Modal crear/editar */}
      <EventFormModal
        visible={formMode !== null}
        title={formMode === 'edit' ? 'Editar evento' : 'Nuevo evento'}
        initial={formMode === 'edit' && selected ? {
          name: selected.name, time: selected.time, category: selected.category,
          notifyMinutesBefore: selected.notifyMinutesBefore,
        } : undefined}
        onSave={handleSaveForm}
        onClose={() => setFormMode(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
  },
  chip: {
    backgroundColor: 'rgba(168,224,42,0.12)', borderWidth: 0.5, borderColor: 'rgba(168,224,42,0.4)',
    paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.pill,
  },
  chipText: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  titleBlock: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: Spacing.md },
  title: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, letterSpacing: 2 },
  date: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 3, marginTop: 3 },
  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  // Divisor de franja horaria: label a la izq + línea que llena el resto.
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  dividerLabel: { color: 'rgba(255,255,255,0.4)', fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, letterSpacing: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginTop: Spacing.sm },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
    width: 60, height: 60, borderRadius: 30, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ATP_BRAND.lime, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
});
