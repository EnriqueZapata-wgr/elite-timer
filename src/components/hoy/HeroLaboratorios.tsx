/**
 * HeroLaboratorios (ATP 3.0, 6-sep-2026, ruta 2.1): lo primero que se ve en
 * HOY bajo el saludo. Una sola dirección para quien llega (subir su estudio)
 * y, para quien ya lo subió, su Edad ATP, su edad real, el delta sin juicio
 * y los tres marcadores de mayor impacto con semáforo.
 *
 * Cuatro estados (regla 13): cargando, "no se pudo leer" con reintentar,
 * sin estudio, con estudio. La decisión vive en hero-laboratorios-core.ts.
 *
 * Tinta: tokens del scope (useSurfaceTokens: HOY monta <ThemeReady>). El
 * lima como texto solo en oscuro; en claro el acento es el teal calibrado.
 * Semáforo con t.exito / t.advertencia / t.critico (regla 5). Glifos de
 * función por <AppIcon>; Ionicons solo cromo (chevron, refresh).
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { CandadoNivel, destinoCandado } from '@/src/components/ui/CandadoNivel';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { useSubscription, SUBSCRIPTION_CHANGED_EVENT } from '@/src/hooks/useSubscription';
import { candadoDeVentaCierra } from '@/src/services/subscription/limites-free-core';
import { warn as logWarn } from '@/src/lib/logger';
import { cargarHeroLaboratorios } from '@/src/services/hoy/hero-laboratorios-service';
import {
  decidirEstadoHero, edadIntegralTexto, textoDeltaEdad, tonoDeltaEdad,
  top3Marcadores, ETIQUETA_ESTADO_HERO, type DatosHero, type MarcadorHero,
} from '@/src/services/hoy/hero-laboratorios-core';
import type { EstadoMarcador } from '@/src/services/subscription/limites-free-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

/** Subir el estudio vive en /my-health (es lo que usa "Subir estudio" en ATP Labs). */
const RUTA_SUBIR = '/my-health' as const;

interface Props {
  userId?: string;
}

function colorEstado(t: AppThemeTokens, estado: EstadoMarcador): string {
  switch (estado) {
    case 'optimo': return t.exito;
    case 'aceptable': return t.advertencia;
    case 'atencion': return t.critico;
    default: return t.textoSecundario;
  }
}

