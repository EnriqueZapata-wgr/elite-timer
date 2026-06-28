/**
 * EventActionModal (#v13g F5) — acciones sobre una mini-card de agenda al tocarla.
 * 4 acciones: Editar · Completar · Posponer (+15/+30/+60) · Eliminar. Modal centrado, plano.
 */
import { useState } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import type { AgendaEventInstance } from '@/src/services/agenda-service';

interface Props {
  event: AgendaEventInstance | null;
  onEdit: () => void;
  onComplete: () => void;
  onSnooze: (minutes: number) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function EventActionModal({ event, onEdit, onComplete, onSnooze, onDelete, onClose }: Props) {
  const [showSnooze, setShowSnooze] = useState(false);
  const visible = !!event;

  const act = (fn: () => void) => { haptic.light(); fn(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { /* eat tap */ }}>
          <EliteText style={styles.title} numberOfLines={1}>{event?.name ?? ''}</EliteText>
          <EliteText style={styles.subtitle}>{event?.time}</EliteText>

          {!showSnooze ? (
            <View style={styles.actions}>
              <ActionRow icon="create-outline" label="Editar" onPress={() => act(onEdit)} />
              <ActionRow icon="checkmark-circle-outline" label="Completar" color={ATP_BRAND.lime} onPress={() => act(onComplete)} />
              <ActionRow icon="time-outline" label="Posponer" onPress={() => { haptic.light(); setShowSnooze(true); }} />
              <ActionRow icon="trash-outline" label="Eliminar" color="#fb7185" onPress={() => act(onDelete)} />
            </View>
          ) : (
            <View style={styles.actions}>
              <EliteText style={styles.snoozeLabel}>Posponer…</EliteText>
              {[15, 30, 60].map((m) => (
                <ActionRow key={m} icon="add-circle-outline" label={`+${m} min`} onPress={() => act(() => onSnooze(m))} />
              ))}
              <ActionRow icon="arrow-back-outline" label="Volver" onPress={() => { haptic.light(); setShowSnooze(false); }} />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionRow({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color ?? 'rgba(255,255,255,0.85)'} />
      <EliteText style={[styles.rowText, color ? { color } : null]}>{label}</EliteText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  card: { width: '100%', maxWidth: 320, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.card, padding: Spacing.xl },
  title: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  subtitle: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, marginTop: 2, marginBottom: Spacing.md },
  actions: { gap: 2 },
  snoozeLabel: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1.5, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12 },
  rowText: { color: 'rgba(255,255,255,0.85)', fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
});
