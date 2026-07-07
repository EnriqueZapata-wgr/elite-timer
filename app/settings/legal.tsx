/**
 * Settings > Legal (#42) — documentos legales y disclaimers médicos.
 * Links a Privacy Policy / Terms (somosatp.com) + re-lectura del modal de
 * disclaimers + estado de aceptación (user_consent).
 */
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { MedicalDisclaimerModal } from '@/src/components/legal/MedicalDisclaimerModal';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { MEDICAL_DISCLAIMER_VERSION } from '@/src/constants/medical-disclaimers';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ELEVATION, TEXT } from '@/src/constants/brand';

// TODO(#42): URLs definitivas cuando el sitio publique las páginas.
const PRIVACY_URL = 'https://somosatp.com/privacidad';
const TERMS_URL = 'https://somosatp.com/terminos';

type ConsentRow = {
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_accepted_at: string | null;
  privacy_version: string | null;
  medical_disclaimer_accepted_at: string | null;
  medical_disclaimer_version: string | null;
};

function fmtDate(iso: string | null): string {
  if (!iso) return 'pendiente';
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SettingsLegalScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [consent, setConsent] = useState<ConsentRow | null>(null);
  const [showDisclaimers, setShowDisclaimers] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('user_consent')
      .select('terms_accepted_at, terms_version, privacy_accepted_at, privacy_version, medical_disclaimer_accepted_at, medical_disclaimer_version')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setConsent((data as ConsentRow) ?? null));
  }, [user?.id]);

  const rows = [
    {
      icon: 'document-text-outline' as const,
      title: 'Términos de servicio',
      status: consent?.terms_accepted_at
        ? `Aceptados: v${consent.terms_version ?? '1.0'} · ${fmtDate(consent.terms_accepted_at)}`
        : 'Ver documento',
      onPress: () => Linking.openURL(TERMS_URL),
    },
    {
      icon: 'lock-closed-outline' as const,
      title: 'Política de privacidad',
      status: consent?.privacy_accepted_at
        ? `Aceptada: v${consent.privacy_version ?? '1.0'} · ${fmtDate(consent.privacy_accepted_at)}`
        : 'Ver documento',
      onPress: () => Linking.openURL(PRIVACY_URL),
    },
    {
      icon: 'medkit-outline' as const,
      title: 'Disclaimers médicos',
      status: consent?.medical_disclaimer_accepted_at
        ? `Aceptados: v${consent.medical_disclaimer_version ?? MEDICAL_DISCLAIMER_VERSION} · ${fmtDate(consent.medical_disclaimer_accepted_at)}`
        : `v${MEDICAL_DISCLAIMER_VERSION} · pendiente de aceptar`,
      onPress: () => setShowDisclaimers(true),
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: ELEVATION[0].bg }}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 40 }}
    >
      <View style={{ paddingTop: insets.top + 8, marginBottom: Spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={s.title}>Legal</EliteText>
          <EliteText style={s.subtitle}>Documentos, versiones y avisos médicos de ATP.</EliteText>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <SectionTitle>Documentos</SectionTitle>
        {rows.map(row => (
          <Pressable
            key={row.title}
            onPress={() => { haptic.light(); row.onPress(); }}
            style={s.row}
          >
            <Ionicons name={row.icon} size={20} color={TEXT.secondary} />
            <View style={{ flex: 1 }}>
              <EliteText style={s.rowTitle}>{row.title}</EliteText>
              <EliteText style={s.rowStatus}>{row.status}</EliteText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
          </Pressable>
        ))}
      </Animated.View>

      <MedicalDisclaimerModal
        visible={showDisclaimers}
        mode="read"
        onClose={() => setShowDisclaimers(false)}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  rowTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  rowStatus: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 2 },
});
