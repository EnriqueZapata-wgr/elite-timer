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
 *
 * 14-oct-2026 (ronda de marca): la cabecera del hub es TabCabecera (ceja
 * gris, titulo FontSizes.hero sin mayusculas forzadas), la misma de Apps y
 * Perfil. Antes: ceja lima y "SALUD" de 28 px en mayusculas.
 */
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { SaludHub } from '@/src/screens/salud/SaludHub';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { Spacing } from '@/constants/theme';
import { TabCabecera } from '@/src/components/marca/TabCabecera';
import { useAppTheme } from '@/src/contexts/theme-context';
import { useEsV4 } from '@/src/hooks/useModoApp';
import { PerfilV4Screen } from '@/src/screens/v4/PerfilV4Screen';
import { vistaDeSalud } from '@/src/constants/tab-bar';

export default function SaludTab() {
  // MB-31B remate: SaludHub ya migró — la frontera B2 se cerró. La ruta lee
  // el tema GLOBAL (useSurfaceTokens aquí devolvería oscuro perpetuo: el
  // <ThemeReady> que abre el claro lo pone TabScreen más abajo).
  const t = useAppTheme().tokens;
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
            <TabCabecera ceja="TU SALUD FUNCIONAL" titulo="Salud" style={s.header} />
            <SaludHub />
          </>
        )}
      </TabScreen>
    </MedicalDisclaimerGate>
  );
}

const s = StyleSheet.create({
  // El hub trae su propio aire arriba: aqui solo el margen lateral y poco abajo.
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
});
