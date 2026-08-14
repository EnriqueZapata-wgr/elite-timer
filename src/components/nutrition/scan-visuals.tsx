/**
 * OLA3 · Los visuales que comparten los escaneos con IA.
 *
 * Vivían dentro de food-scan. Al partirse esa pantalla en el sensor FOTO de
 * /food-log y la hoja de captura de /supplements, el anillo de score y el
 * semáforo de tags quedaron sin dueño: aquí tienen uno solo, para que las dos
 * lecturas del mismo JSON se vean igual y no vuelvan a divergir.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedProps, withDelay, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, SEMANTIC, ATP_BRAND } from '@/src/constants/brand';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const POSITIVE_TAGS = [
  'sin_azucar', 'sin azucar', 'ingredientes_naturales', 'ingredientes naturales',
  'conserva_tradicional', 'conserva tradicional', 'alta_proteina', 'alta proteina',
  'grasas_saludables', 'grasas saludables', 'alto_omega3', 'alto omega3',
  'sin_aditivos', 'sin aditivos', 'organico', 'orgánico', 'sin_conservadores',
  'sin conservadores', 'fibra', 'alta_fibra', 'anti_inflamatorio', 'antiinflamatorio',
  'sin_gluten', 'sin gluten', 'fermentado', 'probiotico', 'prebiotico',
  'bajo_indice_glucemico', 'sin_procesados', 'alimento_real', 'buena_biodisponibilidad',
  'formas_optimas', 'dosis_terapeutica', 'sin_excipientes_daninos', 'capsula_vegetal',
  'clean_label', 'sin_colorantes', 'sin_saborizantes_artificiales', 'bajo_azucar',
  'bajo_sodio', 'rico_en_fibra', 'vitaminas', 'minerales', 'antioxidantes',
];

const NEGATIVE_TAGS = [
  'ultra_procesado', 'ultraprocesado', 'azucar_alta', 'alto_azucar',
  'colorantes_artificiales', 'exceso_sodio', 'grasas_trans', 'aceite_industrial',
  'glutamato', 'aspartame', 'excipientes_cuestionables', 'subdosificado',
  'formas_pobres', 'dioxido_titanio', 'bht', 'bha', 'tartrazina',
  'jarabe_maiz', 'aceite_palma_hidrogenado', 'alto_en_azucar',
];

const CAUTION_TAGS = [
  'sodio_moderado', 'azucar_moderada', 'procesado_minimo',
  'contiene_soya', 'contiene_lacteos', 'cafeina', 'excipientes_aceptables',
];

/** Semáforo verde/amarillo/rojo de los tags que devuelve la IA. */
export function getTagColor(tag: string): { bg: string; text: string } {
  const n = tag.toLowerCase().trim().replace(/\s+/g, '_');
  if (POSITIVE_TAGS.some(p => n.includes(p) || p.includes(n)))
    return { bg: 'rgba(168,224,42,0.15)', text: ATP_BRAND.lime };
  if (NEGATIVE_TAGS.some(p => n.includes(p) || p.includes(n)))
    return { bg: 'rgba(226,75,74,0.15)', text: SEMANTIC.error };
  if (CAUTION_TAGS.some(p => n.includes(p) || p.includes(n)))
    return { bg: 'rgba(239,159,39,0.15)', text: SEMANTIC.warning };
  // Inferencia heurística
  if (n.startsWith('sin_') || n.startsWith('sin ') || n.includes('natural') || n.includes('limpio') || n.includes('buena') || n.includes('optim') || n.includes('puro'))
    return { bg: 'rgba(168,224,42,0.15)', text: ATP_BRAND.lime };
  if (n.includes('exceso') || n.includes('artificial') || n.includes('procesado') || n.includes('riesgo'))
    return { bg: 'rgba(226,75,74,0.15)', text: SEMANTIC.error };
  // Neutral
  return { bg: 'rgba(255,255,255,0.06)', text: TEXT_COLORS.secondary };
}

export function scoreToColor(s: number): string {
  if (s >= 90) return ATP_BRAND.lime;
  if (s >= 70) return ATP_BRAND.green1;
  if (s >= 50) return SEMANTIC.acceptable;
  if (s >= 30) return SEMANTIC.warning;
  return SEMANTIC.error;
}

/** Anillo de score animado con spring + contador con ease-out cúbico. */
export function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const sw = 8;
  const radius = (size - sw) / 2;
  const circ = 2 * Math.PI * radius;
  const color = scoreToColor(score);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(300, withSpring(score / 100, { damping: 14, stiffness: 55 }));
  }, [score]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progress.value),
  }));

  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const dur = 1200;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const tt = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - tt, 3);
      setDisplay(Math.round(eased * score));
      if (tt < 1) frame = requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, 400);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [score]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius}
          stroke={SURFACES.cardLight} strokeWidth={sw} fill="transparent" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={sw} fill="transparent"
          strokeDasharray={`${circ}`} animatedProps={ringProps}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <EliteText style={{ fontSize: FontSizes.mega, fontFamily: Fonts.extraBold, color, includeFontPadding: false }}>
        {display}
      </EliteText>
    </View>
  );
}
