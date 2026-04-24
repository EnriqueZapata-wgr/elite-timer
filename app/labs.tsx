import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LabsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
      <Pressable onPress={() => router.back()} style={{ position: 'absolute', top: insets.top + 8, left: 20 }}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
      <Ionicons name="document-text-outline" size={48} color="#60a5fa" />
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 16 }}>Laboratorios</Text>
      <Text style={{ color: '#666', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
        Esta sección está en desarrollo.
      </Text>
    </View>
  );
}
