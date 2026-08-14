/**
 * SaludHub — el contenido de SALUD. Lo monta el tab (app/(tabs)/salud.tsx).
 *
 * OLA6 PIEZA A: las cuatro puertas dejaron de ser rutas. Antes el hub era un
 * hero y cuatro cards editoriales; detrás de tres de ellas había un archivo de
 * 19 líneas que solo pasaba una constante a una lista. Eso costaba un toque y
 * no mostraba ni un dato. Ahora las secciones abren aquí mismo: el hero, las
 * cuatro secciones y el ciclo con su gate.
 *
 * Qué colapsa y qué no: HOY, TU EVOLUCIÓN y MI EXPEDIENTE tienen lista propia
 * y colapsan. MIS DATOS y CICLO abren su pantalla, porque su destino ya es una
 * pantalla de datos y no un cascarón (doctrina de salud-puertas.ts: las hijas
 * de MIS DATOS viven DENTRO de esa pantalla, que ya es una lista densa).
 *
 * Cómo la deja cada quien se guarda en local (salud-secciones-store), y
 * `?seccion=X` abre una en concreto: es lo que usan las rutas viejas
 * /salud/hoy, /salud/evolucion y /salud/expediente, que ahora redirigen aquí.
 *
 * El modo denso (ajustes › salud) cambia las secciones por la lista completa en
 * un scroll. Es la válvula que evita el desastre de Garmin, cuyo rediseño
 * curado fue rechazado por los veteranos porque les costaba más clics.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, DeviceEventEmitter } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EdadAtpHeroCard } from '@/src/components/edad-atp/EdadAtpHeroCard';
import { SeccionColapsable } from '@/src/screens/salud/SeccionColapsable';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import {
  visiblePuertas, visibleDestinos, DESTINOS_TODOS, DESTINOS_POR_PUERTA,
} from '@/src/constants/salud-puertas';
import { canAccessCycle } from '@/src/services/cycle/cycle-access-core';
import { getCycleAppMode } from '@/src/services/app-mode-service';
import { loadModoDenso, SALUD_DENSO_EVENT } from '@/src/services/salud-denso-store';
import {
  loadSeccionesAbiertas, saveSeccionesAbiertas, SECCIONES_DEFAULT,
  type SeccionKey, type SeccionesAbiertas,
} from '@/src/services/salud/salud-secciones-store';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';

/** Las secciones que tienen lista propia. Las demás navegan. */
const CON_LISTA = new Set<SeccionKey>(['hoy', 'evolucion', 'expediente']);

export function SaludHub() {
  // MB-31B remate: es un CUERPO montado por el tab — lee el scope, no el tema
  // global: si la montura no declara themed, sigue oscuro (regla de tránsito).
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { user } = useAuth();
  const { seccion } = useLocalSearchParams<{ seccion?: string }>();
  const [isFemale, setIsFemale] = useState(false);
  const [denso, setDenso] = useState(false);
  const [abiertas, setAbiertas] = useState<SeccionesAbiertas>(SECCIONES_DEFAULT);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      const [on, secs] = await Promise.all([loadModoDenso(), loadSeccionesAbiertas()]);
      if (alive) { setDenso(on); setAbiertas(secs); }
      if (!user?.id) return;
      try {
        // MB-22 P4: SALUD es superficie del ciclo PROPIO. En modo acompañante
        // el ciclo de otra persona no entra aquí (vive en la app de Ciclo).
        const [{ data }, mode] = await Promise.all([
          supabase.from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle(),
          getCycleAppMode(user.id),
        ]);
        if (alive) setIsFemale(canAccessCycle((data as any)?.biological_sex, mode));
      } catch { /* sin perfil: el ciclo queda fuera */ }
    })();
    const sub = DeviceEventEmitter.addListener(SALUD_DENSO_EVENT, (on: boolean) => setDenso(!!on));
    return () => { alive = false; sub.remove(); };
  }, [user?.id]));

  // Las rutas viejas (/salud/hoy, /salud/evolucion, /salud/expediente) llegan
  // aquí con ?seccion=X: se abre esa, sin cerrar las demás.
  useEffect(() => {
    if (!seccion || !CON_LISTA.has(seccion as SeccionKey)) return;
    setAbiertas((prev) => {
      if (prev[seccion as SeccionKey]) return prev;
      const next = { ...prev, [seccion as SeccionKey]: true };
      void saveSeccionesAbiertas(next);
      return next;
    });
  }, [seccion]);

  const toggle = useCallback((key: SeccionKey) => {
    setAbiertas((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      void saveSeccionesAbiertas(next);
      return next;
    });
  }, []);

  const puertas = visiblePuertas(isFemale);
  const todos = visibleDestinos(DESTINOS_TODOS, isFemale);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      {/* Hero: la Edad ATP con su distancia a la cronológica. Es la respuesta
          resumida a "¿cómo estoy?", y por eso va arriba y sola. */}
      {user?.id && (
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <EdadAtpHeroCard userId={user.id} />
        </Animated.View>
      )}

      {denso ? (
        <>
          <EliteText style={s.sectionTitle}>TODO TU EXPEDIENTE</EliteText>
          {todos.map((d, i) => (
            <Animated.View key={d.key} entering={FadeInUp.delay(60 + Math.min(i, 12) * 24).springify()}>
              <AnimatedPressable
                style={s.densoRow}
                onPress={() => { haptic.light(); router.push(d.route); }}
              >
                <View style={[s.densoIcon, { backgroundColor: d.color + '1A' }]}>
                  {/* MB-19.2: misma función = mismo dibujo que en la sala ATP. */}
                  <AppIcon name={d.icon} size={18} color={d.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <EliteText style={s.densoTitle}>{d.title}</EliteText>
                  <EliteText style={s.densoSub} numberOfLines={1}>{d.subtitle}</EliteText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={t.textoTenue} />
              </AnimatedPressable>
            </Animated.View>
          ))}
          <EliteText style={s.densoHint}>
            Modo completo encendido. Se apaga en Ajustes › Salud y protocolo.
          </EliteText>
        </>
      ) : (
        puertas.map((p, i) => {
          const key = p.key as SeccionKey;
          const conLista = CON_LISTA.has(key);
          return (
            <Animated.View key={p.key} entering={FadeInUp.delay(80 + i * 40).springify()}>
              <SeccionColapsable
                icon={p.icon}
                title={p.title}
                subtitle={p.subtitle}
                acento={p.gradient[0]}
                destinos={conLista ? DESTINOS_POR_PUERTA[key as 'hoy' | 'evolucion' | 'expediente'] : undefined}
                route={conLista ? undefined : p.route}
                isFemale={isFemale}
                abierta={!!abiertas[key]}
                onToggle={() => toggle(key)}
              />
            </Animated.View>
          );
        })
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

// MB-31B remate: los estilos leen los tokens del scope. El tenue del oscuro
// (#555) baja a secundario en claro: 3.19 no alcanza para letra chica
// (mismo criterio que centro/[appKey]).
const tenue = (t: AppThemeTokens) => (t.kind === 'dark' ? t.textoTenue : t.textoSecundario);
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  sectionTitle: {
    color: tenue(t), fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  densoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.card,
    borderWidth: 0.5, borderColor: t.borde,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8,
  },
  densoIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  densoTitle: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  densoSub: { color: tenue(t), fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 1 },
  densoHint: {
    color: tenue(t), fontFamily: Fonts.regular, fontSize: FontSizes.xs,
    marginTop: Spacing.md, textAlign: 'center',
  },
});
