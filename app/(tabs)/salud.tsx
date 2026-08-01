/**
 * Tab SALUD (MB-19 PIEZA 3) — hero de Edad ATP y cuatro puertas.
 *
 * El contenido vive en SaludHub, compartido con /health-hub (que se sigue
 * empujando desde Ajustes y desde el HOY). Aquí solo va el chrome de tab:
 * sin botón de regresar, con el banner persistente.
 */
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { SaludHub } from '@/src/screens/salud/SaludHub';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT } from '@/src/constants/brand';

export default function SaludTab() {
  return (
    <MedicalDisclaimerGate>
      <TabScreen>
        <StatusBar style="light" />
        <View style={s.header}>
          <EliteText style={s.eyebrow}>TU SALUD FUNCIONAL</EliteText>
          <EliteText style={s.title}>SALUD</EliteText>
        </View>
        <SaludHub />
      </TabScreen>
    </MedicalDisclaimerGate>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  eyebrow: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, color: TEXT.primary, letterSpacing: 2, marginTop: 2 },
});
