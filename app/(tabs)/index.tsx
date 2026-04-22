/**
 * HOY — Dashboard diario compilado.
 *
 * Usa compileDay() como única fuente de datos. Seis secciones:
 * 1. Hero (imagen + gradiente + ring + saludo)
 * 2. Próximo electrón
 * 3. Electrones booleanos (grid 2-col)
 * 4. Electrones cuantitativos (barras)
 * 5. Sugerencia inteligente
 * 6. Agenda (timeline)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, Text,
  Dimensions, DeviceEventEmitter, ImageBackground,
  LayoutAnimation, Platform, UIManager, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/auth-context';
import { compileDay, type CompiledDay } from '@/src/services/day-compiler';
import { awardBooleanElectron, revokeBooleanElectron } from '@/src/services/electron-service';
import { AnimatedScoreRing } from '@/src/components/ui/AnimatedScoreRing';
import { ElectronBadge } from '@/src/components/ui/ElectronBadge';
import { EditDayModal } from '@/src/components/hoy/EditDayModal';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { getHoyBackgroundRequire } from '@/src/constants/brand';
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { generateDailyInsight, chatWithArgos } from '@/src/services/argos-service';
import { speakArgos } from '@/src/services/argos-voice';
import { VoiceButton } from '@/src/components/VoiceButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTour } from '@/src/components/AppTour';
import { Colors, Spacing, Fonts, Radius, FontSizes } from '@/constants/theme';
import { CARD, SEMANTIC, SURFACES } from '@/src/constants/brand';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

const SCREEN_WIDTH = Dimensions.get('window').width;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

// ═══ HELPERS ═══

/** Color del score según porcentaje */
function scoreColor(pct: number): string {
  if (pct >= 70) return '#a8e02a';
  if (pct >= 50) return '#fbbf24';
  return '#ef4444';
}

/** Etiqueta del score según porcentaje */
function scoreLabel(pct: number): string {
  if (pct >= 90) return 'MÁXIMA CARGA';
  if (pct >= 70) return 'BUENA CARGA';
  if (pct >= 50) return 'CARGANDO';
  if (pct >= 20) return 'BAJA CARGA';
  return 'SIN CARGA';
}

/** Color de categoría para el timeline */
function getCatColor(category?: string): string {
  if (!category) return '#444';
  const c = category.toLowerCase();
  if (c.includes('fitness') || c.includes('exercise')) return '#a8e02a';
  if (c.includes('nutrition') || c.includes('meal') || c.includes('supplement')) return '#5B9BD5';
  if (c.includes('mind') || c.includes('meditation') || c.includes('breathing')) return '#7F77DD';
  if (c.includes('optimization') || c.includes('habit')) return '#EF9F27';
  if (c.includes('rest') || c.includes('sleep')) return '#666';
  return '#444';
}

/** Formato display 24h → "8:30" (sin AM/PM, corto) */
function fmtTime(t: string): string {
  if (!t) return '';
  // Ya viene en 24h: "08:30", "14:00"
  const [h, m] = t.split(':').map(s => parseInt(s, 10));
  return `${h}:${String(m || 0).padStart(2, '0')}`;
}

