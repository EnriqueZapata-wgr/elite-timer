/**
 * YoEditorialSection (#8 Batch 2) — YO deja de ser menú muerto: espejo de
 * identidad + estado + progreso. Regla de oro: cada card muestra un DATO tuyo en
 * su superficie ANTES de ser un link; si no puede, no gana su lugar en YO.
 *
 * Rediseño (antes 5 cards, 4 → /reports):
 *  1. DISCIPLINA ATP (hero de estado): momentum semanal + etiqueta no punitiva → /reports?period=week
 *  2. CRONOTIPO: tu tipo si ya lo tienes → /my-chronotype (vista de TU cronotipo);
 *     sin cronotipo → test. Distinguir los dos estados es la clave.
 *  3. PROGRESIÓN: tu rank tier real (Explorer→Inmortal) + siguiente meta → /economy/admin
 *  4. VER REPORTES: LA puerta al hub de análisis (única card que va a /reports crudo)
 *  · TENDENCIAS DEL MES podada: no tenía dato en superficie ("Ver tu progreso" = link
 *    pelón) y duplicaba la promesa de VER REPORTES. El período Mes vive en /reports.
 */
import { useRouter , type Href } from 'expo-router';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { pickCronotipoImage, pickEdadAtpImage, YO_STATIC_IMAGES } from '@/src/utils/yo-image-picker';
import { tierFromLifetime, nextTierInfo } from '@/src/services/economy/rank-tiers';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';

/** Emoji + nombre/desc por cronotipo (EditorialCard renderiza el icono como texto → emoji). */
const CHRONO_META: Record<string, { emoji: string; name: string; desc: string }> = {
  lion: { emoji: '🦁', name: 'León', desc: 'Madrugador natural' },
  bear: { emoji: '🐻', name: 'Oso', desc: 'Ritmo solar' },
  wolf: { emoji: '🐺', name: 'Lobo', desc: 'Noctámbulo creativo' },
  dolphin: { emoji: '🐬', name: 'Delfín', desc: 'Mente activa' },
};

/** Etiqueta cualitativa NO punitiva del momentum (misma escala que yo.tsx). */
function momentumLabel(v: number): string {
  if (v >= 80) return 'En racha';
  if (v >= 60) return 'Constante';
  if (v >= 40) return 'Retomando el ritmo';
  return 'Arrancando';
}

interface CompositionLike {
  body_fat_pct: number | null;
  muscle_mass_pct: number | null;
  visceral_fat: number | null;
}

interface Props {
  // YO-1 (MB-1): sex y edadResult vuelven a usarse — la card EDAD ATP regresa a YO
  // como PRIMER dato desplegado (el número estrella vive donde vive la identidad).
  // composition sigue aceptada e ignorada (las cards de salud quedaron en Salud Funcional).
  sex?: string | null;
  chronotype?: string | null;
  edadResult?: EdadAtpV2Result | null;
  composition?: CompositionLike | null;
  /** Momentum semanal 0-100 (dailyScore.overall). */
  momentum: number;
  /** Electrones históricos → rank tier real en la card PROGRESIÓN (#8). */
  lifetimeElectrons?: number | null;
}

export function YoEditorialSection({ sex, chronotype, edadResult, momentum, lifetimeElectrons }: Props) {
  const router = useRouter();
  const go = (route: Href) => router.push(route);
  const chrono = chronotype ? CHRONO_META[chronotype] : null;

  // Rank tier real (nombres v2, #100). Sin balance cargado aún → Explorer (min 0).
  const lifetime = lifetimeElectrons ?? 0;
  const tier = tierFromLifetime(lifetime);
  const { next, remaining } = nextTierInfo(lifetime);

  // Delta con la convención del motor V2: cron − integral, POSITIVO = más joven.
  const edadDelta = edadResult
    ? Math.round((edadResult.chronological_age - edadResult.edad_integral) * 10) / 10
    : null;

  return (
    <>
      {/* 0. EDAD ATP — el número estrella, PRIMER dato de YO (YO-1 MB-1).
          Con resultado: edad biológica + delta → result-preview. Sin CE suficiente:
          CTA de cálculo → hub edad-atp. */}
      <EditorialCard
        cardKey="yo_edad_atp" icon="🧬" title="EDAD ATP"
        subtitle={edadResult ? `${edadResult.edad_integral.toFixed(1)} años biológicos` : '¿Cuántos años tiene tu cuerpo?'}
        message={edadResult
          ? (edadDelta! > 0.05
            ? `${edadDelta!.toFixed(1)} años más joven que tu edad real`
            : edadDelta! < -0.05
              ? `${Math.abs(edadDelta!).toFixed(1)} años sobre tu edad real`
              : 'En línea con tu edad real')
          : 'Calcula tu edad biológica integral'}
        gradient={['#1ABC9C', '#16A085']}
        imageBn={pickEdadAtpImage(sex)}
        onTap={() => go(edadResult ? '/edad-atp/result-preview' : '/edad-atp')}
      />

      {/* 1. HERO DE ESTADO — tu momentum semanal, editorial (dato antes que link) */}
      <EditorialCard
        cardKey="yo_disciplina" icon="🔥" title="DISCIPLINA ATP"
        subtitle={momentumLabel(momentum)}
        message={`Momentum semanal: ${Math.round(momentum)}%`}
        gradient={['#9B59B6', '#3498DB']}
        imageBn={YO_STATIC_IMAGES.disciplina}
        progress={{ current: momentum, target: 100, unit: '%' }}
        onTap={() => go('/reports?period=week')}
      />

      {/* 2. CRONOTIPO — con resultado: TU tipo → vista de tu cronotipo; sin: test */}
      <EditorialCard
        cardKey="yo_cronotipo" icon={chrono?.emoji ?? '🌙'}
        title={chrono ? `CRONOTIPO ${chrono.name.toUpperCase()}` : 'CRONOTIPO'}
        subtitle={chrono ? chrono.desc : 'Descubre tu cronotipo'}
        message={chrono ? 'Qué significa y cómo aprovecharlo' : 'Test de 5 minutos'}
        gradient={['#FFD700', '#FFA500']}
        imageBn={pickCronotipoImage(chronotype)}
        onTap={() => go(chrono ? '/my-chronotype' : '/quiz/chronotype')}
      />

      {/* 3. PROGRESIÓN — tu rank tier real + siguiente meta → Mi Progreso */}
      <EditorialCard
        cardKey="yo_rank" icon={tier.emoji} title="PROGRESIÓN"
        subtitle={`Eres ${tier.name}`}
        message={next ? `Faltan ${remaining} E- para ${next.name}` : 'Rank, retos y logros'}
        gradient={['#FFD700', '#8B4513']}
        imageBn={YO_STATIC_IMAGES.rank}
        onTap={() => go('/economy/admin')}
      />

      {/* 4. VER REPORTES — la única puerta al hub crudo de análisis */}
      <EditorialCard
        cardKey="yo_reportes" icon="📊" title="VER REPORTES"
        subtitle="Análisis profundo de tu data" message="Gráficas + correlaciones + insights"
        gradient={['#3498DB', '#1ABC9C']}
        imageBn={YO_STATIC_IMAGES.reports}
        onTap={() => go('/reports')}
      />
    </>
  );
}
