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
 *
 * MB-22: la cuadrícula lista SOLO lo instalado. Todo lo demás vive en el
 * Centro (/centro), que es donde se instala, se desinstala y se configura.
 * Las 17 apps que no usas no necesitan un distintivo: necesitan no estar.
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
import { getInstallPrefs, seedInitialApps, uninstallApp } from '@/src/services/hoy/install-service';
import { getCycleAppMode } from '@/src/services/app-mode-service';
import {
  appInstallState, gridApps, uninstallAlertBody, type InstallPrefs,
} from '@/src/services/hoy/install-core';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { APP_SECTION_COLORS, ATP_BRAND, PILL } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';

export default function SalaAtpScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-31B: pantalla migrada — superficies y texto del tema; los colores de
  // sección (encabezados, mosaicos) son identidad y quedan tal cual. El lima
  // como TEXTO solo existe en oscuro; en claro el acento de texto es el teal
  // calibrado (regla 1 del manual 3.6).
  const { kind, tokens } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : tokens.tealTexto;
  // El tenue del oscuro (#555) se queda; en claro sube a secundario para que
  // el texto informativo pequeño no caiga bajo AA (tenue 3.19 = solo grande).
  const tenueInformativo = kind === 'dark' ? tokens.textoTenue : tokens.textoSecundario;
  // MB-20: "+ agregar" en TAREAS llegaba aquí en modo instalación. MB-22:
  // instalar vive en el Centro — el deep link se respeta redirigiendo, la
  // pantalla de TAREAS no se toca.
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
  // MB-22 P4: con modo instalado (acompañante) el Ciclo también se ve, sea
  // quien sea — el modo viene de user_app_modes (fail-soft null = solo female).
  const [cycleModeSet, setCycleModeSet] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        const [{ data }, mode] = await Promise.all([
          supabase.from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle(),
          getCycleAppMode(user.id),
        ]);
        if (!alive) return;
        const female = (data as any)?.biological_sex === 'female';
        setIsFemale(female);
        setCycleModeSet(mode != null);
        // MB-22.1 P3: siembra one-shot del set inicial (Respirar + Ciclo para
        // usuarias). Si escribió, se releen prefs para pintar la cuadrícula.
        const seeded = await seedInitialApps(user.id, female);
        if (!alive) return;
        if (seeded) {
          setInstallPrefs(await getInstallPrefs(user.id));
          if (female && mode == null) setCycleModeSet(true);
        }
      } catch { /* sin perfil: el ciclo queda oculto */ }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const apps = useMemo(() => visibleApps(isFemale || cycleModeSet), [isFemale, cycleModeSet]);

  // MB-22: el deep link viejo de "+ agregar" aterriza donde hoy se instala.
  useEffect(() => {
    if (modoAgregar) router.replace('/centro');
  }, [modoAgregar, router]);

  // Al volver a la sala se relee todo: si acabas de editar tu orden, ya está.
  const refresh = useCallback(async () => {
    const [u, c, m] = await Promise.all([loadUsage(), loadCustomOrder(), loadOrderMode()]);
    setUsage(u);
    setCustom(c);
    setOrder(m);
    if (user?.id) setInstallPrefs(await getInstallPrefs(user.id));
  }, [user?.id]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // MB-22: la cuadrícula solo tiene instaladas → el tap largo es el atajo a
  // desinstalar. Instalar vive en el Centro (la ficha de cada app).
  const promptUninstall = useCallback((app: AppEntry) => {
    if (!user?.id || !installPrefs) return;
    const state = appInstallState(app.key, installPrefs);
    if (state === 'fija') {
      Alert.alert(app.label, 'Esta función es parte del núcleo: siempre está en tu cuadrícula.');
      return;
    }
    if (state !== 'instalada') return;
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
  }, [user?.id, installPrefs, refresh]);

  // MB-22 Pieza 1: la cuadrícula lista SOLO lo instalado y lo fijo.
  const instaladas = useMemo(() => gridApps(apps, installPrefs), [apps, installPrefs]);

  // La card se calcula con el reloj de ESTE render, no con un intervalo: la
  // pantalla se vuelve a montar cada vez que entras y eso basta. Invita solo
  // a lo instalado: el descubrimiento es asunto del Centro.
  useEffect(() => {
    const now = new Date();
    setEditorial(pickEditorial(instaladas, usage, now.getTime(), now.getHours()));
  }, [instaladas, usage]);

  const open = useCallback((app: AppEntry) => {
    recordOpen(app.key);
    router.push(app.route);
  }, [router]);

  const changeOrder = (next: AtpOrder) => {
    haptic.light();
    setOrder(next);
    saveOrderMode(next);
  };

  const searching = query.trim().length > 0;
  // El buscador busca SOLO entre las instaladas; si no aparece, se ofrece el
  // Centro — la forma natural de descubrir que existe algo más.
  const results = useMemo(() => searchApps(instaladas, query), [instaladas, query]);
  const listed = useMemo(
    () => orderedApps(instaladas, order, usage, reconcileOrder(custom, instaladas)),
    [instaladas, order, usage, custom]
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
        onLongPress={() => promptUninstall(app)}
      />
    </Animated.View>
  );

  return (
    <TabScreen themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInUp.delay(40).springify()} style={s.header}>
          <EliteText style={[s.eyebrow, { color: acento }]}>TUS FUNCIONES</EliteText>
          <EliteText style={[s.title, { color: tokens.texto }]}>ATP</EliteText>
        </Animated.View>

        {/* MB-22: la entrada al Centro, visible SIN scroll. Si alguien no la
            encuentra, no puede instalar nada y la app se le queda chica. */}
        <Animated.View entering={FadeInUp.delay(60).springify()}>
          <AnimatedPressable
            style={[s.centroCard, { backgroundColor: tokens.card, borderColor: tokens.borde }]}
            onPress={() => { haptic.light(); router.push('/centro'); }}
          >
            <View style={s.centroIcon}>
              <Ionicons name="apps-outline" size={18} color={acento} />
            </View>
            <View style={s.centroBody}>
              <EliteText style={[s.centroTitle, { color: tokens.texto }]}>Centro ATP</EliteText>
              <EliteText style={[s.centroSub, { color: tenueInformativo }]}>Todas las funciones: instala y configura</EliteText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={tokens.textoTenue} />
          </AnimatedPressable>
        </Animated.View>

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
        <Animated.View
          entering={FadeInUp.delay(120).springify()}
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

        {searching ? (
          <View style={s.grid}>
            {results.length > 0
              ? results.map(renderTile)
              : (
                <View style={s.emptySearch}>
                  <EliteText style={[s.emptyText, { color: tenueInformativo }]}>No está en tu cuadrícula</EliteText>
                  {/* En claro el lima no es texto: la píldora pasa a relleno
                      lima sólido con negro encima (patrón Chip de MB-31A). */}
                  <AnimatedPressable
                    style={[s.emptyCta, kind === 'light' && { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime }]}
                    onPress={() => {
                      haptic.light();
                      router.push({ pathname: '/centro', params: { q: query.trim() } });
                    }}
                  >
                    <Ionicons name="apps-outline" size={14} color={kind === 'dark' ? ATP_BRAND.lime : tokens.textoSobreLima} />
                    <EliteText style={[s.emptyCtaText, kind === 'light' && { color: tokens.textoSobreLima }]}>Buscarla en el Centro</EliteText>
                  </AnimatedPressable>
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
                  style={[
                    s.chip,
                    { backgroundColor: tokens.hundido, borderColor: tokens.borde },
                    order === o && s.chipActive,
                  ]}
                  onPress={() => changeOrder(o)}
                >
                  <EliteText
                    style={[
                      s.chipText,
                      { color: kind === 'dark' ? PILL.textColor : tokens.textoSecundario },
                      order === o && { color: tokens.textoSobreLima },
                    ]}
                  >
                    {ORDER_LABELS[o].toUpperCase()}
                  </EliteText>
                </AnimatedPressable>
              ))}
              {order === 'mio' && (
                <AnimatedPressable
                  style={s.editOrder}
                  onPress={() => { haptic.light(); router.push('/atp-orden'); }}
                >
                  <Ionicons name="options-outline" size={14} color={acento} />
                  <EliteText style={[s.editOrderText, { color: acento }]}>EDITAR</EliteText>
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

            {/* CIERRE-1: desinstalar existía solo como tap largo sobre el
                icono, y nada en pantalla lo decía. La puerta visible ya existe
                (Centro → ficha de la app → Desinstalar), así que aquí no hace
                falta ensuciar la cuadrícula con una X en cada tile: basta con
                nombrar las dos vías. Enunciar el gesto también lo enseña. */}
            <EliteText style={[s.gestoHint, { color: tenueInformativo }]}>
              Mantén presionado un icono para desinstalarlo, o hazlo desde su ficha en el Centro
            </EliteText>
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </TabScreen>
  );
}

// MB-31B: aquí queda SOLO layout; el color vivo entra inline desde los tokens
// del tema. Los tintes lima (centroIcon, emptyCta) son acento de marca y se
// quedan — en claro la píldora pasa a relleno sólido con negro (inline).
const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  header: { paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  eyebrow: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { fontSize: 28, fontFamily: Fonts.extraBold, letterSpacing: 2, marginTop: 2 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Input = pozo recedido frente a la card elevada (design system §1).
    borderWidth: 0.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    marginTop: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    padding: 0,
  },

  gestoHint: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },

  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md },
  chip: {
    height: PILL.height,
    paddingHorizontal: PILL.paddingHorizontal,
    borderRadius: PILL.borderRadius,
    borderWidth: PILL.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: PILL.activeBg, borderColor: PILL.activeBorderColor },
  chipText: {
    fontSize: PILL.fontSize,
    fontFamily: Fonts.bold,
    letterSpacing: PILL.letterSpacing,
  },
  editOrder: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', paddingHorizontal: 6 },
  editOrderText: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 1.5 },

  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridFlat: { marginTop: Spacing.md },
  tileSlot: { width: '25%' },

  emptySearch: { width: '100%', paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  emptyText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(168,224,42,0.10)',
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.3)',
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 34,
  },
  emptyCtaText: { color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 0.5 },

  centroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  centroIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(168,224,42,0.10)',
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centroBody: { flex: 1 },
  centroTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  centroSub: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 1 },
});
