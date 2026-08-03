/**
 * PuertaScreen — lo que hay detrás de una puerta de SALUD.
 *
 * Es una lista, no un mosaico de cards editoriales: el momento con foto ya
 * ocurrió en el hub, y aquí el usuario viene a elegir rápido. Iconografía y
 * texto (doctrina: si te lleva a un lugar puede llevar foto; si te pide hacer
 * algo o te muestra un dato, no).
 *
 * Las tres puertas nuevas usan este mismo componente. Su contenido sale de
 * salud-puertas.ts, que es donde se verifica que nada se quedó fuera.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { visibleDestinos, type Destino } from '@/src/constants/salud-puertas';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT, ELEVATION } from '@/src/constants/brand';
import { haptic } from '@/src/utils/haptics';

interface Props {
  title: string;
  intro: string;
  destinos: Destino[];
}

export function PuertaScreen({ title, intro, destinos }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [isFemale, setIsFemale] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('client_profiles').select('biological_sex').eq('user_id', user.id).maybeSingle();
        if (alive) setIsFemale((data as any)?.biological_sex === 'female');
      } catch { /* sin perfil: el ciclo queda fuera */ }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const rows = visibleDestinos(destinos, isFemale);

  return (
    <Screen>
      <StatusBar style="light" />
      <PillarHeader pillar="health" title={title} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <EliteText style={s.intro}>{intro}</EliteText>

        {rows.map((d, i) => (
          <Animated.View key={d.key} entering={FadeInUp.delay(50 + i * 40).springify()}>
            <AnimatedPressable
              style={s.row}
              onPress={() => { haptic.medium(); router.push(d.route); }}
            >
              <View style={[s.icon, { backgroundColor: d.color + '1A' }]}>
                {/* MB-19.2: misma función = mismo dibujo que en la sala ATP. */}
                <AppIcon name={d.icon} size={20} color={d.color} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={s.title}>{d.title}</EliteText>
                <EliteText style={s.sub}>{d.subtitle}</EliteText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={TEXT.muted} />
            </AnimatedPressable>
          </Animated.View>
        ))}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  intro: {
    color: TEXT.secondary, fontFamily: Fonts.regular, fontSize: FontSizes.sm,
    lineHeight: 20, marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: ELEVATION[1].bg,
    borderWidth: 0.5, borderColor: ELEVATION[1].border,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8,
  },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { color: TEXT.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  sub: { color: TEXT.tertiary, fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 2 },
});
