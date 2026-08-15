/**
 * HelpButton — Micro tutorial on-demand para pantallas complejas.
 * Muestra un botón "?" que abre un modal con tips numerados.
 */
import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface HelpButtonProps {
  title: string;
  tips: string[];
  color?: string;
}

export function HelpButton({ title, tips, color = ATP_BRAND.lime }: HelpButtonProps) {
  const [visible, setVisible] = useState(false);
  // MB-31B: el oscuro queda igual. En claro el título deja de pintarse con el
  // color de categoría (el lima da 1.34 sobre papel) y pasa a texto normal; el
  // acento sigue vivo en los números, que van sobre su propio tinte.
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';

  return (
    <>
      <Pressable
        onPress={() => { setVisible(true); haptic.light(); }}
        hitSlop={12}
        style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,21,24,0.06)',
          justifyContent: 'center', alignItems: 'center',
        }}
      >
        <Ionicons name="help-circle-outline" size={18} color={t.textoSecundario} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: dark ? 'rgba(0,0,0,0.85)' : 'rgba(15,21,24,0.35)', justifyContent: 'flex-end' }}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: dark ? t.hundido : t.flotante,
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 24, paddingBottom: 40, maxHeight: '60%',
            }}
            onPress={() => {}}
          >
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: dark ? t.bordeMarcado : withOpacity(t.texto, 0.22), alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: dark ? color : t.texto, fontSize: 16, fontWeight: '800', marginBottom: 16 }}>
              {title}
            </Text>
            <ScrollView>
              {tips.map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: `${color}${dark ? '15' : '2E'}`, justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ color: dark ? color : t.texto, fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ color: t.texto, fontSize: 14, lineHeight: 21, flex: 1 }}>
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
