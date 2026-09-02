/**
 * Suplementos: historial y adherencia (backlog 3.6, 10.5 y 10.6).
 *
 * Los ultimos 30 dias agrupados por dia, la adherencia del PLAN a 7 y 30
 * dias (por suplemento y global) y el reparto por dia de la semana, para ver
 * si los fines de semana se olvidan. Las fichas eventuales (312) se listan
 * con sus dias registrados y no llevan porcentaje: no penalizan.
 *
 * Doctrina intacta: registro, no recomendacion. Aqui solo se cuentan dias.
 * Toda la aritmetica vive en src/services/supplements/adherencia-core.ts
 * (pura, con test ejecutado); esta pantalla lee y pinta.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { ORB_SAFE_BOTTOM } from '@/src/components/argos/ArgosFloatingButton';
import { useAppTheme } from '@/src/contexts/theme-context';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import {
  SIN_DATO, adherenciaPorDiaSemana, agruparHistorial, calcularAdherencia, etiquetaDia,
  ventanaFechas, type LogRow, type SuppRow,
} from '@/src/services/supplements/adherencia-core';

const DIAS = 30;

type Estado = 'cargando' | 'listo' | 'fallo';

export default function SupplementsHistorialScreen() {
  const { kind, tokens: t } = useAppTheme();
  const [estado, setEstado] = useState<Estado>('cargando');
  const [supps, setSupps] = useState<SuppRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const hoy = getLocalToday();

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setEstado('fallo'); return; }
      const desde = ventanaFechas(hoy, DIAS)[0] ?? hoy;
      // Todas las fichas (tambien las desactivadas): un log de una ficha que
      // ya no esta activa sigue siendo dato de la persona y se muestra con
      // su nombre. supabase-js rechaza sin red y devuelve {error} en 4xx:
      // allSettled + chequeo de error, y "no se pudo leer" nunca se disfraza
      // de "no hay datos".
      const settled = await Promise.allSettled([
        supabase.from('user_supplements').select('*').eq('user_id', user.id),
        supabase.from('supplement_logs').select('*').eq('user_id', user.id).gte('date', desde).lte('date', hoy),
      ]);
      const sinRed = { data: null, error: { message: 'fetch rechazado (sin conexion)' } };
      const suppsRes = settled[0].status === 'fulfilled' ? settled[0].value : sinRed;
      const logsRes = settled[1].status === 'fulfilled' ? settled[1].value : sinRed;
      if (suppsRes.error || logsRes.error) {
        if (suppsRes.error) logWarn('[supplements/historial] fichas load failed:', suppsRes.error.message);
        if (logsRes.error) logWarn('[supplements/historial] logs load failed:', logsRes.error.message);
        setEstado('fallo');
        return;
      }
      setSupps((suppsRes.data ?? []) as SuppRow[]);
      setLogs((logsRes.data ?? []) as LogRow[]);
      setEstado('listo');
    } catch (e) {
      logWarn('[supplements/historial] load threw:', e);
      setEstado('fallo');
    }
  }, [hoy]);

  useEffect(() => { cargar(); }, [cargar]);

  const resumen7 = useMemo(() => calcularAdherencia(supps, logs, hoy, 7), [supps, logs, hoy]);
  const resumen30 = useMemo(() => calcularAdherencia(supps, logs, hoy, DIAS), [supps, logs, hoy]);
  const porDia = useMemo(() => adherenciaPorDiaSemana(supps, logs, hoy, DIAS), [supps, logs, hoy]);
  const dias = useMemo(() => agruparHistorial(supps, logs, hoy, DIAS), [supps, logs, hoy]);
  const hayTomas = useMemo(() => dias.some((d) => d.tomas.length > 0), [dias]);
  const pct30PorId = useMemo(() => new Map(resumen30.plan.map((p) => [p.id, p])), [resumen30]);

  const colorPct = (pct: number | null): string => {
    if (pct === null) return t.textoSecundario;
    if (pct >= 80) return t.exito;
    if (pct >= 50) return t.advertencia;
    return t.critico;
  };
  const pctTexto = (pct: number | null) => (pct === null ? SIN_DATO : `${pct}%`);

  return (
    <Screen themed>
      <PillarHeader pillar="nutrition" title="Historial" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 + ORB_SAFE_BOTTOM }}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={{ color: t.textoSecundario, fontSize: 12, lineHeight: 17 }}>
            Tus tomas de los últimos 30 días y la adherencia de tu plan. Las fichas eventuales se registran, no restan.
          </Text>
        </View>

        {estado === 'cargando' && (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="small" color={t.textoSecundario} />
            <Text style={{ color: t.textoSecundario, fontSize: 12, marginTop: 10 }}>Leyendo tu historial</Text>
          </View>
        )}

        {estado === 'fallo' && (
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 40 }}>
            <Ionicons name="cloud-offline-outline" size={44} color={t.textoSecundario} />
            <Text style={{ color: t.texto, fontSize: 17, fontWeight: '700', marginTop: 14, textAlign: 'center' }}>
              Tu historial no se pudo leer
            </Text>
            <Text style={{ color: t.textoSecundario, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 }}>
              Sigue guardado. Revisa tu conexión e intenta de nuevo.
            </Text>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); cargar(); }}
              style={{ marginTop: 18, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 999, borderWidth: 1, borderColor: t.bordeMarcado }}
            >
              <Text style={{ color: t.texto, fontSize: 13, fontWeight: '700' }}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {estado === 'listo' && supps.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 40 }}>
            <AppIcon name="suplementos" size={44} color={t.bordeMarcado} />
            <Text style={{ color: t.texto, fontSize: 17, fontWeight: '700', marginTop: 14, textAlign: 'center' }}>
              Todavía no hay historial
            </Text>
            <Text style={{ color: t.textoSecundario, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 }}>
              Crea tus fichas y marca tus tomas del día; aquí verás cómo va tu plan.
            </Text>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
              style={{ marginTop: 18, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, backgroundColor: ATP_BRAND.lime }}
            >
              <Text style={{ color: ATP_BRAND.black, fontSize: 13, fontWeight: '800' }}>IR A MIS SUPLEMENTOS</Text>
            </Pressable>
          </View>
        )}

        {estado === 'listo' && supps.length > 0 && (
          <>
            {/* Adherencia del plan: 7 y 30 dias */}
            <Seccion titulo="ADHERENCIA DEL PLAN" nota="Días con toma entre días programados, sumando tus fichas del plan" t={t}>
              {resumen30.plan.length === 0 ? (
                <Text style={{ color: t.textoSecundario, fontSize: 12, lineHeight: 17 }}>
                  No tienes fichas marcadas como parte del plan. Márcalas con el lápiz para medir adherencia.
                </Text>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Kpi label="7 DÍAS" valor={pctTexto(resumen7.global.pct)} color={colorPct(resumen7.global.pct)}
                      sub={`${resumen7.global.diasTomados} de ${resumen7.global.diasProgramados} días programados`} t={t} />
                    <Kpi label="30 DÍAS" valor={pctTexto(resumen30.global.pct)} color={colorPct(resumen30.global.pct)}
                      sub={`${resumen30.global.diasTomados} de ${resumen30.global.diasProgramados} días programados`} t={t} />
                  </View>
                  <View style={{ marginTop: 14, gap: 8 }}>
                    {resumen7.plan.map((p) => {
                      const p30 = pct30PorId.get(p.id);
                      return (
                        <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ color: t.texto, fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>{p.name}</Text>
                          <View style={{ alignItems: 'flex-end', width: 64 }}>
                            <Text style={{ color: colorPct(p.pct), fontSize: 13, fontWeight: '800' }}>{pctTexto(p.pct)}</Text>
                            <Text style={{ color: t.textoSecundario, fontSize: 9 }}>{p.diasTomados}/{p.diasProgramados} · 7d</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', width: 64 }}>
                            <Text style={{ color: colorPct(p30?.pct ?? null), fontSize: 13, fontWeight: '800' }}>{pctTexto(p30?.pct ?? null)}</Text>
                            <Text style={{ color: t.textoSecundario, fontSize: 9 }}>{p30?.diasTomados ?? 0}/{p30?.diasProgramados ?? 0} · 30d</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </Seccion>

            {/* Por dia de la semana */}
            {resumen30.plan.length > 0 && (
              <Seccion titulo="POR DÍA DE LA SEMANA" nota="Últimos 30 días" t={t}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 96 }}>
                  {porDia.map((d) => {
                    const h = d.pct === null ? 0 : Math.max(4, Math.round((d.pct / 100) * 60));
                    return (
                      <View key={d.dow} style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={{ color: colorPct(d.pct), fontSize: 10, fontWeight: '700', marginBottom: 4 }}>{pctTexto(d.pct)}</Text>
                        <View style={{ width: 18, height: 60, justifyContent: 'flex-end' }}>
                          <View style={{
                            height: h, borderRadius: 4,
                            backgroundColor: d.pct === null ? t.borde : colorPct(d.pct),
                          }} />
                        </View>
                        <Text style={{ color: t.textoSecundario, fontSize: 10, marginTop: 4 }}>{d.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </Seccion>
            )}

            {/* Eventuales */}
            {resumen30.eventuales.length > 0 && (
              <Seccion titulo="EVENTUALES" nota="Días con registro en 30 días · no restan" t={t}>
                <View style={{ gap: 8 }}>
                  {resumen30.eventuales.map((e) => (
                    <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: t.texto, fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>{e.name}</Text>
                      <Text style={{ color: t.textoSecundario, fontSize: 12 }}>
                        {e.diasTomados === 1 ? '1 día' : `${e.diasTomados} días`}
                      </Text>
                    </View>
                  ))}
                </View>
              </Seccion>
            )}

            {/* Dia por dia */}
            <Seccion titulo="ÚLTIMOS 30 DÍAS" t={t}>
              {!hayTomas && (
                <Text style={{ color: t.textoSecundario, fontSize: 12, lineHeight: 17, marginBottom: 8 }}>
                  Sin tomas registradas en estos 30 días.
                </Text>
              )}
              <View style={{ gap: 10 }}>
                {dias.map((d) => {
                  const vacio = d.tomas.length === 0;
                  return (
                    <View key={d.fecha} style={{
                      backgroundColor: vacio ? 'transparent' : t.hundido, borderRadius: 12,
                      paddingVertical: vacio ? 4 : 10, paddingHorizontal: vacio ? 0 : 12,
                      borderWidth: vacio ? 0 : 1, borderColor: t.borde,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: vacio ? t.textoSecundario : t.texto, fontSize: 12, fontWeight: '700', flex: 1 }}>
                          {etiquetaDia(d.fecha, hoy)}
                        </Text>
                        {d.planProgramadas > 0 ? (
                          <Text style={{ color: d.planTomadas >= d.planProgramadas ? t.exito : t.textoSecundario, fontSize: 11, fontWeight: '700' }}>
                            {d.planTomadas}/{d.planProgramadas} del plan
                          </Text>
                        ) : (
                          <Text style={{ color: t.textoSecundario, fontSize: 11 }}>{vacio ? 'Sin registro' : ''}</Text>
                        )}
                      </View>
                      {!vacio && (
                        <View style={{ marginTop: 6, gap: 4 }}>
                          {d.tomas.map((toma) => (
                            <View key={`${toma.supplementId}-${toma.doseIndex}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="checkmark-circle" size={13} color={toma.isPlan ? (kind === 'dark' ? '#1D9E75' : t.tealTexto) : t.textoSecundario} />
                              <Text style={{ color: t.texto, fontSize: 12, flex: 1 }} numberOfLines={1}>
                                {toma.name}{toma.doseLabel ? ` · ${toma.doseLabel}` : ''}{toma.isPlan ? '' : ' · eventual'}
                              </Text>
                              <Text style={{ color: toma.variable ? (kind === 'dark' ? '#fbbf24' : t.advertencia) : t.textoSecundario, fontSize: 11, fontWeight: toma.variable ? '700' : '400' }}>
                                {toma.cantidad}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </Seccion>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Seccion({ titulo, nota, children, t }: { titulo: string; nota?: string; children: ReactNode; t: AppThemeTokens }) {
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 18 }}>
      <View style={{ marginBottom: 8 }}>
        <Text style={{ color: t.texto, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>{titulo}</Text>
        {nota ? <Text style={{ color: t.textoSecundario, fontSize: 10, marginTop: 2 }}>{nota}</Text> : null}
      </View>
      <View style={{ backgroundColor: t.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: t.borde }}>
        {children}
      </View>
    </View>
  );
}

function Kpi({ label, valor, sub, color, t }: { label: string; valor: string; sub: string; color: string; t: AppThemeTokens }) {
  return (
    <View style={{ flex: 1, backgroundColor: t.hundido, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.borde }}>
      <Text style={{ color: t.textoSecundario, fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>{label}</Text>
      <Text style={{ color, fontSize: 26, fontWeight: '800', marginTop: 2 }}>{valor}</Text>
      <Text style={{ color: t.textoSecundario, fontSize: 10 }}>{sub}</Text>
    </View>
  );
}
