/**
 * EventFormModal (#v13g F5) — formulario plano para CREAR o EDITAR un evento de agenda.
 * Campos: nombre · hora (HH:MM) · categoría (chips) · notificar (chips de minutos antes).
 * Sin drag-drop ni gestos: inputs + botones. Modal nativo centrado.
 */
import { useState } from 'react';
import { Modal, View, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND } from '@/src/constants/brand';
import { Spacing, FontSizes, Fonts, Radius } from '@/constants/theme';

export interface EventFormValue {
  name: string;
  time: string;            // 'HH:MM'
  category: string;
  notifyMinutesBefore: number;
}

interface Props {
  visible: boolean;
  /** Título del modal (ej. "Nuevo evento" o "Editar evento"). */
  title: string;
  /** Valores iniciales (para editar). Si se omite, formulario vacío (crear). */
  initial?: Partial<EventFormValue>;
  onSave: (value: EventFormValue) => void;
  onClose: () => void;
}

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'ritmo', label: 'Ritmo' },
  { key: 'nutricion', label: 'Nutrición' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'mente', label: 'Mente' },
  { key: 'sueño', label: 'Sueño' },
  { key: 'suplementos', label: 'Suplementos' },
  { key: 'hidratacion', label: 'Hidratación' },
  { key: 'custom', label: 'Otro' },
];

const NOTIFY_OPTIONS = [0, 5, 10, 15, 30, 60];

/** Normaliza '7:5' / '0700' / '7' → 'HH:MM' (clamp a rango válido). '' si no parseable. */
function normalizeTime(raw: string): string {
  const digits = (raw ?? '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  let h = 0; let m = 0;
  if (raw.includes(':')) {
    const [hh, mm] = raw.split(':');
    h = parseInt(hh, 10) || 0; m = parseInt(mm ?? '0', 10) || 0;
  } else if (digits.length <= 2) {
    h = parseInt(digits, 10) || 0;
  } else {
    h = parseInt(digits.slice(0, digits.length - 2), 10) || 0;
    m = parseInt(digits.slice(-2), 10) || 0;
  }
  h = Math.min(23, Math.max(0, h));
  m = Math.min(59, Math.max(0, m));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function EventFormModal({ visible, title, initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'custom');
  const [notify, setNotify] = useState<number>(initial?.notifyMinutesBefore ?? 0);

  const canSave = name.trim().length > 0 && normalizeTime(time) !== '';

  const handleSave = () => {
    if (!canSave) return;
    haptic.medium();
    onSave({ name: name.trim(), time: normalizeTime(time), category, notifyMinutesBefore: notify });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { /* eat tap */ }}>
          <EliteText style={styles.title}>{title}</EliteText>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Nombre */}
            <EliteText style={styles.label}>NOMBRE</EliteText>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="Ej. Meditación matutina"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.input}
            />

            {/* Hora */}
            <EliteText style={styles.label}>HORA (HH:MM)</EliteText>
            <TextInput
              value={time} onChangeText={setTime}
              onBlur={() => setTime((t) => normalizeTime(t) || t)}
              placeholder="07:00" placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numbers-and-punctuation" maxLength={5}
              style={styles.input}
            />

            {/* Categoría */}
            <EliteText style={styles.label}>CATEGORÍA</EliteText>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => { haptic.light(); setCategory(c.key); }}
                  style={[styles.chip, category === c.key && styles.chipActive]}
                >
                  <EliteText style={[styles.chipText, category === c.key && styles.chipTextActive]}>{c.label}</EliteText>
                </Pressable>
              ))}
            </View>

            {/* Notificar */}
            <EliteText style={styles.label}>NOTIFICAR ANTES</EliteText>
            <View style={styles.chipRow}>
              {NOTIFY_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => { haptic.light(); setNotify(n); }}
                  style={[styles.chip, notify === n && styles.chipActive]}
                >
                  <EliteText style={[styles.chipText, notify === n && styles.chipTextActive]}>
                    {n === 0 ? 'No' : `${n} min`}
                  </EliteText>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Acciones */}
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <EliteText style={styles.cancelText}>Cancelar</EliteText>
            </Pressable>
            <Pressable style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]} onPress={handleSave} disabled={!canSave}>
              <EliteText style={styles.saveText}>Guardar</EliteText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  card: { width: '100%', maxWidth: 360, maxHeight: '85%', backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.card, padding: Spacing.xl },
  title: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginBottom: Spacing.md, letterSpacing: 1 },
  label: { color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 1.5, marginTop: Spacing.md, marginBottom: Spacing.sm },
  input: { backgroundColor: '#000', borderRadius: Radius.sm, borderWidth: 0.5, borderColor: '#2a2a2a', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: '#fff', fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: '#000', borderWidth: 0.5, borderColor: '#2a2a2a' },
  chipActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  chipText: { color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  chipTextActive: { color: '#000' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.pill, backgroundColor: ATP_BRAND.lime },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.sm },
});
