/**
 * Mi Salud — Cliente sube estudios de laboratorio y ve resultados.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Módulos nativos — importar con try/catch para OTA compat
let ImagePicker: any = null;
try { ImagePicker = require('expo-image-picker'); } catch { /* */ }
let DocumentPicker: any = null;
try { DocumentPicker = require('expo-document-picker'); } catch { /* */ }
import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { useAuth } from '@/src/contexts/auth-context';
import { uploadLabFile, extractLabValuesForReview, getLabHistory, getLabUploads, deleteLabUpload, deleteLabResult, type LabUpload, type LabResult, type LabReviewPayload } from '@/src/services/lab-service';
import { setReview } from '@/src/services/edad-atp/lab-review-store';
import { mergeReviews } from '@/src/services/edad-atp/lab-review-merge';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { getStudies, type ClinicalStudy } from '@/src/services/clinical-study-service';
import { parseLocalDate } from '@/src/utils/date-helpers';
import { getStudyType } from '@/src/data/study-types';
import { getLatestMeasurement, type HealthMeasurement } from '@/src/services/health-measurement-service';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SkeletonLoader } from '@/src/components/ui/SkeletonLoader';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { haptic } from '@/src/utils/haptics';
import { EdadAtpHeroCard } from '@/src/components/edad-atp/EdadAtpHeroCard';
import { UploadTypePicker } from '@/src/components/edad-atp/UploadTypePicker';
import { routeUploadByType, type UploadType } from '@/src/constants/upload-types';
import { captureRouteFor } from '@/src/constants/data-capture-routes';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SEMANTIC, SURFACES, withOpacity, TEXT_COLORS } from '@/src/constants/brand';
import { Screen } from '@/src/components/ui/Screen';
import { SectionTitle } from '@/src/components/ui/SectionTitle';

const TEAL = CATEGORY_COLORS.metrics;

