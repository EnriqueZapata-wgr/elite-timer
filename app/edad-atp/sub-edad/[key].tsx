/**
 * Edad ATP — drill-down de una sub-edad. Ruta dinámica /edad-atp/sub-edad/[key] con
 * key ∈ labs|composicion|fitness|cognicion|riesgos (áreas del motor v2).
 *
 * Sprint captura unificada ("SIMPLE vence inteligente"):
 *  - ÚNICA fuente de verdad: `sub_edades[key].components` del motor v2 (ya normalizados
 *    por motor-v2-view: banda, score 0-100 UI y display_value de derivados).
 *  - El drill-down ES la captura: tap en una fila → editor inline (params manuales de
 *    health_measurements / subjetivos) o deep-link DIRECTO a su formulario.
 *  - Color del círculo por delta vs cronológica (statusColor ±1), no color fijo de área.
 *  - CTA: con params pendientes → "Completar datos" (lleva al primero); sin pendientes
 *    → Acción ATP de mejora.
 */
import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Pressable, View, Modal, Alert } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { NumberInputRow } from '@/src/components/edad-atp/NumberInputRow';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { computeEdadAtpV2 } from '@/src/services/edad-atp/edad-atp-v2-service';
import { saveHealthMeasurement, saveQuestionnaireResponses } from '@/src/services/edad-atp/capture-service';
import type { EdadAtpV2Result, SubEdadComponent, SubEdadKey, SubEdadResult } from '@/src/types/edad-atp-v2';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import {
  BAND_DISPLAY, type ComponentBand, statusColor,
  SUB_EDAD_CE_PENDING_THRESHOLD, EDAD_PENDING_COLOR,
} from '@/src/components/edad-atp/tokens';
import { COMPONENT_META, getComponentMeta, componentToParamKey, type ComponentMeta } from '@/src/components/edad-atp/component-meta';
import { CeStars } from '@/src/components/edad-atp/CeStars';
import { LabInfoPopup } from '@/src/components/edad-atp/LabInfoPopup';

const META: Record<string, { icon: string; label: string; action: string; route: string }> = {
  labs: { icon: '🩸', label: 'Edad Labs', action: 'Optimiza biomarcadores: inflamación, glucosa y micronutrientes (Vit D, B12).', route: '/edad-atp/biomarkers' },
  composicion: { icon: '💪', label: 'Edad Composición', action: 'Trabaja composición: fuerza progresiva + proteína suficiente.', route: '/edad-atp/composition' },
  fitness: { icon: '🏃', label: 'Edad Fitness', action: 'Protocolo cardio ATP: 3x por semana de intervalos + fuerza.', route: '/edad-atp/tests' },
  cognicion: { icon: '🧠', label: 'Edad Cognición', action: 'Ejercicio aeróbico + sueño óptimo mantienen tu velocidad y atención.', route: '/edad-atp/tests/reaction-time' },
  riesgos: { icon: '❤️', label: 'Edad Riesgos', action: 'Cuida presión, lípidos (ApoB) y metabólico; suma cardio zona 2.', route: '/edad-atp/vitals' },
};

/**
 * Formato por magnitud — Math.round truncaba decimales a "0" (HbA1c 0.055,
 * Bilirrubina 0.44, RDW 0.129). Params % de la matriz guardan fracción decimal
 * → se muestran ×100 con su signo % (0.476 → "47.6%").
 */
function formatComponentValue(v: number, unit?: string): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (unit === '%') {
    const pct = Math.abs(v) <= 1 ? v * 100 : v;
    return `${pct.toFixed(1)}%`;
  }
  const abs = Math.abs(v);
  const num = abs >= 100 ? v.toFixed(0) : abs >= 10 ? v.toFixed(1) : abs >= 1 ? v.toFixed(2) : v.toFixed(3);
  return unit ? `${num} ${unit}` : num;
}

/** Banda del componente (viene de motor-v2-view); fallback por score normalizado. */
function bandOf(c: SubEdadComponent): ComponentBand {
  if (c.band) return c.band as ComponentBand;
  if (c.missing) return 'pendiente';
  return c.score_0_100 >= 80 ? 'optimo' : c.score_0_100 >= 50 ? 'aceptable' : 'atencion';
}

