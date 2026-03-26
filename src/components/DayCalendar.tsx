/**
 * DayCalendar — Vista de día tipo Google Calendar para mapear hábitos.
 */
import { useState, useRef } from 'react';
import { View, ScrollView, Pressable, TextInput, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { HABIT_CATEGORIES, type DailyHabit } from '@/src/services/daily-habits-service';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';

const HOUR_H = 60; // px por hora
const TOTAL_H = 24 * HOUR_H;
const LABEL_W = 50;

interface Props {
  habits: DailyHabit[];
  onAdd?: (data: { start_time: string; end_time: string; title: string; category: string; notes?: string }) => void;
  onEdit?: (habit: DailyHabit, data: Partial<DailyHabit>) => void;
  onDelete?: (habitId: string) => void;
  readOnly?: boolean;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatHourLabel(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export function DayCalendar({ habits, onAdd, onEdit, onDelete, readOnly }: Props) {
  const [modal, setModal] = useState<{ habit?: DailyHabit; startMin?: number } | null>(null);
  const [form, setForm] = useState({ start: '', end: '', title: '', category: 'other', notes: '' });
  const scrollRef = useRef<ScrollView>(null);

  const openAdd = (yPos: number) => {
    if (readOnly) return;
    const mins = Math.round(yPos / HOUR_H * 60 / 30) * 30; // snap to 30min
    const st = minToTime(mins);
    const en = minToTime(mins + 60);
    setForm({ start: st, end: en, title: '', category: 'other', notes: '' });
    setModal({ startMin: mins });
  };

  const openEdit = (h: DailyHabit) => {
    if (readOnly) return;
    setForm({
      start: h.start_time.slice(0, 5),
      end: h.end_time.slice(0, 5),
      title: h.title,
      category: h.category,
      notes: h.notes ?? '',
    });
    setModal({ habit: h });
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (modal?.habit) {
      onEdit?.(modal.habit, {
        start_time: form.start, end_time: form.end,
        title: form.title, category: form.category, notes: form.notes || null,
      } as any);
    } else {
      onAdd?.({ start_time: form.start, end_time: form.end, title: form.title, category: form.category, notes: form.notes });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (modal?.habit && typeof window !== 'undefined' && window.confirm('¿Eliminar esta actividad?')) {
      onDelete?.(modal.habit.id);
      setModal(null);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ height: TOTAL_H }}
        onLayout={() => scrollRef.current?.scrollTo({ y: 5 * HOUR_H, animated: false })}
      >
        {/* Horas + líneas */}
        <Pressable style={{ flex: 1 }} onPress={e => openAdd(e.nativeEvent.locationY)}>
          {Array.from({ length: 24 }, (_, h) => (
            <View key={h} style={[s.hourRow, { top: h * HOUR_H }]}>
              <EliteText variant="caption" style={s.hourLabel}>{formatHourLabel(h)}</EliteText>
              <View style={s.hourLine} />
            </View>
          ))}

          {/* Bloques */}
          {habits.map(h => {
            const startMin = timeToMin(h.start_time);
            let endMin = timeToMin(h.end_time);
            if (endMin <= startMin) endMin += 24 * 60; // overnight
            const top = startMin;
            const height = Math.min(endMin - startMin, TOTAL_H - startMin);
            const cat = HABIT_CATEGORIES[h.category] ?? HABIT_CATEGORIES.other;

            return (
              <Pressable
                key={h.id}
                onPress={e => { e.stopPropagation(); openEdit(h); }}
                style={[s.block, {
                  top,
                  height: Math.max(height, 20),
                  backgroundColor: cat.color + '25',
                  borderLeftColor: cat.color,
                }]}
              >
                <EliteText variant="caption" style={s.blockTitle} numberOfLines={1}>{h.title}</EliteText>
                {height >= 30 && (
                  <EliteText variant="caption" style={s.blockTime}>
                    {h.start_time.slice(0, 5)} - {h.end_time.slice(0, 5)}
                  </EliteText>
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </ScrollView>

      {/* Modal agregar/editar */}
      <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <Pressable style={s.overlay} onPress={() => setModal(null)}>
          <Pressable style={s.modal} onPress={e => e.stopPropagation()}>
            <EliteText variant="label" style={s.modalTitle}>
              {modal?.habit ? 'EDITAR ACTIVIDAD' : 'AGREGAR ACTIVIDAD'}
            </EliteText>

            <View style={s.timeRow}>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={s.fieldLabel}>Inicio</EliteText>
                <TextInput style={s.input} value={form.start} onChangeText={v => setForm(p => ({ ...p, start: v }))}
                  placeholder="HH:MM" placeholderTextColor="#333" />
              </View>
              <EliteText style={{ color: '#444', fontSize: 18, paddingTop: 18 }}>→</EliteText>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={s.fieldLabel}>Fin</EliteText>
                <TextInput style={s.input} value={form.end} onChangeText={v => setForm(p => ({ ...p, end: v }))}
                  placeholder="HH:MM" placeholderTextColor="#333" />
              </View>
            </View>

            <EliteText variant="caption" style={s.fieldLabel}>Actividad</EliteText>
            <TextInput style={s.input} value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))}
              placeholder="Ej: Desayuno, Oficina, Gym" placeholderTextColor="#333" />

            <EliteText variant="caption" style={s.fieldLabel}>Categoría</EliteText>
            <View style={s.catGrid}>
              {Object.entries(HABIT_CATEGORIES).map(([key, cat]) => (
                <Pressable key={key} onPress={() => setForm(p => ({ ...p, category: key }))}
                  style={[s.catPill, form.category === key && { backgroundColor: cat.color + '25', borderColor: cat.color + '50' }]}>
                  <View style={[s.catDot, { backgroundColor: cat.color }]} />
                  <EliteText variant="caption" style={[s.catText, form.category === key && { color: cat.color }]}>{cat.label}</EliteText>
                </Pressable>
              ))}
            </View>

            <EliteText variant="caption" style={s.fieldLabel}>Notas</EliteText>
            <TextInput style={[s.input, { height: 40 }]} value={form.notes}
              onChangeText={v => setForm(p => ({ ...p, notes: v }))} placeholder="Opcional" placeholderTextColor="#333" multiline />

            <View style={s.actions}>
              {modal?.habit && (
                <Pressable onPress={handleDelete}>
                  <EliteText variant="caption" style={{ color: '#E24B4A', fontSize: 12 }}>Eliminar</EliteText>
                </Pressable>
              )}
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setModal(null)}>
                <EliteText variant="caption" style={{ color: '#666' }}>Cancelar</EliteText>
              </Pressable>
              <Pressable onPress={handleSave} style={s.saveBtn}>
                <EliteText variant="caption" style={s.saveBtnText}>Guardar</EliteText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { height: 400, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0a0a0a', borderWidth: 0.5, borderColor: '#1a1a1a' },
  hourRow: { position: 'absolute', left: 0, right: 0, height: HOUR_H, flexDirection: 'row', alignItems: 'flex-start' },
  hourLabel: { width: LABEL_W, color: '#555', fontSize: 10, textAlign: 'right', paddingRight: 8, paddingTop: -6 },
  hourLine: { flex: 1, height: 0.5, backgroundColor: '#1a1a1a', marginTop: 0 },
  block: {
    position: 'absolute', left: LABEL_W + 4, right: 8, borderRadius: 6, borderLeftWidth: 3,
    paddingHorizontal: 8, paddingVertical: 3, justifyContent: 'center',
  },
  blockTitle: { color: '#fff', fontSize: 11, fontFamily: Fonts.semiBold },
  blockTime: { color: '#aaa', fontSize: 9 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modal: { backgroundColor: '#111', borderRadius: 16, padding: Spacing.md, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#222' },
  modalTitle: { color: Colors.neonGreen, letterSpacing: 2, fontSize: 12, marginBottom: Spacing.md },
  fieldLabel: { color: '#888', fontSize: 10, marginBottom: 4, marginTop: Spacing.sm },
  input: {
    backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2,
    color: '#fff', fontSize: 14, borderWidth: 0.5, borderColor: '#2a2a2a',
  },
  timeRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1, borderColor: '#333' },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catText: { color: '#888', fontSize: 11 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  saveBtn: { backgroundColor: Colors.neonGreen, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  saveBtnText: { color: '#000', fontFamily: Fonts.bold, fontSize: 13 },
});
