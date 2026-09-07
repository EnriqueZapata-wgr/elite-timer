/**
 * La puerta legal de la app. Pivote limpio, 7 de septiembre de 2026 (paso 0).
 *
 * ═══ QUIÉN VE ESTA PANTALLA ═══
 * Quien ya tiene cuenta y NO tiene registrados CB-1 (términos y aviso), CB-3
 * (transferencia internacional) y CB-4 (mayoría de edad). Hoy eso es 12 de los
 * 13 perfiles de producción: se registraron antes de que el registro
 * escribiera esas filas, así que la app trataba sus datos sin bitácora que lo
 * respaldara. No firmaron y luego se perdió el papel; nunca hubo papel.
 *
 * ═══ LO QUE ESTA PANTALLA NO HACE ═══
 * No hace backfill. A nadie se le inventa una fila con fecha vieja ni se le
 * firma nada por adelantado: eso sería falsificar evidencia legal, y además
 * dejaría a la persona sin saber qué aceptó. Se le pide una vez, con su
 * nombre, y no pierde ni un dato de los que ya tenía. Tampoco borra, mueve ni
 * revoca nada: solo inserta lo que la persona acaba de marcar.
 *
 * ═══ EL ORDEN, QUE IMPORTA ═══
 *   1 · flush de la cola local. Si el registro escribió los tres y el insert
 *       falló por sesión tardía, las filas están en AsyncStorage esperando.
 *       Preguntar antes de intentar ese flush sería pedirle a alguien que
 *       firme otra vez algo que ya firmó hace treinta segundos. Desde el
 *       7-sep-2026 esa cola es POR USUARIO y el flush ya no reasigna el
 *       user_id: antes, en un teléfono compartido, este mismo paso podía
 *       darle a esta persona la firma de otra y abrirle la puerta sin que
 *       hubiera tocado una casilla.
 *   2 · lectura del log. Solo se piden los que de verdad faltan.
 *   3 · si no falta ninguno, se sale sola hacia el gate. La pantalla no se
 *       queda puesta por inercia.
 *
 * Si el insert falla al aceptar, NO se deja pasar: el guardia volvería a
 * mandar aquí a la persona y sería un bucle. Se le dice la verdad y se le deja
 * reintentar.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { ConsentCheckboxRow } from '@/src/components/legal/ConsentCheckboxRow';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { logConsent, flushPendingConsentLogs } from '@/src/services/consent-log-service';
import {
  CONSENTIMIENTOS_DE_PUERTA,
  faltanConsentimientosDePuerta,
  type EstadoConsentimientos,
} from '@/src/services/acceso-consentido-core';
import { CONSENT_BY_ID, PUERTA_CONSENT_COPY, type ConsentCheckboxId } from '@/src/constants/consent-copy';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';

type Fase = 'leyendo' | 'pidiendo' | 'completo' | 'fallo';

/** Primer nombre, si la cuenta lo trae. Sin nombre se saluda igual, sin excusas. */
function primerNombre(meta: Record<string, unknown> | undefined): string | null {
  const completo = typeof meta?.full_name === 'string' ? meta.full_name : '';
  const primero = completo.trim().split(/\s+/)[0];
  return primero ? primero : null;
}

