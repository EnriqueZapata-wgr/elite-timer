/**
 * La ficha de UN biomarcador. Se llega tocando un renglón en ATP Labs.
 *
 * El panel contesta "cuántos piden atención". Esta pantalla contesta la
 * pregunta que seguía y que no tenía dónde vivir: qué es este marcador, qué
 * significa que MI número haya caído donde cayó, con qué se lee junto y qué
 * hago al respecto.
 *
 * ORDEN DE LECTURA, Y POR QUÉ ES ESE
 * Primero el número. Después, ANTES de cualquier interpretación, el filtro de
 * convergencia: si el valor está fuera de ventana y ningún marcador de su grupo
 * lo acompaña, la pantalla lo dice antes de que la persona alcance a asustarse.
 * La referencia que se investigó hace lo contrario (pinta el foco rojo y deja
 * que su IA lo desmienta después) y es de lo que más se le critica.
 *
 * Todo el criterio vive en `ficha-biomarcador-core.ts`. Esta pantalla pinta.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlobalTopBar } from '@/src/components/ui/GlobalTopBar';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { EDAD_STATUS, EDAD_PENDING_COLOR } from '@/src/components/edad-atp/tokens';
import { ParameterChart } from '@/src/components/edad-atp/ParameterChart';
import { getLocalToday } from '@/src/utils/date-helpers';
import { cargarFicha, type FichaCargada } from '@/src/services/salud/ficha-biomarcador-service';
import type { EstadoLab } from '@/src/services/edad-atp/labs-premium-core';
import type { FichaBiomarcador, RelacionadoFicha } from '@/src/services/salud/ficha-biomarcador-core';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { ResultDisclaimerFooter } from '@/src/components/legal/ResultDisclaimerFooter';

const COLOR_CICLO = '#D4537E';

function colorDeEstado(e: EstadoLab): string {
  if (e === 'optimo') return EDAD_STATUS.good;
  if (e === 'aceptable') return EDAD_STATUS.neutral;
  if (e === 'atencion') return EDAD_STATUS.bad;
  return EDAD_PENDING_COLOR;
}

function FichaBiomarcadorScreen() {
  const { kind, tokens: t } = useAppTheme();
  const styles = makeStyles(t);
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const { key } = useLocalSearchParams<{ key: string }>();
  const [data, setData] = useState<FichaCargada | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user?.id || !key) { setLoading(false); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const d = await cargarFicha(user.id, key);
        if (alive) setData(d);
      } catch {
        // Estado honesto: un fallo de red se dice, no se queda cargando para
        // siempre. Ese "Cargando..." eterno es el bug que más se reporta.
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id, key]));

  const f = data?.ficha ?? null;

  const preguntarAArgos = useCallback((nombre: string) => {
    haptic.medium();
    router.push({
      pathname: '/argos-chat',
      params: { q: `Explícame qué es ${nombre} y qué lo mueve, con mis datos.`, from: 'health' },
    });
  }, []);

  return (
    <Screen edges={[]} themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <GlobalTopBar title={f?.abbr || 'Biomarcador'} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <EliteText variant="caption" style={styles.empty}>Cargando tu marcador…</EliteText>
        ) : error ? (
          <View style={styles.avisoBox}>
            <EliteText variant="body" style={styles.avisoTitulo}>No pudimos cargar este marcador</EliteText>
            <EliteText variant="caption" style={styles.avisoTexto}>
              Puede ser tu conexión. Vuelve a entrar en un momento; tus datos siguen guardados.
            </EliteText>
            <Pressable style={styles.cta} onPress={() => { haptic.light(); router.back(); }}>
              <EliteText style={styles.ctaText}>Volver a ATP Labs</EliteText>
            </Pressable>
          </View>
        ) : !f ? (
          <View style={styles.avisoBox}>
            <EliteText variant="body" style={styles.avisoTitulo}>Todavía no tienes este parámetro medido</EliteText>
            <EliteText variant="caption" style={styles.avisoTexto}>
              Cuando subas un estudio que lo incluya, aquí vas a ver tu número contra tu ventana
              funcional, tu historia y con qué otros marcadores se lee.
            </EliteText>
            <Pressable style={styles.cta} onPress={() => { haptic.medium(); router.push('/my-health'); }}>
              <EliteText style={styles.ctaText}>Subir un estudio</EliteText>
            </Pressable>
            <Pressable onPress={() => { haptic.light(); router.push('/labs-guide'); }}>
              <EliteText variant="caption" style={styles.link}>¿No sabes qué estudios pedir? Ve la guía</EliteText>
            </Pressable>
          </View>
        ) : (
          <>
            {/* ── Tu número ─────────────────────────────────────────────── */}
            <View style={styles.heroBox}>
              <EliteText variant="caption" style={styles.heroPanel}>{f.panelNombre}</EliteText>
              <EliteText style={styles.heroNombre}>{f.label}</EliteText>
              <View style={styles.heroValorRow}>
                <EliteText style={[styles.heroValor, { color: colorDeEstado(f.estado) }]}>
                  {f.valor}
                </EliteText>
                {f.unidad ? <EliteText style={styles.heroUnidad}>{f.unidad}</EliteText> : null}
              </View>
              <View style={[styles.estadoPill, { borderColor: colorDeEstado(f.estado) }]}>
                <EliteText variant="caption" style={[styles.estadoText, { color: colorDeEstado(f.estado) }]}>
                  {f.estadoLabel}
                </EliteText>
              </View>
              {f.ventana ? (
                <EliteText variant="caption" style={styles.heroVentana}>
                  Tu ventana funcional: {f.ventana.lo} a {f.ventana.hi}{f.unidad ? ` ${f.unidad}` : ''}
                </EliteText>
              ) : (
                <EliteText variant="caption" style={styles.heroVentanaMuda}>
                  Sin ventana funcional definida en la matriz todavía.
                </EliteText>
              )}
              <EliteText variant="caption" style={styles.heroMeta}>
                {f.fuenteLabel} · {f.medidoEn}{f.vencido ? ' · más de un año' : ''}
              </EliteText>
            </View>

            {/* Doctrina: un hormonal de mujer sin fase se puede leer al revés. */}
            {f.ciclo.show ? (
              <View style={styles.cicloBox}>
                <Ionicons name="ellipse" size={9} color={COLOR_CICLO} />
                <EliteText variant="caption" style={styles.cicloTexto}>{f.ciclo.note}</EliteText>
              </View>
            ) : null}

            {/* ── Antes de sacar conclusiones ───────────────────────────── */}
            <Seccion titulo="Antes de sacar conclusiones" styles={styles}>
              <EliteText variant="body" style={styles.parrafo}>{f.convergencia.texto}</EliteText>
              {f.convergencia.tipo === 'converge' ? (
                <Pressable
                  style={styles.cta}
                  onPress={() => { haptic.medium(); router.push('/salud/mi-lectura'); }}
                >
                  <EliteText style={styles.ctaText}>Ver cómo se conecta en Mi lectura</EliteText>
                </Pressable>
              ) : null}
            </Seccion>

            {/* ── Qué significa tu número ───────────────────────────────── */}
            {f.lectura ? (
              <Seccion titulo="Qué significa tu número" styles={styles}>
                <EliteText variant="body" style={styles.parrafo}>{f.lectura}</EliteText>
              </Seccion>
            ) : null}

            {/* ── Qué es ────────────────────────────────────────────────── */}
            <Seccion titulo="Qué es" styles={styles}>
              <EliteText variant="body" style={styles.parrafo}>
                {f.contenido?.queEs ?? f.resumen}
              </EliteText>
            </Seccion>

            {/* ── Qué altera la lectura del estudio ─────────────────────── */}
            {f.contenido?.alteranLaLectura.length ? (
              <Seccion titulo="Qué altera la lectura" styles={styles}>
                {f.contenido.alteranLaLectura.map((x, i) => (
                  <Vinieta key={i} texto={x} styles={styles} />
                ))}
              </Seccion>
            ) : null}

            {/* ── Qué lo mueve ──────────────────────────────────────────── */}
            {f.contenido?.queLoMueve.length ? (
              <Seccion titulo="Qué lo mueve" styles={styles}>
                {f.contenido.queLoMueve.map((x, i) => (
                  <Vinieta key={i} texto={x} styles={styles} />
                ))}
              </Seccion>
            ) : null}

            {f.contenido?.bandera ? (
              <View style={styles.banderaBox}>
                <Ionicons name="flag-outline" size={14} color={t.textoSecundario} />
                <EliteText variant="caption" style={styles.banderaTexto}>{f.contenido.bandera}</EliteText>
              </View>
            ) : null}

            {/* ── Tu historia ───────────────────────────────────────────── */}
            <Seccion titulo="Tu historia" styles={styles}>
              <EliteText
                variant="body"
                style={[
                  styles.parrafo,
                  f.delta?.rumbo === 'acerca' ? { color: EDAD_STATUS.good } : null,
                  f.delta?.rumbo === 'aleja' ? { color: EDAD_STATUS.bad } : null,
                ]}
              >
                {f.delta ? f.delta.texto : f.sinComparacion}
              </EliteText>
              {(data?.serie.length ?? 0) > 0 ? (
                <ParameterChart
                  series={data!.serie}
                  bandLimits={data!.bandLimits}
                  todayISO={getLocalToday()}
                  unit={f.unidad ?? undefined}
                  width={width - Spacing.md * 2 - Spacing.md * 2}
                />
              ) : null}
            </Seccion>

            {/* ── Se lee junto con ──────────────────────────────────────── */}
            {f.relacionados.length ? (
              <Seccion titulo="Se lee junto con" styles={styles}>
                <EliteText variant="caption" style={styles.subnota}>
                  Estos marcadores comparten lectura con el tuyo. Tócalos para ver su ficha.
                </EliteText>
                {f.relacionados.map((r) => (
                  <Relacionado key={r.key} r={r} styles={styles} />
                ))}
              </Seccion>
            ) : null}

            {/* ── Lo que falta ──────────────────────────────────────────── */}
            {f.huecos.length ? (
              <Seccion titulo="Lo que falta" styles={styles}>
                {f.huecos.map((x, i) => (
                  <Vinieta key={i} texto={x} styles={styles} />
                ))}
                {!f.contenido ? (
                  <Pressable style={styles.ctaSuave} onPress={() => preguntarAArgos(f.label)}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={t.tealTexto} />
                    <EliteText variant="caption" style={styles.ctaSuaveText}>
                      Pregúntale a ARGOS sobre este marcador
                    </EliteText>
                  </Pressable>
                ) : null}
              </Seccion>
            ) : null}

            <ResultDisclaimerFooter />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type Styles = ReturnType<typeof makeStyles>;

