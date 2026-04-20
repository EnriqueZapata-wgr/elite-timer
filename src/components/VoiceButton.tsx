/**
 * VoiceButton — Botón de micrófono para speech-to-text.
 * Usa expo-speech-recognition con graceful degradation cuando
 * el módulo nativo no está disponible (OTA sin native build).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Importación segura — el módulo nativo puede no estar disponible
let SpeechModule: any = null;
let sttAvailable = false;

try {
  const mod = require('expo-speech-recognition');
  SpeechModule = mod.ExpoSpeechRecognitionModule;
  sttAvailable = !!SpeechModule;
} catch {
  // Módulo nativo no disponible (OTA sin native build)
}

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  variant?: 'fab' | 'inline';
}

export function VoiceButton({ onTranscript, variant = 'fab' }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  // Animación de pulso
  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  // Registrar listeners de STT via useEffect (no hooks condicionales)
  useEffect(() => {
    if (!sttAvailable || !SpeechModule) return;

    const resultSub = SpeechModule.addListener('result', (event: any) => {
      const transcript = event?.results?.[0]?.transcript || '';
      if (event?.isFinal) {
        setIsListening(false);
        setPartialText('');
        if (transcript.trim()) {
          onTranscriptRef.current(transcript.trim());
        }
      } else {
        setPartialText(transcript);
      }
    });

    const errorSub = SpeechModule.addListener('error', () => {
      setIsListening(false);
      setPartialText('');
    });

    const endSub = SpeechModule.addListener('end', () => {
      setIsListening(false);
    });

    return () => {
      resultSub?.remove?.();
      errorSub?.remove?.();
      endSub?.remove?.();
    };
  }, []);

  async function startListening() {
    if (!sttAvailable || !SpeechModule) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Voz no disponible',
        'El reconocimiento de voz requiere un native build. Usa el texto por ahora.',
      );
      return;
    }

    try {
      const { status } = await SpeechModule.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'ATP necesita acceso al micrófono para usar voz.');
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsListening(true);
      setPartialText('');

      SpeechModule.start({
        lang: 'es-MX',
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch (e) {
      console.error('Start listening error:', e);
      setIsListening(false);
    }
  }

  function stopListening() {
    if (!sttAvailable || !SpeechModule || !isListening) return;
    try {
      SpeechModule.stop();
    } catch (e) {
      console.error('Stop listening error:', e);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // Tamaños
  const isFab = variant === 'fab';
  const btnSize = isFab ? 48 : 40;
  const iconSize = isFab ? 22 : 18;
  const btnRadius = btnSize / 2;

  return (
    <View>
      {/* Texto parcial flotante */}
      {isListening && partialText && isFab && (
        <View style={{
          position: 'absolute', bottom: btnSize + 10, right: 0, left: -200,
          backgroundColor: '#0a0a0a', borderRadius: 12, padding: 10,
          borderWidth: 1, borderColor: 'rgba(168,224,42,0.2)',
        }}>
          <Text style={{ color: '#a8e02a', fontSize: 12 }} numberOfLines={2}>
            {partialText}...
          </Text>
        </View>
      )}

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Pressable
          onPress={isListening ? stopListening : startListening}
          style={{
            width: btnSize, height: btnSize, borderRadius: btnRadius,
            backgroundColor: isListening ? '#ef4444' : (isFab ? '#a8e02a' : '#1a1a1a'),
            justifyContent: 'center', alignItems: 'center',
            ...(isListening && {
              shadowColor: '#ef4444',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
              elevation: 6,
            }),
          }}
        >
          <Ionicons
            name={isListening ? 'radio-outline' : 'mic-outline'}
            size={iconSize}
            color={isListening ? '#fff' : (isFab ? '#000' : '#666')}
          />
        </Pressable>
      </Animated.View>

      {isListening && isFab && (
        <Text style={{ color: '#ef4444', fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
          ESCUCHANDO...
        </Text>
      )}
    </View>
  );
}
