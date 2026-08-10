/**
 * El Centro ATP (MB-22 Pieza 2) — el instalador y configurador de apps.
 *
 * Todas las funciones de la app, agrupadas por sección, estilo Ajustes de
 * iOS: filas agrupadas, sin adornos. Cada fila entra a la ficha de esa app
 * (/centro/[appKey]), que es donde se instala, se desinstala y se configura.
 *
 * La configuración NO está en el camino diario: vives en HOY y a este lugar
 * entras cuando quieres cambiar algo. Es el patrón de Ajustes de iOS, no el
 * de un panel que te recibe.
 */
import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
  visibleApps, searchApps, type AppEntry,
} from '@/src/constants/app-registry';
import { PACKS, PAQUETES_SALUD } from '@/src/constants/packs';
import { groupBySection } from '@/src/services/atp-room-core';
import { getInstallPrefs } from '@/src/services/hoy/install-service';
import { appInstallState, type InstallPrefs, type InstallState } from '@/src/services/hoy/install-core';
import { getUserPacks } from '@/src/services/pack-service';
import { packAplicado, type UserPackRow } from '@/src/services/pack-core';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { APP_SECTION_COLORS, ATP_BRAND, ELEVATION, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';

const STATE_LABEL: Record<InstallState, string> = {
  instalada: 'En tu cuadrícula',
  fija: 'Fija',
  no: '',
};

export default function CentroScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-31B: pantalla migrada — superficies/texto del tema; los colores de
  // sección de iconos y encabezados son identidad y no se tematizan.
  const { kind, tokens } = useAppTheme();
  const dark = kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : tokens.tealTexto;
  const tenueInformativo = dark ? tokens.textoTenue : tokens.textoSecundario;
  const grupo = { backgroundColor: tokens.card, borderColor: tokens.borde };
  const iconoNeutro = dark
    ? undefined
    : { backgroundColor: tokens.hundido, borderColor: tokens.borde };
  // El buscador de la sala manda aquí su término cuando no lo encontró.
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [query, setQuery] = useState(typeof q === 'string' ? q : '');
  const [installPrefs, setInstallPrefs] = useState<InstallPrefs | null>(null);
  // MB-25 P5 / MB-26 P7.1: los packs APLICADOS pintan su chip (se
  // acumulan; el concepto de "pack activo" murió). Fail-soft: si la
  // lectura falla (o la mig 254 no está), la sección vive igual.
  const [packs, setPacks] = useState<UserPackRow[] | null>(null);

  // Al volver de una ficha, el estado (instalada/no) puede haber cambiado.
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setInstallPrefs(await getInstallPrefs(user.id));
    setPacks(await getUserPacks(user.id));
  }, [user?.id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // MB-22 P4: el Centro lista TODAS las apps para todos. Ciclo es instalable
  // por cualquiera (su ficha resuelve el modo); ocultarla aquí impediría que
  // un acompañante siquiera supiera que existe.
  const apps = useMemo(() => visibleApps(true), []);
  const searching = query.trim().length > 0;
  const listed = useMemo(() => searchApps(apps, query), [apps, query]);
  const groups = useMemo(() => groupBySection(listed), [listed]);

  const stateOf = (app: AppEntry): InstallState =>
    installPrefs ? appInstallState(app.key, installPrefs) : 'no';

  const renderRow = (app: AppEntry, isLast: boolean) => {
    const color = APP_SECTION_COLORS[app.section];
    const state = stateOf(app);
    return (
      <AnimatedPressable
        key={app.key}
        style={[s.row, !isLast && [s.rowDivider, { borderBottomColor: tokens.borde }]]}
        onPress={() => { haptic.light(); router.push(`/centro/${app.key}`); }}
      >
        <View style={[s.rowIcon, { backgroundColor: withOpacity(color, 0.10), borderColor: withOpacity(color, 0.22) }]}>
          <AppIcon name={app.icon} size={18} color={color} />
        </View>
        <EliteText style={[s.rowLabel, { color: tokens.texto }]} numberOfLines={1}>{app.label}</EliteText>
        {state !== 'no' && (
          <EliteText style={{
            fontFamily: Fonts.regular,
            fontSize: FontSizes.xs,
            color: state === 'instalada' ? tenueInformativo : tokens.sinDatos,
          }}>
            {STATE_LABEL[state]}
          </EliteText>
        )}
        <Ionicons name="chevron-forward" size={15} color={tokens.sinDatos} />
      </AnimatedPressable>
    );
  };

  return (
    <Screen themed>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScreenHeader title="Centro ATP" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* MB-25 P5: la sección de packs, arriba. Un pack arma la app
            completa; buscar una función la esconde para no estorbar. */}
        {!searching && (
          <Animated.View entering={FadeInUp.delay(20).springify()}>
            <EliteText style={[s.packsTitle, { color: tenueInformativo }]}>ÁRMALA POR MÍ</EliteText>
            <EliteText style={[s.packsHint, { color: tokens.textoSecundario }]}>
              Contesta dos preguntas y tu app queda armada para lo que
              quieres cambiar primero. Los packs se aplican y se acumulan.
            </EliteText>
            {/* MB-26 P4: la puerta de Ordenar mi día también vive aquí — el
                Centro es donde se cambia la configuración. */}
            <View style={[s.group, grupo, { marginBottom: Spacing.xs }]}>
              <AnimatedPressable
                style={s.row}
                onPress={() => { haptic.light(); router.push('/ordenar-dia'); }}
              >
                <View style={[s.packIcon, iconoNeutro]}>
                  <Ionicons name="sparkles-outline" size={16} color={tokens.textoSecundario} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText style={[s.rowLabel, { color: tokens.texto }]} numberOfLines={1}>Ordenar mi día</EliteText>
                  <EliteText style={[s.packParaQuien, { color: tokens.textoSecundario }]} numberOfLines={1}>
                    Graduar, reposar o empezar de cero. Nada se borra.
                  </EliteText>
                </View>
                <Ionicons name="chevron-forward" size={15} color={tokens.sinDatos} />
              </AnimatedPressable>
            </View>
            <View style={[s.group, grupo, { marginBottom: Spacing.md }]}>
              {PACKS.map((p, i) => {
                const esAplicado = packAplicado(packs, p.key) != null;
                return (
                  <AnimatedPressable
                    key={p.key}
                    style={[s.row, i < PACKS.length - 1 && [s.rowDivider, { borderBottomColor: tokens.borde }]]}
                    onPress={() => { haptic.light(); router.push(`/packs/${p.key}`); }}
                  >
                    <View style={[s.packIcon, iconoNeutro]}>
                      <AppIcon name={p.icon} size={18} color={tokens.textoSecundario} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <EliteText style={[s.rowLabel, { color: tokens.texto }]} numberOfLines={1}>{p.nombre}</EliteText>
                      <EliteText style={[s.packParaQuien, { color: tokens.textoSecundario }]} numberOfLines={1}>{p.paraQuien}</EliteText>
                    </View>
                    {esAplicado && <EliteText style={[s.packAplicadoChip, { color: acento }]}>APLICADO</EliteText>}
                    <Ionicons name="chevron-forward" size={15} color={tokens.sinDatos} />
                  </AnimatedPressable>
                );
              })}
            </View>

            {/* MB-29 P4: los paquetes de salud — mismo motor, misma ficha.
                Instalan el grupo de apps que se usan juntas. */}
            <EliteText style={[s.packsTitle, { color: tenueInformativo }]}>PAQUETES DE SALUD</EliteText>
            <View style={[s.group, grupo, { marginBottom: Spacing.md }]}>
              {PAQUETES_SALUD.map((p, i) => {
                const esAplicado = packAplicado(packs, p.key) != null;
                return (
                  <AnimatedPressable
                    key={p.key}
                    style={[s.row, i < PAQUETES_SALUD.length - 1 && [s.rowDivider, { borderBottomColor: tokens.borde }]]}
                    onPress={() => { haptic.light(); router.push(`/packs/${p.key}`); }}
                  >
                    <View style={[s.packIcon, iconoNeutro]}>
                      <AppIcon name={p.icon} size={18} color={tokens.textoSecundario} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <EliteText style={[s.rowLabel, { color: tokens.texto }]} numberOfLines={1}>{p.nombre}</EliteText>
                      <EliteText style={[s.packParaQuien, { color: tokens.textoSecundario }]} numberOfLines={1}>{p.paraQuien}</EliteText>
                    </View>
                    {esAplicado && <EliteText style={[s.packAplicadoChip, { color: acento }]}>APLICADO</EliteText>}
                    <Ionicons name="chevron-forward" size={15} color={tokens.sinDatos} />
                  </AnimatedPressable>
                );
              })}
            </View>
          </Animated.View>
        )}

        <EliteText style={[s.hint, { color: tokens.textoSecundario }]}>
          Todas las funciones de ATP. Entra a una para ver qué hace, instalarla
          en tu cuadrícula o ajustarla. Desinstalar nunca borra tus datos.
        </EliteText>

        {/* Buscador — busca entre TODAS, que para eso es el Centro. */}
        <Animated.View
          entering={FadeInUp.delay(40).springify()}
          style={[s.searchRow, { backgroundColor: tokens.hundido, borderColor: tokens.borde }]}
        >
          <Ionicons name="search" size={16} color={tokens.textoTenue} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar una función"
            placeholderTextColor={tokens.sinDatos}
            style={[s.searchInput, { color: tokens.texto }]}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searching && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={tokens.textoTenue} />
            </Pressable>
          )}
        </Animated.View>

        {groups.map((g, gi) => (
          <Animated.View key={g.section} entering={FadeInUp.delay(60 + gi * 40).springify()}>
            <EliteText style={[s.sectionTitle, { color: APP_SECTION_COLORS[g.section] }]}>
              {g.label.toUpperCase()}
            </EliteText>
            <View style={[s.group, grupo]}>
              {g.apps.map((app, i) => renderRow(app, i === g.apps.length - 1))}
            </View>
          </Animated.View>
        ))}

        {searching && listed.length === 0 && (
          <View style={s.empty}>
            <EliteText style={[s.emptyText, { color: tenueInformativo }]}>Nada con ese nombre</EliteText>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

// MB-31B: solo layout — el color entra inline desde los tokens del tema.
const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  packsTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  packsHint: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  packIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    backgroundColor: withOpacity(ATP_BRAND.white, 0.05),
    alignItems: 'center',
    justifyContent: 'center',
  },
  packParaQuien: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    marginTop: 1,
  },
  packAplicadoChip: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    padding: 0,
  },

  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  group: {
    borderWidth: 0.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowDivider: {
    borderBottomWidth: 0.5,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },

  empty: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