/** Parse hora de un time string a minutos del día */
function toMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.replace(/[^0-9:]/g, '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Segmentar agenda por franjas horarias */
function segmentAgenda(items: CompiledDay['agendaItems']) {
  const sorted = [...items].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  const morning: typeof items = [];
  const afternoon: typeof items = [];
  const evening: typeof items = [];

  for (const item of sorted) {
    const h = Math.floor(toMinutes(item.time) / 60);
    if (h >= 5 && h < 12) morning.push(item);
    else if (h >= 12 && h < 18) afternoon.push(item);
    else evening.push(item);
  }

  return [
    { label: 'MAÑANA', icon: 'sunny-outline' as const, color: '#fbbf24', items: morning },
    { label: 'TARDE', icon: 'partly-sunny-outline' as const, color: '#fb923c', items: afternoon },
    { label: 'NOCHE', icon: 'moon-outline' as const, color: '#818cf8', items: evening },
  ].filter(seg => seg.items.length > 0);
}

// ═══ COMPONENTE PRINCIPAL ═══

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // --- Estado único ---
  const [day, setDay] = useState<CompiledDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [dailyInsight, setDailyInsight] = useState<string>('');
  const [showTour, setShowTour] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState('');
  const isTogglingRef = useRef(false);

  // --- Carga de datos ---
  const loadDay = useCallback(async () => {
    if (!user?.id) return;
    try {
      const compiled = await compileDay(user.id);
      if (compiled) setDay(compiled);
    } catch (e) {
      console.warn('Error compiling day:', e);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    loadDay();
    const interval = setInterval(loadDay, REFRESH_INTERVAL);
    const sub1 = DeviceEventEmitter.addListener('day_changed', () => {
      if (!isTogglingRef.current) loadDay();
    });
    const sub2 = DeviceEventEmitter.addListener('electrons_changed', () => {
      if (!isTogglingRef.current) loadDay();
    });
    return () => {
      clearInterval(interval);
      sub1.remove();
      sub2.remove();
    };
  }, [loadDay]);

  // --- Tour de onboarding ---
  useEffect(() => {
    AsyncStorage.getItem('@atp/tour_completed').then(v => {
      if (v !== 'true') setShowTour(true);
    });
  }, []);

  // --- Insight diario ARGOS (refresca cada 6h) ---
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const today = getLocalToday();
      // Cache en Supabase — válido por 6 horas
      try {
        const { data: cached } = await supabase
          .from('argos_daily_insights')
          .select('insight, created_at')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle();
        if (cached?.insight) {
          setDailyInsight(cached.insight);
          const cacheAge = cached.created_at
            ? (Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60)
            : Infinity;
          if (cacheAge < 6) return; // Cache fresco, no regenerar
        }
      } catch (_) { /* sin cache */ }
      // Generar nuevo
      try {
        const insight = await generateDailyInsight(user.id);
        if (insight) {
          setDailyInsight(insight);
          await supabase.from('argos_daily_insights').upsert(
            { user_id: user.id, date: today, insight, created_at: new Date().toISOString() },
            { onConflict: 'user_id,date' },
          );
        }
      } catch (_) { /* silencioso */ }
    })();
  }, [user?.id]);

  // --- Toggle electrón booleano ---
  async function toggleBoolean(source: string) {
    if (!user?.id || !day) return;
    haptic.medium();
    const today = getLocalToday();

    // Buscar el electrón actual
    const el = day.booleanElectrons.find(e => e.source === source);
    if (!el) return;
    const wasCompleted = el.completed;

    // Optimistic update
    setDay(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.booleanElectrons = prev.booleanElectrons.map(e =>
        e.source === source ? { ...e, completed: !wasCompleted } : e
      );
      // Recalcular progreso
      let earned = 0, possible = 0;
      for (const e of updated.booleanElectrons) {
        possible += e.weight;
        if (e.completed) earned += e.weight;
      }
      for (const e of updated.quantitativeElectrons) {
        possible += e.weight;
        earned += e.weight * Math.min(1, e.target > 0 ? e.current / e.target : 0);
      }
      earned = Math.round(earned * 10) / 10;
      possible = Math.round(possible * 10) / 10;
      const percentage = possible > 0 ? Math.round((earned / possible) * 100) : 0;
      updated.electronProgress = { earned, possible, percentage };
      return updated;
    });

    // Dual write: daily_electrons + electron_logs
    isTogglingRef.current = true;
    try {
      // 1) daily_electrons (JSONB para UI rápida)
      const newStates: Record<string, boolean> = {};
      for (const e of day.booleanElectrons) {
        newStates[e.source] = e.source === source ? !wasCompleted : e.completed;
      }
      await supabase
        .from('daily_electrons')
        .upsert({ user_id: user.id, date: today, electrons: newStates }, { onConflict: 'user_id,date' });

      // 2) electron_logs (acumulado)
      if (wasCompleted) {
        await revokeBooleanElectron(user.id, source as any);
      } else {
        await awardBooleanElectron(user.id, source as any);
      }
      DeviceEventEmitter.emit('electrons_changed');
    } catch (e) {
      console.warn('Error toggling electron:', e);
      // Revertir optimistic update en caso de error
      setDay(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          booleanElectrons: prev.booleanElectrons.map(el =>
            el.source === source ? { ...el, completed: wasCompleted } : el
          ),
        };
      });
    } finally {
      isTogglingRef.current = false;
    }

    // Recompilar para sincronizar nextElectron y suggestion (sin race condition)
    setTimeout(() => loadDay(), 300);
  }

  // --- Toggle agenda item ---
  async function toggleAgendaItem(itemId: string) {
    if (!day || !user?.id) return;
    haptic.light();

    // Optimistic update
    setDay(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        agendaItems: prev.agendaItems.map(item =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        ),
      };
    });

    // Persist en daily_plans
    try {
      const today = getLocalToday();
      const { data: plan } = await supabase
        .from('daily_plans')
        .select('actions')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (plan?.actions) {
        const updatedActions = (plan.actions as any[]).map((a: any) =>
          (a.id === itemId || `p-${a.scheduled_time}` === itemId)
            ? { ...a, completed: !a.completed }
            : a
        );
        await supabase.from('daily_plans')
          .update({ actions: updatedActions })
          .eq('user_id', user.id)
          .eq('date', today);
      }
    } catch (e) {
      console.warn('Error toggling agenda item:', e);
    }
  }

  // --- EditDayModal save ---
  async function handleEditSave(bools: string[], quants: string[]) {
    if (!user?.id) return;
    try {
      await supabase.from('user_day_preferences').upsert({
        user_id: user.id,
        active_boolean_electrons: bools,
        active_quantitative_electrons: quants,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch { /* tabla puede no existir */ }
    loadDay();
  }

  // --- Quick voice desde HOY (sin abrir chat) ---
  async function handleQuickVoice(transcript: string) {
    if (!user?.id) return;
    setVoiceLoading(true);
    setVoiceResponse('');
    try {
      const response = await chatWithArgos(user.id, [{ role: 'user', content: transcript }]);
      setVoiceResponse(response);
      await speakArgos(response);
      setTimeout(() => setVoiceResponse(''), 10000);
    } catch (e) {
      console.error('Quick voice error:', e);
    } finally {
      setVoiceLoading(false);
    }
  }

  // --- Derivados ---
  const hour = new Date().getHours();
  const pct = day?.electronProgress.percentage ?? 0;
  const heroBg = getHoyBackgroundRequire(hour, pct);
  const elColor = scoreColor(pct);
  const elLabel = scoreLabel(pct);

  // ═══ RENDER ═══

  if (loading && !day) {
    return (
      <View style={s.loadingWrap}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#a8e02a" />
        <Text style={s.loadingText}>Compilando tu día...</Text>
      </View>
    );
  }

  if (!day) {
    return (
      <View style={s.loadingWrap}>
        <StatusBar style="light" />
        <Text style={s.loadingText}>No se pudo cargar tu día.</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ═══════════════════════════════════════
            SECCIÓN 1: HERO
        ═══════════════════════════════════════ */}
        <ImageBackground source={heroBg} style={s.heroBg} imageStyle={s.heroBgImage}>
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', '#000']}
            locations={[0, 0.25, 0.65, 1]}
            style={[s.heroGradient, { paddingTop: insets.top + 8 }]}
          >
            {/* Top bar */}
            <Animated.View entering={FadeInUp.delay(50).springify()}>
              <View style={s.topBar}>
                <View style={s.topBarLeft}>
                  <Text style={s.brandLabel}>ATP DAILY</Text>
                  <ElectronBadge />
                </View>
                <AnimatedPressable onPress={() => { haptic.light(); }} style={s.topBarIcon}>
                  <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
                </AnimatedPressable>
              </View>
            </Animated.View>

            {/* Saludo */}
            <Animated.View entering={FadeInUp.delay(80).springify()} style={s.heroGreetingWrap}>
              <Text style={s.heroGreeting}>{day.greeting}</Text>
              <Text style={s.heroName}>{day.userName}</Text>
              <Text style={s.heroDate}>{day.date}</Text>
            </Animated.View>

            {/* Protocol pill */}
            {day.protocol && (
              <Animated.View entering={FadeInUp.delay(100).springify()} style={s.protocolPill}>
                <Ionicons name="flask-outline" size={12} color="#a8e02a" />
                <Text style={s.protocolPillText}>
                  {day.protocol.name} · Día {day.protocol.dayNumber}/{day.protocol.totalDays}
                </Text>
              </Animated.View>
            )}

            {/* Score ring + electrones */}
            <Animated.View entering={FadeInUp.delay(120).springify()} style={s.heroScoreWrap}>
              <View style={s.heroScoreRow}>
                <AnimatedScoreRing score={pct} size={120} strokeWidth={3} label="ELECTRONES" />
                <View style={s.heroScoreInfo}>
                  <Text style={[s.heroElectronNum, { color: elColor }]}>
                    {day.electronProgress.earned.toFixed(1)} ⚡
                  </Text>
                  <Text style={s.heroElectronSlash}>
                    de {day.electronProgress.possible.toFixed(1)}
                  </Text>
                  <Text style={[s.heroScoreLabel, { color: elColor }]}>{elLabel}</Text>
                </View>
              </View>
            </Animated.View>
          </LinearGradient>
        </ImageBackground>

        {/* ═══════════════════════════════════════
            INSIGHT ARGOS
        ═══════════════════════════════════════ */}
        {dailyInsight ? (
          <Pressable onPress={() => router.push('/argos-chat')} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{
              backgroundColor: 'rgba(168,224,42,0.06)', borderRadius: 16, padding: 16,
              borderWidth: 1, borderColor: 'rgba(168,224,42,0.12)',
              flexDirection: 'row', gap: 12, alignItems: 'flex-start',
            }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: 'rgba(168,224,42,0.15)',
                justifyContent: 'center', alignItems: 'center',
                marginTop: 2,
              }}>
                <Ionicons name="eye" size={14} color="#a8e02a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#a8e02a', fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 }}>
                  INSIGHT ARGOS
                </Text>
                <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 20 }}>
                  {dailyInsight}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginTop: 4 }} />
            </View>
          </Pressable>
        ) : null}

        {/* ═══════════════════════════════════════
            SECCIÓN 2: PRÓXIMO ELECTRÓN
        ═══════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(140).springify()} style={s.section}>
          {day.nextElectron ? (
            <AnimatedPressable
              onPress={() => toggleBoolean(day.nextElectron!.source)}
              style={s.nextElectronCard}
            >
              <View style={s.nextElectronHeader}>
                <View style={[s.nextElectronIcon, { backgroundColor: day.nextElectron.color + '20' }]}>
                  <Ionicons
                    name={day.nextElectron.icon as any}
                    size={24}
                    color={day.nextElectron.color}
                  />
                </View>
                <View style={s.nextElectronText}>
                  <Text style={s.nextElectronLabel}>PRÓXIMO ELECTRÓN</Text>
                  <Text style={s.nextElectronName}>{day.nextElectron.name}</Text>
                  <Text style={s.nextElectronDesc}>{day.nextElectron.description}</Text>
                </View>
              </View>
              <View style={s.nextElectronBtn}>
                <Text style={s.nextElectronBtnText}>COMPLETAR</Text>
              </View>
            </AnimatedPressable>
          ) : (
            <View style={s.missionCompleteCard}>
              <Ionicons name="checkmark-circle" size={28} color="#a8e02a" />
              <Text style={s.missionCompleteText}>¡Misión cumplida!</Text>
              <Text style={s.missionCompleteSubtext}>Todos los electrones del día completados.</Text>
            </View>
          )}
        </Animated.View>

        {/* ═══════════════════════════════════════
            SECCIÓN 3: ELECTRONES BOOLEANOS
        ═══════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(160).springify()} style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>ELECTRONES</Text>
            <Text style={s.sectionSubtitle}>
              {day.electronProgress.earned.toFixed(1)} / {day.electronProgress.possible.toFixed(1)} ⚡
            </Text>
          </View>

          <View style={s.electronGrid}>
            {day.booleanElectrons.map((el) => {
              const isExpanded = expandedSource === el.source;
              return (
                <View key={el.source} style={{ width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2 }}>
                  <AnimatedPressable
                    onPress={() => toggleBoolean(el.source)}
                    onLongPress={() => {
                      haptic.light();
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedSource(isExpanded ? null : el.source);
                    }}
                    style={[
                      s.electronCard,
                      el.completed && { borderColor: el.color + '60' },
                    ]}
                  >
                    <View style={[s.electronIconWrap, { backgroundColor: el.color + '15' }]}>
                      <Ionicons
                        name={el.icon as any}
                        size={22}
                        color={el.completed ? el.color : '#555'}
                      />
                    </View>
                    <Text style={[s.electronName, el.completed && { color: Colors.textPrimary }]}>
                      {el.name}
                    </Text>
                    <View style={[
                      s.electronDot,
                      el.completed ? { backgroundColor: el.color } : { backgroundColor: '#333' },
                    ]} />
                  </AnimatedPressable>

                  {/* Panel expandido (info) */}
                  {isExpanded && (
                    <View style={s.electronExpandedPanel}>
                      <Text style={s.electronExpandedDesc}>{el.description}</Text>
                      <Text style={s.electronExpandedWeight}>Peso: {el.weight} ⚡</Text>
                      <AnimatedPressable
                        onPress={() => {
                          haptic.light();
                          router.push(el.pillarRoute as any);
                        }}
                        style={s.electronExpandedLink}
                      >
                        <Text style={s.electronExpandedLinkText}>Ir al pilar →</Text>
                      </AnimatedPressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════
            SECCIÓN 4: ELECTRONES CUANTITATIVOS
        ═══════════════════════════════════════ */}
        {day.quantitativeElectrons.length > 0 && (
          <Animated.View entering={FadeInUp.delay(180).springify()} style={s.section}>
            <View style={s.quantGrid}>
              {day.quantitativeElectrons.map((q) => {
                const progress = q.target > 0 ? Math.min(q.current / q.target, 1) : 0;
                return (
                  <AnimatedPressable
                    key={q.source}
                    onPress={() => { haptic.light(); router.push('/nutrition' as any); }}
                    style={s.quantCard}
                  >
                    <View style={s.quantCardHeader}>
                      <Ionicons name={q.icon as any} size={14} color={q.color} />
                      <Text style={s.quantCardName}>{q.name}</Text>
                      <Text style={s.quantCardValue}>
                        {q.displayCurrent} / {q.displayTarget}
                      </Text>
                    </View>
                    <View style={s.quantTrack}>
                      <View style={[
                        s.quantFill,
                        { width: `${progress * 100}%`, backgroundColor: q.color },
                      ]} />
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ═══════════════════════════════════════
            SECCIÓN 5: SUGERENCIA INTELIGENTE
        ═══════════════════════════════════════ */}
        {day.suggestion && (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={s.section}>
            <AnimatedPressable
              onPress={() => {
                haptic.light();
                router.push(day.suggestion!.route as any);
              }}
              style={s.suggestionCard}
            >
              <View style={s.suggestionRow}>
                <Ionicons name="sparkles" size={18} color="#EF9F27" />
                <View style={s.suggestionTextWrap}>
                  <Text style={s.suggestionText}>{day.suggestion.text}</Text>
                  <Text style={s.suggestionAction}>{day.suggestion.action} →</Text>
                </View>
              </View>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* Botón editar mi día */}
        <AnimatedPressable
          onPress={() => { haptic.light(); setEditModalVisible(true); }}
          style={s.editDayBtn}
        >
          <Ionicons name="create-outline" size={16} color="#666" />
          <Text style={s.editDayBtnText}>Editar mi día</Text>
        </AnimatedPressable>

        <EditDayModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          activeBooleans={day.booleanElectrons.map(e => e.source)}
          activeQuantitatives={day.quantitativeElectrons.map(e => e.source)}
          agendaActions={day.agendaItems.map(a => ({
            id: a.id, name: a.name, time: a.time,
            category: a.category, completed: a.completed,
          }))}
          onSave={async (bools, quants, _actions) => {
            await handleEditSave(bools, quants);
          }}
        />

        {/* ═══════════════════════════════════════
            SECCIÓN 6: AGENDA — segmentada mañana/tarde/noche
        ═══════════════════════════════════════ */}
        <Animated.View entering={FadeInUp.delay(220).springify()} style={{ marginTop: 24, paddingHorizontal: Spacing.md }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 2, marginBottom: 16 }}>
            AGENDA
          </Text>

          {(() => {
            const segments = segmentAgenda(day.agendaItems);
            const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

            if (segments.length === 0) {
              return (
                <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
                  <Ionicons name="calendar-outline" size={28} color="#333" />
                  <Text style={{ color: '#666', fontSize: 13, fontFamily: Fonts.regular }}>
                    Activa un protocolo para ver tu agenda
                  </Text>
                </View>
              );
            }

            return segments.map(segment => (
              <View key={segment.label} style={{ marginBottom: 20 }}>
                {/* Header de segmento */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Ionicons name={segment.icon} size={14} color={segment.color} />
                  <Text style={{ color: segment.color, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 2 }}>
                    {segment.label}
                  </Text>
                  <View style={{ flex: 1, height: 0.5, backgroundColor: `${segment.color}30`, marginLeft: 8 }} />
                </View>

                {/* Items */}
                {segment.items.map((item, idx) => {
                  const itemMin = toMinutes(item.time);
                  const isPast = itemMin < nowMin;
                  const isCurrent = Math.abs(itemMin - nowMin) < 30;
                  const isCompleted = item.completed;

                  // Indicador "AHORA" entre items
                  let showNowLine = false;
                  if (idx > 0) {
                    const prevMin = toMinutes(segment.items[idx - 1].time);
                    if (prevMin < nowMin && itemMin >= nowMin) showNowLine = true;
                  }

                  return (
                    <View key={item.id}>
                      {/* Línea "AHORA" */}
                      {showNowLine && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                          <View style={{ width: 42 }} />
                          <View style={{ width: 20, alignItems: 'center', marginRight: 10 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#a8e02a' }} />
                          </View>
                          <View style={{ flex: 1, height: 1, backgroundColor: '#a8e02a', opacity: 0.3 }} />
                          <Text style={{ color: '#a8e02a', fontSize: 9, fontFamily: Fonts.bold, marginLeft: 6 }}>AHORA</Text>
                        </View>
                      )}

                      <View style={{
                        flexDirection: 'row', alignItems: 'center', marginBottom: 6,
                        opacity: isCompleted ? 0.4 : isPast && !isCurrent ? 0.6 : 1,
                      }}>
                        {/* Hora */}
                        <Text style={{
                          width: 42, fontSize: 12, fontFamily: Fonts.semiBold,
                          color: isCurrent ? '#a8e02a' : isPast ? '#555' : '#999',
                          fontVariant: ['tabular-nums' as const],
                        }}>
                          {fmtTime(item.time)}
                        </Text>

                        {/* Dot de timeline */}
                        <View style={{ width: 20, alignItems: 'center', marginRight: 10 }}>
                          <View style={{
                            width: isCurrent ? 10 : 6, height: isCurrent ? 10 : 6,
                            borderRadius: isCurrent ? 5 : 3,
                            backgroundColor: isCompleted ? '#a8e02a' : isCurrent ? '#a8e02a' : isPast ? '#333' : '#222',
                          }} />
                        </View>

                        {/* Card */}
                        <View style={{
                          flex: 1, flexDirection: 'row', alignItems: 'center',
                          backgroundColor: isCurrent ? 'rgba(168,224,42,0.08)' : CARD.bg,
                          borderRadius: Radius.card, padding: 12,
                          borderLeftWidth: 3,
                          borderLeftColor: isCompleted ? '#a8e02a' : isCurrent ? '#a8e02a' : item.isSmart ? '#fbbf24' : '#1a1a1a',
                        }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              color: isCurrent ? '#a8e02a' : '#fff',
                              fontSize: FontSizes.md, fontFamily: isCurrent ? Fonts.bold : Fonts.semiBold,
                              textDecorationLine: isCompleted ? 'line-through' : 'none',
                            }}>
                              {item.isSmart ? '⚡ ' : ''}{item.name}
                            </Text>
                            {item.subtitle ? (
                              <Text style={{ color: '#666', fontSize: 10, fontFamily: Fonts.regular, marginTop: 2 }} numberOfLines={1}>
                                {item.subtitle}
                              </Text>
                            ) : null}
                          </View>

                          {/* Checkbox */}
                          <Pressable onPress={() => toggleAgendaItem(item.id)} hitSlop={16} style={{ marginLeft: 10 }}>
                            {isCompleted ? (
                              <Ionicons name="checkmark-circle" size={26} color="#a8e02a" />
                            ) : (
                              <View style={{
                                width: 26, height: 26, borderRadius: 13,
                                borderWidth: 2,
                                borderColor: isCurrent ? 'rgba(168,224,42,0.4)' : 'rgba(255,255,255,0.1)',
                                justifyContent: 'center', alignItems: 'center',
                              }}>
                                {isCurrent && (
                                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(168,224,42,0.3)' }} />
                                )}
                              </View>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ));
          })()}
        </Animated.View>

        {/* Espaciado inferior para tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Tour de onboarding */}
      {showTour && <AppTour onComplete={() => setShowTour(false)} />}

      {/* ARGOS dual FAB: mic + chat */}
      <View style={{ position: 'absolute', bottom: 90, right: 20, zIndex: 100, alignItems: 'flex-end' }}>
        {/* Response bubble (temporal) */}
        {voiceResponse ? (
          <Pressable
            onPress={() => setVoiceResponse('')}
            style={{
              backgroundColor: '#0a0a0a', borderRadius: 16, padding: 14,
              marginBottom: 8, maxWidth: 280,
              borderWidth: 1, borderColor: 'rgba(168,224,42,0.2)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Ionicons name="eye" size={12} color="#a8e02a" />
              <Text style={{ color: '#a8e02a', fontSize: 9, fontWeight: '700' }}>ARGOS</Text>
            </View>
            <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 19 }} numberOfLines={6}>
              {voiceResponse}
            </Text>
          </Pressable>
        ) : null}

        {voiceLoading ? (
          <View style={{
            backgroundColor: '#0a0a0a', borderRadius: 12, padding: 10,
            marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
            borderWidth: 1, borderColor: 'rgba(168,224,42,0.2)',
          }}>
            <ActivityIndicator size="small" color="#a8e02a" />
            <Text style={{ color: '#a8e02a', fontSize: 12 }}>ARGOS piensa...</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {/* Mic button */}
          <VoiceButton onTranscript={handleQuickVoice} variant="fab" />
          {/* Chat button */}
          <Pressable
            onPress={() => { haptic.medium(); router.push('/argos-chat'); }}
            style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: 'rgba(168,224,42,0.15)',
              justifyContent: 'center', alignItems: 'center',
              borderWidth: 1, borderColor: 'rgba(168,224,42,0.2)',
            }}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#a8e02a" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingBottom: 0,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topBarIcon: {
    padding: Spacing.xs,
  },
  brandLabel: {
    color: '#a8e02a',
    letterSpacing: 3,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
  },

  // ── HERO ──
  heroBg: {},
  heroBgImage: {
    opacity: 0.85,
  },
  heroGradient: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  heroGreetingWrap: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  heroGreeting: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroName: {
    fontSize: 36,
    fontFamily: Fonts.extraBold,
    color: '#fff',
    letterSpacing: 1,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroDate: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  protocolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(168,224,42,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.2)',
  },
  protocolPillText: {
    color: '#a8e02a',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  heroScoreWrap: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  heroScoreInfo: {
    gap: 4,
  },
  heroElectronNum: {
    fontSize: 22,
    fontFamily: Fonts.bold,
  },
  heroElectronSlash: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.4)',
  },
  heroScoreLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 3,
    marginTop: 4,
  },

  // ── Secciones ──
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    letterSpacing: 3,
  },
  sectionSubtitle: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: Colors.textMuted,
  },

  // ── Próximo electrón ──
  nextElectronCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(168,224,42,0.2)',
    padding: Spacing.md,
    shadowColor: '#a8e02a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  nextElectronHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  nextElectronIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextElectronText: {
    flex: 1,
  },
  nextElectronLabel: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 2,
  },
  nextElectronName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  nextElectronDesc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  nextElectronBtn: {
    backgroundColor: '#a8e02a',
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  nextElectronBtnText: {
    color: '#000',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  missionCompleteCard: {
    backgroundColor: 'rgba(168,224,42,0.08)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.2)',
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  missionCompleteText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#a8e02a',
  },
  missionCompleteSubtext: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
  },

  // ── Electron grid ──
  electronGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  electronCard: {
    height: 100,
    backgroundColor: CARD.bg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: Spacing.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  electronIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  electronName: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  electronDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  electronExpandedPanel: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    gap: 4,
  },
  electronExpandedDesc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  electronExpandedWeight: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: Colors.textMuted,
  },
  electronExpandedLink: {
    marginTop: 4,
  },
  electronExpandedLinkText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#a8e02a',
  },

  // ── Cuantitativos ──
  quantGrid: {
    gap: Spacing.sm,
  },
  quantCard: {
    backgroundColor: CARD.bg,
    borderRadius: Radius.card,
    padding: Spacing.sm + 2,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
  },
  quantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  quantCardName: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
  },
  quantCardValue: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  quantTrack: {
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  quantFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ── Sugerencia ──
  suggestionCard: {
    backgroundColor: 'rgba(239,159,39,0.08)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(239,159,39,0.2)',
    padding: Spacing.md,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  suggestionAction: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#EF9F27',
    marginTop: 6,
  },

  // ── Edit day button ──
  editDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 20,
  },
  editDayBtnText: {
    color: '#666',
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },

  // ── Agenda ──
  agendaTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  agendaTimeline: {
    paddingBottom: Spacing.md,
  },
  agendaRow: {
    flexDirection: 'row',
    minHeight: 72,
  },
  agendaLineCol: {
    width: 28,
    alignItems: 'center',
  },
  agendaLineSeg: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  agendaDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: CARD.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaCard: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: CARD.bg,
    borderRadius: Radius.card,
    borderLeftWidth: 3,
    padding: Spacing.sm + 2,
  },
  agendaCardDone: {
    opacity: 0.5,
  },
  agendaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  agendaTime: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },
  agendaCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agendaCardContent: {
    flex: 1,
  },
  agendaItemName: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  agendaItemNameDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  agendaSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  agendaEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 8,
  },
  agendaEmptyText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
  },
  agendaEmptySubtext: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
