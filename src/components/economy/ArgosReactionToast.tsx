/**
 * ArgosReactionToast — toast global de reacción ARGOS al ganar electrones (hotfix-ux FIX 4).
 *
 * Escucha 'electron_awarded' (emitido por electron-service tras un award EXITOSO) y muestra
 * ~2.5s una reacción del pool `encouragement` (copy aprobado por Mariana, VoiceRotator para
 * no repetir) + la línea de atribución "+2.5 ⚡ Cardio". Awards en ráfaga (<2s) se colapsan
 * en un solo toast ("+4.5 ⚡ Cardio · Sin procesados") — semántica en reaction-toast-core.ts.
 *
 * No-intrusivo: pointerEvents="none", posición fija sobre la tab bar, tokens del design system
 * (ELEVATION[2] = card sobre card; lima solo en el dato de electrones = feedback semántico).
 * Montar UNA vez cerca del root de la pantalla HOY.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, DeviceEventEmitter } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { ARGOS_VOICE, VoiceRotator } from '@/src/services/argos-personality';
import { ELECTRON_AWARDED_EVENT } from '@/src/services/electron-service';
import { ELECTRON_WEIGHTS } from '@/src/constants/electrons';
import {
  reduceAward, formatAttribution, TOAST_DURATION_MS, type ToastBatch,
} from './reaction-toast-core';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
import { ELEVATION, TEXT, ATP_BRAND } from '@/src/constants/brand';

interface ToastState {
  batch: ToastBatch;
  reaction: string;
}

export function ArgosReactionToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  // Batch vivo (null cuando el toast ya se auto-descartó) — ref para leerlo dentro del listener.
  const batchRef = useRef<ToastBatch | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // keepLast=1: el pool aprobado tiene 2 frases → alterna sin repetir la inmediata anterior.
  const rotatorRef = useRef(new VoiceRotator(1));

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      ELECTRON_AWARDED_EVENT,
      (payload: { source?: string; electrons?: number } | undefined) => {
        if (!payload?.source || typeof payload.electrons !== 'number') return;
        const { batch, merged } = reduceAward(batchRef.current, {
          source: payload.source,
          electrons: payload.electrons,
          at: Date.now(),
        });
        batchRef.current = batch;
        setToast(prev => ({
          batch,
          // Colapso: conserva la reacción del toast visible (solo cambia la atribución).
          // Batch nuevo: reacción fresca del pool sin repetir la última (VoiceRotator).
          reaction: merged && prev
            ? prev.reaction
            : rotatorRef.current.pick('encouragement', ARGOS_VOICE.encouragement),
        }));
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          batchRef.current = null;
          setToast(null);
        }, TOAST_DURATION_MS);
      },
    );
    return () => {
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16)}
      exiting={FadeOut.duration(180)}
      pointerEvents="none"
      style={st.wrap}
    >
      <View style={st.card}>
        <Text style={st.reaction} numberOfLines={2}>{toast.reaction}</Text>
        <Text style={st.attribution} numberOfLines={1}>
          {formatAttribution(toast.batch, ELECTRON_WEIGHTS)}
        </Text>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  // Sobre la tab bar (mismo carril que el FAB de ARGOS, bottom 90) y bajo cualquier modal.
  wrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: 96,
    zIndex: 200,
    alignItems: 'center',
  },
  card: {
    maxWidth: 420,
    backgroundColor: ELEVATION[2].bg,
    borderWidth: 1,
    borderColor: ELEVATION[2].border,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  reaction: {
    color: TEXT.primary,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    textAlign: 'center',
  },
  attribution: {
    color: ATP_BRAND.lime,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
