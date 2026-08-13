/**
 * Redirect legacy (Ola 2 Fitness PR3, ANEXO_B_FITNESS §5).
 * El registro retro de fuerza vive en /log-strength (adelgazado: sin
 * method-runners; saveWorkoutSession es el único escritor). Conserva el
 * deep link ?exerciseId=. Esta ruta queda solo para deep links y OTA viejos.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LogExerciseRedirect() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  return (
    <Redirect
      href={exerciseId
        ? { pathname: '/log-strength', params: { exerciseId } }
        : '/log-strength'}
    />
  );
}
