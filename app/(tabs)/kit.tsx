/**
 * La sala ATP (MB-19 PIEZA 2) — el lanzador.
 *
 * Sin carpetas: secciones. Las apps caben en un scroll, y una carpeta cobraría
 * un tap sin ahorrar nada. Arriba, UNA card editorial que invita a algo del
 * momento; abajo, la cuadrícula de cuatro columnas.
 *
 * Tres órdenes: Categoría (el default) · Frecuencia (más usadas arriba) · Mío
 * (el orden del usuario, que se edita con una lista, no arrastrando). Al
 * cambiar de orden los iconos VUELAN a su nueva posición: es una línea de
 * reanimated (LinearTransition) y es lo que hace que se sienta caro.
 *
 * El buscador es la salida rápida: dos letras y estás en cualquier función.
 *
 * Absorbió a /habits-portal: sus cards se retiraron y sus destinos son apps.
 * La ruta sigue siendo /kit para no romper deep links.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useSystemReducedMotion } from '@/src/components/ui/useSystemReducedMotion';
import { AppTile } from '@/src/components/atp/AppTile';
import { AtpEditorialCard } from '@/src/components/atp/AtpEditorialCard';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import {
  visibleApps, searchApps, APP_BY_KEY, type AppEntry,
} from '@/src/constants/app-registry';
import {
  ATP_ORDERS, ORDER_LABELS, groupBySection, orderedApps, pickEditorial, reconcileOrder,
  type AtpOrder, type AppUsage, type CustomOrder, type EditorialPick,
} from '@/src/services/atp-room-core';
import {
  loadUsage, recordOpen, loadCustomOrder, loadOrderMode, saveOrderMode,
} from '@/src/services/atp-room-store';
import { getInstallPrefs, installApp, uninstallApp } from '@/src/services/hoy/install-service';
import {
  appInstallState, installAlertBody, uninstallAlertBody, type InstallPrefs,
} from '@/src/services/hoy/install-core';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { APP_SECTION_COLORS, ATP_BRAND, TEXT, ELEVATION, PILL } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';

export default function SalaAtpScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-20: "+ agregar" en TAREAS abre la sala en modo instalación.
  const { agregar } = useLocalSearchParams<{ agregar?: string }>();
  const modoAgregar = agregar === '1';

  const [isFemale, setIsFemale] = useState(false);
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<AtpOrder>('categoria');
  const [usage, setUsage] = useState<AppUsage>({});
  const [custom, setCustom] = useState<CustomOrder>({ keys: [] });
  const [editorial, setEditorial] = useState<EditorialPick | null>(null);
  // null = aún sin leer o lectura fallida: sin badges, no defaults engañosos.
  const [installPrefs, setInstallPrefs] = useState<InstallPrefs | null>(null);

  // El gate del ciclo. Sin perfil, la app no se muestra: es el default seguro.
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

  const apps = useMemo(() => visibleApps(isFemale), [isFemale]);

  // Al volver a la sala se relee todo: si acabas de editar tu orden, ya está.
  const refresh = useCallback(async () => {
    const [u, c, m] = await Promise.all([loadUsage(), loadCustomOrder(), loadOrderMode()]);
    setUsage(u);
    setCustom(c);
    setOrder(m);
    if (user?.id) setInstallPrefs(await getInstallPrefs(user.id));
  }, [user?.id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // MB-20: instalar/desinstalar desde el mosaico (tap largo, o tap en modo agregar).
  const promptInstall = useCallback((app: AppEntry) => {
    if (!user?.id || !installPrefs) return;
    if (!app.installable) {
      Alert.alert(app.label, 'Esta función se abre cuando la necesitas: no genera hábito en TAREAS.');
      return;
    }
    const state = appInstallState(app.key, installPrefs);
    if (state === 'fija') {
      Alert.alert(app.label, 'Este hábito es parte del núcleo de tu día: siempre está en TAREAS.');
      return;
    }
    if (state === 'instalada') {
      Alert.alert(
        `Desinstalar ${app.label}`,
        uninstallAlertBody(app.key),
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desinstalar',
            style: 'destructive',
            onPress: async () => {
              haptic.medium();
              const r = await uninstallApp(user.id, app.key);
              if (!r.ok) { Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.'); return; }
              refresh();
            },
          },
        ],
      );
      return;
    }
    Alert.alert(
      `Instalar ${app.label}`,
      installAlertBody(app.key),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Instalar',
          onPress: async () => {
            haptic.success();
            const r = await installApp(user.id, app.key);
            if (!r.ok) { Alert.alert('No se pudo', 'Inténtalo de nuevo en un momento.'); return; }
            refresh();
          },
        },
      ],
    );
  }, [user?.id, installPrefs, refresh]);

  // La card se calcula con el reloj de ESTE render, no con un intervalo: la
  // pantalla se vuelve a montar cada vez que entras y eso basta.
  useEffect(() => {
    const now = new Date();
    setEditorial(pickEditorial(apps, usage, now.getTime(), now.getHours()));
  }, [apps, usage]);

  const open = useCallback((app: AppEntry) => {
    // Modo agregar: el tap sobre una instalable no instalada INSTALA (el gesto
    // que promete el botón "+ agregar"); el resto abre normal.
    if (modoAgregar && installPrefs && app.installable && appInstallState(app.key, installPrefs) === 'no') {
      promptInstall(app);
      return;
    }
    recordOpen(app.key);
    router.push(app.route);
  }, [router, modoAgregar, installPrefs, promptInstall]);

  const changeOrder = (next: AtpOrder) => {
    haptic.light();
    setOrder(next);
    saveOrderMode(next);
  };

  const searching = query.trim().length > 0;
  const results = useMemo(() => searchApps(apps, query), [apps, query]);
  const listed = useMemo(
    () => orderedApps(apps, order, usage, reconcileOrder(custom, apps)),
    [apps, order, usage, custom]
  );
  const groups = useMemo(() => groupBySection(listed), [listed]);

  // Pieza 5: el rebote se queda, pero con "reducir movimiento" del sistema la
  // transición es lisa (sin springify). Misma señal que usa la orbe, en vivo.
  const reducedMotion = useSystemReducedMotion();
  const tileLayout = reducedMotion ? LinearTransition : LinearTransition.springify().damping(18);

  const renderTile = (app: AppEntry) => (
    // La transición de layout es lo que hace que el icono VUELE al reordenar.
    <Animated.View key={app.key} layout={tileLayout} style={s.tileSlot}>
      <AppTile
        icon={app.icon}
        label={app.label}
        section={app.section}
        onPress={() => open(app)}
        installed={installPrefs ? appInstallState(app.key, installPrefs) !== 'no' : false}
        onLongPress={() => promptInstall(app)}
      />
    </Animated.View>
  );

  return (
    <TabScreen>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInUp.delay(40).springify()} style={s.header}>
          <EliteText style={s.eyebrow}>TUS FUNCIONES</EliteText>
          <EliteText style={s.title}>ATP</EliteText>
        </Animated.View>

        {/* MB-20: modo agregar — instalar es un gesto, no un formulario. */}
        {modoAgregar && (
          <Animated.View entering={FadeInUp.delay(60).springify()} style={s.agregarBanner}>
            <Ionicons name="add-circle-outline" size={16} color={ATP_BRAND.lime} />
            <EliteText style={s.agregarText}>
              Toca una app para instalarla en tu día. Desinstalar nunca borra tus datos.
            </EliteText>
          </Animated.View>
        )}

        {/* El momento con foto de esta pantalla. UNA card: ni carrusel ni feed. */}
        {!searching && editorial && (
          <Animated.View entering={FadeInUp.delay(80).springify()}>
            <AtpEditorialCard
              pick={editorial}
              onTap={() => {
                const app = APP_BY_KEY[editorial.appKey];
                if (app) open(app);
              }}
            />
          </Animated.View>
        )}

        {/* Buscador */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={s.searchRow}>
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

        {searching ? (
          <View style={s.grid}>
            {results.length > 0
              ? results.map(renderTile)
              : (
                <View style={s.emptySearch}>
                  <EliteText style={s.emptyText}>Nada con ese nombre</EliteText>
                </View>
              )}
          </View>
        ) : (
          <>
            {/* Chips de orden */}
            <Animated.View entering={FadeInUp.delay(150).springify()} style={s.chipRow}>
              {ATP_ORDERS.map((o) => (
                <AnimatedPressable
                  key={o}
                  style={[s.chip, order === o && s.chipActive]}
                  onPress={() => changeOrder(o)}
                >
                  <EliteText style={[s.chipText, order === o && s.chipTextActive]}>
                    {ORDER_LABELS[o].toUpperCase()}
                  </EliteText>
                </AnimatedPressable>
              ))}
              {order === 'mio' && (
                <AnimatedPressable
                  style={s.editOrder}
                  onPress={() => { haptic.light(); router.push('/atp-orden'); }}
                >
                  <Ionicons name="options-outline" size={14} color={ATP_BRAND.lime} />
                  <EliteText style={s.editOrderText}>EDITAR</EliteText>
                </AnimatedPressable>
              )}
            </Animated.View>

            {order === 'categoria' ? (
              groups.map((g) => (
                <View key={g.section}>
                  {/* Pieza 4: el encabezado lleva el color de su sección al
                      100% — es lo que hace legible el bloque de un vistazo. */}
                  <EliteText style={[s.sectionTitle, { color: APP_SECTION_COLORS[g.section] }]}>
                    {g.label.toUpperCase()}
                  </EliteText>
                  <View style={s.grid}>{g.apps.map(renderTile)}</View>
                </View>
              ))
            ) : (
              <View style={[s.grid, s.gridFlat]}>{listed.map(renderTile)}</View>
            )}
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </TabScreen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  header: { paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  eyebrow: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, color: TEXT.primary, letterSpacing: 2, marginTop: 2 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Input = pozo recedido frente a la card elevada (design system §1).
    backgroundColor: '#0a0a0a',
    borderWidth: 0.5,
    borderColor: ELEVATION[1].border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    marginTop: Spacing.md,
  },
  searchInput: {
    flex: 1,
    color: TEXT.primary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    padding: 0,
  },

  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md },
  chip: {
    height: PILL.height,
    paddingHorizontal: PILL.paddingHorizontal,
    borderRadius: PILL.borderRadius,
    borderWidth: PILL.borderWidth,
    backgroundColor: PILL.bg,
    borderColor: PILL.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: PILL.activeBg, borderColor: PILL.activeBorderColor },
  chipText: {
    fontSize: PILL.fontSize,
    fontFamily: Fonts.bold,
    letterSpacing: PILL.letterSpacing,
    color: PILL.textColor,
  },
  chipTextActive: { color: PILL.activeTextColor },
  editOrder: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', paddingHorizontal: 6 },
  editOrderText: { fontSize: 10, fontFamily: Fonts.bold, color: ATP_BRAND.lime, letterSpacing: 1.5 },

  sectionTitle: {
    color: TEXT.tertiary,
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridFlat: { marginTop: Spacing.md },
  tileSlot: { width: '25%' },

  emptySearch: { width: '100%', paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyText: { color: TEXT.tertiary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },

  agregarBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(168,224,42,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.3)',
    borderRadius: 12,
    padding: 12,
  },
  agregarText: {
    flex: 1,
    color: TEXT.primary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    lineHeight: 16,
  },
});
