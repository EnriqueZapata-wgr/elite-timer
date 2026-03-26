/**
 * Check-in emocional RULER — Reconocer → Etiquetar → Entender.
 * 3 pasos: cuadrante → emociones (con descripciones) → contexto.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import {
  QUADRANTS, EMOTIONS, CONTEXT_WHERE, CONTEXT_WHO, CONTEXT_DOING,
  type QuadrantKey, type Emotion,
} from '@/src/data/emotions-library';
import { saveCheckin, getTodayCheckins, type CheckinRecord } from '@/src/services/checkin-service';
import { toggleCompletion } from '@/src/services/protocol-service';
import { vibrateMedium } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';

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
  const qColor = qd?.color ?? '#888';

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
      vibrateMedium();
      setStep(4);
    } catch { /* */ }
    setSaving(false);
  };

  // === DONE ===
  if (step === 4) {
    return (
      <SafeAreaView style={styles.screen}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable
        onPress={() => { if (step > 1) setStep(step - 1); else router.back(); }}
        style={styles.backBtn}
      >
        <Ionicons name="chevron-back" size={28} color={Colors.textSecondary} />
      </Pressable>

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
                <Pressable key={q} onPress={() => handleQuadrant(q)}>
                  <LinearGradient
                    colors={[d.color + '25', d.color + '08', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.mapCell,
                      { borderColor: d.color + '20' },
                      isTopLeft && { borderTopLeftRadius: 20 },
                      isTopRight && { borderTopRightRadius: 20 },
                      isBottomLeft && { borderBottomLeftRadius: 20 },
                      isBottomRight && { borderBottomRightRadius: 20 },
                    ]}
                  >
                    <EliteText variant="caption" style={[styles.mapLabel, { color: d.color }]}>
                      {d.label}
                    </EliteText>
                    <EliteText variant="caption" style={styles.mapExamples}>
                      {d.examples.join(' · ')}
                    </EliteText>
                  </LinearGradient>
                </Pressable>
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

      {/* ═══ STEP 2: EMOCIONES (grid por niveles de energía) ═══ */}
      {step === 2 && quadrant && (() => {
        // Agrupar emociones por nivel de energía (alto → bajo)
        const quadrantEmotions = EMOTIONS.filter(e => e.quadrant === quadrant)
          .sort((a, b) => b.energy - a.energy || b.intensity - a.intensity);
        // Agrupar en filas por energía
        const energyRows = new Map<number, typeof quadrantEmotions>();
        for (const e of quadrantEmotions) {
          const row = e.energy;
          if (!energyRows.has(row)) energyRows.set(row, []);
          energyRows.get(row)!.push(e);
        }
        // Ordenar cada fila por intensidad
        for (const row of energyRows.values()) {
          row.sort((a, b) => b.intensity - a.intensity);
        }
        const sortedKeys = [...energyRows.keys()].sort((a, b) => b - a);

        return (
          <Animated.View entering={SlideInRight.duration(250)} exiting={SlideOutLeft.duration(200)} style={styles.stepFlex}>
            <EliteText style={[styles.mainTitle, { color: qColor }]}>{qd!.label}</EliteText>
            <EliteText variant="caption" style={styles.mainSub}>
              Elige 1 o 2 · mantén presionado para descripción
            </EliteText>

            {/* Ejes */}
            <View style={styles.axisLabels}>
              <EliteText variant="caption" style={styles.axisY}>↑ Más energía</EliteText>
              <EliteText variant="caption" style={styles.axisX}>← Más sutil · Más intenso →</EliteText>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.emotionScroll}>
              {sortedKeys.map(energyLevel => (
                <View key={energyLevel} style={styles.energyRow}>
                  {energyRows.get(energyLevel)!.map(e => {
                    const sel = selectedEmotions.includes(e.id);
                    return (
                      <Pressable
                        key={e.id}
                        onPress={() => toggleEmotion(e.id)}
                        onLongPress={() => setTooltip(e)}
                        delayLongPress={400}
                        style={[
                          styles.emotionPill,
                          { borderColor: sel ? qColor : qColor + '25' },
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
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              <EliteText variant="caption" style={styles.axisYBottom}>↓ Menos energía</EliteText>
              <View style={{ height: 80 }} />
            </ScrollView>

            {/* Tooltip de descripción */}
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
    </SafeAreaView>
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
  backBtn: {
    position: 'absolute', top: Spacing.xxl, left: Spacing.md, zIndex: 10, padding: Spacing.sm,
  },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingTop: Spacing.sm, marginBottom: Spacing.xs,
  },
  dotIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },

  stepFlex: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  mainTitle: { fontSize: 24, fontFamily: Fonts.extraBold, color: Colors.textPrimary, textAlign: 'center' },
  mainSub: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, marginBottom: Spacing.lg, fontSize: 13 },

  // Map
  mapGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'center',
  },
  mapCell: {
    width: CELL, height: CELL * 0.75, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.md,
  },
  mapLabel: { fontFamily: Fonts.bold, fontSize: 13, textAlign: 'center', marginBottom: 6 },
  mapExamples: { color: Colors.textSecondary, fontSize: 11, textAlign: 'center', lineHeight: 16 },

  // Recent
  recentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, marginTop: Spacing.lg,
  },
  recentLabel: { color: Colors.textSecondary, fontSize: 12 },
  recentCircle: { width: 14, height: 14, borderRadius: 7 },

  // Axis labels
  axisLabels: { alignItems: 'center', marginBottom: Spacing.xs },
  axisY: { color: Colors.textSecondary + '60', fontSize: 10, fontFamily: Fonts.semiBold },
  axisX: { color: Colors.textSecondary + '60', fontSize: 10, fontFamily: Fonts.semiBold, marginTop: 2 },
  axisYBottom: { color: Colors.textSecondary + '60', fontSize: 10, fontFamily: Fonts.semiBold, textAlign: 'center', marginTop: Spacing.sm },

  // Emotions grid por energía
  emotionScroll: { paddingBottom: 20 },
  energyRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs,
    justifyContent: 'center', marginBottom: Spacing.xs,
  },
  emotionPill: {
    paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.xs + 3,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  emotionText: { fontSize: 13 },

  // Tooltip
  tooltipOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
    zIndex: 30, padding: Spacing.lg,
  },
  tooltip: {
    backgroundColor: '#1a1a1a', borderRadius: 12, borderWidth: 1,
    padding: Spacing.md, maxWidth: 320,
  },
  tooltipTitle: { fontFamily: Fonts.bold, fontSize: 18, marginBottom: Spacing.xs },
  tooltipDesc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
  tooltipHint: { color: Colors.textSecondary + '60', fontSize: 11, textAlign: 'center', marginTop: Spacing.sm },

  nextBtn: {
    alignSelf: 'center', position: 'absolute', bottom: Spacing.lg,
    paddingHorizontal: Spacing.xl + Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  nextBtnText: { color: '#000', fontFamily: Fonts.extraBold, fontSize: 16, letterSpacing: 2 },

  // Selected pills
  selectedRow: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  selectedPill: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  selectedText: { fontFamily: Fonts.bold, fontSize: 14 },

  // Context
  ctxSection: { marginBottom: Spacing.md },
  ctxLabel: {
    color: Colors.textSecondary, fontFamily: Fonts.bold, letterSpacing: 2,
    fontSize: 11, marginBottom: Spacing.sm,
  },
  ctxRow: { flexDirection: 'row', gap: Spacing.xs, paddingRight: Spacing.md },
  ctxPill: {
    paddingHorizontal: Spacing.sm + 4, paddingVertical: Spacing.xs + 3,
    borderRadius: Radius.pill, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'transparent',
  },
  ctxText: { color: Colors.textSecondary, fontSize: 13 },

  noteInput: {
    backgroundColor: '#1a1a1a', borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    color: Colors.textPrimary, fontFamily: Fonts.regular, fontSize: 14,
    marginTop: Spacing.sm, borderWidth: 0.5, borderColor: '#2a2a2a',
  },

  registerBtn: {
    alignSelf: 'center', marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl + Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: Radius.pill, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  registerBtnText: { color: '#000', fontFamily: Fonts.extraBold, fontSize: 16, letterSpacing: 2 },

  // Done
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  donePulse: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  doneDot: { width: 32, height: 32, borderRadius: 16 },
  doneTitle: { fontSize: 22, fontFamily: Fonts.extraBold },
  doneSub: { color: Colors.textSecondary, fontSize: 14 },
  doneBtn: {
    borderWidth: 1, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, marginTop: Spacing.md,
  },
  doneBtnText: { fontFamily: Fonts.bold, letterSpacing: 2 },
});
