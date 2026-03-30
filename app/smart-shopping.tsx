/**
 * Smart Shopping — Escaneo de etiquetas y suplementos para evaluar calidad.
 * Placeholder — funcionalidad completa próximamente.
 */
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/src/components/ui/BackButton';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Colors, Spacing } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/src/constants/brand';

export default function SmartShoppingScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <BackButton color={CATEGORY_COLORS.optimization} />
      </View>
      <EmptyState
        icon="barcode-outline"
        title="Compras inteligentes"
        subtitle="Escanea etiquetas y suplementos para evaluar su calidad"
        color={CATEGORY_COLORS.optimization}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
});
