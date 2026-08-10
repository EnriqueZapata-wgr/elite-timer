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
import { ATP_BRAND } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';

export default function SaludTab() {
  // MB-31B remate: SaludHub ya migró — la frontera B2 se cerró. La ruta lee
  // el tema GLOBAL (useSurfaceTokens aquí devolvería oscuro perpetuo: el
  // <ThemeReady> que abre el claro lo pone TabScreen más abajo).
  const t = useAppTheme().tokens;
  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  return (
    <MedicalDisclaimerGate>
      <TabScreen themed>
        <StatusBar style={t.kind === 'light' ? 'dark' : 'light'} />
        <View style={s.header}>
          <EliteText style={[s.eyebrow, { color: acento }]}>TU SALUD FUNCIONAL</EliteText>
          <EliteText style={[s.title, { color: t.texto }]}>SALUD</EliteText>
        </View>
        <SaludHub />
      </TabScreen>
    </MedicalDisclaimerGate>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  eyebrow: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 2, marginTop: 2 },
});
