/**
 * AppTour — Overlay de onboarding con 7 pasos para nuevos usuarios.
 * Se muestra una sola vez; el estado se guarda en AsyncStorage.
 */
import { useState } from 'react';
import { View, Text, Pressable, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const TOUR_STEPS = [
  {
    title: 'Bienvenido a ATP',
    description: 'Tu sistema operativo de rendimiento. Aqui tienes todo para optimizar tu salud.',
    icon: 'flash-outline' as const,
    color: '#a8e02a',
  },
  {
    title: 'Electrones',
    description: 'Cada accion saludable carga electrones. Completa tu tablero diario y sube de rango.',
    icon: 'battery-charging-outline' as const,
    color: '#a8e02a',
  },
  {
    title: 'Agenda del dia',
    description: 'Tu protocolo activo genera acciones programadas. Marcalas como hechas conforme avanzas.',
    icon: 'calendar-outline' as const,
    color: '#60a5fa',
  },
  {
    title: 'ARGOS',
    description: 'Tu IA de salud funcional. Preguntale lo que quieras — conoce tus datos y te da consejos integrativos.',
    icon: 'eye-outline' as const,
    color: '#a8e02a',
  },
  {
    title: '6 Pilares',
    description: 'Fitness, Nutricion, Mente, Salud, Ciclo y Tests. Cada uno es un mundo completo. Exploralos en Kit.',
    icon: 'grid-outline' as const,
    color: '#c084fc',
  },
  {
    title: 'Reportes',
    description: 'Todo lo que registras se puede consultar despues. Tus tendencias, tu progreso, tus records.',
    icon: 'bar-chart-outline' as const,
    color: '#38bdf8',
  },
  {
    title: 'Listo para empezar!',
    description: 'Activa un protocolo desde Kit y empieza a cargar electrones. Tu salud es un juego que vale la pena jugar.',
    icon: 'rocket-outline' as const,
    color: '#a8e02a',
  },
];

interface Props {
  onComplete: () => void;
}

export function AppTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      await AsyncStorage.setItem('@atp/tour_completed', 'true');
      onComplete();
    } else {
      setStep(step + 1);
    }
  }

  function handleSkip() {
    AsyncStorage.setItem('@atp/tour_completed', 'true');
    onComplete();
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center', alignItems: 'center', padding: 40,
      }}>
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 40 }}>
          {TOUR_STEPS.map((_, i) => (
            <View key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              backgroundColor: i === step ? '#a8e02a' : i < step ? '#a8e02a' : '#333',
            }} />
          ))}
        </View>

        {/* Icon */}
        <View style={{
          width: 100, height: 100, borderRadius: 50,
          backgroundColor: `${current.color}15`,
          justifyContent: 'center', alignItems: 'center', marginBottom: 24,
        }}>
          <Ionicons name={current.icon} size={48} color={current.color} />
        </View>

        {/* Content */}
        <Text style={{
          color: '#fff', fontSize: 24, fontWeight: '800',
          textAlign: 'center', marginBottom: 12,
        }}>
          {current.title}
        </Text>
        <Text style={{
          color: '#999', fontSize: 15, lineHeight: 24,
          textAlign: 'center', marginBottom: 40,
        }}>
          {current.description}
        </Text>

        {/* Buttons */}
        <Pressable onPress={handleNext} style={{
          backgroundColor: '#a8e02a', borderRadius: 16,
          paddingVertical: 16, paddingHorizontal: 48,
          width: '100%', alignItems: 'center',
        }}>
          <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>
            {isLast ? 'COMENZAR' : 'SIGUIENTE'}
          </Text>
        </Pressable>

        {!isLast && (
          <Pressable onPress={handleSkip} style={{ marginTop: 16 }}>
            <Text style={{ color: '#666', fontSize: 13 }}>Saltar tour</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}
