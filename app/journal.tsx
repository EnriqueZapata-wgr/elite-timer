/**
 * Journaling — Escritura reflexiva con prompts rotativos y mood tracking.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { BackButton } from '@/src/components/ui/BackButton';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS, ATP_BRAND, withOpacity, SEMANTIC } from '@/src/constants/brand';

const AMBER = CATEGORY_COLORS.optimization;

// ═══ PROMPTS ═══

const PROMPTS = [
  '¿Qué fue lo más estresante de hoy? Escríbelo sin filtro. No busques soluciones — solo sácalo de la cabeza.',
  '¿Qué te preocupa en este momento? Escribe todo, sin censura.',
  'Si pudieras decirle algo a la persona que más te frustró hoy, ¿qué sería?',
  'Escribe 3 cosas por las que estás agradecido hoy. Pueden ser pequeñas.',
  '¿Quién hizo algo bueno por ti recientemente? ¿Se lo dijiste?',
  '¿Qué parte de tu cuerpo funcionó bien hoy? Agradécele.',
  '¿Qué aprendiste hoy que no sabías ayer?',
  'Si repitieras hoy, ¿qué harías diferente?',
  '¿Qué hábito de tu protocolo te costó más hoy? ¿Por qué?',
  '¿Cómo te quieres sentir dentro de 90 días? Descríbelo en detalle.',
  'Si tu yo de hace 1 año te viera hoy, ¿qué diría?',
  '¿Qué es lo único que, si lo hicieras todos los días, cambiaría todo?',
  '¿Cómo se siente tu cuerpo en este momento? Escanéalo de pies a cabeza.',
  '¿Dormiste bien anoche? Si no, ¿qué crees que lo causó?',
  '¿Qué comiste hoy que te hizo sentir bien? ¿Y qué te hizo sentir mal?',
  '¿Tuviste una conversación significativa hoy? ¿Con quién?',
  '¿Hay algo que necesitas decir y no has dicho?',
  '¿Por qué empezaste ATP? ¿Sigue siendo la misma razón?',
  '¿Qué te daría más energía: hacer algo nuevo o dejar de hacer algo viejo?',
  'Escribe una carta a tu yo de dentro de 6 meses.',
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

// ═══ TIPOS ═══

interface JournalEntry {
  id: string;
  date: string;
  prompt: string | null;
  content: string;
  mood_before: number | null;
  mood_after: number | null;
  created_at: string;
}

// ═══ COMPONENTE ═══

export default function JournalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [promptIdx, setPromptIdx] = useState(getDayOfYear() % PROMPTS.length);
  const [content, setContent] = useState('');
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const canSave = content.trim().length >= 20;

  useFocusEffect(useCallback(() => { if (userId) loadEntries(); }, [userId]));

  const loadEntries = async () => {
    const { data } = await supabase
      .from('journal_entries').select('*')
      .eq('user_id', userId).order('date', { ascending: false }).limit(7);
    setEntries((data ?? []) as JournalEntry[]);
  };

  const handleSave = async () => {
    if (!canSave || !userId) return;
    haptic.medium();
    setSaving(true);
    try {
      await supabase.from('journal_entries').insert({
        user_id: userId,
        date: new Date().toISOString().split('T')[0],
        prompt: PROMPTS[promptIdx],
        content: content.trim(),
        mood_before: moodBefore,
        mood_after: moodAfter,
      });
      haptic.success();
      setContent('');
      setMoodBefore(null);
      setMoodAfter(null);
      loadEntries();
      Alert.alert('Guardado', 'Tu entrada de hoy se ha guardado.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar.');
    }
    setSaving(false);
  };

  const nextPrompt = () => {
    haptic.light();
    setPromptIdx((promptIdx + 1) % PROMPTS.length);
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.header}>
        <BackButton color={AMBER} />
        <EliteText style={s.title}>JOURNALING</EliteText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <EliteText variant="caption" style={s.date}>{today}</EliteText>

        {/* Prompt */}
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <View style={s.promptCard}>
            <View style={s.promptHeader}>
              <Ionicons name="bulb-outline" size={16} color={AMBER} />
              <EliteText variant="caption" style={{ color: AMBER, fontFamily: Fonts.bold, fontSize: FontSizes.xs }}>PROMPT DE HOY</EliteText>
              <Pressable onPress={nextPrompt} hitSlop={8}>
                <Ionicons name="refresh-outline" size={16} color={TEXT_COLORS.muted} />
              </Pressable>
            </View>
            <EliteText style={s.promptText}>{PROMPTS[promptIdx]}</EliteText>
          </View>
        </Animated.View>

        {/* Mood antes */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <EliteText variant="caption" style={s.label}>¿Cómo te sientes ahora?</EliteText>
          <MoodSelector value={moodBefore} onChange={setMoodBefore} />
        </Animated.View>

        {/* Textarea */}
        <Animated.View entering={FadeInUp.delay(150).springify()}>
          <TextInput
            style={s.textArea}
            placeholder="Escribe aquí..."
            placeholderTextColor={TEXT_COLORS.muted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
          <EliteText variant="caption" style={s.charCount}>
            {content.length < 20 ? `Mínimo 20 caracteres (${content.length}/20)` : `${content.length} caracteres`}
          </EliteText>
        </Animated.View>

        {/* Mood después */}
        {content.length >= 20 && (
          <Animated.View entering={FadeInUp.springify()}>
            <EliteText variant="caption" style={s.label}>¿Cómo te sientes después de escribir?</EliteText>
            <MoodSelector value={moodAfter} onChange={setMoodAfter} />
          </Animated.View>
        )}

        {/* Guardar */}
        <AnimatedPressable onPress={handleSave} disabled={!canSave || saving} style={[s.saveBtn, !canSave && { opacity: 0.4 }]}>
          <Ionicons name="save-outline" size={18} color={Colors.black} />
          <EliteText style={s.saveBtnText}>{saving ? 'Guardando...' : 'Guardar entrada'}</EliteText>
        </AnimatedPressable>

        {/* Ciencia */}
        <View style={s.scienceBox}>
          <Ionicons name="flask-outline" size={14} color={TEXT_COLORS.muted} />
          <EliteText variant="caption" style={s.scienceText}>
            Escribir lo que te preocupa reduce cortisol mediblemente en 24 horas. No es terapia — es fisiología.
          </EliteText>
        </View>

        {/* Historial */}
        {entries.length > 0 && (
          <View style={s.historySection}>
            <EliteText variant="caption" style={s.historyLabel}>ENTRADAS ANTERIORES</EliteText>
            {entries.map((entry, idx) => {
              const isExpanded = expandedEntry === entry.id;
              const dateStr = new Date(entry.date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
              return (
                <StaggerItem key={entry.id} index={idx}>
                  <Pressable onPress={() => { haptic.light(); setExpandedEntry(isExpanded ? null : entry.id); }} style={s.entryCard}>
                    <View style={s.entryHeader}>
                      <EliteText variant="caption" style={{ color: AMBER, fontFamily: Fonts.bold, fontSize: FontSizes.xs }}>{dateStr}</EliteText>
                      {entry.mood_before && entry.mood_after && (
                        <EliteText variant="caption" style={{ color: entry.mood_after > entry.mood_before ? SEMANTIC.success : TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>
                          {entry.mood_before} → {entry.mood_after}
                        </EliteText>
                      )}
                    </View>
                    <EliteText variant="caption" style={s.entryPreview} numberOfLines={isExpanded ? undefined : 2}>
                      {entry.content}
                    </EliteText>
                    {entry.prompt && isExpanded && (
                      <EliteText variant="caption" style={s.entryPrompt}>Prompt: {entry.prompt.slice(0, 60)}...</EliteText>
                    )}
                  </Pressable>
                </StaggerItem>
              );
            })}
          </View>
        )}

        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══ MOOD SELECTOR ═══

function MoodSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View style={s.moodRow}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => {
        const isActive = value === v;
        const color = v <= 3 ? SEMANTIC.error : v <= 6 ? SEMANTIC.warning : SEMANTIC.success;
        return (
          <Pressable key={v} onPress={() => { haptic.light(); onChange(v); }}
            style={[s.moodDot, isActive && { backgroundColor: color, borderColor: color }]}>
            {isActive && <EliteText style={{ color: Colors.black, fontSize: 9, fontFamily: Fonts.bold }}>{v}</EliteText>}
          </Pressable>
        );
      })}
    </View>
  );
}

// ═══ ESTILOS ═══

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs },
  title: { fontSize: FontSizes.hero, fontFamily: Fonts.extraBold, color: AMBER, letterSpacing: 3 },
  content: { paddingHorizontal: Spacing.md },
  date: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.md },

  // Prompt
  promptCard: { backgroundColor: withOpacity(AMBER, 0.08), borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: withOpacity(AMBER, 0.2), marginBottom: Spacing.md },
  promptHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  promptText: { color: TEXT_COLORS.primary, fontSize: FontSizes.md, lineHeight: 22, fontStyle: 'italic' },

  // Mood
  label: { color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, marginBottom: Spacing.xs, marginTop: Spacing.md },
  moodRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  moodDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: SURFACES.border, alignItems: 'center', justifyContent: 'center' },

  // Text area
  textArea: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    color: TEXT_COLORS.primary, fontFamily: Fonts.regular, fontSize: FontSizes.md,
    padding: Spacing.md, minHeight: 160, lineHeight: 22,
  },
  charCount: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs, textAlign: 'right', marginTop: Spacing.xs },

  // Save
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: AMBER, borderRadius: Radius.card, paddingVertical: Spacing.md, marginTop: Spacing.md,
  },
  saveBtnText: { color: Colors.black, fontFamily: Fonts.bold, fontSize: FontSizes.lg },

  // Science
  scienceBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: Spacing.md, padding: Spacing.sm },
  scienceText: { flex: 1, color: TEXT_COLORS.muted, fontSize: FontSizes.xs, lineHeight: 16 },

  // History
  historySection: { marginTop: Spacing.xl },
  historyLabel: { color: TEXT_COLORS.secondary, letterSpacing: 2, fontFamily: Fonts.bold, fontSize: FontSizes.xs, marginBottom: Spacing.sm },
  entryCard: { backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border, borderLeftWidth: 3, borderLeftColor: AMBER, padding: Spacing.md, marginBottom: Spacing.sm },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  entryPreview: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, lineHeight: 18 },
  entryPrompt: { color: TEXT_COLORS.muted, fontSize: FontSizes.xs, marginTop: Spacing.xs, fontStyle: 'italic' },
});
