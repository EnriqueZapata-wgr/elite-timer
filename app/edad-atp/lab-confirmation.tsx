/**
 * Capa 4 del parser v2 — pantalla de confirmación pre-guardado.
 *
 * Tras extraer (sin guardar), el usuario VE todos los valores detectados con su estado
 * (✓ confiable / ⚠ revisar o convertido / ❓ poco claro o fuera de rango), puede editar
 * inline cualquiera, ve los auto-calculados, y solo al confirmar se guarda. Doctrina del
 * sprint: cero sorpresas — nada se guarda sin que el usuario lo apruebe.
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveConfirmedLabValues, deleteLabUpload } from '@/src/services/lab-service';
import { getReview, clearReview } from '@/src/services/edad-atp/lab-review-store';
import type { ProcessedItem } from '@/src/services/edad-atp/lab-parser-process';
import { parseDecimalInput } from '@/src/utils/number-helpers';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SEMANTIC } from '@/src/constants/brand';

// Etiquetas legibles de los biomarcadores más comunes (fallback: la propia key).
const LABELS: Record<string, string> = {
  glucose: 'Glucosa', hba1c: 'HbA1c', insulin: 'Insulina', cholesterol_total: 'Colesterol total',
  hdl: 'HDL', ldl: 'LDL', triglycerides: 'Triglicéridos', vldl: 'VLDL', apo_b: 'ApoB',
  tsh: 'TSH', t3_free: 'T3 libre', t4_free: 'T4 libre', testosterone: 'Testosterona',
  estradiol: 'Estradiol', cortisol: 'Cortisol', vitamin_d: 'Vitamina D', vitamin_b12: 'Vitamina B12',
  iron: 'Hierro', ferritin: 'Ferritina', folate: 'Folato', pcr: 'PCR', homocysteine: 'Homocisteína',
  creatinine: 'Creatinina', bun: 'BUN', urea: 'Urea', uric_acid: 'Ácido úrico',
  alt: 'ALT', ast: 'AST', ggt: 'GGT', alp: 'Fosfatasa alcalina', bilirubin: 'Bilirrubina',
  albumin: 'Albúmina', hemoglobin: 'Hemoglobina', hematocrit: 'Hematocrito', wbc: 'Leucocitos',
  platelets: 'Plaquetas', mcv: 'VCM', rdw: 'RDW', lymphocyte_pct: '% Linfocitos',
};
const DERIVED_LABELS: Record<string, string> = {
  ratio_tg_hdl: 'Ratio TG/HDL', indice_aterogenico: 'Índice aterogénico',
  indice_lipoproteinas: 'Índice lipoproteínas (LDL/HDL)', homa_ir: 'HOMA-IR', nlr: 'NLR',
  ffmi: 'FFMI', bmi: 'IMC', ratio_cintura_cadera: 'Ratio cintura/cadera',
  bun_creatinina_ratio: 'BUN/Creatinina', iron_saturation: 'Saturación de hierro',
};
const labelFor = (k: string) => LABELS[k] ?? k;

type Status = 'ok' | 'review' | 'flag';
function statusOf(it: ProcessedItem): Status {
  if (it.confidence === 'low' || !it.passedValidation) return 'flag';
  if (it.confidence === 'medium' || it.conversionMethod !== 'identity') return 'review';
  return 'ok';
}

const STATUS_META: Record<Status, { icon: any; color: string }> = {
  ok: { icon: 'checkmark-circle', color: Colors.neonGreen },
  review: { icon: 'alert-circle', color: SEMANTIC.warning },
  flag: { icon: 'help-circle', color: SEMANTIC.error },
};

export default function LabConfirmationScreen() {
  const { uploadId } = useLocalSearchParams<{ uploadId?: string }>();
  const analytics = useAnalytics();
  const review = uploadId ? getReview(uploadId) : undefined;

  const [edited, setEdited] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!review) {
    return (
      <Screen>
        <PillarHeader pillar="metrics" title="Confirmar laboratorio" />
        <View style={styles.emptyWrap}>
          <Ionicons name="document-outline" size={40} color={Colors.textMuted} />
          <EliteText variant="caption" style={styles.emptyText}>
            La lectura ya no está disponible. Vuelve a subir el estudio.
          </EliteText>
          <Pressable onPress={() => router.replace('/my-health')} style={styles.primaryBtn}>
            <EliteText variant="body" style={styles.primaryBtnText}>Volver a Mi Salud</EliteText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  /** Valor efectivo (con la edición del usuario aplicada) o null si no parsea. */
  const effectiveValue = (it: ProcessedItem): number | null => {
    const e = edited[it.key];
    if (e != null) return parseDecimalInput(e);
    return it.passedValidation ? it.valueCanonical : null; // flagged sin editar → no se guarda
  };

  async function handleConfirm() {
    if (!review) return;
    const confirmed = review.items
      .map((it) => ({ key: it.key, value: effectiveValue(it) }))
      .filter((c): c is { key: string; value: number } => c.value != null);

    setSaving(true);
    const res = await saveConfirmedLabValues(review.uploadId, confirmed, { labDate: review.labDate, labName: review.labName });
    setSaving(false);

    const editedCount = Object.keys(edited).length;
    analytics.track(ATP_EVENTS.LAB_PARSER_V2_CONFIRMED, {
      total: review.items.length,
      edited: editedCount,
      confirmed: 'error' in res ? 0 : res.extractedCount,
      rejected: 'error' in res ? 0 : (res.rejectedCount ?? 0),
      upload_id: review.uploadId,
    });

    if ('error' in res) { Alert.alert('Error', res.error); return; }
    clearReview(review.uploadId);
    haptic.success();
    const omitted = res.rejectedCount ?? 0;
    Alert.alert(
      '',
      `${res.extractedCount} valores guardados${omitted > 0 ? `, ${omitted} omitidos por no estar claros` : ''}. Tu Edad ATP se actualizó.`,
      [{ text: 'OK', onPress: () => router.replace('/my-health') }],
    );
  }

  function handleCancel() {
    if (!review) return;
    Alert.alert('Descartar lectura', '¿Descartar esta lectura y volver a subir el estudio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar', style: 'destructive',
        onPress: async () => {
          try { await deleteLabUpload(review.uploadId); } catch { /* */ }
          clearReview(review.uploadId);
          router.replace('/my-health');
        },
      },
    ]);
  }

  const startEdit = (it: ProcessedItem) => {
    haptic.light();
    setEdited((p) => ({ ...p, [it.key]: p[it.key] ?? (it.passedValidation ? String(it.valueCanonical) : '') }));
    setEditingKey(it.key);
  };

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Confirmar laboratorio" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.intro}>
          Detectamos estos valores en tu laboratorio. Revísalos y corrige lo que haga falta antes de guardar.
        </EliteText>

        {review.items.map((it) => {
          const st = statusOf(it);
          const meta = STATUS_META[st];
          const isEditing = editingKey === it.key;
          const display = edited[it.key] ?? (it.passedValidation ? String(it.valueCanonical) : '—');
          return (
            <View key={it.key} style={[styles.itemCard, { borderColor: meta.color + '30' }]}>
              <View style={styles.itemRow}>
                <Ionicons name={meta.icon} size={20} color={meta.color} />
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={styles.itemLabel}>{labelFor(it.key)}</EliteText>
                  {isEditing ? (
                    <View style={styles.editRow}>
                      <TextInput
                        style={styles.editInput}
                        value={edited[it.key] ?? ''}
                        onChangeText={(v) => setEdited((p) => ({ ...p, [it.key]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="valor"
                        placeholderTextColor={Colors.textMuted}
                        autoFocus
                      />
                      <EliteText variant="caption" style={styles.unit}>{it.unitCanonical}</EliteText>
                      <Pressable onPress={() => { haptic.light(); setEditingKey(null); }} style={styles.doneBtn}>
                        <EliteText variant="caption" style={styles.doneBtnText}>Listo</EliteText>
                      </Pressable>
                    </View>
                  ) : (
                    <EliteText variant="body" style={[styles.itemValue, { color: meta.color }]}>
                      {st === 'flag' && edited[it.key] == null ? 'valor poco claro' : `${display} ${it.unitCanonical}`}
                    </EliteText>
                  )}
                  {/* Nota de procedencia / conversión */}
                  {st === 'review' && it.conversionMethod !== 'identity' && (
                    <EliteText variant="caption" style={styles.note}>
                      {it.conversionMethod === 'heuristic'
                        ? `Ajustado automáticamente (${it.unitInDocument ?? 'sin unidad'} → ${it.unitCanonical})`
                        : `Convertido de ${it.unitInDocument ?? '?'} → ${it.unitCanonical}`}
                    </EliteText>
                  )}
                  {st === 'flag' && (
                    <EliteText variant="caption" style={styles.note}>
                      {!it.passedValidation
                        ? `Fuera del rango clínico${it.range ? ` (${it.range.min}–${it.range.max} ${it.range.unit})` : ''}. Captúralo a mano si lo conoces.`
                        : 'Lectura poco clara. Captúralo a mano si lo conoces.'}
                    </EliteText>
                  )}
                  {!isEditing && it.rawTextSnippet ? (
                    <EliteText variant="caption" style={styles.snippet}>Detectado: “{it.rawTextSnippet}”</EliteText>
                  ) : null}
                </View>
                {!isEditing && (
                  <Pressable onPress={() => startEdit(it)} style={styles.editBtn}>
                    <EliteText variant="caption" style={styles.editBtnText}>
                      {st === 'flag' ? 'Capturar' : 'Editar'}
                    </EliteText>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {/* Auto-calculados */}
        {review.derived.length > 0 && (
          <View style={styles.derivedCard}>
            <EliteText variant="body" style={styles.derivedTitle}>Auto-calculados</EliteText>
            {review.derived.map((d) => (
              <View key={d.key} style={styles.derivedRow}>
                <EliteText variant="caption" style={styles.derivedLabel}>{DERIVED_LABELS[d.key] ?? d.key}</EliteText>
                <EliteText variant="caption" style={styles.derivedValue}>{d.value}</EliteText>
              </View>
            ))}
          </View>
        )}

        <Pressable onPress={handleConfirm} disabled={saving} style={[styles.confirmBtn, saving && { opacity: 0.6 }]}>
          <EliteText variant="body" style={styles.confirmBtnText}>{saving ? 'Guardando…' : 'Confirmar y guardar'}</EliteText>
        </Pressable>
        <Pressable onPress={handleCancel} disabled={saving} style={styles.cancelBtn}>
          <EliteText variant="body" style={styles.cancelBtnText}>Cancelar y volver a subir</EliteText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  intro: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginBottom: Spacing.xs },
  itemCard: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  itemLabel: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  itemValue: { fontFamily: Fonts.bold, marginTop: 2 },
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 3 },
  snippet: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2, fontStyle: 'italic' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  editInput: {
    width: 90, textAlign: 'right', backgroundColor: '#000', borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 8, color: Colors.textPrimary,
    fontFamily: Fonts.semiBold, borderWidth: 1, borderColor: '#222',
  },
  unit: { color: Colors.textSecondary },
  doneBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 12 },
  doneBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  editBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(168,224,42,0.4)' },
  editBtnText: { color: Colors.neonGreen, fontFamily: Fonts.semiBold },
  derivedCard: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a', marginTop: Spacing.xs },
  derivedTitle: { color: Colors.textSecondary, fontFamily: Fonts.bold, fontSize: FontSizes.sm, marginBottom: Spacing.xs },
  derivedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  derivedLabel: { color: Colors.textSecondary },
  derivedValue: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  confirmBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  confirmBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  cancelBtn: { paddingVertical: Spacing.sm, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: Colors.textSecondary },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  emptyText: { color: Colors.textSecondary, textAlign: 'center' },
  primaryBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  primaryBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
