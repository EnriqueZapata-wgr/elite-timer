/**
 * Sprint Compliance 2 — Visor in-app de documentos legales en staging.
 *
 * Renderiza el Aviso de Privacidad Integral o los T&C desde legal-texts.ts
 * (con placeholder [RAZÓN SOCIAL] hasta que se constituya la SAS). Cuando los
 * documentos se publiquen en somosatp.com, estas pantallas siguen siendo el
 * espejo in-app linkeado desde los checkboxes de consentimiento.
 *
 * MB-31B remate: pantalla sin dueño en el reparto — migrada al tema. Es el
 * cuerpo de las DOS rutas legales; el componente abre su propio scope
 * (<ThemeReady>) porque el tema lo declara él, no la ruta.
 */
import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { type AppThemeTokens } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import type { LegalSection } from '@/src/constants/legal-texts';

interface Props {
  title: string;
  versionLabel: string;
  sections: LegalSection[];
  /**
   * B-6 (MB-12): fuente única = el documento publicado en somosatp.com (el
   * mismo que abre el paywall). Con webUrl presente, el texto in-app —que aún
   * tiene placeholders [ENTRE CORCHETES]— NO se muestra: un solo contrato, y
   * es el que el usuario acepta.
   */
  webUrl?: string;
}

export function LegalDocScreen({ title, versionLabel, sections, webUrl }: Props) {
  const router = useRouter();
  const { kind, tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <ThemeReady>
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <View style={s.header}>
        <AnimatedPressable style={s.backBtn} onPress={() => { haptic.light(); router.back(); }}>
          <Ionicons name="chevron-back" size={24} color={t.texto} />
        </AnimatedPressable>
        <EliteText style={s.headerTitle} numberOfLines={1}>{title}</EliteText>
      </View>
      {webUrl ? (
        <View style={s.scroll}>
          <EliteText style={s.body}>
            El documento oficial vive en somosatp.com. Es la misma versión que
            aceptas al usar ATP.
          </EliteText>
          <AnimatedPressable
            style={s.webBtn}
            onPress={() => { haptic.light(); Linking.openURL(webUrl).catch(() => {}); }}
          >
            <Ionicons name="open-outline" size={18} color={t.texto} />
            <EliteText style={s.webBtnText}>Abrir documento</EliteText>
          </AnimatedPressable>
        </View>
      ) : (
      <ScrollView contentContainerStyle={s.scroll}>
        <EliteText style={s.version}>{versionLabel}</EliteText>
        {sections.map((sec, i) => (
          <View key={i} style={s.section}>
            <EliteText style={s.heading}>{sec.heading}</EliteText>
            <EliteText style={s.body}>{sec.body}</EliteText>
          </View>
        ))}
      </ScrollView>
      )}
    </SafeAreaView>
    </ThemeReady>
  );
}

// MB-31B remate: los estilos leen los tokens del tema. El cuerpo era #bbb
// (fuera de escala) — cae a texto secundario; la versión #666 a tenue.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.fondo },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: t.texto },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  version: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: t.textoTenue, letterSpacing: 1 },
  webBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: t.bordeMarcado, borderRadius: 14,
    paddingVertical: Spacing.md, marginTop: Spacing.lg,
  },
  webBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: t.texto },
  section: { marginTop: Spacing.lg },
  heading: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: t.texto, marginBottom: 8 },
  body: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: t.textoSecundario, lineHeight: 21 },
});
