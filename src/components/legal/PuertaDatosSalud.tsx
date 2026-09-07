/**
 * CB-2 en el punto de uso: la puerta reutilizable de los datos de salud.
 * Pivote limpio, 7 de septiembre de 2026 (paso 0).
 *
 * ═══ PARA QUÉ EXISTE ═══
 * La LFPDPPP pide consentimiento expreso ANTES del tratamiento de datos
 * personales sensibles, no antes del registro. CB-2 vivía en el muro del
 * onboarding, tres pantallas antes de que existiera un solo dato de salud, y
 * en producción no dejó ni una fila. Ahora se pide aquí: en la pantalla que va
 * a escribir el primer síntoma, laboratorio o check-in.
 *
 * Las cuatro condiciones de la revisión legal, y dónde se cumple cada una:
 *   · casilla NO premarcada  → ContextualConsentModal arranca en false.
 *   · sesión autenticada     → recibe el userId de la sesión; sin él no pide.
 *   · texto EXACTO de CB-2   → CONSENT_BY_ID['CB-2'].text, el mismo que se
 *                              hashea en user_consent_log.
 *   · bloqueo real si dice que no → `puedeEscribir` es false y la pantalla
 *                              dueña no escribe. La puerta no adorna: bloquea.
 *
 * ═══ CÓMO SE MONTA ═══
 * Lo normal es la envoltura de UNA línea, igual que MedicalDisclaimerGate:
 *
 *   export default function PantallaGated() {
 *     return <PuertaDatosSaludGate><Pantalla /></PuertaDatosSaludGate>;
 *   }
 *
 * La envoltura NO monta los hijos hasta que hay consentimiento: no es un modal
 * encima de una pantalla viva, es una puerta. Así el bloqueo es real aunque la
 * pantalla dueña se olvide de preguntar en su función de guardado.
 *
 * Cuando solo una PARTE de la pantalla escribe datos de salud, se usa el hook
 * suelto y se pinta el bloque en el lugar de esa parte:
 *
 *   const puerta = usePuertaDatosSalud(user?.id);
 *   if (!puerta.puedeEscribir) return <BloquePuertaDatosSalud puerta={puerta} />;
 *   // ...y en el guardado: if (!puerta.puedeEscribir) return;
 *
 * ═══ LOS SEIS ESTADOS, Y POR QUÉ SON SEIS ═══
 *   · verificando → todavía no se sabe. No se escribe nada.
 *   · otorgado    → última fila CB-2 = accepted. La pantalla es la de siempre.
 *   · pendiente   → sin fila y sin haber preguntado en este teléfono. Se pide
 *                   UNA vez, en modal.
 *   · rechazado   → última fila = revoked (retiró en Privacidad) o ya se le
 *                   preguntó y dijo "Ahora no". Card que lo explica, con botón
 *                   para activar y atajo a Privacidad. Sin modal automático:
 *                   no se insiste y no se castiga.
 *   · fallo       → no se pudo LEER el log. Es DISTINTO de "sin fila", y por
 *                   eso son dos estados: ante la duda no se pregunta otra vez
 *                   (podría estar aceptado) ni se escribe (podría estar
 *                   revocado). Se ofrece reintentar. supabase-js no lanza en
 *                   4xx, así que la señal es `error`, no una excepción.
 *   · no_guardado → dijo que sí y el insert NO llegó al servidor. CB-6 y CB-7
 *                   se conforman con la fila encolada; CB-2 no. Es el
 *                   consentimiento que legitima el tratamiento de datos
 *                   sensibles de salud: abrir la función con la evidencia
 *                   todavía en el teléfono es exactamente el agujero que este
 *                   trabajo cierra. La función no se abre hasta que la fila
 *                   exista (7-sep-2026, revisión en frío).
 *
 * "Ahora no" y el botón atrás NO escriben en user_consent_log. Ese log es
 * evidencia legal y solo admite accepted/revoked: escribir `revoked` para
 * alguien que nunca otorgó sería mentir en el log y Privacidad lo pintaría
 * como "Revocado". El hecho de "ya se le preguntó" es de UI y vive en
 * AsyncStorage, con llave por usuario. Misma decisión que CB-7 (4EP M-1).
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ContextualConsentModal } from '@/src/components/legal/ContextualConsentModal';
import { logConsent } from '@/src/services/consent-log-service';
import { HEALTH_DATA_CONSENT_COPY } from '@/src/constants/consent-copy';
import { CONSENTIMIENTO_DATOS_SALUD, permiteDatosDeSalud } from '@/src/services/acceso-consentido-core';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';

export type EstadoPuertaSalud =
  | 'verificando'
  | 'pendiente'
  | 'otorgado'
  | 'rechazado'
  | 'fallo'
  | 'no_guardado';

/** Llave local de "ya se le preguntó". Por usuario: un teléfono, varias cuentas. */
export const llavePuertaSaludPreguntada = (userId: string) => `puerta_datos_salud_preguntada:${userId}`;

