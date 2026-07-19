/**
 * ArgosVoicePicker (MB-10) — selección de voz de ARGOS (masculina/femenina) con
 * preview, dentro de Meet ARGOS. NO toca el copy #141 de la cinemática.
 *
 * Doctrina guiado-no-prisionero: "Saltar" siempre visible, sin culpa — se puede
 * elegir después. El orb (ArgosAvatar) pasa a 'speaking' mientras suena el preview.
 *
 * Preview = expo-speech (TTS del dispositivo) vía argos-voice-service; stub honesto
 * hasta la voz propia de ARGOS (MB-4 J5). Persiste en profiles.argos_voice (mig 205).
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { haptic } from '@/src/utils/haptics';
import {
  saveArgosVoice, previewArgosVoice, stopArgosVoicePreview, type ArgosVoice,
} from '@/src/services/argos-voice-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT, withOpacity } from '@/src/constants/brand';

interface Props {
  userId?: string;
  onDone: () => void;
  loading?: boolean;
}

const VOICES: { id: ArgosVoice; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'femenina',  label: 'Femenina',  icon: 'woman-outline' },
  { id: 'masculina', label: 'Masculina', icon: 'man-outline' },
];

export function ArgosVoicePicker({ userId, onDone, loading }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<ArgosVoice | null>(null);
  const [previewing, setPreviewing] = useState<ArgosVoice | null>(null);

  const choose = async (voice: ArgosVoice) => {
    haptic.light();
    setSelected(voice);
    setPreviewing(voice);
    await previewArgosVoice(voice);
    // El orb vuelve a idle tras la ventana aproximada del preview.
    setTimeout(() => setPreviewing((p) => (p === voice ? null : p)), 3200);
  };

  const confirm = async () => {
    if (!selected) return;
    haptic.success();
    await stopArgosVoicePreview();
    if (userId) { try { await saveArgosVoice(userId, selected); } catch { /* fail-open */ } }
    onDone();
  };

  const skip = async () => {
    haptic.light();
    await stopArgosVoicePreview();
    onDone(); // guiado, no prisionero: se puede elegir después
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={s.top}>
        <Animated.View entering={FadeIn.duration(500)}>
          {/* MB-4 J2: orb glass — 'hablando' mientras suena la muestra de voz. */}
          <ArgosOrb state={previewing ? 'hablando' : 'idle'} size={130} />
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(500).delay(120)}>
          <EliteText style={s.title}>¿Cómo quieres que suene ARGOS?</EliteText>
          <EliteText style={s.subtitle}>Escucha una muestra y elige. Puedes cambiarla cuando quieras.</EliteText>
        </Animated.View>

        <View style={s.options}>
          {VOICES.map((v, i) => {
            const active = selected === v.id;
            return (
              <Animated.View key={v.id} entering={FadeInUp.duration(450).delay(200 + i * 80)} style={{ flex: 1 }}>
                <AnimatedPressable onPress={() => choose(v.id)}>
                  <View style={[s.card, active && s.cardActive]}>
                    <Ionicons
                      name={v.icon}
                      size={30}
                      color={active ? ATP_BRAND.lime : TEXT.secondary}
                    />
                    <EliteText style={[s.cardLabel, active && { color: '#fff' }]}>{v.label}</EliteText>
                    <View style={s.playRow}>
                      <Ionicons
                        name={previewing === v.id ? 'volume-high' : 'play-circle-outline'}
                        size={16}
                        color={active ? ATP_BRAND.lime : TEXT.tertiary}
                      />
                      <EliteText style={[s.playText, active && { color: ATP_BRAND.lime }]}>
                        {previewing === v.id ? 'Sonando…' : 'Muestra'}
                      </EliteText>
                    </View>
                  </View>
                </AnimatedPressable>
              </Animated.View>
            );
          })}
        </View>
      </View>

      <View style={s.bottom}>
        <GradientCTA
          label={loading ? 'Un momento…' : 'CONTINUAR'}
          onPress={confirm}
          disabled={!selected || !!loading}
        />
        <AnimatedPressable onPress={skip} disabled={!!loading} style={s.skip}>
          <EliteText style={s.skipText}>Saltar · elegir después</EliteText>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: Spacing.lg, justifyContent: 'space-between' },
  top: { alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.xl },
  title: {
    fontSize: 24, fontFamily: Fonts.bold, color: '#fff', textAlign: 'center',
    marginTop: Spacing.lg, lineHeight: 32,
  },
  subtitle: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary,
    textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20,
  },
  options: { flexDirection: 'row', gap: Spacing.md, width: '100%', marginTop: Spacing.md },
  card: {
    alignItems: 'center', gap: 8, paddingVertical: Spacing.lg,
    borderRadius: Radius.lg, borderWidth: 1,
    backgroundColor: '#121212', borderColor: '#1F1F1F',
  },
  cardActive: {
    borderColor: ATP_BRAND.lime,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.08),
  },
  cardLabel: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT.secondary },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  playText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: TEXT.tertiary },
  bottom: { gap: Spacing.xs },
  skip: { alignItems: 'center', paddingVertical: Spacing.md },
  skipText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: TEXT.secondary, letterSpacing: 0.5 },
});
