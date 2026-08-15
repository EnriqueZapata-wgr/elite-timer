/**
 * InfoButton — Botón "?" que despliega explicación modal.
 * Reutilizable en cualquier pantalla.
 */
import { useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Fonts, FontSizes } from '@/constants/theme';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  title: string;
  explanation: string;
  color?: string;
  size?: number;
}

export function InfoButton({ title, explanation, color, size = 16 }: Props) {
  const [visible, setVisible] = useState(false);
  // MB-31B: el gris por defecto (#999) desaparecía sobre papel. Sin color
  // explícito, el botón toma el secundario del tema en vez de un gris fijo.
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const tinte = color ?? t.textoSecundario;

  return (
    <>
      <Pressable
        onPress={() => { setVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        hitSlop={12}
      >
        <View style={{
          width: size + 4, height: size + 4, borderRadius: (size + 4) / 2,
          backgroundColor: `${tinte}${dark ? '15' : '2E'}`,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name="help-circle" size={size} color={tinte} />
        </View>
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: dark ? 'rgba(0,0,0,0.7)' : 'rgba(15,21,24,0.35)', justifyContent: 'center', padding: 30 }}
          onPress={() => setVisible(false)}
        >
          <Pressable style={{ backgroundColor: t.flotante, borderRadius: 20, padding: 24 }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: t.texto, fontSize: 18, fontFamily: Fonts.extraBold }}>{title}</Text>
              <Pressable onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color={t.textoSecundario} />
              </Pressable>
            </View>
            <Text style={{ color: t.texto, fontSize: 14, lineHeight: 22, fontFamily: Fonts.regular }}>{explanation}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
