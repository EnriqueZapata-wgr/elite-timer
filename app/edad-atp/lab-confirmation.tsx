/**
 * Capa 4 del parser v2 — pantalla de confirmación pre-guardado.
 *
 * Tras extraer (sin guardar), el usuario VE todos los valores detectados con su estado
 * (✓ confiable / ⚠ revisar o convertido / ❓ poco claro o fuera de rango), puede editar
 * inline cualquiera, ve los auto-calculados, y solo al confirmar se guarda. Doctrina del
 * sprint: cero sorpresas — nada se guarda sin que el usuario lo apruebe.
 */
import { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveConfirmedLabValues, deleteLabUpload, loadReviewFromDb, type LabReviewPayload } from '@/src/services/lab-service';
import { getReview, setReview, clearReview } from '@/src/services/edad-atp/lab-review-store';
import { setNuevos } from '@/src/services/edad-atp/lab-nuevos-store';
import type { ProcessedItem } from '@/src/services/edad-atp/lab-parser-process';
import { parseDecimalInput } from '@/src/utils/number-helpers';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SEMANTIC, ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { userErrorMessage } from '@/src/utils/user-error';

// YYYY-MM-DD válido (entre 1900 y 2099).
const ISO_DATE_RE = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

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

const STATUS_META: Record<Status, { icon: any }> = {
  ok: { icon: 'checkmark-circle' },
  review: { icon: 'alert-circle' },
  flag: { icon: 'help-circle' },
};

