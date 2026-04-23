/**
 * Métodos de entrenamiento ATP — 3 métodos propietarios con explicación y CTA.
 */
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const METHODS = [
  {
    id: 'method_3_5',
    name: 'Método 3-5',
    subtitle: 'Autoregulación por reps',
    color: '#a8e02a',
    icon: 'trending-up-outline' as const,
    description: 'Elige tu nivel (principiante=6 reps, intermedio=4, avanzado=2). Si logras más reps que tu objetivo, sube peso. Si logras menos, baja peso. El peso se ajusta automáticamente.',
    howItWorks: [
      'Selecciona un ejercicio y tu nivel',
      'Haz tu set con el peso actual',
      'ATP compara tus reps vs el objetivo',
      'Te dice si subir, mantener o bajar peso',
    ],
    idealFor: 'Fuerza máxima y progresión lineal',
  },
  {
    id: 'emom_auto',
    name: 'EMOM Autoajustable',
    subtitle: 'Every Minute On the Minute',
    color: '#60a5fa',
    icon: 'timer-outline' as const,
    description: '8×8 (principiante) o 10×10 (intermedio). Si no completas las reps en el minuto, la deuda se acumula y se paga en series adicionales al final.',
    howItWorks: [
      'Selecciona 8×8 o 10×10',
      'Cada minuto haces tus reps',
      'Si no completas, la deuda se registra',
      'Al final, pagas la deuda con series extra',
    ],
    idealFor: 'Hipertrofia + resistencia muscular',
  },
  {
    id: 'myo_reps',
    name: 'Myo Reps',
    subtitle: 'Máxima activación muscular',
    color: '#c084fc',
    icon: 'flash-outline' as const,
    description: 'Set de activación de 20 reps + overloads de 5 reps con solo 5 segundos de descanso. Los fallos determinan cuándo ajustar el peso.',
    howItWorks: [
      'Haz 20 reps como set de activación',
      'Descansa solo 5 segundos',
      'Haz 5 reps (overload)',
      'Repite hasta que no completes las 5 reps',
      'ATP registra cuántos overloads lograste',
    ],
    idealFor: 'Hipertrofia eficiente en poco tiempo',
  },
];

export default function TrainingMethods() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View>
            <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ATP</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Métodos de entrenamiento</Text>
          </View>
        </View>
        <Text style={{ color: '#999', fontSize: 13, marginTop: 12, lineHeight: 20 }}>
          3 métodos propietarios de ATP diseñados por Enrique Zapata. Cada uno ataca un objetivo diferente con autoregulación inteligente.
        </Text>
      </View>

      {METHODS.map(method => (
        <View key={method.id} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{
            backgroundColor: '#0a0a0a', borderRadius: 20, padding: 20,
            borderWidth: 1, borderColor: `${method.color}20`,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: `${method.color}15`,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Ionicons name={method.icon} size={24} color={method.color} />
              </View>
              <View>
                <Text style={{ color: method.color, fontSize: 18, fontWeight: '800' }}>{method.name}</Text>
                <Text style={{ color: '#999', fontSize: 11 }}>{method.subtitle}</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 21, marginBottom: 16 }}>
              {method.description}
            </Text>

            {/* How it works */}
            <Text style={{ color: '#666', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
              CÓMO FUNCIONA
            </Text>
            {method.howItWorks.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: `${method.color}15`,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ color: method.color, fontSize: 10, fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <Text style={{ color: '#999', fontSize: 13, flex: 1 }}>{step}</Text>
              </View>
            ))}

            {/* Ideal for */}
            <View style={{
              backgroundColor: `${method.color}08`, borderRadius: 10, padding: 10, marginTop: 12,
            }}>
              <Text style={{ color: method.color, fontSize: 11, fontWeight: '600' }}>
                Ideal para: {method.idealFor}
              </Text>
            </View>

            {/* CTA */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/log-exercise' as any);
              }}
              style={{
                backgroundColor: method.color, borderRadius: 14, padding: 14,
                alignItems: 'center', marginTop: 16,
              }}
            >
              <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>USAR ESTE MÉTODO</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
