/**
 * HeroEvaluacionElite (20-sep-2026): lo primero que ve un cliente Elite en
 * HOY cuando su evaluacion ya esta cargada. La Edad ATP que Enrique le puso
 * (`inicio.edad_atp`) junto a su edad real, la fecha de la toma, sus propias
 * palabras (`inicio.lead`) y los tres marcadores en atencion segun el
 * `estado` que Enrique escribio, no segun la matriz V7 de la app. Todo abre
 * la evaluacion: esta tarjeta es la portada de su producto, no un resumen
 * de la app.
 *
 * Aqui viven tambien las otras dos caras del hero Elite: "Enrique esta
 * preparando tu evaluacion" (cliente Elite sin evaluacion cargada; nunca
 * "sube tu estudio") y "no se pudo leer" con reintentar (regla 7). La
 * decision de cual pintar es de elite-hoy-core (decidirHeroElite); la toma
 * HeroLaboratorios, que sigue siendo el hero de quien no es Elite.
 *
 * Tinta: tokens del scope. Estados con t.critico / t.advertencia / t.exito,
 * como en Mi evaluacion Elite (etiquetaEstado). Glifos por <AppIcon>;
 * Ionicons solo cromo (chevron, refresh). Cero em dashes en copy.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import type { EliteMarcador, EliteV3 } from '@/src/services/elite/elite-v3-core';
import { etiquetaEstado, formatearFecha, type TokenEstado } from '@/src/services/elite/evaluacion-elite-core';
import { cuentaPidenAccion, edadesDeEvaluacion, lineaPidenAccion, marcadoresEliteParaHero } from '@/src/services/hoy/elite-hoy-core';
import { edadIntegralTexto, textoDeltaEdad, tonoDeltaEdad } from '@/src/services/hoy/hero-laboratorios-core';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, ELEVATION, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { NOMBRE_COACH_ELITE } from '@/src/constants/lanzamiento';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

const RUTA_EVALUACION = '/salud/evaluacion-elite' as const;
/** El nombre del coach vive en un solo sitio (lanzamiento.ts); aqui solo se pone en mayusculas. */
const ETIQUETA = `TU EVALUACIÓN CON ${NOMBRE_COACH_ELITE.toUpperCase()}`;

function colorToken(t: AppThemeTokens, token: TokenEstado | null): string {
  switch (token) {
    case 'critico': return t.critico;
    case 'advertencia': return t.advertencia;
    case 'exito': return t.exito;
    default: return t.textoSecundario;
  }
}

function useCard() {
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';
  const acento = dark ? ATP_BRAND.lime : t.tealTexto;
  const card = [s.card, { backgroundColor: t.card, borderColor: dark ? withOpacity(ATP_BRAND.lime, 0.35) : t.bordeEditorial }];
  return { t, dark, acento, card };
}

function Cabecera({ acento, texto = ETIQUETA }: { acento: string; texto?: string }) {
  return (
    <View style={s.headerRow}>
      <View style={[s.iconWrap, { backgroundColor: withOpacity(acento, 0.14) }]}>
        <AppIcon name="evaluaciones" size={18} color={acento} />
      </View>
      <EliteText style={[s.label, { color: acento }]}>{texto}</EliteText>
    </View>
  );
}

