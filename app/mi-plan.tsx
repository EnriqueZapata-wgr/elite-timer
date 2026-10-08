/**
 * Mi plan: qué te toca cada día de la semana y qué tanto se puede reprogramar.
 * Lo tuyo lo mueves, lo que fijó tu coach se pausa o se platica, y ARGOS propone ajustes que tú aceptas.
 *
 * 7-oct-2026 (Mi plan). Ruta delgada: la pantalla vive en
 * src/screens/plan/MiPlanScreen.tsx y su regla en mi-plan-core (con test).
 * Se llega desde la tarjeta MI PLAN de HOY y desde MI PROGRAMA.
 *
 * OJO con las dos primeras líneas: el generador de rutas las cosecha y ARGOS
 * las usa para explicar la pantalla Y para puntuar a dónde llevar. Por eso no
 * nombran las secciones (entrenamiento, suplementos, alimentación, sueño):
 * con esas palabras aquí, "plan de entrenamiento" dejaba de resolver a su
 * editor y ARGOS empezaba a preguntar (medido el 7-oct con el resolvedor).
 */
import { MiPlanScreen } from '@/src/screens/plan/MiPlanScreen';

export default function MiPlanRoute() {
  return <MiPlanScreen />;
}
