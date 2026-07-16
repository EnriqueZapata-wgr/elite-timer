/**
 * CommunityPresence — mini-badge de social proof "personas activas hoy".
 *
 * Se coloca en el header de cada pilar (HOY, Nutrición, Mente, Fitness). Lee el
 * conteo agregado de community_presence (mig 181) y aplica la regla HONESTA de
 * presenceDisplay: bajo el umbral muestra un placeholder neutro, nunca inventa
 * un número. Fail-soft: si no carga, muestra el placeholder.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { EliteText } from '@/components/elite-text';
import {
  getPresence,
  type PresencePillar,
} from '@/src/services/community/community-presence-service';
import { presenceDisplay, type PresenceDisplay } from '@/src/services/community/community-presence-core';
import { CATEGORY_COLORS, ATP_BRAND, withOpacity } from '@/src/constants/brand';

const PILLAR_TINT: Record<PresencePillar, string> = {
  hoy: ATP_BRAND.lime,
  nutrition: CATEGORY_COLORS.nutrition,
  mente: CATEGORY_COLORS.mind,
  fitness: CATEGORY_COLORS.fitness,
};

interface Props {
  pillar: PresencePillar;
}

export function CommunityPresence({ pillar }: Props) {
  const [display, setDisplay] = useState<PresenceDisplay>(() => presenceDisplay(0));

  useEffect(() => {
    let alive = true;
    getPresence(pillar)
      .then((count) => { if (alive) setDisplay(presenceDisplay(count)); })
      .catch(() => { /* fail-soft: queda el placeholder */ });
    return () => { alive = false; };
  }, [pillar]);

  // Sprint 2 D: bajo el umbral honesto NO se muestra nada — el placeholder
  // "En comunidad · verifica pronto" leía como copy roto en device. La regla
  // honesta se mantiene: el badge aparece solo con conteo real (≥ umbral).
  if (display.mode === 'placeholder') return null;

  const tint = PILLAR_TINT[pillar];

  return (
    <View
      style={[
        s.badge,
        { borderColor: withOpacity(tint, 0.3), backgroundColor: withOpacity(tint, 0.1) },
      ]}
      accessibilityLabel={display.text}
    >
      <View style={[s.dot, { backgroundColor: tint }]} />
      <EliteText style={[s.text, { color: tint }]} numberOfLines={1}>
        {display.text}
      </EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
});
