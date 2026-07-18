/**
 * LabProcessingSheet — bottom sheet expandido del procesamiento de un lab. Reusa el
 * ExpandableSheet (drag/snap/backdrop) ya probado en el sprint Paty. Estado y visibilidad
 * vienen de useLabProcessing; drag-down → minimiza al mini-banner (no cierra).
 *
 * Se monta GLOBAL en _layout para sobrevivir navegación.
 */
import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { ExpandableSheet } from '@/src/components/ui/ExpandableSheet';
import { ProcessingOrbAnimation } from '@/src/components/labs/ProcessingOrbAnimation';
import { useLabProcessing } from '@/src/hooks/useLabProcessing';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SEMANTIC } from '@/src/constants/brand';

function IndeterminateBar() {
  const x = useSharedValue(-0.4);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.bezier(0.4, 0, 0.2, 1) }), -1, false);
    return () => { x.value = -0.4; };
  }, [x]);
  const style = useAnimatedStyle(() => ({ left: `${x.value * 100}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.bar, style]} />
    </View>
  );
}

export function LabProcessingSheet() {
  const router = useRouter();
  const { state, minimizeSheet, closeSheet, retryUpload, cancelUpload } = useLabProcessing();
  const uploadId = state.sheetUploadId;
  const upload = uploadId ? state.uploads[uploadId] : null;
  const visible = state.sheetExpanded && !!upload;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!visible || !upload) return;
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - new Date(upload.uploadedAt).getTime()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visible, upload?.uploadId, upload?.uploadedAt]);

  if (!upload) return <ExpandableSheet visible={false} onClose={minimizeSheet}><View /></ExpandableSheet>;

  const status = upload.status;
  const orbStatus = status === 'extracted' ? 'extracted' : status === 'failed' ? 'failed' : 'processing';
  const sizeKb = upload.fileSize > 0 ? `${(upload.fileSize / (1024 * 1024)).toFixed(1)} MB` : null;

  const goConfirm = () => {
    haptic.medium();
    closeSheet();
    router.push({ pathname: '/edad-atp/lab-confirmation', params: { uploadId: upload.uploadId } });
  };
  const goManual = () => {
    haptic.light();
    closeSheet();
    router.push({ pathname: '/edad-atp/biomarkers', params: { sourceUploadId: upload.uploadId, sourceFileName: upload.fileName } });
  };

  return (
    <ExpandableSheet visible={visible} onClose={minimizeSheet} title="LABORATORIO">
      <View style={styles.body}>
        <ProcessingOrbAnimation status={orbStatus} size={120} />

        <Text style={styles.title}>
          {status === 'extracted' ? '¡Lab listo!' : status === 'failed' ? 'No pudimos leer el archivo' : 'ARGOS está analizando tu laboratorio'}
        </Text>

        <Text style={styles.fileName} numberOfLines={1}>📄 {upload.fileName}</Text>
        <Text style={styles.meta}>
          {upload.pageCount ? `${upload.pageCount} páginas · ` : ''}{sizeKb ? `${sizeKb} · ` : ''}{elapsed}s
        </Text>

        {status === 'pending' || status === 'processing' ? (
          <>
            <Text style={styles.state}>Procesando…</Text>
            <IndeterminateBar />
            <Text style={styles.caption}>
              Esto suele tardar 30–60 segundos. Puedes deslizar hacia abajo para minimizar y seguir usando la app.
            </Text>
          </>
        ) : null}

        {status === 'extracted' ? (
          <Pressable onPress={goConfirm} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Revisar valores</Text>
          </Pressable>
        ) : null}

        {status === 'failed' ? (
          <>
            {upload.errorMessage ? <Text style={styles.errorMsg}>{upload.errorMessage}</Text> : null}
            <View style={styles.failRow}>
              <Pressable onPress={() => { haptic.medium(); retryUpload(upload.uploadId); }} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Reintentar</Text>
              </Pressable>
              <Pressable onPress={goManual} style={styles.ghostBtn}>
                <Text style={styles.ghostBtnText}>Capturar manual</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <Pressable onPress={() => { haptic.light(); cancelUpload(upload.uploadId); }} style={styles.cancel}>
          <Text style={styles.cancelText}>{status === 'failed' || status === 'extracted' ? 'Descartar' : 'Cancelar'}</Text>
        </Pressable>
      </View>
    </ExpandableSheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.sm },
  title: { color: Colors.textPrimary, fontFamily: Fonts.bold, fontSize: FontSizes.lg, textAlign: 'center', marginTop: Spacing.sm },
  fileName: { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, marginTop: Spacing.xs },
  meta: { color: Colors.textMuted, fontFamily: Fonts.regular, fontSize: FontSizes.xs },
  state: { color: Colors.neonGreen, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, marginTop: Spacing.sm },
  track: { width: '100%', height: 4, borderRadius: 2, backgroundColor: '#1a1a1a', overflow: 'hidden', marginTop: Spacing.xs },
  bar: { position: 'absolute', top: 0, bottom: 0, width: '40%', borderRadius: 2, backgroundColor: Colors.neonGreen },
  caption: { color: Colors.textMuted, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 18 },
  errorMsg: { color: SEMANTIC.error, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.xs },
  primaryBtn: { backgroundColor: Colors.neonGreen, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, alignItems: 'center', marginTop: Spacing.md, minWidth: 160 },
  primaryBtnText: { color: Colors.textOnGreen, fontFamily: Fonts.bold },
  failRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  ghostBtn: { borderWidth: 1, borderColor: '#333', borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  ghostBtnText: { color: Colors.textSecondary, fontFamily: Fonts.semiBold },
  cancel: { paddingVertical: Spacing.sm, marginTop: Spacing.xs },
  cancelText: { color: Colors.textMuted, fontSize: FontSizes.sm },
});
