/**
 * Check-in emocional RULER — Reconocer → Etiquetar → Entender.
 * 3 pasos: cuadrante → emociones (con descripciones) → contexto.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput, Dimensions, DeviceEventEmitter } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import {
  QUADRANTS, EMOTIONS, CONTEXT_WHERE, CONTEXT_WHO, CONTEXT_DOING,
  type QuadrantKey, type Emotion,
} from '@/src/data/emotions-library';
import { saveCheckin, getTodayCheckins, type CheckinRecord } from '@/src/services/checkin-service';
import { toggleCompletion } from '@/src/services/protocol-service';
import { awardBooleanElectron } from '@/src/services/electron-service';
import { supabase } from '@/src/lib/supabase';
import { vibrateMedium } from '@/src/utils/haptics';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { Screen } from '@/src/components/ui/Screen';

const { width: SW } = Dimensions.get('window');
const CELL = (SW - Spacing.md * 2 - 2) / 2;

export default function CheckinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ protocolItemId?: string }>();

  const [step, setStep] = useState(1);
  const [quadrant, setQuadrant] = useState<QuadrantKey | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<Emotion | null>(null);
  const [ctxWhere, setCtxWhere] = useState<string | null>(null);
  const [ctxWho, setCtxWho] = useState<string | null>(null);
  const [ctxDoing, setCtxDoing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<CheckinRecord[]>([]);

  useEffect(() => { getTodayCheckins().then(setRecent).catch(() => {}); }, []);

  const qd = quadrant ? QUADRANTS[quadrant] : null;
  const qColor = qd?.color ?? TEXT_COLORS.secondary;

  const handleQuadrant = (q: QuadrantKey) => {
    setQuadrant(q);
    setSelectedEmotions([]);
    vibrateMedium();
    setStep(2);
  };

  const toggleEmotion = (id: string) => {
    setSelectedEmotions(prev => {
      if (prev.includes(id)) return prev.filter(e => e !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    if (!quadrant || selectedEmotions.length === 0) return;
    setSaving(true);
    try {
      await saveCheckin({
        quadrant,
        emotions: selectedEmotions,
        context_where: ctxWhere ?? undefined,
        context_who: ctxWho ?? undefined,
        context_doing: ctxDoing ?? undefined,
        note: note.trim() || undefined,
      });
      if (params.protocolItemId) {
        try { await toggleCompletion(params.protocolItemId); } catch { /* */ }
      }

      // Electrón por check-in emocional
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await awardBooleanElectron(user.id, 'checkin' as any);
          DeviceEventEmitter.emit('electrons_changed');
          DeviceEventEmitter.emit('day_changed');
        }
      } catch { /* silenciar */ }

      vibrateMedium();
      setStep(4);
    } catch { /* */ }
    setSaving(false);
  };

  // === DONE ===
  if (step === 4) {
    return (
      <Screen>
        <Animated.View entering={FadeIn.duration(400)} style={styles.doneContainer}>
          <View style={[styles.donePulse, { backgroundColor: qColor + '20' }]}>
            <View style={[styles.doneDot, { backgroundColor: qColor }]} />
          </View>
          <EliteText style={[styles.doneTitle, { color: qColor }]}>Check-in registrado</EliteText>
          <EliteText variant="caption" style={styles.doneSub}>
            {selectedEmotions.map(id => EMOTIONS.find(e => e.id === id)?.label).join(' · ')}
          </EliteText>
          <Pressable onPress={() => router.back()} style={[styles.doneBtn, { borderColor: qColor + '40' }]}>
            <EliteText variant="body" style={[styles.doneBtnText, { color: qColor }]}>Volver</EliteText>
          </Pressable>
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen>
      <PillarHeader pillar="mind" title="Check-in" />

      {/* Dots */}
      <View style={styles.dots}>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.dotIndicator, i <= step && { backgroundColor: qColor }]} />
        ))}
      </View>

      {/* ═══ STEP 1: MAPA ═══ */}
      {step === 1 && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.stepFlex}>
          <EliteText style={styles.mainTitle}>¿Cómo te sientes?</EliteText>
          <EliteText variant="caption" style={styles.mainSub}>Toca la zona que mejor describe tu estado</EliteText>

          <View style={styles.mapGrid}>
            {(['high_pleasant', 'high_unpleasant', 'low_pleasant', 'low_unpleasant'] as QuadrantKey[]).map((q, i) => {
              const d = QUADRANTS[q];
              const isTopLeft = i === 0;
              const isTopRight = i === 1;
              const isBottomLeft = i === 2;
              const isBottomRight = i === 3;
              return (
                <AnimatedPressable key={q} onPress={() => handleQuadrant(q)}>
                  <LinearGradient
                    colors={[d.color + '25', d.color + '08', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.mapCell,
                      { borderColor: d.color + '20' },
                      isTopLeft && { borderTopLeftRadius: Radius.lg },
                      isTopRight && { borderTopRightRadius: Radius.lg },
                      isBottomLeft && { borderBottomLeftRadius: Radius.lg },
                      isBottomRight && { borderBottomRightRadius: Radius.lg },
                    ]}
                  >
                    <EliteText variant="caption" style={[styles.mapLabel, { color: d.color }]}>
                      {d.label}
                    </EliteText>
                    <EliteText variant="caption" style={styles.mapExamples}>
                      {d.examples.join(' · ')}
                    </EliteText>
                  </LinearGradient>
                </AnimatedPressable>
              );
            })}
          </View>

          {recent.length > 0 && (
            <View style={styles.recentRow}>
              <EliteText variant="caption" style={styles.recentLabel}>Hoy:</EliteText>
              {recent.slice(0, 5).map(c => (
                <View key={c.id} style={[styles.recentCircle, { backgroundColor: QUADRANTS[c.quadrant].color }]} />
              ))}
            </View>
          )}
        </Animated.View>
      )}

      {/* ═══ STEP 2: EMOCIONES ═══ */}
      {step === 2 && quadrant && (() => {
        const all = EMOTIONS.filter(e => e.quadrant === quadrant);
        // Agrupar por terciles de intensidad RELATIVOS al cuadrante
        const sorted = [...all].sort((a, b) => b.intensity - a.intensity);
        const third = Math.ceil(sorted.length / 3);
        const high = sorted.slice(0, third);
        const mid = sorted.slice(third, third * 2);
        const low = sorted.slice(third * 2);

        const renderBand = (emotions: typeof all, label: string) => (
          <View style={styles.emotionBand}>
            <EliteText variant="caption" style={[styles.bandLabel, { color: qColor + '50' }]}>{label}</EliteText>
            <View style={styles.bandWrap}>
              {emotions.map(e => {
                const sel = selectedEmotions.includes(e.id);
                return (
                  <AnimatedPressable
                    key={e.id}
                    onPress={() => toggleEmotion(e.id)}
                    onLongPress={() => setTooltip(e)}
                    delayLongPress={400}
                    style={[
                      styles.emotionPill,
                      { borderColor: sel ? qColor + 'AA' : qColor + '25' },
                      sel && { backgroundColor: qColor + '30' },
                    ]}
                  >
                    <EliteText variant="caption" style={[
                      styles.emotionText,
                      { color: sel ? qColor : Colors.textSecondary },
                      sel && { fontFamily: Fonts.bold },
                    ]}>
                      {e.label}
                    </EliteText>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        );

        return (
          <Animated.View entering={SlideInRight.duration(250)} exiting={SlideOutLeft.duration(200)} style={styles.stepFlex}>
            <EliteText style={[styles.mainTitle, { color: qColor }]}>{qd!.label}</EliteText>
            <EliteText variant="caption" style={styles.mainSub}>
              Elige 1 o 2 · mantén presionado para descripción
            </EliteText>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
              {renderBand(high, '↑ Alta intensidad')}
              {renderBand(mid, '— Media')}
              {renderBand(low, '↓ Más sutil')}
            </ScrollView>

            {/* Tooltip */}
            {tooltip && (
              <Pressable style={styles.tooltipOverlay} onPress={() => setTooltip(null)}>
                <View style={[styles.tooltip, { borderColor: qColor + '40' }]}>
                  <EliteText variant="body" style={[styles.tooltipTitle, { color: qColor }]}>
                    {tooltip.label}
                  </EliteText>
                  <EliteText variant="caption" style={styles.tooltipDesc}>
                    {tooltip.description}
                  </EliteText>
                  <EliteText variant="caption" style={styles.tooltipHint}>
                    Toca para cerrar
                  </EliteText>
                </View>
              </Pressable>
            )}

            {selectedEmotions.length > 0 && !tooltip && (
              <Pressable onPress={() => setStep(3)} style={[styles.nextBtn, { backgroundColor: qColor }]}>
                <EliteText style={styles.nextBtnText}>Siguiente</EliteText>
              </Pressable>
            )}
          </Animated.View>
        );
      })()}

      {/* ═══ STEP 3: CONTEXTO ═══ */}
      {step === 3 && quadrant && (
        <Animated.View entering={SlideInRight.duration(250)} style={styles.stepFlex}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Emociones seleccionadas como recordatorio */}
            <View style={styles.selectedRow}>
              {selectedEmotions.map(id => {
                const e = EMOTIONS.find(em => em.id === id);
                return (
                  <View key={id} style={[styles.selectedPill, { backgroundColor: qColor + '25', borderColor: qColor + '40' }]}>
                    <EliteText variant="caption" style={[styles.selectedText, { color: qColor }]}>
                      {e?.label}
                    </EliteText>
                  </View>
                );
              })}
            </View>

            <ContextSection label="¿Dónde estás?" items={CONTEXT_WHERE} selected={ctxWhere} onSelect={v => setCtxWhere(ctxWhere === v ? null : v)} color={qColor} />
            <ContextSection label="¿Con quién?" items={CONTEXT_WHO} selected={ctxWho} onSelect={v => setCtxWho(ctxWho === v ? null : v)} color={qColor} />
            <ContextSection label="¿Qué estás haciendo?" items={CONTEXT_DOING} selected={ctxDoing} onSelect={v => setCtxDoing(ctxDoing === v ? null : v)} color={qColor} />

            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="¿Algo más? (opcional)"
              placeholderTextColor={Colors.textSecondary + '50'}
              maxLength={200}
            />

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[styles.registerBtn, { backgroundColor: qColor }, saving && { opacity: 0.5 }]}
            >
              <EliteText style={styles.registerBtnText}>
                {saving ? 'Guardando...' : 'REGISTRAR'}
              </EliteText>
            </Pressable>

            <View style={{ height: Spacing.xxl }} />
          </ScrollView>
        </Animated.View>
      )}
    </Screen>
  );
}

