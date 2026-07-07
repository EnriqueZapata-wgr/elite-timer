/**
 * AgeGateModal (#41, compliance stores) — gate de edad en onboarding v2.
 *
 * variant='blocked'  (<13): mensaje de no disponibilidad + salir a login.
 * variant='parental' (13-17): email de padre/madre + checkbox de
 *   consentimiento; confirma vía onParentalConfirm(email).
 *
 * Editorial ATP: fondo negro con overlay, acento lima, Poppins.
 */
import { useState } from 'react';
import { View, StyleSheet, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { isValidParentalEmail } from '@/src/utils/age-gate';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

interface Props {
  visible: boolean;
  variant: 'blocked' | 'parental';
  age: number;
  /** blocked: salir (signOut → login). */
  onExit: () => void;
  /** parental: confirmó email + checkbox. */
  onParentalConfirm: (parentEmail: string) => void;
  /** parental: cerró sin confirmar (vuelve a editar la fecha). */
  onDismiss: () => void;
  saving?: boolean;
}

export function AgeGateModal({ visible, variant, age, onExit, onParentalConfirm, onDismiss, saving }: Props) {
  const [email, setEmail] = useState('');
  const [checked, setChecked] = useState(false);

  const canConfirm = isValidParentalEmail(email) && checked && !saving;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={variant === 'parental' ? onDismiss : onExit}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <View style={s.card}>
          {variant === 'blocked' ? (
            <>
              <View style={s.iconWrap}>
                <Ionicons name="hand-left-outline" size={32} color="#ef4444" />
              </View>
              <EliteText style={s.title}>ATP no está disponible{'\n'}para menores de 13 años</EliteText>
              <EliteText style={s.body}>
                Por regulación de las tiendas de aplicaciones y protección de menores, no podemos
                crear tu cuenta. Te esperamos cuando cumplas 13.
              </EliteText>
              <AnimatedPressable style={s.primaryBtn} onPress={() => { haptic.medium(); onExit(); }}>
                <EliteText style={s.primaryBtnText}>ENTENDIDO</EliteText>
              </AnimatedPressable>
            </>
          ) : (
            <>
              <View style={[s.iconWrap, { backgroundColor: withOpacity(ATP_BRAND.lime, 0.1) }]}>
                <Ionicons name="people-outline" size={32} color={ATP_BRAND.lime} />
              </View>
              <EliteText style={s.title}>Necesitas consentimiento parental</EliteText>
              <EliteText style={s.body}>
                Tienes {age} años. Para usar ATP entre los 13 y 17 años necesitamos el
                consentimiento documentado de tu padre, madre o tutor.
              </EliteText>

              <EliteText style={s.inputLabel}>EMAIL DE TU PADRE / MADRE / TUTOR</EliteText>
              <TextInput
                style={s.input}
                placeholder="madre@ejemplo.com"
                placeholderTextColor="#444"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Pressable onPress={() => { haptic.light(); setChecked(c => !c); }} style={s.checkRow}>
                <View style={[s.checkbox, checked && s.checkboxOn]}>
                  {checked && <Ionicons name="checkmark" size={14} color="#000" />}
                </View>
                <EliteText style={s.checkText}>
                  Confirmo que tengo consentimiento de mi padre, madre o tutor para usar ATP.
                </EliteText>
              </Pressable>

              <AnimatedPressable
                style={[s.primaryBtn, !canConfirm && s.primaryBtnDisabled]}
                onPress={() => { if (canConfirm) { haptic.success(); onParentalConfirm(email.trim()); } }}
                disabled={!canConfirm}
              >
                <EliteText style={[s.primaryBtnText, !canConfirm && { opacity: 0.4 }]}>
                  {saving ? 'Guardando…' : 'CONFIRMAR Y CONTINUAR'}
                </EliteText>
              </AnimatedPressable>
              <AnimatedPressable style={s.secondaryBtn} onPress={() => { haptic.light(); onDismiss(); }}>
                <EliteText style={s.secondaryText}>Corregir mi fecha de nacimiento</EliteText>
              </AnimatedPressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', paddingHorizontal: Spacing.md,
  },
  card: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 24, padding: Spacing.lg, alignItems: 'center',
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20, fontFamily: Fonts.bold, color: TEXT.primary,
    textAlign: 'center', lineHeight: 28,
  },
  body: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#999',
    textAlign: 'center', marginTop: 10, lineHeight: 20,
  },
  inputLabel: {
    alignSelf: 'flex-start', fontSize: 10, fontFamily: Fonts.semiBold, color: '#888',
    letterSpacing: 2, marginTop: Spacing.lg, marginBottom: 8,
  },
  input: {
    alignSelf: 'stretch', backgroundColor: '#0a0a0a', borderRadius: Radius.lg,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: FontSizes.md,
    fontFamily: Fonts.regular, color: '#fff', borderWidth: 0.5, borderColor: '#222',
  },
  checkRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.md, alignItems: 'flex-start' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxOn: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  checkText: { flex: 1, fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#ccc', lineHeight: 18 },
  primaryBtn: {
    alignSelf: 'stretch', backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 15, alignItems: 'center', marginTop: Spacing.lg,
  },
  primaryBtnDisabled: { backgroundColor: '#1a1a1a' },
  primaryBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  secondaryBtn: { paddingVertical: 12, marginTop: 4 },
  secondaryText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: '#666' },
});
