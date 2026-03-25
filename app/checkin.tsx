/**
 * Check-in emocional — 3 pasos: cuadrante → emociones → contexto.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import {
  QUADRANTS, EMOTIONS, CONTEXT_WHERE, CONTEXT_WHO, CONTEXT_DOING,
  type QuadrantKey,
} from '@/src/data/emotions-library';
import { saveCheckin, getTodayCheckins, type CheckinRecord } from '@/src/services/checkin-service';
import { toggleCompletion } from '@/src/services/protocol-service';
import { vibrateMedium } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

export default function CheckinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ protocolItemId?: string }>();

  const [step, setStep] = useState(1);
  const [quadrant, setQuadrant] = useState<QuadrantKey | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [ctxWhere, setCtxWhere] = useState<string | null>(null);
  const [ctxWho, setCtxWho] = useState<string | null>(null);
  const [ctxDoing, setCtxDoing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState<CheckinRecord[]>([]);

  useEffect(() => {
    getTodayCheckins().then(setRecentCheckins).catch(() => {});
  }, []);

  const qColor = quadrant ? QUADRANTS[quadrant].color : '#888';

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
      setStep(4); // done
    } catch { /* */ }
    setSaving(false);
  };

  // === STEP 4: DONE ===
  if (step === 4) {
    return (
      <SafeAreaView style={styles.screen}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.doneContainer}>
          <View style={[styles.doneDot, { backgroundColor: qColor }]} />
          <EliteText style={[styles.doneTitle, { color: qColor }]}>Check-in registrado</EliteText>
          <EliteText variant="caption" style={styles.doneSub}>
            {selectedEmotions.map(id => EMOTIONS.find(e => e.id === id)?.label).join(', ')}
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
      {/* Back */}
      <Pressable
        onPress={() => { if (step > 1) setStep(step - 1); else router.back(); }}
        style={styles.backBtn}
      >
        <Ionicons name="chevron-back" size={28} color={Colors.textSecondary} />
      </Pressable>

      {/* Progress dots */}
      <View style={styles.dots}>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.dot, i <= step && { backgroundColor: qColor || '#888' }]} />
        ))}
      </View>

      {/* === STEP 1: MAPA === */}
      {step === 1 && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.stepContainer}>
          <EliteText style={styles.stepTitle}>¿Cómo te sientes?</EliteText>
          <EliteText variant="caption" style={styles.stepSub}>Toca el cuadrante que más se acerque</EliteText>

          <View style={styles.mapGrid}>
            {(['high_pleasant', 'high_unpleasant', 'low_pleasant', 'low_unpleasant'] as QuadrantKey[]).map(q => {
              const qd = QUADRANTS[q];
              return (
                <Pressable
                  key={q}
                  onPress={() => handleQuadrant(q)}
                  style={({ pressed }) => [
                    styles.mapCell,
                    { backgroundColor: pressed ? qd.color + '30' : qd.colorLight },
                    { borderColor: qd.color + '30' },
                  ]}
                >
                  <EliteText variant="caption" style={[styles.mapCellLabel, { color: qd.color }]}>
                    {qd.label}
                  </EliteText>
                  <EliteText variant="caption" style={styles.mapCellDesc}>
                    {qd.description}
                  </EliteText>
                </Pressable>
              );
            })}
          </View>

          {/* Recientes */}
          {recentCheckins.length > 0 && (
            <View style={styles.recentRow}>
              <EliteText variant="caption" style={styles.recentLabel}>Hoy:</EliteText>
              {recentCheckins.slice(0, 5).map(c => (
                <View key={c.id} style={[styles.recentDot, { backgroundColor: QUADRANTS[c.quadrant].color }]} />
              ))}
            </View>
          )}
        </Animated.View>
      )}

      {/* === STEP 2: EMOCIONES === */}
      {step === 2 && quadrant && (
        <Animated.View entering={SlideInRight.duration(250)} exiting={SlideOutLeft.duration(200)} style={styles.stepContainer}>
          <EliteText style={styles.stepTitle}>¿Qué palabra lo describe?</EliteText>
          <EliteText variant="caption" style={styles.stepSub}>Elige 1 o 2 emociones</EliteText>

          <View style={styles.emotionGrid}>
            {EMOTIONS.filter(e => e.quadrant === quadrant).map(e => {
              const sel = selectedEmotions.includes(e.id);
              return (
                <Pressable
                  key={e.id}
                  onPress={() => toggleEmotion(e.id)}
                  style={[
                    styles.emotionPill,
                    { borderColor: sel ? qColor : qColor + '30' },
                    sel && { backgroundColor: qColor + '30' },
                  ]}
                >
                  <EliteText variant="caption" style={[
                    styles.emotionPillText,
                    { color: sel ? qColor : Colors.textSecondary },
                  ]}>
                    {e.label}
                  </EliteText>
                </Pressable>
              );
            })}
          </View>

          {selectedEmotions.length > 0 && (
            <Pressable onPress={() => setStep(3)} style={[styles.nextBtn, { backgroundColor: qColor }]}>
              <EliteText style={styles.nextBtnText}>Siguiente</EliteText>
            </Pressable>
          )}
        </Animated.View>
      )}

      {/* === STEP 3: CONTEXTO === */}
      {step === 3 && quadrant && (
        <Animated.View entering={SlideInRight.duration(250)} style={styles.stepContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <EliteText style={styles.stepTitle}>Contexto</EliteText>
            <EliteText variant="caption" style={styles.stepSub}>Opcional — agrega detalles rápidos</EliteText>

            <EliteText variant="caption" style={styles.ctxLabel}>¿Dónde estás?</EliteText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.ctxRow}>
                {CONTEXT_WHERE.map(w => (
                  <Pressable key={w} onPress={() => setCtxWhere(ctxWhere === w ? null : w)}
                    style={[styles.ctxPill, ctxWhere === w && styles.ctxPillActive]}>
                    <EliteText variant="caption" style={[styles.ctxPillText, ctxWhere === w && styles.ctxPillTextActive]}>
                      {w}
                    </EliteText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <EliteText variant="caption" style={styles.ctxLabel}>¿Con quién?</EliteText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.ctxRow}>
                {CONTEXT_WHO.map(w => (
                  <Pressable key={w} onPress={() => setCtxWho(ctxWho === w ? null : w)}
                    style={[styles.ctxPill, ctxWho === w && styles.ctxPillActive]}>
                    <EliteText variant="caption" style={[styles.ctxPillText, ctxWho === w && styles.ctxPillTextActive]}>
                      {w}
                    </EliteText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <EliteText variant="caption" style={styles.ctxLabel}>¿Qué haces?</EliteText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.ctxRow}>
                {CONTEXT_DOING.map(w => (
                  <Pressable key={w} onPress={() => setCtxDoing(ctxDoing === w ? null : w)}
                    style={[styles.ctxPill, ctxDoing === w && styles.ctxPillActive]}>
                    <EliteText variant="caption" style={[styles.ctxPillText, ctxDoing === w && styles.ctxPillTextActive]}>
                      {w}
                    </EliteText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="¿Algo más? (opcional)"
              placeholderTextColor={Colors.textSecondary + '60'}
              maxLength={200}
            />

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: qColor }, saving && { opacity: 0.5 }]}
            >
              <EliteText style={styles.saveBtnText}>
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

const CELL_SIZE = (SCREEN_W - Spacing.md * 2 - Spacing.sm) / 2;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  backBtn: {
    position: 'absolute', top: Spacing.xxl, left: Spacing.md, zIndex: 10, padding: Spacing.sm,
  },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingTop: Spacing.sm, marginBottom: Spacing.sm,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#333',
  },

  stepContainer: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.xl },
  stepTitle: { fontSize: 24, fontFamily: Fonts.extraBold, color: Colors.textPrimary, textAlign: 'center' },
  stepSub: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs, marginBottom: Spacing.lg },

  // Map grid
  mapGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center',
  },
  mapCell: {
    width: CELL_SIZE, height: CELL_SIZE * 0.8, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.md,
  },
  mapCellLabel: { fontFamily: Fonts.bold, fontSize: 13, textAlign: 'center', marginBottom: Spacing.xs },
  mapCellDesc: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center' },

  // Recent
  recentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, marginTop: Spacing.lg,
  },
  recentLabel: { color: Colors.textSecondary, fontSize: 12 },
  recentDot: { width: 12, height: 12, borderRadius: 6 },

  // Emotions
  emotionGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center',
  },
  emotionPill: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  emotionPillText: { fontFamily: Fonts.semiBold, fontSize: 14 },
  nextBtn: {
    alignSelf: 'center', marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl + Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
  },
  nextBtnText: { color: '#000', fontFamily: Fonts.extraBold, fontSize: 16, letterSpacing: 2 },

  // Context
  ctxLabel: {
    color: Colors.textSecondary, fontFamily: Fonts.bold, letterSpacing: 2, fontSize: 11,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  ctxRow: { flexDirection: 'row', gap: Spacing.xs, paddingRight: Spacing.md },
  ctxPill: {
    paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill, backgroundColor: '#1a1a1a',
  },
  ctxPillActive: { backgroundColor: '#333' },
  ctxPillText: { color: Colors.textSecondary, fontSize: 13 },
  ctxPillTextActive: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },

  noteInput: {
    backgroundColor: '#1a1a1a', borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    color: Colors.textPrimary, fontFamily: Fonts.regular, fontSize: 14,
    marginTop: Spacing.lg, borderWidth: 0.5, borderColor: '#2a2a2a',
  },

  saveBtn: {
    alignSelf: 'center', marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl + Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: Radius.pill, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  saveBtnText: { color: '#000', fontFamily: Fonts.extraBold, fontSize: 16, letterSpacing: 2 },

  // Done
  doneContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
  },
  doneDot: { width: 24, height: 24, borderRadius: 12 },
  doneTitle: { fontSize: 22, fontFamily: Fonts.extraBold },
  doneSub: { color: Colors.textSecondary, fontSize: 14 },
  doneBtn: {
    borderWidth: 1, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, marginTop: Spacing.md,
  },
  doneBtnText: { fontFamily: Fonts.bold, letterSpacing: 2 },
});
