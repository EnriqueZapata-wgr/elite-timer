/**
 * Consentimiento del módulo Ciclo (CB-7) en la puerta: pendiente 17.5,
 * 31-ago-2026.
 *
 * CB-7 existía en el papel (consent-copy, migración 209, Perfil → Privacidad)
 * y solo se pedía en el paso 4 del onboarding v2. Quien entró a /cycle por
 * otro camino nunca lo vio: al 31-ago hay 3 cuentas con datos de ciclo y CERO
 * filas CB-7 en user_consent_log. Datos de ciclo son categoría especial: no se
 * guardan sin consentimiento expreso.
 *
 * Patrón: el de CB-6 en argos-chat (ContextualConsentModal + logConsent), con
 * el ciclo de vida de MedicalDisclaimerGate (se decide UNA vez y se persiste).
 *
 * Estados, en el orden en que importan:
 *   · checking  → la pantalla enseña su skeleton; nada de ciclo se lee.
 *   · granted   → última fila CB-7 = accepted. La pantalla es la de siempre.
 *   · pending   → sin fila CB-7 y sin haber preguntado. Se pide UNA vez
 *                 (modal). Aceptar loguea accepted.
 *   · declined  → última fila = revoked (retiró en Privacidad) O ya se le
 *                 preguntó y dijo "Ahora no". Card que lo dice, con botón para
 *                 activar y atajo a Privacidad. Sin modal automático: no se
 *                 insiste.
 *
 * 4EP M-1 (31-ago): "Ahora no" y el botón atrás de Android NO escriben en
 * user_consent_log. Ese log es evidencia legal y solo admite accepted/revoked:
 * escribir `revoked` para alguien que nunca otorgó era mentir en el log y
 * Privacidad lo pintaba como "Revocado". El "ya se le preguntó" es un hecho
 * de UI, no legal, así que vive en AsyncStorage (llave por usuario). Lo único
 * que entra al log es lo que pasó de verdad: aceptó aquí, o retiró desde
 * Privacidad.
 *   · fallo     → no se pudo LEER el log. Es distinto de "sin fila": ante la
 *                 duda no se pide otra vez (podría estar aceptado) ni se abre
 *                 el ciclo (podría estar revocado). Reintentar.
 *
 * La lectura va directo a user_consent_log en vez de getConsentStatus porque
 * ésa devuelve {} tanto si falla como si no hay filas, y aquí esos dos casos
 * son pantallas distintas (regla 6 de la casa).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ContextualConsentModal } from '@/src/components/legal/ContextualConsentModal';
import { logConsent } from '@/src/services/consent-log-service';
import { CYCLE_CONSENT_COPY } from '@/src/constants/consent-copy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';

export type CycleConsentState = 'checking' | 'pending' | 'granted' | 'declined' | 'fallo';

/** Llave local de "ya se le preguntó" (por usuario: un teléfono, varias cuentas). */
export const cycleConsentAskedKey = (userId: string) => `cycle_consent_asked:${userId}`;

export interface CycleConsent {
  state: CycleConsentState;
  saving: boolean;
  /** Aceptó en el modal: loguea CB-7 accepted y abre el ciclo. */
  accept: () => Promise<void>;
  /** "Ahora no" o atrás: marca "ya preguntado" en local y deja la card de apagado. Nada al log. */
  decline: () => Promise<void>;
  /** Desde la card de apagado: vuelve a abrir el modal. */
  reopen: () => void;
  /** Tras un fallo de lectura. */
  retry: () => void;
}

