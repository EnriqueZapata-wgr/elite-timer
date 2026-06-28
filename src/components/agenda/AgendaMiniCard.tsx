/**
 * AgendaMiniCard (#v13g F2) — mini-card horizontal de un evento de la agenda.
 * Layout: thumbnail B/N (categoría) a la izq + nombre/estado + hora a la der.
 * Estados: pending (full) · completed (tachado + check lima) · skipped (gris) · snoozed (reloj +Xmin).
 * Reusa pickAgendaImage + agendaCategoryToFolder (sin imágenes nuevas).
 */
import { View, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { pickAgendaImage } from '@/src/utils/agenda-image-picker';
import { agendaCategoryToFolder } from '@/src/utils/image-pick-core';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import type { AgendaEventInstance } from '@/src/services/agenda-service';

interface Props {
  event: AgendaEventInstance;
  onTap?: () => void;
  /** Versión reducida para el preview en HOY. */
  compact?: boolean;
  /** Seed para rotación determinística de la imagen. */
  seedKey?: string;
}

export function AgendaMiniCard({ event, onTap, compact, seedKey }: Props) {
  const folder = agendaCategoryToFolder(event.category, event.name);
  const image: ImageSourcePropType | undefined = pickAgendaImage(folder, `${seedKey ?? ''}-${event.eventId}`);
  const done = event.status === 'completed';
  const skipped = event.status === 'skipped';
  const snoozed = event.status === 'snoozed';
  const thumb = compact ? 44 : 60;

  return (
    <AnimatedPressable
      onPress={onTap ? () => { haptic.light(); onTap(); } : undefined}
      style={[styles.card, compact && styles.cardCompact, skipped && styles.cardSkipped]}
    >
      {/* Thumbnail B/N (o placeholder oscuro si no hay imagen). */}
      <View style={[styles.thumbWrap, { width: thumb, height: thumb }]}>
        {image ? (
          <Image source={image} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
        {done ? (
          <View style={styles.thumbVeil}>
            <Ionicons name="checkmark-circle" size={compact ? 18 : 22} color={ATP_BRAND.lime} />
          </View>
        ) : null}
      </View>

      {/* Texto */}
      <View style={styles.body}>
        <EliteText
          style={[styles.name, compact && styles.nameCompact, done && styles.nameDone, skipped && styles.nameMuted]}
          numberOfLines={1}
        >
          {event.name}
        </EliteText>
        {snoozed ? (
          <View style={styles.statusRow}>
            <Ionicons name="time-outline" size={12} color="#fbbf24" />
            <EliteText style={styles.statusText}>Pospuesto</EliteText>
          </View>
        ) : event.notifyMinutesBefore > 0 && !done && !skipped ? (
          <View style={styles.statusRow}>
            <Ionicons name="notifications-outline" size={11} color="rgba(255,255,255,0.5)" />
            <EliteText style={styles.statusText}>{event.notifyMinutesBefore} min antes</EliteText>
          </View>
        ) : null}
      </View>

      {/* Hora a la derecha */}
      <EliteText style={[styles.time, compact && styles.timeCompact, skipped && styles.nameMuted]}>
        {event.time}
      </EliteText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#121212', borderRadius: Radius.card,
    padding: Spacing.sm, marginBottom: Spacing.sm,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardCompact: { paddingVertical: 6, marginBottom: 6 },
  cardSkipped: { opacity: 0.5 },
  thumbWrap: { borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: '#000' },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { backgroundColor: '#1A1A1A' },
  thumbVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  name: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  nameCompact: { fontSize: FontSizes.sm },
  nameDone: { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.55)' },
  nameMuted: { color: 'rgba(255,255,255,0.5)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.regular, fontSize: FontSizes.xs },
  time: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 0.5 },
  timeCompact: { fontSize: FontSizes.sm },
});
