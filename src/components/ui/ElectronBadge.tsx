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
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { ATP_BRAND } from '@/src/constants/brand';

export function ElectronBadge() {
  const { total } = useElectronTotal();
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  // MB-31B: el lima como LETRA solo vive en oscuro (regla 3 de la doctrina);
  // en claro cae al teal calibrado. El fondo "sin electrones" era un blanco
  // translúcido fijo (invisible en claro) -> pasa a t.card.
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
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
      backgroundColor: hasElectrons ? 'rgba(168,224,42,0.15)' : (dark ? 'rgba(255,255,255,0.05)' : t.card),
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 14,
      gap: 4,
    }}>
      <Ionicons name="flash" size={14} color={hasElectrons ? acento : t.textoSecundario} />
      <Text style={{
        color: hasElectrons ? acento : t.textoSecundario,
        fontSize: 13,
        fontWeight: '800',
      }}>
        {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(1)}
      </Text>
    </Animated.View>
  );
}
