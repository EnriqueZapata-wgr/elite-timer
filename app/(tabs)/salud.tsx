/**
 * Tab SALUD — hero de Edad ATP y las cuatro secciones.
 *
 * OLA6 PIEZA B: el contenido vive en SaludHub y esta es su ÚNICA montura.
 * /health-hub montaba el mismo cuerpo y ahora redirige aquí. Este archivo solo
 * pone el chrome de tab: sin botón de regresar, con el banner persistente.
 *
 * 8-oct-2026 (v4): en la presentacion v4 esta ruta es PERFIL. Pinta
 * PerfilV4Screen dentro del mismo <TabScreen themed> y del mismo
 * MedicalDisclaimerGate (es contenido de salud). Fuera de la v4, igual.
 * El hub clasico sigue vivo en la v4: con `?seccion=X` (por ejemplo desde
 * Ajustes > Salud, /health-hub o "Ir a Salud" del Perfil, que usa
 * `seccion=hub`) se pinta SaludHub con su seccion. Sin `seccion`, o con
 * `?marcador=<key>` (lo abre el Perfil), se pinta el Perfil. La regla vive en
 * vistaDeSalud() (src/constants/tab-bar.ts).
 */
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { SaludHub } from '@/src/screens/salud/SaludHub';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { useEsV4 } from '@/src/hooks/useModoApp';
import { PerfilV4Screen } from '@/src/screens/v4/PerfilV4Screen';
import { vistaDeSalud } from '@/src/constants/tab-bar';

export default function SaludTab() {
  // MB-31B remate: SaludHub ya migró — la frontera B2 se cerró. La ruta lee
  // el tema GLOBAL (useSurfaceTokens aquí devolvería oscuro perpetuo: el
  // <ThemeReady> que abre el claro lo pone TabScreen más abajo).
  const t = useAppTheme().tokens;
  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const v4 = useEsV4();
  const { seccion } = useLocalSearchParams<{ seccion?: string | string[] }>();
  const vista = vistaDeSalud(v4, seccion);
  return (
    <MedicalDisclaimerGate>
      <TabScreen themed>
        <StatusBar style={t.kind === 'light' ? 'dark' : 'light'} />
        {vista === 'perfil' ? (
          <PerfilV4Screen />
        ) : (
          <>
            <View style={s.header}>
              <EliteText style={[s.eyebrow, { color: acento }]}>TU SALUD FUNCIONAL</EliteText>
              <EliteText style={[s.title, { color: t.texto }]}>SALUD</EliteText>
            </View>
            <SaludHub />
          </>
        )}
      </TabScreen>
    </MedicalDisclaimerGate>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  eyebrow: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 2, marginTop: 2 },
});