export function HeroLaboratorios({ userId }: Props) {
  const t = useSurfaceTokens();
  const router = useRouter();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const { tier, isLoading: nivelCargando, nivelNoSePudoLeer } = useSubscription();
  // Candado solo cuando SABEMOS que es free (fail-open: ante la duda se abre).
  // 7-sep-2026 (VENTA_AL_PUBLICO): el candado de venta lo decide una sola
  // función. Con la venta al público apagada nunca cierra. Se lee `tier` en vez
  // de `esMiembro` para usar el mismo juez que las otras cuatro superficies.
  const compararConCandado = !nivelCargando && candadoDeVentaCierra(tier, nivelNoSePudoLeer);

  const [datos, setDatos] = useState<DatosHero | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);

  const cargar = useCallback(async () => {
    if (!userId) return;
    setCargando(true);
    try {
      const d = await cargarHeroLaboratorios(userId);
      setDatos(d);
      setFallo(false);
    } catch (e) {
      logWarn('[hero-labs] no se pudo leer', e);
      setFallo(true);
    } finally {
      setCargando(false);
    }
  }, [userId]);

  // Al volver a HOY (después de subir un estudio o calcular la edad) se relee.
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SUBSCRIPTION_CHANGED_EVENT, () => { cargar(); });
    return () => sub.remove();
  }, [cargar]);

  const estado = decidirEstadoHero(datos, cargando, fallo);
  const abrirComparar = () => {
    haptic.light();
    if (compararConCandado) router.push(destinoCandado('comparar', 'premium'));
    else router.push('/edad-atp/comparar');
  };

  const card = [s.card, { backgroundColor: t.card, borderColor: dark ? withOpacity(ATP_BRAND.lime, 0.35) : t.bordeEditorial }];

  if (estado === 'cargando') {
    return (
      <View style={card}>
        <Cabecera acento={acento} texto="TUS LABORATORIOS" />
        <EliteText style={[s.body, { color: t.textoSecundario }]}>Leyendo tus laboratorios...</EliteText>
      </View>
    );
  }

  if (estado === 'no_se_pudo_leer') {
    return (
      <View style={card}>
        <Cabecera acento={acento} texto="TUS LABORATORIOS" />
        <EliteText style={[s.titulo, { color: t.texto }]}>No pudimos leer tus laboratorios</EliteText>
        <EliteText style={[s.body, { color: t.textoSecundario }]}>
          Revisa tu conexión. Tus datos siguen aquí.
        </EliteText>
        <AnimatedPressable
          style={[s.btnQuiet, { borderColor: t.bordeMarcado }]}
          onPress={() => { haptic.light(); cargar(); }}
        >
          <Ionicons name="refresh" size={14} color={t.texto} />
          <EliteText style={[s.btnQuietText, { color: t.texto }]}>Reintentar</EliteText>
        </AnimatedPressable>
      </View>
    );
  }

  if (estado === 'sin_estudio') {
    return (
      <Animated.View entering={FadeInUp.delay(100).springify()} style={card}>
        <Cabecera acento={acento} texto="TU PRIMER PASO" />
        <EliteText style={[s.tituloGrande, { color: t.texto }]}>Sube tu primer estudio</EliteText>
        <EliteText style={[s.body, { color: t.textoSecundario }]}>
          En un minuto tienes tu Edad ATP y qué hacer con ella.
        </EliteText>
        <GradientCTA
          label="SUBIR MI ESTUDIO"
          onPress={() => { haptic.medium(); router.push(RUTA_SUBIR); }}
          style={s.cta}
        />
        <AnimatedPressable
          style={[s.btnQuiet, { borderColor: t.bordeMarcado }]}
          onPress={() => { haptic.light(); router.push('/labs-guide'); }}
        >
          <EliteText style={[s.btnQuietText, { color: t.texto }]}>No tengo estudio</EliteText>
          <Ionicons name="chevron-forward" size={14} color={t.textoSecundario} />
        </AnimatedPressable>
        <EliteText style={[s.pie, { color: t.textoSecundario }]}>
          Te damos la guía de qué laboratorios pedir para llevarla con tu doctor.
        </EliteText>
      </Animated.View>
    );
  }

  // con_estudio
  const d = datos as DatosHero;
  const top = top3Marcadores(d.marcadores);
  const tono = d.edad ? tonoDeltaEdad(d.edad) : 'neutro';
  const colorDelta = tono === 'exito' ? t.exito : tono === 'advertencia' ? t.advertencia : t.textoSecundario;

  return (
    <Animated.View entering={FadeInUp.delay(100).springify()} style={card}>
      <Cabecera acento={acento} texto="TUS LABORATORIOS Y TU EDAD ATP" />
      <AnimatedPressable
        style={s.edadRow}
        onPress={() => { haptic.medium(); router.push(d.edad ? '/edad-atp/result-preview' : '/edad-atp'); }}
      >
        {d.edad ? (
          <>
            <View style={s.edadBloque}>
              <EliteText style={[s.edadGrande, { color: acento }]}>{edadIntegralTexto(d.edad)}</EliteText>
              <EliteText style={[s.edadEtiqueta, { color: t.textoSecundario }]}>EDAD ATP</EliteText>
            </View>
            <View style={s.edadBloque}>
              <EliteText style={[s.edadReal, { color: t.texto }]}>{d.edad.cronologica}</EliteText>
              <EliteText style={[s.edadEtiqueta, { color: t.textoSecundario }]}>EDAD REAL</EliteText>
            </View>
            <View style={{ flex: 1 }}>
              <EliteText style={[s.delta, { color: colorDelta }]}>{textoDeltaEdad(d.edad)}</EliteText>
              <EliteText style={[s.pieChico, { color: t.textoSecundario }]}>Estimación informativa</EliteText>
            </View>
          </>
        ) : (
          <View style={{ flex: 1 }}>
            <EliteText style={[s.titulo, { color: t.texto }]}>Tu estudio ya está aquí</EliteText>
            <EliteText style={[s.body, { color: t.textoSecundario }]}>Calcula tu Edad ATP para ver el número.</EliteText>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
      </AnimatedPressable>

      {top.length > 0 && (
        <View style={s.marcadores}>
          {top.map((m: MarcadorHero) => (
            <AnimatedPressable
              key={m.key}
              style={[s.marcadorRow, { backgroundColor: t.hundido }]}
              onPress={() => { haptic.light(); router.push({ pathname: '/edad-atp/lab/[key]', params: { key: m.key } }); }}
            >
              <View style={[s.punto, { backgroundColor: colorEstado(t, m.estado) }]} />
              <EliteText style={[s.marcadorNombre, { color: t.texto }]} numberOfLines={1}>{m.etiqueta}</EliteText>
              <EliteText style={[s.marcadorEstado, { color: colorEstado(t, m.estado) }]}>{ETIQUETA_ESTADO_HERO[m.estado]}</EliteText>
            </AnimatedPressable>
          ))}
        </View>
      )}

      <GradientCTA
        label={d.edad ? 'VER MI EDAD ATP' : 'CALCULAR MI EDAD ATP'}
        onPress={() => { haptic.medium(); router.push('/edad-atp'); }}
        style={s.cta}
      />
      <AnimatedPressable style={s.compararRow} onPress={abrirComparar}>
        <AppIcon name="salud-evolucion" size={16} color={acento} />
        <EliteText style={[s.compararText, { color: acento }]}>Comparar con mi estudio anterior</EliteText>
        {compararConCandado
          ? <CandadoNivel appKey="comparar" nivel="premium" tocable={false} />
          : <Ionicons name="chevron-forward" size={14} color={acento} />}
      </AnimatedPressable>
    </Animated.View>
  );
}

function Cabecera({ acento, texto }: { acento: string; texto: string }) {
  return (
    <View style={s.headerRow}>
      <View style={[s.iconWrap, { backgroundColor: withOpacity(acento, 0.14) }]}>
        <AppIcon name="labs" size={18} color={acento} />
      </View>
      <EliteText style={[s.label, { color: acento }]}>{texto}</EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2 },
  titulo: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, marginTop: 10 },
  tituloGrande: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xxl, marginTop: 10 },
  body: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 6 },
  pie: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 16, marginTop: 8 },
  pieChico: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },
  cta: { marginTop: Spacing.sm },
  btnQuiet: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 0.5, borderColor: ELEVATION[2].border, borderRadius: 12,
    paddingVertical: 11, marginTop: Spacing.sm,
  },
  btnQuietText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  edadRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  edadBloque: { alignItems: 'flex-start' },
  edadGrande: { fontFamily: Fonts.extraBold, fontSize: FontSizes.mega, lineHeight: 46 },
  edadReal: { fontFamily: Fonts.bold, fontSize: FontSizes.hero, lineHeight: 46 },
  edadEtiqueta: { fontFamily: Fonts.bold, fontSize: 9, letterSpacing: 1.5 },
  delta: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  marcadores: { marginTop: 12, gap: 6 },
  marcadorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12,
  },
  punto: { width: 10, height: 10, borderRadius: 5 },
  marcadorNombre: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  marcadorEstado: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  compararRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm, paddingVertical: 6 },
  compararText: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
