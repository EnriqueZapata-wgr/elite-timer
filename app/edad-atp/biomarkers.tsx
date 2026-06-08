/**
 * Edad ATP — captura de biomarcadores. Sprint 2.5 (integración).
 * Pre-puebla desde lab_results (lo que ya tienes) y solo deja capturar lo NUEVO:
 *  - Los 5 PhenoAge que no viven en labs → edad_atp_biomarkers.
 *  - El resto de labs estándar → nueva fila en lab_results (expediente canónico).
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
import { saveBiomarkers, saveLabResults, type BiomarkerEntry } from '@/src/services/edad-atp/capture-service';
import { loadUserData } from '@/src/services/edad-atp/edad-atp-v2-service';
import { getLabHistory } from '@/src/services/lab-service';
import { getLocalToday, parseLocalDate } from '@/src/utils/date-helpers';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

type Field = { key: string; label: string; unit: string; helper?: string };
type Section = { id: string; title: string; fields: Field[] };

// Los 5 PhenoAge que NO existen como columnas en lab_results → edad_atp_biomarkers.
// `key` = biomarker_key, `prefillKey` = campo en UnifiedUserData.
const PHENOAGE_NEW: (Field & { prefillKey: string })[] = [
  { key: 'albumin', prefillKey: 'albumin_g_dl', label: 'Albúmina', unit: 'g/dL', helper: 'Óptimo 4.5–5.5' },
  { key: 'alp', prefillKey: 'alp_u_l', label: 'Fosfatasa alcalina', unit: 'U/L', helper: 'Óptimo 50–90' },
  { key: 'lymphocyte_pct', prefillKey: 'lymphocyte_pct', label: '% Linfocitos', unit: '%', helper: 'Óptimo 25–40' },
  { key: 'mcv', prefillKey: 'mcv_fl', label: 'VCM', unit: 'fL', helper: 'Óptimo 85–92' },
  { key: 'rdw_cv', prefillKey: 'rdw_cv_pct', label: 'RDW-CV', unit: '%', helper: 'Óptimo < 13' },
];

// Labs estándar: `key` = columna real de lab_results. Se pre-pueblan y al guardar
// generan una nueva fila en lab_results (lab_date = hoy).
const LAB_SECTIONS: Section[] = [
  {
    id: 'pheno_labs', title: 'Sangre básica', fields: [
      { key: 'glucose', label: 'Glucosa', unit: 'mg/dL', helper: 'Óptimo 75–90' },
      { key: 'creatinine', label: 'Creatinina', unit: 'mg/dL', helper: 'Óptimo 0.7–1.1' },
      { key: 'pcr', label: 'PCR', unit: 'mg/dL', helper: 'Óptimo < 0.5' },
      { key: 'wbc', label: 'Leucocitos', unit: 'cel/μL', helper: 'Óptimo 4500–7500' },
    ],
  },
  {
    id: 'metabolic', title: 'Metabólico', fields: [
      { key: 'insulin', label: 'Insulina ayuno', unit: 'μU/mL', helper: 'Óptimo < 6' },
      { key: 'hba1c', label: 'HbA1c', unit: '%', helper: 'Óptimo < 5.4' },
      { key: 'hdl', label: 'HDL', unit: 'mg/dL', helper: 'Óptimo > 50' },
      { key: 'triglycerides', label: 'Triglicéridos', unit: 'mg/dL', helper: 'Óptimo < 90' },
    ],
  },
  {
    id: 'cardiovascular', title: 'Cardiovascular', fields: [
      { key: 'cholesterol_total', label: 'Colesterol total', unit: 'mg/dL' },
      { key: 'ldl', label: 'LDL', unit: 'mg/dL' },
    ],
  },
  {
    id: 'hormonal', title: 'Hormonal', fields: [
      { key: 'tsh', label: 'TSH', unit: 'μUI/mL' },
      { key: 't3_free', label: 'T3 libre', unit: 'pg/mL' },
      { key: 't4_free', label: 'T4 libre', unit: 'ng/dL' },
      { key: 'testosterone', label: 'Testosterona', unit: 'ng/dL' },
      { key: 'estradiol', label: 'Estradiol', unit: 'pg/mL' },
      { key: 'cortisol', label: 'Cortisol matutino', unit: 'μg/dL' },
    ],
  },
  {
    id: 'inflammation', title: 'Inflamación', fields: [
      { key: 'uric_acid', label: 'Ácido úrico', unit: 'mg/dL' },
      { key: 'homocysteine', label: 'Homocisteína', unit: 'μmol/L' },
    ],
  },
];

function daysAgo(dateStr: string): number {
  const then = parseLocalDate(dateStr).getTime();
  const now = parseLocalDate(getLocalToday()).getTime();
  return Math.max(0, Math.round((now - then) / 86400000));
}

export default function BiomarkersCapture() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [values, setValues] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState<Record<string, boolean>>({});
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});
  const [labBadge, setLabBadge] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ pheno_labs: true });
  const [saving, setSaving] = useState(false);

  const setField = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  // Pre-poblar: los 5 PhenoAge desde UnifiedUserData; los labs desde lab_results.
  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    (async () => {
      const [unified, labs] = await Promise.all([loadUserData(user.id), getLabHistory(user.id, 1)]);
      const labRow: any = labs[0] ?? null;
      const init: Record<string, string> = {};
      const pre: Record<string, boolean> = {};
      for (const f of PHENOAGE_NEW) {
        const v = (unified as any)[f.prefillKey];
        if (v != null) { init[f.key] = String(v); pre[f.key] = true; }
      }
      if (labRow) {
        for (const s of LAB_SECTIONS) for (const f of s.fields) {
          const v = labRow[f.key];
          if (v != null) { init[f.key] = String(v); pre[f.key] = true; }
        }
        if (labRow.lab_date) setLabBadge(`Labs · hace ${daysAgo(labRow.lab_date)}d`);
      }
      setValues(init);
      setSnapshot(init);
      setPrefilled(pre);
    })();
  }, [user?.id]));

  async function handleSave() {
    if (!user?.id) return;
    // 1. Los 5 PhenoAge nuevos → edad_atp_biomarkers.
    const bioEntries: BiomarkerEntry[] = [];
    for (const f of PHENOAGE_NEW) {
      const raw = values[f.key];
      if (raw != null && raw.trim() !== '') {
        const num = parseFloat(raw);
        if (Number.isFinite(num)) bioEntries.push({ key: f.key, value: num, unit: f.unit });
      }
    }
    // 2. Labs estándar → nueva fila lab_results, solo lo que cambió vs lo pre-poblado.
    const labValues: Record<string, number> = {};
    for (const s of LAB_SECTIONS) for (const f of s.fields) {
      const raw = values[f.key];
      if (raw == null || raw.trim() === '' || raw === snapshot[f.key]) continue;
      const num = parseFloat(raw);
      if (Number.isFinite(num)) labValues[f.key] = num;
    }
    if (bioEntries.length === 0 && Object.keys(labValues).length === 0) {
      Alert.alert('Sin cambios', 'Añade o actualiza al menos un valor.');
      return;
    }
    setSaving(true);
    const r1 = bioEntries.length ? await saveBiomarkers(user.id, bioEntries) : { ok: true };
    const r2 = Object.keys(labValues).length ? await saveLabResults(user.id, labValues) : { ok: true };
    setSaving(false);
    if (!r1.ok || !r2.ok) {
      Alert.alert('Error', 'No se pudieron guardar los datos. Intenta de nuevo.');
      return;
    }
    analytics.track(ATP_EVENTS.EDAD_ATP_BIOMARKERS_SAVED, { count: bioEntries.length + Object.keys(labValues).length });
    haptic.success();
    Alert.alert('', 'Datos guardados ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  const renderField = (f: Field, badge?: string) => (
    <NumberInputRow
      key={f.key}
      label={f.label}
      unit={f.unit}
      helper={f.helper}
      badge={prefilled[f.key] ? badge : undefined}
      value={values[f.key] ?? ''}
      onChangeText={(v) => setField(f.key, v)}
    />
  );

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Biomarcadores" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.intro}>
          Ya cargamos lo que tienes registrado. Solo añade lo que falta o actualiza si tienes labs nuevos.
        </EliteText>

        {/* Los 5 PhenoAge que solo existen en ATP. */}
        <View style={styles.section}>
          <EliteText variant="body" style={styles.sectionTitle}>PhenoAge (solo en ATP)</EliteText>
          {PHENOAGE_NEW.map((f) => renderField(f, 'Guardado'))}
        </View>

        {/* Labs estándar (pre-poblados desde tu expediente). */}
        {LAB_SECTIONS.map((s) => (
          <View key={s.id} style={styles.section}>
            <Pressable
              onPress={() => { haptic.light(); setOpen((p) => ({ ...p, [s.id]: !p[s.id] })); }}
              style={styles.sectionHeader}
            >
              <EliteText variant="body" style={styles.sectionTitle}>{s.title}</EliteText>
              <Ionicons name={open[s.id] ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
            </Pressable>
            {open[s.id] && s.fields.map((f) => renderField(f, labBadge ?? 'Labs'))}
          </View>
        ))}

        <EliteText variant="caption" style={styles.note}>
          Edad y sexo se toman de tu perfil. Los labs estándar se guardan en tu expediente médico (pilar Salud).
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
  sectionTitle: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: FontSizes.md },
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.xs },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
