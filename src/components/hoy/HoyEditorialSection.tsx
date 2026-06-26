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
import { useState, useEffect, useCallback, Fragment } from 'react';
import { DeviceEventEmitter, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { ATP_BRAND } from '@/src/constants/brand';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
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
import { getBurnTimeMinutes } from '@/src/services/uv-service';
import { getCardioSessionsToday, type CardioSession } from '@/src/services/fitness-service';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import type { ElectronSource } from '@/src/constants/electrons';
import { VERIFIED_ELECTRON_KEYS, type CompiledDay } from '@/src/services/day-compiler';

/** Cards booleanas que se completan TOCANDO la card (toggle). El resto enlaza a su pantalla. */
const TOGGLE_CARDS = new Set(['luz_solar', 'bano_frio', 'grounding', 'lentes_rojos',
  // #v13d 2.1: cards nuevas también togglean desde la card (renderBoolCard ya lo hace; aquí por consistencia).
  // NOTA: 'journal' NO va aquí — navega a /journal (igual que checkin), el award sucede al guardar entry.
  'no_alcohol', 'no_processed_foods', 'screen_time_cutoff']);

/** #v13e 3.B.1: fototipo por default (tipo 3, piel media — más común en MX) hasta que exista
 *  client_profiles.fitzpatrick_type + cuestionario. La card UV invita a personalizar en tests. */
const FITZPATRICK_DEFAULT = 3;

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
/** #v13e 3.D — copy del info-tip "i" por card (cómo se gana el electrón). Corto (1-2 líneas). */
const CARD_INFO: Record<string, string> = {
  luz_solar: 'Exponerte 10–20 min al sol matutino (sin lentes oscuros) mejora tu ritmo circadiano y vitamina D. Palomea cuando lo hagas.',
  bano_frio: 'Inmersión 2–5 min en agua fría (10–15°C) activa grasa parda y norepinefrina. Cuenta una vez al día.',
  grounding: '10+ min descalzo en tierra, pasto o arena reduce inflamación. Cuenta una vez al día.',
  lentes_rojos: 'Lentes que bloquean luz azul 1–2h antes de dormir mejoran tu melatonina. Palomea cuando los uses.',
  no_alcohol: 'Día sin alcohol: mejora sueño, recuperación hepática y claridad mental. Palomea si no consumiste.',
  no_processed_foods: 'Día sin alimentos ultraprocesados. Palomea cuando lo confirmes.',
  screen_time_cutoff: '1 hora sin pantallas antes de dormir mejora tu sueño. Palomea cuando lo cumplas esa noche.',
  journal: 'Escribe cualquier entrada de journal hoy. El electrón se otorga al guardar tu entrada.',
  meditacion: 'Una sesión de meditación hoy. Se otorga al completar la práctica en Mente.',
  breathwork: 'Una sesión de respiración hoy. Se otorga al completarla en Mente.',
  fuerza: 'Registra un entrenamiento de fuerza hoy. Se otorga al guardar el ejercicio.',
  suplementos: 'Toma tus suplementos del día. Se otorga al marcarlos en Suplementación.',
  checkin: 'Registra tu estado emocional hoy. Se otorga al guardar el check-in.',
  cardio: 'Registra una sesión de cardio hoy. Se otorga al guardar la sesión.',
  proteina: 'Alcanza tu meta diaria de proteína. El electrón es proporcional al % logrado.',
  agua: 'Alcanza tu meta diaria de agua. El electrón es proporcional al % logrado.',
  ayuno: 'Completa tu ventana de ayuno objetivo. El electrón se otorga al cumplir las horas meta.',
};

/**
 * #v13e (reorden) — HOY en orden cronológico con 5 sub-secciones. SUPLEMENTOS ya no vive en HOY
 * (enlaza a /supplements desde HÁBITOS). TU DÍA + HERO AGENDA van arriba SIN section title.
 */
const HOY_SECTIONS: { title: string; cardKeys: string[] }[] = [
  { title: 'DESPERTAR', cardKeys: ['uv', 'luz_solar', 'checkin', 'meditacion'] },
  { title: 'NUTRICIÓN', cardKeys: ['proteina', 'agua', 'no_processed_foods', 'ayuno'] },
  { title: 'ACTIVIDAD', cardKeys: ['fuerza', 'cardio', 'pasos', 'grounding', 'bano_frio'] },
  { title: 'CIERRE', cardKeys: ['breathwork', 'lentes_rojos', 'journal', 'screen_time_cutoff', 'no_alcohol'] },
  { title: 'DESCANSO', cardKeys: ['sleep'] },
];

/** Header de sub-sección del HOY (lima, estilo "TU ECOSISTEMA"). */
function SectionTitle({ children }: { children: string }) {
  return <EliteText style={styles.sectionTitle}>{children}</EliteText>;
}

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

  // #v13e 3.B.3 — sesiones de cardio de hoy (resumen km/min en la card CARDIO).
  const [cardioToday, setCardioToday] = useState<CardioSession[]>([]);
  const loadCardio = useCallback(() => {
    if (!userId) { setCardioToday([]); return; }
    getCardioSessionsToday(userId).then(setCardioToday).catch(() => setCardioToday([]));
  }, [userId]);
  useEffect(() => {
    loadCardio();
    const subDay = DeviceEventEmitter.addListener('day_changed', loadCardio);
    const subEl = DeviceEventEmitter.addListener('electrons_changed', loadCardio);
    return () => { subDay.remove(); subEl.remove(); };
  }, [loadCardio]);

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

  // #v13f 2.1 — AGUA optimistic. Antes: tap quickAction → addWater await Supabase → emit day_changed
  // → recompila → re-render (3-5s de lag + parpadeo sube/baja). Ahora: el total optimista sube/baja
  // AHORA y la persistencia corre async; el override se mantiene hasta que el compiler lo refleje.
  const [optimisticWaterMl, setOptimisticWaterMl] = useState<number | null>(null);
  const currentWaterMl = optimisticWaterMl ?? water?.current ?? 0;
  useEffect(() => {
    // Reconciliar: cuando el valor compilado alcanza al optimista, soltar el override.
    if (optimisticWaterMl != null && (water?.current ?? 0) === optimisticWaterMl) {
      setOptimisticWaterMl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [water?.current]);

  const adjustWater = (deltaMl: number) => {
    if (!userId) return;
    const base = optimisticWaterMl ?? water?.current ?? 0;
    setOptimisticWaterMl(Math.max(0, base + deltaMl)); // optimista inmediato (clamp a 0, como addWater)
    addWater(userId, deltaMl).then((result) => {
      // addWater devuelve null si falló → revertir restando el delta del optimista en vuelo.
      // En éxito emite day_changed → recompila → la reconciliación de arriba limpia el override.
      if (result == null) {
        setOptimisticWaterMl((prev) => (prev == null ? null : Math.max(0, prev - deltaMl)));
        logWarn('[HoyEditorial] addWater failed, reverted');
      }
    }).catch((e) => {
      setOptimisticWaterMl((prev) => (prev == null ? null : Math.max(0, prev - deltaMl)));
      logWarn('[HoyEditorial] addWater error, reverted', e);
    });
  };

  /** Formato de ml para el subtitle optimista (mismo criterio que day-compiler.fmtQuant). */
  const fmtMl = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}ml`);

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
        infoText={CARD_INFO[cardKey]}
        onTap={() => toggleBoolean(cardKey)}
      />
    );
  };

  // Electrón booleano (luz_solar/meditacion/bano_frio/grounding/fuerza/breathwork/lentes_rojos).
  // suplementos ya no se ofrece en HOY (no vive en ninguna sección) → nunca se renderiza.
  const renderElectronCard = (cardKey: string) => {
    const spec = HOY_CARD_BY_KEY[cardKey];
    if (!spec) return null;
    const source = CARD_TO_ELECTRON[cardKey];
    const el = boolBySource.get(source);
    const done = isDone(source); // #v13e 3.A.2: estado optimista (verificados caen al compilado)
    const state: EditorialCardState = done ? 'done' : 'pending';
    const canToggle = TOGGLE_CARDS.has(cardKey);
    return (
      <EditorialCard
        cardKey={cardKey} icon={spec.icon} title={spec.title}
        subtitle={done ? 'Hecho hoy' : el?.description || ''}
        gradient={spec.gradient} imageBn={ELECTRON_IMAGES[cardKey]} state={state}
        electronsValue={el?.weight} showCheckCircle
        infoText={CARD_INFO[cardKey]}
        onTap={canToggle ? () => toggleBoolean(cardKey) : () => go(spec.route || el?.pillarRoute || '/kit')}
      />
    );
  };

  // Render de una card por cardKey (gateado por visibilidad). Las secciones (HOY_SECTIONS) deciden
  // el orden y agrupación; aquí solo vive el "cómo se ve" cada card.
  const renderCard = (cardKey: string): React.ReactNode => {
    if (!show(cardKey)) return null;
    switch (cardKey) {
      // #v13d 2.5: UV card hero — número prominente + #v13e 3.B.1 exposición segura.
      case 'uv': {
        const uv = uvMini?.current;
        const hint = uv == null ? '' : uv >= 8 ? ' · evita 11-15h' : uv >= 6 ? ' · busca sombra' : '';
        const safeMin = uv != null && uv > 0 ? getBurnTimeMinutes(uv, FITZPATRICK_DEFAULT) : null;
        const message = safeMin != null
          ? `Exposición segura: ~${safeMin} min (tipo ${FITZPATRICK_DEFAULT}) · Personaliza en tests`
          : undefined;
        return (
          <EditorialCard
            cardKey="uv" size="hero" icon="☀️"
            title={uv != null ? `UV INDEX ${uv}` : 'UV INDEX'}
            subtitle={uv != null ? `${uvMini?.level ?? ''}${hint}`.trim() || 'Sin datos' : 'Sin datos'}
            message={message}
            gradient={['#FFD700', '#FFA500']}
            imageBn={HOY_EXTRA_IMAGES.uv}
            onTap={() => go('/solar')}
          />
        );
      }
      case 'checkin':
        // #v13d 2.2: checkin NO togglea desde card → navega a /checkin (el award sucede dentro).
        return (
          <EditorialCard
            cardKey="checkin" icon="❤️" title="CHECK-IN EMOCIONAL"
            subtitle={isDone('checkin') ? 'Registrado hoy' : '¿Cómo te sientes hoy?'}
            gradient={['#1ABC9C', '#9B59B6']}
            imageBn={HOY_EXTRA_IMAGES.checkin}
            state={isDone('checkin') ? 'done' : 'pending'}
            electronsValue={boolBySource.get('checkin')?.weight}
            showCheckCircle
            infoText={CARD_INFO['checkin']}
            onTap={() => go('/checkin')}
          />
        );
      // #v13d post-smoke: journal navega a /journal (el award sucede al guardar entry dentro).
      case 'journal': {
        const spec = HOY_CARD_BY_KEY['journal'];
        if (!spec) return null;
        const el = boolBySource.get('journal');
        const done = isDone('journal');
        return (
          <EditorialCard
            cardKey="journal" icon={spec.icon} title={spec.title}
            subtitle={done ? 'Registrado hoy' : 'Escribe tu día'}
            gradient={spec.gradient} imageBn={HOY_EXTRA_IMAGES.journal}
            state={done ? 'done' : 'pending'}
            electronsValue={el?.weight}
            showCheckCircle
            infoText={CARD_INFO['journal']}
            onTap={() => go('/journal')}
          />
        );
      }
      case 'proteina':
        if (!protein) return null;
        return (
          <EditorialCard
            cardKey="proteina" icon="🍳" title="PROTEÍNA"
            subtitle={`${protein.displayCurrent} / ${protein.displayTarget}`}
            message={protein.current < protein.target ? `Te faltan ${Math.max(0, Math.round(protein.target - protein.current))}g` : 'Meta lograda ✓'}
            gradient={['#FF8C00', '#C0392B']}
            imageBn={HOY_EXTRA_IMAGES.proteina}
            state={protein.current >= protein.target ? 'done' : 'pending'}
            progress={{ current: protein.current, target: protein.target, unit: 'g' }}
            showCheckCircle
            infoText={CARD_INFO['proteina']}
            onTap={() => go('/food-register')}
          />
        );
      case 'agua': {
        if (!water) return null;
        // #v13f 2.1: valor optimista (sube/baja al instante, sin esperar recompile).
        const ml = currentWaterMl;
        const done = ml >= water.target;
        return (
          <EditorialCard
            cardKey="agua" icon="💧" title="AGUA"
            subtitle={`${fmtMl(ml)} / ${water.displayTarget}`}
            message={done ? 'Meta superada' : 'Sigue hidratándote'}
            gradient={['#3498DB', '#1ABC9C']}
            imageBn={HOY_EXTRA_IMAGES.agua}
            state={done ? 'done' : 'pending'}
            progress={{ current: ml, target: water.target, unit: 'ml' }}
            quickActions={userId ? [
              { label: '+250 ml', onTap: () => adjustWater(250) },
              { label: '+500 ml', onTap: () => adjustWater(500) },
              { label: '-250 ml', onTap: () => adjustWater(-250) },
            ] : undefined}
            showCheckCircle
            infoText={CARD_INFO['agua']}
            onTap={() => go('/hydration')}
          />
        );
      }
      case 'no_processed_foods':
        return renderBoolCard('no_processed_foods', 'Día sin procesados', HOY_EXTRA_IMAGES.no_procesados);
      // #v13d 2.6: AYUNO con barra de progreso (horas activas vs meta) + círculo al cumplir.
      case 'ayuno': {
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
            infoText={CARD_INFO['ayuno']}
            onTap={() => go('/fasting')}
          />
        );
      }
      case 'luz_solar': case 'meditacion': case 'bano_frio': case 'grounding':
      case 'fuerza': case 'breathwork': case 'lentes_rojos': case 'suplementos':
        return renderElectronCard(cardKey);
      // #v13e 3.A.3 + 3.B.3: CARDIO verificado — palomea al guardar sesión + km/min del día.
      case 'cardio': {
        const el = boolBySource.get('cardio');
        const done = isDone('cardio');
        const hasCardio = cardioToday.length > 0;
        const totalKm = cardioToday.reduce((s, c) => s + (c.distance_meters ?? 0), 0) / 1000;
        const totalMin = cardioToday.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60;
        const subtitle = hasCardio
          ? `${totalKm.toFixed(1)} km · ${Math.round(totalMin)} min`
          : (done ? 'Hecho hoy' : 'Sin sesión hoy · registrar');
        return (
          <EditorialCard
            cardKey="cardio" icon="❤️‍🔥" title="CARDIO"
            subtitle={subtitle}
            gradient={['#E74C3C', '#FFA500']}
            imageBn={pickCardioImage(`${seedKey ?? ''}-cardio-${today}`)}
            state={done ? 'done' : 'pending'}
            electronsValue={el?.weight}
            showCheckCircle
            infoText={CARD_INFO['cardio']}
            onTap={() => go('/log-cardio')}
          />
        );
      }
      // #v13e 3.B.2: PASOS — barra si hay data; CTA si no (sin Health Connect aún).
      case 'pasos': {
        const steps = quant('steps');
        const hasSteps = !!steps && steps.current > 0;
        return (
          <EditorialCard
            cardKey="pasos" icon="🚶" title="PASOS"
            subtitle={hasSteps ? `${steps!.displayCurrent} / ${steps!.displayTarget}` : 'Sin datos · conecta Health Connect'}
            gradient={['#27AE60', '#8B4513']}
            imageBn={HOY_EXTRA_IMAGES.pasos}
            state={hasSteps && steps!.current >= steps!.target ? 'done' : 'pending'}
            progress={hasSteps ? { current: steps!.current, target: steps!.target, unit: 'pasos' } : undefined}
            onTap={() => go('/settings')}
          />
        );
      }
      case 'screen_time_cutoff':
        return renderBoolCard('screen_time_cutoff', '1h sin pantallas antes de dormir', HOY_EXTRA_IMAGES.screen_cutoff);
      case 'no_alcohol':
        return renderBoolCard('no_alcohol', 'Día sin alcohol', HOY_EXTRA_IMAGES.no_alcohol);
      // #v13e 3.B.4: SUEÑO con lógica horaria (4am–6pm resultados / 6pm–4am recomendación).
      case 'sleep': {
        const h = getLocalHour();
        const isMorning = h >= 4 && h < 18;
        const subtitle = isMorning ? 'Tu sueño de anoche' : 'Tu hora de dormir';
        const message = isMorning
          ? 'Conecta Apple Watch / Health Connect para ver tu descanso'
          : 'Conecta tu wearable para personalizar tu hora de dormir';
        return (
          <EditorialCard
            cardKey="sleep" icon="🌙" title="SUEÑO"
            subtitle={subtitle} message={message}
            gradient={['#2C3E50', '#1A1A2E']}
            imageBn={HOY_EXTRA_IMAGES.sueno}
            onTap={() => go('/reports')}
          />
        );
      }
      default:
        return null;
    }
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

      {/* Orden cronológico: 5 sub-secciones con header lima. Una sección sin cards visibles se omite. */}
      {HOY_SECTIONS.map((section) => {
        const cards = section.cardKeys
          .map((k) => { const node = renderCard(k); return node ? <Fragment key={k}>{node}</Fragment> : null; })
          .filter(Boolean);
        if (cards.length === 0) return null;
        return (
          <View key={section.title}>
            <SectionTitle>{section.title}</SectionTitle>
            {cards}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: ATP_BRAND.lime,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    letterSpacing: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
});
