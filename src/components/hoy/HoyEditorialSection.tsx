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
import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { EditorialCard, type EditorialCardState } from '@/src/components/hoy/EditorialCard';
import { HeroAgendaCard } from '@/src/components/hoy/HeroAgendaCard';
import { HOY_CARD_BY_KEY } from '@/src/constants/hoy-cards';
import { generateLocalRecommendation } from '@/src/services/hoy/local-recommendation';
import { getLocalHour, getLocalToday } from '@/src/utils/date-helpers';
import { pickCardioImage } from '@/src/utils/image-rotation';
import { pickAgendaImage, categoryToFolder } from '@/src/utils/agenda-image-picker';
import { awardBooleanElectron, revokeBooleanElectron } from '@/src/services/electron-service';
import { addWater } from '@/src/services/hydration-service';
import { getActiveFast, type FastingLog } from '@/src/services/fasting-service';
import type { ElectronSource } from '@/src/constants/electrons';
import type { CompiledDay } from '@/src/services/day-compiler';

/** Cards booleanas que se completan TOCANDO la card (toggle). El resto enlaza a su pantalla. */
const TOGGLE_CARDS = new Set(['luz_solar', 'bano_frio', 'grounding', 'lentes_rojos', 'checkin']);

/** "14h 32m" desde el ISO de inicio del ayuno. */
function formatFastDuration(startISO: string | null): string {
  if (!startISO) return '';
  const ms = Date.now() - new Date(startISO).getTime();
  if (ms < 0) return '0h 00m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// #asset-swap: requires ESTÁTICOS (Metro no soporta dinámico). Viven aquí (componente, NO en
// hoy-cards.ts que los tests importan — require('.png') rompe el resolver de vitest).
const HOY_EXTRA_IMAGES = {
  uv: require('@/assets/images/hoy-extra/uv.png'),
  checkin: require('@/assets/images/hoy-extra/checkin.png'),
  proteina: require('@/assets/images/hoy-extra/proteina.png'),
  agua: require('@/assets/images/hoy-extra/agua.png'),
  pasos: require('@/assets/images/hoy-extra/pasos.png'),
  // #cableado-final 3.3: imágenes nuevas.
  ayuno: require('@/assets/images/hoy-extra/ayuno.png'),
  sueno: require('@/assets/images/hoy-extra/sueno.png'),
  journal: require('@/assets/images/hoy-extra/journal.png'),
  no_alcohol: require('@/assets/images/hoy-extra/no-alcohol.png'),
  no_procesados: require('@/assets/images/hoy-extra/no-procesados.png'),
  screen_cutoff: require('@/assets/images/hoy-extra/screen-cutoff.png'),
} as const;

const ELECTRON_IMAGES: Record<string, any> = {
  luz_solar: require('@/assets/images/electrons/luz-solar.png'),
  meditacion: require('@/assets/images/electrons/meditacion.png'),
  suplementos: require('@/assets/images/electrons/suplementos.png'),
  bano_frio: require('@/assets/images/electrons/bano-frio.png'),
  grounding: require('@/assets/images/electrons/grounding.png'),
  fuerza: require('@/assets/images/electrons/fuerza.png'),
  breathwork: require('@/assets/images/electrons/breathwork.png'),
  lentes_rojos: require('@/assets/images/electrons/lentes-rojos.png'),
};

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
  /** userId para toggle de electrones / agua / ayuno. (También es el seed de rotaciones.) */
  userId?: string;
  /** Seed para rotaciones determinísticas (ej. userId): misma img toda la sesión del día. */
  seedKey?: string;
}

