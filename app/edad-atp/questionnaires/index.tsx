/**
 * Edad ATP — hub de cuestionarios por dominio. Sprint 2.
 */
import { useState, useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect , type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { SEMANTIC, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const DOMAINS: { domain: string; icon: string; title: string; route: Href }[] = [
  { domain: 'metabolismo', icon: '🥗', title: 'Metabolismo', route: '/edad-atp/questionnaires/metabolismo' },
  { domain: 'habitos', icon: '📅', title: 'Hábitos', route: '/edad-atp/questionnaires/habitos' },
  { domain: 'cardiovascular', icon: '❤️', title: 'Cardiovascular', route: '/edad-atp/questionnaires/cardiovascular' },
  { domain: 'sueno', icon: '💤', title: 'Sueño', route: '/edad-atp/questionnaires/sueno' },
  { domain: 'sistema_hormonal', icon: '🧬', title: 'Sistema hormonal', route: '/edad-atp/questionnaires/sistema-hormonal' },
  { domain: 'vitalidad', icon: '⚡', title: 'Vitalidad', route: '/edad-atp/questionnaires/vitalidad' },
  { domain: 'inflamacion', icon: '🔥', title: 'Inflamación', route: '/edad-atp/questionnaires/inflamacion' },
  { domain: 'composicion_corporal', icon: '💪', title: 'Composición corporal', route: '/edad-atp/composition' },
  { domain: 'renal_micronutrientes', icon: '🧪', title: 'Renal y micronutrientes', route: '/edad-atp/questionnaires/renal-micronutrientes' },
  { domain: 'inmunidad', icon: '🛡️', title: 'Inmunidad', route: '/edad-atp/questionnaires/inmunidad' },
];

export default function QuestionnairesHub() {
  // MB-31B remate: tokens del tema (oscuro idéntico; claro = acero).
  const { kind, tokens: t } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const [done, setDone] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    supabase.from('edad_atp_questionnaire_responses').select('domain').eq('user_id', user.id).then(({ data }) => {
      setDone(new Set((data ?? []).map((r: any) => r.domain)));
    });
  }, [user?.id]));

  return (
    <Screen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <PillarHeader pillar="metrics" title="Cuestionarios" />
      <ScrollView contentContainerStyle={styles.content}>
        {DOMAINS.map((d) => {
          const isDone = done.has(d.domain);
          return (
            <Pressable
              key={d.domain}
              onPress={() => { haptic.medium(); router.push(d.route); }}
              style={[styles.row, isDone && styles.rowDone]}
            >
              <EliteText style={styles.emoji}>{d.icon}</EliteText>
              <View style={{ flex: 1 }}>
                <EliteText variant="body" style={styles.title}>{d.title}</EliteText>
                {/* MB-31B remate: en claro el lima no es letra (manual regla 1) → teal. */}
                <EliteText variant="caption" style={[styles.status, isDone && { color: kind === 'dark' ? SEMANTIC.success : t.tealTexto }]}>
                  {isDone ? '✓ Completado · Toca para revisar' : 'Toca para contestar'}
                </EliteText>
              </View>
              {isDone && <Ionicons name="checkmark-circle" size={18} color={SEMANTIC.success} />}
              <Ionicons name="chevron-forward" size={18} color={t.textoSecundario} />
            </Pressable>
          );
        })}
        <EliteText variant="caption" style={styles.note}>
          “Composición corporal” abre la captura de báscula. El resto son cuestionarios cortos.
        </EliteText>
      </ScrollView>
    </Screen>
  );
}

// MB-31B remate: los estilos leen los tokens del tema.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 1, borderColor: t.borde,
  },
  rowDone: { borderColor: 'rgba(168,224,42,0.35)' },
  emoji: { fontSize: 22 },
  title: { color: t.texto, fontFamily: Fonts.semiBold },
  status: { color: t.textoSecundario, fontSize: FontSizes.xs, marginTop: 1 },
  note: { color: t.textoSecundario, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.xs },
});
