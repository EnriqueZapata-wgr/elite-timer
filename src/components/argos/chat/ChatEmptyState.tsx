/**
 * ChatEmptyState — el arranque en blanco del chat (MB-21 Pieza 4.4).
 * Las sugerencias ya no son seis chips fijos: proponen algo de HOY
 * (argos-suggestions-core decide; la pantalla carga las señales).
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import type { ChatSuggestion } from '@/src/services/argos-suggestions-core';
import { ATP_BRAND, BG, BORDER, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes } from '@/constants/theme';

interface Props {
  suggestions: ChatSuggestion[];
  onPick: (label: string) => void;
}

export function ChatEmptyState({ suggestions, onPick }: Props) {
  return (
    <View style={s.wrap}>
      <ArgosOrb state="idle" size={80} style={{ marginBottom: 16 }} />
      <Text style={s.title}>Hola, soy ARGOS</Text>
      <Text style={s.subtitle}>
        Tu sistema de inteligencia en salud funcional. Conozco tu historial, tus datos y tus objetivos. Pregúntame lo que quieras.
      </Text>

      <View style={s.chips}>
        {suggestions.map((sg) => (
          <Pressable key={sg.label} onPress={() => onPick(sg.label)} style={s.chip}>
            <Ionicons name={sg.icon as any} size={14} color={ATP_BRAND.lime} />
            <Text style={s.chipText}>{sg.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40 },
  title: {
    color: TEXT.primary, fontSize: FontSizes.xl, fontFamily: Fonts.extraBold, marginBottom: 4,
  },
  subtitle: {
    color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.regular,
    textAlign: 'center', marginBottom: 24, paddingHorizontal: 20, lineHeight: 19,
  },
  chips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BG.input, borderRadius: 20,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: BORDER.card,
  },
  chipText: {
    color: withOpacity(ATP_BRAND.white, 0.8), fontSize: FontSizes.sm, fontFamily: Fonts.regular,
    flexShrink: 1,
  },
});
