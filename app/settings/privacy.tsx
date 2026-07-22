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
import { ATP_BRAND, ELEVATION, TEXT, SEMANTIC, withOpacity } from '@/src/constants/brand';

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
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const posthog = usePostHog();

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
    setHasClinician((clinRes.data ?? []).length > 0);
    setExports((expRes.data as ExportRow[]) ?? []);
    setDeletion((delRes.data as DeletionRow) ?? null);
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
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 60 }}
    >
      <View style={{ paddingTop: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
        </Pressable>
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EliteText style={s.title}>Privacidad</EliteText>
          <EliteText style={s.subtitle}>Tus datos son tuyos. Aquí decides qué compartes y qué no.</EliteText>
        </Animated.View>
      </View>

      {/* ── A: Consent toggles ── */}
      <Animated.View entering={FadeInUp.delay(90).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Consentimientos</SectionTitle>
        {CONSENT_META.map(meta => {
          const disabled = meta.key === 'share_with_clinician' && clinicianDisabled;
          return (
            <View key={meta.key} style={[s.toggleRow, disabled && { opacity: 0.7 }]}>
              <View style={{ flex: 1 }}>
                <EliteText style={s.toggleTitle}>{meta.title}</EliteText>
                <EliteText style={s.toggleDesc}>
                  {disabled ? 'Sin clínico vinculado' : meta.description}
                </EliteText>
              </View>
              <Switch
                value={consent?.[meta.key] ?? false}
                onValueChange={(v) => toggle(meta.key, v)}
                disabled={!consent || disabled}
                trackColor={{ false: '#333', true: withOpacity(ATP_BRAND.lime, 0.5) }}
                thumbColor={consent?.[meta.key] ? ATP_BRAND.lime : '#666'}
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
            <View key={id} style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <EliteText style={s.toggleTitle}>{CONSENT_SHORT_TITLES[id]}</EliteText>
                <EliteText style={s.toggleDesc}>
                  {accepted
                    ? `Otorgado el ${fmtDate(st!.accepted_at)}`
                    : st?.action === 'revoked' ? 'Revocado' : 'Sin otorgar'}
                </EliteText>
              </View>
              <Pressable onPress={() => toggleCb(id)} style={s.consentChip} hitSlop={6} disabled={busy}>
                <EliteText style={[s.consentChipText, accepted && { color: SEMANTIC.error }]}>
                  {accepted ? 'Revocar' : 'Otorgar'}
                </EliteText>
              </Pressable>
            </View>
          );
        })}
        <EliteText style={s.exportHint}>
          Cada cambio queda registrado con fecha y versión del Aviso. Revocar los consentimientos
          de datos sensibles o transferencia internacional detiene el núcleo de ATP.
        </EliteText>
      </Animated.View>

      {/* ── B: Documentos legales ── */}
      <Animated.View entering={FadeInUp.delay(140).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Documentos legales</SectionTitle>
        <Pressable
          onPress={() => { haptic.light(); router.push('/settings/legal'); }}
          style={s.legalRow}
        >
          <Ionicons name="document-text-outline" size={20} color={TEXT.secondary} />
          <View style={{ flex: 1 }}>
            <EliteText style={s.toggleTitle}>Términos, privacidad y disclaimers</EliteText>
            <EliteText style={s.toggleDesc}>Versiones aceptadas y fechas</EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
        </Pressable>
      </Animated.View>

      {/* ── C: Tus datos ── */}
      <Animated.View entering={FadeInUp.delay(190).springify()}>
        <SectionTitle containerStyle={{ marginTop: Spacing.lg }}>Tus datos</SectionTitle>
        <AnimatedPressable style={s.exportBtn} onPress={requestExport} disabled={busy}>
          <Ionicons name="download-outline" size={20} color="#000" />
          <EliteText style={s.exportBtnText}>DESCARGAR MIS DATOS</EliteText>
        </AnimatedPressable>
        <EliteText style={s.exportHint}>
          Recibes un archivo JSON con todo tu expediente (GDPR/LFPDPP). Tarda hasta 24h.
        </EliteText>

        {/* ARCO · Rectificar: editar los datos del perfil */}
        <Pressable
          onPress={() => { haptic.light(); router.push('/profile'); }}
          style={[s.legalRow, { marginBottom: 8 }]}
        >
          <Ionicons name="create-outline" size={20} color={TEXT.secondary} />
          <View style={{ flex: 1 }}>
            <EliteText style={s.toggleTitle}>Rectificar mis datos</EliteText>
            <EliteText style={s.toggleDesc}>Corrige tu información de perfil y salud</EliteText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
        </Pressable>

        {exports.map(e => {
          const downloadable = e.status === 'completed' && e.download_url
            && (!e.expires_at || Date.parse(e.expires_at) > Date.now());
          return (
            <View key={e.id} style={s.exportRow}>
              <View style={{ flex: 1 }}>
                <EliteText style={s.toggleTitle}>{fmtDate(e.requested_at)}</EliteText>
                <EliteText style={s.toggleDesc}>
                  {EXPORT_STATUS_LABEL[e.status] ?? e.status}
                  {e.file_size_bytes ? ` · ${fmtSize(e.file_size_bytes)}` : ''}
                  {downloadable && e.expires_at ? ` · expira ${fmtDate(e.expires_at)}` : ''}
                </EliteText>
              </View>
              {downloadable && (
                <Pressable
                  onPress={() => { haptic.medium(); Linking.openURL(e.download_url!); }}
                  style={s.downloadChip}
                  hitSlop={6}
                >
                  <EliteText style={s.downloadChipText}>Descargar</EliteText>
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
              <EliteText style={s.toggleTitle}>Eliminación programada</EliteText>
              <EliteText style={s.toggleDesc}>
                Tu cuenta y todos tus datos se eliminarán el {fmtDate(deletion.scheduled_delete_at)}.
              </EliteText>
            </View>
            <Pressable onPress={cancelDeletion} style={s.cancelChip} hitSlop={6} disabled={busy}>
              <EliteText style={s.cancelChipText}>Cancelar</EliteText>
            </Pressable>
          </View>
        ) : (
          <AnimatedPressable
            style={s.deleteBtn}
            onPress={() => { haptic.warning(); setDeleteModal(true); }}
          >
            <Ionicons name="trash-outline" size={18} color={SEMANTIC.error} />
            <EliteText style={s.deleteBtnText}>Eliminar mi cuenta</EliteText>
          </AnimatedPressable>
        )}
      </Animated.View>

      {/* Modal export solicitado */}
      <Modal visible={exportModal} transparent animationType="fade" onRequestClose={() => setExportModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color={ATP_BRAND.lime} />
            <EliteText style={s.modalTitle}>Estamos preparando tu archivo</EliteText>
            <EliteText style={s.modalBody}>
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Ionicons name="warning-outline" size={40} color={SEMANTIC.error} />
            <EliteText style={s.modalTitle}>¿Eliminar tu cuenta?</EliteText>
            <EliteText style={[s.modalBody, { textAlign: 'left' }]}>
              Perderás para siempre:{'\n'}
              • Tu expediente e historia clínica{'\n'}
              • Labs, tests y Edad ATP{'\n'}
              • Rachas, electrones y protones{'\n'}
              • Conversaciones con ARGOS{'\n'}
              • Rutinas, registros y progreso{'\n\n'}
              Tienes 30 días para cancelar antes del borrado definitivo.
            </EliteText>
            <TextInput
              style={s.modalInput}
              placeholder="Confirma tu contraseña"
              placeholderTextColor="#444"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <AnimatedPressable
              style={[s.modalDeleteBtn, (!password || busy) && { opacity: 0.4 }]}
              onPress={confirmDeletion}
              disabled={!password || busy}
            >
              <EliteText style={s.modalDeleteText}>
                {busy ? 'Verificando…' : 'ELIMINAR MI CUENTA'}
              </EliteText>
            </AnimatedPressable>
            <AnimatedPressable style={{ paddingVertical: 10 }} onPress={() => { setDeleteModal(false); setPassword(''); }}>
              <EliteText style={{ color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold }}>
                Conservar mi cuenta
              </EliteText>
            </AnimatedPressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ELEVATION[0].bg },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: TEXT.primary, marginTop: Spacing.md },
  subtitle: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: TEXT.secondary, marginTop: 4 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8,
  },
  toggleTitle: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: TEXT.primary },
  toggleDesc: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.tertiary, marginTop: 2, lineHeight: 16 },
  legalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
    borderRadius: Radius.md, padding: Spacing.md,
  },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg, paddingVertical: 15,
  },
  exportBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  exportHint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: TEXT.muted, marginTop: 8, marginBottom: 8, lineHeight: 16 },
  exportRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: ELEVATION[1].bg, borderWidth: 1, borderColor: ELEVATION[1].border,
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
  consentChipText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: ATP_BRAND.lime },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: withOpacity(SEMANTIC.error, 0.5),
    borderRadius: Radius.lg, paddingVertical: 14,
  },
  deleteBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: SEMANTIC.error },
  deletionPendingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(251,191,36,0.06)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: Radius.md, padding: Spacing.md,
  },
  cancelChip: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  cancelChipText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: TEXT.primary },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', paddingHorizontal: Spacing.md,
  },
  modalCard: {
    backgroundColor: ELEVATION[2].bg, borderWidth: 1, borderColor: ELEVATION[2].border,
    borderRadius: 24, padding: Spacing.lg, alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20, fontFamily: Fonts.bold, color: TEXT.primary,
    textAlign: 'center', marginTop: Spacing.md,
  },
  modalBody: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: '#aaa',
    textAlign: 'center', marginTop: 10, lineHeight: 21, alignSelf: 'stretch',
  },
  modalBtn: {
    alignSelf: 'stretch', backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.lg,
  },
  modalBtnText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  modalInput: {
    alignSelf: 'stretch', backgroundColor: '#0a0a0a', borderRadius: Radius.lg,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: FontSizes.md,
    fontFamily: Fonts.regular, color: '#fff', borderWidth: 0.5, borderColor: '#222',
    marginTop: Spacing.md,
  },
  modalDeleteBtn: {
    alignSelf: 'stretch', backgroundColor: SEMANTIC.error, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.md,
  },
  modalDeleteText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
});
