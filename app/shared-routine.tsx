/**
 * Redirect legacy (Ola 2 Fitness PR3, ANEXO_B_FITNESS §5).
 * El preview de rutina compartida es el sheet ?share=CODE de /my-routines
 * (getShareInfo, cloneFromShare y estados de error intactos). Los links
 * compartidos viejos (?code=X) siguen entrando por aquí.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function SharedRoutineRedirect() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return (
    <Redirect
      href={code
        ? { pathname: '/my-routines', params: { share: code } }
        : '/my-routines'}
    />
  );
}
