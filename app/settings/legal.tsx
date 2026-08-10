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
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { StatusBar } from 'expo-status-bar';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

// Sprint Compliance 2: los documentos viven in-app (/legal/*) en staging con
// placeholder [RAZÓN SOCIAL]. Al publicarse en somosatp.com (cuando llegue la
// razón social de la SAS), estas pantallas siguen como espejo in-app.

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
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  // MB-31B: pantalla migrada — superficies y texto del tema.
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [consent, setConsent] = useState<ConsentRow | null>(null);
  // D-2 (MB-12): fallo de red ≠ "nunca aceptaste nada".
  const [consentFailed, setConsentFailed] = useState(false);
  const [showDisclaimers, setShowDisclaimers] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('user_consent')
      .select('terms_accepted_at, terms_version, privacy_accepted_at, privacy_version, medical_disclaimer_accepted_at, medical_disclaimer_version')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) { setConsentFailed(true); return; }
        setConsentFailed(false);
        setConsent((data as ConsentRow) ?? null);
      });
  }, [user?.id]);

  const rows = [
    {
      icon: 'document-text-outline' as const,
      title: 'Términos de servicio',
      status: consentFailed
        ? 'Estado de aceptación sin lectura. Revisa tu conexión.'
        : consent?.terms_accepted_at
          ? `Aceptados: v${consent.terms_version ?? '1.0'} · ${fmtDate(consent.terms_accepted_at)}`
          : 'Ver documento',
      // B-6 (MB-12): fuente única — las MISMAS URLs que abre el paywall.
      onPress: () => Linking.openURL('https://somosatp.com/terminos').catch(() => {}),
    },
    {
      icon: 'lock-closed-outline' as const,
      title: 'Política de privacidad',
      status: consentFailed
        ? 'Estado de aceptación sin lectura. Revisa tu conexión.'
        : consent?.privacy_accepted_at
          ? `Aceptada: v${consent.privacy_version ?? '1.0'} · ${fmtDate(consent.privacy_accepted_at)}`
          : 'Ver documento',
      onPress: () => Linking.openURL('https://somosatp.com/privacidad').catch(() => {}),
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
    <ThemeReady>
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.fondo }}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 40 }}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ paddingTop: insets.top + 8, marginBottom: Spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={tokens.texto} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={[s.title, { color: tokens.texto }]}>Legal</EliteText>
          <EliteText style={[s.subtitle, { color: tokens.textoSecundario }]}>Documentos, versiones y avisos médicos de ATP.</EliteText>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <SectionTitle>Documentos</SectionTitle>
        {rows.map(row => (
          <Pressable
            key={row.title}
            onPress={() => { haptic.light(); row.onPress(); }}
            style={[s.row, { backgroundColor: tokens.card, borderColor: tokens.borde }]}
          >
            <Ionicons name={row.icon} size={20} color={tokens.textoSecundario} />
            <View style={{ flex: 1 }}>
              <EliteText style={[s.rowTitle, { color: tokens.texto }]}>{row.title}</EliteText>
              <EliteText style={[s.rowStatus, { color: dark ? tokens.textoTenue : tokens.textoSecundario }]}>{row.status}</EliteText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.textoTenue} />
          </Pressable>
        ))}
      </Animated.View>

      <MedicalDisclaimerModal
        visible={showDisclaimers}
        mode="read"
        onClose={() => setShowDisclaimers(false)}
      />
    </ScrollView>
    </ThemeReady>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 28, fontFamily: Fonts.bold, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  rowTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  rowStatus: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },
});