export default function PuertaConsentimientosScreen() {
  const router = useRouter();
  const { user, session, loading, signOut } = useAuth();
  const { tokens: t } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [fase, setFase] = useState<Fase>('leyendo');
  const [faltantes, setFaltantes] = useState<ConsentCheckboxId[]>([]);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    let vivo = true;
    setFase('leyendo');
    setError(null);
    (async () => {
      // 1 · La cola del registro primero (ver encabezado).
      await flushPendingConsentLogs(userId);
      if (!vivo) return;
      try {
        const { data, error: errLectura } = await supabase
          .from('user_consent_log')
          .select('checkbox_id, action, created_at')
          .eq('user_id', userId)
          .in('checkbox_id', [...CONSENTIMIENTOS_DE_PUERTA])
          .order('created_at', { ascending: false });
        if (!vivo) return;
        if (errLectura) {
          // supabase-js no lanza en 4xx: el error viaja aquí. "No se pudo
          // leer" no es "no consintió", y por eso esto es su propia pantalla.
          logWarn('[puerta-consentimientos] lectura falló', errLectura);
          setFase('fallo');
          return;
        }
        const estado: EstadoConsentimientos = {};
        for (const fila of data ?? []) {
          const id = fila.checkbox_id as ConsentCheckboxId;
          if (!estado[id]) estado[id] = fila.action === 'accepted' ? 'accepted' : 'revoked';
        }
        const faltan = faltanConsentimientosDePuerta(estado);
        setFaltantes(faltan);
        setFase(faltan.length === 0 ? 'completo' : 'pidiendo');
      } catch (e) {
        if (!vivo) return;
        logWarn('[puerta-consentimientos] lectura lanzó', e);
        setFase('fallo');
      }
    })();
    return () => { vivo = false; };
  }, [userId, intento]);

  const todosMarcados = faltantes.length > 0 && faltantes.every((id) => marcados[id]);

  const aceptar = useCallback(async () => {
    if (!userId || !todosMarcados || guardando) return;
    setGuardando(true);
    setError(null);
    // Solo se insertan los que faltaban. Los que ya tenía no se vuelven a
    // escribir: su fila original es la evidencia buena, con su fecha real.
    const ok = await logConsent(userId, faltantes, 'accepted');
    setGuardando(false);
    if (!ok) {
      setError(PUERTA_CONSENT_COPY.errorGuardar);
      return;
    }
    haptic.success();
    // De vuelta al gate, que vuelve a leer y decide a dónde va: onboarding si
    // no lo terminó, pestañas si sí. Esta pantalla no enruta por su cuenta.
    router.replace('/');
  }, [userId, faltantes, todosMarcados, guardando, router]);

  if (loading) return <Pantalla><ActivityIndicator size="large" color={ATP_BRAND.lime} /></Pantalla>;
  if (!session) return <Redirect href="/login" />;
  // Ya no falta nada (o el flush lo resolvió): el gate decide el destino.
  if (fase === 'completo') return <Redirect href="/" />;

  const nombre = primerNombre(user?.user_metadata);

  return (
    <ThemeReady>
      <StatusBar style={t.kind === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        style={[s.screen, { backgroundColor: t.fondo }]}
        contentContainerStyle={{
          paddingHorizontal: Spacing.md,
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xxl,
        }}
      >
        {fase === 'leyendo' && (
          <View style={s.centro}>
            <ActivityIndicator size="large" color={ATP_BRAND.lime} />
          </View>
        )}

        {fase === 'fallo' && (
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
            <Ionicons name="cloud-offline-outline" size={28} color={t.textoSecundario} />
            <EliteText style={[s.titulo, { color: t.texto }]}>{PUERTA_CONSENT_COPY.fallo.title}</EliteText>
            <EliteText style={[s.cuerpo, { color: t.textoSecundario }]}>{PUERTA_CONSENT_COPY.fallo.body}</EliteText>
            <AnimatedPressable style={s.botonPrimario} onPress={() => { haptic.medium(); setIntento((n) => n + 1); }}>
              <EliteText style={[s.botonPrimarioTexto, { color: t.textoSobreLima }]}>{PUERTA_CONSENT_COPY.fallo.cta}</EliteText>
            </AnimatedPressable>
            <AnimatedPressable style={s.botonSecundario} onPress={signOut}>
              <EliteText style={[s.botonSecundarioTexto, { color: t.textoSecundario }]}>{PUERTA_CONSENT_COPY.salir}</EliteText>
            </AnimatedPressable>
          </View>
        )}

        {fase === 'pidiendo' && (
          <>
            <View style={s.escudo}>
              <Ionicons name="shield-checkmark-outline" size={30} color={ATP_BRAND.lime} />
            </View>
            <EliteText style={[s.saludo, { color: t.textoSecundario }]}>
              {PUERTA_CONSENT_COPY.saludo(nombre)}
            </EliteText>
            <EliteText style={[s.tituloGrande, { color: t.texto }]}>{PUERTA_CONSENT_COPY.title}</EliteText>
            <EliteText style={[s.cuerpoIzq, { color: t.textoSecundario }]}>{PUERTA_CONSENT_COPY.cuerpo}</EliteText>
            <EliteText style={[s.cuerpoIzq, { color: t.textoSecundario }]}>{PUERTA_CONSENT_COPY.tranquilidad}</EliteText>

            {/* Texto legal EXACTO, uno por consentimiento, ninguno pre-marcado. */}
            <View style={s.bloque}>
              {faltantes.map((id) => (
                <ConsentCheckboxRow
                  key={id}
                  text={CONSENT_BY_ID[id].text}
                  checked={!!marcados[id]}
                  onToggle={() => setMarcados((m) => ({ ...m, [id]: !m[id] }))}
                  required
                />
              ))}
            </View>

            {error && <EliteText style={[s.error, { color: t.error }]}>{error}</EliteText>}

            <AnimatedPressable
              style={[s.botonPrimario, !todosMarcados && { opacity: 0.4 }]}
              onPress={aceptar}
              disabled={!todosMarcados || guardando}
            >
              <EliteText style={[s.botonPrimarioTexto, { color: t.textoSobreLima }]}>
                {guardando ? PUERTA_CONSENT_COPY.guardando : PUERTA_CONSENT_COPY.cta}
              </EliteText>
            </AnimatedPressable>

            {/* La salida. Sin ella, quien no quiera aceptar hoy se queda
                encerrado y su único recurso es desinstalar. */}
            <AnimatedPressable style={s.botonSecundario} onPress={signOut}>
              <EliteText style={[s.botonSecundarioTexto, { color: t.textoSecundario }]}>
                {PUERTA_CONSENT_COPY.salir}
              </EliteText>
            </AnimatedPressable>
          </>
        )}
      </ScrollView>
    </ThemeReady>
  );
}

/** Envoltura mínima para los estados que solo pintan un spinner. */
function Pantalla({ children }: { children: ReactNode }) {
  const { tokens: t } = useAppTheme();
  return (
    <ThemeReady>
      <View style={[s.screen, s.centro, { backgroundColor: t.fondo }]}>{children}</View>
    </ThemeReady>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl },
  escudo: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(168,224,42,0.1)', marginBottom: Spacing.md,
  },
  saludo: { fontSize: FontSizes.md, fontFamily: Fonts.regular },
  tituloGrande: { fontSize: 28, fontFamily: Fonts.bold, marginTop: 4 },
  titulo: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, textAlign: 'center', marginTop: 4 },
  cuerpo: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20 },
  cuerpoIzq: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 21, marginTop: Spacing.md },
  bloque: { gap: Spacing.md, marginTop: Spacing.xl },
  card: {
    padding: Spacing.lg, borderWidth: 1, borderRadius: Radius.card,
    alignItems: 'center', gap: 8, marginTop: Spacing.xxl,
  },
  error: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: Spacing.md },
  botonPrimario: {
    alignSelf: 'stretch', backgroundColor: ATP_BRAND.lime, borderRadius: Radius.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.xl,
  },
  botonPrimarioTexto: { fontSize: FontSizes.md, fontFamily: Fonts.bold, letterSpacing: 1 },
  botonSecundario: { paddingVertical: 14, alignItems: 'center', marginTop: Spacing.xs },
  botonSecundarioTexto: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