export default function LabConfirmationScreen() {
  // MB-31B remate: tokens del tema (oscuro idéntico; claro = acero).
  const { kind, tokens: t } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  // Color del estado ✓/⚠/❓: en oscuro los valores de siempre; en claro el
  // lima no es letra (manual regla 1 — cae al teal) y el error usa su token.
  const statusColor = (st: Status): string =>
    st === 'ok' ? (kind === 'dark' ? SEMANTIC.success : t.tealTexto)
      : st === 'review' ? SEMANTIC.warning
        : t.error;
  const { uploadId } = useLocalSearchParams<{ uploadId?: string }>();
  const analytics = useAnalytics();
  // Capa 9: el review puede venir en memoria (flujo síncrono) o cargarse desde DB (worker async,
  // que ya dejó extracted_data). Empezamos con el de memoria y, si falta, lo traemos de DB.
  const [review, setReviewState] = useState<LabReviewPayload | undefined>(uploadId ? getReview(uploadId) : undefined);
  const [loadingReview, setLoadingReview] = useState(false);

  const [edited, setEdited] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Fecha del estudio (editable). Default: la que el LLM detectó o HOY.
  // Validamos contra ISO YYYY-MM-DD antes de guardar para que measured_at
  // en lab_values respete la time-series (estudios viejos van al histórico).
  const [labDate, setLabDate] = useState<string>(
    review?.labDate && ISO_DATE_RE.test(review.labDate) ? review.labDate : getLocalToday(),
  );
  const labDateValid = ISO_DATE_RE.test(labDate);

  // Worker async: si no hay review en memoria, reconstruir desde lab_uploads.extracted_data.
  useEffect(() => {
    if (review || !uploadId) return;
    let alive = true;
    setLoadingReview(true);
    loadReviewFromDb(uploadId)
      .then((r) => {
        if (!alive) return;
        if (!('error' in r)) {
          setReview(r); // cachea en memoria para guardar/descartar
          setReviewState(r);
          if (r.labDate && ISO_DATE_RE.test(r.labDate)) setLabDate(r.labDate);
        }
      })
      .finally(() => { if (alive) setLoadingReview(false); });
    return () => { alive = false; };
  }, [uploadId, review]);

  if (!review) {
    if (loadingReview) {
      return (
        <Screen keyboard themed>
          <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
          <PillarHeader pillar="metrics" title="Confirmar laboratorio" />
          <View style={styles.emptyWrap}>
            <Ionicons name="hourglass-outline" size={40} color={t.textoTenue} />
            <EliteText variant="caption" style={styles.emptyText}>Cargando tu laboratorio…</EliteText>
          </View>
        </Screen>
      );
    }
    return (
      <Screen keyboard themed>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <PillarHeader pillar="metrics" title="Confirmar laboratorio" />
        <View style={styles.emptyWrap}>
          <Ionicons name="document-outline" size={40} color={t.textoTenue} />
          <EliteText variant="caption" style={styles.emptyText}>
            La lectura ya no está disponible. Vuelve a subir el estudio.
          </EliteText>
          {/* OLA6 PIEZA C: no se guardó nada, pero tampoco se vuelve al punto
              de partida del círculo. Se aterriza donde viven los labs. */}
          <Pressable onPress={() => router.replace('/edad-atp/labs')} style={styles.primaryBtn}>
            <EliteText variant="body" style={styles.primaryBtnText}>Ver mis labs</EliteText>
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

    if (!labDateValid) {
      Alert.alert('Fecha inválida', 'La fecha del estudio debe estar en formato AAAA-MM-DD.');
      return;
    }

    const extraUploadIds = (review.uploadIds ?? []).filter((id) => id !== review.uploadId);
    setSaving(true);
    const res = await saveConfirmedLabValues(review.uploadId, confirmed, { labDate, labName: review.labName, extraUploadIds });
    setSaving(false);

    const editedCount = Object.keys(edited).length;
    analytics.track(ATP_EVENTS.LAB_PARSER_V2_CONFIRMED, {
      total: review.items.length,
      edited: editedCount,
      confirmed: 'error' in res ? 0 : res.extractedCount,
      rejected: 'error' in res ? 0 : (res.rejectedCount ?? 0),
      upload_id: review.uploadId,
    });

    // res.error puede traer el mensaje de Postgres o de RLS: al filtro.
    if ('error' in res) {
      Alert.alert('No se pudo guardar', userErrorMessage(res.error, 'No se pudo guardar. Intenta de nuevo.'));
      return;
    }
    clearReview(review.uploadId);
    haptic.success();
    const omitted = res.rejectedCount ?? 0;
    // OLA6 PIEZA C: se acabó el círculo. Guardar devolvía a Mi Salud, que no
    // muestra los valores: el usuario nunca veía lo que acababa de hacer.
    // Ahora aterriza en ATP Labs con lo nuevo resaltado.
    setNuevos(confirmed.map((c) => c.key));
    const nuevo = String(res.extractedCount);
    Alert.alert(
      '',
      `${res.extractedCount} valores guardados${omitted > 0 ? `, ${omitted} omitidos por no estar claros` : ''}. Tu Edad ATP se actualizó.`,
      [{ text: 'OK', onPress: () => router.replace({ pathname: '/edad-atp/labs', params: { nuevo } }) }],
    );
  }

  function handleCancel() {
    if (!review) return;
    Alert.alert('Descartar lectura', '¿Descartar esta lectura y volver a subir el estudio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar', style: 'destructive',
        onPress: async () => {
          const ids = review.uploadIds ?? [review.uploadId];
          for (const id of ids) { try { await deleteLabUpload(id); } catch { /* */ } }
          clearReview(review.uploadId);
          // OLA6 PIEZA C: replace, nunca back(). Volver atrás reentra al picker
          // con el estado sucio de la lectura que se acaba de descartar.
          router.replace('/salud/mis-datos');
        },
      },
    ]);
  }

  const startEdit = (it: ProcessedItem) => {
    haptic.light();
    setEdited((p) => ({ ...p, [it.key]: p[it.key] ?? (it.passedValidation ? String(it.valueCanonical) : '') }));
    setEditingKey(it.key);
  };

  // Valor actualmente elegido para un item (edición del usuario o el valor por defecto).
  const currentValue = (it: ProcessedItem): number | null => {
    const e = edited[it.key];
    return e != null ? parseDecimalInput(e) : it.valueCanonical;
  };

  // Multi-foto: elegir uno de los candidatos detectados para ese biomarker.
  const chooseCandidate = (key: string, value: number) => {
    haptic.light();
    setEdited((p) => ({ ...p, [key]: String(value) }));
    setEditingKey(null);
  };

  return (
    <Screen keyboard themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <PillarHeader pillar="metrics" title="Confirmar laboratorio" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.intro}>
          Detectamos estos valores en tu laboratorio. Revísalos y corrige lo que haga falta antes de guardar.
        </EliteText>

        {/* Fecha del estudio editable — clave para que estudios viejos vayan al histórico. */}
        <View style={[styles.dateCard, !labDateValid && { borderColor: t.error + '60' }]}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={18} color={t.textoSecundario} />
            <View style={{ flex: 1 }}>
              <EliteText variant="caption" style={styles.dateLabel}>Fecha del estudio</EliteText>
              <TextInput
                style={styles.dateInput}
                value={labDate}
                onChangeText={setLabDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={t.textoTenue}
                autoCorrect={false}
                autoCapitalize="none"
                maxLength={10}
              />
              <EliteText variant="caption" style={styles.dateHint}>
                {labDateValid
                  ? 'Tus valores se guardarán en esta fecha (puedes corregirla si el documento es de otro año).'
                  : 'Usa formato AAAA-MM-DD (ej. 2024-03-15).'}
              </EliteText>
            </View>
          </View>
        </View>

        {review.items.map((it) => {
          const st = statusOf(it);
          const meta = STATUS_META[st];
          const stColor = statusColor(st);
          const isEditing = editingKey === it.key;
          const display = edited[it.key] ?? (it.passedValidation ? String(it.valueCanonical) : '—');
          return (
            <View key={it.key} style={[styles.itemCard, { borderColor: stColor + '30' }]}>
              <View style={styles.itemRow}>
                <Ionicons name={meta.icon} size={20} color={stColor} />
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
                        placeholderTextColor={t.textoTenue}
                        autoFocus
                      />
                      <EliteText variant="caption" style={styles.unit}>{it.unitCanonical}</EliteText>
                      <Pressable onPress={() => { haptic.light(); setEditingKey(null); }} style={styles.doneBtn}>
                        <EliteText variant="caption" style={styles.doneBtnText}>Listo</EliteText>
                      </Pressable>
                    </View>
                  ) : (
                    <EliteText variant="body" style={[styles.itemValue, { color: stColor }]}>
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
                  {/* Multi-foto: varios candidatos para el mismo biomarker → elegir lado a lado. */}
                  {!isEditing && (review.duplicates?.[it.key]?.length ?? 0) > 1 && (
                    <View style={styles.dupWrap}>
                      <EliteText variant="caption" style={styles.dupHint}>Detectado en varias fotos, elige cuál usar:</EliteText>
                      <View style={styles.dupChips}>
                        {review.duplicates![it.key].map((c, i) => {
                          const selected = currentValue(it) === c.value;
                          return (
                            <Pressable key={`${c.sourceLabel}-${i}`} onPress={() => chooseCandidate(it.key, c.value)} style={[styles.dupChip, selected && styles.dupChipActive]}>
                              <EliteText variant="caption" style={[styles.dupChipText, selected && styles.dupChipTextActive]}>
                                {c.value} {c.unit} · {c.sourceLabel}{!c.passedValidation ? ' ⚠' : ''}
                              </EliteText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
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

        <GradientCTA label={saving ? 'GUARDANDO…' : 'CONFIRMAR Y GUARDAR'} onPress={handleConfirm} disabled={saving} style={styles.confirmBtn} />
        <Pressable onPress={handleCancel} disabled={saving} style={styles.cancelBtn}>
          <EliteText variant="body" style={styles.cancelBtnText}>Cancelar y volver a subir</EliteText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

// MB-31B remate: los estilos leen los tokens del tema. El lima como LETRA del
// chip activo solo vive en oscuro; en claro cae al teal de texto (manual regla 1).
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  intro: { color: t.textoSecundario, fontSize: FontSizes.xs, marginBottom: Spacing.xs },
  dateCard: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: t.borde },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  dateLabel: { color: t.textoSecundario, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, marginBottom: 4 },
  dateInput: {
    backgroundColor: t.hundido, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm,
    paddingVertical: 8, color: t.texto, fontFamily: Fonts.semiBold,
    borderWidth: 1, borderColor: t.borde, fontSize: FontSizes.md,
  },
  dateHint: { color: t.textoTenue, fontSize: FontSizes.xs, marginTop: 4 },
  itemCard: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  itemLabel: { color: t.texto, fontFamily: Fonts.semiBold },
  itemValue: { fontFamily: Fonts.bold, marginTop: 2 },
  note: { color: t.textoSecundario, fontSize: FontSizes.xs, marginTop: 3 },
  snippet: { color: t.textoTenue, fontSize: FontSizes.xs, marginTop: 2, fontStyle: 'italic' },
  dupWrap: { marginTop: 6 },
  dupHint: { color: SEMANTIC.warning, fontSize: FontSizes.xs, marginBottom: 4 },
  dupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dupChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: t.bordeMarcado, backgroundColor: t.hundido },
  dupChipActive: { borderColor: ATP_BRAND.lime, backgroundColor: 'rgba(168,224,42,0.12)' },
  dupChipText: { color: t.textoSecundario, fontSize: FontSizes.xs },
  dupChipTextActive: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontFamily: Fonts.semiBold },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  editInput: {
    width: 90, textAlign: 'right', backgroundColor: t.hundido, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 8, color: t.texto,
    fontFamily: Fonts.semiBold, borderWidth: 1, borderColor: t.borde,
  },
  unit: { color: t.textoSecundario },
  doneBtn: { backgroundColor: ATP_BRAND.lime, borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 12 },
  doneBtnText: { color: t.textoSobreLima, fontFamily: Fonts.bold },
  editBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(168,224,42,0.4)' },
  editBtnText: { color: t.textoSecundario, fontFamily: Fonts.semiBold },
  derivedCard: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: t.borde, marginTop: Spacing.xs },
  derivedTitle: { color: t.textoSecundario, fontFamily: Fonts.bold, fontSize: FontSizes.sm, marginBottom: Spacing.xs },
  derivedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  derivedLabel: { color: t.textoSecundario },
  derivedValue: { color: t.texto, fontFamily: Fonts.semiBold },
  confirmBtn: { marginTop: Spacing.md },
  cancelBtn: { paddingVertical: Spacing.sm, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: t.textoSecundario },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  emptyText: { color: t.textoSecundario, textAlign: 'center' },
  primaryBtn: { backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  primaryBtnText: { color: t.textoSobreLima, fontFamily: Fonts.bold },
});