export function HoyEditorialSection({ day, uvMini, cardsVisible, userId, seedKey }: Props) {
  const router = useRouter();
  const show = (k: string) => cardsVisible.has(k);
  const go = (route: string) => router.push(route as any);

  const boolBySource = new Map((day.booleanElectrons ?? []).map((e) => [e.source, e]));
  const quant = (src: string) => (day.quantitativeElectrons ?? []).find((q) => q.source === src);
  const protein = quant('protein');
  const water = quant('water');
  const today = getLocalToday();

  // 4.7 — ayuno activo (live). Carga al montar + cuando emite day_changed; tick cada minuto.
  const [activeFast, setActiveFast] = useState<FastingLog | null>(null);
  const [, setTick] = useState(0);
  const loadFast = useCallback(() => {
    if (!userId) { setActiveFast(null); return; }
    getActiveFast(userId).then(setActiveFast).catch(() => setActiveFast(null));
  }, [userId]);
  useEffect(() => {
    loadFast();
    const sub = DeviceEventEmitter.addListener('day_changed', loadFast);
    return () => sub.remove();
  }, [loadFast]);
  useEffect(() => {
    if (!activeFast) return;
    const id = setInterval(() => setTick((t) => t + 1), 60000); // re-render del timer cada minuto
    return () => clearInterval(id);
  }, [activeFast]);

  // 4.4 — completar/revocar un electrón booleano tocando la card.
  const toggleBoolean = async (cardKey: string) => {
    if (!userId) return;
    // Cards nuevas (no_alcohol/journal/no_processed_foods/screen_time_cutoff) usan cardKey=source.
    const source = (cardKey === 'checkin' ? 'checkin' : (CARD_TO_ELECTRON[cardKey] ?? cardKey)) as ElectronSource;
    if (!source) return;
    const isCompleted = boolBySource.get(source)?.completed;
    if (isCompleted) await revokeBooleanElectron(userId, source);
    else await awardBooleanElectron(userId, source);
    DeviceEventEmitter.emit('electrons_changed');
  };

  // Próximo evento de la agenda (si existe) → Hero. Imagen rotada por categoría (determinística).
  const nextEvent = (day.agendaItems ?? []).find((i) => i.isNext);
  const heroImage = nextEvent
    ? pickAgendaImage(categoryToFolder(nextEvent.category, nextEvent.name, getLocalHour()), `${seedKey ?? ''}-${nextEvent.id}-${today}`)
    : undefined;

  // #cableado-final 3.3: render de una card booleana nueva (cardKey === electron source). Toggle
  // desde card + círculo checkable. Mismo patrón que los electrones, pero como bloque explícito.
  const renderBoolCard = (cardKey: string, subtitlePending: string, imageBn: any) => {
    if (!show(cardKey)) return null;
    const spec = HOY_CARD_BY_KEY[cardKey];
    if (!spec) return null;
    const el = boolBySource.get(cardKey);
    return (
      <EditorialCard
        key={cardKey} cardKey={cardKey} icon={spec.icon} title={spec.title}
        subtitle={el?.completed ? 'Hecho hoy' : subtitlePending}
        gradient={spec.gradient} imageBn={imageBn}
        state={el?.completed ? 'done' : 'pending'}
        electronsValue={el?.weight} showCheckCircle
        onTap={() => toggleBoolean(cardKey)}
      />
    );
  };

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
          imageBn={heroImage}
          onTapAgenda={() => go('/protocol-config')}
          onComplete={() => { /* completar evento → AGENDA V2 (sprint futuro) */ }}
        />
      ) : null}

      {show('uv') ? (
        <EditorialCard
          cardKey="uv" icon="☀️" title="UV INDEX"
          subtitle={uvMini?.current != null ? `${uvMini.current}${uvMini.level ? ' · ' + uvMini.level : ''}` : 'Sin datos'}
          gradient={['#FFD700', '#FFA500']}
          imageBn={HOY_EXTRA_IMAGES.uv}
          onTap={() => go('/solar')}
        />
      ) : null}

      {show('checkin') ? (
        <EditorialCard
          cardKey="checkin" icon="❤️" title="CHECK-IN EMOCIONAL"
          subtitle={boolBySource.get('checkin')?.completed ? 'Registrado hoy' : '¿Cómo te sientes hoy?'}
          gradient={['#1ABC9C', '#9B59B6']}
          imageBn={HOY_EXTRA_IMAGES.checkin}
          state={boolBySource.get('checkin')?.completed ? 'done' : 'pending'}
          electronsValue={boolBySource.get('checkin')?.weight}
          showCheckCircle
          onTap={() => toggleBoolean('checkin')}
        />
      ) : null}

      {renderBoolCard('journal', 'Escribe tu día', HOY_EXTRA_IMAGES.journal)}

      {show('proteina') && protein ? (
        <EditorialCard
          cardKey="proteina" icon="🍳" title="PROTEÍNA"
          subtitle={`${protein.displayCurrent} / ${protein.displayTarget}`}
          message={protein.current < protein.target ? `Te faltan ${Math.max(0, Math.round(protein.target - protein.current))}g` : 'Meta lograda ✓'}
          gradient={['#FF8C00', '#C0392B']}
          imageBn={HOY_EXTRA_IMAGES.proteina}
          state={protein.current >= protein.target ? 'done' : 'pending'}
          progress={{ current: protein.current, target: protein.target, unit: 'g' }}
          showCheckCircle
          onTap={() => go('/food-register')}
        />
      ) : null}

      {renderBoolCard('no_processed_foods', 'Día sin procesados', HOY_EXTRA_IMAGES.no_procesados)}

      {show('agua') && water ? (
        <EditorialCard
          cardKey="agua" icon="💧" title="AGUA"
          subtitle={`${water.displayCurrent} / ${water.displayTarget}`}
          message={water.current >= water.target ? 'Meta superada' : 'Sigue hidratándote'}
          gradient={['#3498DB', '#1ABC9C']}
          imageBn={HOY_EXTRA_IMAGES.agua}
          state={water.current >= water.target ? 'done' : 'pending'}
          progress={{ current: water.current, target: water.target, unit: 'ml' }}
          quickActions={userId ? [
            { label: '+250 ml', onTap: () => { addWater(userId, 250); } },
            { label: '+500 ml', onTap: () => { addWater(userId, 500); } },
            { label: '-250 ml', onTap: () => { addWater(userId, -250); } },
          ] : undefined}
          showCheckCircle
          onTap={() => go('/hydration')}
        />
      ) : null}

      {/* 4.7 — AYUNO. 2.5: alineado al resto (sin in_window/glow). 3.3: imagen cableada. */}
      {show('ayuno') ? (
        <EditorialCard
          cardKey="ayuno" icon="⏳" title="AYUNO"
          subtitle={activeFast ? `Ayunando · ${formatFastDuration(activeFast.fast_start)}` : 'Sin ayuno activo'}
          message={activeFast ? 'Tu ventana de ayuno está abierta' : 'Inicia tu ayuno cuando estés listo'}
          gradient={['#6B46C1', '#1E3A8A']}
          imageBn={HOY_EXTRA_IMAGES.ayuno}
          ctaLabel={activeFast ? 'Romper ayuno' : 'Iniciar ayuno'}
          onTap={() => go('/fasting')}
        />
      ) : null}

      {ELECTRON_CARD_ORDER.filter(show).map((cardKey) => {
        const spec = HOY_CARD_BY_KEY[cardKey];
        if (!spec) return null;
        const el = boolBySource.get(CARD_TO_ELECTRON[cardKey]);
        const state: EditorialCardState = el?.completed ? 'done' : 'pending';
        const canToggle = TOGGLE_CARDS.has(cardKey);
        return (
          <EditorialCard
            key={cardKey} cardKey={cardKey} icon={spec.icon} title={spec.title}
            subtitle={el?.completed ? 'Hecho hoy' : el?.description || ''}
            gradient={spec.gradient} imageBn={ELECTRON_IMAGES[cardKey]} state={state}
            electronsValue={el?.weight} showCheckCircle
            onTap={canToggle ? () => toggleBoolean(cardKey) : () => go(spec.route || el?.pillarRoute || '/kit')}
          />
        );
      })}

      {renderBoolCard('no_alcohol', 'Día sin alcohol', HOY_EXTRA_IMAGES.no_alcohol)}
      {renderBoolCard('screen_time_cutoff', '1h sin pantallas antes de dormir', HOY_EXTRA_IMAGES.screen_cutoff)}

      {show('cardio') ? (
        <EditorialCard
          cardKey="cardio" icon="❤️‍🔥" title="CARDIO"
          subtitle="Sin datos · conecta wearable" gradient={['#E74C3C', '#FFA500']}
          imageBn={pickCardioImage(`${seedKey ?? ''}-cardio-${today}`)}
          onTap={() => go('/log-cardio')}
        />
      ) : null}

      {show('pasos') ? (
        <EditorialCard
          cardKey="pasos" icon="🚶" title="PASOS"
          subtitle="Sin datos · conecta Health Connect" gradient={['#27AE60', '#8B4513']}
          imageBn={HOY_EXTRA_IMAGES.pasos}
          onTap={() => go('/settings')}
        />
      ) : null}

      {/* 3.3: SLEEP informativa — day-compiler no expone `sleep` (sin fuente hasta wearables) →
          sin barra/toggle, enlace a /reports. Sin círculo. */}
      {show('sleep') ? (
        <EditorialCard
          cardKey="sleep" icon="🌙" title="SUEÑO"
          subtitle="Descanso y recuperación" gradient={['#2C3E50', '#1A1A2E']}
          imageBn={HOY_EXTRA_IMAGES.sueno}
          onTap={() => go('/reports')}
        />
      ) : null}
    </>
  );
}
