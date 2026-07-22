/**
 * Sprint Compliance 2 — Visor in-app de documentos legales en staging.
 *
 * Renderiza el Aviso de Privacidad Integral o los T&C desde legal-texts.ts
 * (con placeholder [RAZÓN SOCIAL] hasta que se constituya la SAS). Cuando los
 * documentos se publiquen en somosatp.com, estas pantallas siguen siendo el
 * espejo in-app linkeado desde los checkboxes de consentimiento.
 */
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { BG, TEXT } from '@/src/constants/brand';
import type { LegalSection } from '@/src/constants/legal-texts';

interface Props {
  title: string;
  versionLabel: string;
  sections: LegalSection[];
}

export function LegalDocScreen({ title, versionLabel, sections }: Props) {
  const router = useRouter();
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <AnimatedPressable style={s.backBtn} onPress={() => { haptic.light(); router.back(); }}>
          <Ionicons name="chevron-back" size={24} color={TEXT.primary} />
        </AnimatedPressable>
        <EliteText style={s.headerTitle} numberOfLines={1}>{title}</EliteText>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <EliteText style={s.version}>{versionLabel}</EliteText>
        <EliteText style={s.stagingNote}>
          Documento en preparación: los campos [ENTRE CORCHETES] se completarán con los
          datos de la sociedad responsable antes de su publicación oficial.
        </EliteText>
        {sections.map((sec, i) => (
          <View key={i} style={s.section}>
            <EliteText style={s.heading}>{sec.heading}</EliteText>
            <EliteText style={s.body}>{sec.body}</EliteText>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG.screen },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  version: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: '#666', letterSpacing: 1 },
  stagingNote: {
    fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#8a7a2f',
    marginTop: 8, lineHeight: 17,
  },
  section: { marginTop: Spacing.lg },
  heading: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT.primary, marginBottom: 8 },
  body: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#bbb', lineHeight: 21 },
});