export function useCycleConsent(userId: string | undefined): CycleConsent {
  const [state, setState] = useState<CycleConsentState>('checking');
  const [saving, setSaving] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!userId) { setState('checking'); return; }
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_consent_log')
          .select('action')
          .eq('user_id', userId)
          .eq('checkbox_id', 'CB-7')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!active) return;
        if (error) {
          logWarn('[cycle-consent] lectura de CB-7 falló', error);
          setState('fallo');
          return;
        }
        if (data) { setState(data.action === 'accepted' ? 'granted' : 'declined'); return; }
        // Sin fila legal: ¿ya se le preguntó en este teléfono? Si la lectura
        // local falla se asume que no (preguntar de más es el error barato).
        let asked = false;
        try { asked = (await AsyncStorage.getItem(cycleConsentAskedKey(userId))) === '1'; } catch { asked = false; }
        if (!active) return;
        setState(asked ? 'declined' : 'pending');
      } catch (e) {
        // Fetch rechazado (modo avión): no es "sin fila".
        if (!active) return;
        logWarn('[cycle-consent] lectura de CB-7 lanzó', e);
        setState('fallo');
      }
    })();
    return () => { active = false; };
  }, [userId, intento]);

  const accept = useCallback(async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      // logConsent encola en AsyncStorage si el insert falla y devuelve false.
      // La decisión de la persona ya está tomada: se abre el ciclo y la fila
      // llega con el flush. Mismo criterio que CB-6.
      await logConsent(userId, ['CB-7'], 'accepted');
      setState('granted');
    } finally {
      setSaving(false);
    }
  }, [userId, saving]);

  const decline = useCallback(async () => {
    setState('declined');
    if (!userId) return;
    // Solo el hecho de UI "ya se preguntó", en local. El log legal no se toca.
    try { await AsyncStorage.setItem(cycleConsentAskedKey(userId), '1'); }
    catch (e) { logWarn('[cycle-consent] no se pudo guardar el "ya preguntado"', e); }
  }, [userId]);

  const reopen = useCallback(() => setState('pending'), []);
  const retry = useCallback(() => { setState('checking'); setIntento((n) => n + 1); }, []);

  return { state, saving, accept, decline, reopen, retry };
}

interface BlockProps {
  consent: CycleConsent;
  /** MB-22 P4: en acompañante el calendario es de otra persona; cambia el copy. */
  acompanante: boolean;
}

/**
 * Lo que se pinta cuando el estado NO es granted: el modal (pending), la card
 * de apagado (declined) o la de fallo. Con granted no pinta nada: la pantalla
 * dueña decide qué va. En checking tampoco: la pantalla enseña su skeleton.
 */
export function CycleConsentBlock({ consent, acompanante }: BlockProps) {
  const router = useRouter();
  const { tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const details = acompanante ? CYCLE_CONSENT_COPY.acompanante : CYCLE_CONSENT_COPY.propio;

  if (consent.state === 'declined') {
    const c = CYCLE_CONSENT_COPY.declined;
    return (
      <View style={s.card}>
        <Ionicons name="shield-outline" size={28} color={t.textoSecundario} />
        <EliteText style={s.title}>{c.title}</EliteText>
        <EliteText style={s.body}>{c.body}</EliteText>
        <AnimatedPressable style={s.primaryBtn} onPress={() => { haptic.medium(); consent.reopen(); }}>
          <EliteText style={s.primaryText}>{c.cta}</EliteText>
        </AnimatedPressable>
        <AnimatedPressable style={s.secondaryBtn} onPress={() => { haptic.light(); router.push('/settings/privacy'); }}>
          <EliteText style={s.secondaryText}>{c.ctaPrivacidad}</EliteText>
        </AnimatedPressable>
      </View>
    );
  }

  if (consent.state === 'fallo') {
    const c = CYCLE_CONSENT_COPY.fallo;
    return (
      <View style={s.card}>
        <Ionicons name="cloud-offline-outline" size={28} color={t.textoSecundario} />
        <EliteText style={s.title}>{c.title}</EliteText>
        <EliteText style={s.body}>{c.body}</EliteText>
        <AnimatedPressable style={s.primaryBtn} onPress={() => { haptic.medium(); consent.retry(); }}>
          <EliteText style={s.primaryText}>{c.cta}</EliteText>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <ContextualConsentModal
      visible={consent.state === 'pending'}
      checkboxId="CB-7"
      title={CYCLE_CONSENT_COPY.title}
      details={details}
      saving={consent.saving}
      onAccept={() => { consent.accept(); }}
      onDecline={() => { consent.decline(); }}
    />
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md, padding: Spacing.lg,
    backgroundColor: t.card, borderWidth: 1, borderColor: t.borde, borderRadius: Radius.card,
    alignItems: 'center', gap: 8,
  },
  title: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: t.texto, textAlign: 'center' },
  body: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: t.textoSecundario, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    alignSelf: 'stretch', backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm,
  },
  primaryText: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: t.textoSobreLima, letterSpacing: 1 },
  secondaryBtn: { paddingVertical: 10 },
  secondaryText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: t.textoSecundario },
});
