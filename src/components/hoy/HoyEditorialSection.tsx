/**
 * HoyEditorialSection (#tabs-redesign V1.3, Parte 1) — la tira de cards editoriales del HOY.
 *
 * Aísla TODA la complejidad nueva del wiring fuera del index.tsx de 2363 líneas (que solo gana
 * 1 import + 1 línea de render). Alimenta cada card con datos que `day` (day-compiler) YA computa:
 * electrones booleanos (completed), cuantitativos (proteína/agua), UV (uvMini), agenda (próximo
 * evento). Defensivo: optional chaining + fallbacks → nunca crashea por dato faltante. Gated por
 * `cardsVisible` (visibility-service). Sin imágenes B/N → EditorialCard cae a gradient placeholder.
 *
 * NOTA: es ADITIVO. El cleanup de las secciones viejas del HOY (Próximo Electrón, grid de
 * electrones, agenda hardcoded, counters proteína/agua) queda para la auditoría visual de Enrique
 * (ver COWORK_REPORT) — removerlas a ciegas del archivo entrelazado es el riesgo que evitamos.
 */
import { useRouter } from 'expo-router';
import { EditorialCard, type EditorialCardState } from '@/src/components/hoy/EditorialCard';
import { HeroAgendaCard } from '@/src/components/hoy/HeroAgendaCard';
import { HOY_CARD_BY_KEY } from '@/src/constants/hoy-cards';
import { generateLocalRecommendation } from '@/src/services/hoy/local-recommendation';
import { getLocalHour } from '@/src/utils/date-helpers';
import type { CompiledDay } from '@/src/services/day-compiler';

/** Mapa cardKey editorial → `source` del electrón booleano en day.booleanElectrons. */
const CARD_TO_ELECTRON: Record<string, string> = {
  luz_solar: 'sunlight', meditacion: 'meditation', suplementos: 'supplements', bano_frio: 'cold_shower',
  grounding: 'grounding', fuerza: 'strength', breathwork: 'breathwork', lentes_rojos: 'red_glasses',
};
const ELECTRON_CARD_ORDER = ['luz_solar', 'meditacion', 'suplementos', 'bano_frio', 'grounding', 'fuerza', 'breathwork', 'lentes_rojos'];

interface UvMini { current?: number; level?: string }

interface Props {
  day: CompiledDay;
  uvMini?: UvMini | null;
  cardsVisible: Set<string>;
}

export function HoyEditorialSection({ day, uvMini, cardsVisible }: Props) {
  const router = useRouter();
  const show = (k: string) => cardsVisible.has(k);
  const go = (route: string) => router.push(route as any);

  const boolBySource = new Map((day.booleanElectrons ?? []).map((e) => [e.source, e]));
  const quant = (src: string) => (day.quantitativeElectrons ?? []).find((q) => q.source === src);
  const protein = quant('protein');
  const water = quant('water');

  // Próximo evento de la agenda (si existe) → Hero.
  const nextEvent = (day.agendaItems ?? []).find((i) => i.isNext);

  return (
    <>
      {show('hero_agenda') && nextEvent ? (
        <HeroAgendaCard
          icon="📅"
          title={nextEvent.name}
          timeLabel={nextEvent.time}
          countdownLabel={nextEvent.isNext ? 'AHORA' : undefined}
          message={generateLocalRecommendation(
            { category: nextEvent.category, name: nextEvent.name, defaultMessage: nextEvent.subtitle },
            { hour: getLocalHour(), proteinConsumed: protein?.current, proteinTarget: protein?.target },
          )}
          gradient={['#A8E02A', '#1ABC9C']}
          onTapAgenda={() => go('/protocol-config')}
          onComplete={() => { /* completar evento → AGENDA V2 (sprint futuro) */ }}
        />
      ) : null}

      {show('uv') ? (
        <EditorialCard
          cardKey="uv" icon="☀️" title="UV INDEX"
          subtitle={uvMini?.current != null ? `${uvMini.current}${uvMini.level ? ' · ' + uvMini.level : ''}` : 'Sin datos'}
          gradient={['#FFD700', '#FFA500']}
          onTap={() => go('/solar')}
        />
      ) : null}

      {show('checkin') ? (
        <EditorialCard
          cardKey="checkin" icon="❤️" title="CHECK-IN EMOCIONAL"
          subtitle={boolBySource.get('checkin')?.completed ? 'Registrado hoy' : '¿Cómo te sientes hoy?'}
          gradient={['#1ABC9C', '#9B59B6']}
          state={boolBySource.get('checkin')?.completed ? 'done' : 'pending'}
          onTap={() => go('/checkin')}
        />
      ) : null}

      {show('proteina') && protein ? (
        <EditorialCard
          cardKey="proteina" icon="🍳" title="PROTEÍNA"
          subtitle={`${protein.displayCurrent} / ${protein.displayTarget}`}
          message={protein.current < protein.target ? `Te faltan ${Math.max(0, Math.round(protein.target - protein.current))}g` : 'Meta lograda ✓'}
          gradient={['#FF8C00', '#C0392B']}
          state={protein.current >= protein.target ? 'done' : 'pending'}
          onTap={() => go('/food-register')}
        />
      ) : null}

      {show('agua') && water ? (
        <EditorialCard
          cardKey="agua" icon="💧" title="AGUA"
          subtitle={`${water.displayCurrent} / ${water.displayTarget}`}
          message={water.current >= water.target ? 'Meta superada' : 'Sigue hidratándote'}
          gradient={['#3498DB', '#1ABC9C']}
          state={water.current >= water.target ? 'done' : 'pending'}
          onTap={() => go('/hydration')}
        />
      ) : null}

      {ELECTRON_CARD_ORDER.filter(show).map((cardKey) => {
        const spec = HOY_CARD_BY_KEY[cardKey];
        if (!spec) return null;
        const el = boolBySource.get(CARD_TO_ELECTRON[cardKey]);
        const state: EditorialCardState = el?.completed ? 'done' : 'pending';
        return (
          <EditorialCard
            key={cardKey} cardKey={cardKey} icon={spec.icon} title={spec.title}
            subtitle={el?.completed ? 'Hecho hoy' : el?.description || ''}
            gradient={spec.gradient} state={state}
            onTap={() => go(spec.route || el?.pillarRoute || '/kit')}
          />
        );
      })}

      {show('cardio') ? (
        <EditorialCard
          cardKey="cardio" icon="❤️‍🔥" title="CARDIO"
          subtitle="Sin datos · conecta wearable" gradient={['#E74C3C', '#FFA500']}
          onTap={() => go('/log-cardio')}
        />
      ) : null}

      {show('pasos') ? (
        <EditorialCard
          cardKey="pasos" icon="🚶" title="PASOS"
          subtitle="Sin datos · conecta Health Connect" gradient={['#27AE60', '#8B4513']}
          onTap={() => go('/settings')}
        />
      ) : null}
    </>
  );
}
