/**
 * ArgosVoiceMode (MB-4 J5) — modo voz full-screen: hablas con ARGOS y te responde
 * con voz. Ensambla recorder (STT Gemini) + orquestador de voz + orb.
 *
 * Flujo: tap al orb → graba (orb 'escuchando') → tap de nuevo → transcribe +
 * responde con voz (orb 'pensando'→'hablando'). Tap mientras habla → barge-in
 * (corta y vuelve a idle). "Cerrar" sale del modo voz.
 *
 * Todo fail-soft: sin micrófono/keys/voz → mensaje honesto, nunca crashea.
 * Verificación real (primer audio <2s, interrupción, 5 turnos) = device (gate Enrique).
 */
import { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { haptic } from '@/src/utils/haptics';
import { startRecording, stopRecording, cancelRecording } from '@/src/services/voice/argos-recorder';
import { runVoiceTurn, type VoiceTurnState, type VoiceTurnHandle } from '@/src/services/voice/voice-conversation';
import { TEXT, ATP_BRAND } from '@/src/constants/brand';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  voice?: string | null;
  /** Historial de la conversación (para contexto del turno). */
  history: { role: 'user' | 'assistant'; content: string }[];
  /** Al cerrar un turno, para inyectar los mensajes al hilo del chat. */
  onTurnComplete?: (userText: string, argosText: string) => void;
}

export function ArgosVoiceMode({ visible, onClose, userId, voice, history, onTurnComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [orbState, setOrbState] = useState<VoiceTurnState>('idle');
  const [transcript, setTranscript] = useState('');
  const [hint, setHint] = useState('Toca para hablar');
  const turnRef = useRef<VoiceTurnHandle | null>(null);
  const recordingRef = useRef(false);

  const reset = useCallback(() => {
    setOrbState('idle');
    setTranscript('');
    setHint('Toca para hablar');
  }, []);

  const onOrbTap = useCallback(async () => {
    // Barge-in: si ARGOS está hablando/pensando, cortar.
    if (turnRef.current) {
      haptic.medium();
      turnRef.current.abort();
      turnRef.current = null;
      reset();
      return;
    }

    if (!recordingRef.current) {
      // Empezar a grabar.
      haptic.light();
      const ok = await startRecording();
      if (!ok) { setHint('No pude usar el micrófono. Revisa permisos.'); return; }
      recordingRef.current = true;
      setOrbState('escuchando');
      setHint('Escuchando… toca para enviar');
      return;
    }

    // Terminar de grabar → correr el turno.
    haptic.medium();
    recordingRef.current = false;
    setOrbState('pensando');
    setHint('Pensando…');
    const audio = await stopRecording();
    if (!audio) { setHint('No capté el audio. Intenta de nuevo.'); setOrbState('idle'); return; }

    const handle = runVoiceTurn({
      userId: userId ?? '',
      history,
      userAudioBase64: audio.base64,
      audioMime: audio.mime,
      voice,
      callbacks: {
        onState: setOrbState,
        onText: setTranscript,
        onFallbackToText: () => setHint('Sin voz ahora — te respondo por texto.'),
      },
    });
    turnRef.current = handle;
    const argosText = await handle.done;
    turnRef.current = null;
    if (argosText && transcript) onTurnComplete?.(transcript, argosText);
    setHint('Toca para hablar');
  }, [history, userId, voice, transcript, onTurnComplete, reset]);

  const close = useCallback(() => {
    if (turnRef.current) { turnRef.current.abort(); turnRef.current = null; }
    if (recordingRef.current) { cancelRecording().catch(() => {}); recordingRef.current = false; }
    reset();
    onClose();
  }, [onClose, reset]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={close}>
      <View style={[s.container, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable onPress={close} hitSlop={12} style={s.close}>
          <Ionicons name="close" size={26} color={TEXT.secondary} />
        </Pressable>

        <View style={s.center}>
          <AnimatedPressable onPress={onOrbTap}>
            <ArgosOrb state={orbState} size={220} />
          </AnimatedPressable>
          <Animated.View entering={FadeIn.duration(400)}>
            <EliteText style={s.hint}>{hint}</EliteText>
          </Animated.View>
          {!!transcript && (
            <Animated.View entering={FadeIn.duration(300)} style={s.transcriptWrap}>
              <EliteText style={s.transcript}>{transcript}</EliteText>
            </Animated.View>
          )}
        </View>

        <EliteText style={s.footer}>
          {orbState === 'hablando' ? 'Toca el orb para interrumpir' : 'Modo voz · ARGOS'}
        </EliteText>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingHorizontal: Spacing.lg, justifyContent: 'space-between' },
  close: { position: 'absolute', top: 54, right: Spacing.lg, zIndex: 2, padding: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  hint: { color: TEXT.secondary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold, textAlign: 'center' },
  transcriptWrap: { maxWidth: '90%', paddingHorizontal: Spacing.md },
  transcript: { color: '#fff', fontSize: FontSizes.lg, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 28 },
  footer: { color: ATP_BRAND.lime, fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 2, textAlign: 'center' },
});
