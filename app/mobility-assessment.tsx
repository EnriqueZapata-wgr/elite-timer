/**
 * Evaluación de Movilidad — Placeholder hasta implementación completa.
 */
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function MobilityAssessmentScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Evaluación de Movilidad</Text>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <LinearGradient
          colors={['rgba(192,132,252,0.1)', 'rgba(192,132,252,0.02)', 'transparent']}
          style={{ width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}
        >
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(192,132,252,0.08)', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="body-outline" size={44} color="#c084fc" />
          </View>
        </LinearGradient>

        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' }}>Próximamente</Text>
        <Text style={{ color: '#999', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12 }}>
          Evaluación completa de movilidad con tests estandarizados. Mide tu rango de movimiento y detecta limitaciones.
        </Text>

        <View style={{ backgroundColor: 'rgba(192,132,252,0.08)', borderRadius: 16, padding: 20, marginTop: 28, width: '100%' }}>
          <Text style={{ color: '#c084fc', fontSize: 13, fontWeight: '700', marginBottom: 8 }}>LO QUE VIENE</Text>
          {['Knee-to-wall test (tobillo)', 'Overhead squat assessment', 'Thomas test (flexores de cadera)', 'Shoulder mobility screen', 'Score global de movilidad'].map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#c084fc' }} />
              <Text style={{ color: '#ccc', fontSize: 13 }}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
