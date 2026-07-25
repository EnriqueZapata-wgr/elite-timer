/**
 * N-Back — Saber más (artículo in-app).
 *
 * Contenido: R and D/ARTICULO_NBACK_SABER_MAS.md — voz ATP directa y
 * desmitificadora. Nota de estilo del artículo: NO promete aumentar el CI ni
 * "hacerte más inteligente"; describe el entrenamiento y lo que la evidencia
 * sostiene. Mantener así en cualquier edición.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StickyPillarBanner } from '@/src/components/layout/StickyPillarBanner';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, ELEVATION, TEXT } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

interface Section {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Párrafo de cierre después de los bullets. */
  outro?: string[];
}

const SECTIONS: Section[] = [
  {
    title: 'Qué es, en una frase',
    paragraphs: [
      'El N-Back es un ejercicio para entrenar tu memoria de trabajo: esa "RAM mental" que sostiene información viva mientras la usas — el número que retienes mientras haces una cuenta, el hilo de una conversación mientras piensas tu respuesta, los tres pendientes que malabareas antes de anotarlos.',
      'En el dual N-Back entrenas dos flujos a la vez: una posición que aparece en la cuadrícula y una letra que escuchas. Tu trabajo es marcar cuándo el estímulo de ahora coincide con el de N turnos atrás. En N=2 comparas con hace dos turnos; en N=3, con hace tres. Suena simple. No lo es — y ahí está el entrenamiento.',
    ],
  },
  {
    title: 'De dónde viene',
    paragraphs: [
      'La tarea N-back la propuso Wayne Kirchner en 1958 para estudiar la memoria a corto plazo. Vivió medio siglo en los laboratorios hasta que, en 2008, un estudio de Jaeggi y colegas en PNAS la volvió famosa: reportaron que entrenar la memoria de trabajo con dual N-back mejoraba la inteligencia fluida (la capacidad de razonar y resolver problemas nuevos), y —lo más llamativo— que a más días de entrenamiento, mayor la mejora. Eso sacudió una creencia vieja: que la inteligencia fluida era casi fija.',
    ],
  },
  {
    title: 'Lo que la evidencia dice de verdad (sin marketing)',
    paragraphs: [
      'Aquí somos honestos, porque es lo que nos separa: la ciencia del N-back es real, y también es matizada.',
    ],
    bullets: [
      'Lo que sí está sólido (transferencia cercana): el N-back mejora tu memoria de trabajo — la tarea entrenada y medidas relacionadas de memoria de trabajo. Esto se repite en los estudios. Un meta-análisis de Soveri y colegas (2017) que juntó decenas de estudios de N-back lo confirma: hay ganancias fiables en memoria de trabajo.',
      'Lo que está en debate (transferencia lejana): ¿ese entrenamiento te vuelve "más inteligente" en general? Ahí los científicos no se ponen de acuerdo. El meta-análisis de Au y colegas (2015) encontró un efecto pequeño pero real sobre la inteligencia fluida (~un cuarto de desviación estándar). Pero Redick (2013) y Melby-Lervåg, Redick y Hulme (2016) —revisando 87 publicaciones— concluyeron que, cuando se usan buenos grupos de control, esa transferencia a la inteligencia general no es convincente.',
    ],
    outro: [
      'Traducción: entrenas de verdad tu memoria de trabajo. Que eso se derrame a "ser más inteligente" es posible pero incierto. Por eso en ATP te prometemos el entrenamiento, no el milagro.',
    ],
  },
  {
    title: 'Nuestra postura',
    paragraphs: [
      'Piénsalo como el gimnasio. Nadie discute que las sentadillas fortalecen tus piernas; lo que se debate es cuánto eso te hace mejor corriendo un maratón. Con el N-back pasa igual: fortalece un músculo cognitivo real. Y una memoria de trabajo más fuerte importa para cosas que sí sientes en el día: sostener el foco, no perder el hilo, resistir la distracción, aprender más rápido.',
      'Además hay un beneficio que ningún meta-análisis mide y tú sí vas a notar: la disciplina de sentarte a concentrarte, todos los días, con dificultad creciente. Eso entrena algo más que la memoria.',
      'Así que sé optimista y sé realista al mismo tiempo. Vas a mejorar en la tarea. Vas a fortalecer tu memoria de trabajo. Lo demás, tómalo como un posible extra, no como una promesa.',
    ],
  },
  {
    title: 'Cómo sacarle el máximo',
    bullets: [
      'Consistencia sobre intensidad. Los estudios que vieron efectos entrenaron varios días seguidos. El reto de 20 días existe por eso.',
      'Deja que suba el nivel. El N-back solo entrena si te cuesta. Si te sientes cómodo, no estás entrenando. Sube de N.',
      'Usa audífonos. El canal auditivo es la mitad del ejercicio; necesitas oír las letras con precisión.',
      'Falla sin drama. Equivocarte es parte del proceso — es la señal de que estás en tu límite, que es justo donde se entrena.',
    ],
  },
];

