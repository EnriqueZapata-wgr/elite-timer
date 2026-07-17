/**
 * QuestionInput (Mega-Sprint D · D6) — biblioteca de inputs del Cuestionario Maestro.
 * Un componente que renderiza el input correcto según el tipo de pregunta.
 * Amigable tipo iOS (edición Enrique A.5): chips grandes, sliders visuales, cero
 * formulario burocrático. Incluye condition_status (C1) y repro_status (C2).
 */
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '@/src/utils/haptics';
import { ELEVATION, TEXT, ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import type { MasterQuizQuestion, ConditionStatus } from '@/src/constants/master-quiz-bank';

const STATUS_LABELS: { value: ConditionStatus; label: string; color: string }[] = [
  { value: 'activo', label: 'Activo', color: '#ef4444' },
  { value: 'remision', label: 'En remisión', color: '#fbbf24' },
  { value: 'resuelto', label: 'Resuelto', color: '#4ade80' },
];

interface Props {
  question: MasterQuizQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Los sub-inputs reciben la pregunta como `q` (menos verboso). */
interface SubProps {
  q: MasterQuizQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function QuestionInput({ question: q, value, onChange }: Props) {
  switch (q.type) {
    case 'visual_scale': return <ScaleInput q={q} value={value} onChange={onChange} />;
    case 'single': return <SingleInput q={q} value={value} onChange={onChange} />;
    case 'toggle': return <SingleInput q={q} value={value} onChange={onChange} />;
    case 'multi': return <MultiInput q={q} value={value} onChange={onChange} />;
    case 'number': return <NumberInput q={q} value={value} onChange={onChange} />;
    case 'text': return <TextInputBox q={q} value={value} onChange={onChange} />;
    case 'repro_status': return <SingleInput q={q} value={value} onChange={onChange} />;
    case 'condition_status': return <ConditionStatusInput q={q} value={value} onChange={onChange} />;
    default: return null;
  }
}

function ScaleInput({ q, value, onChange }: SubProps) {
  const min = q.min ?? 1, max = q.max ?? 5;
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <View>
      <View style={s.scaleRow}>
        {nums.map((n) => {
          const active = value === n;
          return (
            <Pressable key={n} onPress={() => { haptic.light(); onChange(n); }}
              style={[s.scaleDot, active && s.scaleDotActive]}>
              <Text style={[s.scaleDotText, active && s.scaleDotTextActive]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      {q.scaleLabels && (
        <View style={s.scaleLabelsRow}>
          <Text style={s.scaleLabel}>{q.scaleLabels[0]}</Text>
          <Text style={s.scaleLabel}>{q.scaleLabels[1]}</Text>
        </View>
      )}
    </View>
  );
}

function SingleInput({ q, value, onChange }: SubProps) {
  return (
    <View style={s.optionsCol}>
      {(q.options ?? []).map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable key={opt.value} onPress={() => { haptic.light(); onChange(opt.value); }}
            style={[s.optionRow, active && s.optionRowActive]}>
            <Text style={[s.optionText, active && s.optionTextActive]}>{opt.label}</Text>
            {active && <Ionicons name="checkmark-circle" size={20} color={ATP_BRAND.lime} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function MultiInput({ q, value, onChange }: SubProps) {
  const selected: string[] = Array.isArray(value) ? value as string[] : [];
  const toggle = (v: string) => {
    haptic.light();
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <View>
      {q.multiHelper && <Text style={s.helper}>(selecciona todas las que apliquen)</Text>}
      <View style={s.chipsWrap}>
        {(q.options ?? []).map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <Pressable key={opt.value} onPress={() => toggle(opt.value)}
              style={[s.chip, active && s.chipActive]}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NumberInput({ q, value, onChange }: SubProps) {
  return (
    <View style={s.numberBox}>
      <TextInput
        value={value != null ? String(value) : ''}
        onChangeText={(t) => {
          const n = parseFloat(t.replace(',', '.'));
          onChange(Number.isFinite(n) ? n : null);
        }}
        keyboardType="numeric"
        placeholder={q.placeholder ?? '0'}
        placeholderTextColor={TEXT.muted}
        style={s.numberInput}
      />
      {q.unit && <Text style={s.numberUnit}>{q.unit}</Text>}
    </View>
  );
}

function TextInputBox({ q, value, onChange }: SubProps) {
  return (
    <TextInput
      value={typeof value === 'string' ? value : ''}
      onChangeText={onChange}
      placeholder={q.placeholder ?? 'Escribe aquí…'}
      placeholderTextColor={TEXT.muted}
      style={s.textArea}
      multiline
    />
  );
}

/** C1 · lista de padecimientos, cada uno con su estado activo/remisión/resuelto. */
function ConditionStatusInput({ q, value, onChange }: SubProps) {
  const current: { condition: string; status: ConditionStatus; year?: number | null }[] =
    Array.isArray(value) ? value as any[] : [];
  const find = (c: string) => current.find((x) => x.condition === c);
  const setStatus = (condition: string, status: ConditionStatus) => {
    haptic.light();
    const existing = find(condition);
    if (existing?.status === status) {
      onChange(current.filter((x) => x.condition !== condition)); // toggle off
    } else if (existing) {
      onChange(current.map((x) => (x.condition === condition ? { ...x, status } : x)));
    } else {
      onChange([...current, { condition, status }]);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.helper}>Marca solo los que tengas, con su estado actual.</Text>
      {(q.options ?? []).map((opt) => {
        const sel = find(opt.value);
        return (
          <View key={opt.value} style={[s.condRow, sel && s.condRowActive]}>
            <Text style={s.condLabel}>{opt.label}</Text>
            <View style={s.condStatusRow}>
              {STATUS_LABELS.map((st) => {
                const on = sel?.status === st.value;
                return (
                  <Pressable key={st.value} onPress={() => setStatus(opt.value, st.value)}
                    style={[s.condStatusChip, on && { backgroundColor: withOpacity(st.color, 0.18), borderColor: st.color }]}>
                    <Text style={[s.condStatusText, on && { color: st.color }]}>{st.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  scaleRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  scaleDot: { flex: 1, aspectRatio: 1, maxWidth: 60, borderRadius: 14, borderWidth: 1, borderColor: ELEVATION[2].border, backgroundColor: ELEVATION[1].bg, alignItems: 'center', justifyContent: 'center' },
  scaleDotActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.15), borderColor: ATP_BRAND.lime },
  scaleDotText: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: TEXT.secondary },
  scaleDotTextActive: { color: ATP_BRAND.lime },
  scaleLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  scaleLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary },
  optionsCol: { gap: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  optionRowActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.08), borderColor: withOpacity(ATP_BRAND.lime, 0.4) },
  optionText: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  optionTextActive: { color: TEXT.primary },
  helper: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.tertiary, fontStyle: 'italic', marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 10 },
  chipActive: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderColor: withOpacity(ATP_BRAND.lime, 0.4) },
  chipText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.secondary },
  chipTextActive: { color: ATP_BRAND.lime },
  numberBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border, borderRadius: Radius.md, paddingHorizontal: Spacing.md },
  numberInput: { flex: 1, fontFamily: Fonts.bold, fontSize: 24, color: TEXT.primary, paddingVertical: 14 },
  numberUnit: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md, color: TEXT.tertiary },
  textArea: { minHeight: 100, backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border, borderRadius: Radius.md, padding: Spacing.md, fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.primary, textAlignVertical: 'top' },
  condRow: { backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border, borderRadius: Radius.md, padding: Spacing.md, gap: 8 },
  condRowActive: { borderColor: withOpacity(ATP_BRAND.lime, 0.3) },
  condLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  condStatusRow: { flexDirection: 'row', gap: 6 },
  condStatusChip: { flex: 1, borderWidth: 1, borderColor: ELEVATION[2].border, borderRadius: Radius.sm, paddingVertical: 6, alignItems: 'center', backgroundColor: ELEVATION[2].bg },
  condStatusText: { fontFamily: Fonts.semiBold, fontSize: 11, color: TEXT.tertiary },
});
