/**
 * Smart Shopping — Escaneo de etiquetas y suplementos para evaluar calidad.
 */
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Colors } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/src/constants/brand';

export default function SmartShoppingScreen() {
  return (
    <SafeAreaView style={s.screen}>
      <PillarHeader pillar="optimization" title="Compras" />
      <EmptyState
        icon="barcode-outline"
        title="Compras inteligentes"
        subtitle="Escanea etiquetas y suplementos para evaluar su calidad"
        color={CATEGORY_COLORS.optimization}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
});
