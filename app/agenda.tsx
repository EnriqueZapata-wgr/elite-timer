/**
 * /agenda (#v13h — rediseño editorial) — ventana dependiente de HOY: timeline de eventos del día
 * como mini-cards horizontales. Fondo gradient vertical + header editorial (título grande + fecha
 * lima + chip) + divisores MAÑANA/TARDE/NOCHE + FAB con glow lima. Auto-genera desde protocolo+
 * cronotipo al entrar, permite editar/completar/posponer/eliminar (EventActionModal) y crear custom
 * (FAB "+"). Atrás regresa a HOY. Sprint VISUAL: no toca agenda-service ni modales.
 */
import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet, DeviceEventEmitter, Alert, ActivityIndicator } from 'react-native';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Screen } from '@/src/components/ui/Screen';
import { useAppTheme } from '@/src/contexts/theme-context';
import { BackButton } from '@/src/components/ui/BackButton';
import { EliteText } from '@/components/elite-text';
import { AgendaMiniCard } from '@/src/components/agenda/AgendaMiniCard';
import { RestrictionsBanner } from '@/src/components/agenda/RestrictionsBanner';
import { EventActionModal } from '@/src/components/agenda/EventActionModal';
import { EventFormModal, type EventFormValue } from '@/src/components/agenda/EventFormModal';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { ATP_BRAND } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import {
  generateAgendaEvents, getAgendaForDate, getRestrictionsForDate, createCustomEvent, updateAgendaEvent,
  deleteAgendaEvent, setEventStatus, snoozeEvent, syncElectronFromEvent, type AgendaEventInstance,
} from '@/src/services/agenda-service';
import { completeInterventionByKey, adjustIntervention } from '@/src/services/interventions/intervention-service';
import { findUserDuplicateGroups, type UserDupCandidate } from '@/src/services/interventions/intervention-agenda-core';
import { hasNotificationPermission, registerForPushNotificationsAsync } from '@/src/services/push-notification-service';
import { syncAgendaLocalNotifications } from '@/src/services/agenda-local-notifications';
// 31-ago-2026 (12.1): el orden y los divisores viven en el núcleo puro con
// test — pospuestos donde cayeron, sin hora al final bajo SIN HORA.
import { insertDayPartDividers, localHHMM } from '@/src/services/agenda-core';
import { TimeWheelPicker } from '@/src/components/ui/TimeWheelPicker';

