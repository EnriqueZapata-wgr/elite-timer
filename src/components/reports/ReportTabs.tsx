/**
 * ReportTabs (OLA1 R-4) — las pestañas de un dominio que absorbió varias
 * pantallas, y el enganche con el deep link.
 *
 * Existe porque tres dominios (emociones, ciclo, nback) fusionaron pantallas y
 * cada uno iba a dibujar su propia fila de pestañas. Tres filas distintas para
 * la misma idea acaban viéndose distinto.
 *
 * El parámetro de la ruta manda la primera vez y nada más: después el usuario
 * cambia de pestaña y el enlace ya no le impone nada.
 */
import { useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export interface ReportTabDef<K extends string> {
  key: K;
  label: string;
}

/**
 * La pestaña inicial sale de ?tab= (o de ?section=, que es como quedó escrito
 * el redirect del perfil emocional en el anexo). Un valor que no existe se
 * ignora: el enlace roto no deja la pantalla en blanco.
 */
export function useReportTab<K extends string>(
  tabs: readonly ReportTabDef<K>[],
  fallback: K,
): [K, (k: K) => void] {
  const { tab, section } = useLocalSearchParams<{ tab?: string; section?: string }>();
  const [value, setValue] = useState<K>(() => {
    const raw = (tab ?? section ?? '').toLowerCase();
    const hit = tabs.find((t) => t.key.toLowerCase() === raw);
    return hit ? hit.key : fallback;
  });
  return [value, setValue];
}

export function ReportTabs<K extends string>({ tabs, active, onSelect, accent }: {
  tabs: readonly ReportTabDef<K>[];
  active: K;
  onSelect: (k: K) => void;
  accent: string;
}): ReactNode {
  const t = useSurfaceTokens();
  return (
    <View style={s.row}>
      {tabs.map((x) => {
        const on = x.key === active;
        return (
          <AnimatedPressable key={x.key} onPress={() => { haptic.light(); onSelect(x.key); }}>
            <View
              style={[
                s.tab,
                { backgroundColor: t.hundido, borderColor: t.borde },
                on && { backgroundColor: withOpacity(accent, 0.16), borderColor: accent },
              ]}
            >
              <EliteText style={[s.text, { color: on ? accent : t.textoSecundario }]}>{x.label}</EliteText>
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md, flexWrap: 'wrap' },
  tab: {
    paddingHorizontal: Spacing.md, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', borderWidth: 0.5,
  },
  text: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, letterSpacing: 1.5 },
});
