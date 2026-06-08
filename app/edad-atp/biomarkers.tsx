/**
 * Edad ATP — captura manual de biomarcadores (labs). Sprint 2.
 * Secciones colapsables; cada lab se guarda como una fila en edad_atp_biomarkers.
 */
import { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { saveBiomarkers, type BiomarkerEntry } from '@/src/services/edad-atp/capture-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

type Field = { key: string; label: string; unit: string; helper?: string };
type Section = { id: string; title: string; fields: Field[] };

const SECTIONS: Section[] = [
  {
    id: 'phenoage', title: 'PhenoAge (core)', fields: [
      { key: 'albumin', label: 'Albúmina', unit: 'g/dL', helper: 'Óptimo 4.5–5.5' },
      { key: 'creatinine', label: 'Creatinina', unit: 'mg/dL', helper: 'Óptimo 0.7–1.1' },
      { key: 'glucose', label: 'Glucosa', unit: 'mg/dL', helper: 'Óptimo 75–90' },
      { key: 'crp', label: 'PCR', unit: 'mg/dL', helper: 'Óptimo < 0.5' },
      { key: 'lymphocyte_pct', label: '% Linfocitos', unit: '%', helper: 'Óptimo 25–40' },
      { key: 'mcv', label: 'VCM', unit: 'fL', helper: 'Óptimo 85–92' },
      { key: 'rdw_cv', label: 'RDW-CV', unit: '%', helper: 'Óptimo < 13' },
      { key: 'alp', label: 'Fosfatasa alcalina', unit: 'U/L', helper: 'Óptimo 50–90' },
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
      { key: 'total_cholesterol', label: 'Colesterol total', unit: 'mg/dL' },
      { key: 'ldl', label: 'LDL', unit: 'mg/dL' },
      { key: 'apob', label: 'ApoB', unit: 'mg/dL' },
    ],
  },
  {
    id: 'hormonal', title: 'Hormonal', fields: [
      { key: 'tsh', label: 'TSH', unit: 'μUI/mL' },
      { key: 't3', label: 'T3', unit: 'pg/mL' },
      { key: 't4', label: 'T4 libre', unit: 'ng/dL' },
      { key: 'testosterone', label: 'Testosterona', unit: 'ng/dL' },
      { key: 'estradiol', label: 'Estradiol', unit: 'pg/mL' },
      { key: 'cortisol_am', label: 'Cortisol matutino', unit: 'μg/dL' },
    ],
  },
  {
    id: 'inflammation', title: 'Inflamación', fields: [
      { key: 'uric_acid', label: 'Ácido úrico', unit: 'mg/dL' },
      { key: 'homocysteine', label: 'Homocisteína', unit: 'μmol/L' },
    ],
  },
];

export default function BiomarkersCapture() {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [values, setValues] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({ phenoage: true });
  const [saving, setSaving] = useState(false);

  const setField = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!user?.id) return;
    const entries: BiomarkerEntry[] = [];
    for (const s of SECTIONS) {
      for (const f of s.fields) {
        const raw = values[f.key];
        if (raw != null && raw.trim() !== '') {
          const num = parseFloat(raw);
          if (Number.isFinite(num)) entries.push({ key: f.key, value: num, unit: f.unit });
        }
      }
    }
    if (entries.length === 0) {
      Alert.alert('Sin datos', 'Ingresa al menos un biomarcador.');
      return;
    }
    setSaving(true);
    const result = await saveBiomarkers(user.id, entries);
    setSaving(false);
    if (!result.ok) {
      Alert.alert('Error', 'No se pudieron guardar los datos. Intenta de nuevo.');
      return;
    }
    analytics.track(ATP_EVENTS.EDAD_ATP_BIOMARKERS_SAVED, { count: entries.length });
    haptic.success();
    Alert.alert('', 'Datos guardados ✓', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Biomarcadores" />
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((s) => (
          <View key={s.id} style={styles.section}>
            <Pressable
              onPress={() => { haptic.light(); setOpen((p) => ({ ...p, [s.id]: !p[s.id] })); }}
              style={styles.sectionHeader}
            >
              <EliteText variant="body" style={styles.sectionTitle}>{s.title}</EliteText>
              <Ionicons name={open[s.id] ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
            </Pressable>
            {open[s.id] && s.fields.map((f) => (
              <NumberInputRow
                key={f.key}
                label={f.label}
                unit={f.unit}
                helper={f.helper}
                value={values[f.key] ?? ''}
                onChangeText={(v) => setField(f.key, v)}
              />
            ))}
          </View>
        ))}

        <EliteText variant="caption" style={styles.note}>
          Edad cronológica se toma de tu perfil. Verifica que los valores estén en rango antes de guardar.
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
  section: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Spacing.xs },
  sectionTitle: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: FontSizes.md },
  note: { color: Colors.textSecondary, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.xs },
  saveBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  saveBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
});
