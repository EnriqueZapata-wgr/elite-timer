/**
 * QuizQuestion — Renderer de una pregunta de quiz con animacion de transicion.
 * Soporta single_select y multi_select.
 */
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp, SlideInRight } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { OptionCard } from './OptionCard';
import type { OnboardingQuestion, Answer } from '@/src/types/onboarding';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';

interface Props {
  question: OnboardingQuestion;
  answer: Answer | undefined;
  onAnswer: (answer: Answer) => void;
  animKey: number;
}

export function QuizQuestion({ question, answer, onAnswer, animKey }: Props) {
  const isMulti = question.type === 'multi_select';
  const selectedSet = new Set(
    isMulti ? (answer as string[] ?? []) : answer ? [answer as string] : []
  );

  function handleOptionPress(optionId: string) {
    if (isMulti) {
      const current = new Set(answer as string[] ?? []);
      if (current.has(optionId)) current.delete(optionId);
      else current.add(optionId);
      onAnswer([...current]);
    } else {
      onAnswer(optionId);
    }
  }

  return (
    <Animated.View key={animKey} entering={SlideInRight.duration(250).springify()}>
      <EliteText style={styles.questionText}>{question.text}</EliteText>
      {question.subtitle && (
        <EliteText style={styles.subtitle}>{question.subtitle}</EliteText>
      )}

      <View style={styles.optionsWrap}>
        {question.options.map((opt, idx) => (
          <Animated.View key={opt.id} entering={FadeInUp.delay(80 + idx * 50).springify()}>
            <OptionCard
              text={opt.text}
              icon={opt.icon}
              selected={selectedSet.has(opt.id)}
              multi={isMulti}
              onPress={() => handleOptionPress(opt.id)}
            />
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  questionText: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#fff',
    lineHeight: 28,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#666',
    marginBottom: Spacing.md,
  },
  optionsWrap: {
    marginTop: Spacing.md,
  },
});
