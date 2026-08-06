/**
 * La ficha del pack (MB-25 Pieza 5) — qué es, qué instala, qué enciende,
 * y el botón que arranca las tres preguntas (la primera ya viene
 * contestada al entrar por aquí).
 *
 * Si el pack está activo: desde cuándo, con qué intensidad, y su botón de
 * desactivar con el copy honesto de la doctrina: desactivar = dejar de
 * agrupar y medir. NADA se desinstala, NADA se borra.
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
import {
  PACK_BY_KEY, INTENSIDAD_LABELS, habitosPorIntensidad,
} from '@/src/constants/packs';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { APP_BY_KEY } from '@/src/constants/app-registry';
import {
  getUserPacks, deactivatePack,
} from '@/src/services/pack-service';
import { packActivo, type UserPackRow } from '@/src/services/pack-core';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, TEXT, ELEVATION, withOpacity } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';

const nombreElectron = (key: string) =>
  ELECTRON_WEIGHTS[key as ElectronSource]?.name ?? key;

const COPY_DESACTIVAR =
  'El pack deja de figurar como activo. Nada se desinstala y nada se borra: ' +
  'tus apps, hábitos, metas y avisos quedan exactamente como están, y tú decides.';

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

  const [filas, setFilas] = useState<UserPackRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.id) setFilas(await getUserPacks(user.id));
  }, [user?.id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!pack) {
    // Llave desconocida (deep link viejo o typo): fuera, sin inventar pantalla.
    return (
      <Screen>
        <StatusBar style="light" />
        <ScreenHeader title="Packs" onBack={() => router.back()} />
        <View style={s.vacio}>
          <EliteText style={s.vacioText}>Ese pack no existe en esta versión.</EliteText>
        </View>
      </Screen>
    );
  }

  const activo = packActivo(filas);
  const esActivo = activo?.pack_key === pack.key;
  const core = habitosPorIntensidad(pack, 'suave');
  const extra = pack.enciende.filter((h) => !h.core);

  const doDesactivar = () => {
    if (!user?.id || busy) return;
    Alert.alert(`Desactivar ${pack.nombre}`, COPY_DESACTIVAR, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          haptic.medium();
          const r = await deactivatePack(user.id, pack.key);
          setBusy(false);
          if (!r.ok) {
            Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.');
            return;
          }
          refresh();
        },
      },
    ]);
  };

  return (
    <Screen>
      <StatusBar style="light" />
      <ScreenHeader title={pack.nombre} onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Qué es */}
        <Animated.View entering={FadeInUp.delay(40).springify()} style={s.hero}>
          <View style={s.heroIcon}>
            <AppIcon name={pack.icon} size={30} color={TEXT.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <EliteText style={s.heroTitle}>{pack.nombre}</EliteText>
            <EliteText style={s.heroTag}>PACK</EliteText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <EliteText style={s.paraQuien}>{pack.paraQuien}</EliteText>
          <EliteText style={s.queEsperar}>{pack.queEsperar}</EliteText>
        </Animated.View>

        {/* Estado / acción principal */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          {esActivo && activo ? (
            <View style={s.activoCard}>
              <View style={s.activoRow}>
                <Ionicons name="checkmark-circle" size={16} color={ATP_BRAND.lime} />
                <EliteText style={s.activoText}>
                  Activo desde el {fechaLegible(activo.activated_at)}
                  {activo.intensidad ? ` · ${INTENSIDAD_LABELS[activo.intensidad]}` : ''}
                </EliteText>
              </View>
              <AnimatedPressable
                style={s.reajustarBtn}
                onPress={() => { haptic.light(); router.push(`/packs/armar?pack=${pack.key}`); }}
              >
                <EliteText style={s.reajustarText}>Volver a sintonizar</EliteText>
              </AnimatedPressable>
              <AnimatedPressable style={s.desactivarBtn} onPress={doDesactivar} disabled={busy}>
                <EliteText style={s.desactivarText}>Desactivar</EliteText>
              </AnimatedPressable>
              <EliteText style={s.nota}>
                Desactivar nunca borra ni desinstala nada: tus apps y hábitos
                quedan como están.
              </EliteText>
            </View>
          ) : (
            <>
              <AnimatedPressable
                style={s.cta}
                onPress={() => { haptic.light(); router.push(`/packs/armar?pack=${pack.key}`); }}
              >
                <EliteText style={s.ctaText}>Armar mi app con este pack</EliteText>
              </AnimatedPressable>
              {activo && PACK_BY_KEY[activo.pack_key] && (
                <EliteText style={s.nota}>
                  Tienes activo {PACK_BY_KEY[activo.pack_key].nombre}. Al cambiar,
                  nada se desinstala: tu día solo se vuelve a sintonizar.
                </EliteText>
              )}
            </>
          )}
        </Animated.View>

        {/* Qué instala */}
        <Animated.View entering={FadeInUp.delay(160).springify()}>
          <EliteText style={s.seccion}>QUÉ INSTALA</EliteText>
          <View style={s.card}>
            <EliteText style={s.cardTexto}>
              {pack.instala.map((k) => APP_BY_KEY[k]?.label ?? k).join(' · ')}
            </EliteText>
          </View>
        </Animated.View>

        {/* Qué enciende */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <EliteText style={s.seccion}>QUÉ ENCIENDE</EliteText>
          <View style={s.card}>
            <EliteText style={s.cardLabel}>Desde el inicio</EliteText>
            <EliteText style={s.cardTexto}>
              {core.map((h) => nombreElectron(h.electron)).join(' · ')}
            </EliteText>
            {extra.length > 0 && (
              <>
                <EliteText style={[s.cardLabel, { marginTop: 10 }]}>Con todo</EliteText>
                <EliteText style={s.cardTexto}>
                  {extra.map((h) => nombreElectron(h.electron)).join(' · ')}
                </EliteText>
              </>
            )}
            <EliteText style={s.nota}>
              Cada hábito queda con hora anclada a tu horario de despertar y
              dormir. Todo se puede ajustar después, hábito por hábito.
            </EliteText>
          </View>
        </Animated.View>

        {/* Metas y avisos, solo si el pack los trae */}
        {(pack.metas.length > 0 || pack.avisos.length > 0) && (
          <Animated.View entering={FadeInUp.delay(240).springify()}>
            <EliteText style={s.seccion}>ADEMÁS</EliteText>
            <View style={s.card}>
              {pack.metas.length > 0 && (
                <EliteText style={s.cardTexto}>
                  Fija {pack.metas
                    .map((m) =>
                      m.tipo === 'proteina_g' ? `tu meta de proteína (${m.valor} g)` :
                      m.tipo === 'agua_ml' ? `tu meta de agua (${m.valor} ml)` :
                      `tu meta de ayuno (${m.valor} h)`)
                    .join(' y ')}.
                </EliteText>
              )}
              {pack.avisos.length > 0 && (
                <EliteText style={s.cardTexto}>
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
  heroTitle: { color: TEXT.primary, fontFamily: Fonts.bold, fontSize: 20 },
  heroTag: {
    color: TEXT.tertiary,
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 2,
  },

  paraQuien: {
    color: TEXT.primary,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  queEsperar: {
    color: TEXT.secondary,
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
  ctaText: { color: '#000', fontFamily: Fonts.bold, fontSize: FontSizes.md, letterSpacing: 0.5 },

  activoCard: {
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    borderRadius: 14,
    padding: Spacing.md,
  },
  activoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activoText: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
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
  desactivarBtn: {
    borderWidth: 0.5,
    borderColor: ELEVATION[2].border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  desactivarText: { color: TEXT.secondary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },

  seccion: {
    color: TEXT.tertiary,
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    borderRadius: 14,
    padding: Spacing.md,
    gap: 4,
  },
  cardLabel: {
    color: TEXT.tertiary,
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cardTexto: {
    color: TEXT.primary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  nota: {
    color: TEXT.tertiary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    marginTop: 8,
  },

  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vacioText: { color: TEXT.tertiary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
