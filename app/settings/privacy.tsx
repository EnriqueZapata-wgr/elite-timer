/**
 * Settings > Privacidad (#132 Privacy Fase B) — control total del usuario:
 *  A) Consent toggles (user_consent, migración 100)
 *  B) Documentos legales (versiones aceptadas → /settings/legal)
 *  C) Tus datos: exportación DSAR (user_data_exports) + historial
 *  D) Peligro: eliminar cuenta (user_deletion_requests, gracia 30 días)
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, Switch, Modal, TextInput,
  Alert, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePostHog } from 'posthog-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import {
  getConsent, updateConsent, CONSENT_META,
  type UserConsent, type ConsentKey,
} from '@/src/services/consent-service';
import { logConsent, getConsentStatus, type ConsentStatus } from '@/src/services/consent-log-service';
import { CONSENT_SHORT_TITLES, REVOKE_CORE_WARNING, type ConsentCheckboxId } from '@/src/constants/consent-copy';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ORB_SAFE_BOTTOM } from '@/src/components/argos/ArgosFloatingButton';
import { ATP_BRAND, ELEVATION, PILL, TEXT_COLORS, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { StatusBar } from 'expo-status-bar';
import { useRegisterOwnNav } from '@/src/components/ui/useOwnNavPresence';

interface ExportRow {
  id: string;
  requested_at: string;
  status: string;
  download_url: string | null;
  expires_at: string | null;
  file_size_bytes: number | null;
}

interface DeletionRow {
  id: string;
  scheduled_delete_at: string;
  status: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const EXPORT_STATUS_LABEL: Record<string, string> = {
  pending: 'En cola', processing: 'Preparando…', completed: 'Listo',
  failed: 'Falló', expired: 'Expirado',
};

export default function SettingsPrivacyScreen() {
  // 19.1: esta pantalla dibuja su propia flecha — registra nav propia y la
  // casita flotante global se retira sola (ver useOwnNavPresence).
  useRegisterOwnNav();

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const posthog = usePostHog();
  // MB-31B: pantalla migrada — superficies/texto del tema; el error usa su
  // token por modo (coral no se lee en claro) y el lima nunca es texto ahí.
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const thCard = { backgroundColor: tokens.card, borderColor: tokens.borde };
  const thDesc = { color: dark ? tokens.textoTenue : tokens.textoSecundario };
  const acento = dark ? ATP_BRAND.lime : tokens.tealTexto;

  const [consent, setConsent] = useState<UserConsent | null>(null);
  // Sprint Compliance 2: último estado por checkbox CB-1..CB-7 (user_consent_log)
  const [cbStatus, setCbStatus] = useState<Partial<Record<ConsentCheckboxId, ConsentStatus>>>({});
  const [hasClinician, setHasClinician] = useState(false);
  const [exports, setExports] = useState<ExportRow[]>([]);
  const [deletion, setDeletion] = useState<DeletionRow | null>(null);
  const [exportModal, setExportModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    const [c, cbs, clinRes, expRes, delRes] = await Promise.all([
      getConsent(user.id),
      getConsentStatus(user.id),
      supabase.from('coach_clients').select('id').eq('client_id', user.id).eq('status', 'active').limit(1),
      supabase.from('user_data_exports').select('id, requested_at, status, download_url, expires_at, file_size_bytes').eq('user_id', user.id).order('requested_at', { ascending: false }).limit(5),
      supabase.from('user_deletion_requests').select('id, scheduled_delete_at, status').eq('user_id', user.id).eq('status', 'pending').maybeSingle(),
    ]);
    setConsent(c);
    setCbStatus(cbs);
    // D-2 (MB-12): con error NO se pisa el estado — antes un fallo ocultaba
    // una baja ya programada y rompía el guard inFlight de exportaciones.
    if (!clinRes.error) setHasClinician((clinRes.data ?? []).length > 0);
    if (!expRes.error) setExports((expRes.data as ExportRow[]) ?? []);
    if (!delRes.error) setDeletion((delRes.data as DeletionRow) ?? null);
  }, [user?.id]);

  useEffect(() => { reload(); }, [reload]);

  const toggle = async (key: ConsentKey, value: boolean) => {
    if (!user?.id || !consent) return;
    haptic.light();
    setConsent({ ...consent, [key]: value }); // optimista
    const ok = await updateConsent(user.id, { [key]: value });
    if (!ok) {
      setConsent(consent); // revertir
      return;
    }
    // Enforcement inmediato de analytics (#132)
    if (key === 'analytics_posthog') {
      if (value) posthog?.optIn(); else posthog?.optOut();
    }
  };

  const requestExport = async () => {
    if (!user?.id || busy) return;
    const inFlight = exports.some(e => e.status === 'pending' || e.status === 'processing');
    if (inFlight) {
      Alert.alert('Ya hay una exportación en curso', 'Te avisaremos cuando esté lista.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('user_data_exports').insert({ user_id: user.id });
    setBusy(false);
    if (error) {
      Alert.alert('Error', 'No se pudo solicitar la exportación. Intenta de nuevo.');
      return;
    }
    haptic.success();
    setExportModal(true);
    reload();
  };

  const confirmDeletion = async () => {
    if (!user?.id || !user.email || busy) return;
    if (!password) return;
    setBusy(true);
    // Confirmación de identidad: re-autenticación con el password actual.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (authError) {
      setBusy(false);
      Alert.alert('Contraseña incorrecta', 'Verifica tu contraseña e intenta de nuevo.');
      return;
    }
    const { error } = await supabase.from('user_deletion_requests').insert({ user_id: user.id });
    setBusy(false);
    if (error) {
      Alert.alert('Error', 'No se pudo programar la eliminación. Intenta de nuevo.');
      return;
    }
    haptic.warning();
    setDeleteModal(false);
    setPassword('');
    reload();
  };

  const cancelDeletion = async () => {
    if (!deletion || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from('user_deletion_requests')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', deletion.id);
    setBusy(false);
    if (!error) {
      haptic.success();
      reload();
    }
  };

  // Sprint Compliance 2: revocar/otorgar consentimientos del Aviso (CB-2..CB-7).
  // Cada cambio agrega una fila al log inmutable (evidencia), no borra nada.
  const CB_CORE: ConsentCheckboxId[] = ['CB-2', 'CB-3'];
  const CB_OPTIONAL: ConsentCheckboxId[] = ['CB-5', 'CB-6', 'CB-7'];

  const toggleCb = async (id: ConsentCheckboxId) => {
    if (!user?.id || busy) return;
    const isAccepted = cbStatus[id]?.action === 'accepted';
    const doLog = async (action: 'accepted' | 'revoked') => {
      setBusy(true);
      const ok = await logConsent(user.id!, [id], action);
      setBusy(false);
      if (ok) {
        haptic.success();
        reload();
      } else {
        Alert.alert('Error', 'No se pudo registrar el cambio. Intenta de nuevo.');
      }
    };
    if (isAccepted && CB_CORE.includes(id)) {
      // Revocar CB-2/CB-3 apaga el core — advertir antes (nota Parte 3).
      Alert.alert('Revocar consentimiento', REVOKE_CORE_WARNING, [
        { text: 'Conservar', style: 'cancel' },
        { text: 'Revocar', style: 'destructive', onPress: () => doLog('revoked') },
      ]);
      return;
    }
    await doLog(isAccepted ? 'revoked' : 'accepted');
  };

  const clinicianDisabled = !hasClinician;

  return (
    <ThemeReady>
    <ScrollView
      style={[s.screen, { backgroundColor: tokens.fondo }]}
      // BLOQ-4: la orbe caía sobre los chips "Otorgar"/"Revocar" y sobre la
      // zona de peligro. Son consentimientos legales y un borrado de cuenta.
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: ORB_SAFE_BOTTOM }}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={tokens.texto} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={[s.title, { color: tokens.texto }]}>Privacidad</EliteText>
          <EliteText style={[s.subtitle, { color: tokens.textoSecundario }]}>Tus datos son tuyos. Aquí decides qué compartes y qué no.</EliteText>
        </Animated.View>
      </View>

      {/* ── A: Consent toggles ── */}
      <Animated.View entering={FadeInUp.delay(90).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Consentimientos</SectionTitle>
        {CONSENT_META.map(meta => {
          const disabled = meta.key === 'share_with_clinician' && clinicianDisabled;
          return (
            <View key={meta.key} style={[s.toggleRow, thCard, disabled && { opacity: 0.7 }]}>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.toggleTitle, { color: tokens.texto }]}>{meta.title}</EliteText>
                <EliteText style={[s.toggleDesc, thDesc]}>
                  {disabled ? 'Sin clínico vinculado' : meta.description}
                </EliteText>
              </View>
              <Switch
                value={consent?.[meta.key] ?? false}
                onValueChange={(v) => toggle(meta.key, v)}
                disabled={!consent || disabled}
                trackColor={{ false: tokens.bordeMarcado, true: withOpacity(ATP_BRAND.lime, 0.5) }}
                thumbColor={consent?.[meta.key] ? ATP_BRAND.lime : (dark ? PILL.textColor : tokens.flotante)}
              />
            </View>
          );
        })}
      </Animated.View>

      {/* ── A-bis: Consentimientos del Aviso (Sprint Compliance 2) ── */}
      <Animated.View entering={FadeInUp.delay(115).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Consentimientos del Aviso</SectionTitle>
        {([...CB_CORE, ...CB_OPTIONAL] as ConsentCheckboxId[]).map(id => {
          const st = cbStatus[id];
          const accepted = st?.action === 'accepted';
          return (
            <View key={id} style={[s.toggleRow, thCard]}>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.toggleTitle, { color: tokens.texto }]}>{CONSENT_SHORT_TITLES[id]}</EliteText>
                <EliteText style={[s.toggleDesc, thDesc]}>
                  {accepted
                    ? `Otorgado el ${fmtDate(st!.accepted_at)}`
                    : st?.action === 'revoked' ? 'Revocado' : 'Sin otorgar'}
                </EliteText>
              </View>
              <Pressable onPress={() => toggleCb(id)} style={[s.consentChip, !dark && { backgroundColor: tokens.hundido, borderColor: tokens.borde }]} hitSlop={6} disabled={busy}>
                <EliteText style={[s.consentChipText, { color: accepted ? tokens.error : acento }]}>
                  {accepted ? 'Revocar' : 'Otorgar'}
                </EliteText>
              </Pressable>
            </View>
          );
        })}
        <EliteText style={[s.exportHint, thDesc]}>
          Cada cambio queda registrado con fecha y versión del Aviso. Revocar los consentimientos
          de datos sensibles o transferencia internacional detiene el núcleo de ATP.
        </EliteText>
      </Animated.View>

      {/* ── B: Documentos legales ── */}
      <Animated.View entering={FadeInUp.delay(140).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Documentos legales</SectionTitle>
        <Pressable
          onPress={() => { haptic.light(); router.push('/settings/legal'); }}
          style={[s.legalRow, thCard]}
        >
          <Ionicons name="document-text-outline" size={20} color={tokens.textoSecundario} />
          <View style={{ flex: 1 }}>
            <EliteText style={[s.toggleTitle, { color: tokens.texto }]}>Términos, privacidad y disclaimers</EliteText>
            <EliteText style={[s.toggleDesc, thDesc]}>Versiones aceptadas y fechas</EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tokens.textoTenue} />
        </Pressable>
      </Animated.View>

      {/* ── C: Tus datos ── */}
      <Animated.View entering={FadeInUp.delay(190).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Tus datos</SectionTitle>
        <AnimatedPressable style={s.exportBtn} onPress={requestExport} disabled={busy}>
          <Ionicons name="download-outline" size={20} color={TEXT_COLORS.onAccent} />
          <EliteText style={s.exportBtnText}>DESCARGAR MIS DATOS</EliteText>
        </AnimatedPressable>
        <EliteText style={[s.exportHint, thDesc]}>
          Recibes un archivo JSON con todo tu expediente (GDPR/LFPDPP). Tarda hasta 24h.
        </EliteText>

        {/* ARCO · Rectificar: editar los datos del perfil */}
        <Pressable
          onPress={() => { haptic.light(); router.push('/profile'); }}
          style={[s.legalRow, thCard, { marginBottom: 8 }]}
        >
          <Ionicons name="create-outline" size={20} color={tokens.textoSecundario} />
          <View style={{ flex: 1 }}>
            <EliteText style={[s.toggleTitle, { color: tokens.texto }]}>Rectificar mis datos</EliteText>
            <EliteText style={[s.toggleDesc, thDesc]}>Corrige tu información de perfil y salud</EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tokens.textoTenue} />
        </Pressable>

        {exports.map(e => {
          const downloadable = e.status === 'completed' && e.download_url
            && (!e.expires_at || Date.parse(e.expires_at) > Date.now());
          return (
            <View key={e.id} style={[s.exportRow, thCard]}>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.toggleTitle, { color: tokens.texto }]}>{fmtDate(e.requested_at)}</EliteText>
                <EliteText style={[s.toggleDesc, thDesc]}>
                  {EXPORT_STATUS_LABEL[e.status] ?? e.status}
                  {e.file_size_bytes ? ` · ${fmtSize(e.file_size_bytes)}` : ''}
                  {downloadable && e.expires_at ? ` · expira ${fmtDate(e.expires_at)}` : ''}
                </EliteText>
              </View>
              {downloadable && (
                <Pressable
                  onPress={() => { haptic.medium(); Linking.openURL(e.download_url!); }}
                  style={[s.downloadChip, !dark && { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime }]}
                  hitSlop={6}
                >
                  <EliteText style={[s.downloadChipText, !dark && { color: tokens.textoSobreLima }]}>Descargar</EliteText>
                </Pressable>
              )}
            </View>
          );
        })}
      </Animated.View>

      {/* ── D: Peligro ── */}
      <Animated.View entering={FadeInUp.delay(240).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Zona de peligro</SectionTitle>
        {deletion ? (
          <View style={s.deletionPendingCard}>
            <Ionicons name="time-outline" size={20} color="#fbbf24" />
            <View style={{ flex: 1 }}>
              <EliteText style={[s.toggleTitle, { color: tokens.texto }]}>Eliminación programada</EliteText>
              <EliteText style={[s.toggleDesc, thDesc]}>
                Tu cuenta y todos tus datos se eliminarán el {fmtDate(deletion.scheduled_delete_at)}.
              </EliteText>
            </View>
            <Pressable onPress={cancelDeletion} style={[s.cancelChip, !dark && { backgroundColor: tokens.hundido, borderColor: tokens.borde }]} hitSlop={6} disabled={busy}>
              <EliteText style={[s.cancelChipText, { color: tokens.texto }]}>Cancelar</EliteText>
            </Pressable>
          </View>
        ) : (
          <AnimatedPressable
            style={[s.deleteBtn, !dark && { borderColor: withOpacity(tokens.error, 0.5) }]}
            onPress={() => { haptic.warning(); setDeleteModal(true); }}
          >
            <Ionicons name="trash-outline" size={18} color={tokens.error} />
            <EliteText style={[s.deleteBtnText, { color: tokens.error }]}>Eliminar mi cuenta</EliteText>
          </AnimatedPressable>
        )}
      </Animated.View>

      {/* Modal export solicitado */}
      <Modal visible={exportModal} transparent animationType="fade" onRequestClose={() => setExportModal(false)}>
        <View style={[s.modalOverlay, { backgroundColor: dark ? 'rgba(0,0,0,0.85)' : 'rgba(15,21,24,0.35)' }]}>
          <View style={[s.modalCard, { backgroundColor: tokens.flotante, borderColor: tokens.bordeMarcado }]}>
            <Ionicons name="checkmark-circle-outline" size={40} color={ATP_BRAND.lime} />
            <EliteText style={[s.modalTitle, { color: tokens.texto }]}>Estamos preparando tu archivo</EliteText>
            <EliteText style={[s.modalBody, !dark && { color: tokens.textoSecundario }]}>
              Te avisaremos en un máximo de 24 horas. El link de descarga estará disponible aquí
              durante 7 días.
            </EliteText>
            <AnimatedPressable style={s.modalBtn} onPress={() => setExportModal(false)}>
              <EliteText style={s.modalBtnText}>ENTENDIDO</EliteText>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Modal eliminar cuenta */}
      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[s.modalOverlay, { backgroundColor: dark ? 'rgba(0,0,0,0.85)' : 'rgba(15,21,24,0.35)' }]}
        >
          <View style={[s.modalCard, { backgroundColor: tokens.flotante, borderColor: tokens.bordeMarcado }]}>
            <Ionicons name="warning-outline" size={40} color={tokens.error} />
            <EliteText style={[s.modalTitle, { color: tokens.texto }]}>¿Eliminar tu cuenta?</EliteText>
            <EliteText style={[s.modalBody, !dark && { color: tokens.textoSecundario }, { textAlign: 'left' }]}>
              Perderás para siempre:{'\n'}
              • Tu expediente e historia clínica{'\n'}
              • Labs, tests y Edad ATP{'\n'}
              • Rachas, electrones y protones{'\n'}
              • Conversaciones con ARGOS{'\n'}
              • Rutinas, registros y progreso{'\n\n'}
              Tienes 30 días para cancelar antes del borrado definitivo.
            </EliteText>
            <TextInput
              style={[s.modalInput, { backgroundColor: tokens.hundido, borderColor: tokens.borde, color: tokens.texto }]}
              placeholder="Confirma tu contraseña"
              placeholderTextColor={tokens.sinDatos}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {/* El botón destructivo mantiene su doctrina: en claro el fondo es
                el token de error y el texto pasa a blanco (negro no se lee). */}
            <AnimatedPressable
              style={[s.modalDeleteBtn, !dark && { backgroundColor: tokens.error }, (!password || busy) && { opacity: 0.4 }]}
              onPress={confirmDeletion}
              disabled={!password || busy}
            >
              <EliteText style={[s.modalDeleteText, !dark && { color: ATP_BRAND.white }]}>
                {busy ? 'Verificando…' : 'ELIMINAR MI CUENTA'}
              </EliteText>
            </AnimatedPressable>
            <AnimatedPressable style={{ paddingVertical: 10 }} onPress={() => { setDeleteModal(false); setPassword(''); }}>
              <EliteText style={{ color: tokens.textoSecundario, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold }}>
                Conservar mi cuenta
              </EliteText>
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
    </ThemeReady>
  );
}

