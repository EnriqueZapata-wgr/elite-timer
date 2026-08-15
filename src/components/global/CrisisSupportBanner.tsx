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
import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EliteText } from '@/components/elite-text';
import {
  CRISIS_BANNER_TEXT,
  LINEA_DE_LA_VIDA_PHONE,
  LINEA_DE_LA_VIDA_TEL_URL,
} from '@/src/services/crisis-detection-core';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

/** El coral de crisis es SEÑAL: se queda en los dos temas como tinte y como
 *  icono. Lo que sí cambia es el texto, que en rosa pálido desaparecía sobre
 *  papel — y este banner es un guardarraíl de seguridad, tiene que leerse. */
const CRISIS_ACCENT = '#f87171';
/** El rosa del cuerpo solo existe en oscuro; en claro manda el texto del tema. */
const CRISIS_TEXT_DARK = '#fecaca';

export function CrisisSupportBanner({ style }: { style?: object }) {
  const t = useSurfaceTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
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
        <Ionicons name="call" size={16} color={t.kind === 'dark' ? CRISIS_ACCENT : t.error} />
      </View>
      <View style={{ flex: 1 }}>
        <EliteText style={styles.text}>{CRISIS_BANNER_TEXT}</EliteText>
        <EliteText style={styles.hint}>Toca para llamar ahora</EliteText>
      </View>
    </Pressable>
  );
}

const makeStyles = (t: AppThemeTokens) => {
  const dark = t.kind === 'dark';
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: dark ? 'rgba(248,113,113,0.10)' : 'rgba(176,58,46,0.10)',
      borderWidth: 1,
      borderColor: dark ? 'rgba(248,113,113,0.35)' : 'rgba(176,58,46,0.38)',
      borderRadius: Radius.md,
      padding: Spacing.md,
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: dark ? 'rgba(248,113,113,0.15)' : 'rgba(176,58,46,0.14)',
    },
    text: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSizes.sm,
      color: dark ? CRISIS_TEXT_DARK : t.texto,
      lineHeight: 19,
    },
    hint: {
      fontFamily: Fonts.bold,
      fontSize: FontSizes.xs,
      color: dark ? CRISIS_ACCENT : t.error,
      marginTop: 2,
    },
  });
};