export interface PuertaDatosSalud {
  estado: EstadoPuertaSalud;
  /**
   * La única pregunta que la pantalla dueña necesita contestar antes de
   * escribir. Es true SOLO con el consentimiento confirmado: verificando,
   * fallo y rechazado son todos "no escribas".
   */
  puedeEscribir: boolean;
  guardando: boolean;
  /** Aceptó en el modal: loguea CB-2 accepted y abre la función. */
  aceptar: () => Promise<void>;
  /** "Ahora no" o atrás: marca "ya preguntado" en local. Nada al log legal. */
  rechazar: () => Promise<void>;
  /** Desde la card de apagado: vuelve a abrir el modal. */
  reabrir: () => void;
  /** Tras un fallo de lectura. */
  reintentar: () => void;
}

export function usePuertaDatosSalud(userId: string | undefined): PuertaDatosSalud {
  const [estado, setEstado] = useState<EstadoPuertaSalud>('verificando');
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!userId) { setEstado('verificando'); return; }
    let vivo = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_consent_log')
          .select('action')
          .eq('user_id', userId)
          .eq('checkbox_id', CONSENTIMIENTO_DATOS_SALUD)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!vivo) return;
        if (error) {
          logWarn('[puerta-salud] lectura de CB-2 falló', error);
          setEstado('fallo');
          return;
        }
        if (data) {
          // La política vive en el núcleo puro para que exista un solo lugar
          // donde se decide qué cuenta como consentimiento vigente.
          const vigente = data.action === 'accepted' ? 'accepted' : 'revoked';
          setEstado(permiteDatosDeSalud({ 'CB-2': vigente }) ? 'otorgado' : 'rechazado');
          return;
        }
        // Sin fila legal: ¿ya se le preguntó en este teléfono? Si la lectura
        // local falla se asume que no. Preguntar de más es el error barato.
        let preguntado = false;
        try {
          preguntado = (await AsyncStorage.getItem(llavePuertaSaludPreguntada(userId))) === '1';
        } catch { preguntado = false; }
        if (!vivo) return;
        setEstado(preguntado ? 'rechazado' : 'pendiente');
      } catch (e) {
        // Fetch rechazado (modo avión). No es "sin fila".
        if (!vivo) return;
        logWarn('[puerta-salud] lectura de CB-2 lanzó', e);
        setEstado('fallo');
      }
    })();
    return () => { vivo = false; };
  }, [userId, intento]);

  const aceptar = useCallback(async () => {
    if (!userId || guardando) return;
    setGuardando(true);
    try {
      // logConsent devuelve false si el insert no llegó (queda encolado).
      // Para CB-2 eso NO alcanza: sin fila en el servidor no hay bitácora que
      // respalde el tratamiento, así que la función sigue cerrada y se le dice
      // a la persona. Su "sí" no se pierde: la fila encolada se inserta sola
      // en el próximo intento y entonces la puerta se abre.
      const ok = await logConsent(userId, ['CB-2'], 'accepted');
      setEstado(ok ? 'otorgado' : 'no_guardado');
    } finally {
      setGuardando(false);
    }
  }, [userId, guardando]);

  const rechazar = useCallback(async () => {
    setEstado('rechazado');
    if (!userId) return;
    try { await AsyncStorage.setItem(llavePuertaSaludPreguntada(userId), '1'); }
    catch (e) { logWarn('[puerta-salud] no se pudo guardar el "ya preguntado"', e); }
  }, [userId]);

  const reabrir = useCallback(() => setEstado('pendiente'), []);
  const reintentar = useCallback(() => { setEstado('verificando'); setIntento((n) => n + 1); }, []);

  return { estado, puedeEscribir: estado === 'otorgado', guardando, aceptar, rechazar, reabrir, reintentar };
}

/**
 * Lo que se pinta cuando el estado NO es otorgado: el modal (pendiente), la
 * card de apagado (rechazado) o la de fallo. Con otorgado no pinta nada, y con
 * verificando tampoco: la pantalla dueña enseña su propio esqueleto.
 */