function formatToday(): string {
  const d = new Date(getLocalToday() + 'T12:00:00');
  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

export default function AgendaScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  // MB-31B: pantalla migrada. El lima como texto (fecha, chip) solo existe en
  // oscuro; en claro el chip pasa a relleno lima sólido con negro encima y el
  // acento de texto es el teal calibrado (regla 1 del manual 3.6).
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const [events, setEvents] = useState<AgendaEventInstance[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AgendaEventInstance | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  // 12.1: "Cambiar hora" abre la rueda (TimeWheelPicker, la misma de journal y
  // Centro ATP) como hermana de los modales: el de acciones se oculta mientras
  // la rueda está abierta para no anidar Modal dentro de Modal.
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) { setEvents([]); setRestrictions([]); setLoading(false); return; }
    const [list, restr] = await Promise.all([
      getAgendaForDate(userId, getLocalToday()),
      getRestrictionsForDate(userId, getLocalToday()),
    ]);
    setEvents(list);
    setRestrictions(restr);
    setLoading(false);
    // #28: (re)programar notificaciones LOCALES de los eventos con recordatorio.
    // Fire-and-forget e idempotente — el push server queda como refuerzo.
    syncAgendaLocalNotifications(userId, getLocalToday()).catch(() => {});
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

  // Mega-Sprint A B4.1: re-hacer el test de cronotipo cambia wake/sleep → la
  // agenda reconcilia las horas de Despertar/Dormir aunque esté en background.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('chronotype_changed', () => {
      if (!userId) return;
      generateAgendaEvents(userId, getLocalToday()).then(() => reload()).catch(() => {});
    });
    return () => sub.remove();
  }, [userId, reload]);

  const nowMs = Date.now();
  const upcoming = events.filter((e) => e.status === 'pending' && new Date(e.scheduledAt).getTime() >= nowMs).length;

  // P2.10 triple-audit: duplicados ENTRE filas del user (misma hora + familia).
  // La máquina no puede borrarlos (dato sagrado) → merge ASISTIDO: el user
  // elige cuál conserva; los demás se desactivan (soft, reversible).
  const dupGroups = findUserDuplicateGroups(
    events.filter((e) => e.status !== 'completed')
      .map((e) => ({ eventId: e.eventId, name: e.name, time: e.time, source: e.source })),
  );
  const askMerge = (group: UserDupCandidate[]) => {
    haptic.light();
    Alert.alert(
      'Eventos duplicados',
      `Tienes ${group.length} eventos a las ${group[0].time} que son el mismo momento. ¿Cuál conservas?`,
      [
        ...group.map((ev) => ({
          text: `Conservar «${ev.name}»`,
          onPress: async () => {
            if (!userId) return;
            for (const other of group.filter((o) => o.eventId !== ev.eventId)) {
              await deleteAgendaEvent(userId, other.eventId);
            }
            haptic.success();
            reload();
          },
        })),
        { text: 'Dejar ambos', style: 'cancel' as const },
      ],
    );
  };

  // ── acciones ──
  const handleComplete = async () => {
    if (!userId || !selected) return;
    const ev = selected;
    await setEventStatus(userId, ev.id, 'completed');
    if (ev.source === 'intervention' && ev.interventionKey) {
      // DX F4: completar un evento de intervención corre logCompletion de F3
      // (intervention_completions + electrón 'intervention' + emits). NO corre
      // syncElectronFromEvent: evita doble electrón cuando el nombre matchea un
      // booleano legacy (p.ej. grounding) — la convergencia la decide Cowork.
      await completeInterventionByKey(userId, ev.interventionKey).catch(() => {});
    } else {
      // F1 (AGENDA-COMPLETE): reverso Agenda→HOY — si el evento matchea un electrón booleano
      // no-verificado, lo otorga (la card de HOY se palomea). Guard: no rompe el completar.
      await syncElectronFromEvent(userId, ev.name, true).catch(() => {});
    }
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
  /**
   * 12.1: a dónde va "Cambiar hora" según la fuente del evento.
   *  · supplement → la ficha de Suplementos (la hora real vive en dose_times;
   *    editar aquí la agenda la reconciliaría de vuelta al minuto siguiente).
   *  · lo demás → la rueda.
   */
  const handleChangeTime = () => {
    if (!selected) return;
    if (selected.source === 'supplement') {
      setSelected(null);
      router.push('/supplements');
      return;
    }
    setTimePickerOpen(true);
  };
  const handleTimeConfirm = async (date: Date) => {
    const time = localHHMM(date);
    setTimePickerOpen(false);
    if (!userId || !selected) return;
    const ev = selected;
    setSelected(null);
    if (ev.source === 'intervention' && ev.interventionKey) {
      // Una sola verdad: la hora de una intervención es su custom_time (F3).
      // HOY y la agenda la leen de ahí; el sync de agenda la reconcilia.
      const ok = await adjustIntervention(userId, ev.interventionKey, { custom_time: time });
      if (!ok) { Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.'); return; }
      await generateAgendaEvents(userId, getLocalToday());
    } else {
      await updateAgendaEvent(userId, ev.eventId, { time });
    }
    haptic.success();
    DeviceEventEmitter.emit('day_changed');
    reload();
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
    // F2 (AGENDA-COMPLETE) fallback: configuró recordatorio pero nunca dio permiso de
    // notificaciones (ej. saltó la pantalla del onboarding) → prompt inline.
    if (value.notifyMinutesBefore > 0) void ensureNotifPermission(userId);
  };
  const ensureNotifPermission = async (uid: string) => {
    try {
      if (await hasNotificationPermission()) return;
      Alert.alert(
        'Necesitamos permiso',
        'Para enviarte este recordatorio necesitamos permiso de notificaciones. ¿Activar ahora?',
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Activar', onPress: () => { registerForPushNotificationsAsync(uid, { prompt: true }).catch(() => {}); } },
        ],
      );
    } catch { /* no-op: el permiso se puede pedir después */ }
  };

  return (
    <Screen themed>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {/* Fondo gradient vertical sutil: en oscuro negro·casi-negro·negro (los
          valores de siempre vía tokens); en claro fondo·hundido·fondo. */}
      <LinearGradient colors={[tokens.fondo, tokens.hundido, tokens.fondo]} style={StyleSheet.absoluteFill} />

      {/* Header editorial: back + chip a la derecha, luego título grande + fecha. */}
      <View style={styles.headerRow}>
        <BackButton onPress={() => router.back()} />
        <View style={[styles.chip, !dark && { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime }]}>
          <EliteText style={[styles.chipText, !dark && { color: tokens.textoSobreLima }]}>
            {events.length} eventos · {upcoming} próximos
          </EliteText>
        </View>
      </View>
      <View style={styles.titleBlock}>
        <EliteText style={[styles.title, { color: tokens.texto }]}>AGENDA DE HOY</EliteText>
        <EliteText style={[styles.date, !dark && { color: tokens.tealTexto }]}>{formatToday()}</EliteText>
      </View>

      {/* #v13i D — prohibiciones del día (arriba de la lista, no en el timeline). */}
      {restrictions.length > 0 ? (
        <View style={styles.bannerWrap}>
          <RestrictionsBanner restrictions={restrictions} />
        </View>
      ) : null}

      {/* P2.10: merge asistido de duplicados del user — 1 tap, el user decide. */}
      {dupGroups.map((g) => (
        <View key={`dup-${g[0].time}-${g[0].eventId}`} style={styles.bannerWrap}>
          <AnimatedPressable onPress={() => askMerge(g)} style={styles.dupBanner}>
            <Ionicons name="git-merge-outline" size={15} color={ATP_BRAND.amber} />
            <EliteText style={[styles.dupBannerText, !dark && { color: tokens.texto }]} numberOfLines={1}>
              {g.length} eventos a las {g[0].time} parecen el mismo momento
            </EliteText>
            {/* El ámbar como texto no llega en claro (terciario, apoyo): ahí
                el CTA usa el texto del tema. */}
            <EliteText style={[styles.dupBannerCta, !dark && { color: tokens.texto }]}>Unificar</EliteText>
          </AnimatedPressable>
        </View>
      ))}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={dark ? ATP_BRAND.lime : tokens.tealTexto} /></View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color={dark ? 'rgba(255,255,255,0.2)' : tokens.sinDatos} />
          <EliteText style={[styles.emptyTitle, { color: tokens.texto }]}>Sin eventos hoy</EliteText>
          <EliteText style={[styles.emptyText, !dark && { color: tokens.textoSecundario }]}>Crea tu primer evento con el botón +, o configura tu protocolo y cronotipo para auto-generarlos.</EliteText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {insertDayPartDividers(events).map((item, i) =>
            'divider' in item ? (
              <View key={`div-${i}`} style={styles.divider}>
                <EliteText style={[styles.dividerLabel, !dark && { color: tokens.textoSecundario }]}>{item.divider}</EliteText>
                <View style={[styles.dividerLine, !dark && { backgroundColor: tokens.borde }]} />
              </View>
            ) : (
              <AgendaMiniCard key={item.id} event={item} seedKey={userId} onTap={() => setSelected(item)} />
            )
          )}
          <View style={{ height: 96 }} />
        </ScrollView>
      )}

      {/* FAB crear — glow lima real. Relleno lima con negro encima: el mismo
          patrón en los dos temas (el lima como relleno sí vive en claro). */}
      <AnimatedPressable style={styles.fab} onPress={() => { haptic.medium(); setSelected(null); setFormMode('create'); }}>
        <Ionicons name="add" size={28} color={tokens.textoSobreLima} />
      </AnimatedPressable>

      {/* Modal de acciones al tocar una card. Una toma de suplemento se edita
          en su ficha (dose_times manda): editar aquí la copia de agenda se
          reconciliaría de vuelta, así que Editar también lleva a Suplementos. */}
      <EventActionModal
        event={formMode || timePickerOpen ? null : selected}
        onEdit={() => (selected?.source === 'supplement' ? handleChangeTime() : setFormMode('edit'))}
        onChangeTime={handleChangeTime}
        onComplete={handleComplete}
        onSnooze={handleSnooze}
        onDelete={handleDelete}
        onClose={() => setSelected(null)}
      />

      {/* 12.1: rueda de hora (hermana de los modales, nunca anidada). */}
      <TimeWheelPicker
        visible={timePickerOpen}
        initialValue={(() => {
          const d = new Date();
          const [h, m] = (selected?.effectiveTime ?? selected?.time ?? '08:00').split(':').map(Number);
          d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
          return d;
        })()}
        title={selected ? `Hora de ${selected.name}` : 'Hora del evento'}
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimePickerOpen(false)}
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
  bannerWrap: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  dupBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,213,79,0.08)', borderWidth: 1, borderColor: 'rgba(239,213,79,0.25)',
    borderRadius: Radius.md, paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.sm,
  },
  dupBannerText: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: FontSizes.sm },
  dupBannerCta: { color: ATP_BRAND.amber, fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1 },
  title: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, letterSpacing: 2 },
  date: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 3, marginTop: 3 },
  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  // Divisor de franja horaria: label a la izq + línea que llena el resto.
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  dividerLabel: { color: 'rgba(255,255,255,0.4)', fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, letterSpacing: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginTop: Spacing.sm },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.xl,
    width: 60, height: 60, borderRadius: 30, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ATP_BRAND.lime, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
});
