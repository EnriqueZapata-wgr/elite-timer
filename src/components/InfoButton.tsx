/**
 * InfoButton — Botón "?" que despliega explicación modal.
 * Reutilizable en cualquier pantalla.
 */
import { useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Fonts, FontSizes } from '@/constants/theme';

interface Props {
  title: string;
  explanation: string;
  color?: string;
  size?: number;
}

export function InfoButton({ title, explanation, color = '#999', size = 16 }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => { setVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        hitSlop={12}
      >
        <View style={{
          width: size + 4, height: size + 4, borderRadius: (size + 4) / 2,
          backgroundColor: `${color}15`,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name="help-circle" size={size} color={color} />
        </View>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 30 }}
          onPress={() => setVisible(false)}
        >
          <Pressable style={{ backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24 }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontFamily: Fonts.extraBold }}>{title}</Text>
              <Pressable onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color="#666" />
              </Pressable>
            </View>
            <Text style={{ color: '#ccc', fontSize: 14, lineHeight: 22, fontFamily: Fonts.regular }}>{explanation}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
