/**
 * Escaneo por foto — redirect (OLA3 · Anexo D §1).
 *
 * El sensor FOTO vive en /food-log. mode=label es hoy intent=etiqueta y mode=supplement se mudó a /supplements: la tabla user_supplements tiene un dueño.
 * El stub se queda porque hay deep links y accesos viejos apuntando aquí;
 * los params viajan al destino, no se pierde contexto.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function FoodScanRedirect() {
  const { mode, mealType } = useLocalSearchParams<{ mode?: string; mealType?: string }>();

  if (mode === 'supplement') {
    return <Redirect href={{ pathname: '/supplements', params: { capture: 'foto' } }} />;
  }

  return (
    <Redirect
      href={{
        pathname: '/food-log',
        params: {
          sensor: 'foto',
          ...(mode === 'label' ? { intent: 'etiqueta' } : {}),
          ...(mealType ? { mealType } : {}),
        },
      }}
    />
  );
}
