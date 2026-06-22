/**
 * RETOS — tabs Disponibles / Activos / Historial. Unirse cobra H+ (RPC join_challenge).
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ChallengeCard } from '@/src/components/economy/ChallengeCard';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { listActiveChallenges, joinChallenge, getMyActiveChallenges, getMyChallengeHistory } from '@/src/services/economy/challenge-service';
import type { Challenge, ChallengeParticipant } from '@/src/services/economy/economy-types';
import { ELEVATION, TEXT, ATP_BRAND } from '@/src/constants/brand';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

type Tab = 'available' | 'active' | 'history';

export default function ChallengesScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('available');
  const [available, setAvailable] = useState<Challenge[]>([]);
  const [active, setActive] = useState<ChallengeParticipant[]>([]);
  const [history, setHistory] = useState<ChallengeParticipant[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [a, ac, h] = await Promise.all([
      listActiveChallenges(), getMyActiveChallenges(user.id), getMyChallengeHistory(user.id),
    ]);
    setAvailable(a); setActive(ac); setHistory(h);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function join(c: Challenge) {
    if (!user?.id) return;
    haptic.medium();
    const r = await joinChallenge(user.id, c.id);
    if (r.success) {
      haptic.success();
      DeviceEventEmitter.emit('balance_changed');
      Alert.alert('¡Te uniste!', `${c.name} — entrada ${r.cost ?? 0} H+`);
      load();
    } else {
      const msg = r.error === 'insufficient_protons' ? 'No tienes H+ suficientes para la entrada.' : (r.error ?? 'Intenta de nuevo.');
      Alert.alert('No se pudo unir', msg);
    }
  }

  return (
    <Screen edges={[]}>
      <ScreenHeader title="Retos" onBack={() => router.back()} />
      <View style={styles.tabs}>
        {([['available', 'Disponibles'], ['active', 'Activos'], ['history', 'Historial']] as [Tab, string][]).map(([t, label]) => (
          <AnimatedPressable key={t} onPress={() => { haptic.light(); setTab(t); }} style={[styles.tab, tab === t && styles.tabActive]}>
            <EliteText style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</EliteText>
          </AnimatedPressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'available' && (available.length === 0
          ? <Empty text="No hay retos disponibles ahora." />
          : available.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInDown.delay(40 + i * 60).springify()}>
              <ChallengeCard challenge={c} cta="UNIRME" onPress={() => join(c)} />
            </Animated.View>
          )))}
        {tab === 'active' && (active.length === 0
          ? <Empty text="No tienes retos activos." />
          : active.map((p) => <ParticipantRow key={p.id} p={p} />))}
        {tab === 'history' && (history.length === 0
          ? <Empty text="Sin retos completados todavía." />
          : history.map((p) => <ParticipantRow key={p.id} p={p} />))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

function Empty({ text }: { text: string }) {
  return <EliteText variant="caption" style={styles.empty}>{text}</EliteText>;
}

function ParticipantRow({ p }: { p: ChallengeParticipant }) {
  const color = p.status === 'completed' ? ATP_BRAND.lime : p.status === 'failed' ? '#fb7185' : TEXT.secondary;
  return (
    <View style={styles.partRow}>
      <EliteText style={styles.partLabel}>Reto {p.challenge_id.slice(0, 8)}…</EliteText>
      <EliteText variant="caption" style={[styles.partStatus, { color }]}>{p.status.toUpperCase()}</EliteText>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  tab: { flex: 1, paddingVertical: 9, borderRadius: Radius.pill, alignItems: 'center', backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[2].border },
  tabActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  tabText: { color: TEXT.secondary, fontFamily: Fonts.bold, fontSize: FontSizes.xs },
  tabTextActive: { color: '#000' },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 80 },
  empty: { color: TEXT.secondary, textAlign: 'center', marginTop: Spacing.xl },
  partRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: ELEVATION[1].bg, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 0.5, borderColor: ELEVATION[1].border },
  partLabel: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  partStatus: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1 },
});