export default function MyHealthScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const userId = user?.id ?? '';

  const [uploads, setUploads] = useState<LabUpload[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [healthMeasure, setHealthMeasure] = useState<HealthMeasurement | null>(null);
  const [studies, setStudies] = useState<ClinicalStudy[]>([]);
  const [expandedStudy, setExpandedStudy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<
    | { count: number; rejected?: number; files?: number }
    | { error: string; retriable?: boolean; uploadId?: string }
    | { context: string }
    | null
  >(null);
  // Progreso de subida múltiple (#9): {hechos, total} mientras procesa varias fotos.
  const [multiProgress, setMultiProgress] = useState<{ done: number; total: number } | null>(null);
  // Selector de tipo de upload (#10): método elegido pendiente + visibilidad del picker.
  const [pendingMethod, setPendingMethod] = useState<'camera' | 'gallery' | 'pdf' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => { if (userId) loadData(); }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, l, st, hm] = await Promise.all([
        getLabUploads(userId),
        getLabHistory(userId),
        getStudies(userId, 10).catch(() => []),
        getLatestMeasurement(userId).catch(() => null),
      ]);
      setUploads(u);
      setLabs(l);
      setStudies(st.filter(s => s.status === 'interpreted' || s.status === 'reviewed'));
      setHealthMeasure(hm);
    } catch { /* */ }
    setLoading(false);
  };

  // Paso 1 (#10): abrir el selector de tipo antes de elegir el archivo.
  const openTypePicker = (method: 'camera' | 'gallery' | 'pdf') => {
    setPendingMethod(method);
    setResult(null);
    setPickerVisible(true);
  };

  // Paso 2: tipo elegido → seguir con el método pendiente, llevando el tipo.
  const handleTypeSelected = (type: UploadType) => {
    setPickerVisible(false);
    const method = pendingMethod;
    if (method === 'camera') handlePickImage(true, type);
    else if (method === 'gallery') handlePickImage(false, type);
    else if (method === 'pdf') handlePickPDF(type);
  };

  const handlePickImage = async (useCamera: boolean, type?: UploadType) => {
    if (!ImagePicker) {
      Alert.alert(
        'Cámara no disponible',
        'Toma una captura de pantalla de tu estudio y súbela desde la galería.',
      );
      return;
    }
    // Galería permite selección múltiple (Mariana #9: antes solo dejaba una foto).
    // La cámara captura de a una.
    const opts: any = useCamera
      ? { quality: 0.8, base64: true }
      : { quality: 0.8, base64: true, allowsMultipleSelection: true, selectionLimit: 10 };
    const res = useCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

    if (res.canceled || !res.assets?.length) return;
    const images: string[] = res.assets.map((a: any) => a.base64).filter(Boolean);
    if (images.length === 0) return;
    if (images.length === 1) { await processUpload(images[0], 'image', type); return; }
    await processMultipleUploads(images, type);
  };

  const handlePickPDF = async (type?: UploadType) => {
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
      await processUpload(base64, 'pdf', type);
    } catch (err: any) {
      setResult({ error: err.message ?? 'Error al seleccionar PDF' });
    }
  };

  // Parser v2 (Capa 4): extrae SIN guardar → SIEMPRE abre la pantalla de confirmación
  // para que el usuario revise valores + fecha del estudio antes de guardar.
  // Decisión Enrique 2026-06-17: cero sorpresas, el usuario siempre confirma
  // (cambio respecto al flujo anterior que guardaba directo si todo era high+válido).
  const runReviewFlow = async (uploadId: string): Promise<void> => {
    const review = await extractLabValuesForReview(uploadId);
    if ('error' in review) {
      setResult({
        error: review.retriable
          ? review.error
          : `No pudimos leer laboratorios de este archivo. No se modificó tu data. (${review.error})`,
        retriable: review.retriable,
        uploadId,
      });
      return;
    }
    analytics.track(ATP_EVENTS.LAB_PARSER_V2_REVIEWED, { total: review.items.length, upload_id: uploadId });
    setReview(review);
    setResult(null);
    setProcessing(false);
    router.push({ pathname: '/edad-atp/lab-confirmation', params: { uploadId } } as any);
  };

  const processUpload = async (base64: string, fileType: 'image' | 'pdf', type?: UploadType) => {
    // Ruteo por tipo (#10/#11): solo Labs extrae a lab_values; el resto se adjunta como
    // contexto y NUNCA toca el motor (un archivo del tipo equivocado no corrompe labs).
    const route = routeUploadByType(type?.id ?? 'labs');
    setUploading(true);
    setResult(null);
    try {
      const { uploadId } = await uploadLabFile(userId, base64, fileType);
      setUploading(false);

      if (route.target === 'lab_values') {
        // Tipo Laboratorios → parser v2: extrae, y confirma con el usuario si hace falta.
        setProcessing(true);
        await runReviewFlow(uploadId);
      } else {
        // Composición y tipos 3-7 → guardado como respaldo/contexto, sin extraer a valores.
        const label = type?.label ?? 'Archivo';
        setResult({ context: route.target === 'composition'
          ? `${label} guardado. La composición por archivo aún no se extrae automáticamente — captúrala en Composición.`
          : `${label} guardado como respaldo de contexto. No alimenta tu Edad ATP.` });
      }
      loadData();
    } catch (err: any) {
      setResult({ error: err.message ?? 'Error al subir' });
    }
    setUploading(false);
    setProcessing(false);
  };

  // Subida múltiple de fotos de labs (#9): extrae las N fotos EN PARALELO, mergea en una sola
  // lista (duplicados entre fotos quedan como candidatos a elegir) y abre UNA pantalla de
  // confirmación consolidada. Doctrina: el usuario ve TODO antes de guardar.
  const processMultipleUploads = async (images: string[], type?: UploadType) => {
    const route = routeUploadByType(type?.id ?? 'labs');
    setResult(null);
    // Tipos que no son laboratorios no extraen al motor: procesar solo la primera como contexto.
    if (route.target !== 'lab_values') {
      await processUpload(images[0], 'image', type);
      return;
    }
    setProcessing(true);
    setMultiProgress({ done: 0, total: images.length });
    let done = 0;
    const settled = await Promise.all(
      images.map(async (img) => {
        try {
          const { uploadId } = await uploadLabFile(userId, img, 'image');
          const review = await extractLabValuesForReview(uploadId);
          done++; setMultiProgress({ done, total: images.length });
          return 'error' in review ? null : review;
        } catch {
          done++; setMultiProgress({ done, total: images.length });
          return null;
        }
      }),
    );
    setMultiProgress(null);
    const okReviews = settled.filter(Boolean) as LabReviewPayload[];
    if (okReviews.length === 0) {
      setProcessing(false);
      setResult({ error: `No pudimos leer ninguno de los ${images.length} archivos. Revisa que sean fotos legibles de laboratorios.` });
      loadData();
      return;
    }
    const merged = mergeReviews(okReviews);
    analytics.track(ATP_EVENTS.LAB_PARSER_V2_REVIEWED, { total: merged.items.length, photos: okReviews.length, upload_id: merged.uploadId });
    setReview(merged);
    setResult(null);
    setProcessing(false);
    router.push({ pathname: '/edad-atp/lab-confirmation', params: { uploadId: merged.uploadId } } as any);
  };

  // Reintento manual de extracción (#5): re-procesa un upload ya subido (fallido por red u
  // otro motivo) sin volver a pedir el archivo, por el flujo v2 (con confirmación si hace falta).
  const retryExtraction = async (uploadId: string) => {
    setResult(null);
    setProcessing(true);
    try {
      await runReviewFlow(uploadId);
    } catch (err: any) {
      setResult({ error: err?.message ?? 'Error al reintentar', retriable: true, uploadId });
    }
    setProcessing(false);
    loadData();
  };

  // Recomendaciones para mejorar la evaluación
  const impactColor = (impact: string) => impact === 'muy alto' ? SEMANTIC.error : impact === 'alto' ? SEMANTIC.warning : CATEGORY_COLORS.nutrition;

  const getRecommendations = (hm: HealthMeasurement | null, labList: LabResult[]) => {
    const recs: { icon: string; title: string; desc: string; impact: string; route: string }[] = [];
    if (!labList.length) recs.push({ icon: 'flask-outline', title: 'Sube laboratorios', desc: 'La IA calcula tu edad biológica con PhenoAge', impact: 'muy alto', route: '/my-health' });
    if (!hm?.grip_strength_kg) recs.push({ icon: 'hand-left-outline', title: 'Fuerza de agarre', desc: 'Predictor #1 de longevidad', impact: 'alto', route: captureRouteFor('grip_strength_kg') });
    if (!hm?.body_fat_pct) recs.push({ icon: 'body-outline', title: '% Grasa corporal', desc: 'Báscula de bioimpedancia mejora tu score', impact: 'alto', route: captureRouteFor('body_fat_pct') });
    if (!hm?.systolic_bp) recs.push({ icon: 'heart-outline', title: 'Presión arterial', desc: 'Hipertensión es silenciosa', impact: 'alto', route: captureRouteFor('systolic_bp') });
    if (!hm?.vo2max_estimate) recs.push({ icon: 'fitness-outline', title: 'VO2max', desc: 'Mejor predictor de mortalidad por todas las causas', impact: 'alto', route: captureRouteFor('vo2max_estimate') });
    if (!hm?.waist_cm) recs.push({ icon: 'resize-outline', title: 'Medidas corporales', desc: 'Ratio cintura/cadera = marcador cardiovascular', impact: 'medio', route: captureRouteFor('waist_cm') });
    return recs;
  };

  const recs = getRecommendations(healthMeasure, labs);

  return (
    <Screen>
      <PillarHeader pillar="metrics" title="Mi Salud" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* Héroe: Edad ATP (motor v2 + lab_values) — protagonista de Mi Salud (#9). */}
        {userId ? (
          <Animated.View entering={FadeInUp.springify()}>
            <EdadAtpHeroCard userId={userId} />
          </Animated.View>
        ) : null}

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
              <Pressable onPress={() => openTypePicker('camera')} style={s.uploadBtn} disabled={uploading || processing}>
                <Ionicons name="camera-outline" size={18} color={TEAL} />
                <EliteText variant="caption" style={{ color: TEAL, fontFamily: Fonts.semiBold }}>Cámara</EliteText>
              </Pressable>
              <Pressable onPress={() => openTypePicker('gallery')} style={s.uploadBtn} disabled={uploading || processing}>
                <Ionicons name="images-outline" size={18} color={TEAL} />
                <EliteText variant="caption" style={{ color: TEAL, fontFamily: Fonts.semiBold }}>Galería</EliteText>
              </Pressable>
              <Pressable onPress={() => openTypePicker('pdf')} style={s.uploadBtn} disabled={uploading || processing}>
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
            <EliteText variant="caption" style={{ color: TEAL }}>
              {multiProgress
                ? `Analizando ${multiProgress.done + 1} de ${multiProgress.total} con IA...`
                : 'Analizando con IA...'}
            </EliteText>
          </View>
        )}
        {result && 'count' in result && (
          <View style={[s.statusBox, { borderColor: Colors.neonGreen + '30', alignItems: 'flex-start' }]}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.neonGreen} />
            <View style={{ flex: 1 }}>
              <EliteText variant="caption" style={{ color: Colors.neonGreen }}>
                {result.files && result.files > 1
                  ? `¡${result.files} estudios analizados! ${result.count} valores extraídos en total. Tu Edad ATP se actualizó.`
                  : `¡Estudio analizado! ${result.count} valores extraídos. Tu Edad ATP se actualizó.`}
              </EliteText>
              {!!result.rejected && result.rejected > 0 && (
                <EliteText variant="caption" style={{ color: SEMANTIC.warning, marginTop: 6 }}>
                  ⚠️ {result.rejected} {result.rejected === 1 ? 'valor no pasó' : 'valores no pasaron'} la validación clínica y {result.rejected === 1 ? 'queda' : 'quedan'} como {result.rejected === 1 ? 'pendiente' : 'pendientes'}. Puedes ingresarlos a mano tocando cada biomarcador.
                </EliteText>
              )}
            </View>
          </View>
        )}
        {result && 'error' in result && (
          <View style={[s.statusBox, { borderColor: SEMANTIC.error + '30', alignItems: 'flex-start' }]}>
            <Ionicons name="alert-circle" size={20} color={SEMANTIC.error} />
            <View style={{ flex: 1 }}>
              <EliteText variant="caption" style={{ color: SEMANTIC.error }}>{result.error}</EliteText>
              {result.retriable && result.uploadId && (
                <Pressable onPress={() => retryExtraction(result.uploadId!)} disabled={processing} style={s.retryBtn}>
                  <Ionicons name="refresh" size={14} color={TEAL} />
                  <EliteText variant="caption" style={{ color: TEAL, fontFamily: Fonts.semiBold }}>Reintentar</EliteText>
                </Pressable>
              )}
            </View>
          </View>
        )}
        {result && 'context' in result && (
          <View style={[s.statusBox, { borderColor: TEAL + '30' }]}>
            <Ionicons name="document-attach-outline" size={20} color={TEAL} />
            <EliteText variant="caption" style={{ color: TEAL }}>{result.context}</EliteText>
          </View>
        )}

        {/* Recomendaciones */}
        {recs.length > 0 && (
          <Animated.View entering={FadeInUp.delay(250).springify()}>
            <SectionTitle style={s.sectionLabelSpacing}>DATOS POR CAPTURAR</SectionTitle>
            {recs.map((rec, i) => (
              <AnimatedPressable key={rec.title} onPress={() => { haptic.light(); router.push(rec.route as any); }} style={s.recCard}>
                <Ionicons name={rec.icon as any} size={20} color={impactColor(rec.impact)} />
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }}>{rec.title}</EliteText>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs }}>{rec.desc}</EliteText>
                </View>
                <View style={{ backgroundColor: withOpacity(impactColor(rec.impact), 0.12), paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm }}>
                  <EliteText variant="caption" style={{ color: impactColor(rec.impact), fontSize: FontSizes.xs, fontFamily: Fonts.bold }}>{rec.impact.toUpperCase()}</EliteText>
                </View>
              </AnimatedPressable>
            ))}
          </Animated.View>
        )}

        {/* Uploads fallidos */}
        {uploads.filter(u => u.status === 'failed' || u.status === 'processing').length > 0 && (
          <>
            <SectionTitle style={[s.sectionLabelSpacing, { color: SEMANTIC.error }]}>UPLOADS CON ERROR</SectionTitle>
            {uploads.filter(u => u.status === 'failed' || u.status === 'processing').map(u => (
              <View key={u.id} style={[s.labCard, { borderColor: SEMANTIC.error + '20' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Ionicons name="alert-circle" size={16} color={SEMANTIC.error} />
                  <EliteText variant="caption" style={{ color: Colors.textSecondary, flex: 1, fontSize: FontSizes.sm }}>
                    {u.file_name ?? 'Archivo'} — {u.status === 'failed' ? 'Fallido' : 'Procesando'}
                  </EliteText>
                  {u.status === 'failed' && (
                    <Pressable onPress={() => retryExtraction(u.id)} disabled={processing} style={{ padding: 6 }}>
                      <Ionicons name="refresh" size={18} color={TEAL} />
                    </Pressable>
                  )}
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
                  <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: FontSizes.xs, marginTop: 4 }}>{u.error_message}</EliteText>
                )}
              </View>
            ))}
          </>
        )}

        {/* Labs */}
        {loading ? (
          <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
            <SkeletonLoader variant="card" height={60} />
            <SkeletonLoader variant="card" height={60} />
          </View>
        ) : (
          <Animated.View entering={FadeInUp.delay(250).springify()}>
            <SectionTitle style={s.sectionLabelSpacing}>MIS LABS</SectionTitle>
            {labs.length === 0 ? (
              <EliteText variant="caption" style={{ color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg }}>
                Sin labs registrados
              </EliteText>
            ) : (
              labs.map(lab => {
                // #5: las capturas manuales (saveLabResults usa lab_name fijo) NO son un panel
                // de lab subido — diferenciarlas visualmente para no confundir al usuario.
                const isManual = lab.lab_name === 'Edad ATP (captura manual)';
                const displayName = isManual ? 'Biomarcadores (captura manual)' : (lab.lab_name ?? 'Laboratorio');
                return (
                <View key={lab.id} style={s.labCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <Ionicons name={isManual ? 'create-outline' : 'flask-outline'} size={16} color={isManual ? CATEGORY_COLORS.nutrition : TEAL} />
                    <EliteText variant="body" style={{ fontFamily: Fonts.semiBold, flex: 1 }}>
                      {displayName}
                    </EliteText>
                    {isManual ? (
                      <View style={[s.badge, { backgroundColor: CATEGORY_COLORS.nutrition + '15' }]}>
                        <EliteText variant="caption" style={{ color: CATEGORY_COLORS.nutrition, fontSize: FontSizes.xs, fontFamily: Fonts.bold }}>
                          Captura manual
                        </EliteText>
                      </View>
                    ) : (
                      <View style={[s.badge, {
                        backgroundColor: lab.status === 'approved' ? Colors.neonGreen + '15'
                          : lab.status === 'draft' ? TEAL + '15'
                          : SEMANTIC.warning + '15'
                      }]}>
                        <EliteText variant="caption" style={{
                          color: lab.status === 'approved' ? Colors.neonGreen
                            : lab.status === 'draft' ? TEAL
                            : SEMANTIC.warning,
                          fontSize: FontSizes.xs, fontFamily: Fonts.bold
                        }}>
                          {lab.status === 'approved' ? 'Aprobado' : lab.status === 'draft' ? 'Extraído' : 'En revisión'}
                        </EliteText>
                      </View>
                    )}
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
                );
              })
            )}
          </Animated.View>
        )}
        {/* ── Estudios clínicos ── */}
        {studies.length > 0 && (
          <Animated.View entering={FadeInUp.delay(350).springify()}>
            <SectionTitle style={s.sectionLabelSpacing}>MIS ESTUDIOS</SectionTitle>
            {studies.map(study => {
              const st = getStudyType(study.study_type);
              const isExpanded = expandedStudy === study.id;
              const findings = (study.findings ?? []) as string[];
              const isReviewed = study.status === 'reviewed';
              return (
                <Pressable key={study.id} onPress={() => setExpandedStudy(isExpanded ? null : study.id)}
                  style={s.studyCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <EliteText style={{ fontSize: FontSizes.xxl }}>{st.emoji}</EliteText>
                    <View style={{ flex: 1 }}>
                      <EliteText variant="body" style={{ color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }}>{study.study_name}</EliteText>
                      <EliteText variant="caption" style={{ color: Colors.textSecondary, fontSize: FontSizes.sm }}>
                        {parseLocalDate(study.study_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </EliteText>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
                  </View>
                  {findings.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: Spacing.sm }}>
                      {findings.map((f, i) => (
                        <View key={i} style={{ backgroundColor: TEAL + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.card }}>
                          <EliteText variant="caption" style={{ color: TEAL, fontSize: FontSizes.xs }}>{f}</EliteText>
                        </View>
                      ))}
                    </View>
                  )}
                  {isExpanded && (
                    <View style={{ marginTop: Spacing.md }}>
                      {isReviewed && study.patient_summary ? (
                        <View style={s.studySummary}>
                          <EliteText variant="caption" style={{ color: TEAL, fontSize: FontSizes.xs, fontFamily: Fonts.bold, marginBottom: 4 }}>
                            ¿Qué significa tu estudio?
                          </EliteText>
                          <EliteText variant="caption" style={{ color: Colors.textPrimary, fontSize: FontSizes.md, lineHeight: 20 }}>
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
        <MedicalDisclaimer feature="health" />
      </ScrollView>

      {/* Selector de tipo de upload (#10) — se pregunta antes de procesar. */}
      <UploadTypePicker
        visible={pickerVisible}
        onSelect={handleTypeSelected}
        onCancel={() => { setPickerVisible(false); setPendingMethod(null); }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
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
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.md,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
    alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: Radius.pill, borderWidth: 1, borderColor: TEAL + '40',
  },
  sectionLabelSpacing: { marginTop: Spacing.lg },
  labCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },

  // Scores
  recCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: SURFACES.card, borderRadius: Radius.card, padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  studyCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: TEAL,
  },
  studySummary: {
    // F41.10: 0.04 era casi invisible sobre el bg dark. Subido para legibilidad.
    backgroundColor: withOpacity(CATEGORY_COLORS.metrics, 0.12), borderRadius: Radius.sm, padding: Spacing.md, borderLeftWidth: 2, borderLeftColor: TEAL,
  },
});
