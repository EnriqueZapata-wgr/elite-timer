/**
 * AuthLinksFooter — footer de enlaces externos para /login (marca + legales).
 * Fila 1 (marca): ATP web + Comunidad, en teal del logo. Fila 2 (legal): Términos + Privacidad,
 * gris sutil. Abre en navegador con Linking.openURL.
 */
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { ATP_BRAND, TEXT, SKOOL_URL } from '@/src/constants/brand';
import { Spacing, FontSizes } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';

const URLS = {
  web: 'https://www.somosatp.com',
  comunidad: SKOOL_URL, // C5: constante única (antes hardcode)
  terminos: 'https://www.somosatp.com/terminosycondiciones',
  privacidad: 'https://www.somosatp.com/avisodeprivacidad',
} as const;

function open(url: string) {
  haptic.light();
  Linking.openURL(url).catch(() => { /* sin navegador disponible — no-op */ });
}

export function AuthLinksFooter() {
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

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  brandLink: { color: ATP_BRAND.teal, fontSize: FontSizes.sm },
  brandSep: { color: ATP_BRAND.teal, fontSize: FontSizes.sm, opacity: 0.5 },
  legalLink: { color: TEXT.tertiary, fontSize: FontSizes.xs },
  legalSep: { color: TEXT.tertiary, fontSize: FontSizes.xs },
});
