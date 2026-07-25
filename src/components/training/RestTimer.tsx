/**
 * RestTimer (MB-3 Track D) — timer de descanso entre series con cuenta
 * hablada. Anuncia el arranque, los últimos 3 segundos y el "¡Vamos!" final;
 * háptico en cada marca. La voz llega vía onCue (useMethodVoice en el host).
 */
import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, TEXT, ELEVATION } from '@/src/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';

interface Props {
  seconds: number;
  /** Qué viene después (se anuncia y se muestra): "Serie 3 de 4". */
  siguiente?: string;
  onDone: () => void;
  /** { hito } = se habla también en modo 'solo hitos' (MB-3.5 #6). */
  onCue?: (text: string, opts?: { hito?: boolean }) => void;
}

export function RestTimer({ seconds, siguiente, onDone, onCue }: Props) {
  const [restante, setRestante] = useState(seconds);
  const anuncioRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onCueRef = useRef(onCue);
  onCueRef.current = onCue;

  useEffect(() => {
    if (!anuncioRef.current) {
      anuncioRef.current = true;
      const min = Math.floor(seconds / 60);
      const seg = seconds % 60;
      const habla = min > 0
        ? `Descanso: ${min} ${min === 1 ? 'minuto' : 'minutos'}${seg > 0 ? ` ${seg}` : ''}.`
        : `Descanso: ${seconds} segundos.`;
      onCueRef.current?.(siguiente ? `${habla} Siguiente: ${siguiente}.` : habla);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (restante <= 0) {
      haptic.heavy();
      onCueRef.current?.('¡Vamos!', { hito: true });
      onDoneRef.current();
      return;
    }
    if (restante <= 3) {
      haptic.medium();
      onCueRef.current?.(String(restante));
    }
    const t = setTimeout(() => setRestante((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [restante]);

  const min = Math.floor(restante / 60);
  const seg = restante % 60;

  return (
    <View style={s.card}>
      <Text style={s.label}>DESCANSO</Text>
      <Text style={s.time}>{min}:{String(seg).padStart(2, '0')}</Text>
      {siguiente ? <Text style={s.next}>Siguiente: {siguiente}</Text> : null}
      <View style={s.actions}>
        <AnimatedPressable
          onPress={() => { haptic.light(); setRestante((r) => r + 30); }}
          style={s.secondaryBtn}
        >
          <Text style={s.secondaryText}>+30 s</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => { haptic.light(); setRestante(0); }}
          style={s.skipBtn}
        >
          <Ionicons name="play-skip-forward" size={16} color="#000" />
          <Text style={s.skipText}>SALTAR</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: ELEVATION[1].bg,
    borderColor: ELEVATION[1].border,
    borderWidth: 1,
    borderRadius: Radius.card,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  label: {
    color: TEXT.secondary,
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  time: {
    color: ATP_BRAND.teal,
    fontFamily: Fonts.extraBold,
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    marginVertical: Spacing.xs,
  },
  next: {
    color: TEXT.secondary,
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  secondaryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: ELEVATION[2].border,
    backgroundColor: ELEVATION[2].bg,
  },
  secondaryText: {
    color: TEXT.primary,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: ATP_BRAND.lime,
  },
  skipText: {
    color: '#000',
    fontFamily: Fonts.bold,
    fontSize: 13,
    letterSpacing: 1,
  },
});
