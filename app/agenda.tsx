/**
 * /agenda (#v13g F3) — ventana dependiente de HOY: timeline de eventos del día como mini-cards
 * horizontales. Auto-genera desde protocolo+cronotipo al entrar, permite editar/completar/posponer/
 * eliminar (EventActionModal) y crear custom (FAB "+"). Atrás regresa a HOY.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, DeviceEventEmitter, Alert, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
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
      <ScreenHeader title="Agenda de hoy" onBack={() => router.back()} />

      <View style={styles.subHeader}>
        <EliteText style={styles.date}>{formatToday()}</EliteText>
        <View style={styles.chip}>
          <EliteText style={styles.chipText}>{events.length} eventos · {upcoming} próximos</EliteText>
        </View>
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
          {events.map((ev) => (
            <AgendaMiniCard key={ev.id} event={ev} seedKey={userId} onTap={() => setSelected(ev)} />
          ))}
          <View style={{ height: 96 }} />
        </ScrollView>
      )}

      {/* FAB crear */}
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
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  date: { color: 'rgba(255,255,255,0.6)', fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1 },
  chip: { backgroundColor: 'rgba(168,224,42,0.12)', paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.pill },
  chipText: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginTop: Spacing.sm },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
    width: 56, height: 56, borderRadius: 28, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ATP_BRAND.lime, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});
