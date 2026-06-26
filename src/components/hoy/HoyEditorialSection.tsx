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
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import type { ElectronSource } from '@/src/constants/electrons';
import { VERIFIED_ELECTRON_KEYS, type CompiledDay } from '@/src/services/day-compiler';

/** Cards booleanas que se completan TOCANDO la card (toggle). El resto enlaza a su pantalla. */
const TOGGLE_CARDS = new Set(['luz_solar', 'bano_frio', 'grounding', 'lentes_rojos',
  // #v13d 2.1: cards nuevas también togglean desde la card (renderBoolCard ya lo hace; aquí por consistencia).
  // NOTA: 'journal' NO va aquí — navega a /journal (igual que checkin), el award sucede al guardar entry.
  'no_alcohol', 'no_processed_foods', 'screen_time_cutoff']);

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
  // #v13d 2.1: cards nuevas (cardKey === source, mapeo identidad explícito para consistencia).
  // NOTA: 'journal' NO va aquí — la card navega a /journal (igual que checkin) y el award
  // sucede al guardar entry dentro. No se toglea desde la card.
  no_alcohol: 'no_alcohol', no_processed_foods: 'no_processed_foods',
  screen_time_cutoff: 'screen_time_cutoff',
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

  // #v13e 3.A.2 — OPTIMISTIC UPDATE. Antes: tap → await Supabase x2 → emit → recompila → re-render
  // (3-5s de lag antes de que la card palomeara). Ahora: setState optimista palomea AHORA y la
  // persistencia corre async con rollback si falla. El override se mantiene hasta que el compiler
  // refleje el estado real (reconciliación abajo) → sin flicker de vuelta a "pending".
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, boolean>>({});

  // Estado visual de un booleano: override optimista > estado compilado > false.
  const isDone = (source: string): boolean =>
    optimisticOverrides[source] ?? boolBySource.get(source)?.completed ?? false;

  // Cuando el compiler recompila (day.booleanElectrons cambia), soltar los overrides que el estado
  // real ya alcanzó; conservar los que aún no se reflejan (evita parpadeo a pending).
  useEffect(() => {
    setOptimisticOverrides((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      const next: Record<string, boolean> = {};
      for (const k of keys) {
        const real = boolBySource.get(k)?.completed ?? false;
        if (real !== prev[k]) next[k] = prev[k];
      }
      return Object.keys(next).length === keys.length ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.booleanElectrons]);

  // 4.4 — completar/revocar un electrón booleano tocando la card (optimista + rollback).
  const toggleBoolean = (cardKey: string) => {
    if (!userId) return;
    // Cards nuevas (no_alcohol/journal/no_processed_foods/screen_time_cutoff) usan cardKey=source.
    const source = (CARD_TO_ELECTRON[cardKey] ?? cardKey) as ElectronSource;
    if (!source) return;
    // Verificados (checkin/meditation/…) derivan `completed` de actividad real, no del blob.
    // No deben togglearse desde la card (checkin navega a /checkin). Guard defensivo.
    if ((VERIFIED_ELECTRON_KEYS as readonly string[]).includes(source)) return;
    const wasCompleted = isDone(source);
    const next = !wasCompleted;
    // 1) UI optimista: palomea/despalomea AHORA.
    setOptimisticOverrides((prev) => ({ ...prev, [source]: next }));
    // 2) Persistencia async fire-and-forget con rollback si falla.
    persistToggle(source, next).catch((e) => {
      setOptimisticOverrides((prev) => ({ ...prev, [source]: wasCompleted }));
      logWarn('[HoyEditorial] toggle failed, reverted', e);
    });
  };

  // #v13d 2.1: DUAL WRITE (blob daily_electrons + electron_logs). El compiler lee `completed` de los
  // no-verificados desde el blob; electron_logs lleva el acumulado/rango.
  const persistToggle = async (source: ElectronSource, next: boolean) => {
    const newStates: Record<string, boolean> = {};
    for (const e of day.booleanElectrons ?? []) {
      newStates[e.source] = e.completed;
    }
    // #v13e 3.A.1: SIEMPRE persistir el source toggleado, aunque (por prefs viejos) no viva en
    // booleanElectrons (toggle silencioso).
    newStates[source] = next;
    const { error } = await supabase
      .from('daily_electrons')
      .upsert({ user_id: userId!, date: today, electrons: newStates }, { onConflict: 'user_id,date' });
    if (error) throw error;
    if (next) await awardBooleanElectron(userId!, source);
    else await revokeBooleanElectron(userId!, source);
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
    // #v13d 2.1: leer por `source` mapeado (no por cardKey) para reflejar el electrón real.
    const source = CARD_TO_ELECTRON[cardKey] ?? cardKey;
    const el = boolBySource.get(source);
    const done = isDone(source); // #v13e 3.A.2: estado optimista
    return (
      <EditorialCard
        key={cardKey} cardKey={cardKey} icon={spec.icon} title={spec.title}
        subtitle={done ? 'Hecho hoy' : subtitlePending}
        gradient={spec.gradient} imageBn={imageBn}
        state={done ? 'done' : 'pending'}
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

      {/* #v13d 2.5: UV card hero — número prominente en el title + advertencia contextual en
          subtitle (UV es info crítica para exposición solar guiada). */}
      {show('uv') ? (() => {
        const uv = uvMini?.current;
        const hint = uv == null ? '' : uv >= 8 ? ' · evita 11-15h' : uv >= 6 ? ' · busca sombra' : '';
        return (
          <EditorialCard
            cardKey="uv" size="hero" icon="☀️"
            title={uv != null ? `UV INDEX ${uv}` : 'UV INDEX'}
            subtitle={uv != null ? `${uvMini?.level ?? ''}${hint}`.trim() || 'Sin datos' : 'Sin datos'}
            gradient={['#FFD700', '#FFA500']}
            imageBn={HOY_EXTRA_IMAGES.uv}
            onTap={() => go('/solar')}
          />
        );
      })() : null}

      {show('checkin') ? (
        <EditorialCard
          cardKey="checkin" icon="❤️" title="CHECK-IN EMOCIONAL"
          subtitle={boolBySource.get('checkin')?.completed ? 'Registrado hoy' : '¿Cómo te sientes hoy?'}
          gradient={['#1ABC9C', '#9B59B6']}
          imageBn={HOY_EXTRA_IMAGES.checkin}
          state={boolBySource.get('checkin')?.completed ? 'done' : 'pending'}
          electronsValue={boolBySource.get('checkin')?.weight}
          showCheckCircle
          // #v13d 2.2: checkin NO togglea desde card → navega a /checkin. El award sucede al
          // guardar dentro de /checkin (emite electrons_changed → recompila → card palomea).
          onTap={() => go('/checkin')}
        />
      ) : null}

      {/* #v13d post-smoke fix: journal NO togglea desde card → navega a /journal (igual que
          checkin). El award sucede al guardar entry dentro (app/journal.tsx ya llama
          awardBooleanElectron + emite electrons_changed → recompila → card palomea). */}
      {show('journal') ? (() => {
        const spec = HOY_CARD_BY_KEY['journal'];
        if (!spec) return null;
        const el = boolBySource.get('journal');
        return (
          <EditorialCard
            cardKey="journal" icon={spec.icon} title={spec.title}
            subtitle={el?.completed ? 'Registrado hoy' : 'Escribe tu día'}
            gradient={spec.gradient} imageBn={HOY_EXTRA_IMAGES.journal}
            state={el?.completed ? 'done' : 'pending'}
            electronsValue={el?.weight}
            showCheckCircle
            onTap={() => go('/journal')}
          />
        );
      })() : null}

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

      {/* 4.7 — AYUNO. 2.5: alineado al resto. 3.3: imagen cableada.
          #v13d 2.6: barra de progreso (horas activas vs meta) + círculo que palomea al cumplir. */}
      {show('ayuno') ? (() => {
        const targetHours = activeFast?.target_hours ?? 16; // default 16h si el modelo no trae meta
        const hoursActive = activeFast?.fast_start
          ? Math.max(0, (Date.now() - new Date(activeFast.fast_start).getTime()) / 3600000)
          : 0;
        const fastDone = !!activeFast && hoursActive >= targetHours;
        return (
          <EditorialCard
            cardKey="ayuno" icon="⏳" title="AYUNO"
            subtitle={activeFast
              ? `Ayunando · ${formatFastDuration(activeFast.fast_start)} de ${targetHours}h meta`
              : 'Sin ayuno activo'}
            message={activeFast ? 'Tu ventana de ayuno está abierta' : 'Inicia tu ayuno cuando estés listo'}
            gradient={['#6B46C1', '#1E3A8A']}
            imageBn={HOY_EXTRA_IMAGES.ayuno}
            state={fastDone ? 'done' : 'pending'}
            progress={activeFast ? { current: hoursActive, target: targetHours, unit: 'h' } : undefined}
            showCheckCircle={!!activeFast}
            ctaLabel={activeFast ? 'Romper ayuno' : 'Iniciar ayuno'}
            onTap={() => go('/fasting')}
          />
        );
      })() : null}

      {ELECTRON_CARD_ORDER.filter(show).map((cardKey) => {
        const spec = HOY_CARD_BY_KEY[cardKey];
        if (!spec) return null;
        const source = CARD_TO_ELECTRON[cardKey];
        const el = boolBySource.get(source);
        const done = isDone(source); // #v13e 3.A.2: estado optimista (verificados caen al compilado)
        const state: EditorialCardState = done ? 'done' : 'pending';
        const canToggle = TOGGLE_CARDS.has(cardKey);
        return (
          <EditorialCard
            key={cardKey} cardKey={cardKey} icon={spec.icon} title={spec.title}
            subtitle={done ? 'Hecho hoy' : el?.description || ''}
            gradient={spec.gradient} imageBn={ELECTRON_IMAGES[cardKey]} state={state}
            electronsValue={el?.weight} showCheckCircle
            onTap={canToggle ? () => toggleBoolean(cardKey) : () => go(spec.route || el?.pillarRoute || '/kit')}
          />
        );
      })}

      {renderBoolCard('no_alcohol', 'Día sin alcohol', HOY_EXTRA_IMAGES.no_alcohol)}
      {renderBoolCard('screen_time_cutoff', '1h sin pantallas antes de dormir', HOY_EXTRA_IMAGES.screen_cutoff)}

      {/* #v13e 3.A.3: CARDIO verificado — palomea al guardar sesión (cardio_sessions hoy). Navega a
          /log-cardio (no togglea). El km/min del subtitle llega en 3.B.3. */}
      {show('cardio') ? (() => {
        const el = boolBySource.get('cardio');
        const done = isDone('cardio');
        return (
          <EditorialCard
            cardKey="cardio" icon="❤️‍🔥" title="CARDIO"
            subtitle={done ? 'Hecho hoy' : 'Sin sesión hoy · registrar'}
            gradient={['#E74C3C', '#FFA500']}
            imageBn={pickCardioImage(`${seedKey ?? ''}-cardio-${today}`)}
            state={done ? 'done' : 'pending'}
            electronsValue={el?.weight}
            showCheckCircle
            onTap={() => go('/log-cardio')}
          />
        );
      })() : null}

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
