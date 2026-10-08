/**
 * Piezas de PLAN v4 (8-oct-2026 (v4), Fase A). Solo pintan: lo que dicen y a
 * donde llevan lo decide plan-v4-core (con test).
 *
 * Tinta: tokens del tema (claro y oscuro). El lima es micro-acento (la ceja,
 * la barra del programa, el punto de "Hoy") y en claro baja a teal; nunca
 * pinta numeros, porcentajes ni chips enteros. El heroe es una ventana
 * oscura en los dos modos (foto B/N, degradado negro, letra blanca), como la
 * tarjeta editorial de HOY; solo su borde cambia con el tema. Glifos por
 * <AppIcon>; Ionicons solo cromo. Toques de 44 o mas (los chips llevan
 * hitSlop) y haptico ligero en cada uno.
 *
 * Revisión en frío (8-oct-2026 (v4)):
 *  - El chip "Por qué" ya no lleva al Perfil (que no muestra esa razon): se
 *    abre aqui con la razon completa, y solo ofrece "Ver el marcador" cuando
 *    se conoce la llave del marcador.
 *  - Cabecera y barra van en UN heroe del programa con foto.
 */
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import type { AppIconName } from '@/src/components/ui/app-icon-names';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { ATP_BRAND, TEXT, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';
import { FOTO_HERO_PLAN, FOTO_PILAR } from '@/src/components/v4/plan/plan-imagenes';
import type {
  CabeceraPlanV4, ChipPlan, PilarKey, PilarV4, PorQuePlan, PrioridadV4,
} from '@/src/services/plan/plan-v4-core';

/** A donde lleva un toque (rutas del core, algunas con parametro). */
export type IrA = (ruta: string) => void;

export function useTintaPlan() {
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  // Lima solo de micro-acento (ceja, barra, punto de "Hoy"). Iconos, bordes
  // y el resto van en teal o en tinta (8-oct-2026 (v4), revisión en frío).
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const teal = t.tealTexto;
  const borde = dark ? t.borde : t.bordeEditorial;
  return { t, dark, acento, teal, borde };
}

/** Letra del heroe: blanca sobre la foto oscura en los dos modos. */
const BLANCO = TEXT.primary;
const BLANCO_SUAVE = withOpacity('#FFFFFF', 0.72);
const PISTA_BARRA = withOpacity('#FFFFFF', 0.18);
const VENTANA = '#0B0C0E';

// ─── Heroe del programa ─────────────────────────────────────────────────────

/**
 * El programa en una sola tarjeta: ceja (y dueño), nombre, "Semana N de M" y
 * la barra adentro. Sin programa, el heroe neutro "Tu plan de la semana". Sin
 * leer, se dice y se ofrece Reintentar. Fases e hitos no existen todavia
 * (Fase C): no se pintan ni se inventan.
 */
export function HeroPlan({ c, ocupado, onReintentar }: { c: CabeceraPlanV4; ocupado: boolean; onReintentar: () => void }) {
  const { t, dark } = useTintaPlan();
  // En el heroe la barra es lima en los dos modos: la foto siempre es oscura.
  const barra = ATP_BRAND.lime;
  const p = c.progreso;
  return (
    <View
      style={[s.hero, !dark && { borderWidth: 1, borderColor: t.bordeEditorial }]}
      accessible={c.estado !== 'error'}
      accessibilityRole="header"
      accessibilityLabel={[c.ceja, c.dueno, c.accesible, p ? `${p.pct} por ciento del programa` : null].filter(Boolean).join('. ')}
    >
      <Image source={FOTO_HERO_PLAN} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} cachePolicy="memory-disk" />
      <LinearGradient
        colors={[withOpacity('#000000', 0.15), withOpacity('#000000', 0.55), withOpacity('#000000', 0.92)]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.heroCuerpo}>
        <View style={s.cejaFila}>
          <EliteText style={[s.ceja, { color: barra }]}>{c.ceja}</EliteText>
          {c.dueno ? <EliteText style={[s.ceja, { color: BLANCO_SUAVE }]} numberOfLines={1}>{`  ·  ${c.dueno}`}</EliteText> : null}
        </View>
        {c.estado === 'cargando' ? <View style={s.heroHueco} /> : (
          <EliteText style={s.heroTitulo} numberOfLines={3}>{c.titulo}</EliteText>
        )}
        {c.subtitulo ? <EliteText style={s.heroSub}>{c.subtitulo}</EliteText> : null}
        {p ? (
          <View style={s.heroBarraBloque}>
            <View style={[s.barra, { backgroundColor: PISTA_BARRA }]}>
              <View style={[s.barraLlena, { width: `${p.pct}%`, backgroundColor: barra }]} />
            </View>
            <View style={s.heroBarraPie}>
              <EliteText style={s.heroPie}>{p.texto}</EliteText>
              <EliteText style={s.heroPie}>{`${p.pct}%`}</EliteText>
            </View>
          </View>
        ) : null}
        {c.estado === 'error' ? (
          <AnimatedPressable
            style={[s.heroBoton, ocupado && s.ocupado]}
            onPress={() => { haptic.light(); onReintentar(); }}
            disabled={ocupado}
            accessibilityRole="button"
            accessibilityLabel={ocupado ? 'Leyendo' : 'Reintentar'}
            accessibilityState={{ disabled: ocupado, busy: ocupado }}
          >
            <Ionicons name="refresh" size={14} color={BLANCO} />
            <EliteText style={s.heroBotonTexto}>{ocupado ? 'Leyendo...' : 'Reintentar'}</EliteText>
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── Comunes ────────────────────────────────────────────────────────────────

export function Etiqueta({ texto }: { texto: string }) {
  const { t } = useTintaPlan();
  return <EliteText style={[s.etiqueta, { color: t.textoSecundario }]} accessibilityRole="header">{texto}</EliteText>;
}

export function Hueco({ alto = 120 }: { alto?: number }) {
  const { t } = useTintaPlan();
  return <View style={[s.hueco, { height: alto, backgroundColor: t.card }]} />;
}

/** Reintentar. Mientras relee lo dice y no acepta otro toque. */
export function BotonReintentar({ ocupado, onPress }: { ocupado: boolean; onPress: () => void }) {
  const { t } = useTintaPlan();
  const texto = ocupado ? 'Leyendo...' : 'Reintentar';
  return (
    <AnimatedPressable
      style={[s.btnQuieto, { borderColor: t.bordeMarcado }, ocupado && s.ocupado]}
      onPress={() => { haptic.light(); onPress(); }}
      disabled={ocupado}
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ disabled: ocupado, busy: ocupado }}
    >
      <Ionicons name="refresh" size={14} color={t.texto} />
      <EliteText style={[s.btnQuietoTexto, { color: t.texto }]}>{texto}</EliteText>
    </AnimatedPressable>
  );
}

export function Aviso({ texto, ocupado = false, onReintentar }: { texto: string; ocupado?: boolean; onReintentar?: () => void }) {
  const { t, borde } = useTintaPlan();
  return (
    <View style={[s.card, { backgroundColor: t.card, borderColor: borde }]}>
      <EliteText style={[s.cuerpo, { color: t.texto }]}>{texto}</EliteText>
      {onReintentar ? <BotonReintentar ocupado={ocupado} onPress={onReintentar} /> : null}
    </View>
  );
}

/**
 * Un chip. `punto` pone el micro-acento (el de "Hoy"); el chip entero nunca
 * va en lima. El texto siempre dice que es: el color nunca es lo unico.
 */
function ChipBase({ texto, accesible, punto = false, abierto, onPress }: {
  texto: string;
  accesible: string;
  punto?: boolean;
  /** Solo en los que se abren: dice si esta abierto. */
  abierto?: boolean;
  onPress: () => void;
}) {
  const { t, acento } = useTintaPlan();
  return (
    <AnimatedPressable
      style={[s.chip, { backgroundColor: t.hundido, borderColor: abierto ? t.bordeMarcado : t.borde }]}
      onPress={() => { haptic.light(); onPress(); }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accesible}
      accessibilityState={abierto === undefined ? undefined : { expanded: abierto }}
    >
      {punto ? <View style={[s.chipPunto, { backgroundColor: acento }]} /> : null}
      <EliteText style={[s.chipTexto, { color: t.texto }]} numberOfLines={1}>{texto}</EliteText>
      {abierto !== undefined ? (
        <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={12} color={t.textoSecundario} />
      ) : null}
    </AnimatedPressable>
  );
}

export function Chip({ chip, punto = false, onIr }: { chip: ChipPlan; punto?: boolean; onIr: IrA }) {
  return <ChipBase texto={chip.texto} accesible={chip.accesible} punto={punto} onPress={() => onIr(chip.ruta)} />;
}

export function Enlace({ texto, onPress }: { texto: string; onPress: () => void }) {
  const { t } = useTintaPlan();
  return (
    <AnimatedPressable
      style={s.enlace}
      onPress={() => { haptic.light(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={texto}
    >
      <EliteText style={[s.enlaceTexto, { color: t.texto }]}>{texto}</EliteText>
      <Ionicons name="chevron-forward" size={14} color={t.textoSecundario} />
    </AnimatedPressable>
  );
}

// ─── Tus prioridades ────────────────────────────────────────────────────────

/**
 * Las palancas en carrusel: tarjetas grandes con el numero como cifra de
 * display (en tinta, no en lima). "Ver el marcador" solo con llave de
 * marcador; "Ver en tu perfil" solo si el documento trae evaluacion.
 */
export function Prioridades({ lista, onIr }: { lista: PrioridadV4[]; onIr: IrA }) {
  const { t, borde } = useTintaPlan();
  const { width } = useWindowDimensions();
  const ancho = Math.min(340, Math.max(260, Math.round(width * 0.82)));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={ancho + Spacing.sm}
      decelerationRate="fast"
      contentContainerStyle={s.carrusel}
    >
      {lista.map((p) => (
        <View key={p.numero} style={[s.prioridad, { width: ancho, backgroundColor: t.card, borderColor: borde }]}>
          <View accessible accessibilityLabel={`Prioridad ${p.numero}: ${p.titulo}. ${p.porQueCompleto}`}>
            <EliteText style={[s.prioridadNumero, { color: t.textoTenue }]}>{String(p.numero).padStart(2, '0')}</EliteText>
            <EliteText style={[s.prioridadTitulo, { color: t.texto }]} numberOfLines={3}>{p.titulo}</EliteText>
            {p.porQue ? (
              <EliteText style={[s.prioridadPorQue, { color: t.textoSecundario }]} numberOfLines={4}>{p.porQue}</EliteText>
            ) : null}
          </View>
          <View style={s.prioridadPie}>
            {p.enTuPlan ? (
              <Chip chip={{ texto: p.enTuPlan, accesible: `${p.enTuPlan}. Abre tu semana completa.`, ruta: '/mi-plan' }} onIr={onIr} />
            ) : null}
            {p.marcador ? (
              <Enlace texto="Ver el marcador" onPress={() => onIr(`/salud?marcador=${encodeURIComponent(p.marcador!.key)}`)} />
            ) : p.verPerfil ? (
              <Enlace texto="Ver en tu perfil" onPress={() => onIr('/salud')} />
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Pilares ────────────────────────────────────────────────────────────────

function Miniatura({ k }: { k: PilarKey }) {
  const { t } = useTintaPlan();
  return (
    <View style={[s.mini, { backgroundColor: t.hundido }]}>
      <Image source={FOTO_PILAR[k]} style={s.miniFoto} contentFit="cover" transition={150} cachePolicy="memory-disk" accessible={false} />
    </View>
  );
}

/** El porque abierto ahi mismo: la razon completa y, si hay, a donde verla. */
function PorQueAbierto({ q, onIr }: { q: PorQuePlan; onIr: IrA }) {
  const { t } = useTintaPlan();
  return (
    <View style={[s.porQue, { backgroundColor: t.hundido }]}>
      <EliteText style={[s.porQueTexto, { color: t.texto }]}>{q.completo}</EliteText>
      {q.enlaces.map((e) => <Enlace key={e.ruta} texto={e.texto} onPress={() => onIr(e.ruta)} />)}
    </View>
  );
}

export function TarjetaPilar({ p, ocupado, onIr, onReintentar }: {
  p: PilarV4;
  ocupado: boolean;
  onIr: IrA;
  onReintentar: () => void;
}) {
  const { t, borde } = useTintaPlan();
  const [abierto, setAbierto] = useState(false);
  return (
    <View style={[s.pilar, { backgroundColor: t.card, borderColor: borde }]}>
      <View style={s.pilarArriba}>
        <Miniatura k={p.key} />
        <View style={s.pilarTextos}>
          <EliteText style={[s.pilarTitulo, { color: t.textoSecundario }]} accessibilityRole="header">
            {p.titulo.toUpperCase()}
          </EliteText>
          {p.estado === 'ok' ? (
            <EliteText style={[s.pilarResumen, { color: t.texto }]} numberOfLines={2}>{p.resumen}</EliteText>
          ) : p.estado === 'error' ? (
            <EliteText style={[s.pilarResumen, { color: t.texto }]}>No se pudo leer</EliteText>
          ) : (
            <EliteText style={[s.pilarNota, { color: t.textoSecundario }]}>{p.texto}</EliteText>
          )}
        </View>
      </View>
      {p.estado === 'error' ? <BotonReintentar ocupado={ocupado} onPress={onReintentar} /> : null}
      {p.estado === 'vacio' && p.cta ? <Enlace texto={p.cta.texto} onPress={() => onIr(p.cta!.ruta)} /> : null}
      {p.estado === 'ok' ? (
        <>
          {p.porQue || p.hoy ? (
            <View style={s.chips}>
              {p.porQue ? (
                <ChipBase texto={p.porQue.texto} accesible={p.porQue.accesible} abierto={abierto} onPress={() => setAbierto((v) => !v)} />
              ) : null}
              {p.hoy ? <Chip chip={p.hoy} punto onIr={onIr} /> : null}
            </View>
          ) : null}
          {abierto && p.porQue ? <PorQueAbierto q={p.porQue} onIr={onIr} /> : null}
          {p.parcial ? (
            <View style={s.parcial}>
              <EliteText style={[s.pilarNota, { color: t.textoSecundario }]}>{p.parcial}</EliteText>
              <BotonReintentar ocupado={ocupado} onPress={onReintentar} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// ─── Filas de lista (programa y expediente) ─────────────────────────────────

export function Grupo({ titulo, children }: { titulo?: string; children: ReactNode }) {
  const { t, borde } = useTintaPlan();
  return (
    <View style={s.grupo}>
      {titulo ? <Etiqueta texto={titulo} /> : null}
      <View style={[s.lista, { backgroundColor: t.card, borderColor: borde }]}>{children}</View>
    </View>
  );
}

export function Fila({ icon, titulo, detalle, ultima, onPress }: {
  icon: AppIconName;
  titulo: string;
  detalle: string | null;
  ultima: boolean;
  onPress: () => void;
}) {
  const { t, teal } = useTintaPlan();
  return (
    <AnimatedPressable
      style={[s.fila, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.borde }]}
      onPress={() => { haptic.light(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={detalle ? `${titulo}: ${detalle}` : titulo}
    >
      <View style={[s.iconWrap, { backgroundColor: t.hundido }]}>
        <AppIcon name={icon} size={18} color={teal} />
      </View>
      <View style={s.filaTextos}>
        <EliteText style={[s.filaTitulo, { color: t.texto }]} numberOfLines={1}>{titulo}</EliteText>
        {detalle ? <EliteText style={[s.filaDetalle, { color: t.textoSecundario }]} numberOfLines={1}>{detalle}</EliteText> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
    </AnimatedPressable>
  );
}

/** El boton ancho de "Tu semana completa". */
export function BotonAncho({ texto, detalle, onPress }: { texto: string; detalle: string; onPress: () => void }) {
  const { t } = useTintaPlan();
  return (
    <AnimatedPressable
      style={[s.ancho, { borderColor: t.bordeMarcado, backgroundColor: t.card }]}
      onPress={() => { haptic.light(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`${texto}. ${detalle}`}
    >
      <View style={s.filaTextos}>
        <EliteText style={[s.anchoTexto, { color: t.texto }]}>{texto}</EliteText>
        <EliteText style={[s.filaDetalle, { color: t.textoSecundario }]}>{detalle}</EliteText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.texto} />
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  hero: {
    marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.lg, borderRadius: Radius.lg,
    overflow: 'hidden', minHeight: 280, justifyContent: 'flex-end', backgroundColor: VENTANA,
  },
  heroCuerpo: { padding: Spacing.lg, paddingTop: Spacing.xxl },
  cejaFila: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
  ceja: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 2 },
  heroTitulo: { fontFamily: Fonts.bold, fontSize: FontSizes.display, lineHeight: 38, color: BLANCO },
  heroHueco: { height: 38, width: '60%', borderRadius: 8, backgroundColor: PISTA_BARRA },
  heroSub: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg, color: BLANCO_SUAVE, marginTop: 6 },
  heroBarraBloque: { marginTop: Spacing.md },
  heroBarraPie: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  heroPie: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: BLANCO_SUAVE },
  heroBoton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.md,
    minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: BLANCO_SUAVE, alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
  },
  heroBotonTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: BLANCO },
  barra: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barraLlena: { height: 6, borderRadius: 3 },
  card: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderWidth: 0.5, borderRadius: Radius.md, padding: Spacing.md,
  },
  etiqueta: {
    fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 2,
    marginHorizontal: Spacing.md + 2, marginBottom: 12,
  },
  hueco: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radius.md, opacity: 0.5 },
  cuerpo: { fontFamily: Fonts.regular, fontSize: FontSizes.md, lineHeight: 20 },
  btnQuieto: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 0.5, borderRadius: 12, minHeight: 44, marginTop: Spacing.sm,
  },
  btnQuietoTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  ocupado: { opacity: 0.6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 0.5, borderRadius: Radius.pill,
    paddingHorizontal: 12, minHeight: 32, maxWidth: '100%',
  },
  chipPunto: { width: 6, height: 6, borderRadius: 3 },
  chipTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  enlaceTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  carrusel: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: 4 },
  prioridad: {
    borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.lg, minHeight: 260, justifyContent: 'space-between',
  },
  prioridadNumero: { fontFamily: Fonts.extraBold, fontSize: FontSizes.mega, lineHeight: 46, marginBottom: Spacing.sm },
  prioridadTitulo: { fontFamily: Fonts.bold, fontSize: FontSizes.xl, lineHeight: 24 },
  prioridadPorQue: { fontFamily: Fonts.regular, fontSize: FontSizes.md, lineHeight: 20, marginTop: Spacing.sm },
  prioridadPie: { marginTop: Spacing.md, gap: 4, alignItems: 'flex-start' },
  pilar: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 0.5, borderRadius: Radius.md, padding: 14,
  },
  pilarArriba: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pilarTextos: { flex: 1, gap: 3 },
  pilarTitulo: { fontFamily: Fonts.bold, fontSize: FontSizes.xs, letterSpacing: 2 },
  pilarResumen: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg, lineHeight: 22 },
  pilarNota: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 18 },
  parcial: { marginTop: 10 },
  porQue: { marginTop: 10, borderRadius: Radius.card, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2 },
  porQueTexto: { fontFamily: Fonts.regular, fontSize: FontSizes.md, lineHeight: 20, marginBottom: 6 },
  mini: { width: 72, height: 72, borderRadius: Radius.card, overflow: 'hidden' },
  miniFoto: { width: '100%', height: '100%' },
  grupo: { marginBottom: Spacing.lg },
  lista: { marginHorizontal: Spacing.md, borderWidth: 0.5, borderRadius: Radius.md, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 14 },
  filaTextos: { flex: 1, gap: 2 },
  filaTitulo: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  filaDetalle: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 17 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ancho: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 0.5, borderRadius: Radius.md, paddingHorizontal: Spacing.md, minHeight: 64,
  },
  anchoTexto: { fontFamily: Fonts.semiBold, fontSize: FontSizes.lg },
});
