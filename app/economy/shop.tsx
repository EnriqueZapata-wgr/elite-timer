/**
 * TIENDA H+ (estilo Clash Royale). 3 paquetes con gradient por tier + confirmación.
 * Compra = stub IAP (mockPurchase). Crédito real por webhook server-side (flag COWORK_REPORT).
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Alert, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { PackageCard } from '@/src/components/economy/PackageCard';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { getProtonPackages, mockPurchase, type ProtonPackage } from '@/src/services/economy/shop-service';
import { formatFull } from '@/src/services/economy/format';
import { TEXT } from '@/src/constants/brand';
import { Spacing } from '@/constants/theme';

export default function ShopScreen() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<ProtonPackage[]>([]);

  useFocusEffect(useCallback(() => {
    getProtonPackages().then(setPackages);
  }, []));

  function onBuy(pkg: ProtonPackage) {
    haptic.medium();
    Alert.alert(
      'Confirmar compra',
      `${pkg.name}\n${formatFull(pkg.protons)} H+ por $${formatFull(pkg.price_mxn)} MXN`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comprar (dev)',
          onPress: async () => {
            if (!user?.id) return;
            const r = await mockPurchase(user.id, pkg);
            if (r.success) {
              haptic.success();
              DeviceEventEmitter.emit('balance_changed');
              Alert.alert('¡Listo!', `Se acreditaron ${formatFull(pkg.protons)} H+`);
            } else {
              // Esperado desde cliente: el crédito real es server-side (webhook IAP).
              Alert.alert('Compra (stub)', 'La acreditación real ocurre en el servidor (webhook IAP). Ver flag en reporte.');
            }
          },
        },
      ],
    );
  }

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Tienda H+" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EliteText variant="caption" style={styles.intro}>
          Recarga H+ para chatear con ARGOS, analizar comidas, interpretar labs y más.
        </EliteText>
        {packages.length === 0 ? (
          <EliteText variant="caption" style={styles.intro}>Cargando paquetes…</EliteText>
        ) : packages.map((pkg, i) => (
          <Animated.View key={pkg.sku} entering={FadeInDown.delay(60 + i * 70).springify()}>
            <PackageCard pkg={pkg} popular={pkg.display_order === 2} onBuy={() => onBuy(pkg)} />
          </Animated.View>
        ))}
        <EliteText variant="caption" style={[styles.intro, { marginTop: Spacing.md }]}>
          Pagos vía Apple/Google IAP (próximamente). Esta es una compra de prueba.
        </EliteText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 80 },
  intro: { color: TEXT.secondary, textAlign: 'center' },
});
