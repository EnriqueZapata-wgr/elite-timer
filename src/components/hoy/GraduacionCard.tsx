/**
 * GraduacionCard (MB-26 Pieza 2) — la propuesta de graduación en HOY.
 *
 * La app PROPONE, el usuario acepta: quitarle a alguien un renglón sin
 * permiso es quitarle algo que ganó. Muestra UNA propuesta a la vez (la
 * primera no pospuesta); "Ahora no" la duerme 7 días en AsyncStorage.
 * Aceptar gradúa vía graduarHabito → 'electrons_changed' recompila y el
 * renglón sale solo. Nada se borra jamás desde aquí.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { ELECTRON_WEIGHTS, type ElectronSource } from '@/src/constants/electrons';
import { graduarHabito } from '@/src/services/hoy/graduacion-service';
import { GRADUACION } from '@/src/services/hoy/graduacion-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

const SNOOZE_PREFIX = '@atp/graduacion_snooze:';
const SNOOZE_DIAS = 7;

interface Props {
  userId?: string;
  propuestas: string[];
}

export function GraduacionCard({ userId, propuestas }: Props) {
  const t = useSurfaceTokens();
  const [visible, setVisible] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const key of propuestas) {
        const until = await AsyncStorage.getItem(SNOOZE_PREFIX + key).catch(() => null);
        if (until && new Date(until).getTime() > Date.now()) continue;
        if (alive) setVisible(key);
        return;
      }
      if (alive) setVisible(null);
    })();
    return () => { alive = false; };
  }, [propuestas]);

  if (!visible || !userId) return null;
  const cfg = ELECTRON_WEIGHTS[visible as ElectronSource];
  if (!cfg) return null;

  const graduar = async () => {
    if (busy) return;
    setBusy(true);
    haptic.medium();
    const { ok } = await graduarHabito(userId, visible);
    setBusy(false);
    if (ok) {
      haptic.success();
      setVisible(null); // el recompile (electrons_changed) quita el renglón
    }
  };

  const ahoraNo = () => {
    haptic.light();
    const until = new Date(Date.now() + SNOOZE_DIAS * 86400000).toISOString();
    AsyncStorage.setItem(SNOOZE_PREFIX + visible, until).catch(() => {});
    setVisible(null);
  };

  // MB-31B: superficies/texto del scope; en claro el lima no es texto — el
  // botón Graduar pasa a relleno lima sólido con negro (patrón Chip MB-31A).
  const dark = t.kind === 'dark';
  return (
    <Animated.View entering={FadeInUp.springify()} style={[s.card, { backgroundColor: t.card }]}>
      <View style={s.headerRow}>
        <View style={s.iconWrap}>
          <AppIcon name={cfg.icon as never} size={18} color={dark ? ATP_BRAND.lime : t.tealTexto} />
        </View>
        <EliteText style={[s.label, { color: dark ? ATP_BRAND.lime : t.tealTexto }]}>YA ES PARTE DE TI</EliteText>
      </View>
      <EliteText style={[s.body, { color: t.texto }]}>
        Llevas {GRADUACION.minimo} de los últimos {GRADUACION.dias} días con{' '}
        {cfg.name}. ¿Lo graduamos? Sale de tu lista, nada se borra y lo puedes
        traer de vuelta cuando quieras.
      </EliteText>
      <View style={s.btnRow}>
        <AnimatedPressable
          style={[s.btnPrimario, !dark && { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime }]}
          onPress={graduar}
          disabled={busy}
        >
          <EliteText style={[s.btnPrimarioText, !dark && { color: t.textoSobreLima }]}>Graduar</EliteText>
        </AnimatedPressable>
        <AnimatedPressable style={[s.btnQuiet, !dark && { borderColor: t.bordeMarcado }]} onPress={ahoraNo} disabled={busy}>
          <EliteText style={[s.btnQuietText, { color: t.textoSecundario }]}>Ahora no</EliteText>
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderColor: withOpacity(ATP_BRAND.lime, 0.35),
    borderRadius: 14,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginTop: 8,
  },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  btnPrimario: {
    flex: 1,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.14),
    borderWidth: 0.5,
    borderColor: withOpacity(ATP_BRAND.lime, 0.4),
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnPrimarioText: { color: ATP_BRAND.lime, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  btnQuiet: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: ELEVATION[2].border,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnQuietText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
