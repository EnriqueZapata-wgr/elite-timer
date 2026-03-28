/**
 * Mi Salud — Cliente sube estudios de laboratorio y ve resultados.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
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
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';

const TEAL = '#1D9E75';

export default function MyHealthScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [uploads, setUploads] = useState<LabUpload[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ count: number } | { error: string } | null>(null);

  useEffect(() => { if (userId) loadData(); }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, l] = await Promise.all([getLabUploads(userId), getLabHistory(userId)]);
      setUploads(u);
      setLabs(l);
    } catch { /* */ }
    setLoading(false);
  };

  const handlePickImage = async (useCamera: boolean) => {
    if (!ImagePicker) {
      Alert.alert('No disponible', 'Necesitas actualizar la app para usar la cámara. Instala el APK más reciente.');
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
      Alert.alert('No disponible', 'Necesitas actualizar la app. Instala el APK más reciente.');
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
        <EliteText style={s.title}>MI SALUD</EliteText>

        {/* Subir estudio */}
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
          <View style={[s.statusBox, { borderColor: '#a8e02a30' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#a8e02a" />
            <EliteText variant="caption" style={{ color: '#a8e02a' }}>
              ¡Estudio analizado! {result.count} valores extraídos. Tu coach lo revisará.
            </EliteText>
          </View>
        )}
        {result && 'error' in result && (
          <View style={[s.statusBox, { borderColor: '#E24B4A30' }]}>
            <Ionicons name="alert-circle" size={20} color="#E24B4A" />
            <EliteText variant="caption" style={{ color: '#E24B4A' }}>{result.error}</EliteText>
          </View>
        )}

        {/* Uploads fallidos */}
        {uploads.filter(u => u.status === 'failed' || u.status === 'processing').length > 0 && (
          <>
            <EliteText variant="caption" style={[s.sectionLabel, { color: '#E24B4A' }]}>UPLOADS CON ERROR</EliteText>
            {uploads.filter(u => u.status === 'failed' || u.status === 'processing').map(u => (
              <View key={u.id} style={[s.labCard, { borderColor: '#E24B4A20' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Ionicons name="alert-circle" size={16} color="#E24B4A" />
                  <EliteText variant="caption" style={{ color: '#aaa', flex: 1, fontSize: 12 }}>
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
                    <Ionicons name="trash-outline" size={18} color="#E24B4A" />
                  </Pressable>
                </View>
                {u.error_message && (
                  <EliteText variant="caption" style={{ color: '#E24B4A', fontSize: 10, marginTop: 4 }}>{u.error_message}</EliteText>
                )}
              </View>
            ))}
          </>
        )}

        {/* Labs */}
        {loading ? <ActivityIndicator color={TEAL} style={{ marginTop: Spacing.xl }} /> : (
          <>
            <EliteText variant="caption" style={s.sectionLabel}>MIS ESTUDIOS</EliteText>
            {labs.length === 0 ? (
              <EliteText variant="caption" style={{ color: '#555', textAlign: 'center', padding: Spacing.lg }}>
                Sin estudios registrados
              </EliteText>
            ) : (
              labs.map(lab => (
                <View key={lab.id} style={s.labCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <Ionicons name="flask-outline" size={16} color={TEAL} />
                    <EliteText variant="body" style={{ fontFamily: Fonts.semiBold, flex: 1 }}>
                      {lab.lab_name ?? 'Laboratorio'}
                    </EliteText>
                    <View style={[s.badge, lab.status === 'approved' ? { backgroundColor: '#a8e02a15' } : { backgroundColor: '#EF9F2715' }]}>
                      <EliteText variant="caption" style={{ color: lab.status === 'approved' ? '#a8e02a' : '#EF9F27', fontSize: 9, fontFamily: Fonts.bold }}>
                        {lab.status === 'approved' ? 'Aprobado' : 'En revisión'}
                      </EliteText>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                    <EliteText variant="caption" style={{ color: '#888' }}>
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
                        <Ionicons name="trash-outline" size={16} color="#E24B4A" />
                      </Pressable>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: '#111', borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 0.5, borderColor: '#222',
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
});
