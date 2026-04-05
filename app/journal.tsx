/**
 * Journal — Escritura reflexiva con 4 tipos: Gratitud, Visión, Estoico, Descarga.
 * Selector de tipo + formulario específico + mood tracking + historial.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { StaggerItem } from '@/src/components/ui/StaggerItem';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { useFocusEffect } from 'expo-router';

// ═══ CONSTANTES ═══

const PURPLE = '#7F77DD';

const JOURNAL_TYPES = [
  { key: 'gratitude', label: 'Gratitud', icon: 'heart-outline' as const, color: '#D4537E', description: '9 preguntas de agradecimiento' },
  { key: 'vision', label: 'Visión', icon: 'telescope-outline' as const, color: '#1D9E75', description: 'Tu futuro en 1, 3 y 5 años' },
  { key: 'stoic', label: 'Estoico', icon: 'library-outline' as const, color: PURPLE, description: 'Reflexión al estilo Séneca' },
  { key: 'work_dump', label: 'Descarga', icon: 'briefcase-outline' as const, color: '#EF9F27', description: 'Vacía pendientes de tu cabeza' },
] as const;

const STOIC_QUESTIONS = [
  '¿Qué hice bien hoy?',
  '¿Qué pude hacer mejor?',
  '¿Dónde caí en vicios?',
  '¿Dónde fui virtuoso?',
  '¿Qué aprendí del mundo?',
  '¿Qué aprendí de mí?',
];

const STOIC_QUOTES = [
  '"No es que tengamos poco tiempo, sino que perdemos mucho." — Séneca',
  '"La felicidad de tu vida depende de la calidad de tus pensamientos." — Marco Aurelio',
  '"Lo que nos perturba no son las cosas, sino nuestra opinión sobre ellas." — Epicteto',
  '"Sufres más en la imaginación que en la realidad." — Séneca',
  '"Primero dí lo que serías; luego haz lo que tengas que hacer." — Epicteto',
  '"El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor es ahora." — Marco Aurelio',
];

// ═══ COMPONENTE PRINCIPAL ═══

export default function JournalScreen() {
  const { user } = useAuth();

  // Modo: selector vs formulario
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [userSex, setUserSex] = useState<string>('male');

  // Estado de Gratitud
  const [gratPersonal, setGratPersonal] = useState(['', '', '']);
  const [gratProfessional, setGratProfessional] = useState(['', '', '']);
  const [gratSelf, setGratSelf] = useState(['', '', '']);

  // Estado de Visión
  const [vision1, setVision1] = useState('');
  const [vision3, setVision3] = useState('');
  const [vision5, setVision5] = useState('');

  // Estado de Estoico
  const [stoicAnswers, setStoicAnswers] = useState<string[]>(['', '', '', '', '', '']);

  // Estado de Descarga
  const [tasks, setTasks] = useState<string[]>(['']);
  const [freeform, setFreeform] = useState('');

  // Mood
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);

  // Cargar entradas y sexo al enfocar la pantalla
  useFocusEffect(useCallback(() => {
    if (user?.id) {
      loadEntries();
      supabase.from('client_profiles').select('biological_sex').eq('user_id', user.id).single()
        .then(({ data }) => { if (data?.biological_sex) setUserSex(data.biological_sex); }, () => {});
    }
  }, [user?.id]));

  async function loadEntries() {
    const { data } = await supabase.from('journal_entries').select('*')
      .eq('user_id', user?.id).order('created_at', { ascending: false }).limit(10);
    setEntries(data ?? []);
  }

  // Resetear todo el formulario
  function resetForm() {
    setGratPersonal(['', '', '']); setGratProfessional(['', '', '']); setGratSelf(['', '', '']);
    setVision1(''); setVision3(''); setVision5('');
    setStoicAnswers(['', '', '', '', '', '']);
    setTasks(['']); setFreeform('');
    setMoodBefore(null); setMoodAfter(null);
  }

  // Verificar si hay contenido suficiente para mostrar mood after
  function hasEnoughContent(): boolean {
    switch (selectedType) {
      case 'gratitude': return [...gratPersonal, ...gratProfessional, ...gratSelf].filter(Boolean).length >= 3;
      case 'vision': return [vision1, vision3, vision5].some(v => v.length >= 20);
      case 'stoic': return stoicAnswers.filter(Boolean).length >= 2;
      case 'work_dump': return tasks.filter(Boolean).length >= 1 || freeform.length >= 20;
      default: return false;
    }
  }

  // ═══ GUARDAR ═══

  async function handleSave() {
    haptic.medium();
    setSaving(true);
    let content = '';
    let structuredData: any = {};

    switch (selectedType) {
      case 'gratitude':
        content = [...gratPersonal, ...gratProfessional, ...gratSelf].filter(Boolean).join('\n');
        structuredData = { personal: gratPersonal, professional: gratProfessional, self: gratSelf };
        break;
      case 'vision':
        content = [vision1, vision3, vision5].filter(Boolean).join('\n\n');
        structuredData = { year1: vision1, year3: vision3, year5: vision5 };
        break;
      case 'stoic':
        content = stoicAnswers.filter(Boolean).join('\n');
        structuredData = { answers: stoicAnswers };
        break;
      case 'work_dump':
        content = [...tasks.filter(Boolean), freeform].filter(Boolean).join('\n');
        structuredData = { tasks: tasks.filter(Boolean).map(t => ({ text: t, done: false })), freeform };
        break;
    }

    if (!content.trim()) {
      Alert.alert('Vacío', 'Escribe algo antes de guardar.');
      setSaving(false);
      return;
    }

    try {
      await supabase.from('journal_entries').insert({
        user_id: user?.id,
        date: new Date().toISOString().split('T')[0],
        journal_type: selectedType,
        content,
        structured_data: structuredData,
        mood_before: moodBefore,
        mood_after: moodAfter,
      });
      haptic.success();
      Alert.alert('Guardado', 'Tu entrada se ha guardado.');
      setSelectedType(null);
      resetForm();
      loadEntries();
    } catch {
      Alert.alert('Error', 'No se pudo guardar.');
    }
    setSaving(false);
  }

  // ═══ RENDER ═══

  // Si hay tipo seleccionado, mostrar formulario
  if (selectedType) {
    const typeInfo = JOURNAL_TYPES.find(t => t.key === selectedType)!;
    return (
      <SafeAreaView style={s.screen}>
        <PillarHeader pillar="mind" title="Journal" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Botón volver */}
          <Pressable onPress={() => { haptic.light(); setSelectedType(null); resetForm(); }} style={s.backBtn}>
            <Ionicons name="arrow-back" size={18} color={TEXT_COLORS.secondary} />
            <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm }}>Volver</EliteText>
          </Pressable>

          {/* Título del tipo */}
          <Animated.View entering={FadeInUp.delay(50).springify()} style={s.formHeader}>
            <Ionicons name={typeInfo.icon} size={24} color={typeInfo.color} />
            <EliteText style={[s.formTitle, { color: typeInfo.color }]}>{typeInfo.label}</EliteText>
          </Animated.View>

          {/* Mood antes */}
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <EliteText variant="caption" style={s.label}>¿Cómo te sientes ahora?</EliteText>
            <MoodSelector value={moodBefore} onChange={setMoodBefore} />
          </Animated.View>

          {/* Formulario específico */}
          <Animated.View entering={FadeInUp.delay(150).springify()}>
            {selectedType === 'gratitude' && <GratitudeForm personal={gratPersonal} setPersonal={setGratPersonal} professional={gratProfessional} setProfessional={setGratProfessional} self={gratSelf} setSelf={setGratSelf} sex={userSex} />}
            {selectedType === 'vision' && <VisionForm v1={vision1} setV1={setVision1} v3={vision3} setV3={setVision3} v5={vision5} setV5={setVision5} />}
            {selectedType === 'stoic' && <StoicForm answers={stoicAnswers} setAnswers={setStoicAnswers} />}
            {selectedType === 'work_dump' && <WorkDumpForm tasks={tasks} setTasks={setTasks} freeform={freeform} setFreeform={setFreeform} />}
          </Animated.View>

          {/* Mood después */}
          {hasEnoughContent() && (
            <Animated.View entering={FadeInUp.springify()}>
              <EliteText variant="caption" style={s.label}>¿Cómo te sientes después de escribir?</EliteText>
              <MoodSelector value={moodAfter} onChange={setMoodAfter} />
            </Animated.View>
          )}

          {/* Botón guardar */}
          <AnimatedPressable onPress={handleSave} disabled={saving} style={[s.saveBtn, { backgroundColor: typeInfo.color }]}>
            <Ionicons name="save-outline" size={18} color={Colors.black} />
            <EliteText style={s.saveBtnText}>{saving ? 'Guardando...' : 'Guardar entrada'}</EliteText>
          </AnimatedPressable>

          <View style={{ height: Spacing.xxl * 2 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═══ SELECTOR DE TIPO ═══

  return (
    <SafeAreaView style={s.screen}>
      <PillarHeader pillar="mind" title="Journal" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <EliteText variant="caption" style={s.subtitle}>Elige tu práctica de hoy</EliteText>

        {JOURNAL_TYPES.map((type, idx) => (
          <StaggerItem key={type.key} index={idx}>
            <AnimatedPressable onPress={() => { haptic.light(); setSelectedType(type.key); }}>
              <View style={[s.typeCard, { borderLeftColor: type.color }]}>
                <Ionicons name={type.icon} size={22} color={type.color} />
                <View style={s.typeInfo}>
                  <EliteText style={s.typeLabel}>{type.label}</EliteText>
                  <EliteText variant="caption" style={s.typeDesc}>{type.description}</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={TEXT_COLORS.muted} />
              </View>
            </AnimatedPressable>
          </StaggerItem>
        ))}

        {/* Entradas recientes */}
        {entries.length > 0 && (
          <View style={s.recentSection}>
            <EliteText variant="caption" style={s.recentLabel}>ENTRADAS RECIENTES</EliteText>
            {entries.map((entry, idx) => {
              const typeInfo = JOURNAL_TYPES.find(t => t.key === entry.journal_type);
              const typeColor = typeInfo?.color ?? PURPLE;
              const typeLabel = typeInfo?.label ?? entry.journal_type ?? 'Libre';
              const dateStr = new Date(entry.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
              const preview = entry.content?.slice(0, 80) || '';
              return (
                <StaggerItem key={entry.id ?? idx} index={idx}>
                  <View style={s.entryCard}>
                    <View style={s.entryHeader}>
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontFamily: Fonts.bold, fontSize: FontSizes.xs }}>{dateStr}</EliteText>
                      <View style={[s.typeBadge, { backgroundColor: withOpacity(typeColor, 0.12) }]}>
                        <EliteText variant="caption" style={{ color: typeColor, fontSize: FontSizes.xs, fontFamily: Fonts.bold }}>{typeLabel}</EliteText>
                      </View>
                    </View>
                    <EliteText variant="caption" numberOfLines={2} style={s.entryPreview}>{preview}</EliteText>
                  </View>
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

// ═══ FORMULARIOS ═══

function GratitudeForm({ personal, setPersonal, professional, setProfessional, self, setSelf, sex }: {
  personal: string[]; setPersonal: (v: string[]) => void;
  professional: string[]; setProfessional: (v: string[]) => void;
  self: string[]; setSelf: (v: string[]) => void;
  sex?: string;
}) {
  const updateArr = (arr: string[], setter: (v: string[]) => void, idx: number, val: string) => {
    const copy = [...arr]; copy[idx] = val; setter(copy);
  };
  const isFemale = sex === 'female';
  const sections = [
    { title: 'Personal', data: personal, setter: setPersonal, placeholder: isFemale ? 'Algo por lo que estás agradecida...' : 'Algo por lo que estás agradecido...' },
    { title: 'Profesional', data: professional, setter: setProfessional, placeholder: 'En tu trabajo o proyectos...' },
    { title: isFemale ? 'A ti misma' : 'A ti mismo', data: self, setter: setSelf, placeholder: 'Algo que te reconoces...' },
  ];
  return (
    <View>
      {sections.map(sec => (
        <View key={sec.title} style={s.formSection}>
          <EliteText variant="caption" style={[s.sectionTitle, { color: '#D4537E' }]}>{sec.title}</EliteText>
          {sec.data.map((val, i) => (
            <TextInput key={i} style={s.input} value={val} onChangeText={v => updateArr(sec.data, sec.setter, i, v)}
              placeholder={`${i + 1}. ${sec.placeholder}`} placeholderTextColor={TEXT_COLORS.muted} />
          ))}
        </View>
      ))}
    </View>
  );
}

function VisionForm({ v1, setV1, v3, setV3, v5, setV5 }: {
  v1: string; setV1: (v: string) => void; v3: string; setV3: (v: string) => void; v5: string; setV5: (v: string) => void;
}) {
  const fields = [
    { label: 'En 1 año...', value: v1, setter: setV1, placeholder: '¿Dónde te ves en 1 año?' },
    { label: 'En 3 años...', value: v3, setter: setV3, placeholder: '¿Cómo será tu vida en 3 años?' },
    { label: 'En 5 años...', value: v5, setter: setV5, placeholder: '¿Cuál es tu visión a 5 años?' },
  ];
  return (
    <View>
      {fields.map(f => (
        <View key={f.label} style={s.formSection}>
          <EliteText variant="caption" style={[s.sectionTitle, { color: '#1D9E75' }]}>{f.label}</EliteText>
          <TextInput style={[s.input, { minHeight: 100 }]} value={f.value} onChangeText={f.setter}
            placeholder={f.placeholder} placeholderTextColor={TEXT_COLORS.muted} multiline textAlignVertical="top" />
        </View>
      ))}
    </View>
  );
}

function StoicForm({ answers, setAnswers }: { answers: string[]; setAnswers: (v: string[]) => void }) {
  const quoteIdx = new Date().getDate() % STOIC_QUOTES.length;
  const update = (idx: number, val: string) => { const copy = [...answers]; copy[idx] = val; setAnswers(copy); };
  return (
    <View>
      {/* Cita estoica rotativa */}
      <View style={s.quoteBox}>
        <Ionicons name="book-outline" size={14} color={PURPLE} />
        <EliteText variant="caption" style={s.quoteText}>{STOIC_QUOTES[quoteIdx]}</EliteText>
      </View>
      {STOIC_QUESTIONS.map((q, i) => (
        <View key={i} style={s.formSection}>
          <EliteText variant="caption" style={[s.sectionTitle, { color: PURPLE }]}>{q}</EliteText>
          <TextInput style={s.input} value={answers[i]} onChangeText={v => update(i, v)}
            placeholder="Tu reflexión..." placeholderTextColor={TEXT_COLORS.muted} multiline />
        </View>
      ))}
    </View>
  );
}

function WorkDumpForm({ tasks, setTasks, freeform, setFreeform }: {
  tasks: string[]; setTasks: (v: string[]) => void; freeform: string; setFreeform: (v: string) => void;
}) {
  const updateTask = (idx: number, val: string) => { const copy = [...tasks]; copy[idx] = val; setTasks(copy); };
  const removeTask = (idx: number) => { const copy = tasks.filter((_, i) => i !== idx); setTasks(copy.length ? copy : ['']); };
  const addTask = () => { haptic.light(); setTasks([...tasks, '']); };
  return (
    <View>
      <EliteText variant="caption" style={[s.sectionTitle, { color: '#EF9F27' }]}>Pendientes</EliteText>
      {tasks.map((t, i) => (
        <View key={i} style={s.taskRow}>
          <TextInput style={[s.input, { flex: 1 }]} value={t} onChangeText={v => updateTask(i, v)}
            placeholder={`Pendiente ${i + 1}...`} placeholderTextColor={TEXT_COLORS.muted} />
          <Pressable onPress={() => removeTask(i)} hitSlop={8} style={s.removeBtn}>
            <Ionicons name="close-circle" size={20} color={SEMANTIC.error} />
          </Pressable>
        </View>
      ))}
      <Pressable onPress={addTask} style={s.addTaskBtn}>
        <Ionicons name="add-circle-outline" size={18} color="#EF9F27" />
        <EliteText variant="caption" style={{ color: '#EF9F27', fontSize: FontSizes.sm }}>Agregar pendiente</EliteText>
      </Pressable>

      <EliteText variant="caption" style={[s.sectionTitle, { color: '#EF9F27', marginTop: Spacing.lg }]}>Descarga libre</EliteText>
      <TextInput style={[s.input, { minHeight: 120 }]} value={freeform} onChangeText={setFreeform}
        placeholder="Escribe todo lo que tengas en la cabeza..." placeholderTextColor={TEXT_COLORS.muted} multiline textAlignVertical="top" />
    </View>
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
  scroll: { paddingHorizontal: Spacing.md },
  subtitle: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginBottom: Spacing.md, marginTop: Spacing.xs },

  // Selector de tipo
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: SURFACES.border,
    borderLeftWidth: 3, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  typeInfo: { flex: 1 },
  typeLabel: { color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  typeDesc: { color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, marginTop: 2 },

  // Entradas recientes
  recentSection: { marginTop: Spacing.xl },
  recentLabel: { color: TEXT_COLORS.secondary, letterSpacing: 2, fontFamily: Fonts.bold, fontSize: FontSizes.xs, marginBottom: Spacing.sm },
  entryCard: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  typeBadge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  entryPreview: { color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, lineHeight: 18 },

  // Formulario
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md, marginTop: Spacing.xs },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  formTitle: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, letterSpacing: 1 },
  formSection: { marginBottom: Spacing.md },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1, marginBottom: Spacing.xs },
  input: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 0.5, borderColor: SURFACES.border,
    color: TEXT_COLORS.primary, fontFamily: Fonts.regular, fontSize: FontSizes.md,
    padding: Spacing.md, marginBottom: Spacing.xs, lineHeight: 22,
  },

  // Mood
  label: { color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, marginBottom: Spacing.xs, marginTop: Spacing.md },
  moodRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  moodDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: SURFACES.border, alignItems: 'center', justifyContent: 'center' },

  // Work dump
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  removeBtn: { paddingBottom: Spacing.xs },
  addTaskBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs, marginBottom: Spacing.md },

  // Estoico
  quoteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: withOpacity(PURPLE, 0.08), borderRadius: Radius.card,
    padding: Spacing.md, borderWidth: 1, borderColor: withOpacity(PURPLE, 0.2),
    marginBottom: Spacing.lg,
  },
  quoteText: { flex: 1, color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, lineHeight: 18, fontStyle: 'italic' },

  // Guardar
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderRadius: Radius.card, paddingVertical: Spacing.md, marginTop: Spacing.lg,
  },
  saveBtnText: { color: Colors.black, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
});
