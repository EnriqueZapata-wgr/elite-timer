/**
 * ElectronBadge — Badge de electrones acumulados estilo monedas de videojuego.
 *
 * SIEMPRE visible (incluso en 0). Bounce animation cuando sube.
 * Escucha 'electrons_changed' via DeviceEventEmitter para refrescarse.
 */
import { useEffect, useRef } from 'react';
import { Text, Animated, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useElectronTotal } from '@/src/hooks/useElectronTotal';

export function ElectronBadge() {
  const { total } = useElectronTotal();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevTotal = useRef(total);

  useEffect(() => {
    if (total > prevTotal.current) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ]).start();
    }
    prevTotal.current = total;
  }, [total, scaleAnim]);

  const hasElectrons = total > 0;

  return (
    <Animated.View style={{
      transform: [{ scale: scaleAnim }],
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: hasElectrons ? 'rgba(168,224,42,0.15)' : 'rgba(255,255,255,0.05)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 14,
      gap: 4,
    }}>
      <Ionicons name="flash" size={14} color={hasElectrons ? '#a8e02a' : '#666'} />
      <Text style={{
        color: hasElectrons ? '#a8e02a' : '#666',
        fontSize: 13,
        fontWeight: '800',
      }}>
        {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(1)}
      </Text>
    </Animated.View>
  );
}
