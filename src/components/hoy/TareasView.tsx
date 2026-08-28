/**
 * TareasView — el checklist del día con dos lentes (MB-20 Pieza 1).
 *
 * TAREAS: bloques mañana/tarde/noche con progreso por bloque y global.
 * AGENDA: la MISMA lista ordenada por hora. Nunca dos listas, nunca dos
 * fuentes: todo sale de CompiledDay vía tareas-core.
 *
 * Los horarios finos y las notificaciones por evento se editan en /agenda
 * (la puerta vive en la lente AGENDA).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { useSystemReducedMotion } from '@/src/components/ui/useSystemReducedMotion';
import { ArgosOrb } from '@/src/components/argos/ArgosOrb';
import { TareaRow } from '@/src/components/hoy/TareaRow';
import { TareaCard } from '@/src/components/hoy/TareaCard';
import { TareaHechaRow } from '@/src/components/hoy/TareaHechaRow';
import { tareaImage } from '@/src/components/hoy/tarea-images';
import { NUDGE_COPY } from '@/src/components/hoy/tarea-gesto-core';
import { MomentoBanda } from '@/src/components/hoy/MomentoBanda';
import { OrbCard } from '@/src/components/hoy/OrbCard';
import {
  buildTareas, agendaLens, repartoTareas, ofrecerArmarDia,
  type Tarea,
} from '@/src/services/hoy/tareas-core';
import {
  seccionForTarea, datoForTarea, datoCierreForTarea, pickHeroTarea,
} from '@/src/services/hoy/tareas-editorial-core';
import { persistBooleanToggle } from '@/src/services/hoy/tarea-actions';
import { addWater } from '@/src/services/hydration-service';
import {
  canShowNudge, markNudgeShown, NUDGE_THRESHOLD, RECHECK_ACCIDENTE_MS,
} from '@/src/services/hoy/nudge-store';
import { fmtQuant, type CompiledDay } from '@/src/services/day-compiler';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';

/** Optimismo local del agua: de que dia es, cuanto, y desde cuando. */
interface AguaOverride { fecha: string; ml: number; desde: number }
/** Techo del optimismo. Un compile normal tarda mucho menos; pasado esto, la
 *  verdad de la base manda aunque no coincida con lo que pintamos. */
