/**
 * ChatInput — el área de entrada del chat ARGOS (MB-21 Pieza 4).
 * El dictado DEPOSITA el texto (el padre lo pone en el input); enviar sigue
 * siendo decisión del usuario. Bug #8: offline pinta el botón en warning,
 * sigue tocable (cada tap re-verifica la red).
 */
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceButton } from '@/src/components/VoiceButton';
import { ATP_BRAND, BG, BORDER, SEMANTIC, SURFACES, TEXT, TEXT_COLORS } from '@/src/constants/brand';
import { Fonts, FontSizes } from '@/constants/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  loading: boolean;
  offline: boolean;
  bottomInset: number;
  onVoiceTranscript: (text: string) => void;
}

export function ChatInput({ value, onChangeText, onSend, loading, offline, bottomInset, onVoiceTranscript }: Props) {
  const canSend = value.trim().length > 0 && !loading;
  return (
    <View style={[s.bar, { paddingBottom: bottomInset + 12 }]}>
      <VoiceButton onTranscript={onVoiceTranscript} variant="inline" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Pregunta a ARGOS..."
        placeholderTextColor={TEXT.muted}
        multiline
        maxLength={1000}
        style={s.input}
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={[s.send, { backgroundColor: canSend ? (offline ? SEMANTIC.warning : ATP_BRAND.lime) : SURFACES.cardLight }]}
      >
        <Ionicons
          name={offline ? 'cloud-offline-outline' : 'arrow-up'}
          size={22}
          color={canSend ? TEXT_COLORS.onAccent : TEXT.muted}
        />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 0.5, borderTopColor: BORDER.subtle,
    backgroundColor: BG.screen,
  },
  input: {
    flex: 1, backgroundColor: BG.input, color: TEXT.primary,
    fontSize: FontSizes.lg - 1, fontFamily: Fonts.regular,
    borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12,
    maxHeight: 100, borderWidth: 1, borderColor: BORDER.card,
  },
  send: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
});
