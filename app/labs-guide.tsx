/**
 * Guía de Laboratorios — pantalla in-app (Sprint LABS GUÍA DESCARGABLE T2/T3).
 *
 * Renderiza la guía completa desde constants (usable sin PDF) + botón para
 * generar el PDF y compartirlo (WhatsApp al doctor). Doctrina Humby/Enrique:
 * "somos amigables, no burocracia médica" — elimina el abandono en
 * "¿qué labs me hago?".
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { generateAndShareLabsGuide } from '@/src/services/labs-guide-service';
import {
  LABS_GUIDE_META,
  LABS_GUIDE_INTRO,
  LABS_PACKAGES,
  LABS_COMERCIALES,
  LABS_COMERCIALES_NOTE,
  LABS_PREPARACION,
  LABS_DESPUES,
} from '@/src/constants/labs-guide-content';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

export default function LabsGuideScreen() {
  const { user } = useAuth();
  const [sharing, setSharing] = useState(false);

  const firstName = ((user?.user_metadata?.full_name as string) || '').trim().split(' ')[0] || '';

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    haptic.medium();
    const result = await generateAndShareLabsGuide(firstName);
    setSharing(false);
    if (result === 'shared') {
      haptic.success();
    } else if (result === 'unavailable') {
      Alert.alert('Compartir no disponible', 'Tu dispositivo no permite compartir archivos desde la app.');
    } else {
      Alert.alert(
        'No se pudo generar el PDF',
        'La guía completa sigue disponible aquí en pantalla. Actualiza a la última versión de la app para descargar el PDF.',
      );
    }
  }

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Guía de laboratorios" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Portada */}
        <Animated.View entering={FadeInUp.duration(350)}>
          <EliteText style={s.kicker}>ATP · SALUD FUNCIONAL</EliteText>
          <EliteText style={s.title}>{LABS_GUIDE_META.subtitle}</EliteText>
          <EliteText style={s.version}>{LABS_GUIDE_META.version}</EliteText>
        </Animated.View>

        {/* Intro */}
        <Animated.View entering={FadeInUp.delay(80).duration(350)}>
          <EliteText style={s.sectionTitle}>{LABS_GUIDE_INTRO.whyTitle.toUpperCase()}</EliteText>
          {LABS_GUIDE_INTRO.why.map((w, i) => (
            <EliteText key={i} style={s.body}>{w}</EliteText>
          ))}
          <View style={s.costBox}>
            <Ionicons name="cash-outline" size={16} color={ATP_BRAND.lime} />
            <EliteText style={s.costText}>{LABS_GUIDE_INTRO.costNote}</EliteText>
          </View>
        </Animated.View>

        {/* Paquetes */}
        <Animated.View entering={FadeInUp.delay(140).duration(350)}>
          <EliteText style={s.sectionTitle}>PAQUETES RECOMENDADOS</EliteText>
          {LABS_PACKAGES.map(p => (
            <View key={p.id} style={s.pkgCard}>
              <View style={s.pkgHead}>
                <EliteText style={s.pkgName}>{p.name}</EliteText>
                <EliteText style={s.pkgPrice}>{p.priceRange}</EliteText>
              </View>
              <EliteText style={s.pkgWho}>{p.forWho}</EliteText>
              {p.labs.map(lab => (
                <View key={lab} style={s.labRow}>
                  <View style={s.labDot} />
                  <EliteText style={s.labText}>{lab}</EliteText>
                </View>
              ))}
              {p.note ? (
                <View style={s.noteBox}>
                  <Ionicons name="alert-circle-outline" size={14} color="#fbbf24" style={{ marginTop: 1 }} />
                  <EliteText style={s.noteText}>{p.note}</EliteText>
                </View>
              ) : null}
            </View>
          ))}
        </Animated.View>

        {/* Dónde */}
        <Animated.View entering={FadeInUp.delay(200).duration(350)}>
          <EliteText style={s.sectionTitle}>DÓNDE HACÉRTELOS (MÉXICO)</EliteText>
          {LABS_COMERCIALES.map(l => (
            <View key={l.name} style={s.commercialRow}>
              <EliteText style={s.commercialName}>{l.name}</EliteText>
              <EliteText style={s.commercialNote}>{l.note}</EliteText>
            </View>
          ))}
          <View style={s.tipBox}>
            <Ionicons name="bulb-outline" size={14} color={ATP_BRAND.lime} style={{ marginTop: 1 }} />
            <EliteText style={s.tipText}>{LABS_COMERCIALES_NOTE}</EliteText>
          </View>
        </Animated.View>

        {/* Preparación */}
        <Animated.View entering={FadeInUp.delay(260).duration(350)}>
          <EliteText style={s.sectionTitle}>CÓMO PREPARARTE</EliteText>
          {LABS_PREPARACION.map((x, i) => (
            <View key={i} style={s.labRow}>
              <View style={s.labDot} />
              <EliteText style={s.labText}>{x}</EliteText>
            </View>
          ))}
        </Animated.View>

        {/* Después */}
        <Animated.View entering={FadeInUp.delay(320).duration(350)}>
          <EliteText style={s.sectionTitle}>{LABS_DESPUES.title.toUpperCase()}</EliteText>
          {LABS_DESPUES.steps.map((x, i) => (
            <View key={i} style={s.labRow}>
              <EliteText style={s.stepNum}>{i + 1}</EliteText>
              <EliteText style={s.labText}>{x}</EliteText>
            </View>
          ))}
          <EliteText style={s.closing}>{LABS_DESPUES.closing}</EliteText>
        </Animated.View>

        <EliteText style={s.disclaimer}>{LABS_GUIDE_META.disclaimer}</EliteText>
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* CTA flotante: generar + compartir el PDF */}
      <View style={s.bottomBar}>
        <AnimatedPressable style={s.shareBtn} onPress={handleShare} disabled={sharing}>
          <Ionicons name="share-outline" size={18} color="#000" />
          <EliteText style={s.shareBtnText}>
            {sharing ? 'Generando PDF…' : 'DESCARGAR / COMPARTIR PDF'}
          </EliteText>
        </AnimatedPressable>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  kicker: { fontSize: 10, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime, letterSpacing: 2 },
  title: { fontSize: 24, fontFamily: Fonts.bold, color: '#fff', marginTop: 6, lineHeight: 31 },
  version: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.muted, marginTop: 4 },
  sectionTitle: {
    fontSize: 11, fontFamily: Fonts.bold, color: '#fff', letterSpacing: 2,
    marginTop: Spacing.xl, marginBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 6,
  },
  body: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#bbb', lineHeight: 21, marginBottom: 8 },
  costBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.06), borderLeftWidth: 3, borderLeftColor: ATP_BRAND.lime,
    borderRadius: Radius.sm, padding: Spacing.sm, marginTop: 4,
  },
  costText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#ddd', lineHeight: 20 },
  pkgCard: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  pkgHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  pkgName: { flex: 1, fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#fff' },
  pkgPrice: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: ATP_BRAND.lime },
  pkgWho: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 3, marginBottom: 8, lineHeight: 17 },
  labRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  labDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#555', marginTop: 7 },
  labText: { flex: 1, fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#ccc', lineHeight: 20 },
  stepNum: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    color: ATP_BRAND.lime, fontSize: 11, fontFamily: Fonts.bold, textAlign: 'center', lineHeight: 20,
  },
  noteBox: {
    flexDirection: 'row', gap: 8, backgroundColor: 'rgba(251,191,36,0.07)',
    borderRadius: Radius.sm, padding: Spacing.sm, marginTop: 6,
  },
  noteText: { flex: 1, fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#d8b24a', lineHeight: 17 },
  commercialRow: { marginBottom: Spacing.sm },
  commercialName: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: '#fff' },
  commercialNote: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 1, lineHeight: 17 },
  tipBox: {
    flexDirection: 'row', gap: 8, backgroundColor: ELEVATION[1].bg,
    borderWidth: 1, borderColor: ELEVATION[1].border, borderRadius: Radius.sm,
    padding: Spacing.sm, marginTop: 4,
  },
  tipText: { flex: 1, fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#bbb', lineHeight: 17 },
  closing: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#ddd', marginTop: Spacing.sm, lineHeight: 20 },
  disclaimer: {
    fontSize: 10, fontFamily: Fonts.regular, color: TEXT.muted, lineHeight: 15,
    marginTop: Spacing.xl, borderTopWidth: 1, borderTopColor: '#1a1a1a', paddingTop: Spacing.sm,
  },
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: Spacing.md, paddingBottom: 28, paddingTop: 10,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  shareBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  shareBtnText: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