const AGUA_OVERRIDE_MAX_MS = 20_000;
import { APP_SECTION_COLORS, ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

type Lens = 'tareas' | 'agenda';

interface UvMini {
  current: number;
  vitaminD?: string;
}

interface Props {
  day: CompiledDay;
  userId?: string;
  uvMini?: UvMini | null;
}

export function TareasView({ day, userId, uvMini }: Props) {
  const router = useRouter();
  const reducedMotion = useSystemReducedMotion();
  // MB-31B: superficies y texto del scope. El lima como texto (lente activa,
  // enlaces) solo vive en oscuro; en claro pasa a relleno sólido o teal.
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const [lens, setLens] = useState<Lens>('tareas');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // HID-1: el agua no tenia optimismo local. handleInline solo esperaba a la
  // red, y el numero salia de CompiledDay, asi que era fisicamente imposible
  // que subiera antes de que terminara el recompile del dia entero. La prueba
  // de que ese era el problema: /hydration SI es optimista y de esa pantalla
  // nadie se quejo nunca. Aqui se replica el mismo patron que ya usan los
  // palomeos tres lineas abajo.
  // 4EP: el override es DUENO DE SU FECHA. Sin eso, al cruzar la medianoche el
  // compilado del dia nuevo traia 0 ml, la liberacion por `real >= override` no
  // se cumplia nunca, y HOY se quedaba pintando el agua de AYER como si fuera de
  // hoy, con la tarea marcada como cumplida y sin botones para corregirla
  // (las tareas hechas no reciben onInline). Un numero inventado que no se podia
  // quitar. Eso es exactamente lo que la doctrina del dato sagrado prohibe.
  const [aguaOverride, setAguaOverride] = useState<AguaOverride | null>(null);
  // Espejo en ref: handleInline necesita el valor VIGENTE, no el del closure.
  const aguaOverrideRef = useRef<AguaOverride | null>(null);
  const aplicarAgua = useCallback((v: Omit<AguaOverride, 'desde'> | null) => {
    const con = v == null ? null : { ...v, desde: Date.now() };
    aguaOverrideRef.current = con;
    setAguaOverride(con);
  }, []);
  const [nudgeVisible, setNudgeVisible] = useState(false);

  // ── Fuente única + overrides optimistas ──
  const result = useMemo(() => {
    const boolWithOverrides = day.booleanElectrons.map((e) =>
      overrides[e.source] != null ? { ...e, completed: overrides[e.source] } : e,
    );
    // El override solo pinta si es del MISMO dia que el compilado.
    const agua = aguaOverride && aguaOverride.fecha === day.date ? aguaOverride.ml : null;
    const quantWithOverrides = agua == null
      ? day.quantitativeElectrons
      : day.quantitativeElectrons.map((q) => (q.source === 'water'
        ? { ...q, current: agua, displayCurrent: fmtQuant('water', agua) }
        : q));
    return buildTareas({
      booleanElectrons: boolWithOverrides,
      quantitativeElectrons: quantWithOverrides,
      agendaItems: day.agendaItems,
      habitTimes: day.habitTimes,
      horaFuentes: day.horaFuentes,
    });
  }, [day, overrides, aguaOverride]);

  // 4EP: se suelta por IGUALDAD y SOLO con un `day` nuevo. Antes tenia
  // `aguaOverride` en las deps y comparaba con `>=`, asi que al restar 250 el
  // efecto corria en el mismo render que lo puso, veia que el compilado (1000)
  // era mayor que el optimista (750) y lo mataba en el acto: el boton de menos
  // parecia no responder, y la persona volvia a picarlo. La UI provocaba que se
  // restara el doble.
  useEffect(() => {
    const ov = aguaOverrideRef.current;
    if (ov == null) return;
    if (ov.fecha !== day.date) { aplicarAgua(null); return; }
    const real = day.quantitativeElectrons.find((q) => q.source === 'water')?.current;
    // Caduca: si el compilado trae OTRO numero (agua registrada desde
    // /hydration o desde otro telefono), la igualdad no se cumpliria nunca y el
    // override taparia la verdad para siempre. Pasado el techo, manda la base.
    if (Date.now() - ov.desde > AGUA_OVERRIDE_MAX_MS) { aplicarAgua(null); return; }
    if (real != null && real === ov.ml) aplicarAgua(null);
  }, [day, aplicarAgua]);

  // Los overrides se sueltan cuando el compilado los alcanza.
  useEffect(() => {
    setOverrides((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const e of day.booleanElectrons) {
        if (next[e.source] != null && next[e.source] === e.completed) {
          delete next[e.source];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [day]);

  const agendaItems = useMemo(() => agendaLens(result), [result]);

  // ── MB-20.1 · 2.1: el héroe de AGENDA — lo que importa ahora, por hora ──
  const heroTarea = useMemo(() => {
    const now = new Date();
    return pickHeroTarea(agendaItems, now.getHours() * 60 + now.getMinutes());
  }, [agendaItems]);

  // ── MB-20.1: el muro encoge — hechas arriba como cinta, bloques solo con
  // pendientes. La fuente sigue siendo la misma (result); esto es reparto
  // puro en tareas-core (MB-20.2 · 1.3, con test). ──
  const { hechas, pendingBlocks } = useMemo(
    () => repartoTareas(agendaItems, result.blocks),
    [agendaItems, result.blocks],
  );

  // ── La burbuja contextual del gesto (1.4, invertida en MB-20.4) ──
  // El patrón viejo (tap → navegar → regresar sin completar) murió con el
  // gesto: en las palomeables el tap ya no navega. La señal de confusión que
  // queda (MB-20.5, con el modal muerto) es la del toque accidental:
  // despalomear una fila hecha y re-palomearla en segundos (tocó el ledger),
  // detectada en handlePalomear.
  const bounceCountRef = useRef(0);
  const uncheckAtRef = useRef<Record<string, number>>({});
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const senalGesto = useCallback(() => {
    bounceCountRef.current += 1;
    if (bounceCountRef.current < NUDGE_THRESHOLD) return;
    bounceCountRef.current = 0;
    canShowNudge().then((can) => {
      if (!can) return;
      markNudgeShown();
      setNudgeVisible(true);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      nudgeTimerRef.current = setTimeout(() => setNudgeVisible(false), 8000);
    });
  }, []);
  useEffect(() => () => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
  }, []);

  // ── Handlers de gesto ──
  const handleNavigate = useCallback((t: Tarea) => {
    if (!t.route) return;
    router.push(t.route as never);
  }, [router]);

  const handlePalomear = useCallback((t: Tarea) => {
    if (!userId) return;
    const next = !t.completed;
    // Señal del nudge: despalomeo que se corrige en segundos = toque
    // accidental sobre una hecha.
    if (!next) {
      uncheckAtRef.current[t.key] = Date.now();
    } else {
      const uncheckedAt = uncheckAtRef.current[t.key];
      delete uncheckAtRef.current[t.key];
      if (uncheckedAt != null && Date.now() - uncheckedAt <= RECHECK_ACCIDENTE_MS) senalGesto();
    }
    setOverrides((prev) => ({ ...prev, [t.key]: next }));
    const currentStates: Record<string, boolean> = {};
    for (const e of day.booleanElectrons) currentStates[e.source] = e.completed;
    persistBooleanToggle(userId, t.key, next, currentStates).catch((e) => {
      setOverrides((prev) => ({ ...prev, [t.key]: t.completed }));
      logWarn('[TareasView] palomeo failed, reverted', e);
      Alert.alert('No se pudo guardar', 'Inténtalo de nuevo en un momento.');
    });
  }, [userId, day, senalGesto]);

  // Los tres botones de la card de agua (+250/+500/−250, decisión de
  // Enrique) pasan su delta con signo; addWater clampa en 0.
  const handleInline = useCallback(async (t: Tarea, deltaMl: number) => {
    if (!userId || t.key !== 'water') return;
    const fecha = day.date;
    const compilado = day.quantitativeElectrons.find((q) => q.source === 'water')?.current ?? 0;
    // Del REF, no del closure: dos toques seguidos dentro del mismo batch leian
    // los dos el mismo valor viejo y el segundo pisaba al primero.
    const previo = aguaOverrideRef.current;
    const antes = previo && previo.fecha === fecha ? previo.ml : compilado;
    // addWater clampa en 0 del lado del servicio; aqui se clampa igual para que
    // lo que se ve y lo que se guarda no puedan discrepar.
    aplicarAgua({ fecha, ml: Math.max(0, antes + deltaMl) });
    try {
      const r = await addWater(userId, deltaMl);
      if (r === null) throw new Error('addWater returned null');
      // El servidor manda: si clampo distinto, gana su numero.
      aplicarAgua({ fecha, ml: r });
    } catch (e) {
      aplicarAgua(antes === compilado ? null : { fecha, ml: antes });
      logWarn('[TareasView] addWater failed, reverted', e);
      Alert.alert('No se pudo registrar', 'Inténtalo de nuevo en un momento.');
    }
  }, [userId, day, aplicarAgua]);

  const rowProps = {
    onNavigate: handleNavigate,
    onPalomear: handlePalomear,
    onInline: handleInline,
  };

  const pctGlobal = result.global.total > 0 ? result.global.done / result.global.total : 0;

  // ── MB-20.1 · Pieza 1: la lente TAREAS con piel editorial ──
  // MB-20.4 · Pieza 3: este viaje ES la confirmación del palomeo. Con el tap
  // no hay hold ni llenado: al palomear, la card encoge hasta su renglón y
  // VIAJA al bloque de hechas (imposible no verlo); al despalomear desde
  // HECHAS, el camino inverso. En AGENDA, que no reordena, confirman la
  // paloma pintada y la fila atenuada. Para que reanimated anime el viaje,
  // todos los elementos viven PLANOS bajo un mismo padre con llave estable
  // (un wrapper por bloque rompería la continuidad del instance).
  // Con reduce motion NO hay transición de layout (undefined), no "una más
  // sobria": LinearTransition pelón seguía animando 300 ms y el código decía
  // una cosa haciendo otra (nota del audit MB-20.2). La confirmación queda
  // en la vibración y el cambio de estado instantáneo.
  const rowLayout = reducedMotion ? undefined : LinearTransition.springify().damping(18);
  const hoy = getLocalToday();
  const seedBase = `${userId ?? ''}-${hoy}`;
  const colorDeSeccion = (t: Tarea) => APP_SECTION_COLORS[seccionForTarea(t.key)];

  const tareasChildren: ReactNode[] = [];
  if (lens === 'tareas') {
    if (hechas.length > 0) {
      tareasChildren.push(
        <Animated.View key="header-hechas" layout={rowLayout} style={s.blockHeader}>
          <EliteText style={[s.blockLabel, { color: t.textoSecundario }]}>HECHAS</EliteText>
          <EliteText style={[s.blockCount, { color: t.sinDatos }]}>{hechas.length}</EliteText>
        </Animated.View>,
      );
      for (const t of hechas) {
        tareasChildren.push(
          <Animated.View key={t.key} layout={rowLayout}>
            <TareaHechaRow
              tarea={t}
              sectionColor={colorDeSeccion(t)}
              dato={datoCierreForTarea(t, day.datosVivos, hoy)}
              onNavigate={handleNavigate}
              onPalomear={handlePalomear}
            />
          </Animated.View>,
        );
      }
    }
    for (const b of pendingBlocks) {
      tareasChildren.push(
        <Animated.View
          key={`header-${b.momento}`}
          layout={rowLayout}
          style={s.blockHeader}
        >
          <EliteText style={[s.blockLabel, { color: t.textoSecundario }]}>{b.label}</EliteText>
          <EliteText style={[s.blockCount, { color: t.sinDatos }]}>{b.done} de {b.total}</EliteText>
        </Animated.View>,
      );
      for (const t of b.pending) {
        tareasChildren.push(
          <Animated.View key={t.key} layout={rowLayout}>
            <TareaCard
              tarea={t}
              sectionColor={colorDeSeccion(t)}
              image={tareaImage(t.key, `${seedBase}-${t.key}`)}
              dato={datoForTarea(t, uvMini, day.datosVivos, hoy)}
              onNavigate={handleNavigate}
              onPalomear={handlePalomear}
              onInline={handleInline}
            />
          </Animated.View>,
        );
      }
    }
  }

  return (
    <View>
      {/* Lentes */}
      <View style={s.lensRow}>
        {(['tareas', 'agenda'] as Lens[]).map((l) => (
          <Pressable
            key={l}
            onPress={() => { haptic.light(); setLens(l); }}
            style={[
              s.lensPill,
              !dark && { backgroundColor: t.card, borderColor: t.borde },
              lens === l && (dark ? s.lensPillOn : { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime }),
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: lens === l }}
          >
            <EliteText
              style={[
                s.lensText,
                { color: t.textoSecundario },
                lens === l && { color: dark ? ATP_BRAND.lime : t.textoSobreLima },
              ]}
            >
              {l === 'tareas' ? 'Tareas' : 'Agenda'}
            </EliteText>
          </Pressable>
        ))}
      </View>

      {/* Progreso global */}
      <View style={s.globalRow}>
        <View style={[s.globalTrack, !dark && { backgroundColor: t.hundido }]}>
          <View style={[s.globalFill, { width: `${Math.round(pctGlobal * 100)}%` }]} />
        </View>
        <EliteText style={[s.globalText, { color: t.texto }]}>
          {result.global.done} de {result.global.total}
        </EliteText>
      </View>

      {/* Burbuja del gesto (1.4): el copy vive en tarea-gesto-core junto a
          la tabla que describe, amarrado con test (P5.2). */}
      {nudgeVisible && (
        <View style={s.nudge}>
          <ArgosOrb size={18} reducedMotion />
          <EliteText style={[s.nudgeText, { color: t.texto }]}>{NUDGE_COPY}</EliteText>
        </View>
      )}

      <OrbCard userId={userId} />

      {/* CIERRE-1: el día casi vacío, con UNA sola salida.
          HOY nunca tuvo estado vacío porque nunca hizo falta: llegaba con 13
          tareas puestas por default y la barra en cero. Al sembrar solo lo
          que el usuario eligió, este estado pasa a existir de verdad, y un
          día corto sin salida se lee como una app que no trae nada.
          Es UNA acción, no un menú, y no es un muro: las tareas siguen
          debajo. Guiado, no prisionero. Se apaga sola en cuanto el día
          crece por encima del techo de 8. */}
      {ofrecerArmarDia(result.global.total) ? (
        <Pressable
          onPress={() => { haptic.light(); router.push('/packs/armar'); }}
          style={({ pressed }) => [
            s.armarDia,
            { backgroundColor: t.card, borderColor: t.borde },
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Armar mi app"
        >
          <Ionicons name="color-wand-outline" size={16} color={acento} />
          <View style={{ flex: 1 }}>
            <EliteText style={[s.armarDiaTitulo, { color: t.texto }]}>
              Tu día está corto a propósito
            </EliteText>
            <EliteText style={[s.armarDiaSub, { color: t.textoSecundario }]}>
              Dos preguntas y te lo armamos con lo que quieres cambiar primero
            </EliteText>
          </View>
          <Ionicons name="chevron-forward" size={14} color={t.textoTenue} />
        </Pressable>
      ) : null}

      {lens === 'tareas' ? (
        <View>{tareasChildren}</View>
      ) : (
        <>
          {/* El héroe editorial: una sola card grande que cambia con la hora. */}
          {heroTarea ? (
            <TareaCard
              tarea={heroTarea}
              sectionColor={colorDeSeccion(heroTarea)}
              image={tareaImage(heroTarea.key, `${seedBase}-${heroTarea.key}`)}
              dato={datoForTarea(heroTarea, uvMini, day.datosVivos, hoy)}
              badge="AHORA"
              onNavigate={handleNavigate}
              onPalomear={handlePalomear}
              onInline={handleInline}
            />
          ) : null}
          {/* Bandas editoriales por bloque; las filas se quedan compactas.
              MB-20.2 · 3.1: la tarea del héroe NO se repite como fila — dos
              superficies palomeables para lo mismo era un bug de honestidad.
              El contador de la banda sí la incluye (es progreso real). */}
          {result.blocks.map((b) => (
            <View key={b.momento}>
              <MomentoBanda momento={b.momento} label={b.label} done={b.done} total={b.total} />
              {b.items
                .filter((t) => t.key !== heroTarea?.key)
                .map((t) => (
                  <TareaRow key={t.key} tarea={t} lens="agenda" accentColor={colorDeSeccion(t)} {...rowProps} />
                ))}
            </View>
          ))}
          <Pressable
            onPress={() => { haptic.light(); router.push('/agenda'); }}
            style={({ pressed }) => [s.agendaLink, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="notifications-outline" size={13} color={acento} />
            <EliteText style={[s.agendaLinkText, { color: acento }]}>Horarios y notificaciones</EliteText>
            <Ionicons name="chevron-forward" size={12} color={acento} />
          </Pressable>
        </>
      )}

      {/* Pie: UV ahora + agregar hábito */}
      <View style={s.footerRow}>
        {uvMini ? (
          <Pressable
            onPress={() => { haptic.light(); router.push('/solar'); }}
            style={({ pressed }) => [s.uvChip, pressed && { opacity: 0.6 }]}
          >
            <EliteText style={[s.uvText, { color: t.textoSecundario }]}>
              UV {uvMini.current} ahora{uvMini.vitaminD ? ` · ${uvMini.vitaminD}` : ''}
            </EliteText>
          </Pressable>
        ) : <View />}
        <Pressable
          onPress={() => { haptic.light(); router.push({ pathname: '/kit', params: { agregar: '1' } }); }}
          style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.6 }]}
          accessibilityLabel="Agregar hábito"
        >
          <Ionicons name="add" size={14} color={acento} />
          <EliteText style={[s.addText, { color: acento }]}>agregar</EliteText>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  lensRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  lensPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  lensPillOn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    borderColor: ATP_BRAND.lime,
  },
  lensText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  globalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.md,
  },
  globalTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  globalFill: { height: '100%', borderRadius: 3, backgroundColor: ATP_BRAND.lime },
  globalText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.1),
    borderWidth: 0.5,
    borderColor: withOpacity(ATP_BRAND.lime, 0.35),
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: Spacing.md,
  },
  nudgeText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    marginBottom: 8,
  },
  blockLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
  },
  blockCount: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },
  // CIERRE-1: card discreta, no un muro. Es una oferta, no un bloqueo.
  armarDia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  armarDiaTitulo: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  armarDiaSub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 1 },
  agendaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
  },
  agendaLinkText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  uvChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  uvText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: withOpacity(ATP_BRAND.lime, 0.4),
  },
  addText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
  },
});
