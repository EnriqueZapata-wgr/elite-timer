/**
 * ChatHeader — encabezado del chat ARGOS (MB-21 Pieza 4).
 * La orbe es ARGOS en todas partes (MB-20 4.4); cuando no está disponible se
 * apaga y se dice con palabras — nada rojo.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import type { ArgosOrbState } from '@/src/components/argos/argos-orb-core';
import { ATP_BRAND, BORDER, LETTER_SPACING, TEXT } from '@/src/constants/brand';
import { Fonts, FontSizes } from '@/constants/theme';

interface Props {
  topInset: number;
  canGoBack: boolean;
  onBack: () => void;
  orbState: ArgosOrbState;
  /** Rate limit sin boost: orbe apagada (estática y atenuada). */
  orbDimmed: boolean;
  onVoiceMode: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onHistory: () => void;
  onNewConversation: () => void;
}

export function ChatHeader({
  topInset, canGoBack, onBack, orbState, orbDimmed,
  onVoiceMode, autoSpeak, onToggleAutoSpeak, onHistory, onNewConversation,
}: Props) {
  return (
    <View style={[s.header, { paddingTop: topInset + 8 }]}>
      <View style={s.left}>
        {canGoBack && (
          <Pressable onPress={onBack} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
          </Pressable>
        )}
        <View style={{ opacity: orbDimmed ? 0.35 : 1 }}>
          <ArgosOrb
            state={orbState}
            size={36}
            reducedMotion={orbDimmed ? true : undefined}
          />
        </View>
        <View>
          <Text style={s.title}>ARGOS</Text>
          <Text style={s.subtitle}>SALUD FUNCIONAL</Text>
        </View>
      </View>

      <View style={s.actions}>
        {/* MB-4 J5: modo voz full-screen (CB-6: consentimiento la primera vez). */}
        <Pressable onPress={onVoiceMode} hitSlop={12}>
          <Ionicons name="mic-circle-outline" size={24} color={ATP_BRAND.lime} />
        </Pressable>
        <Pressable onPress={onToggleAutoSpeak} hitSlop={12}>
          <Ionicons
            name={autoSpeak ? 'volume-high-outline' : 'volume-mute-outline'}
            size={22}
            color={autoSpeak ? ATP_BRAND.lime : TEXT.tertiary}
          />
        </Pressable>
        {/* F2.2: historial → pantalla dedicada */}
        <Pressable onPress={onHistory} hitSlop={12}>
          <Ionicons name="time-outline" size={22} color={TEXT.secondary} />
        </Pressable>
        <Pressable onPress={onNewConversation} hitSlop={12}>
          <Ionicons name="add-circle-outline" size={22} color={ATP_BRAND.lime} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: BORDER.subtle,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: TEXT.primary, fontSize: FontSizes.lg, fontFamily: Fonts.extraBold },
  subtitle: {
    color: ATP_BRAND.lime, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold,
    letterSpacing: LETTER_SPACING.normal,
  },
  actions: { flexDirection: 'row', gap: 12 },
});
