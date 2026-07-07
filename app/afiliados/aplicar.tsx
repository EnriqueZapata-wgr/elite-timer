/**
 * Afiliados — Aplicación (#47 fase 1). Formulario de alta como afiliado
 * (INSERT en affiliates status=pending, backend migración 101 Cowork).
 * Si ya aplicó: muestra estado (pending/approved/rejected) y CTA al
 * dashboard si está aprobado.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import {
  VERTICAL_OPTIONS, AFFILIATE_STATUS_LABELS, requiresCedula,
  type AffiliateVertical,
} from '@/src/services/affiliate-core';
import { getAffiliate, applyAsAffiliate, type Affiliate } from '@/src/services/affiliate-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, TEXT, withOpacity } from '@/src/constants/brand';

const STATUS_COLORS: Record<string, string> = {
  pending: '#fbbf24', approved: '#4ade80', rejected: '#ef4444', suspended: '#f97316',
};

export default function AfiliadosAplicarScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [existing, setExisting] = useState<Affiliate | null | undefined>(undefined);
  const [vertical, setVertical] = useState<AffiliateVertical | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [cedula, setCedula] = useState('');
  const [rfc, setRfc] = useState('');
  const [bio, setBio] = useState('');
  const [social, setSocial] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const aff = await getAffiliate(user.id);
    setExisting(aff);
    if (!aff && user.email) setEmail(prev => prev || user.email!);
  }, [user?.id, user?.email]);

  useEffect(() => { reload(); }, [reload]);

  const bioWords = bio.trim() ? bio.trim().split(/\s+/).length : 0;
  const isValid = !!vertical
    && fullName.trim().length >= 3
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
    && phone.trim().length >= 8
    && specialty.trim().length >= 3
    && bio.trim().length >= 20 && bioWords <= 150
    && (!requiresCedula(vertical) || cedula.trim().length >= 6)
    && acceptTerms;

  async function handleSubmit() {
    if (!user?.id || !isValid || !vertical || saving) return;
    setSaving(true);
    const result = await applyAsAffiliate(user.id, {
      vertical, fullName, email, phone, specialty,
      cedulaProfesional: cedula, rfc, shortBio: bio, socialOrWebsite: social,
    });
    setSaving(false);
    if (result.ok) {
      haptic.success();
      reload();
    } else {
      Alert.alert('Error', 'No se pudo enviar tu aplicación. Intenta de nuevo.');
    }
  }

  // ── Ya aplicó: estado ──
  if (existing) {
    const color = STATUS_COLORS[existing.status] ?? TEXT.secondary;
    return (
      <ScrollView style={s.screen} contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 40 }}>
        <View style={{ paddingTop: insets.top + 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
          </Pressable>
        </View>
        <Animated.View entering={FadeInUp.delay(60).springify()} style={s.statusCard}>
          <View style={[s.statusBadge, { backgroundColor: withOpacity(color, 0.12) }]}>
            <EliteText style={[s.statusBadgeText, { color }]}>
              {AFFILIATE_STATUS_LABELS[existing.status] ?? existing.status}
            </EliteText>
          </View>
          <EliteText style={s.statusTitle}>
            {existing.status === 'pending' && 'Tu aplicación está en revisión'}
            {existing.status === 'approved' && 'Eres afiliado ATP'}
            {existing.status === 'rejected' && 'Tu aplicación no fue aprobada'}
            {existing.status === 'suspended' && 'Tu cuenta de afiliado está suspendida'}
          </EliteText>
          <EliteText style={s.statusBody}>
            {existing.status === 'pending' && 'El equipo ATP revisará tu perfil y te contactará por email. Normalmente toma 2-3 días hábiles.'}
            {existing.status === 'approved' && 'Tu código de referido, wallet y métricas viven en tu dashboard.'}
            {existing.status === 'rejected' && (existing.reject_reason || 'Puedes contactar al equipo ATP para más detalles.')}
            {existing.status === 'suspended' && 'Contacta al equipo ATP para resolverlo.'}
          </EliteText>
          {existing.status === 'approved' && (
            <AnimatedPressable
              style={s.submitBtn}
              onPress={() => { haptic.medium(); router.push('/afiliados/dashboard' as any); }}
            >
              <EliteText style={s.submitText}>IR A MI DASHBOARD</EliteText>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </AnimatedPressable>
          )}
        </Animated.View>
      </ScrollView>
    );
  }

  // ── Formulario ──
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: insets.top + 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
          </Pressable>
        </View>

        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={s.kicker}>PROGRAMA DE AFILIADOS</EliteText>
          <EliteText style={s.title}>Crece con ATP</EliteText>
          <EliteText style={s.subtitle}>
            Clínicos, coaches, centros y creadores: gana comisiones recurrentes por cada persona
            que entrenas, atiendes o inspiras dentro de ATP.
          </EliteText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Tu vertical</SectionTitle>
          <View style={s.verticalGrid}>
            {VERTICAL_OPTIONS.map(opt => {
              const selected = vertical === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => { haptic.light(); setVertical(opt.value); }}
                  style={[s.verticalChip, selected && s.verticalChipActive]}
                >
                  <Ionicons name={opt.icon as any} size={16} color={selected ? '#000' : TEXT.secondary} />
                  <EliteText style={[s.verticalChipText, selected && { color: '#000' }]}>{opt.label}</EliteText>
                </Pressable>
              );
            })}
          </View>

          <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Tus datos</SectionTitle>
          <EliteText style={s.label}>NOMBRE COMPLETO</EliteText>
          <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Tu nombre" placeholderTextColor="#444" autoCapitalize="words" />
          <EliteText style={s.label}>EMAIL</EliteText>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="tu@email.com" placeholderTextColor="#444" keyboardType="email-address" autoCapitalize="none" />
          <EliteText style={s.label}>TELÉFONO</EliteText>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+52 ..." placeholderTextColor="#444" keyboardType="phone-pad" />
          <EliteText style={s.label}>ESPECIALIDAD</EliteText>
          <TextInput style={s.input} value={specialty} onChangeText={setSpecialty} placeholder="Ej. medicina funcional, CrossFit, nutrición…" placeholderTextColor="#444" />

          {requiresCedula(vertical) && (
            <>
              <EliteText style={s.label}>CÉDULA PROFESIONAL (OBLIGATORIA PARA CLÍNICOS)</EliteText>
              <TextInput style={s.input} value={cedula} onChangeText={setCedula} placeholder="Número de cédula" placeholderTextColor="#444" />
            </>
          )}
          <EliteText style={s.label}>RFC (FACTURACIÓN MÉXICO · OPCIONAL)</EliteText>
          <TextInput style={s.input} value={rfc} onChangeText={(t) => setRfc(t.toUpperCase())} placeholder="XXXX000000XXX" placeholderTextColor="#444" autoCapitalize="characters" />

          <EliteText style={s.label}>CUÉNTANOS DE TI ({bioWords}/150 PALABRAS)</EliteText>
          <TextInput
            style={[s.input, s.textArea, bioWords > 150 && { borderColor: '#ef4444' }]}
            value={bio} onChangeText={setBio} multiline
            placeholder="Tu experiencia, a quién atiendes y por qué quieres ser afiliado ATP…"
            placeholderTextColor="#444"
          />
          <EliteText style={s.label}>REDES / SITIO WEB (OPCIONAL)</EliteText>
          <TextInput style={s.input} value={social} onChangeText={setSocial} placeholder="instagram.com/tuperfil · tusitio.com" placeholderTextColor="#444" autoCapitalize="none" />

          <Pressable onPress={() => { haptic.light(); setAcceptTerms(a => !a); }} style={s.checkRow}>
            <View style={[s.checkbox, acceptTerms && s.checkboxOn]}>
              {acceptTerms && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
            <EliteText style={s.checkText}>
              Acepto los términos del programa de afiliados ATP (v1.0) y el tratamiento de mis
              datos para evaluar esta aplicación.
            </EliteText>
          </Pressable>

          <AnimatedPressable
            style={[s.submitBtn, !isValid && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || saving}
          >
            <EliteText style={[s.submitText, !isValid && { opacity: 0.4 }]}>
              {saving ? 'Enviando…' : 'ENVIAR APLICACIÓN'}
            </EliteText>
          </AnimatedPressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },
  kicker: { fontSize: 10, fontFamily: Fonts.semiBold, color: ATP_BRAND.lime, letterSpacing: 2, marginTop: Spacing.lg },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: 6 },
  subtitle: { fontSize: FontSizes.md, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 8, lineHeight: 22 },
  verticalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  verticalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#1a1a1a',
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9,
  },
  verticalChipActive: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  verticalChipText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: TEXT.secondary },
  label: {
    fontSize: 10, fontFamily: Fonts.semiBold, color: '#888',
    letterSpacing: 2, marginTop: Spacing.md, marginBottom: 6,
  },
  input: {
    backgroundColor: '#0a0a0a', borderRadius: Radius.lg, paddingHorizontal: 16,
    paddingVertical: 13, fontSize: FontSizes.md, fontFamily: Fonts.regular,
    color: '#fff', borderWidth: 0.5, borderColor: '#222',
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  checkRow: { flexDirection: 'row', gap: 12, marginTop: Spacing.lg, alignItems: 'flex-start' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxOn: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  checkText: { flex: 1, fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#ccc', lineHeight: 18 },
  submitBtn: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.lg,
  },
  submitBtnDisabled: { backgroundColor: '#1a1a1a' },
  submitText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  statusCard: {
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: 20, padding: Spacing.lg, marginTop: Spacing.xl, alignItems: 'center',
  },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  statusBadgeText: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1 },
  statusTitle: {
    fontSize: 20, fontFamily: Fonts.bold, color: TEXT.primary,
    textAlign: 'center', marginTop: Spacing.md,
  },
  statusBody: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary,
    textAlign: 'center', marginTop: 8, lineHeight: 20,
  },
});
