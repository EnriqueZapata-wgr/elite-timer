/**
 * Redirect legacy (Ola 2 Fitness PR3, ANEXO_B_FITNESS §5): execution murió.
 * Su interfaz completa vive como TimerModeRunner dentro de /session, que
 * arbitra por contenido (routineUsesClipRunner): matriz corre con clip,
 * puro tiempo corre el timer. ?routine= se conserva; sin rutina se cae a
 * la puerta del pilar. Los testId de desarrollo (tabata/guinness) no
 * tenían empujadores y no se conservan.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ExecutionRedirect() {
  const { routine } = useLocalSearchParams<{ routine?: string }>();
  return (
    <Redirect
      href={routine
        ? { pathname: '/session', params: { routine } }
        : '/fitness-hub'}
    />
  );
}
