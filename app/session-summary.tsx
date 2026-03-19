import { ScreenContainer } from '@/components/screen-container';
import { EliteText } from '@/components/elite-text';

/** Placeholder — Se construirá en el commit de Resumen de Sesión */
export default function SessionSummaryScreen() {
  return (
    <ScreenContainer>
      <EliteText variant="title">RESUMEN</EliteText>
      <EliteText variant="body" style={{ marginTop: 16 }}>Próximamente...</EliteText>
    </ScreenContainer>
  );
}