export function BloquePuertaDatosSalud({ puerta }: { puerta: PuertaDatosSalud }) {
  const router = useRouter();
  const { tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);

  if (puerta.estado === 'rechazado') {
    const c = HEALTH_DATA_CONSENT_COPY.declined;
    return (
      <View style={s.card}>
        <Ionicons name="shield-outline" size={28} color={t.textoSecundario} />
        <EliteText style={s.title}>{c.title}</EliteText>
        <EliteText style={s.body}>{c.body}</EliteText>
        <AnimatedPressable style={s.primaryBtn} onPress={() => { haptic.medium(); puerta.reabrir(); }}>
          <EliteText style={s.primaryText}>{c.cta}</EliteText>
        </AnimatedPressable>
        <AnimatedPressable style={s.secondaryBtn} onPress={() => { haptic.light(); router.push('/settings/privacy'); }}>
          <EliteText style={s.secondaryText}>{c.ctaPrivacidad}</EliteText>
        </AnimatedPressable>
      </View>
    );
  }

  if (puerta.estado === 'fallo' || puerta.estado === 'no_guardado') {
    // Dos cards distintas porque son dos hechos distintos: una es "no pudimos
    // leer qué aceptaste", la otra es "aceptaste y no pudimos guardarlo".
    const falloDeLectura = puerta.estado === 'fallo';
    const c = falloDeLectura ? HEALTH_DATA_CONSENT_COPY.fallo : HEALTH_DATA_CONSENT_COPY.noGuardado;
    return (
      <View style={s.card}>
        <Ionicons name="cloud-offline-outline" size={28} color={t.textoSecundario} />
        <EliteText style={s.title}>{c.title}</EliteText>
        <EliteText style={s.body}>{c.body}</EliteText>
        <AnimatedPressable
          style={s.primaryBtn}
          onPress={() => { haptic.medium(); if (falloDeLectura) puerta.reintentar(); else puerta.reabrir(); }}
        >
          <EliteText style={s.primaryText}>{c.cta}</EliteText>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <ContextualConsentModal
      visible={puerta.estado === 'pendiente'}
      checkboxId="CB-2"
      title={HEALTH_DATA_CONSENT_COPY.title}
      details={HEALTH_DATA_CONSENT_COPY.details}
      saving={puerta.guardando}
      onAccept={() => { puerta.aceptar(); }}
      onDecline={() => { puerta.rechazar(); }}
    />
  );
}

/**
 * La envoltura de una línea. Es la forma normal de montar esta puerta.
 *
 * NO renderiza a los hijos hasta que hay consentimiento confirmado. Esa es la
 * diferencia con MedicalDisclaimerGate, que pinta la pantalla y le pone un
 * modal encima: aquí un modal encima no serviría, porque la pantalla de abajo
 * seguiría viva y podría escribir. Para dato sensible de salud el bloqueo
 * tiene que ser el montaje.
 *
 * Siempre deja salida: en cuanto se sabe algo hay un "Volver". Una persona que
 * dijo que no, o que se quedó sin red, no puede terminar encerrada.
 */
export function PuertaDatosSaludGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const puerta = usePuertaDatosSalud(user?.id);
  const router = useRouter();
  const { tokens: t } = useAppTheme();
  const insets = useSafeAreaInsets();

  if (puerta.puedeEscribir) return <>{children}</>;

  return (
    <View style={[gs.pantalla, { backgroundColor: t.fondo, paddingTop: insets.top + Spacing.lg }]}>
      {puerta.estado === 'verificando' ? (
        // Mientras no se sabe, ni se pide ni se pinta la pantalla: pedir de
        // más molesta y pintar de más trata datos sin saber si se puede.
        <ActivityIndicator size="large" color={ATP_BRAND.lime} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <>
          <BloquePuertaDatosSalud puerta={puerta} />
          <AnimatedPressable
            style={gs.volver}
            onPress={() => {
              haptic.light();
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)');
            }}
          >
            <EliteText style={[gs.volverTexto, { color: t.textoSecundario }]}>
              {HEALTH_DATA_CONSENT_COPY.volver}
            </EliteText>
          </AnimatedPressable>
        </>
      )}
    </View>
  );
}

const gs = StyleSheet.create({
  pantalla: { flex: 1, paddingHorizontal: Spacing.xs },
  volver: { paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm },
  volverTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});

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