const SOURCES = [
  'Kirchner, W. K. (1958). Age differences in short-term retention of rapidly changing information. Journal of Experimental Psychology, 55(4), 352-358.',
  'Jaeggi, S. M., Buschkuehl, M., Jonides, J., & Perrig, W. J. (2008). Improving fluid intelligence with training on working memory. PNAS, 105(19), 6829-6833.',
  'Au, J., Sheehan, E., Tsai, N., Duncan, G. J., Buschkuehl, M., & Jaeggi, S. M. (2015). Improving fluid intelligence with training on working memory: a meta-analysis. Psychonomic Bulletin & Review, 22(2), 366-377.',
  'Redick, T. S., et al. (2013). No evidence of intelligence improvement after working memory training: A randomized, placebo-controlled study. Journal of Experimental Psychology: General, 142(2), 359-379.',
  'Melby-Lervåg, M., Redick, T. S., & Hulme, C. (2016). Working Memory Training Does Not Improve Performance on Measures of Intelligence or Other Measures of "Far Transfer". Perspectives on Psychological Science, 11(4), 512-534.',
  'Soveri, A., Antfolk, J., Karlsson, L., Salo, B., & Laine, M. (2017). Working memory training revisited: A multi-level meta-analysis of n-back training studies. Psychonomic Bulletin & Review, 24(4), 1077-1096.',
];

export default function NBackSaberMasScreen() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <StickyPillarBanner scrolled={scrolled} onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 24)}
        scrollEventThrottle={16}
        contentContainerStyle={s.scroll}
      >
        <View style={s.header}>
          <EliteText style={s.kicker}>N-BACK · LA CIENCIA</EliteText>
          <EliteText style={s.title}>Saber más</EliteText>
          <EliteText style={s.subtitle}>
            Qué entrena el N-Back, de dónde viene y qué dice la evidencia — sin
            marketing.
          </EliteText>
        </View>

        <View style={s.body}>
          {SECTIONS.map(section => (
            <View key={section.title} style={s.section}>
              <EliteText style={s.sectionTitle}>{section.title}</EliteText>
              {section.paragraphs?.map((p, i) => (
                <EliteText key={i} style={s.paragraph}>{p}</EliteText>
              ))}
              {section.bullets?.map((b, i) => (
                <View key={i} style={s.bulletRow}>
                  <View style={s.bulletDot} />
                  <EliteText style={s.bulletText}>{b}</EliteText>
                </View>
              ))}
              {section.outro?.map((p, i) => (
                <EliteText key={i} style={s.paragraph}>{p}</EliteText>
              ))}
            </View>
          ))}

          <View style={s.sourcesCard}>
            <EliteText style={s.sourcesTitle}>FUENTES</EliteText>
            {SOURCES.map((src, i) => (
              <EliteText key={i} style={s.sourceText}>{src}</EliteText>
            ))}
          </View>

          <AnimatedPressable
            style={s.trainBtn}
            onPress={() => { haptic.medium(); router.back(); }}
          >
            <LinearGradient colors={ATP_BRAND.moleculeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.trainBtnInner}>
              <Ionicons name="arrow-back" size={16} color="#000" />
              <EliteText style={s.trainText}>VOLVER A ENTRENAR</EliteText>
            </LinearGradient>
          </AnimatedPressable>

          <View style={{ height: Spacing.xxl }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingBottom: Spacing.xxl },
  header: { paddingTop: 108, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  kicker: { color: '#7F77DD', fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3 },
  title: { color: '#fff', fontSize: 30, fontFamily: Fonts.extraBold, letterSpacing: 1, marginTop: 2 },
  subtitle: { color: TEXT.secondary, fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 8, lineHeight: 20 },
  body: { paddingHorizontal: Spacing.md },

  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    color: '#fff', fontSize: FontSizes.lg, fontFamily: Fonts.extraBold,
    letterSpacing: 0.5, marginBottom: Spacing.xs,
  },
  paragraph: {
    color: TEXT.secondary, fontSize: FontSizes.md, fontFamily: Fonts.regular,
    lineHeight: 23, marginTop: Spacing.xs,
  },
  bulletRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  bulletDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: ATP_BRAND.lime,
    marginTop: 8,
  },
  bulletText: {
    flex: 1, color: TEXT.secondary, fontSize: FontSizes.md, fontFamily: Fonts.regular,
    lineHeight: 23,
  },

  sourcesCard: {
    backgroundColor: ELEVATION[1].bg, borderColor: ELEVATION[1].border, borderWidth: 0.5,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md,
  },
  sourcesTitle: {
    color: TEXT.tertiary, fontSize: 11, fontFamily: Fonts.bold,
    letterSpacing: 2, marginBottom: Spacing.xs,
  },
  sourceText: {
    color: TEXT.tertiary, fontSize: FontSizes.xs, fontFamily: Fonts.regular,
    lineHeight: 17, marginTop: 6,
  },

  // V1.5.2 (#1): CTA en gradiente molécula (fuera lime plano full-width)
  trainBtn: { borderRadius: Radius.pill, overflow: 'hidden' },
  trainBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13,
  },
  trainText: { color: '#000', fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 2 },
});
