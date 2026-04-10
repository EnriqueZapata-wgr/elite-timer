/**
 * Fasting — Pantalla completa de ayuno estilo ZERO.
 *
 * Estados: NO AYUNANDO (selector de protocolo + historial)
 *          AYUNANDO (timer circular + zona biológica actual)
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { AnimatedScoreRing } from '@/src/components/ui/AnimatedScoreRing';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const AMBER = '#fbbf24';
const AMBER_GRADIENT = { start: 'rgba(251,191,36,0.12)', end: 'rgba(251,191,36,0.03)' };

const FASTING_ZONES = [
  { name: 'Digestión',           minH: 0,  maxH: 4,  color: '#999',    icon: 'restaurant-outline' as const, desc: 'Tu cuerpo procesa los alimentos' },
  { name: 'Post-absorción',      minH: 4,  maxH: 8,  color: '#38bdf8', icon: 'water-outline' as const,      desc: 'Transición a usar reservas' },
  { name: 'Quema de grasa',      minH: 8,  maxH: 12, color: '#a8e02a', icon: 'flame-outline' as const,      desc: 'Tu cuerpo empieza a usar grasa' },
  { name: 'Cetosis',             minH: 12, maxH: 16, color: '#fbbf24', icon: 'flash-outline' as const,      desc: 'Producción de cetonas activa' },
  { name: 'Autofagia',           minH: 16, maxH: 24, color: '#c084fc', icon: 'refresh-outline' as const,    desc: 'Reciclaje celular activado' },
  { name: 'Autofagia profunda',  minH: 24, maxH: 999, color: '#f472b6', icon: 'sparkles-outline' as const,  desc: 'Regeneración celular profunda' },
];

const PROTOCOL_OPTIONS = [12, 14, 16, 18, 23, 36];

function getCurrentZone(hours: number) {
  return FASTING_ZONES.find(z => hours >= z.minH && hours < z.maxH) ?? FASTING_ZONES[0];
}

function fmtTimer(totalSecs: number) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const sec = totalSecs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function FastingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [isFasting, setIsFasting] = useState(false);
  const [fastStart, setFastStart] = useState<Date | null>(null);
  const [targetHours, setTargetHours] = useState(16);
  const [selectedProtocol, setSelectedProtocol] = useState(16);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  // Cargar estado actual + historial
  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    // Ayuno activo
    supabase.from('fasting_logs').select('*')
      .eq('user_id', user.id).eq('status', 'active')
      .order('fast_start', { ascending: false }).limit(1)
      .then(({ data }) => {
        const active = data?.[0];
        if (active) {
          setIsFasting(true);
          setFastStart(new Date(active.fast_start));
          setTargetHours(active.target_hours ?? 16);
          setElapsedSecs(Math.floor((Date.now() - new Date(active.fast_start).getTime()) / 1000));
        } else {
          setIsFasting(false);
          setFastStart(null);
        }
      });
    // Historial
    supabase.from('fasting_logs').select('*')
      .eq('user_id', user.id).eq('status', 'completed')
      .order('fast_start', { ascending: false }).limit(10)
      .then(({ data }) => setHistory(data ?? []));
  }, [user?.id]));

  // Timer en vivo
  useEffect(() => {
    if (!isFasting || !fastStart) return;
    const id = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - fastStart.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isFasting, fastStart]);

  const elapsedHours = elapsedSecs / 3600;
  const pct = targetHours > 0 ? Math.min(100, Math.round((elapsedHours / targetHours) * 100)) : 0;
  const zone = getCurrentZone(elapsedHours);

  const startFast = async () => {
    if (!user?.id) return;
    haptic.success();
    const now = new Date();
    const dateStr = getLocalToday();
    await supabase.from('fasting_logs').upsert({
      user_id: user.id, date: dateStr,
      fast_start: now.toISOString(),
      target_hours: selectedProtocol,
      status: 'active',
    }, { onConflict: 'user_id,date' });
    setIsFasting(true);
    setFastStart(now);
    setTargetHours(selectedProtocol);
    setElapsedSecs(0);
  };

  const breakFast = async () => {
    if (!user?.id) return;
    haptic.medium();
    const now = new Date();
    const actualH = fastStart ? Math.round(((now.getTime() - fastStart.getTime()) / 3600000) * 10) / 10 : 0;
    const { data } = await supabase.from('fasting_logs').select('id')
      .eq('user_id', user.id).eq('status', 'active')
      .order('fast_start', { ascending: false }).limit(1);
    if (data?.[0]) {
      await supabase.from('fasting_logs').update({
        fast_end: now.toISOString(),
        actual_hours: actualH,
        status: 'completed',
      }).eq('id', data[0].id);
    }
    setIsFasting(false);
    setFastStart(null);
    setElapsedSecs(0);
    Alert.alert('Ayuno completado', `Duraste ${Math.floor(actualH)}h ${Math.round((actualH % 1) * 60)}m`);
  };

  return (
    <Screen>
      <PillarHeader pillar="nutrition" title="Ayuno" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {isFasting ? (
          /* ═══ ESTADO: AYUNANDO ═══ */
          <View>
            {/* Timer ring */}
            <Animated.View entering={FadeInUp.delay(50).springify()} style={s.timerWrap}>
              <AnimatedScoreRing score={pct} size={200} strokeWidth={5} label="" showLabel={false} />
              <View style={s.timerCenter}>
                <EliteText style={[s.timerText, { color: zone.color }]}>{fmtTimer(elapsedSecs)}</EliteText>
                <EliteText style={s.timerSub}>de {targetHours}h objetivo</EliteText>
              </View>
            </Animated.View>

            {/* Zona actual */}
            <Animated.View entering={FadeInUp.delay(100).springify()}>
              <GradientCard gradient={{ start: `${zone.color}15`, end: `${zone.color}05` }} padding={16} style={s.zoneCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name={zone.icon} size={22} color={zone.color} />
                  <View style={{ flex: 1 }}>
                    <EliteText style={[s.zoneName, { color: zone.color }]}>{zone.name}</EliteText>
                    <EliteText style={s.zoneDesc}>{zone.desc}</EliteText>
                  </View>
                </View>
              </GradientCard>
            </Animated.View>

            {/* Lista de zonas */}
            <Animated.View entering={FadeInUp.delay(150).springify()} style={{ marginTop: Spacing.md }}>
              {FASTING_ZONES.map((z, i) => {
                const reached = elapsedHours >= z.minH;
                const current = elapsedHours >= z.minH && elapsedHours < z.maxH;
                return (
                  <View key={i} style={s.zoneRow}>
                    <Ionicons
                      name={reached ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={current ? z.color : reached ? '#a8e02a' : 'rgba(255,255,255,0.15)'}
                    />
                    <EliteText style={[
                      s.zoneRowText,
                      reached && { color: '#fff' },
                      current && { color: z.color, fontFamily: Fonts.bold },
                    ]}>
                      {z.name} ({z.minH}–{z.maxH === 999 ? '∞' : z.maxH}h)
                    </EliteText>
                    {current && <EliteText style={[s.zoneRowHere, { color: z.color }]}>AQUÍ</EliteText>}
                  </View>
                );
              })}
            </Animated.View>

            {/* Botón romper */}
            <AnimatedPressable onPress={breakFast} style={s.breakBtn}>
              <Ionicons name="stop-circle-outline" size={20} color="#ef4444" />
              <EliteText style={s.breakBtnText}>Romper ayuno</EliteText>
            </AnimatedPressable>
          </View>
        ) : (
          /* ═══ ESTADO: NO AYUNANDO ═══ */
          <View>
            {/* Timer vacío */}
            <Animated.View entering={FadeInUp.delay(50).springify()} style={s.timerWrap}>
              <AnimatedScoreRing score={0} size={200} strokeWidth={5} label="" showLabel={false} />
              <View style={s.timerCenter}>
                <EliteText style={s.timerTextIdle}>00:00:00</EliteText>
              </View>
            </Animated.View>

            {/* Protocolo selector */}
            <Animated.View entering={FadeInUp.delay(100).springify()}>
              <SectionTitle>ELIGE TU PROTOCOLO</SectionTitle>
              <View style={s.protocolRow}>
                {PROTOCOL_OPTIONS.map(h => (
                  <AnimatedPressable
                    key={h}
                    onPress={() => { haptic.light(); setSelectedProtocol(h); }}
                    style={[s.protocolPill, selectedProtocol === h && s.protocolPillActive]}
                  >
                    <EliteText style={[s.protocolText, selectedProtocol === h && s.protocolTextActive]}>{h}h</EliteText>
                  </AnimatedPressable>
                ))}
              </View>
            </Animated.View>

            {/* Botón iniciar */}
            <Animated.View entering={FadeInUp.delay(150).springify()}>
              <AnimatedPressable onPress={startFast} style={s.startBtn}>
                <Ionicons name="play-circle" size={24} color="#000" />
                <EliteText style={s.startBtnText}>INICIAR AYUNO</EliteText>
              </AnimatedPressable>
            </Animated.View>

            {/* Historial */}
            {history.length > 0 && (
              <Animated.View entering={FadeInUp.delay(200).springify()} style={{ marginTop: Spacing.lg }}>
                <SectionTitle>HISTORIAL</SectionTitle>
                {history.slice(0, 7).map((h: any, i: number) => {
                  const d = new Date(h.fast_start);
                  const dateStr = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
                  const hrs = h.actual_hours ?? 0;
                  return (
                    <View key={h.id ?? i} style={s.historyRow}>
                      <EliteText style={s.historyDate}>{dateStr}</EliteText>
                      <EliteText style={s.historyHours}>{Math.floor(hrs)}h {Math.round((hrs % 1) * 60)}m</EliteText>
                      <Ionicons name="checkmark-circle" size={14} color="#a8e02a" />
                    </View>
                  );
                })}
              </Animated.View>
            )}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Timer
  timerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  timerCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 36,
    fontFamily: Fonts.extraBold,
    letterSpacing: -1,
  },
  timerTextIdle: {
    fontSize: 36,
    fontFamily: Fonts.extraBold,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: -1,
  },
  timerSub: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },

  // Zone
  zoneCard: { marginTop: Spacing.md },
  zoneName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
  },
  zoneDesc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  zoneRowText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.3)',
    flex: 1,
  },
  zoneRowHere: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },

  // Buttons
  breakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    marginTop: Spacing.lg,
  },
  breakBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#ef4444',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: AMBER,
    paddingVertical: 18,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  startBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 2,
  },

  // Protocol pills
  protocolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  protocolPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: '#0a0a0a',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  protocolPillActive: {
    backgroundColor: AMBER,
    borderColor: AMBER,
  },
  protocolText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: 'rgba(255,255,255,0.5)',
  },
  protocolTextActive: {
    color: '#000',
  },

  // History
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  historyDate: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.5)',
    width: 60,
  },
  historyHours: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#fff',
    flex: 1,
  },
});