function Seccion({ titulo, children, styles }: { titulo: string; children: React.ReactNode; styles: Styles }) {
  return (
    <View style={styles.seccion}>
      <EliteText variant="caption" style={styles.seccionTitulo}>{titulo}</EliteText>
      {children}
    </View>
  );
}

function Vinieta({ texto, styles }: { texto: string; styles: Styles }) {
  return (
    <View style={styles.vinietaRow}>
      <EliteText style={styles.vinietaPunto}>·</EliteText>
      <EliteText variant="caption" style={styles.vinietaTexto}>{texto}</EliteText>
    </View>
  );
}

function Relacionado({ r, styles }: { r: RelacionadoFicha; styles: Styles }) {
  const sinMedir = r.estado === null;
  return (
    <Pressable
      style={styles.relRow}
      onPress={() => {
        haptic.light();
        // Sin medición no hay ficha que abrir: se manda a donde SÍ se resuelve.
        if (sinMedir) router.push('/labs-guide');
        else router.push({ pathname: '/edad-atp/lab/[key]', params: { key: r.key } });
      }}
    >
      <View style={{ flex: 1 }}>
        <EliteText variant="body" style={styles.relNombre}>{r.label}</EliteText>
        <EliteText variant="caption" style={styles.relPorque}>{r.porque}</EliteText>
      </View>
      {sinMedir ? (
        <EliteText variant="caption" style={styles.relSinMedir}>sin medir</EliteText>
      ) : (
        <View style={[styles.relPunto, { backgroundColor: colorDeEstado(r.estado!) }]} />
      )}
      <Ionicons name="chevron-forward" size={14} color={styles.relChevron.color as string} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  empty: { color: t.textoTenue, textAlign: 'center', marginTop: Spacing.xl },
  link: { color: t.tealTexto, fontFamily: Fonts.semiBold, marginTop: Spacing.xs },

  avisoBox: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: Spacing.xs, marginTop: Spacing.md,
  },
  avisoTitulo: { color: t.texto, fontFamily: Fonts.semiBold },
  avisoTexto: { color: t.textoSecundario, lineHeight: 18 },

  // El protagonista de la pantalla: tu número. Todo lo demás lo acompaña.
  heroBox: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: 2, alignItems: 'flex-start',
  },
  heroPanel: { color: t.textoTenue, letterSpacing: 1, textTransform: 'uppercase', fontSize: FontSizes.xs },
  heroNombre: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md, marginBottom: 2 },
  heroValorRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  heroValor: { fontFamily: Fonts.bold, fontSize: 40, lineHeight: 46 },
  heroUnidad: { color: t.textoSecundario, fontSize: FontSizes.sm, marginBottom: 8 },
  estadoPill: {
    borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 3,
    marginTop: 4, marginBottom: 4,
  },
  estadoText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  heroVentana: { color: '#4ade80', fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  heroVentanaMuda: { color: t.textoTenue, fontSize: FontSizes.xs, fontStyle: 'italic' },
  heroMeta: { color: t.textoTenue, fontSize: FontSizes.xs, marginTop: 2 },

  cicloBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs,
    backgroundColor: 'rgba(212,83,126,0.08)', borderWidth: 1, borderColor: 'rgba(212,83,126,0.3)',
    borderRadius: Radius.md, padding: Spacing.sm,
  },
  cicloTexto: { color: t.texto, flex: 1, lineHeight: 17, fontSize: FontSizes.xs },

  seccion: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: Spacing.xs,
  },
  seccionTitulo: {
    color: t.textoTenue, letterSpacing: 1.5, textTransform: 'uppercase',
    fontSize: FontSizes.xs, marginBottom: 2,
  },
  parrafo: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 21 },
  subnota: { color: t.textoTenue, fontSize: FontSizes.xs, lineHeight: 16, marginBottom: 2 },

  vinietaRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start' },
  vinietaPunto: { color: t.textoTenue, fontSize: FontSizes.sm, lineHeight: 19 },
  vinietaTexto: { color: t.textoSecundario, flex: 1, lineHeight: 19, fontSize: FontSizes.xs },

  banderaBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs,
    borderWidth: 1, borderColor: t.borde, borderRadius: Radius.md,
    padding: Spacing.sm, backgroundColor: t.hundido,
  },
  banderaTexto: { color: t.textoSecundario, flex: 1, lineHeight: 17, fontSize: FontSizes.xs },

  relRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.borde,
  },
  relNombre: { color: t.texto, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  relPorque: { color: t.textoTenue, fontSize: FontSizes.xs, lineHeight: 15, marginTop: 1 },
  relSinMedir: { color: t.textoTenue, fontSize: FontSizes.xs, fontStyle: 'italic' },
  relPunto: { width: 8, height: 8, borderRadius: 4 },
  relChevron: { color: t.textoTenue },

  cta: {
    marginTop: Spacing.xs, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center',
    backgroundColor: t.hundido, borderWidth: 1, borderColor: t.borde,
  },
  ctaText: { color: t.tealTexto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  ctaSuave: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    marginTop: Spacing.xs, paddingVertical: 9,
  },
  ctaSuaveText: { color: t.tealTexto, fontFamily: Fonts.semiBold },
});

// Gate de disclaimers médicos, igual que su pantalla madre.
export default function FichaBiomarcadorScreenGated() {
  return (
    <MedicalDisclaimerGate>
      <FichaBiomarcadorScreen />
    </MedicalDisclaimerGate>
  );
}
