/**
 * Edad ATP — biomarcadores. MEGA COMPLETION (auto-prepopulation).
 * NO muestra una forma vacía: separa "✓ Disponibles" (ya en tu expediente,
 * read-only) de "⚠️ Pendientes" (inputs editables solo de lo que falta).
 * Toda edición/captura manual escribe a edad_atp_biomarkers (override: el
 * orchestrator prioriza edad_atp_biomarkers > extracted_data > lab_results).
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveBiomarkers, getManualBiomarkers, getLatestExtractedData, type BiomarkerEntry } from '@/src/services/edad-atp/capture-service';
import { getLabHistory } from '@/src/services/lab-service';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import { parseDecimalInput } from '@/src/utils/number-helpers';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

// key = biomarker_key (edad_atp_biomarkers). labCol = columna en lab_results si difiere.
type Bio = { key: string; label: string; unit: string; labCol?: string };
const SECTIONS: { section: string; items: Bio[] }[] = [
  { section: 'PhenoAge', items: [
    { key: 'albumin', label: 'Albúmina', unit: 'g/dL' },
    { key: 'creatinine', label: 'Creatinina', unit: 'mg/dL' },
    { key: 'glucose', label: 'Glucosa', unit: 'mg/dL' },
    { key: 'crp', label: 'PCR', unit: 'mg/dL', labCol: 'pcr' },
    { key: 'lymphocyte_pct', label: '% Linfocitos', unit: '%' },
    { key: 'mcv', label: 'VCM', unit: 'fL' },
    { key: 'rdw_cv', label: 'RDW-CV', unit: '%', labCol: 'rdw' },
    { key: 'alp', label: 'Fosfatasa alcalina', unit: 'U/L' },
    { key: 'wbc', label: 'Leucocitos', unit: 'cel/μL' },
  ] },
  { section: 'Metabólico', items: [
    { key: 'insulin', label: 'Insulina ayuno', unit: 'μU/mL' },
    { key: 'hba1c', label: 'HbA1c', unit: '%' },
    { key: 'hdl', label: 'HDL', unit: 'mg/dL' },
    { key: 'triglycerides', label: 'Triglicéridos', unit: 'mg/dL' },
  ] },
  { section: 'Cardiovascular', items: [
    { key: 'total_cholesterol', label: 'Colesterol total', unit: 'mg/dL', labCol: 'cholesterol_total' },
    { key: 'ldl', label: 'LDL', unit: 'mg/dL' },
  ] },
  { section: 'Hormonal', items: [
    { key: 'tsh', label: 'TSH', unit: 'μUI/mL' },
    { key: 't3_free', label: 'T3 libre', unit: 'pg/mL' },
    { key: 't4_free', label: 'T4 libre', unit: 'ng/dL' },
    { key: 'testosterone', label: 'Testosterona', unit: 'ng/dL' },
    { key: 'estradiol', label: 'Estradiol', unit: 'pg/mL' },
    { key: 'cortisol', label: 'Cortisol matutino', unit: 'μg/dL' },
  ] },
  { section: 'Inflamación / renal', items: [
    { key: 'uric_acid', label: 'Ácido úrico', unit: 'mg/dL' },
    { key: 'homocysteine', label: 'Homocisteína', unit: 'μmol/L' },
  ] },
];
const ALL_BIO = SECTIONS.flatMap((s) => s.items);

function daysAgo(dateStr: string): number {
  const then = parseLocalDate(dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr).getTime();
  const now = parseLocalDate(getLocalToday()).getTime();
  return Math.max(0, Math.round((now - then) / 86400000));
}

type Current = { value: number; source: string };

export default function BiomarkersCapture() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [current, setCurrent] = useState<Record<string, Current>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  // Edición inline de UN toque (#16): qué fila disponible se está editando + cuál guardando.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      const [manual, labs, ext] = await Promise.all([
        getManualBiomarkers(user.id), getLabHistory(user.id, 1), getLatestExtractedData(user.id),
      ]);
      const labRow: any = labs[0] ?? null;
      // Sinónimos es/en para leer del PDF parseado igual que loadUserData.
      const extSyn: Record<string, string[]> = {
        albumin: ['albumina', 'serum_albumin'], creatinine: ['creatinina'], crp: ['pcr', 'proteina_c_reactiva'],
        lymphocyte_pct: ['linfocitos_pct', 'lymphocytes_pct'], mcv: ['vcm'], rdw_cv: ['rdw'],
        alp: ['fosfatasa_alcalina'], wbc: ['leucocitos'], total_cholesterol: ['cholesterol_total'], glucose: ['glucosa'],
      };
      const fromExt = (f: Bio): number | undefined => {
        const col = f.labCol ?? f.key;
        if (ext[col] != null) return ext[col];
        for (const s of extSyn[f.key] ?? []) if (ext[s] != null) return ext[s];
        return undefined;
      };
      const cur: Record<string, Current> = {};
      for (const f of ALL_BIO) {
        const col = f.labCol ?? f.key;
        const e = fromExt(f);
        if (manual[f.key] != null) {
          cur[f.key] = { value: manual[f.key].value, source: `Manual · hace ${daysAgo(manual[f.key].measured_at)}d` };
        } else if (labRow && labRow[col] != null) {
          cur[f.key] = { value: labRow[col], source: labRow.lab_date ? `Labs · hace ${daysAgo(labRow.lab_date)}d` : 'Labs' };
        } else if (e != null) {
          cur[f.key] = { value: e, source: 'PDF parseado' };
        }
      }
      setCurrent(cur);
    })();
  }, [user?.id]));

  const setField = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const available = ALL_BIO.filter((f) => current[f.key] != null);
  const missing = ALL_BIO.filter((f) => current[f.key] == null);

  // Guarda UN biomarcador editado inline (#16). Persiste a edad_atp_biomarkers + lab_values
  // y refresca current sin recargar la pantalla.
  async function handleInlineSave(f: Bio) {
    if (!user?.id) return;
    const numv = parseDecimalInput(values[f.key]);
    if (numv == null) { Alert.alert('Valor inválido', 'Ingresa un número válido.'); return; }
    if (current[f.key]?.value === numv) { setEditingKey(null); return; }
    setSavingKey(f.key);
    const result = await saveBiomarkers(user.id, [{ key: f.key, value: numv, unit: f.unit }]);
    setSavingKey(null);
    if (!result.ok) { Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_BIOMARKERS_SAVED, { count: 1, source: 'inline' });
    haptic.success();
    setCurrent((p) => ({ ...p, [f.key]: { value: numv, source: 'Manual · hace 0d' } }));
    setEditingKey(null);
  }

  async function handleSave() {
    if (!user?.id) return;
    const entries: BiomarkerEntry[] = [];
    for (const f of ALL_BIO) {
      const numv = parseDecimalInput(values[f.key]);
      if (numv == null) continue;
      // En edit-mode no re-guardar un valor idéntico al ya existente.
      if (current[f.key]?.value === numv) continue;
      entries.push({ key: f.key, value: numv, unit: f.unit });
    }
    if (entries.length === 0) { Alert.alert('Sin cambios', 'Ingresa o actualiza al menos un valor.'); return; }
    setSaving(true);
    const result = await saveBiomarkers(user.id, entries);
    setSaving(false);
    if (!result.ok) { Alert.alert('Error', 'No se pudieron guardar. Intenta de nuevo.'); return; }
    analytics.track(ATP_EVENTS.EDAD_ATP_BIOMARKERS_SAVED, { count: entries.length, edit_mode: editMode });
    haptic.success();
    Alert.alert('', 'Datos guardados ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Biomarcadores" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.intro}>
          Cargamos lo que ya tienes en tu expediente. Solo completa lo que falta para subir la precisión.
        </EliteText>

        {/* ✓ DISPONIBLES (collapsible, read-only salvo edit mode) */}
        {available.length > 0 && (
          <View style={styles.section}>
            <Pressable onPress={() => { haptic.light(); setShowAvailable((s) => !s); }} style={styles.sectionHeader}>
              <EliteText variant="body" style={styles.okTitle}>✓ Disponibles ({available.length})</EliteText>
              <Ionicons name={showAvailable ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
            </Pressable>
            {showAvailable && (
              <EliteText variant="caption" style={styles.tapHint}>Toca un valor para corregirlo.</EliteText>
            )}
            {showAvailable && available.map((f) => {
              // Edición masiva (botón "Editar manualmente"): todas las filas como inputs.
              if (editMode) {
                return (
                  <NumberInputRow
                    key={f.key}
                    label={f.label}
                    unit={f.unit}
                    badge={current[f.key]?.source}
                    value={values[f.key] ?? String(current[f.key]!.value)}
                    onChangeText={(v) => setField(f.key, v)}
                  />
                );
              }
              // Edición inline de UN toque: esta fila se está editando.
              if (editingKey === f.key) {
                return (
                  <View key={f.key} style={styles.inlineEdit}>
                    <NumberInputRow
                      label={f.label}
                      unit={f.unit}
                      value={values[f.key] ?? String(current[f.key]!.value)}
                      onChangeText={(v) => setField(f.key, v)}
                    />
                    <View style={styles.inlineBtns}>
                      <Pressable onPress={() => { haptic.light(); setEditingKey(null); }} style={styles.inlineCancel}>
                        <EliteText variant="caption" style={{ color: Colors.textSecondary }}>Cancelar</EliteText>
                      </Pressable>
                      <Pressable onPress={() => handleInlineSave(f)} disabled={savingKey === f.key} style={[styles.inlineSave, savingKey === f.key && { opacity: 0.6 }]}>
                        <EliteText variant="caption" style={styles.inlineSaveText}>{savingKey === f.key ? 'Guardando…' : 'Guardar'}</EliteText>
                      </Pressable>
                    </View>
                  </View>
                );
              }
              // Read-only tappable: un toque abre el input inline (sin navegar a otra pantalla).
              return (
                <Pressable
                  key={f.key}
                  onPress={() => { haptic.light(); setField(f.key, String(current[f.key]!.value)); setEditingKey(f.key); }}
                  style={styles.availRow}
                >
                  <EliteText variant="body" style={styles.availLabel}>{f.label}</EliteText>
                  <View style={styles.availRight}>
                    <EliteText variant="body" style={styles.availValue}>{current[f.key]!.value} {f.unit}</EliteText>
                    <EliteText variant="caption" style={styles.availSrc}>{current[f.key]!.source}</EliteText>
                  </View>
                  <Ionicons name="create-outline" size={14} color={Colors.textSecondary} style={{ marginLeft: 6 }} />
                </Pressable>
              );
            })}
            <Pressable onPress={() => { haptic.light(); setEditMode((e) => !e); }} style={styles.editBtn}>
              <Ionicons name={editMode ? 'close' : 'create-outline'} size={15} color={Colors.neonGreen} />
              <EliteText variant="caption" style={styles.editBtnText}>{editMode ? 'Cancelar edición' : 'Editar manualmente'}</EliteText>
            </Pressable>
          </View>
        )}

        {/* ⚠️ PENDIENTES (inputs editables) */}
        {missing.length > 0 ? (
          SECTIONS.map((s) => {
            const items = s.items.filter((f) => current[f.key] == null);
            if (items.length === 0) return null;
            return (
              <View key={s.section} style={styles.section}>
                <EliteText variant="body" style={styles.pendTitle}>⚠️ {s.section} — pendiente</EliteText>
                {items.map((f) => (
                  <NumberInputRow key={f.key} label={f.label} unit={f.unit} value={values[f.key] ?? ''} onChangeText={(v) => setField(f.key, v)} />
                ))}
              </View>
            );
          })
        ) : (
          <EliteText variant="caption" style={styles.allDone}>Tienes todos los biomarcadores ✓</EliteText>
        )}

        <EliteText variant="caption" style={styles.note}>
          Lo que captures aquí cuenta como override manual (gana sobre tus labs subidos).
        </EliteText>

        <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          <EliteText variant="body" style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar'}</EliteText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  intro: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginBottom: Spacing.xs },
  section: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Spacing.xs },
  okTitle: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: FontSizes.md },
  pendTitle: { color: '#e0a020', fontFamily: Fonts.bold, fontSize: FontSizes.md, marginBottom: Spacing.xs },
  tapHint: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginBottom: Spacing.xs },
  availRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  inlineEdit: { borderTopWidth: 1, borderTopColor: '#1a1a1a', paddingTop: Spacing.xs, marginTop: Spacing.xs },
  inlineBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xs },
  inlineCancel: { paddingVertical: 6, paddingHorizontal: 12 },
  inlineSave: { backgroundColor: Colors.neonGreen, borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 16 },
  inlineSaveText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  availLabel: { color: Colors.textPrimary, flex: 1 },
  availRight: { alignItems: 'flex-end' },
  availValue: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  availSrc: { color: Colors.neonGreen, fontSize: FontSizes.xs },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, alignSelf: 'flex-start' },
  editBtnText: { color: Colors.neonGreen },
  allDone: { color: Colors.neonGreen, textAlign: 'center', marginVertical: Spacing.sm },
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.xs },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
