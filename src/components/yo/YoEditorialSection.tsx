/**
 * YoEditorialSection (#yo-editorial V1.3) — feed editorial del tab YO. Mismo patrón modular que
 * HoyEditorialSection: aísla las 9 EditorialCards fuera de yo.tsx. Imágenes sex-aware (edad-atp,
 * composición el/ella) y por cronotipo vía yo-image-picker; el resto estáticas (YO_STATIC_IMAGES).
 *
 * Defensivo: optional chaining + fallbacks "Sin datos" en cada card → nunca crashea por dato
 * faltante. lastLab/monthTrend aún no vienen de dashboard-service → cards caen a CTA de setup
 * (TODO sprint futuro, ver doc 4.4).
 */
import { useRouter } from 'expo-router';
import { EditorialCard } from '@/src/components/hoy/EditorialCard';
import { pickEdadAtpImage, pickComposicionImage, pickCronotipoImage, YO_STATIC_IMAGES } from '@/src/utils/yo-image-picker';
import type { EdadAtpV2Result } from '@/src/types/edad-atp-v2';

/** Emoji + nombre/desc por cronotipo (EditorialCard renderiza el icono como texto → emoji, no Ionicons). */
const CHRONO_META: Record<string, { emoji: string; name: string; desc: string }> = {
  lion: { emoji: '🦁', name: 'León', desc: 'Madrugador natural' },
  bear: { emoji: '🐻', name: 'Oso', desc: 'Ritmo solar' },
  wolf: { emoji: '🐺', name: 'Lobo', desc: 'Noctámbulo creativo' },
  dolphin: { emoji: '🐬', name: 'Delfín', desc: 'Mente activa' },
};

interface CompositionLike {
  body_fat_pct: number | null;
  muscle_mass_pct: number | null;
  visceral_fat: number | null;
}

interface Props {
  sex?: string | null;
  chronotype?: string | null;
  edadResult: EdadAtpV2Result | null;
  composition?: CompositionLike | null;
  /** Momentum semanal 0-100 (dailyScore.overall). */
  momentum: number;
}

export function YoEditorialSection({ sex, chronotype, edadResult, composition, momentum }: Props) {
  const router = useRouter();
  const go = (route: string) => router.push(route as any);
  const chrono = chronotype ? CHRONO_META[chronotype] : null;

  return (
    <>
      {/* HERO — EDAD ATP */}
      <EditorialCard
        cardKey="yo_edad_atp" size="hero" icon="🎯" title="EDAD ATP"
        subtitle={edadResult ? `${edadResult.edad_integral.toFixed(1)} · cronológica ${edadResult.chronological_age}` : 'Calcula tu Edad ATP'}
        message={edadResult ? `Diferencia: ${edadResult.delta_anos > 0 ? '+' : ''}${edadResult.delta_anos.toFixed(1)} años` : 'Empieza tu evaluación'}
        gradient={['#A8E02A', '#1ABC9C']}
        imageBn={pickEdadAtpImage(sex)}
        onTap={() => go('/edad-atp')}
      />

      {/* HERO — COMPOSICIÓN CORPORAL */}
      <EditorialCard
        cardKey="yo_composicion" size="hero" icon="💪" title="COMPOSICIÓN CORPORAL"
        subtitle={composition?.body_fat_pct != null
          ? `${composition.body_fat_pct}% grasa${composition.muscle_mass_pct != null ? ` · ${composition.muscle_mass_pct}% magra` : ''}`
          : 'Sin datos · agrega tu composición'}
        message={composition?.visceral_fat != null ? `Grasa visceral: ${composition.visceral_fat}` : undefined}
        gradient={['#FF8C00', '#C0392B']}
        imageBn={pickComposicionImage(sex)}
        onTap={() => go('/my-health')}
      />

      {/* CRONOTIPO (dinámico) */}
      <EditorialCard
        cardKey="yo_cronotipo" icon={chrono?.emoji ?? '🌙'}
        title={chrono ? `CRONOTIPO ${chrono.name.toUpperCase()}` : 'CRONOTIPO'}
        subtitle={chrono ? chrono.desc : 'Descubre tu cronotipo'}
        message={chrono ? 'Optimiza tu día según tu ritmo' : 'Test de 5 minutos'}
        gradient={['#FFD700', '#FFA500']}
        imageBn={pickCronotipoImage(chronotype)}
        onTap={() => go('/quiz/chronotype')}
      />

      {/* DISCIPLINA ATP (con barra de progreso) */}
      <EditorialCard
        cardKey="yo_disciplina" icon="🔥" title="DISCIPLINA ATP"
        subtitle={`Momentum semanal: ${Math.round(momentum)}%`}
        message={momentum >= 80 ? 'Estás en racha' : momentum >= 50 ? 'Vas al ritmo' : 'Retomando el ritmo'}
        gradient={['#9B59B6', '#3498DB']}
        imageBn={YO_STATIC_IMAGES.disciplina}
        progress={{ current: momentum, target: 100, unit: '%' }}
        onTap={() => go('/reports')}
      />

      {/* LAB MÁS RECIENTE — lastLab aún no disponible → CTA de setup */}
      <EditorialCard
        cardKey="yo_lab" icon="🩸" title="LAB MÁS RECIENTE"
        subtitle="Sube tus primeros labs" message="PDF, foto o manual"
        gradient={['#3498DB', '#9B59B6']}
        imageBn={YO_STATIC_IMAGES.lab}
        onTap={() => go('/my-health')}
      />

      {/* TENDENCIAS DEL MES — monthTrend aún no disponible */}
      <EditorialCard
        cardKey="yo_tendencias" icon="📈" title="TENDENCIAS DEL MES"
        subtitle="Ver tu progreso"
        gradient={['#1ABC9C', '#A8E02A']}
        imageBn={YO_STATIC_IMAGES.tendencias}
        onTap={() => go('/reports')}
      />

      {/* RANK + LOGROS — /achievements no existe → /reports */}
      <EditorialCard
        cardKey="yo_rank" icon="🏆" title="RANK + LOGROS"
        subtitle="Tu progresión en ATP" message="Logros desbloqueados + ranking"
        gradient={['#FFD700', '#8B4513']}
        imageBn={YO_STATIC_IMAGES.rank}
        onTap={() => go('/reports')}
      />

      {/* TESTS FUNCIONALES → hub /quizzes */}
      <EditorialCard
        cardKey="yo_tests" icon="🧠" title="TESTS FUNCIONALES"
        subtitle="Braverman + 5 quizzes" message="Personaliza ATP a tu fisiología"
        gradient={['#E74C3C', '#FFA500']}
        imageBn={YO_STATIC_IMAGES.test}
        onTap={() => go('/quizzes')}
      />

      {/* VER REPORTES */}
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
