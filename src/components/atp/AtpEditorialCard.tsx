/**
 * AtpEditorialCard — el momento con foto de la sala ATP (MB-19 2.1).
 *
 * Un lanzador de puros iconos se siente frío, y la UI editorial es el activo
 * más fuerte de ATP. Arriba de la cuadrícula va UNA card grande con imagen de
 * fondo que invita a algo concreto del momento. Es una sola: ni carrusel ni
 * feed.
 *
 * Reutiliza el molde de EditorialCard y las fotos que ya viven en
 * assets/images/hoy-extra/tu-dia. No se agrega ni se mueve ningún asset:
 * primero UX, después UI.
 *
 * La foto la elige la hora (momento del día) y la variante cambia con el día,
 * nunca al azar: si rotara por render, la pantalla parpadearía distinta cada
 * vez que entras.
 */
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { APP_BY_KEY } from '@/src/constants/app-registry';
import type { EditorialPick, MomentKey } from '@/src/services/atp-room-core';
import { CONCEPT_COLORS } from '@/src/constants/concept-colors';

/** require() estático: Metro necesita la ruta literal. */
const MOMENT_IMAGES: Record<MomentKey, any[]> = {
  amanecer: [
    require('@/assets/images/hoy-extra/tu-dia/amanecer-01.png'),
    require('@/assets/images/hoy-extra/tu-dia/amanecer-02.png'),
    require('@/assets/images/hoy-extra/tu-dia/amanecer-03.jpg'),
  ],
  'medio-dia': [
    require('@/assets/images/hoy-extra/tu-dia/medio-dia-01.png'),
    require('@/assets/images/hoy-extra/tu-dia/medio-dia-02.png'),
    require('@/assets/images/hoy-extra/tu-dia/medio-dia-03.png'),
    require('@/assets/images/hoy-extra/tu-dia/medio-dia-04.jpg'),
  ],
  atardecer: [
    require('@/assets/images/hoy-extra/tu-dia/atardecer-01.png'),
    require('@/assets/images/hoy-extra/tu-dia/atardecer-02.png'),
    require('@/assets/images/hoy-extra/tu-dia/atardecer-03.png'),
    require('@/assets/images/hoy-extra/tu-dia/atardecer-04.jpg'),
  ],
  noche: [
    require('@/assets/images/hoy-extra/tu-dia/noche-01.png'),
    require('@/assets/images/hoy-extra/tu-dia/noche-02.png'),
    require('@/assets/images/hoy-extra/tu-dia/noche-03.png'),
    require('@/assets/images/hoy-extra/tu-dia/noche-04.jpg'),
  ],
};

/** Gradient de respaldo por momento (si la foto no cargara, la card sigue viva). */
const MOMENT_GRADIENT: Record<MomentKey, [string, string]> = {
  amanecer: CONCEPT_COLORS.sol.gradient,
  'medio-dia': CONCEPT_COLORS.nutricion.gradient,
  atardecer: CONCEPT_COLORS.fitness.gradient,
  noche: CONCEPT_COLORS.mente.gradient,
};

interface Props {
  pick: EditorialPick;
  onTap: () => void;
}

export function AtpEditorialCard({ pick, onTap }: Props) {
  const pool = MOMENT_IMAGES[pick.moment];
  const image = pool[pick.variant % pool.length];
  const app = APP_BY_KEY[pick.appKey];

  return (
    <EditorialCard
      cardKey={`atp_editorial_${pick.moment}`}
      size="hero"
      icon={pick.isComeback ? '↩' : '→'}
      title={pick.title.toUpperCase()}
      subtitle={pick.subtitle}
      ctaLabel={app ? `Abrir ${app.label}` : undefined}
      gradient={MOMENT_GRADIENT[pick.moment]}
      imageBn={image}
      onTap={onTap}
    />
  );
}
