/**
 * PuertasElite (20-sep-2026): el indice del producto que el cliente pago,
 * en HOY y a un toque. Cuatro puertas: Mi evaluacion, Mis suplementos, Mi
 * alimentacion y Mi entrenamiento. Hasta hoy la evaluacion estaba a tres
 * toques en Salud detras de un gate, y el plan de alimentacion y de
 * entrenamiento no tenian puerta desde ninguna parte.
 *
 * Se pinta SOLO cuando hay evaluacion cargada (misma lectura compartida que
 * el hero: leerEvaluacionEliteVigente). Sin evaluacion no hay indice que
 * mostrar y el hero ya dice que viene en camino. Sin candados, sin "Pro":
 * es lo suyo.
 *
 * Alimentacion y entrenamiento abren la evaluacion con `seccion` en los
 * params. Hoy la pantalla no lee ese parametro (es de otro bloque esta
 * noche); cuando lo lea, estas puertas ya llegan a la seccion correcta.
 *
 * Los numeros de la segunda linea salen del documento (detallePuertas, con
 * test); nunca se inventan.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import type { AppIconName } from '@/src/components/ui/app-icon-names';
import type { EliteV3 } from '@/src/services/elite/elite-v3-core';
import { detallePuertas, type PuertaEliteKey } from '@/src/services/hoy/elite-hoy-core';
import { EVALUACION_ELITE_CHANGED_EVENT, leerEvaluacionEliteVigente } from '@/src/services/hoy/elite-hoy-service';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

interface Props {
  userId?: string;
}

interface Puerta {
  key: PuertaEliteKey;
  titulo: string;
  icon: AppIconName;
  href: Href;
}

const PUERTAS: Puerta[] = [
  { key: 'evaluacion', titulo: 'Mi evaluación', icon: 'evaluaciones', href: '/salud/evaluacion-elite' },
  { key: 'suplementos', titulo: 'Mis suplementos', icon: 'suplementos', href: '/supplements' },
  { key: 'alimentacion', titulo: 'Mi alimentación', icon: 'comida', href: { pathname: '/salud/evaluacion-elite', params: { seccion: 'alimentacion' } } },
  { key: 'entrenamiento', titulo: 'Mi entrenamiento', icon: 'entrenar', href: { pathname: '/salud/evaluacion-elite', params: { seccion: 'entrenamiento' } } },
];

export function PuertasElite({ userId }: Props) {
  const t = useSurfaceTokens();
  const router = useRouter();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const [evaluacion, setEvaluacion] = useState<EliteV3 | null>(null);

  const cargar = useCallback(async () => {
    if (!userId) return;
    const r = await leerEvaluacionEliteVigente(userId);
    // Un fallo de lectura no borra el indice que ya se veia: el hero es quien
    // dice "no se pudo leer" y reintenta; aqui solo se pinta lo que hay.
    if (r.ok) setEvaluacion(r.evaluacion);
  }, [userId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  // 20-sep-2026 (A2): Reintentar/Actualizar del hero (o una version nueva)
  // cambian la evaluacion que HOY conoce; antes esta fila solo releia al
  // volver a la pestana. La relectura pega a la cache, ya caliente.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(EVALUACION_ELITE_CHANGED_EVENT, (p?: { userId?: string }) => {
      if (p?.userId && userId && p.userId !== userId) return;
      cargar();
    });
    return () => sub.remove();
  }, [cargar, userId]);

  if (!evaluacion) return null;
  const detalle = detallePuertas(evaluacion);

  return (
    <Animated.View entering={FadeInUp.delay(115).springify()} style={s.wrap}>
      <EliteText style={[s.label, { color: t.textoSecundario }]}>TU PROGRAMA</EliteText>
      <View style={s.grid}>
        {PUERTAS.map((p) => (
          <AnimatedPressable
            key={p.key}
            style={[s.tile, { backgroundColor: t.card, borderColor: dark ? withOpacity(ATP_BRAND.lime, 0.2) : t.bordeEditorial }]}
            onPress={() => { haptic.light(); router.push(p.href); }}
            accessibilityRole="button"
            accessibilityLabel={`${p.titulo}: ${detalle[p.key]}`}
          >
            <View style={[s.iconWrap, { backgroundColor: withOpacity(acento, 0.14) }]}>
              <AppIcon name={p.icon} size={18} color={acento} />
            </View>
            <EliteText style={[s.titulo, { color: t.texto }]} numberOfLines={1}>{p.titulo}</EliteText>
            <EliteText style={[s.detalle, { color: t.textoSecundario }]} numberOfLines={1}>{detalle[p.key]}</EliteText>
          </AnimatedPressable>
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  label: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    // Dos por fila: la mitad del ancho menos la mitad del gap.
    width: '48.5%',
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: 12,
    gap: 6,
  },
  iconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, marginTop: 2 },
  detalle: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },
});
