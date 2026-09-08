/**
 * Comparar estudios en el tiempo (ATP 3.0, 6-sep-2026, ruta 2.5).
 *
 * Dos fechas de estudio, y marcador por marcador: el valor en cada una, la
 * flecha (se acerco a tu ventana, se alejo, se mantiene) y el semaforo de cada
 * valor. La flecha no dice "subio" o "bajo": la direccion deseada la conoce la
 * matriz V7 y es la ventana funcional. Si el marcador no tiene ventana, se
 * muestra la diferencia sin juicio.
 *
 * Todo el criterio vive en `comparar-core.ts` (puro, con test). Esta pantalla
 * carga, elige fechas y pinta. Las series salen de `lab_values` con la lectura
 * ESTRICTA (`loadAllSeriesEstricto`): un fallo de red es "no se pudo leer" con
 * reintentar, nunca "no tienes estudios" (regla 7).
 *
 * Gating (pivote 3.2): comparar esta en Pro. Con `tier === 'free'` (y el
 * nivel ya leido) se pinta el candado a pantalla completa y NO se cargan los
 * datos. Si el nivel no se pudo leer, se abre (fail-open, misma doctrina que
 * el proxy): a un miembro sin red no se le cierra lo que ya tenia.
 */
import { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { GlobalTopBar } from '@/src/components/ui/GlobalTopBar';
import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { destinoCandado } from '@/src/components/ui/CandadoNivel';
import { CandadoBloque } from '@/src/components/ui/CandadoBloque';
import { useSubscription } from '@/src/hooks/useSubscription';
import { candadoDeVentaCierra } from '@/src/services/subscription/limites-free-core';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { loadUserData } from '@/src/services/edad-atp/edad-atp-v2-service';
import { loadAllSeriesEstricto } from '@/src/services/edad-atp/lab-values-service';
import { getLabParamMeta } from '@/src/components/edad-atp/component-meta';
import { findMatrizDomain } from '@/src/constants/edad-atp-matriz-lookup';
import { CANONICAL_PCT_KEYS, decimalToPct } from '@/src/constants/lab-canonical-map';
import { estadoDeParametro, type EstadoLab } from '@/src/services/edad-atp/labs-premium-core';
import {
  fechasDeEstudio, fechasPorDefecto, emparejar, resumirComparacion, fraseComparacion, formateaDelta,
  type SeriesPorMarcador, type FilaComparacion, type Flecha,
} from '@/src/services/edad-atp/comparar-core';
import type { Sex } from '@/src/types/edad-atp-v2';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { ResultDisclaimerFooter } from '@/src/components/legal/ResultDisclaimerFooter';

/** Llave con la que el candado y el paywall nombran esta funcion. */
const CANDADO_KEY = 'comparar';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'listo'; sex: Sex; series: SeriesPorMarcador; fechas: string[] };

/** DD/MM/AAAA desde YYYY-MM-DD, para los chips. */
function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

/** Valor para mostrar: las claves pct se ensenan en %, como en ATP Labs. */
function paraMostrar(key: string, value: number): number {
  const v = CANONICAL_PCT_KEYS.has(key) ? decimalToPct(value) : value;
  return Math.round(v * 100) / 100;
}

// Semaforo por tokens del tema (regla 5): en oscuro son los mismos colores de
// ATP Labs; en claro son sus versiones oscurecidas, que si leen 4.5:1 sobre
// la card. EDAD_STATUS.good es lima y en claro no es letra (manual regla 1).
function colorDeEstado(e: EstadoLab, t: AppThemeTokens): string {
  if (e === 'optimo') return t.exito;
  if (e === 'aceptable') return t.advertencia;
  if (e === 'atencion') return t.critico;
  return t.textoSecundario;
}

const FLECHA_UI: Record<Flecha, { icon: 'arrow-up-circle' | 'arrow-down-circle' | 'remove-circle' | 'ellipse-outline'; label: string }> = {
  mejoro: { icon: 'arrow-up-circle', label: 'Se acercó a tu ventana' },
  empeoro: { icon: 'arrow-down-circle', label: 'Se alejó de tu ventana' },
  igual: { icon: 'remove-circle', label: 'Se mantiene' },
  sin_juicio: { icon: 'ellipse-outline', label: 'Sin rango funcional para juzgar' },
};

function colorDeFlecha(f: Flecha, t: AppThemeTokens): string {
  if (f === 'mejoro') return t.exito;
  if (f === 'empeoro') return t.critico;
  return t.textoSecundario;
}

interface FilaPintada extends FilaComparacion {
  nombre: string;
  unidad?: string;
  dominio: string;
  estadoA: EstadoLab | null;
  estadoB: EstadoLab | null;
}