// === CONTEXT SECTION ===

function ContextSection({ label, items, selected, onSelect, color }: {
  label: string; items: string[]; selected: string | null;
  onSelect: (v: string) => void; color: string;
}) {
  return (
    <View style={styles.ctxSection}>
      <EliteText variant="caption" style={styles.ctxLabel}>{label}</EliteText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.ctxRow}>
          {items.map(item => {
            const sel = selected === item;
            return (
              <Pressable key={item} onPress={() => onSelect(item)}
                style={[styles.ctxPill, sel && { backgroundColor: color + '15', borderColor: color + '30' }]}>
                <EliteText variant="caption" style={[styles.ctxText, sel && { color, fontFamily: Fonts.semiBold }]}>
                  {item}
                </EliteText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingTop: Spacing.sm, marginBottom: Spacing.xs,
  },
  dotIndicator: { width: 8, height: 8, borderRadius: Radius.xs, backgroundColor: SURFACES.disabled },

  stepFlex: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  mainTitle: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, color: Colors.textPrimary, textAlign: 'center' },
  mainSub: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, marginBottom: Spacing.lg, fontSize: FontSizes.md },

  // Map
  mapGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'center',
  },
  mapCell: {
    width: CELL, height: CELL * 0.75, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.md,
  },
  mapLabel: { fontFamily: Fonts.bold, fontSize: FontSizes.md, textAlign: 'center', marginBottom: 6 },
  mapExamples: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 16 },

  // Recent
  recentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, marginTop: Spacing.lg,
  },
  recentLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  recentCircle: { width: 14, height: 14, borderRadius: 7 },

  // Emotion bands
  emotionBand: { marginBottom: Spacing.md },
  bandLabel: {
    fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 2,
    marginBottom: Spacing.xs, paddingLeft: 2,
  },
  bandWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs,
  },
  emotionPill: {
    paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.xs + 3,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  emotionText: { fontSize: FontSizes.md },

  // Tooltip
  tooltipOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
    zIndex: 30, padding: Spacing.lg,
  },
  tooltip: {
    backgroundColor: SURFACES.cardLight, borderRadius: Radius.card, borderWidth: 1,
    padding: Spacing.md, maxWidth: 320,
  },
  tooltipTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.xl, marginBottom: Spacing.xs },
  tooltipDesc: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22 },
  tooltipHint: { color: Colors.textSecondary + '60', fontSize: FontSizes.sm, textAlign: 'center', marginTop: Spacing.sm },

  nextBtn: {
    alignSelf: 'center', position: 'absolute', bottom: Spacing.lg,
    paddingHorizontal: Spacing.xl + Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  nextBtnText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.lg, letterSpacing: 2 },

  // Selected pills
  selectedRow: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  selectedPill: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  selectedText: { fontFamily: Fonts.bold, fontSize: FontSizes.md },

  // Context
  ctxSection: { marginBottom: Spacing.md },
  ctxLabel: {
    color: Colors.textSecondary, fontFamily: Fonts.bold, letterSpacing: 2,
    fontSize: FontSizes.sm, marginBottom: Spacing.sm,
  },
  ctxRow: { flexDirection: 'row', gap: Spacing.xs, paddingRight: Spacing.md },
  ctxPill: {
    paddingHorizontal: Spacing.sm + 4, paddingVertical: Spacing.xs + 3,
    borderRadius: Radius.pill, backgroundColor: SURFACES.cardLight, borderWidth: 1, borderColor: 'transparent',
  },
  ctxText: { color: Colors.textSecondary, fontSize: FontSizes.md },

  noteInput: {
    backgroundColor: SURFACES.cardLight, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    color: Colors.textPrimary, fontFamily: Fonts.regular, fontSize: FontSizes.md,
    marginTop: Spacing.sm, borderWidth: 0.5, borderColor: SURFACES.border,
  },

  registerBtn: {
    alignSelf: 'center', marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl + Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: Radius.pill, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  registerBtnText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.extraBold, fontSize: FontSizes.lg, letterSpacing: 2 },

  // Done
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  donePulse: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  doneDot: { width: 32, height: 32, borderRadius: Radius.md },
  doneTitle: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold },
  doneSub: { color: Colors.textSecondary, fontSize: FontSizes.md },
  doneBtn: {
    borderWidth: 1, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, marginTop: Spacing.md,
  },
  doneBtnText: { fontFamily: Fonts.bold, letterSpacing: 2 },
});
