/**
 * BreakFastGuide — cierre guiado del ayuno (MB-8 · Track D.2).
 *
 * Doctrina ATP: el ayuno se rompe con PROTEÍNA PRIMERO. Antes el cierre era
 * un Alert genérico y `fasting_logs.broke_fast_with` jamás se escribía.
 * Este sheet celebra el ayuno, guía la primera comida y registra con qué
 * se rompió. Todo es opcional — guiado, no prisionero.
 */
import { useState } from 'react';
import { View, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ELEVATION, CATEGORY_COLORS, withOpacity } from '@/src/constants/brand';

const BLUE = CATEGORY_COLORS.nutrition;

/** Opciones de primera comida — proteína primero (alimento, no suplemento). */
const PROTEIN_OPTIONS = ['Huevos', 'Carne o pescado', 'Caldo de huesos', 'Yogurt natural', 'Otra proteína'];

interface Props {
  visible: boolean;
  /** Duración lograda en horas (ya validada por el caller). */
  hours: number;
  /** Fase fisiológica alcanzada (etiqueta ya resuelta). */
  zoneLabel: string;
  /** Se llama al elegir con qué rompió (persistencia a cargo del caller). */
  onRecord: (brokeWith: string) => void;
  /** CTA: registrar la comida con la que rompe. */
  onRegisterMeal: () => void;
  onClose: () => void;
}

export function BreakFastGuide({ visible, hours, zoneLabel, onRecord, onRegisterMeal, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const pick = (opt: string) => {
    haptic.light();
    setSelected(opt);
    onRecord(opt);
  };

  const close = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          {/* Celebración */}
          <View style={s.badge}>
            <Ionicons name="checkmark" size={22} color="#000" />
          </View>
          <EliteText style={s.title}>
            Ayuno de {Math.round(hours * 10) / 10} h completado
          </EliteText>
          <EliteText style={s.zone}>Alcanzaste: {zoneLabel}</EliteText>

          {/* Doctrina: proteína primero */}
          <View style={s.doctrineCard}>
            <EliteText style={s.doctrineTitle}>RÓMPELO CON PROTEÍNA PRIMERO</EliteText>
            <EliteText style={s.doctrineText}>
              Después de horas sin comer, tu cuerpo absorbe con más fuerza. La
              proteína estabiliza la glucosa y le da material de reparación; un
              carbohidrato solo la dispara.
            </EliteText>
          </View>

          <EliteText style={s.question}>¿Con qué vas a romper?</EliteText>
          <View style={s.chips}>
            {PROTEIN_OPTIONS.map((opt) => {
              const active = selected === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => pick(opt)}
                  style={[s.chip, active && { backgroundColor: withOpacity(BLUE, 0.18), borderColor: BLUE }]}
                >
                  <EliteText style={[s.chipText, active && { color: BLUE, fontFamily: Fonts.bold }]}>
                    {opt}
                  </EliteText>
                </Pressable>
              );
            })}
          </View>

          <AnimatedPressable onPress={() => { haptic.medium(); onRegisterMeal(); }} style={s.cta}>
            <Ionicons name="restaurant-outline" size={18} color="#000" />
            <EliteText style={s.ctaText}>Registrar lo que comiste</EliteText>
          </AnimatedPressable>

          <Pressable onPress={close} style={s.skip} hitSlop={8}>
            <EliteText style={s.skipText}>Ahora no</EliteText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: ELEVATION[2].bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: ELEVATION[2].border,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  badge: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#A8E02A',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  title: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: '#fff', textAlign: 'center' },
  zone: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.55)', marginTop: 4 },
  doctrineCard: {
    backgroundColor: withOpacity(BLUE, 0.08),
    borderWidth: 1,
    borderColor: withOpacity(BLUE, 0.22),
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginTop: Spacing.md,
    alignSelf: 'stretch',
  },
  doctrineTitle: { fontSize: 11, fontFamily: Fonts.bold, color: BLUE, letterSpacing: 2 },
  doctrineText: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.75)',
    lineHeight: 19, marginTop: 6,
  },
  question: {
    fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.md, alignSelf: 'flex-start',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm, alignSelf: 'stretch' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill,
    backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  chipText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: 'rgba(255,255,255,0.65)' },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#A8E02A', borderRadius: Radius.md, paddingVertical: 15,
    alignSelf: 'stretch', marginTop: Spacing.lg,
  },
  ctaText: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: '#000' },
  skip: { paddingVertical: Spacing.sm, marginTop: 4 },
  skipText: { fontSize: FontSizes.md, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.4)' },
});

export default BreakFastGuide;
