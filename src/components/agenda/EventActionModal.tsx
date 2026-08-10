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
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';
import type { AgendaEventInstance } from '@/src/services/agenda-service';

// MB-31B: #fb7185 (rosa destructivo) NO mapea a ningún token — se queda en
// oscuro (va al reporte); en claro no se lee (≈2.4) y ahí sí usa el token de
// error del tema, que es la doctrina de acción destructiva.

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
  // MB-31B: superficie flotante del tema; el lima como texto solo en oscuro.
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const rowColor = dark ? 'rgba(255,255,255,0.85)' : t.texto;
  const destructivo = dark ? '#fb7185' : t.error;

  const act = (fn: () => void) => { haptic.light(); fn(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: t.flotante, borderColor: dark ? 'rgba(255,255,255,0.1)' : t.bordeMarcado }]}
          onPress={() => { /* eat tap */ }}
        >
          <EliteText style={[styles.title, { color: t.texto }]} numberOfLines={1}>{event?.name ?? ''}</EliteText>
          <EliteText style={[styles.subtitle, { color: acento }]}>{event?.time}</EliteText>

          {!showSnooze ? (
            <View style={styles.actions}>
              <ActionRow icon="create-outline" label="Editar" color={rowColor} onPress={() => act(onEdit)} />
              <ActionRow icon="checkmark-circle-outline" label="Completar" color={acento} onPress={() => act(onComplete)} />
              <ActionRow icon="time-outline" label="Posponer" color={rowColor} onPress={() => { haptic.light(); setShowSnooze(true); }} />
              <ActionRow icon="trash-outline" label="Eliminar" color={destructivo} onPress={() => act(onDelete)} />
            </View>
          ) : (
            <View style={styles.actions}>
              <EliteText style={[styles.snoozeLabel, { color: dark ? 'rgba(255,255,255,0.5)' : t.textoSecundario }]}>Posponer…</EliteText>
              {[15, 30, 60].map((m) => (
                <ActionRow key={m} icon="add-circle-outline" label={`+${m} min`} color={rowColor} onPress={() => act(() => onSnooze(m))} />
              ))}
              <ActionRow icon="arrow-back-outline" label="Volver" color={rowColor} onPress={() => { haptic.light(); setShowSnooze(false); }} />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionRow({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={color} />
      <EliteText style={[styles.rowText, { color }]}>{label}</EliteText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  card: { width: '100%', maxWidth: 320, borderWidth: 1, borderRadius: Radius.card, padding: Spacing.xl },
  title: { fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  subtitle: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, marginTop: 2, marginBottom: Spacing.md },
  actions: { gap: 2 },
  snoozeLabel: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1.5, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12 },
  rowText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
});
