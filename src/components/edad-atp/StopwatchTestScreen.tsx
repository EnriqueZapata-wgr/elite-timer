/**
 * StopwatchTestScreen — pantalla reutilizable de test cinemático con cronómetro
 * (plank, BOLT). Empezar/Detener/Reiniciar + un modal "¿Cómo se hace?". Guarda los
 * segundos vía kinematic-tests-service (que alimenta el motor v2).
 */
import { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { useStopwatch } from '@/src/hooks/useStopwatch';
import { saveKinematicTest, type KinematicTestKey } from '@/src/services/edad-atp/kinematic-tests-service';
import { ATP_BRAND, TEXT_COLORS, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface Props {
  testKey: Extract<KinematicTestKey, 'plank' | 'bolt'>;
  title: string;
  intro: string;
  helperTitle: string;
  helperBody: string;
  maxSeconds: number;
}

export function StopwatchTestScreen({ testKey, title, intro, helperTitle, helperBody, maxSeconds }: Props) {
  // MB-31B remate: este componente ES el cuerpo de la ruta y renderiza su
  // propio <Screen themed>, así que lee el tema GLOBAL (useAppTheme) — con
  // useSurfaceTokens aquí arriba del Screen sería oscuro perpetuo.
  const { kind, tokens: t } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const analytics = useAnalytics();
  const { elapsed, running, start, stop, reset } = useStopwatch();
  const [saving, setSaving] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const canSave = !running && elapsed > 0;

  async function handleSave() {
    if (!user?.id) return;
    const value = Math.round(elapsed); // segundos enteros
    if (value < 1) { Alert.alert('Sin tiempo', 'Inicia y detén el cronómetro primero.'); return; }
    if (value > maxSeconds) { Alert.alert('Fuera de rango', `El máximo es ${maxSeconds}s.`); return; }
    setSaving(true);
    const r = await saveKinematicTest(user.id, testKey, value, 'seconds');
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', r.error ?? 'No se pudo guardar. Intenta de nuevo.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: testKey, value, source: 'cinematic' });
    haptic.success();
    Alert.alert('', `${value}s guardados ✓`, [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <PillarHeader pillar="fitness" title={title} />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.intro}>{intro}</EliteText>

        {/* ACCENT_ROLES: link de ayuda no es CTA/héroe/estado → neutro. */}
        <AnimatedPressable onPress={() => { haptic.light(); setHelpOpen(true); }} style={styles.helpLink}>
          <Ionicons name="help-circle-outline" size={16} color={t.textoSecundario} />
          <EliteText variant="caption" style={styles.helpLinkText}>¿Cómo se hace?</EliteText>
        </AnimatedPressable>

        <View style={styles.timerCard}>
          <EliteText style={styles.timer}>{elapsed.toFixed(1)}<EliteText style={styles.timerUnit}> s</EliteText></EliteText>
          <View style={styles.controls}>
            {!running ? (
              <AnimatedPressable onPress={() => { haptic.medium(); start(); }} style={[styles.ctrl, styles.ctrlStart]}>
                <Ionicons name="play" size={20} color={t.textoSobreLima} />
                <EliteText variant="body" style={styles.ctrlStartText}>{elapsed > 0 ? 'Reanudar' : 'Empezar'}</EliteText>
              </AnimatedPressable>
            ) : (
              <AnimatedPressable onPress={() => { haptic.medium(); stop(); }} style={[styles.ctrl, styles.ctrlStop]}>
                <Ionicons name="stop" size={20} color={TEXT_COLORS.primary} />
                <EliteText variant="body" style={styles.ctrlStopText}>Detener</EliteText>
              </AnimatedPressable>
            )}
            <AnimatedPressable onPress={() => { haptic.light(); reset(); }} style={[styles.ctrl, styles.ctrlReset]} disabled={running}>
              <Ionicons name="refresh" size={18} color={running ? t.textoTenue : t.textoSecundario} />
              <EliteText variant="caption" style={[styles.ctrlResetText, running && { color: t.textoTenue }]}>Reiniciar</EliteText>
            </AnimatedPressable>
          </View>
        </View>

        <GradientCTA
          label={saving ? 'GUARDANDO…' : 'GUARDAR RESULTADO'}
          onPress={handleSave}
          disabled={!canSave || saving}
          pillar="fitness"
          style={styles.saveBtn}
        />
        <GradientCTA label="Volver" variant="quiet" onPress={() => router.back()} />
      </ScrollView>

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setHelpOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <EliteText variant="body" style={styles.modalTitle}>{helperTitle}</EliteText>
            <EliteText variant="caption" style={styles.modalBody}>{helperBody}</EliteText>
            <GradientCTA label="Entendido" onPress={() => setHelpOpen(false)} style={styles.modalClose} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

// MB-31B remate: los estilos leen los tokens del tema. El lima como LETRA del
// cronómetro (dato heroico) solo vive en oscuro; en claro cae al teal
// (manual regla 1 — hallazgo reportado).
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  intro: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 20 },
  helpLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  helpLinkText: { color: t.textoSecundario, fontFamily: Fonts.semiBold },
  timerCard: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.lg, borderWidth: 1, borderColor: t.borde, alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  // Lima solo en el dato heroico (el cronómetro ES el protagonista de la pantalla).
  timer: { fontFamily: Fonts.extraBold, fontSize: FontSizes.timer, color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto },
  timerUnit: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg, color: t.textoSecundario },
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  ctrl: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 20, borderRadius: Radius.pill },
  // CTA compacto inline — lime sólido permitido bajo ACCENT_ROLES (§1).
  ctrlStart: { backgroundColor: ATP_BRAND.lime },
  ctrlStartText: { color: t.textoSobreLima, fontFamily: Fonts.bold },
  // Blanco constante sobre el relleno de error (calibrado por tema en t.error).
  ctrlStop: { backgroundColor: t.error },
  ctrlStopText: { color: TEXT_COLORS.primary, fontFamily: Fonts.bold },
  ctrlReset: { borderWidth: 1, borderColor: t.borde },
  ctrlResetText: { color: t.textoSecundario },
  saveBtn: { marginTop: Spacing.md },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: t.flotante, borderRadius: Radius.card, padding: Spacing.lg, borderWidth: 1, borderColor: t.bordeMarcado, gap: Spacing.sm },
  modalTitle: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  modalBody: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 20 },
  modalClose: { marginTop: Spacing.xs },
});
