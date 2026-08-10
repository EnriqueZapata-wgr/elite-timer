/**
 * La ficha del pack (MB-25 Pieza 5, corregida en MB-26 Pieza 7) — qué es,
 * qué instala, qué enciende, y el botón que arranca las dos preguntas (la
 * primera ya viene contestada al entrar por aquí).
 *
 * Un pack NO es un modo, es un instalador: se aplica y se acumula.
 * "Desactivar" murió (un botón que mentía por omisión). Si el pack está
 * aplicado, la ficha muestra su etapa: con los 3 base sostenidos 14 de 21
 * días la app PROPONE encender el resto, y el usuario puede adelantarlo
 * cuando quiera.
 *
 * argosFoco se guarda en el registro pero NO se muestra: su consumo en
 * contexto es de MB-31 y prometer comportamiento que aún no existe va
 * contra la navegación honesta.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { useAuth } from '@/src/contexts/auth-context';
import { PACK_BY_KEY, habitosPorIntensidad } from '@/src/constants/packs';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { APP_BY_KEY } from '@/src/constants/app-registry';
import { getUserPacks, avanzarPackEtapa } from '@/src/services/pack-service';
import { packAplicado, type UserPackRow } from '@/src/services/pack-core';
import { etapaDelPack } from '@/src/services/pack-etapas-core';
import { getHistorialBooleanos } from '@/src/services/hoy/graduacion-service';
import { ultimasFechas, ETAPA_PACK, type HistorialHabitos } from '@/src/services/hoy/graduacion-core';
import { getLocalToday } from '@/src/utils/date-helpers';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, ELEVATION, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';

const nombreElectron = (key: string) =>
  ELECTRON_WEIGHTS[key as ElectronSource]?.name ?? key;

function fechaLegible(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

export default function FichaPackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { packKey } = useLocalSearchParams<{ packKey: string }>();
  const pack = typeof packKey === 'string' ? PACK_BY_KEY[packKey] : undefined;

  // MB-31B: pantalla migrada — parches de tema (mismo esquema que armar.tsx).
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const thTexto = { color: tokens.texto };
  const thSec = { color: tokens.textoSecundario };
  const thTenue = { color: dark ? tokens.textoTenue : tokens.textoSecundario };
  const thCard = { backgroundColor: tokens.card, borderColor: tokens.borde };

  const [filas, setFilas] = useState<UserPackRow[] | null>(null);
  const [historial, setHistorial] = useState<HistorialHabitos | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const hoy = getLocalToday();
    const [rows, hist] = await Promise.all([
      getUserPacks(user.id),
      getHistorialBooleanos(user.id, ultimasFechas(hoy, ETAPA_PACK.dias)[0]),
    ]);
    setFilas(rows);
    setHistorial(hist);
  }, [user?.id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!pack) {
    // Llave desconocida (deep link viejo o typo): fuera, sin inventar pantalla.
    return (
      <Screen themed>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <ScreenHeader title="Packs" onBack={() => router.back()} />
        <View style={s.vacio}>
          <EliteText style={[s.vacioText, thTenue]}>Ese pack no existe en esta versión.</EliteText>
        </View>
      </Screen>
    );
  }

  const fila = packAplicado(filas, pack.key);
  const etapa = fila ? etapaDelPack(fila, historial ?? {}, getLocalToday()) : null;
  const core = habitosPorIntensidad(pack, 'suave');
  const extra = pack.enciende.filter((h) => !h.core);

  // Etapa 2: encender el resto del pack — la app lo propone al sostener
  // los core 14/21, y el usuario puede adelantarlo cuando quiera.
  const doAvanzar = () => {
    if (!user?.id || busy) return;
    const userId = user.id;
    Alert.alert(
      'Encender el resto',
      `Se encienden ${extra.map((h) => nombreElectron(h.electron)).join(', ')}, con su hora anclada a tu vida. Lo que ya moviste a mano no se toca.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encender',
          onPress: async () => {
            setBusy(true);
            haptic.medium();
            const r = await avanzarPackEtapa(userId, pack.key);
            setBusy(false);
            if (!r.ok) {
              Alert.alert('Casi', 'Algo no entró completo. Inténtalo de nuevo en un momento.');
            } else {
              haptic.success();
            }
            refresh();
          },
        },
      ],
    );
  };

  return (
    <Screen themed>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScreenHeader title={pack.nombre} onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Qué es */}
        <Animated.View entering={FadeInUp.delay(40).springify()} style={s.hero}>
          <View style={[s.heroIcon, !dark && { backgroundColor: tokens.hundido, borderColor: tokens.borde }]}>
            <AppIcon name={pack.icon} size={30} color={tokens.textoSecundario} />
          </View>
          <View style={{ flex: 1 }}>
            <EliteText style={[s.heroTitle, thTexto]}>{pack.nombre}</EliteText>
            <EliteText style={[s.heroTag, thTenue]}>PACK</EliteText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <EliteText style={[s.paraQuien, thTexto]}>{pack.paraQuien}</EliteText>
          <EliteText style={[s.queEsperar, thSec]}>{pack.queEsperar}</EliteText>
        </Animated.View>

        {/* Estado / acción principal */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          {fila ? (
            <View style={[s.activoCard, thCard]}>
              <View style={s.activoRow}>
                <Ionicons name="checkmark-circle" size={16} color={ATP_BRAND.lime} />
                <EliteText style={[s.activoText, thTexto]}>
                  Aplicado el {fechaLegible(fila.activated_at)}
                </EliteText>
              </View>
              {etapa?.etapa === 1 && extra.length === 0 ? (
                // MB-29 P4: paquete sin hábitos de etapa 2 (salud) — no hay
                // "resto" que encender y el copy no lo inventa.
                <EliteText style={[s.etapaText, thSec]}>
                  Sus hábitos están encendidos y sus apps en tu cuadrícula.
                </EliteText>
              ) : etapa?.etapa === 1 ? (
                <>
                  <EliteText style={[s.etapaText, thSec]}>
                    {etapa.sostiene
                      ? 'Ya sostienes los hábitos base. ¿Encendemos el resto?'
                      : `Encendidos sus ${core.length} hábitos base. Los demás llegan cuando los sostengas ${ETAPA_PACK.minimo} de ${ETAPA_PACK.dias} días` +
                        (etapa.progreso ? ` (vas en ${etapa.progreso.cumplidos} de ${etapa.progreso.objetivo}).` : '. Puedes adelantarlos cuando quieras.')}
                  </EliteText>
                  <AnimatedPressable
                    style={etapa.sostiene
                      ? [s.reajustarBtn, !dark && { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime }]
                      : [s.quietBtn, !dark && { borderColor: tokens.bordeMarcado }]}
                    onPress={doAvanzar}
                    disabled={busy}
                  >
                    <EliteText style={etapa.sostiene
                      ? [s.reajustarText, !dark && { color: tokens.textoSobreLima }]
                      : [s.quietText, thSec]}
                    >
                      {etapa.sostiene ? 'Encender el resto' : 'Encenderlos ahora'}
                    </EliteText>
                  </AnimatedPressable>
                </>
              ) : (
                <EliteText style={[s.etapaText, thSec]}>
                  El pack completo está encendido.
                </EliteText>
              )}
              <AnimatedPressable
                style={[s.quietBtn, !dark && { borderColor: tokens.bordeMarcado }]}
                onPress={() => { haptic.light(); router.push(`/packs/armar?pack=${pack.key}`); }}
              >
                <EliteText style={[s.quietText, thSec]}>Volver a sintonizar</EliteText>
              </AnimatedPressable>
              <EliteText style={[s.nota, thTenue]}>
                Los packs se acumulan: puedes aplicar varios. Aplicar nunca
                borra ni desinstala nada.
              </EliteText>
            </View>
          ) : (
            <AnimatedPressable
              style={s.cta}
              onPress={() => { haptic.light(); router.push(`/packs/armar?pack=${pack.key}`); }}
            >
              <EliteText style={s.ctaText}>Armar mi app con este pack</EliteText>
            </AnimatedPressable>
          )}
        </Animated.View>

        {/* Qué instala */}
        <Animated.View entering={FadeInUp.delay(160).springify()}>
          <EliteText style={[s.seccion, thTenue]}>QUÉ INSTALA</EliteText>
          <View style={[s.card, thCard]}>
            <EliteText style={[s.cardTexto, thTexto]}>
              {pack.instala.map((k) => APP_BY_KEY[k]?.label ?? k).join(' · ')}
            </EliteText>
          </View>
        </Animated.View>

        {/* Qué enciende */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <EliteText style={[s.seccion, thTenue]}>QUÉ ENCIENDE</EliteText>
          <View style={[s.card, thCard]}>
            <EliteText style={[s.cardLabel, thTenue]}>Desde el inicio</EliteText>
            <EliteText style={[s.cardTexto, thTexto]}>
              {core.map((h) => nombreElectron(h.electron)).join(' · ')}
            </EliteText>
            {extra.length > 0 && (
              <>
                <EliteText style={[s.cardLabel, thTenue, { marginTop: 10 }]}>Llegan después</EliteText>
                <EliteText style={[s.cardTexto, thTexto]}>
                  {extra.map((h) => nombreElectron(h.electron)).join(' · ')}
                </EliteText>
              </>
            )}
            <EliteText style={[s.nota, thTenue]}>
              Cada hábito queda con su hora anclada a tu vida (despertar,
              dormir o tu ventana de sol) y se recorre sola si tu horario
              cambia. Todo se puede ajustar después, hábito por hábito.
            </EliteText>
          </View>
        </Animated.View>

        {/* Metas y avisos, solo si el pack los trae */}
        {(pack.metas.length > 0 || pack.avisos.length > 0) && (
          <Animated.View entering={FadeInUp.delay(240).springify()}>
            <EliteText style={[s.seccion, thTenue]}>ADEMÁS</EliteText>
            <View style={[s.card, thCard]}>
              {pack.metas.length > 0 && (
                <EliteText style={[s.cardTexto, thTexto]}>
                  Fija {pack.metas
                    .map((m) =>
                      m.tipo === 'proteina_g' ? `tu meta de proteína (${m.valor} g)` :
                      m.tipo === 'agua_ml' ? `tu meta de agua (${m.valor} ml)` :
                      `tu meta de ayuno (${m.valor} h)`)
                    .join(' y ')}.
                </EliteText>
              )}
              {pack.avisos.length > 0 && (
                <EliteText style={[s.cardTexto, thTexto]}>
                  Configura avisos de {pack.avisos
                    .map((a) => APP_BY_KEY[a.app]?.label ?? a.app)
                    .join(' y ')} a tu horario, solo si no lo has hecho ese día.
                  El interruptor general de notificaciones siempre manda.
                </EliteText>
              )}
            </View>
          </Animated.View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: Spacing.md },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: withOpacity('#ffffff', 0.05),
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontFamily: Fonts.bold, fontSize: 20 },
  heroTag: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 2,
  },

  paraQuien: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  queEsperar: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: Spacing.lg,
  },

  cta: {
    backgroundColor: ATP_BRAND.lime,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: { color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 0.5 },

  activoCard: {
    borderWidth: 0.5,
    borderRadius: 14,
    padding: Spacing.md,
  },
  activoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activoText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  etapaText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginTop: 8,
  },
  reajustarBtn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14),
    borderWidth: 0.5,
    borderColor: withOpacity(ATP_BRAND.lime, 0.4),
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  reajustarText: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  quietBtn: {
    borderWidth: 0.5,
    borderColor: ELEVATION[2].border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  quietText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },

  seccion: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  card: {
    borderWidth: 0.5,
    borderRadius: 14,
    padding: Spacing.md,
    gap: 4,
  },
  cardLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardTexto: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  nota: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    marginTop: 8,
  },

  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vacioText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
