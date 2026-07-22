/**
 * CrisisSupportBanner (C5-002) — banner fijo de la Línea de la Vida.
 *
 * Guardarraíl determinístico (NO generado por IA) para toda superficie de
 * crisis: ARGOS chat (al detectar temas de crisis), la intervención de
 * rescate (physiological_sigh) y el check-in cuando se marca "En pánico".
 * Tap → llama directo a LINEA_DE_LA_VIDA_PHONE (24 h, gratuito).
 * El número NUNCA se hardcodea aquí (B1-bis): copy, tel: URL y
 * accessibilityLabel se derivan todos de crisis-detection-core.
 */
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EliteText } from '@/components/elite-text';
import {
  CRISIS_BANNER_TEXT,
  LINEA_DE_LA_VIDA_PHONE,
  LINEA_DE_LA_VIDA_TEL_URL,
} from '@/src/services/crisis-detection-core';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

const CRISIS_ACCENT = '#f87171';

export function CrisisSupportBanner({ style }: { style?: object }) {
  return (
    <Pressable
      onPress={() => { Linking.openURL(LINEA_DE_LA_VIDA_TEL_URL).catch(() => {}); }}
      accessibilityRole="button"
      // B1-bis: derivado de la constante — VoiceOver/TalkBack debe leer SIEMPRE
      // el mismo número que marca el tel: URL, nunca uno hardcodeado aparte.
      accessibilityLabel={`Llamar a la Línea de la Vida, ${LINEA_DE_LA_VIDA_PHONE}, 24 horas, gratuito`}
      style={[styles.container, style]}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="call" size={16} color={CRISIS_ACCENT} />
      </View>
      <View style={{ flex: 1 }}>
        <EliteText style={styles.text}>{CRISIS_BANNER_TEXT}</EliteText>
        <EliteText style={styles.hint}>Toca para llamar ahora</EliteText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,113,113,0.15)',
  },
  text: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: '#fecaca',
    lineHeight: 19,
  },
  hint: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    color: CRISIS_ACCENT,
    marginTop: 2,
  },
});
