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
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { supabase } from '@/src/lib/supabase';
import {
  visibleApps, searchApps, type AppEntry,
} from '@/src/constants/app-registry';
import { groupBySection } from '@/src/services/atp-room-core';
import { getInstallPrefs } from '@/src/services/hoy/install-service';
import { appInstallState, type InstallPrefs, type InstallState } from '@/src/services/hoy/install-core';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { APP_SECTION_COLORS, TEXT, ELEVATION, withOpacity } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';

const STATE_LABEL: Record<InstallState, string> = {
  instalada: 'En tu cuadrícula',
  fija: 'Fija',
  no: '',
};

export default function CentroScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // El buscador de la sala manda aquí su término cuando no lo encontró.
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [isFemale, setIsFemale] = useState(false);
  const [query, setQuery] = useState(typeof q === 'string' ? q : '');
  const [installPrefs, setInstallPrefs] = useState<InstallPrefs | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle();
        if (alive) setIsFemale((data as any)?.biological_sex === 'female');
      } catch { /* sin perfil: el ciclo queda oculto */ }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  // Al volver de una ficha, el estado (instalada/no) puede haber cambiado.
  const refresh = useCallback(async () => {
    if (user?.id) setInstallPrefs(await getInstallPrefs(user.id));
  }, [user?.id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const apps = useMemo(() => visibleApps(isFemale), [isFemale]);
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
        style={[s.row, !isLast && s.rowDivider]}
        onPress={() => { haptic.light(); router.push(`/centro/${app.key}`); }}
      >
        <View style={[s.rowIcon, { backgroundColor: withOpacity(color, 0.10), borderColor: withOpacity(color, 0.22) }]}>
          <AppIcon name={app.icon} size={18} color={color} />
        </View>
        <EliteText style={s.rowLabel} numberOfLines={1}>{app.label}</EliteText>
        {state !== 'no' && (
          <EliteText style={[s.rowState, state === 'instalada' && s.rowStateOn]}>
            {STATE_LABEL[state]}
          </EliteText>
        )}
        <Ionicons name="chevron-forward" size={15} color={TEXT.muted} />
      </AnimatedPressable>
    );
  };

  return (
    <Screen>
      <StatusBar style="light" />
      <ScreenHeader title="Centro ATP" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <EliteText style={s.hint}>
          Todas las funciones de ATP. Entra a una para ver qué hace, instalarla
          en tu cuadrícula o ajustarla. Desinstalar nunca borra tus datos.
        </EliteText>

        {/* Buscador — busca entre TODAS, que para eso es el Centro. */}
        <Animated.View entering={FadeInUp.delay(40).springify()} style={s.searchRow}>
          <Ionicons name="search" size={16} color={TEXT.tertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar una función"
            placeholderTextColor={TEXT.muted}
            style={s.searchInput}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searching && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={TEXT.tertiary} />
            </Pressable>
          )}
        </Animated.View>

        {groups.map((g, gi) => (
          <Animated.View key={g.section} entering={FadeInUp.delay(60 + gi * 40).springify()}>
            <EliteText style={[s.sectionTitle, { color: APP_SECTION_COLORS[g.section] }]}>
              {g.label.toUpperCase()}
            </EliteText>
            <View style={s.group}>
              {g.apps.map((app, i) => renderRow(app, i === g.apps.length - 1))}
            </View>
          </Animated.View>
        ))}

        {searching && listed.length === 0 && (
          <View style={s.empty}>
            <EliteText style={s.emptyText}>Nada con ese nombre</EliteText>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  hint: {
    color: TEXT.secondary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0a0a0a',
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: TEXT.primary,
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
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
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
    borderBottomColor: ELEVATION[1].border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  rowState: { color: TEXT.muted, fontFamily: Fonts.regular, fontSize: FontSizes.xs },
  rowStateOn: { color: TEXT.tertiary },

  empty: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyText: { color: TEXT.tertiary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
