/**
 * AuthLinksFooter — footer de enlaces para /login (marca + legales).
 * Fila 1 (marca): ATP web + Comunidad, en teal del logo, abren en navegador.
 * Fila 2 (legal): Términos + Privacidad — MB-17: abren la web publicada
 * (misma fuente que el paywall); las pantallas /legal/* quedan de respaldo
 * mientras el texto in-app tenga corchetes de razón social.
 */
import { useMemo } from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { SKOOL_URL, type AppThemeTokens } from '@/src/constants/brand';
import { Spacing, FontSizes } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

const URLS = {
  web: 'https://www.somosatp.com',
  comunidad: SKOOL_URL, // C5: constante única (antes hardcode)
  terminos: 'https://somosatp.com/terminos',
  privacidad: 'https://somosatp.com/privacidad',
} as const;

function open(url: string) {
  haptic.light();
  Linking.openURL(url).catch(() => { /* sin navegador disponible — no-op */ });
}

export function AuthLinksFooter() {
  // BLOQ-3: `TEXT.tertiary` era el gris fijo del set oscuro y el teal de marca
  // tiene 2.06 de contraste en claro. La fila legal es copy legal: es la que
  // MENOS puede quedar tenue. Fuera de <ThemeReady> esto entrega THEME_DARK,
  // donde `tealTexto` ya es #1ABC9C: idéntico a antes.
  const t = useSurfaceTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={() => open(URLS.web)} hitSlop={8}>
          <EliteText style={styles.brandLink}>🌐 ATP</EliteText>
        </Pressable>
        <EliteText style={styles.brandSep}> · </EliteText>
        <Pressable onPress={() => open(URLS.comunidad)} hitSlop={8}>
          <EliteText style={styles.brandLink}>👥 Comunidad</EliteText>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Pressable onPress={() => open(URLS.terminos)} hitSlop={8}>
          <EliteText style={styles.legalLink}>Términos</EliteText>
        </Pressable>
        <EliteText style={styles.legalSep}> · </EliteText>
        <Pressable onPress={() => open(URLS.privacidad)} hitSlop={8}>
          <EliteText style={styles.legalLink}>Privacidad</EliteText>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  brandLink: { color: t.tealTexto, fontSize: FontSizes.sm },
  brandSep: { color: t.tealTexto, fontSize: FontSizes.sm, opacity: 0.5 },
  // Sube de `TEXT.tertiary` (#555) a secundario A PROPÓSITO, aun en oscuro:
  // la auditoría marcó este renglón por ilegible ("gris oscuro sobre negro a
  // ~13 px, y es copy legal"). El tenue está pensado para texto grande.
  legalLink: { color: t.textoSecundario, fontSize: FontSizes.xs },
  legalSep: { color: t.textoSecundario, fontSize: FontSizes.xs },
});
