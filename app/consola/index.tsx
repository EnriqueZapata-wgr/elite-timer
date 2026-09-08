/**
 * /consola — la lista de clientes de Enrique (8-sep-2026).
 *
 * Una sola pregunta: a quien le hablo hoy. Por eso la lista viene ordenada por
 * atencion (lo urgente arriba) y no alfabetica, y por eso cada renglon dice
 * solo tres cosas: quien es, cuando dejo la ultima senal y cuanto esta
 * haciendo de lo que se le puso. Todo lo demas esta a un toque, en el detalle.
 *
 * Dos segmentos: ELITE (quien tiene evaluacion o nivel Elite) y SEGUIMIENTOS
 * (quien ya no es Elite hoy pero tiene mapa funcional o suplementos de antes:
 * el otro producto). Debajo, lo que le TOCA a Enrique dar de alta.
 *
 * El candado es de servidor: RLS solo deja leer datos de salud de quien tiene
 * fila activa en `coach_clients` con `coach_id = auth.uid()`. Esta pantalla
 * ademas se cierra si `admin_users` no reconoce la sesion, pero ese es el
 * candado de interfaz, no el que protege.
 *
 * Estados: cargando, sin acceso, vacio real, no se pudo leer con reintentar.
 * Tema claro y oscuro. `t.sinDatos` solo como borde, nunca como tinta.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { Card } from '@/src/components/ui/Card';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { EliteText } from '@/components/elite-text';
import { useAuth } from '@/src/contexts/auth-context';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import {
  esElite,
  esSeguimiento,
  etiquetaDias,
  ordenarPorAtencion,
  pendientesDeCliente,
  temperatura,
  type ClienteConsola,
  type Temperatura,
} from '@/src/services/consola/consola-core';
import {
  cargarCandidatos,
  cargarClientes,
  esAdminDeConsola,
  vincularCliente,
  type Candidato,
} from '@/src/services/consola/consola-service';

type Segmento = 'elite' | 'seguimiento';
type Estado = 'cargando' | 'sinAcceso' | 'error' | 'listo';

/** El color de la senal. Nunca va solo: siempre lleva su texto al lado (WCAG 1.4.1). */
function colorSenal(temp: Temperatura, t: AppThemeTokens): string {
  if (temp === 'hoy' || temp === 'reciente') return t.exito;
  if (temp === 'enfriando') return t.advertencia;
  return t.critico;
}

