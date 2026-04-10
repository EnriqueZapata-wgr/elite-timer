/**
 * ElectronBadge — Badge de electrones acumulados estilo monedas de videojuego.
 * Siempre visible en el header de las 3 tabs.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useElectronTotal } from '@/src/hooks/useElectronTotal';

export function ElectronBadge() {
  const { total } = useElectronTotal();
  if (total <= 0) return null;

  return (
    <View style={s.badge}>
      <Ionicons name="flash" size={14} color="#a8e02a" />
      <Text style={s.text}>
        {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168,224,42,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  text: {
    color: '#a8e02a',
    fontSize: 13,
    fontWeight: '800',
  },
});
