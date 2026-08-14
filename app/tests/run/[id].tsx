/**
 * TESTS · runner físico (Ola 4, Anexo C, pieza 4).
 *
 * Los nueve tests que se miden con el cuerpo entran por una sola ruta y se
 * separan por MODO, que es lo único que de verdad cambia entre ellos:
 *
 *   stopwatch  la app mide (plank, BOLT) → StopwatchTestScreen, sin tocarla.
 *   capture    la persona mide afuera y trae el número (Cooper, push-ups,
 *              equilibrio, Old Man, Recovery HR, agarre). Un formulario que
 *              se arma de los campos declarados en el catálogo.
 *   reactive   el teléfono ES el instrumento (tiempo de reacción). Su pantalla
 *              no es un wrapper: es el aparato, y se monta tal cual.
 *
 * El texto de cada test vive en src/constants/assessments/physical.ts, y el
 * destino de cada medición en physical-runtime.ts. Aquí solo queda la
 * interacción, que es la que se repetía once veces.
 */
import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { StopwatchTestScreen } from '@/src/components/edad-atp/StopwatchTestScreen';
import ReactionTimeTest from '@/app/edad-atp/tests/reaction-time';
import { useAuth } from '@/src/contexts/auth-context';
import { getPhysicalTest, type PhysicalTest } from '@/src/constants/assessments/physical';
import { readLatest, persistMeasure } from '@/src/services/assessments/physical-runtime';
import { parseDecimalInput } from '@/src/utils/number-helpers';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

export default function PhysicalRunner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const test = id ? getPhysicalTest(id) : undefined;

  if (!test) return <NotFound />;

  // El cronómetro y el aparato ya son pantallas completas: el runner las monta,
  // no las reimplementa.
  if (test.mode === 'reactive') return <ReactionTimeTest />;
  if (test.mode === 'stopwatch' && test.save?.via === 'kinematic') {
    return (
      <StopwatchTestScreen
        testKey={test.save.testKey as 'plank' | 'bolt'}
        title={test.title}
        intro={test.intro}
        helperTitle={test.helpTitle}
        helperBody={test.helpBody}
        maxSeconds={test.maxSeconds ?? 600}
      />
    );
  }
  return <CaptureRunner test={test} />;
}

// ─────────────────────────────────────────────────────────────────────────────

function CaptureRunner({ test }: { test: PhysicalTest }) {
  const { kind, tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { user } = useAuth();
  const analytics = useAnalytics();

  const [values, setValues] = useState<Record<string, string>>({});
  const [latest, setLatest] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const fields = test.fields ?? [];

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    readLatest(test, user.id).then(setLatest);
  }, [user?.id, test.id]));

  /** Los campos ya convertidos a número, con null donde no hay dato válido. */
  const parsed = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const f of fields) {
      const n = parseDecimalInput(values[f.key] ?? '');
      out[f.key] = n != null && n >= f.min && n <= f.max ? (f.integer ? Math.round(n) : n) : null;
    }
    return out;
  }, [values, fields]);

  /** Sin derive, el valor es el del primer campo: es el caso de los sencillos. */
  const derived = useMemo(() => {
    if (test.derive) return test.derive(parsed);
    const first = fields[0];
    const v = first ? parsed[first.key] : null;
    return v == null ? { problem: rangeMessage(first) } : { value: v };
  }, [parsed, test, fields]);

  const value = 'value' in derived ? derived.value : undefined;
  const caption = 'caption' in derived ? derived.caption : undefined;

  async function save() {
    if (!user?.id) return;
    if (value == null) {
      Alert.alert(test.title, ('problem' in derived && derived.problem) || 'Revisa los datos capturados.');
      return;
    }
    setSaving(true);
    const note = 'note' in derived ? derived.note : undefined;
    const r = await persistMeasure(test, user.id, value, note);
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', r.error ?? 'No se pudo guardar. Intenta de nuevo.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_FUNCTIONAL_TEST_COMPLETED, { test: test.id, value });
    haptic.success();
    setLatest(value);
    Alert.alert('Resultado guardado', `${value} ${test.savedUnit ?? ''}`.trim(), [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <PillarHeader pillar="fitness" title={test.title} />
      <ScrollView contentContainerStyle={s.content}>
        <EliteText variant="caption" style={s.intro}>{test.intro}</EliteText>

        {!!test.helpLabel && (
          <AnimatedPressable onPress={() => { haptic.light(); setHelpOpen(true); }} style={s.helpLink}>
            <Ionicons name="help-circle-outline" size={16} color={t.textoSecundario} />
            <EliteText variant="caption" style={s.helpLinkText}>{test.helpLabel}</EliteText>
          </AnimatedPressable>
        )}

        <View style={s.card}>
          {fields.map((f) => (
            <NumberInputRow
              key={f.key}
              label={f.label}
              unit={f.unit}
              helper={f.helper}
              value={values[f.key] ?? ''}
              onChangeText={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
              badge={f.showLatest && latest != null ? `actual ${latest}` : undefined}
            />
          ))}
          {caption ? <EliteText variant="caption" style={s.derived}>{caption}</EliteText> : null}
        </View>

        <GradientCTA
          label={saving ? 'GUARDANDO…' : 'GUARDAR RESULTADO'}
          pillar="fitness"
          onPress={save}
          disabled={saving}
          style={s.saveBtn}
        />
        <GradientCTA label="Volver" variant="quiet" onPress={() => router.back()} />
      </ScrollView>

      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setHelpOpen(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <EliteText variant="body" style={s.modalTitle}>{test.helpTitle}</EliteText>
            <ScrollView style={{ maxHeight: 320 }}>
              <EliteText variant="caption" style={s.modalBody}>{test.helpBody}</EliteText>
            </ScrollView>
            <GradientCTA label="Entendido" onPress={() => setHelpOpen(false)} style={s.modalClose} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

/** El aviso de rango dicho con el nombre del campo, no con jerga de validación. */
function rangeMessage(field?: { label: string; unit: string; min: number; max: number }): string {
  if (!field) return 'Captura tu resultado.';
  return `Ingresa ${field.label.toLowerCase()} entre ${field.min} y ${field.max} ${field.unit}.`;
}

function NotFound() {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  return (
    <Screen themed>
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={44} color={t.error} />
        <EliteText style={s.notFound}>Test no encontrado</EliteText>
        <AnimatedPressable onPress={() => router.replace('/tests')} style={s.quiet}>
          <EliteText variant="caption" style={s.quietText}>Volver a Tests</EliteText>
        </AnimatedPressable>
      </View>
    </Screen>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  intro: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 20 },
  helpLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  helpLinkText: { color: t.textoSecundario, fontFamily: Fonts.semiBold },
  card: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: t.borde },
  derived: {
    color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto,
    fontSize: FontSizes.xs, textAlign: 'right', marginTop: 2,
  },
  saveBtn: { marginTop: Spacing.md },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: t.flotante, borderRadius: Radius.card, padding: Spacing.lg, borderWidth: 1, borderColor: t.bordeMarcado, gap: Spacing.sm },
  modalTitle: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  modalBody: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 20 },
  modalClose: { marginTop: Spacing.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  notFound: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: t.texto },
  quiet: { borderWidth: 1, borderColor: t.borde, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.lg },
  quietText: { color: t.textoSecundario, fontSize: FontSizes.sm },
});
