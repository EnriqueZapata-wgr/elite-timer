/**
 * SectionSaveHeader — Header de sección con botón Guardar explícito.
 */
import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { ATP_BRAND, SURFACES, TEXT_COLORS, SEMANTIC } from '@/src/constants/brand';
import { Fonts, Spacing, Radius } from '@/constants/theme';
import type { SaveStatus } from '@/src/hooks/useSectionSave';

interface Props {
  title: string;
  hasChanges: boolean;
  isSaving: boolean;
  saveStatus: SaveStatus;
  errorMessage?: string | null;
  onSave: () => void;
  titleColor?: string;
}

export function SectionSaveHeader({ title, hasChanges, isSaving, saveStatus, errorMessage, onSave, titleColor }: Props) {
  const btnDisabled = (!hasChanges && saveStatus !== 'error') || isSaving;

  return (
    <View style={st.container}>
      <View style={st.titleRow}>
        <EliteText variant="caption" style={[st.title, titleColor ? { color: titleColor } : undefined]}>{title}</EliteText>
        {hasChanges && <View style={st.unsavedDot} />}
      </View>

      <Pressable onPress={onSave} disabled={btnDisabled}
        style={[
          st.btn,
          hasChanges && st.btnActive,
          saveStatus === 'saved' && st.btnSaved,
          saveStatus === 'error' && st.btnError,
          btnDisabled && saveStatus !== 'error' && st.btnDisabled,
        ]}>
        {saveStatus === 'saving' ? (
          <View style={st.btnInner}>
            <ActivityIndicator size="small" color={TEXT_COLORS.onAccent} />
            <EliteText variant="caption" style={st.btnTextDark}>Guardando...</EliteText>
          </View>
        ) : saveStatus === 'saved' ? (
          <View style={st.btnInner}>
            <Ionicons name="checkmark-circle" size={14} color={ATP_BRAND.lime} />
            <EliteText variant="caption" style={[st.btnTextLight, { color: ATP_BRAND.lime }]}>Guardado</EliteText>
          </View>
        ) : saveStatus === 'error' ? (
          <View style={st.btnInner}>
            <Ionicons name="alert-circle" size={14} color={SEMANTIC.error} />
            <EliteText variant="caption" style={[st.btnTextLight, { color: SEMANTIC.error }]}>Reintentar</EliteText>
          </View>
        ) : (
          <View style={st.btnInner}>
            <Ionicons name="save-outline" size={12} color={hasChanges ? TEXT_COLORS.onAccent : TEXT_COLORS.muted} />
            <EliteText variant="caption" style={hasChanges ? st.btnTextDark : st.btnTextMuted}>Guardar</EliteText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  title: { fontSize: 12, fontFamily: Fonts.bold, letterSpacing: 2, color: TEXT_COLORS.secondary },
  unsavedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: SEMANTIC.warning },
  btn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm, minWidth: 90, alignItems: 'center' },
  btnActive: { backgroundColor: ATP_BRAND.lime },
  btnSaved: { backgroundColor: ATP_BRAND.lime + '20' },
  btnError: { backgroundColor: SEMANTIC.error + '20' },
  btnDisabled: { backgroundColor: SURFACES.border },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btnTextDark: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.semiBold, fontSize: 12 },
  btnTextLight: { fontFamily: Fonts.semiBold, fontSize: 12 },
  btnTextMuted: { color: TEXT_COLORS.muted, fontSize: 12 },
});
