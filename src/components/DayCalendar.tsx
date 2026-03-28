/**
 * DayCalendar — Vista de día tipo Google Calendar para mapear hábitos.
 */
import { useState, useRef } from 'react';
import { View, ScrollView, Pressable, TextInput, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { HABIT_CATEGORIES, type DailyHabit } from '@/src/services/daily-habits-service';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';

// TimePicker con botones +/- para hora y minuto
function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Parsear con fallback a 0 si es NaN
  const parts = (value || '00:00').split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;

  const fmt = (hh: number, mm: number) =>
    `${String(((hh % 24) + 24) % 24).padStart(2, '0')}:${String(((mm % 60) + 60) % 60).padStart(2, '0')}`;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceLight, borderRadius: 8, padding: 8, borderWidth: 0.5, borderColor: '#2a2a2a' }}>
      <View style={{ alignItems: 'center', minWidth: 36 }}>
        <Pressable onPress={() => onChange(fmt(h + 1, m))} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-up" size={18} color={Colors.textSecondary} />
        </Pressable>
        <EliteText style={{ color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: 22, fontVariant: ['tabular-nums'] }}>
          {String(h).padStart(2, '0')}
        </EliteText>
        <Pressable onPress={() => onChange(fmt(h - 1, m))} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>
      <EliteText style={{ color: Colors.textMuted, fontSize: 22, fontFamily: Fonts.bold }}>:</EliteText>
      <View style={{ alignItems: 'center', minWidth: 36 }}>
        <Pressable onPress={() => onChange(fmt(h, m + 15))} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-up" size={18} color={Colors.textSecondary} />
        </Pressable>
        <EliteText style={{ color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: 22, fontVariant: ['tabular-nums'] }}>
          {String(m).padStart(2, '0')}
        </EliteText>
        <Pressable onPress={() => onChange(fmt(h, m - 15))} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

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
    // Asegurar formato HH:MM:00 para Supabase TIME
    const fmtTime = (t: string) => {
      const clean = t.replace(/[^0-9:]/g, '');
      const parts = clean.split(':');
      const h = Math.min(23, Math.max(0, parseInt(parts[0] || '0', 10)));
      const m = Math.min(59, Math.max(0, parseInt(parts[1] || '0', 10)));
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    };
    const startFmt = fmtTime(form.start);
    const endFmt = fmtTime(form.end);
    if (modal?.habit) {
      onEdit?.(modal.habit, {
        start_time: startFmt, end_time: endFmt,
        title: form.title, category: form.category, notes: form.notes || null,
      } as any);
    } else {
      onAdd?.({ start_time: startFmt, end_time: endFmt, title: form.title, category: form.category, notes: form.notes });
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
                <TimePicker value={form.start} onChange={v => setForm(p => ({ ...p, start: v }))} />
              </View>
              <EliteText style={{ color: Colors.disabled, fontSize: 18, paddingTop: 18 }}>→</EliteText>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={s.fieldLabel}>Fin</EliteText>
                <TimePicker value={form.end} onChange={v => setForm(p => ({ ...p, end: v }))} />
              </View>
            </View>

            <EliteText variant="caption" style={s.fieldLabel}>Actividad</EliteText>
            <TextInput style={s.input} value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))}
              placeholder="Ej: Desayuno, Oficina, Gym" placeholderTextColor={Colors.disabled} />

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
              onChangeText={v => setForm(p => ({ ...p, notes: v }))} placeholder="Opcional" placeholderTextColor={Colors.disabled} multiline />

            <View style={s.actions}>
              {modal?.habit && (
                <Pressable onPress={handleDelete}>
                  <EliteText variant="caption" style={{ color: Colors.error, fontSize: 12 }}>Eliminar</EliteText>
                </Pressable>
              )}
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setModal(null)}>
                <EliteText variant="caption" style={{ color: Colors.textMuted }}>Cancelar</EliteText>
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
  container: { height: 400, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.surfaceBase, borderWidth: 0.5, borderColor: Colors.surfaceLight },
  hourRow: { position: 'absolute', left: 0, right: 0, height: HOUR_H, flexDirection: 'row', alignItems: 'flex-start' },
  hourLabel: { width: LABEL_W, color: Colors.textMuted, fontSize: 10, textAlign: 'right', paddingRight: 8, paddingTop: -6 },
  hourLine: { flex: 1, height: 0.5, backgroundColor: Colors.surfaceLight, marginTop: 0 },
  block: {
    position: 'absolute', left: LABEL_W + 4, right: 8, borderRadius: 6, borderLeftWidth: 3,
    paddingHorizontal: 8, paddingVertical: 3, justifyContent: 'center',
  },
  blockTitle: { color: Colors.textPrimary, fontSize: 11, fontFamily: Fonts.semiBold },
  blockTime: { color: '#aaa', fontSize: 9 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modal: { backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { color: Colors.neonGreen, letterSpacing: 2, fontSize: 12, marginBottom: Spacing.md },
  fieldLabel: { color: Colors.textSecondary, fontSize: 10, marginBottom: 4, marginTop: Spacing.sm },
  input: {
    backgroundColor: Colors.surfaceLight, borderRadius: 8, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2,
    color: Colors.textPrimary, fontSize: 14, borderWidth: 0.5, borderColor: '#2a2a2a',
  },
  timeRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.disabled },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catText: { color: Colors.textSecondary, fontSize: 11 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  saveBtn: { backgroundColor: Colors.neonGreen, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  saveBtnText: { color: Colors.black, fontFamily: Fonts.bold, fontSize: 13 },
});
