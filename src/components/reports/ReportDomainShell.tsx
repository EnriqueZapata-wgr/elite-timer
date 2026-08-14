/**
 * ReportDomainShell (OLA1 R-0) — el marco que comparten todos los reportes por
 * dominio: header del pilar, selector de rango, los tres estados honestos y el
 * export del rango visible.
 *
 * La pantalla es LA MISMA se entre desde el hub o desde el contexto del pilar.
 * Por eso se empuja siempre con router.push y nunca con replace: el back
 * nativo devuelve a donde estabas sin que nadie le pase de dónde vino.
 *
 * Cada dominio solo aporta su ReportDomainDefinition: cómo lee, cuándo está
 * vacío, cómo se exporta y qué pinta.
 */
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { FilterPills } from '@/src/components/ui/FilterPills';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import {
  REPORT_DOMAINS, RANGE_LABELS, RANGE_LABEL_LIST, LABEL_TO_RANGE,
  toServicePeriod, describeRange,
  type ExportRow, type ReportDomainKey, type ReportRange, type ReportRangeLabel,
  type ResolvedRange, type ServicePeriod,
} from '@/src/services/reports/report-domain-core';
import { shareReportExport, type ReportExportFormat } from '@/src/services/reports/report-export-service';
import { ReportRangeProvider, useReportRange } from './report-range-context';

export interface ReportDomainDefinition<T> {
  key: ReportDomainKey;
  /**
   * Lee los datos del rango. Debe LANZAR si la lectura falló: es lo único que
   * le permite al shell distinguir "no hay nada" de "no pudimos leer".
   */
  load: (period: ServicePeriod, range: ResolvedRange) => Promise<T>;
  /** true = no hay nada que pintar. Distinto de que la lectura falló. */
  isEmpty: (data: T) => boolean;
  /** Las filas del export, ya del rango visible. */
  toRows: (data: T) => ExportRow[];
  /**
   * El contenido propio del dominio. `reload` vuelve a leer el rango actual:
   * lo necesita cualquier dominio que además de mirar deja EDITAR, porque
   * después de borrar una entrada la pantalla tiene que dejar de mostrarla.
   */
  render: (data: T, reload: () => void) => ReactNode;
  /**
   * Capa flotante sobre la pantalla, fuera del ScrollView. Es para lo que no
   * puede desplazarse con el contenido, como un botón de acción fijo. Se pinta
   * en TODOS los estados, con data en null mientras no hay: el botón para
   * escribir tu primera entrada tiene que existir justo cuando no hay ninguna.
   */
  overlay?: (data: T | null, reload: () => void) => ReactNode;
  /**
   * Puerta del dominio. Es un COMPONENTE que envuelve la pantalla y solo pinta
   * a sus hijos cuando el acceso está confirmado: mientras decide, o cuando
   * niega, el shell entero no llega a montarse y por lo tanto no consulta nada.
   *
   * Es lo que cierra el deep link: /reports/ciclo no le enseña ciclo a quien no
   * le toca aunque teclee la ruta.
   */
  guard?: ComponentType<{ children: ReactNode }>;
  /**
   * Dominios cuyas cifras NO dependen del rango (un acumulado de siempre, un
   * reto de largo fijo). Con esto el shell esconde las pills en vez de ofrecer
   * un control que no cambia nada, y el export se declara sobre todo el
   * historial, que es lo que de verdad lleva.
   */
  fixedRange?: ReportRange;
}

interface Props<T> {
  definition: ReportDomainDefinition<T>;
  /** El ?period= del deep link. */
  seedPeriod?: string | null;
}

export function ReportDomainShell<T>({ definition, seedPeriod }: Props<T>) {
  const body = (
    <ReportRangeProvider domain={definition.key} seed={definition.fixedRange ?? seedPeriod}>
      <ShellBody definition={definition} />
    </ReportRangeProvider>
  );
  // La puerta va POR FUERA del provider: si el acceso se niega, no se monta
  // nada del reporte, ni siquiera su preferencia de rango.
  const Guard = definition.guard;
  return Guard ? <Guard>{body}</Guard> : body;
}

type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; data: T };