type EditorState =
  | { kind: 'hm'; compKey: string; meta: ComponentMeta }
  | { kind: 'subjetivos' }
  | null;

export default function SubEdadDrillDown() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [result, setResult] = useState<EdadAtpV2Result | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [editorVal, setEditorVal] = useState('');
  const [subjVals, setSubjVals] = useState<{ claridad: string; energia: string; memoria: string }>({ claridad: '', energia: '', memoria: '' });
  const [saving, setSaving] = useState(false);
  const [infoKey, setInfoKey] = useState<string | null>(null);

  const areaKey = (key && key in COMPONENT_META ? key : 'labs') as SubEdadKey;
  const meta = META[areaKey];

  const refresh = useCallback(() => {
    if (!user?.id) return;
    computeEdadAtpV2(user.id).then(setResult).catch(() => {});
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    analytics.track(ATP_EVENTS.EDAD_ATP_SUBEDAD_VIEWED, { key: String(key) });
    refresh();
  }, [refresh, key]));

  const sub: SubEdadResult | null = result ? result.sub_edades[areaKey] ?? null : null;
  const chrono = result?.chronological_age ?? 0;
  const delta = sub ? Math.round((sub.age_years - chrono) * 10) / 10 : 0;
  // Regla única de color (igual que la constelación): delta vs cronológica, ±1.
  const ageColor = sub ? statusColor(sub.age_years, chrono) : EDAD_PENDING_COLOR;
  // CE bajo = mayoría de params sin contestar → número no representativo, mostrar Pendiente.
  const pending = sub != null && sub.ce_percent < SUB_EDAD_CE_PENDING_THRESHOLD;

  const entries = sub ? Object.entries(sub.components) : [];
  const pendingComps = entries.filter(([, c]) => bandOf(c) === 'pendiente');

  /** Doctrina 3: la fila ES la captura — editor inline o deep-link directo. */
  function openCapture(compKey: string, c: SubEdadComponent | null) {
    const m = getComponentMeta(areaKey, compKey);
    haptic.light();
    if (m.capture.type === 'hm') {
      setEditorVal(c && !c.missing && Number.isFinite(c.value) ? String(c.value) : '');
      setEditor({ kind: 'hm', compKey, meta: m });
      return;
    }
    if (m.capture.type === 'subjetivos') {
      const avg = c && !c.missing && Number.isFinite(c.value) ? String(Math.round(c.value)) : '';
      setSubjVals({ claridad: avg, energia: avg, memoria: avg });
      setEditor({ kind: 'subjetivos' });
      return;
    }
    router.push(m.capture.route as any);
  }

  async function saveInlineHm() {
    if (!user?.id || editor?.kind !== 'hm' || editor.meta.capture.type !== 'hm') return;
    const n = parseFloat(editorVal);
    if (!Number.isFinite(n)) { Alert.alert('Valor', 'Ingresa un número válido.'); return; }
    setSaving(true);
    const r = await saveHealthMeasurement(user.id, { [editor.meta.capture.field]: editor.meta.integer ? Math.round(n) : n });
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', 'No se pudo guardar.'); return; }
    haptic.success();
    setEditor(null);
    refresh(); // recalcula el motor → la fila y el CE se actualizan
  }

  async function saveInlineSubjetivos() {
    if (!user?.id) return;
    const vals: Array<[string, string]> = [
      ['claridad_mental', subjVals.claridad], ['energia_mental', subjVals.energia], ['memoria_autopercibida', subjVals.memoria],
    ];
    const rows = [];
    for (const [k, s] of vals) {
      const n = parseFloat(s);
      // Cognición v2.1: escala 0-10 (neutro en 5). El motor usa avg10 simétrico.
      if (!Number.isFinite(n) || n < 0 || n > 10) { Alert.alert('Valor', 'Los tres valores deben ser de 0 a 10.'); return; }
      rows.push({ parameter_key: k, value: Math.round(n) });
    }
    setSaving(true);
    // Domain propio: el delete-before-insert de saveQuestionnaireResponses solo toca
    // 'cognicion_subjetivos' — no pisa los cuestionarios de dominio existentes.
    const r = await saveQuestionnaireResponses(user.id, 'cognicion_subjetivos', rows);
    setSaving(false);
    if (!r.ok) { Alert.alert('Error', 'No se pudo guardar.'); return; }
    haptic.success();
    setEditor(null);
    refresh();
  }

  return (
    <Screen>
      <PillarHeader pillar="metrics" title={meta.label} />
      <ScrollView contentContainerStyle={styles.content}>
        {!sub ? (
          <EliteText variant="caption" style={styles.calc}>Calculando…</EliteText>
        ) : (
          <>
            <View style={[styles.ring, { borderColor: pending ? EDAD_PENDING_COLOR : ageColor }]}>
              <EliteText style={styles.ringIcon}>{meta.icon}</EliteText>
              {pending ? (
                <EliteText style={[styles.ringPending, { color: EDAD_PENDING_COLOR }]}>⚠️ Pendiente</EliteText>
              ) : (
                <EliteText style={[styles.ringAge, { color: ageColor }]}>{sub.age_years.toFixed(1)}</EliteText>
              )}
            </View>
            {pending ? (
              <EliteText variant="caption" style={styles.pendingMsg}>
                Esta sub-edad necesita más datos. Captura los parámetros pendientes abajo.
              </EliteText>
            ) : (
              <EliteText variant="caption" style={[styles.delta, { color: ageColor }]}>
                cronológica {chrono} · {delta > 0 ? '+' : ''}{delta} años
              </EliteText>
            )}
            <View style={styles.ceRow}><CeStars ce={sub.ce_percent} size={15} /></View>

            <EliteText variant="body" style={styles.sectionTitle}>Componentes</EliteText>
            <EliteText variant="caption" style={styles.sectionHint}>Toca una fila para capturar o actualizar su dato.</EliteText>
            {entries.map(([k, c]) => {
              const band = bandOf(c);
              const bd = BAND_DISPLAY[band];
              const cm = getComponentMeta(areaKey, k);
              const shown = c.display_value != null ? c.display_value : c.value;
              return (
                <Pressable
                  key={k}
                  onPress={() => openCapture(k, c)}
                  onLongPress={() => { haptic.medium(); setInfoKey(componentToParamKey(areaKey, k) ?? k); }}
                  delayLongPress={350}
                  style={styles.compRow}
                >
                  <EliteText variant="body" style={styles.compLabel}>{cm.label}</EliteText>
                  <View style={styles.compRight}>
                    {!c.missing ? (
                      <EliteText variant="caption" style={styles.compVal}>
                        {c.display_value != null ? c.display_value.toFixed(2) : formatComponentValue(shown, cm.unit)}
                      </EliteText>
                    ) : null}
                    <EliteText variant="caption" style={[styles.compStatus, { color: bd.color }]}>{bd.glyph}</EliteText>
                    <EliteText style={styles.chevron}>›</EliteText>
                  </View>
                </Pressable>
              );
            })}

            {pendingComps.length > 0 ? (
              <View style={styles.actionCard}>
                <EliteText variant="body" style={styles.actionTitle}>📥 Completa tus datos</EliteText>
                <EliteText variant="caption" style={styles.actionText}>
                  {pendingComps.length} {pendingComps.length === 1 ? 'parámetro pendiente' : 'parámetros pendientes'}. Cada captura sube el CE de esta área.
                </EliteText>
                <Pressable onPress={() => openCapture(pendingComps[0][0], pendingComps[0][1])} style={styles.actionBtn}>
                  <EliteText variant="body" style={styles.actionBtnText}>Completar datos</EliteText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actionCard}>
                <EliteText variant="body" style={styles.actionTitle}>💡 Acción ATP</EliteText>
                <EliteText variant="caption" style={styles.actionText}>{meta.action}</EliteText>
                <Pressable onPress={() => { haptic.medium(); router.push(meta.route as any); }} style={styles.actionBtn}>
                  <EliteText variant="body" style={styles.actionBtnText}>Agregar datos</EliteText>
                </Pressable>
              </View>
            )}
          </>
        )}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <EliteText variant="body" style={styles.backText}>Volver</EliteText>
        </Pressable>
      </ScrollView>

      {/* Editor inline: modal numérico simple → guarda → recalcula → refresca. */}
      <Modal visible={editor != null} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {editor?.kind === 'hm' ? (
              <>
                <EliteText variant="body" style={styles.modalTitle}>{editor.meta.label}</EliteText>
                <NumberInputRow label={editor.meta.label} unit={editor.meta.unit} value={editorVal} onChangeText={setEditorVal} />
                <Pressable onPress={saveInlineHm} disabled={saving} style={[styles.actionBtn, saving && { opacity: 0.6 }]}>
                  <EliteText variant="body" style={styles.actionBtnText}>{saving ? 'Guardando…' : 'Guardar'}</EliteText>
                </Pressable>
              </>
            ) : editor?.kind === 'subjetivos' ? (
              <>
                <EliteText variant="body" style={styles.modalTitle}>Subjetivos (0-10)</EliteText>
                <EliteText variant="caption" style={styles.modalHint}>0 = pésimo · 5 = normal · 10 = óptimo</EliteText>
                <NumberInputRow label="Claridad mental" unit="/10" value={subjVals.claridad} onChangeText={(x) => setSubjVals((p) => ({ ...p, claridad: x }))} />
                <NumberInputRow label="Energía mental" unit="/10" value={subjVals.energia} onChangeText={(x) => setSubjVals((p) => ({ ...p, energia: x }))} />
                <NumberInputRow label="Memoria autopercibida" unit="/10" value={subjVals.memoria} onChangeText={(x) => setSubjVals((p) => ({ ...p, memoria: x }))} />
                <Pressable onPress={saveInlineSubjetivos} disabled={saving} style={[styles.actionBtn, saving && { opacity: 0.6 }]}>
                  <EliteText variant="body" style={styles.actionBtnText}>{saving ? 'Guardando…' : 'Guardar'}</EliteText>
                </Pressable>
              </>
            ) : null}
            <Pressable onPress={() => setEditor(null)} style={styles.modalCancel}>
              <EliteText variant="caption" style={styles.modalCancelText}>Cancelar</EliteText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Long-press en un componente → descripción (#3). */}
      <LabInfoPopup parameterKey={infoKey} onClose={() => setInfoKey(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  calc: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
  ring: { alignSelf: 'center', width: 150, height: 150, borderRadius: 75, borderWidth: 3, alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: Spacing.md },
  ringIcon: { fontSize: 26 },
  ringAge: { fontSize: 40, fontFamily: Fonts.extraBold, lineHeight: 44 },
  ringPending: { fontSize: FontSizes.md, fontFamily: Fonts.bold, lineHeight: 24 },
  delta: { textAlign: 'center', marginBottom: 2 },
  ceRow: { alignItems: 'center', marginBottom: Spacing.sm },
  pendingMsg: { color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, lineHeight: 18 },
  sectionTitle: { color: Colors.neonGreen, fontFamily: Fonts.bold, marginTop: Spacing.sm },
  sectionHint: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: -4 },
  compRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  compLabel: { color: Colors.textPrimary, flex: 1 },
  compRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compVal: { color: Colors.textPrimary, fontFamily: Fonts.semiBold },
  compStatus: { fontSize: FontSizes.xs },
  chevron: { color: Colors.textSecondary, fontSize: FontSizes.md, marginLeft: 2 },
  actionCard: { backgroundColor: 'rgba(168,224,42,0.08)', borderRadius: Radius.card, padding: Spacing.md, gap: 8, marginTop: Spacing.md },
  actionTitle: { color: Colors.neonGreen, fontFamily: Fonts.bold },
  actionText: { color: Colors.textSecondary, fontSize: FontSizes.xs, lineHeight: 18 },
  actionBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center', marginTop: 4 },
  actionBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  backBtn: { backgroundColor: Colors.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, borderWidth: 1, borderColor: '#1a1a1a' },
  backText: { color: Colors.textPrimary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { width: '100%', backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: '#1a1a1a' },
  modalTitle: { color: Colors.textPrimary, fontFamily: Fonts.bold },
  modalHint: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  modalCancel: { alignItems: 'center', paddingVertical: Spacing.xs },
  modalCancelText: { color: Colors.textSecondary },
});
