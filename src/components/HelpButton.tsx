/**
 * HelpButton — Micro tutorial on-demand para pantallas complejas.
 * Muestra un botón "?" que abre un modal con tips numerados.
 */
import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '@/src/utils/haptics';

interface HelpButtonProps {
  title: string;
  tips: string[];
  color?: string;
}

export function HelpButton({ title, tips, color = '#a8e02a' }: HelpButtonProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => { setVisible(true); haptic.light(); }}
        hitSlop={12}
        style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: 'rgba(255,255,255,0.05)',
          justifyContent: 'center', alignItems: 'center',
        }}
      >
        <Ionicons name="help-circle-outline" size={18} color="#666" />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, paddingBottom: 40, maxHeight: '60%',
            }}
            onPress={() => {}}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color, fontSize: 16, fontWeight: '800', marginBottom: 16 }}>
              {title}
            </Text>
            <ScrollView>
              {tips.map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: `${color}15`, justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ color: '#ccc', fontSize: 14, lineHeight: 21, flex: 1 }}>
                    {tip}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