function ShellBody<T>({ definition }: { definition: ReportDomainDefinition<T> }) {
  const meta = REPORT_DOMAINS[definition.key];
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const { range, resolved, setRange, hydrated } = useReportRange();

  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    let alive = true;
    setState({ status: 'loading' });
    definition.load(toServicePeriod(range), resolved)
      .then((data) => {
        if (!alive) return;
        setState(definition.isEmpty(data) ? { status: 'empty' } : { status: 'ready', data });
      })
      .catch(() => { if (alive) setState({ status: 'error' }); });
    return () => { alive = false; };
  }, [definition, hydrated, range, resolved, attempt]);

  const handleExport = useCallback(async (format: ReportExportFormat) => {
    if (exporting || state.status !== 'ready') return;
    haptic.medium();
    setExporting(true);
    try {
      const rows = definition.toRows(state.data);
      const result = await shareReportExport(definition.key, resolved, rows, format);
      if (result === 'empty') {
        Alert.alert(
          'No hay nada que exportar',
          `En ${RANGE_LABELS[range].toLowerCase()} no hay registros de ${meta.title.toLowerCase()}. Cambia el rango y vuelve a intentar.`,
        );
      } else if (result === 'unavailable') {
        Alert.alert(
          'Tu versión aún no comparte archivos',
          'Este teléfono trae una versión de la app sin el módulo de compartir. Llega con la próxima actualización de la tienda.',
        );
      } else if (result === 'error') {
        Alert.alert(
          'No se pudo exportar',
          'No pudimos escribir el archivo. Nada se generó a medias: intenta de nuevo en un momento.',
        );
      }
    } finally {
      setExporting(false);
    }
  }, [exporting, state, definition, resolved, range, meta.title]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <Screen themed>
      <PillarHeader pillar={meta.pillar} title={meta.title} />

      {!definition.fixedRange && (
        <View style={s.pillsRow}>
          <FilterPills
            options={RANGE_LABEL_LIST}
            selected={RANGE_LABELS[range]}
            onSelect={(label: ReportRangeLabel) => setRange(LABEL_TO_RANGE[label])}
          />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <EliteText style={s.subtitle}>{meta.subtitle}</EliteText>

        {state.status === 'loading' && (
          <View style={s.stateBox}>
            <ActivityIndicator color={meta.accent} />
            <EliteText style={s.stateTitle}>Leyendo tus registros</EliteText>
            <EliteText style={s.stateBody}>Un momento, estamos juntando {describeRange(resolved)}.</EliteText>
          </View>
        )}

        {/* Sin datos NO es un error: es que todavía no hay qué contar. */}
        {state.status === 'empty' && (
          <View style={s.stateBox}>
            <Ionicons name="ellipse-outline" size={28} color={t.sinDatos} />
            <EliteText style={s.stateTitle}>Todavía no hay datos</EliteText>
            <EliteText style={s.stateBody}>{meta.emptyCopy}</EliteText>
          </View>
        )}

        {/* Falló la lectura SÍ es un error, y se dice que el dato existe. */}
        {state.status === 'error' && (
          <View style={s.stateBox}>
            <Ionicons name="cloud-offline-outline" size={28} color={t.error} />
            <EliteText style={s.stateTitle}>No pudimos leer tus datos</EliteText>
            <EliteText style={s.stateBody}>
              Tus registros están, no llegamos a ellos. Revisa tu conexión y vuelve a intentar.
            </EliteText>
            <AnimatedPressable
              onPress={() => { haptic.light(); reload(); }}
              style={[s.retryBtn, { borderColor: meta.accent }]}
            >
              <Ionicons name="refresh-outline" size={15} color={meta.accent} />
              <EliteText style={[s.retryText, { color: meta.accent }]}>Reintentar</EliteText>
            </AnimatedPressable>
          </View>
        )}

        {state.status === 'ready' && (
          <>
            <Animated.View entering={FadeInUp.delay(30).springify()}>
              {definition.render(state.data, reload)}
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(90).springify()} style={s.exportBox}>
              <EliteText style={s.exportTitle}>LLÉVATE TUS DATOS</EliteText>
              <EliteText style={s.exportBody}>
                Lo que ves en pantalla, tal cual, en un archivo tuyo: {describeRange(resolved)}.
              </EliteText>
              <View style={s.exportRow}>
                {(['csv', 'json'] as const).map((f) => (
                  <AnimatedPressable
                    key={f}
                    onPress={() => handleExport(f)}
                    disabled={exporting}
                    style={[s.exportBtn, exporting && s.exportBtnDisabled]}
                  >
                    <Ionicons name="share-outline" size={15} color={t.texto} />
                    <EliteText style={s.exportBtnText}>{f.toUpperCase()}</EliteText>
                  </AnimatedPressable>
                ))}
              </View>
            </Animated.View>
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {definition.overlay?.(state.status === 'ready' ? state.data : null, reload)}
    </Screen>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  pillsRow: { paddingTop: Spacing.sm, paddingBottom: 4 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  subtitle: {
    fontSize: FontSizes.sm, color: t.textoSecundario, fontFamily: Fonts.regular,
    lineHeight: 19, marginBottom: Spacing.md,
  },

  stateBox: {
    alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  stateTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold, color: t.texto, marginTop: Spacing.xs },
  stateBody: {
    fontSize: FontSizes.sm, color: t.textoSecundario, fontFamily: Fonts.regular,
    lineHeight: 19, textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm,
    paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1,
  },
  retryText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  exportBox: { marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: t.borde },
  exportTitle: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: t.texto, letterSpacing: 1 },
  exportBody: {
    fontSize: FontSizes.sm, color: t.textoSecundario, fontFamily: Fonts.regular,
    lineHeight: 19, marginTop: 4, marginBottom: Spacing.sm,
  },
  exportRow: { flexDirection: 'row', gap: Spacing.sm },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12,
    borderWidth: 1, borderColor: t.bordeMarcado,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: t.texto },
});