/** La evaluacion cargada. */
export function HeroEvaluacionElite({ e }: { e: EliteV3 }) {
  const { t, acento, card } = useCard();
  const router = useRouter();
  const edad = edadesDeEvaluacion(e);
  const top = marcadoresEliteParaHero(e);
  const piden = cuentaPidenAccion(e);
  const tono = edad ? tonoDeltaEdad(edad) : 'neutro';
  const colorDelta = tono === 'exito' ? t.exito : tono === 'advertencia' ? t.advertencia : t.textoSecundario;
  const abrir = (seccion?: string) => {
    haptic.medium();
    if (seccion) router.push({ pathname: RUTA_EVALUACION, params: { seccion } });
    else router.push(RUTA_EVALUACION);
  };

  return (
    <Animated.View entering={FadeInUp.delay(100).springify()} style={card}>
      <Cabecera acento={acento} />

      <AnimatedPressable style={s.edadRow} onPress={() => abrir('inicio')} accessibilityRole="button" accessibilityLabel="Abrir mi evaluación">
        {edad ? (
          <>
            <View style={s.edadBloque}>
              <EliteText style={[s.edadGrande, { color: acento }]}>{edadIntegralTexto(edad)}</EliteText>
              <EliteText style={[s.edadEtiqueta, { color: t.textoSecundario }]}>EDAD ATP</EliteText>
            </View>
            <View style={s.edadBloque}>
              <EliteText style={[s.edadReal, { color: t.texto }]}>{edad.cronologica}</EliteText>
              <EliteText style={[s.edadEtiqueta, { color: t.textoSecundario }]}>EDAD REAL</EliteText>
            </View>
            <View style={{ flex: 1 }}>
              <EliteText style={[s.delta, { color: colorDelta }]}>{textoDeltaEdad(edad)}</EliteText>
              <EliteText style={[s.pieChico, { color: t.textoSecundario }]}>Toma de {formatearFecha(e.cliente.fecha_toma)}</EliteText>
            </View>
          </>
        ) : (
          <View style={{ flex: 1 }}>
            <EliteText style={[s.titulo, { color: t.texto }]}>Tu evaluación está lista</EliteText>
            <EliteText style={[s.pieChico, { color: t.textoSecundario }]}>Toma de {formatearFecha(e.cliente.fecha_toma)}</EliteText>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
      </AnimatedPressable>

      {e.inicio.lead ? (
        <EliteText style={[s.lead, { color: t.texto }]} numberOfLines={3}>{e.inicio.lead}</EliteText>
      ) : null}

      {top.length > 0 && (
        <View style={s.marcadores}>
          {top.map((m: EliteMarcador) => {
            const est = etiquetaEstado(m.estado);
            const color = colorToken(t, est.token);
            return (
              <AnimatedPressable
                key={m.key}
                style={[s.marcadorRow, { backgroundColor: t.hundido }]}
                onPress={() => abrir('marcadores')}
                accessibilityRole="button"
                accessibilityLabel={`${m.nombre}: ${est.texto}`}
              >
                <EliteText style={[s.simbolo, { color }]}>{est.simbolo}</EliteText>
                <EliteText style={[s.marcadorNombre, { color: t.texto }]} numberOfLines={1}>{m.nombre}</EliteText>
                <EliteText style={[s.marcadorEstado, { color }]}>{est.texto}</EliteText>
              </AnimatedPressable>
            );
          })}
          <EliteText style={[s.pie, { color: t.textoSecundario }]}>{lineaPidenAccion(piden)}</EliteText>
        </View>
      )}

      <GradientCTA label="VER MI EVALUACIÓN" onPress={() => abrir()} style={s.cta} />
      <EliteText style={[s.firma, { color: t.textoSecundario }]}>
        Interpretada por {e.interpretado_por.evaluacion} · versión {e.version}
      </EliteText>
    </Animated.View>
  );
}

/** Cliente Elite sin evaluacion cargada todavia. No se le pide subir nada. */
export function HeroEliteEnCamino({ onActualizar }: { onActualizar: () => void }) {
  const { t, acento, card } = useCard();
  return (
    <Animated.View entering={FadeInUp.delay(100).springify()} style={card}>
      <Cabecera acento={acento} />
      <EliteText style={[s.tituloGrande, { color: t.texto }]}>{NOMBRE_COACH_ELITE} está preparando tu evaluación</EliteText>
      <EliteText style={[s.body, { color: t.textoSecundario }]}>
        Cuando la termine, aquí vas a ver tu Edad ATP, tus marcadores y tu plan. No necesitas subir nada.
      </EliteText>
      <AnimatedPressable
        style={[s.btnQuiet, { borderColor: t.bordeMarcado }]}
        onPress={() => { haptic.light(); onActualizar(); }}
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={14} color={t.texto} />
        <EliteText style={[s.btnQuietText, { color: t.texto }]}>Actualizar</EliteText>
      </AnimatedPressable>
    </Animated.View>
  );
}

/**
 * Sabemos que hay algo Elite y no se pudo leer. Nunca "no tienes evaluacion".
 * `formato`: la fila existe y esta version de la app no la entiende; ahi lo
 * honesto es pedir actualizar la app, no revisar la conexion.
 * `tope` (A8): no fallo nada todavia, se paso el tiempo de espera; no se
 * afirma que la evaluacion "sigue guardada" porque no se llego a leer.
 */
export function HeroEliteNoSePudoLeer({ onReintentar, formato = false, tope = false }: { onReintentar: () => void; formato?: boolean; tope?: boolean }) {
  const { t, acento, card } = useCard();
  const cuerpo = formato
    ? 'Tu evaluación está guardada, pero esta versión de la app no la entiende. Actualiza la app y vuelve a intentar.'
    : tope
      ? 'La lectura tardó más de lo normal. Revisa tu conexión y vuelve a intentar.'
      : 'Revisa tu conexión. Tu evaluación sigue guardada.';
  return (
    <View style={card}>
      <Cabecera acento={acento} />
      <EliteText style={[s.titulo, { color: t.texto }]}>No pudimos leer tu evaluación</EliteText>
      <EliteText style={[s.body, { color: t.textoSecundario }]}>{cuerpo}</EliteText>
      <AnimatedPressable
        style={[s.btnQuiet, { borderColor: t.bordeMarcado }]}
        onPress={() => { haptic.light(); onReintentar(); }}
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={14} color={t.texto} />
        <EliteText style={[s.btnQuietText, { color: t.texto }]}>Reintentar</EliteText>
      </AnimatedPressable>
    </View>
  );
}

/** Mientras se lee: cabecera neutra, porque todavia no se sabe si es Elite. */
export function HeroEliteCargando() {
  const { t, acento, card } = useCard();
  return (
    <View style={card}>
      <Cabecera acento={acento} texto="TU INICIO" />
      <EliteText style={[s.body, { color: t.textoSecundario }]}>Leyendo tus datos...</EliteText>
    </View>
  );
}

/**
 * Renglon para el hero viejo cuando el cliente es Elite, ya tiene labs
 * propios y su evaluacion todavia no esta cargada: conserva lo suyo y sabe
 * que lo de Enrique viene.
 */
export function NotaEvaluacionEnCamino() {
  const { t, acento } = useCard();
  return (
    <View style={[s.nota, { backgroundColor: withOpacity(acento, 0.1) }]}>
      <AppIcon name="evaluaciones" size={14} color={acento} />
      <EliteText style={[s.notaTexto, { color: t.texto }]}>{NOMBRE_COACH_ELITE} está preparando tu evaluación. Aparece aquí cuando la termine.</EliteText>
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
  lead: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 10 },
  pie: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, lineHeight: 16, marginTop: 6 },
  pieChico: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },
  firma: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 8, textAlign: 'center' },
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
  simbolo: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, width: 14, textAlign: 'center' },
  marcadorNombre: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  marcadorEstado: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  nota: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginTop: 10 },
  notaTexto: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, lineHeight: 16 },
});
