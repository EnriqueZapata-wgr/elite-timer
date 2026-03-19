import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';

/** Placeholder — Se construirá en el commit de Timer Activo */
export default function ActiveTimerScreen() {
  return (
    <ScreenContainer>
      <EliteText variant="title">TIMER ACTIVO</EliteText>
      <EliteText variant="body" style={{ marginTop: 16 }}>Próximamente...</EliteText>
    </ScreenContainer>
  );
}