// MB-31B: solo layout + acentos de marca; el color vivo entra inline.
const s = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 28, fontFamily: Fonts.bold, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 4 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  toggleTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  toggleDesc: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2, lineHeight: 16 },
  legalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md,
  },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 15,
  },
  exportBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
  exportHint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 8, marginBottom: 8, lineHeight: 16 },
  exportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 6,
  },
  downloadChip: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14), borderWidth: 1,
    borderColor: withOpacity(ATP_BRAND.lime, 0.4), borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  downloadChipText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: ATP_BRAND.lime },
  consentChip: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  consentChipText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: withOpacity(SEMANTIC.error, 0.5),
    borderRadius: Radius.lg, paddingVertical: 14,
  },
  deleteBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  deletionPendingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(251,191,36,0.06)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: Radius.md, padding: Spacing.md,
  },
  cancelChip: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  cancelChipText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold },
  // El velo entra inline: el negro al 85% deja la pantalla clara en penumbra.
  modalOverlay: {
    flex: 1,
    justifyContent: 'center', paddingHorizontal: Spacing.md,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 24, padding: Spacing.lg, alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20, fontFamily: Fonts.bold,
    textAlign: 'center', marginTop: Spacing.md,
  },
  modalBody: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.67)',
    textAlign: 'center', marginTop: 10, lineHeight: 21, alignSelf: 'stretch',
  },
  modalBtn: {
    alignSelf: 'stretch', backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.lg,
  },
  modalBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
  modalInput: {
    alignSelf: 'stretch', borderRadius: Radius.lg,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: FontSizes.md,
    fontFamily: Fonts.regular, borderWidth: 0.5,
    marginTop: Spacing.md,
  },
  modalDeleteBtn: {
    alignSelf: 'stretch', backgroundColor: SEMANTIC.error, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.md,
  },
  modalDeleteText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT_COLORS.onAccent, letterSpacing: 1 },
});
