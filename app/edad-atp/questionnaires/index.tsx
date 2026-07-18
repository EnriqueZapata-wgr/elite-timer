/**
 * Edad ATP — hub de cuestionarios por dominio. Sprint 2.
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { router, useFocusEffect , type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

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
  const { user } = useAuth();
  const [done, setDone] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    supabase.from('edad_atp_questionnaire_responses').select('domain').eq('user_id', user.id).then(({ data }) => {
      setDone(new Set((data ?? []).map((r: any) => r.domain)));
    });
  }, [user?.id]));

  return (
    <Screen>
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
                <EliteText variant="caption" style={[styles.status, isDone && { color: Colors.neonGreen }]}>
                  {isDone ? '✓ Completado · Toca para revisar' : 'Toca para contestar'}
                </EliteText>
              </View>
              {isDone && <Ionicons name="checkmark-circle" size={18} color={Colors.neonGreen} />}
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </Pressable>
          );
        })}
        <EliteText variant="caption" style={styles.note}>
          "Composición corporal" abre la captura de báscula. El resto son cuestionarios cortos.
        </EliteText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 1, borderColor: '#1a1a1a',
  },
  rowDone: { borderColor: 'rgba(168,224,42,0.35)' },
  emoji: { fontSize: 22 },
  title: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  status: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 1 },
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.xs },
});
