/**
 * SaludHub — el contenido de SALUD. Lo montan dos rutas:
 *   · el tab SALUD (app/(tabs)/salud.tsx)
 *   · /health-hub, que se sigue empujando desde Ajustes y desde el HOY
 * Un solo componente para las dos: la pantalla no se duplica.
 *
 * Hero + CUATRO puertas. Nada más. Es presupuesto de espacio, no minimalismo:
 * el hub viejo tenía catorce cards y por eso nadie encontraba nada.
 *
 * El modo denso (ajustes › salud) cambia las puertas por la lista completa en
 * un scroll. Es la válvula que evita el desastre de Garmin, cuyo rediseño
 * curado fue rechazado por los veteranos porque les costaba más clics.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, DeviceEventEmitter } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EdadAtpHeroCard } from '@/src/components/edad-atp/EdadAtpHeroCard';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import {
  visiblePuertas, visibleDestinos, DESTINOS_TODOS, type Puerta,
} from '@/src/constants/salud-puertas';
import { loadModoDenso, SALUD_DENSO_EVENT } from '@/src/services/salud-denso-store';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT, ELEVATION } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';

/** Foto por puerta. Todas ya viven en assets: no se movió ni se borró ninguna. */
const PUERTA_IMAGES: Record<string, any> = {
  hoy: require('@/assets/images/health-hub/mi-salud.png'),
  datos: require('@/assets/images/salud-funcional/mis-datos.jpg'),
  evolucion: require('@/assets/images/health-hub/diagnostico.png'),
  expediente: require('@/assets/images/salud-funcional/mi-expediente.jpg'),
  ciclo: require('@/assets/images/cycle/ciclo-01.png'),
};

const PUERTA_ICON: Record<string, string> = {
  hoy: '🫀', datos: '📊', evolucion: '🧬', expediente: '🗂', ciclo: '🌙',
};

export function SaludHub() {
  const router = useRouter();
  const { user } = useAuth();
  const [isFemale, setIsFemale] = useState(false);
  const [denso, setDenso] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      const on = await loadModoDenso();
      if (alive) setDenso(on);
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle();
        if (alive) setIsFemale((data as any)?.biological_sex === 'female');
      } catch { /* sin perfil: el ciclo queda fuera */ }
    })();
    const sub = DeviceEventEmitter.addListener(SALUD_DENSO_EVENT, (on: boolean) => setDenso(!!on));
    return () => { alive = false; sub.remove(); };
  }, [user?.id]));

  const puertas = visiblePuertas(isFemale);
  const todos = visibleDestinos(DESTINOS_TODOS, isFemale);

  const go = (p: Puerta) => { haptic.medium(); router.push(p.route); };

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
                <Ionicons name="chevron-forward" size={16} color={TEXT.muted} />
              </AnimatedPressable>
            </Animated.View>
          ))}
          <EliteText style={s.densoHint}>
            Modo denso encendido. Se apaga en Ajustes › Salud y protocolo.
          </EliteText>
        </>
      ) : (
        puertas.map((p, i) => (
          <Animated.View key={p.key} entering={FadeInUp.delay(80 + i * 50).springify()}>
            <EditorialCard
              cardKey={`salud_${p.key}`}
              icon={PUERTA_ICON[p.key]}
              title={p.title}
              subtitle={p.subtitle}
              gradient={p.gradient}
              imageBn={PUERTA_IMAGES[p.key]}
              onTap={() => go(p)}
            />
          </Animated.View>
        ))
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  sectionTitle: {
    color: TEXT.tertiary, fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  densoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5, borderColor: ELEVATION[1].border,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8,
  },
  densoIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  densoTitle: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  densoSub: { color: TEXT.tertiary, fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 1 },
  densoHint: {
    color: TEXT.muted, fontFamily: Fonts.regular, fontSize: FontSizes.xs,
    marginTop: Spacing.md, textAlign: 'center',
  },
});
