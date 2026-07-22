/**
 * ATP Labs — vista CANÓNICA de laboratorios (fuente de verdad `lab_values`). Lista los
 * parámetros con su último valor, agrupados por categoría de la matriz (#13), con filtros
 * por orden. Tap en un parámetro → gráfica de continuum con banda funcional ATP (#4).
 * Long-press → popup de descripción (#3). Nomenclatura desde component-meta (#2).
 *
 * ATP Labs = espejo del último valor (igual fuente que ATP Edad): un solo valor real.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlobalTopBar } from '@/src/components/ui/GlobalTopBar';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { loadCanonicalLabValues, collapseLanguageDuplicates, loadAllSeries, type CanonicalValue, type LabValueSource } from '@/src/services/edad-atp/lab-values-service';
import { trendFromSeries, interpretValue, type Trend, type SeriePoint } from '@/src/components/edad-atp/parameter-chart-model';
import { loadUserData } from '@/src/services/edad-atp/edad-atp-v2-service';
import { getLabParamMeta } from '@/src/components/edad-atp/component-meta';
import { findMatrizParam, findMatrizDomain } from '@/src/constants/edad-atp-matriz-lookup';
import { CANONICAL_PCT_KEYS, decimalToPct } from '@/src/constants/lab-canonical-map';
import { isClinicalOnlyParam } from '@/src/constants/lab-clinical-ranges';
import { score9Bands } from '@/src/services/edad-atp/sf-9band-service';
import { EDAD_STATUS, EDAD_PENDING_COLOR } from '@/src/components/edad-atp/tokens';
import { LabInfoPopup } from '@/src/components/edad-atp/LabInfoPopup';
import { ParameterChart } from '@/src/components/edad-atp/ParameterChart';
import { getLocalToday } from '@/src/utils/date-helpers';
import type { Sex } from '@/src/types/edad-atp-v2';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { ResultDisclaimerFooter } from '@/src/components/legal/ResultDisclaimerFooter';


type Row = {
  key: string;
  display_name: string;
  abbr: string;
  unit?: string;
  displayValue: number;
  measured_at: string;
  source: LabValueSource;
  is_stale: boolean;
  color: string;
  domain_name: string;
  domain_key: string;
  clinical_only: boolean;
  /** F4.1: tendencia de las últimas mediciones (null con <2 datos). */
  trend: Trend | null;
};

const TREND_ICON: Record<Trend, { icon: 'trending-up' | 'trending-down' | 'remove'; label: string }> = {
  up: { icon: 'trending-up', label: 'subiendo' },
  down: { icon: 'trending-down', label: 'bajando' },
  flat: { icon: 'remove', label: 'estable' },
};

type SortMode = 'panel' | 'fecha' | 'estado';

const SOURCE_LABEL: Record<LabValueSource, string> = {
  lab_pdf: 'PDF de lab', manual: 'Manual', upload_extract: 'PDF parseado', wearable: 'Wearable', form: 'Captura',
};

/** Valor para mostrar: las claves pct (hba1c/hematocrito/rdw_cv) se enseñan en %. */
function toDisplay(key: string, value: number): number {
  const v = CANONICAL_PCT_KEYS.has(key) ? decimalToPct(value) : value;
  return Math.round(v * 100) / 100;
}

/** Color de estado por banda de la matriz (óptimo/aceptable/atención) o gris si no hay banda. */
function statusColor(sex: Sex, key: string, value: number): string {
  const p = findMatrizParam(sex, key);
  if (!p) return EDAD_PENDING_COLOR;
  const s = score9Bands(value, p.bandLimits);
  if (s == null) return EDAD_PENDING_COLOR;
  if (s >= 80) return EDAD_STATUS.good;
  if (s >= 50) return EDAD_STATUS.neutral;
  return EDAD_STATUS.bad;
}

function AtpLabsScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [rows, setRows] = useState<Row[]>([]);
  const [sex, setSex] = useState<Sex>('male');
  const [sort, setSort] = useState<SortMode>('panel');
  const [loading, setLoading] = useState(true);
  const [popupKey, setPopupKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [series, setSeries] = useState<Record<string, SeriePoint[]>>({});
  const [showAllRanges, setShowAllRanges] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await loadUserData(user.id);
      const sx: Sex = data.sex;
      // #labs-desmadre: colapsar duplicados por idioma SOLO para display (no afecta al motor v2,
      // que lee por su propio bridge). Funde `testosterone` en `testosterona_total`, etc.
      // F4: series completas en UNA query — tendencias en cards + gráficas sin round-trip.
      const [canonRaw, allSeries] = await Promise.all([
        loadCanonicalLabValues(user.id),
        loadAllSeries(user.id),
      ]);
      const canon = collapseLanguageDuplicates(canonRaw);
      if (!alive) return;
      const seriesMap: Record<string, SeriePoint[]> = {};
      for (const [key, raw] of Object.entries(allSeries)) {
        const isPct = CANONICAL_PCT_KEYS.has(key);
        seriesMap[key] = raw.map((p) => ({ ...p, value: p.value == null ? null : isPct ? decimalToPct(p.value) : p.value }));
      }
      const built: Row[] = Object.entries(canon).map(([key, cv]: [string, CanonicalValue]) => {
        const meta = getLabParamMeta(key);
        const dom = findMatrizDomain(sx, key);
        return {
          key,
          display_name: meta.display_name,
          abbr: meta.abbr,
          unit: meta.unit,
          displayValue: toDisplay(key, cv.value),
          measured_at: cv.measured_at,
          source: cv.source,
          is_stale: cv.is_stale,
          color: statusColor(sx, key, cv.value),
          domain_name: dom?.domain_name_es ?? 'Otros',
          domain_key: dom?.domain_key ?? 'otros',
          clinical_only: isClinicalOnlyParam(key),
          trend: trendFromSeries(seriesMap[key] ?? []),
        };
      });
      setSex(sx);
      setSeries(seriesMap);
      setRows(built);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]));

  const onToggleChart = useCallback((key: string) => {
    haptic.medium();
    setExpanded((prev) => (prev === key ? null : key));
  }, []);

  const sorted = sortRows(rows, sort);
  const grouped = groupForRender(sorted, sort);

  return (
    <Screen edges={[]}>
      <GlobalTopBar title="ATP Labs" />
      <ScrollView contentContainerStyle={styles.content}>
        <EliteText variant="caption" style={styles.subtitle}>
          Tus laboratorios — el último valor de cada parámetro. Mantén apretado para saber qué es.
        </EliteText>

        {/* Filtros de orden (#13) */}
        <View style={styles.filterRow}>
          {(['panel', 'fecha', 'estado'] as SortMode[]).map((m) => (
            <Pressable key={m} onPress={() => { haptic.light?.(); setSort(m); }} style={[styles.chip, sort === m && styles.chipActive]}>
              <EliteText variant="caption" style={[styles.chipText, sort === m && styles.chipTextActive]}>
                {m === 'panel' ? 'Por panel' : m === 'fecha' ? 'Por fecha' : 'Por estado'}
              </EliteText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <EliteText variant="caption" style={styles.empty}>Cargando…</EliteText>
        ) : rows.length === 0 ? (
          <EliteText variant="caption" style={styles.empty}>
            Aún no hay laboratorios. Sube un PDF o captura biomarcadores para verlos aquí.
          </EliteText>
        ) : (
          grouped.map((g) => (
            <View key={g.title} style={styles.group}>
              <EliteText variant="caption" style={styles.groupTitle}>{g.title}</EliteText>
              {g.rows.map((r) => (
                <View key={r.key} style={styles.rowWrap}>
                  <Pressable
                    style={styles.row}
                    onPress={() => onToggleChart(r.key)}
                    onLongPress={() => { haptic.medium(); setPopupKey(r.key); }}
                    delayLongPress={350}
                  >
                    <View style={{ flex: 1 }}>
                      <EliteText variant="body" style={styles.rowName}>{r.display_name}</EliteText>
                      <EliteText variant="caption" style={styles.rowMeta}>
                        {SOURCE_LABEL[r.source]} · {r.measured_at}{r.is_stale ? ' · ⚠ >1 año' : ''}
                      </EliteText>
                      {r.clinical_only ? (
                        <EliteText variant="caption" style={styles.clinicalNote}>
                          Rango clínico (pendiente rango funcional)
                        </EliteText>
                      ) : null}
                    </View>
                    {r.trend ? (
                      <Ionicons name={TREND_ICON[r.trend].icon} size={13} color={Colors.textSecondary} />
                    ) : null}
                    <EliteText style={[styles.rowValue, { color: r.is_stale ? EDAD_PENDING_COLOR : r.color }]}>
                      {r.displayValue}{r.unit ? ` ${r.unit}` : ''}
                    </EliteText>
                    <Ionicons name={expanded === r.key ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
                  </Pressable>
                  {expanded === r.key ? (
                    <View style={styles.chartBox}>
                      {renderRangeSummary(sex, r)}
                      <ParameterChart
                        series={series[r.key] ?? []}
                        bandLimits={pctAdjustedBandLimits(sex, r.key)}
                        todayISO={getLocalToday()}
                        unit={r.unit}
                        width={width - Spacing.md * 2 - Spacing.md * 2}
                        showAllRanges={showAllRanges}
                      />
                      <View style={styles.rangeToggleRow}>
                        <Pressable
                          onPress={() => { haptic.light(); setShowAllRanges(false); }}
                          style={[styles.rangeToggle, !showAllRanges && styles.rangeToggleActive]}
                        >
                          <EliteText variant="caption" style={[styles.rangeToggleText, !showAllRanges && styles.rangeToggleTextActive]}>
                            Solo funcional
                          </EliteText>
                        </Pressable>
                        <Pressable
                          onPress={() => { haptic.light(); setShowAllRanges(true); }}
                          style={[styles.rangeToggle, showAllRanges && styles.rangeToggleActive]}
                        >
                          <EliteText variant="caption" style={[styles.rangeToggleText, showAllRanges && styles.rangeToggleTextActive]}>
                            Todos los rangos
                          </EliteText>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ))
        )}
        {/* Compliance S4: footer de resultados (posicionamiento §2) */}
        <ResultDisclaimerFooter />
      </ScrollView>

      <LabInfoPopup
        parameterKey={popupKey}
        value={popupKey ? rows.find((r) => r.key === popupKey)?.displayValue ?? null : null}
        onClose={() => setPopupKey(null)}
      />
    </Screen>
  );
}

/** bandLimits de la matriz, convertidos a % para las claves pct (coherente con la serie). */
function pctAdjustedBandLimits(sex: Sex, key: string): (number | null)[] | null {
  const p = findMatrizParam(sex, key);
  if (!p) return null;
  if (!CANONICAL_PCT_KEYS.has(key)) return p.bandLimits;
  return p.bandLimits.map((b) => (b == null ? null : decimalToPct(b)));
}

/**
 * F4.1: resumen de rangos + interpretación 1-línea sobre la gráfica.
 * Verde = rango funcional ATP ([3]-[4]); gris = rango amplio aceptable ([1]-[6]).
 */
function renderRangeSummary(sex: Sex, r: Row) {
  const limits = pctAdjustedBandLimits(sex, r.key);
  if (!limits) {
    return (
      <EliteText variant="caption" style={styles.rangeInfoMuted}>
        Sin banda funcional en la matriz — se muestra solo el historial.
      </EliteText>
    );
  }
  const fnLo = limits[3];
  const fnHi = limits[4];
  const outLo = limits[1];
  const outHi = limits[6];
  const interp = interpretValue(r.displayValue, limits);
  return (
    <View style={styles.rangeInfoBox}>
      <View style={styles.rangeInfoRow}>
        {fnLo != null && fnHi != null ? (
          <EliteText variant="caption" style={styles.rangeInfoFunctional}>
            Funcional: {fnLo}–{fnHi}{r.unit ? ` ${r.unit}` : ''}
          </EliteText>
        ) : null}
        {outLo != null && outHi != null ? (
          <EliteText variant="caption" style={styles.rangeInfoOuter}>
            Amplio: {outLo}–{outHi}
          </EliteText>
        ) : null}
        {r.trend ? (
          <EliteText variant="caption" style={styles.rangeInfoOuter}>
            Tendencia: {TREND_ICON[r.trend].label}
          </EliteText>
        ) : null}
      </View>
      {interp ? (
        <EliteText variant="caption" style={[styles.rangeInterp, { color: r.color }]}>
          {interp}
        </EliteText>
      ) : null}
    </View>
  );
}

function sortRows(rows: Row[], sort: SortMode): Row[] {
  const copy = [...rows];
  if (sort === 'fecha') copy.sort((a, b) => (a.measured_at < b.measured_at ? 1 : -1));
  else if (sort === 'estado') {
    const rank: Record<string, number> = { [EDAD_STATUS.bad]: 0, [EDAD_STATUS.neutral]: 1, [EDAD_STATUS.good]: 2, [EDAD_PENDING_COLOR]: 3 };
    copy.sort((a, b) => (rank[a.color] ?? 9) - (rank[b.color] ?? 9));
  } else copy.sort((a, b) => a.display_name.localeCompare(b.display_name));
  return copy;
}

function groupForRender(rows: Row[], sort: SortMode): { title: string; rows: Row[] }[] {
  if (sort === 'panel') {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const arr = map.get(r.domain_name) ?? [];
      arr.push(r);
      map.set(r.domain_name, arr);
    }
    return [...map.entries()].map(([title, rs]) => ({ title, rows: rs }));
  }
  return [{ title: sort === 'fecha' ? 'Más recientes primero' : 'Por estado', rows }];
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  subtitle: { color: Colors.textSecondary, marginBottom: Spacing.xs, lineHeight: 16 },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.xs },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: '#1a1a1a' },
  chipActive: { backgroundColor: 'rgba(168,224,42,0.14)', borderColor: 'rgba(168,224,42,0.4)' },
  chipText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  chipTextActive: { color: Colors.neonGreen, fontFamily: Fonts.semiBold },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.md, lineHeight: 18 },
  group: { gap: 2, marginBottom: Spacing.sm },
  groupTitle: { color: Colors.textMuted, letterSpacing: 1, marginBottom: 2, textTransform: 'uppercase' },
  rowWrap: { backgroundColor: Colors.surface, borderRadius: Radius.card, borderWidth: 1, borderColor: '#1a1a1a', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  rowName: { color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  rowMeta: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 1 },
  clinicalNote: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 1, fontStyle: 'italic' },
  rowValue: { fontFamily: Fonts.bold, fontSize: FontSizes.md },
  chartBox: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  rangeInfoBox: { marginBottom: Spacing.xs },
  rangeInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  rangeInfoFunctional: { color: '#4ade80', fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  rangeInfoOuter: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  rangeInfoMuted: { color: Colors.textMuted, fontSize: FontSizes.xs, marginBottom: Spacing.xs },
  rangeInterp: { fontSize: FontSizes.xs, marginTop: 3, lineHeight: 15 },
  rangeToggleRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  rangeToggle: { paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: Radius.md, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1a1a1a' },
  rangeToggleActive: { backgroundColor: 'rgba(168,224,42,0.14)', borderColor: 'rgba(168,224,42,0.4)' },
  rangeToggleText: { color: Colors.textMuted, fontSize: FontSizes.xs },
  rangeToggleTextActive: { color: Colors.neonGreen, fontFamily: Fonts.semiBold },
});

// #42: gate de disclaimers médicos — modal en primera visita (o bump de versión).
export default function AtpLabsScreenGated() {
  return (
    <MedicalDisclaimerGate>
      <AtpLabsScreen />
    </MedicalDisclaimerGate>
  );
}
