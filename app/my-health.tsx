/**
 * Mi Salud — Cliente sube estudios de laboratorio y ve resultados.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Módulos nativos — importar con try/catch para OTA compat
let ImagePicker: any = null;
try { ImagePicker = require('expo-image-picker'); } catch { /* */ }
let DocumentPicker: any = null;
try { DocumentPicker = require('expo-document-picker'); } catch { /* */ }
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/GradientCard';
import { useAuth } from '@/src/contexts/auth-context';
import { uploadLabFile, extractLabValues, getLabHistory, getLabUploads, deleteLabUpload, deleteLabResult, type LabUpload, type LabResult } from '@/src/services/lab-service';
import { calculateAndSaveScore, getLatestScore } from '@/src/services/health-score-service';
import type { HealthScore } from '@/src/data/functional-health-engine';
import { getStudies, type ClinicalStudy } from '@/src/services/clinical-study-service';
import { getStudyType } from '@/src/data/study-types';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SEMANTIC, SURFACES, withOpacity, TEXT_COLORS } from '@/src/constants/brand';

const TEAL = CATEGORY_COLORS.metrics;

export default function MyHealthScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [uploads, setUploads] = useState<LabUpload[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [studies, setStudies] = useState<ClinicalStudy[]>([]);
  const [expandedStudy, setExpandedStudy] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ count: number } | { error: string } | null>(null);

  useEffect(() => { if (userId) loadData(); }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, l, st, hs] = await Promise.all([
        getLabUploads(userId),
        getLabHistory(userId),
        getStudies(userId, 10).catch(() => []),
        getLatestScore(userId).catch(() => null),
      ]);
      setUploads(u);
      setLabs(l);
      setStudies(st.filter(s => s.status === 'interpreted' || s.status === 'reviewed'));
      setHealthScore(hs);
    } catch { /* */ }
    setLoading(false);
  };

  /** Calcular/recalcular scores de salud */
  const handleCalculateScore = async () => {
    haptic.light();
    setCalculating(true);
    try {
      const score = await calculateAndSaveScore(userId);
      setHealthScore(score);
      haptic.success();
    } catch (err: any) {
      Alert.alert('Error al calcular', err.message || 'Verifica que tengas labs subidos y un perfil completo.');
      haptic.error();
    }
    setCalculating(false);
  };

  const handlePickImage = async (useCamera: boolean) => {
    if (!ImagePicker) {
      Alert.alert(
        'Cámara no disponible',
        'Toma una captura de pantalla de tu estudio y súbela desde la galería.',
      );
      return;
    }
    const opts = { quality: 0.8, base64: true };
    const res = useCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

    if (res.canceled || !res.assets?.[0]?.base64) return;
    await processUpload(res.assets[0].base64, 'image');
  };

  const handlePickPDF = async () => {
    if (!DocumentPicker) {
      Alert.alert(
        'PDF no disponible en esta versión',
        'Toma una foto del documento con la cámara — la IA puede leerlo igual de bien.',
        [
          { text: 'Tomar foto', onPress: () => handlePickImage(true) },
          { text: 'Galería', onPress: () => handlePickImage(false) },
          { text: 'Cancelar', style: 'cancel' },
        ],
      );
      return;
    }
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (res.canceled || !res.assets?.[0]) return;
      const uri = res.assets[0].uri;
      const fileRes = await fetch(uri);
      const blob = await fileRes.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
      await processUpload(base64, 'pdf');
    } catch (err: any) {
      setResult({ error: err.message ?? 'Error al seleccionar PDF' });
    }
  };

  const processUpload = async (base64: string, fileType: 'image' | 'pdf') => {
    setUploading(true);
    setResult(null);
    try {
      const { uploadId } = await uploadLabFile(userId, base64, fileType);
      setUploading(false);
      setProcessing(true);

      const extractResult = await extractLabValues(uploadId);
      if ('error' in extractResult) {
        setResult({ error: extractResult.error });
      } else {
        setResult({ count: extractResult.extractedCount });
        // Calcular scores automáticamente después de extraer
        try {
          const score = await calculateAndSaveScore(userId);
          setHealthScore(score);
        } catch { /* perfil incompleto, no bloquear */ }
      }
      loadData();
    } catch (err: any) {
      setResult({ error: err.message ?? 'Error al subir' });
    }
    setUploading(false);
    setProcessing(false);
  };

  return (
    <SafeAreaView style={s.screen}>
      <Pressable onPress={() => router.back()} style={s.backBtn}>
        <Ionicons name="chevron-back" size={28} color={TEAL} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText style={s.title}>MI SALUD</EliteText>
        </Animated.View>

        {/* Subir estudio */}
        <Animated.View entering={FadeInUp.delay(150).springify()}>
        <GradientCard color={TEAL} style={s.uploadCard}>
          <View style={s.uploadBody}>
            <Ionicons name="cloud-upload-outline" size={32} color={TEAL} />
            <EliteText variant="body" style={{ color: TEAL, fontFamily: Fonts.bold, marginTop: Spacing.sm }}>
              Sube tu estudio de laboratorio
            </EliteText>
            <EliteText variant="caption" style={{ color: Colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
              Toma foto o sube PDF — la IA extrae los valores automáticamente
            </EliteText>

            <View style={s.uploadBtns}>
              <Pressable onPress={() => handlePickImage(true)} style={s.uploadBtn} disabled={uploading || processing}>
                <Ionicons name="camera-outline" size={18} color={TEAL} />
                <EliteText variant="caption" style={{ color: TEAL, fontFamily: Fonts.semiBold }}>Cámara</EliteText>
              </Pressable>
              <Pressable onPress={() => handlePickImage(false)} style={s.uploadBtn} disabled={uploading || processing}>
                <Ionicons name="images-outline" size={18} color={TEAL} />
                <EliteText variant="caption" style={{ color: TEAL, fontFamily: Fonts.semiBold }}>Galería</EliteText>
              </Pressable>
              <Pressable onPress={handlePickPDF} style={s.uploadBtn} disabled={uploading || processing}>
                <Ionicons name="document-outline" size={18} color={TEAL} />
                <EliteText variant="caption" style={{ color: TEAL, fontFamily: Fonts.semiBold }}>PDF</EliteText>
              </Pressable>
            </View>
          </View>
        </GradientCard>
        </Animated.View>

        {/* Status */}
        {uploading && (
          <View style={s.statusBox}>
            <ActivityIndicator color={TEAL} />
            <EliteText variant="caption" style={{ color: TEAL }}>Subiendo archivo...</EliteText>
          </View>
        )}
        {processing && (
          <View style={s.statusBox}>
            <ActivityIndicator color={TEAL} />
            <EliteText variant="caption" style={{ color: TEAL }}>Analizando con IA...</EliteText>
          </View>
        )}
        {result && 'count' in result && (
          <View style={[s.statusBox, { borderColor: Colors.neonGreen + '30' }]}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.neonGreen} />
            <EliteText variant="caption" style={{ color: Colors.neonGreen }}>
              ¡Estudio analizado! {result.count} valores extraídos. Tus scores se han actualizado.
            </EliteText>
          </View>
        )}
        {result && 'error' in result && (
          <View style={[s.statusBox, { borderColor: SEMANTIC.error + '30' }]}>
            <Ionicons name="alert-circle" size={20} color={SEMANTIC.error} />
            <EliteText variant="caption" style={{ color: SEMANTIC.error }}>{result.error}</EliteText>
          </View>
        )}

        {/* ── SCORES DE SALUD ── */}
        {healthScore ? (
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <EliteText variant="caption" style={s.sectionLabel}>TUS SCORES</EliteText>
            <View style={s.scoresGrid}>
              <ScoreCard
                label="Edad biológica"
                value={healthScore.biologicalAge ? Math.round(healthScore.biologicalAge).toString() : '—'}
                unit="años"
                icon="fitness-outline"
                color={healthScore.biologicalAge && healthScore.agingRate
                  ? (healthScore.agingRate < 1.0 ? SEMANTIC.success : healthScore.agingRate < 1.1 ? SEMANTIC.warning : SEMANTIC.error)
                  : TEAL}
              />
              <ScoreCard
                label="Salud funcional"
                value={healthScore.functionalHealthScore ? Math.round(healthScore.functionalHealthScore).toString() : '—'}
                unit="/100"
                icon="heart-outline"
                color={healthScore.functionalHealthScore
                  ? (healthScore.functionalHealthScore > 80 ? SEMANTIC.success : healthScore.functionalHealthScore > 60 ? SEMANTIC.warning : SEMANTIC.error)
                  : TEAL}
              />
              <ScoreCard
                label="Envejecimiento"
                value={healthScore.agingRate ? healthScore.agingRate.toFixed(2) : '—'}
                unit="x"
                icon="hourglass-outline"
                color={healthScore.agingRate
                  ? (healthScore.agingRate < 1.0 ? SEMANTIC.success : healthScore.agingRate < 1.1 ? SEMANTIC.warning : SEMANTIC.error)
                  : TEAL}
              />
              <ScoreCard
                label="Calidad eval."
                value={healthScore.evaluationQuality != null ? Math.round(healthScore.evaluationQuality).toString() : '—'}
                unit="%"
                icon="clipboard-outline"
                color={healthScore.evaluationQuality
                  ? (healthScore.evaluationQuality > 70 ? SEMANTIC.success : healthScore.evaluationQuality > 40 ? SEMANTIC.warning : SEMANTIC.error)
                  : TEAL}
              />
            </View>

            {/* PhenoAge missing markers */}
            {healthScore.phenoAgeMissing && healthScore.phenoAgeMissing.length > 0 && (
              <View style={s.missingBox}>
                <Ionicons name="information-circle-outline" size={16} color={SEMANTIC.warning} />
                <EliteText variant="caption" style={{ color: SEMANTIC.warning, fontSize: FontSizes.xs, flex: 1 }}>
                  Para mejorar la precisión de tu edad biológica, necesitas: {healthScore.phenoAgeMissing.join(', ')}
                </EliteText>
              </View>
            )}

            {/* Dominios */}
            {healthScore.domains && healthScore.domains.length > 0 && (
              <View style={s.domainsSection}>
                <EliteText variant="caption" style={[s.sectionLabel, { marginTop: Spacing.sm }]}>DOMINIOS</EliteText>
                {healthScore.domains.map((d: any) => {
                  const pct = Math.round(d.functionalScore ?? 0);
                  const barColor = pct > 80 ? SEMANTIC.success : pct > 60 ? SEMANTIC.warning : SEMANTIC.error;
                  return (
                    <View key={d.key} style={s.domainRow}>
                      <EliteText variant="caption" style={s.domainLabel}>{d.name}</EliteText>
                      <View style={s.domainBarBg}>
                        <View style={[s.domainBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                      </View>
                      <EliteText variant="caption" style={[s.domainPct, { color: barColor }]}>{pct}</EliteText>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Recalcular */}
            <AnimatedPressable onPress={handleCalculateScore} disabled={calculating} style={s.recalcBtn}>
              <Ionicons name="refresh-outline" size={16} color={TEAL} />
              <EliteText variant="caption" style={{ color: TEAL, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm }}>
                {calculating ? 'Calculando...' : 'Recalcular scores'}
              </EliteText>
            </AnimatedPressable>
          </Animated.View>
        ) : labs.length > 0 ? (
          /* Hay labs pero no scores → botón para calcular */
          <AnimatedPressable onPress={handleCalculateScore} disabled={calculating} style={s.calcBtnHero}>
            <Ionicons name="analytics-outline" size={24} color={Colors.black} />
            <EliteText style={{ color: Colors.black, fontFamily: Fonts.bold, fontSize: FontSizes.lg }}>
              {calculating ? 'Calculando...' : 'Calcular mis scores'}
            </EliteText>
            <EliteText variant="caption" style={{ color: Colors.black + '80', fontSize: FontSizes.xs }}>
              Edad biológica, salud funcional y más
            </EliteText>
          </AnimatedPressable>
        ) : null}

        {/* Uploads fallidos */}
        {uploads.filter(u => u.status === 'failed' || u.status === 'processing').length > 0 && (
          <>
            <EliteText variant="caption" style={[s.sectionLabel, { color: SEMANTIC.error }]}>UPLOADS CON ERROR</EliteText>
            {uploads.filter(u => u.status === 'failed' || u.status === 'processing').map(u => (
              <View key={u.id} style={[s.labCard, { borderColor: SEMANTIC.error + '20' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Ionicons name="alert-circle" size={16} color={SEMANTIC.error} />
                  <EliteText variant="caption" style={{ color: Colors.textSecondary, flex: 1, fontSize: 12 }}>
                    {u.file_name ?? 'Archivo'} — {u.status === 'failed' ? 'Fallido' : 'Procesando'}
                  </EliteText>
                  <Pressable
                    onPress={() => {
                      Alert.alert('Eliminar', '¿Eliminar este upload fallido?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: async () => {
                          try { await deleteLabUpload(u.id); loadData(); } catch { /* */ }
                        }},
                      ]);
                    }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={SEMANTIC.error} />
                  </Pressable>
                </View>
                {u.error_message && (
                  <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 10, marginTop: 4 }}>{u.error_message}</EliteText>
                )}
              </View>
            ))}
          </>
        )}

        {/* Labs */}
        {loading ? <ActivityIndicator color={TEAL} style={{ marginTop: Spacing.xl }} /> : (
          <Animated.View entering={FadeInUp.delay(250).springify()}>
            <EliteText variant="caption" style={s.sectionLabel}>MIS LABS</EliteText>
            {labs.length === 0 ? (
              <EliteText variant="caption" style={{ color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg }}>
                Sin labs registrados
              </EliteText>
            ) : (
              labs.map(lab => (
                <View key={lab.id} style={s.labCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <Ionicons name="flask-outline" size={16} color={TEAL} />
                    <EliteText variant="body" style={{ fontFamily: Fonts.semiBold, flex: 1 }}>
                      {lab.lab_name ?? 'Laboratorio'}
                    </EliteText>
                    <View style={[s.badge, lab.status === 'approved' ? { backgroundColor: Colors.neonGreen + '15' } : { backgroundColor: SEMANTIC.warning + '15' }]}>
                      <EliteText variant="caption" style={{ color: lab.status === 'approved' ? Colors.neonGreen : SEMANTIC.warning, fontSize: 9, fontFamily: Fonts.bold }}>
                        {lab.status === 'approved' ? 'Aprobado' : 'En revisión'}
                      </EliteText>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                    <EliteText variant="caption" style={{ color: Colors.textSecondary }}>
                      {new Date(lab.lab_date + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </EliteText>
                    {lab.status !== 'approved' && (
                      <Pressable
                        onPress={() => {
                          Alert.alert('Eliminar', '¿Eliminar este estudio?', [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Eliminar', style: 'destructive', onPress: async () => {
                              try { await deleteLabResult(lab.id); loadData(); } catch { /* */ }
                            }},
                          ]);
                        }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={SEMANTIC.error} />
                      </Pressable>
                    )}
                  </View>
                </View>
              ))
            )}
          </Animated.View>
        )}
        {/* ── Estudios clínicos ── */}
        {studies.length > 0 && (
          <Animated.View entering={FadeInUp.delay(350).springify()}>
            <EliteText variant="caption" style={s.sectionLabel}>MIS ESTUDIOS</EliteText>
            {studies.map(study => {
              const st = getStudyType(study.study_type);
              const isExpanded = expandedStudy === study.id;
              const findings = (study.findings ?? []) as string[];
              const isReviewed = study.status === 'reviewed';
              return (
                <Pressable key={study.id} onPress={() => setExpandedStudy(isExpanded ? null : study.id)}
                  style={s.studyCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <EliteText style={{ fontSize: 20 }}>{st.emoji}</EliteText>
                    <View style={{ flex: 1 }}>
                      <EliteText variant="body" style={{ color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: 14 }}>{study.study_name}</EliteText>
                      <EliteText variant="caption" style={{ color: Colors.textSecondary, fontSize: 11 }}>
                        {new Date(study.study_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </EliteText>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
                  </View>
                  {findings.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: Spacing.sm }}>
                      {findings.map((f, i) => (
                        <View key={i} style={{ backgroundColor: TEAL + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                          <EliteText variant="caption" style={{ color: TEAL, fontSize: 10 }}>{f}</EliteText>
                        </View>
                      ))}
                    </View>
                  )}
                  {isExpanded && (
                    <View style={{ marginTop: Spacing.md }}>
                      {isReviewed && study.patient_summary ? (
                        <View style={s.studySummary}>
                          <EliteText variant="caption" style={{ color: TEAL, fontSize: 10, fontFamily: Fonts.bold, marginBottom: 4 }}>
                            ¿Qué significa tu estudio?
                          </EliteText>
                          <EliteText variant="caption" style={{ color: Colors.textPrimary, fontSize: 13, lineHeight: 20 }}>
                            {study.patient_summary}
                          </EliteText>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm }}>
                          <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                          <EliteText variant="caption" style={{ color: Colors.textSecondary }}>
                            Tu coach está revisando tu estudio
                          </EliteText>
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// === SUB-COMPONENTES ===

function ScoreCard({ label, value, unit, icon, color }: {
  label: string; value: string; unit: string; icon: string; color: string;
}) {
  return (
    <View style={s.scoreCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <Ionicons name={icon as any} size={14} color={color} />
        <EliteText variant="caption" style={{ color, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold }}>{label}</EliteText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <EliteText style={{ fontSize: FontSizes.hero, fontFamily: Fonts.extraBold, color }}>{value}</EliteText>
        <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs }}>{unit}</EliteText>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  backBtn: { position: 'absolute', top: Spacing.xxl, left: Spacing.md, zIndex: 10, padding: Spacing.sm },
  content: { paddingTop: Spacing.xxl + Spacing.lg, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  title: { fontSize: 32, fontFamily: Fonts.extraBold, color: TEAL, letterSpacing: 4, marginBottom: Spacing.lg },
  uploadCard: { marginBottom: Spacing.md },
  uploadBody: { alignItems: 'center', padding: Spacing.lg },
  uploadBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: TEAL + '40',
  },
  statusBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: TEAL + '08', borderWidth: 1, borderColor: TEAL + '20',
    borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionLabel: { color: Colors.textSecondary, letterSpacing: 3, fontSize: 12, fontFamily: Fonts.bold, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  labCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },

  // Scores
  scoresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  scoreCard: {
    width: '48%', flexGrow: 1, backgroundColor: SURFACES.card, borderRadius: Radius.card,
    borderWidth: 0.5, borderColor: SURFACES.border, padding: Spacing.md,
  },
  missingBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: SEMANTIC.warning + '10', borderRadius: Radius.sm,
    padding: Spacing.sm, marginTop: Spacing.sm,
  },
  domainsSection: { marginBottom: Spacing.sm },
  domainRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  domainLabel: { color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, width: 90 },
  domainBarBg: { flex: 1, height: 4, backgroundColor: SURFACES.cardLight, borderRadius: Radius.xs, overflow: 'hidden' },
  domainBarFill: { height: '100%', borderRadius: Radius.xs },
  domainPct: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, width: 28, textAlign: 'right' },
  recalcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, marginTop: Spacing.sm,
  },
  calcBtnHero: {
    backgroundColor: TEAL, borderRadius: Radius.card, alignItems: 'center',
    padding: Spacing.lg, gap: Spacing.xs, marginVertical: Spacing.md,
  },
  studyCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 0.5, borderColor: Colors.border, borderLeftWidth: 3, borderLeftColor: TEAL,
  },
  studySummary: {
    backgroundColor: '#0a1a15', borderRadius: 8, padding: Spacing.md, borderLeftWidth: 2, borderLeftColor: TEAL,
  },
});