function CompararScreen() {
  const { kind, tokens: t } = useAppTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const { tier, isLoading: nivelCargando, nivelNoSePudoLeer } = useSubscription();
  // Cerrado solo cuando SABEMOS que es free. Cargando o sin lectura: abierto.
  // 7-sep-2026 (VENTA_AL_PUBLICO): el candado de venta lo decide una sola
  // función. Con la venta al público apagada nunca cierra.
  const bloqueado = !nivelCargando && candadoDeVentaCierra(tier, nivelNoSePudoLeer);

  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [fechaA, setFechaA] = useState<string | null>(null);
  const [fechaB, setFechaB] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useFocusEffect(useCallback(() => {
    // Free: ni una consulta. El candado se pinta con lo que ya sabemos.
    if (!user?.id || nivelCargando || bloqueado) return;
    let alive = true;
    (async () => {
      setCarga({ estado: 'cargando' });
      try {
        const [data, series] = await Promise.all([loadUserData(user.id), loadAllSeriesEstricto(user.id)]);
        if (!alive) return;
        const fechas = fechasDeEstudio(series);
        setCarga({ estado: 'listo', sex: data.sex, series, fechas });
        const def = fechasPorDefecto(fechas);
        setFechaA((prev) => (prev && fechas.includes(prev) ? prev : def?.a ?? null));
        setFechaB((prev) => (prev && fechas.includes(prev) ? prev : def?.b ?? null));
      } catch {
        // Regla 7: un fallo de lectura se dice y se reintenta; no se disfraza
        // de "no tienes estudios".
        if (alive) setCarga({ estado: 'error' });
      }
    })();
    return () => { alive = false; };
  }, [user?.id, nivelCargando, bloqueado, intento]));

  /**
   * Elegir una fecha en un lado. Dos reglas para que la flecha siempre tenga
   * sentido: nunca la misma fecha en los dos lados (si se repite, el otro lado
   * toma la que estaba aqui), y A siempre es la anterior en el tiempo (si la
   * eleccion las cruza, se intercambian). "Mejoro" es de A hacia B.
   */
  const elegir = useCallback((lado: 'a' | 'b', f: string) => {
    let a = lado === 'a' ? f : (f === fechaA ? fechaB : fechaA);
    let b = lado === 'b' ? f : (f === fechaB ? fechaA : fechaB);
    if (a && b && a > b) [a, b] = [b, a];
    setFechaA(a);
    setFechaB(b);
  }, [fechaA, fechaB]);

  const filas: FilaPintada[] = useMemo(() => {
    if (carga.estado !== 'listo' || !fechaA || !fechaB) return [];
    return emparejar(carga.sex, carga.series, fechaA, fechaB).map((f) => {
      const meta = getLabParamMeta(f.key);
      return {
        ...f,
        nombre: meta.display_name,
        unidad: meta.unit,
        dominio: findMatrizDomain(carga.sex, f.key)?.domain_name_es ?? 'Otros',
        estadoA: f.valorA == null ? null : estadoDeParametro(carga.sex, f.key, f.valorA),
        estadoB: f.valorB == null ? null : estadoDeParametro(carga.sex, f.key, f.valorB),
      };
    });
  }, [carga, fechaA, fechaB]);

  const grupos = useMemo(() => {
    const map = new Map<string, FilaPintada[]>();
    for (const f of filas) {
      const arr = map.get(f.dominio) ?? [];
      arr.push(f);
      map.set(f.dominio, arr);
    }
    return [...map.entries()].map(([titulo, rows]) => ({ titulo, rows }));
  }, [filas]);

  const resumen = useMemo(() => resumirComparacion(filas), [filas]);

  const abrirFicha = useCallback((key: string) => {
    haptic.medium();
    router.push({ pathname: '/edad-atp/lab/[key]', params: { key } });
  }, []);

  const renderChips = (seleccion: string | null, onPick: (f: string) => void, fechas: string[]) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      {fechas.map((f) => {
        const activo = f === seleccion;
        return (
          <Pressable
            key={f}
            onPress={() => { haptic.light(); onPick(f); }}
            style={[styles.chip, activo && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
          >
            <EliteText variant="caption" style={[styles.chipText, activo && styles.chipTextActive]}>{fechaCorta(f)}</EliteText>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <Screen edges={[]} themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <GlobalTopBar title="Comparar estudios" />
      <ScrollView contentContainerStyle={styles.content}>
        {bloqueado ? (
          // Regla 15: lo bloqueado se ve, no desaparece. Sin datos cargados.
          // Mismo bloque que la ficha del cuarto marcador (ruta 1.11); el
          // destino es el paywall con contexto candado:comparar.
          <View style={styles.candadoWrap}>
            <CandadoBloque
              titulo="Comparar tus estudios en el tiempo está en Pro"
              texto="Con Pro ves, marcador por marcador, qué se acercó a tu ventana funcional y qué se alejó entre un estudio y el siguiente."
              boton="Ver Pro"
              destino={destinoCandado(CANDADO_KEY, 'premium')}
            />
          </View>
        ) : nivelCargando || carga.estado === 'cargando' ? (
          <EliteText variant="caption" style={styles.empty}>Cargando tus estudios…</EliteText>
        ) : carga.estado === 'error' ? (
          <View style={styles.avisoBox}>
            <EliteText variant="body" style={styles.avisoTitulo}>No se pudieron leer tus estudios</EliteText>
            <EliteText variant="caption" style={styles.avisoTexto}>
              Puede ser tu conexión. Tus datos siguen guardados.
            </EliteText>
            <Pressable style={styles.cta} onPress={() => { haptic.light(); setIntento((n) => n + 1); }} accessibilityRole="button">
              <EliteText style={styles.ctaText}>Reintentar</EliteText>
            </Pressable>
          </View>
        ) : carga.fechas.length < 2 ? (
          <View style={styles.avisoBox}>
            <EliteText variant="body" style={styles.avisoTitulo}>Necesitas dos estudios para comparar</EliteText>
            <EliteText variant="caption" style={styles.avisoTexto}>
              {carga.fechas.length === 1
                ? `Tienes un estudio del ${fechaCorta(carga.fechas[0])}. Cuando subas el siguiente, aquí vas a ver qué cambió marcador por marcador.`
                : 'Cuando tengas dos estudios cargados, aquí vas a ver qué cambió marcador por marcador.'}
            </EliteText>
            <Pressable style={styles.cta} onPress={() => { haptic.medium(); router.push('/my-health'); }} accessibilityRole="button">
              <EliteText style={styles.ctaText}>Subir estudio</EliteText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.selectorBox}>
              <EliteText variant="caption" style={styles.selectorLabel}>ESTUDIO A (antes)</EliteText>
              {renderChips(fechaA, (f) => elegir('a', f), carga.fechas)}
              <EliteText variant="caption" style={styles.selectorLabel}>ESTUDIO B (después)</EliteText>
              {renderChips(fechaB, (f) => elegir('b', f), carga.fechas)}
            </View>

            {fechaA && fechaB ? (
              <View style={styles.resumenBox}>
                <EliteText variant="body" style={styles.resumenFrase}>{fraseComparacion(resumen)}</EliteText>
                <EliteText variant="caption" style={styles.resumenMeta}>
                  {fechaCorta(fechaA)} contra {fechaCorta(fechaB)}
                  {resumen.sinPar > 0 ? ` · ${resumen.sinPar} solo en uno de los dos` : ''}
                </EliteText>
              </View>
            ) : null}

            {grupos.map((g) => (
              <View key={g.titulo} style={styles.group}>
                <EliteText variant="caption" style={styles.groupTitle}>{g.titulo}</EliteText>
                {g.rows.map((f) => (
                  <Pressable
                    key={f.key}
                    style={styles.row}
                    onPress={() => abrirFicha(f.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${f.nombre}. ${f.flecha ? FLECHA_UI[f.flecha].label : 'Solo en uno de los dos estudios'}. Abrir ficha`}
                  >
                    <View style={styles.rowTop}>
                      <EliteText variant="body" style={styles.rowName} numberOfLines={1}>{f.nombre}</EliteText>
                      <Ionicons name="chevron-forward" size={16} color={t.textoSecundario} />
                    </View>
                    <View style={styles.rowValores}>
                      <Valor etiqueta="A" valor={f.valorA} estado={f.estadoA} keyParam={f.key} unidad={f.unidad} styles={styles} t={t} />
                      <View style={styles.flechaCol}>
                        {f.flecha ? (
                          <>
                            <Ionicons name={FLECHA_UI[f.flecha].icon} size={22} color={colorDeFlecha(f.flecha, t)} />
                            {f.delta != null ? (
                              <EliteText variant="caption" style={[styles.deltaText, { color: colorDeFlecha(f.flecha, t) }]}>
                                {formateaDelta(paraMostrar(f.key, f.valorB ?? 0) - paraMostrar(f.key, f.valorA ?? 0))}
                              </EliteText>
                            ) : null}
                          </>
                        ) : (
                          <EliteText variant="caption" style={styles.sinPar}>—</EliteText>
                        )}
                      </View>
                      <Valor etiqueta="B" valor={f.valorB} estado={f.estadoB} keyParam={f.key} unidad={f.unidad} styles={styles} t={t} />
                    </View>
                    {f.flecha ? (
                      <EliteText variant="caption" style={styles.flechaLabel}>{FLECHA_UI[f.flecha].label}</EliteText>
                    ) : (
                      <EliteText variant="caption" style={styles.flechaLabel}>Solo en uno de los dos estudios</EliteText>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}

            <View style={styles.leyenda}>
              <AppIcon name="salud-evolucion" size={14} color={t.textoSecundario} />
              <EliteText variant="caption" style={styles.leyendaText}>
                La flecha se lee contra tu ventana funcional, no contra el número. Toca un marcador para ver su ficha.
              </EliteText>
            </View>
          </>
        )}
        <ResultDisclaimerFooter />
      </ScrollView>
    </Screen>
  );
}

/** Una celda de valor con su semaforo. Raya cuando ese estudio no lo trajo. */
function Valor({ etiqueta, valor, estado, keyParam, unidad, styles, t }: {
  etiqueta: string;
  valor: number | null;
  estado: EstadoLab | null;
  keyParam: string;
  unidad?: string;
  styles: ReturnType<typeof makeStyles>;
  t: AppThemeTokens;
}) {
  const color = estado ? colorDeEstado(estado, t) : t.textoSecundario;
  return (
    <View style={styles.valorCol}>
      <EliteText variant="caption" style={styles.valorEtiqueta}>{etiqueta}</EliteText>
      <View style={styles.valorLinea}>
        {estado ? <View style={[styles.semaforo, { backgroundColor: color }]} /> : null}
        <EliteText style={[styles.valorNum, { color: valor == null ? t.textoSecundario : t.texto }]}>
          {valor == null ? '—' : paraMostrar(keyParam, valor)}
        </EliteText>
      </View>
      {valor != null && unidad ? <EliteText variant="caption" style={styles.valorUnidad}>{unidad}</EliteText> : null}
    </View>
  );
}

// Tema claro y oscuro por tokens. El lima como letra de chip activo solo vive
// en oscuro; en claro cae al teal de texto (manual regla 1), igual que Labs.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 120 },
  empty: { color: t.textoSecundario, textAlign: 'center', marginTop: Spacing.xl },

  avisoBox: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: Spacing.xs, marginTop: Spacing.md,
  },
  avisoTitulo: { color: t.texto, fontFamily: Fonts.semiBold },
  avisoTexto: { color: t.textoSecundario, lineHeight: 18 },
  cta: {
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 10,
    alignItems: 'center', marginTop: Spacing.xs,
  },
  ctaText: { color: t.textoSobreLima, fontFamily: Fonts.bold },

  candadoWrap: { marginTop: Spacing.xl },

  selectorBox: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: Spacing.xs,
  },
  selectorLabel: { color: t.textoSecundario, letterSpacing: 1, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  chipsRow: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: 2 },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.md, backgroundColor: t.hundido, borderWidth: 1, borderColor: t.borde },
  chipActive: { backgroundColor: 'rgba(168,224,42,0.14)', borderColor: 'rgba(168,224,42,0.4)' },
  chipText: { color: t.textoSecundario, fontSize: FontSizes.xs },
  chipTextActive: { color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontFamily: Fonts.semiBold },

  resumenBox: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: 2,
  },
  resumenFrase: { color: t.texto, fontFamily: Fonts.semiBold, lineHeight: 18 },
  resumenMeta: { color: t.textoSecundario, fontSize: FontSizes.xs },

  group: { gap: 4, marginTop: Spacing.xs },
  groupTitle: { color: t.textoSecundario, letterSpacing: 1, marginBottom: 2, textTransform: 'uppercase', fontSize: FontSizes.xs },
  row: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: Spacing.xs,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  rowName: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, flex: 1 },
  rowValores: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valorCol: { flex: 1, alignItems: 'center', gap: 1 },
  valorEtiqueta: { color: t.textoSecundario, fontSize: FontSizes.xs, letterSpacing: 1 },
  valorLinea: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  semaforo: { width: 10, height: 10, borderRadius: 5 },
  valorNum: { fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  valorUnidad: { color: t.textoSecundario, fontSize: FontSizes.xs },
  flechaCol: { flex: 1, alignItems: 'center', gap: 1 },
  deltaText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  sinPar: { color: t.textoSecundario, fontSize: FontSizes.lg },
  flechaLabel: { color: t.textoSecundario, fontSize: FontSizes.xs, textAlign: 'center' },

  leyenda: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, paddingHorizontal: 2, marginTop: Spacing.xs },
  leyendaText: { color: t.textoSecundario, fontSize: FontSizes.xs, lineHeight: 15, flex: 1 },
});

// Mismo gate de disclaimers que el resto de Edad ATP y Labs.
export default function CompararScreenGated() {
  return (
    <MedicalDisclaimerGate>
      <CompararScreen />
    </MedicalDisclaimerGate>
  );
}