export default function ConsolaScreen() {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [clientes, setClientes] = useState<ClienteConsola[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [segmento, setSegmento] = useState<Segmento>('elite');
  const [vinculando, setVinculando] = useState<string | null>(null);
  const hoy = getLocalToday();

  const cargar = useCallback(async () => {
    if (!user?.id) return;
    setEstado('cargando');
    const admin = await esAdminDeConsola(user.id);
    if (!admin) { setEstado('sinAcceso'); return; }
    const [lista, altas] = await Promise.all([cargarClientes(user.id), cargarCandidatos(user.id)]);
    if (lista.estado === 'error') { setEstado('error'); return; }
    setClientes(lista.datos);
    // Que la lista de altas falle no rompe la consola: es un extra.
    setCandidatos(altas.estado === 'ok' ? altas.datos : []);
    setEstado('listo');
  }, [user?.id]);

  useEffect(() => { cargar().catch(() => setEstado('error')); }, [cargar]);

  const onVincular = useCallback((c: Candidato) => {
    if (!user?.id) return;
    haptic.medium();
    Alert.alert(
      'Dar de alta',
      `Vas a poder ver los datos de salud de ${c.nombre}. Hazlo solo si es tu cliente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Dar de alta',
          onPress: async () => {
            setVinculando(c.id);
            const ok = await vincularCliente(user.id, c.id);
            setVinculando(null);
            if (ok) { haptic.success(); cargar().catch(() => setEstado('error')); }
            else { haptic.warning(); Alert.alert('No se pudo dar de alta', 'Intenta de nuevo en un momento.'); }
          },
        },
      ],
    );
  }, [user?.id, cargar]);

  const elite = useMemo(
    () => ordenarPorAtencion(clientes.filter(esElite), hoy), [clientes, hoy]);
  const seguimientos = useMemo(
    () => ordenarPorAtencion(clientes.filter(esSeguimiento), hoy), [clientes, hoy]);
  // Quien no es ni una cosa ni la otra existe y no se esconde: seria un cliente
  // invisible. Se cuelga del segmento Elite porque ahi es donde falta cargarle
  // la evaluacion, que es justo su pendiente.
  const sinClasificar = useMemo(
    () => ordenarPorAtencion(clientes.filter((c) => !esElite(c) && !esSeguimiento(c)), hoy), [clientes, hoy]);

  const visibles = segmento === 'elite' ? [...elite, ...sinClasificar] : seguimientos;

  const renglon = (c: ClienteConsola, i: number) => {
    const pend = pendientesDeCliente(c, hoy);
    const temp = c.senal.estado === 'ok' ? temperatura(c.senal.dias) : 'frio';
    return (
      <Animated.View key={c.id} entering={FadeInUp.delay(40 + i * 30).springify()}>
        <AnimatedPressable
          onPress={() => { haptic.light(); router.push({ pathname: '/consola/[clienteId]', params: { clienteId: c.id } }); }}
          style={s.fila}
        >
          <View style={s.filaTop}>
            <View style={{ flex: 1 }}>
              <EliteText variant="body" style={s.nombre}>{c.nombre}</EliteText>
              <View style={s.senalFila}>
                <View style={[s.punto, { backgroundColor: colorSenal(temp, t) }]} />
                <EliteText variant="caption" style={[s.senalTexto, { color: colorSenal(temp, t) }]}>
                  {c.senal.estado === 'sinDato'
                    ? 'Sin ninguna señal'
                    : `${etiquetaDias(c.senal.dias)} (${c.senal.fuente})`}
                </EliteText>
              </View>
            </View>
            <View style={s.adherenciaCaja}>
              {c.adherencia.estado === 'ok' ? (
                <>
                  <EliteText variant="body" style={s.adherenciaCifra}>{c.adherencia.pct}%</EliteText>
                  <EliteText variant="caption" style={s.adherenciaPie}>
                    {c.adherencia.hechos} de {c.adherencia.esperados}
                  </EliteText>
                </>
              ) : (
                <>
                  <EliteText variant="body" style={s.adherenciaVacia}>Sin dato</EliteText>
                  <EliteText variant="caption" style={s.adherenciaPie}>adherencia</EliteText>
                </>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textoSecundario} />
          </View>
          {pend.length > 0 && (
            <View style={s.chips}>
              {pend.map((p) => (
                <View
                  key={p.tipo}
                  style={[s.chip, { borderColor: p.urgencia === 2 ? t.critico : t.advertencia }]}
                >
                  <EliteText
                    variant="caption"
                    style={[s.chipTexto, { color: p.urgencia === 2 ? t.critico : t.advertencia }]}
                  >
                    {p.texto}
                  </EliteText>
                </View>
              ))}
            </View>
          )}
        </AnimatedPressable>
      </Animated.View>
    );
  };

  const cuerpo = () => {
    if (estado === 'cargando') {
      return <View style={s.centro}><ActivityIndicator size="large" color={ATP_BRAND.lime} /></View>;
    }

    if (estado === 'sinAcceso') {
      return (
        <View style={s.centro}>
          <Ionicons name="lock-closed-outline" size={40} color={t.textoSecundario} />
          <EliteText variant="body" style={s.vacioTitulo}>Esta pantalla no es para tu cuenta</EliteText>
          <EliteText variant="caption" style={s.vacioTexto}>
            La consola muestra datos de salud de otras personas y solo la abre la cuenta del coach.
          </EliteText>
        </View>
      );
    }

    if (estado === 'error') {
      return (
        <View style={s.centro}>
          <Ionicons name="cloud-offline-outline" size={40} color={t.error} />
          <EliteText variant="body" style={s.vacioTitulo}>No se pudo leer</EliteText>
          <EliteText variant="caption" style={s.vacioTexto}>
            No pudimos traer a tus clientes. No quiere decir que no tengan datos.
          </EliteText>
          <AnimatedPressable onPress={() => { haptic.light(); cargar().catch(() => setEstado('error')); }} style={s.boton}>
            <EliteText variant="body" style={s.botonTexto}>Reintentar</EliteText>
          </AnimatedPressable>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}>
        <View style={s.segmentos}>
          {([['elite', `Elite (${elite.length + sinClasificar.length})`],
             ['seguimiento', `Seguimientos (${seguimientos.length})`]] as const).map(([id, label]) => (
            <AnimatedPressable
              key={id}
              onPress={() => { haptic.light(); setSegmento(id); }}
              style={[s.segmento, segmento === id && s.segmentoActivo]}
            >
              <EliteText
                variant="caption"
                style={[s.segmentoTexto, segmento === id && s.segmentoTextoActivo]}
              >
                {label}
              </EliteText>
            </AnimatedPressable>
          ))}
        </View>

        {visibles.length === 0 ? (
          <Card variant="elevated">
            <EliteText variant="body" style={s.vacioTitulo}>
              {segmento === 'elite' ? 'Todavía no tienes clientes aquí' : 'Nadie para seguimiento todavía'}
            </EliteText>
            <EliteText variant="caption" style={s.vacioTexto}>
              {segmento === 'elite'
                ? 'Da de alta a tus clientes abajo. Mientras no estén dados de alta, el servidor no te deja ver un solo dato suyo.'
                : 'Aquí van a salir quienes ya no son Elite hoy pero tienen mapa funcional o suplementos asignados de antes.'}
            </EliteText>
          </Card>
        ) : (
          visibles.map(renglon)
        )}

        {candidatos.length > 0 && (
          <View style={s.bloqueAltas}>
            <EliteText variant="caption" style={s.tituloBloque}>Por dar de alta</EliteText>
            <EliteText variant="caption" style={s.notaBloque}>
              Cuentas que existen y no están vinculadas a ti. Hasta que las des de alta, sus datos de
              salud no se leen desde aquí.
            </EliteText>
            {candidatos.map((c) => (
              <View key={c.id} style={s.candidato}>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={s.nombre}>{c.nombre}</EliteText>
                  <EliteText variant="caption" style={s.candidatoCorreo}>{c.email}</EliteText>
                </View>
                <AnimatedPressable
                  onPress={() => onVincular(c)}
                  style={[s.botonChico, vinculando === c.id && { opacity: 0.5 }]}
                >
                  <EliteText variant="caption" style={s.botonChicoTexto}>
                    {vinculando === c.id ? 'Dando de alta' : 'Dar de alta'}
                  </EliteText>
                </AnimatedPressable>
              </View>
            ))}
          </View>
        )}

        <EliteText variant="caption" style={s.pie}>
          La señal es el último rastro que dejó en la app (una marca, un registro, ARGOS), no la
          hora en que la abrió: la base no guarda aperturas. La adherencia mide los últimos 14 días.
        </EliteText>
      </ScrollView>
    );
  };

  return (
    <ThemeReady>
      <Screen edges={[]} themed>
        <ScreenHeader title="Consola" onBack={() => router.back()} sinExplicar />
        {cuerpo()}
      </Screen>
    </ThemeReady>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  contenido: { padding: Spacing.md, paddingBottom: Spacing.xxl * 2, gap: Spacing.sm },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },

  segmentos: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.xs },
  segmento: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center',
    backgroundColor: t.hundido, borderWidth: 1, borderColor: t.borde,
  },
  segmentoActivo: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.16), borderColor: ATP_BRAND.lime },
  segmentoTexto: { color: t.textoSecundario, fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  segmentoTextoActivo: { color: t.texto },

  fila: {
    backgroundColor: t.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.md, gap: Spacing.sm,
  },
  filaTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nombre: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  senalFila: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  senalTexto: { fontSize: FontSizes.sm },

  adherenciaCaja: { alignItems: 'flex-end', minWidth: 76 },
  adherenciaCifra: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.lg },
  adherenciaVacia: { color: t.textoSecundario, fontFamily: Fonts.regular, fontSize: FontSizes.sm },
  adherenciaPie: { color: t.textoSecundario, fontSize: FontSizes.xs },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  chipTexto: { fontSize: FontSizes.xs },

  bloqueAltas: {
    marginTop: Spacing.lg, padding: Spacing.md, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: t.sinDatos, borderStyle: 'dashed', gap: Spacing.sm,
  },
  tituloBloque: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  notaBloque: { color: t.textoSecundario, fontSize: FontSizes.xs, lineHeight: 16 },
  candidato: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  candidatoCorreo: { color: t.textoSecundario, fontSize: FontSizes.xs },

  boton: {
    marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, backgroundColor: ATP_BRAND.lime,
  },
  botonTexto: { color: t.textoSobreLima, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  botonChico: {
    paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: ATP_BRAND.lime,
  },
  botonChicoTexto: { color: t.texto, fontFamily: Fonts.regular, fontSize: FontSizes.xs },

  vacioTitulo: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md, textAlign: 'center' },
  vacioTexto: { color: t.textoSecundario, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 19 },
  pie: { color: t.textoSecundario, fontSize: FontSizes.xs, lineHeight: 16, marginTop: Spacing.lg },
});
