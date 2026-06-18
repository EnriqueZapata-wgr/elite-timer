/**
 * ProcessingMiniBanner — banner sticky global (montado en _layout) que muestra el estado del
 * lab en proceso/terminado en TODAS las pantallas. Tap → re-expande el sheet. Auto-dismiss del
 * estado 'extracted' a los 8s. Estado desde useLabProcessing.
 */
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useLabProcessing } from '@/src/hooks/useLabProcessing';
import { bannerUpload, activeCount } from '@/src/hooks/lab-processing-reducer';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SEMANTIC } from '@/src/constants/brand';

const TAB_BAR_APPROX = 60; // alto aproximado del tab bar (flag: no hay hook de altura accesible aquí)
const AUTO_DISMISS_MS = 8000;

export function ProcessingMiniBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, openSheet, dismiss, retryUpload } = useLabProcessing();
  const upload = bannerUpload(state);
  const count = activeCount(state);
  const [elapsed, setElapsed] = useState(0);

  const status = upload?.status;
  const uploadId = upload?.uploadId;
  const uploadedAt = upload?.uploadedAt;

  // Ticker de elapsed mientras procesa.
  useEffect(() => {
    if (status !== 'processing' && status !== 'pending') return;
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - new Date(uploadedAt ?? Date.now()).getTime()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, uploadedAt]);

  // Auto-dismiss del 'extracted' a los 8s.
  useEffect(() => {
    if (status !== 'extracted' || !uploadId) return;
    const id = setTimeout(() => dismiss(uploadId), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [status, uploadId, dismiss]);

  // No render: nada que mostrar, o el sheet completo ya está abierto.
  if (!upload || !uploadId || state.sheetExpanded) return null;

  const bottom = insets.bottom + TAB_BAR_APPROX + 8;
  const isProcessing = status === 'pending' || status === 'processing';
  const isExtracted = status === 'extracted';
  const isFailed = status === 'failed';

  const borderColor = isFailed ? SEMANTIC.error : isExtracted ? Colors.neonGreen : Colors.neonGreen + '4D';
  const label = isProcessing
    ? (count > 1 ? `Procesando ${count} labs… ${elapsed}s` : `Procesando lab… ${elapsed}s`)
    : isExtracted ? 'Lab listo — Toca para revisar' : 'No pudimos leer el archivo';

  return (
    <Animated.View
      entering={FadeInUp.springify()}
      exiting={FadeOutDown.springify()}
      style={[styles.wrap, { bottom, borderColor }]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.row}
        onPress={() => { haptic.light(); openSheet(uploadId); }}
        disabled={isFailed}
      >
        <Text style={styles.emoji}>{isExtracted ? '✅' : isFailed ? '⚠️' : '🧪'}</Text>
        <Text style={[styles.label, isFailed && { color: SEMANTIC.error }]} numberOfLines={1}>{label}</Text>

        {isProcessing ? <ActivityIndicator size="small" color={Colors.neonGreen} /> : null}

        {isFailed ? (
          <View style={styles.failActions}>
            <Pressable onPress={() => { haptic.medium(); retryUpload(uploadId); }} hitSlop={8} style={styles.failBtn}>
              <Text style={styles.failBtnText}>Reintentar</Text>
            </Pressable>
            <Pressable
              onPress={() => { haptic.light(); router.push({ pathname: '/edad-atp/biomarkers', params: { sourceUploadId: uploadId, sourceFileName: upload.fileName } } as any); dismiss(uploadId); }}
              hitSlop={8} style={styles.failBtn}
            >
              <Text style={styles.failBtnText}>Manual</Text>
            </Pressable>
          </View>
        ) : null}

        {(isExtracted || isFailed) ? (
          <Pressable onPress={() => { haptic.light(); dismiss(uploadId); }} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: Spacing.md, right: Spacing.md, zIndex: 200,
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderTopWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  emoji: { fontSize: 16 },
  label: { flex: 1, color: Colors.textPrimary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  failActions: { flexDirection: 'row', gap: Spacing.xs },
  failBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: '#333' },
  failBtnText: { color: Colors.neonGreen, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  close: { padding: 2 },
});
