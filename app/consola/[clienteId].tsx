/**
 * /consola/[clienteId] — el detalle de un cliente (8-sep-2026).
 *
 * Se abre cuando Enrique ya sabe A QUIEN le habla y quiere saber DE QUE. Cinco
 * bloques y se acabo: en que anda, si esta vivo, si esta cumpliendo, que subio
 * de nuevo y que le toca a el.
 *
 * NO PINTA CEROS QUE NO SON. Cuando `adherencia` viene sin dato, el bloque dice
 * el motivo escrito (nada asignado, recien cargado, sin ningun registro) en vez
 * de un 0% que se lee como incumplimiento. Lo mismo cada intervencion: si su
 * ventana todavia no arranca, sale el glifo de sin dato, no un cero.
 *
 * Los datos que se ven aqui salen de una lectura que RLS solo concede si existe
 * la fila activa en `coach_clients`. Si no existe, esta pantalla queda vacia
 * aunque alguien llegue por deep link.
 *
 * Estados: cargando, no encontrado, no se pudo leer con reintentar. Tema claro
 * y oscuro. `t.sinDatos` solo como borde o glifo, nunca como tinta de texto.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { getLocalToday, formatLocalDate } from '@/src/utils/date-helpers';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import {
  SIN_DATO,
  TEXTO_SIN_ADHERENCIA,
  VENTANA_ADHERENCIA_DIAS,
  etiquetaDias,
  pendientesDeCliente,
  temperatura,
  type ClienteConsola,
} from '@/src/services/consola/consola-core';
import {
  cargarClientes,
  cargarDetalle,
  esAdminDeConsola,
  type DetalleCliente,
} from '@/src/services/consola/consola-service';

type Estado = 'cargando' | 'sinAcceso' | 'error' | 'noEsta' | 'listo';

export default function ConsolaClienteScreen() {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const { clienteId } = useLocalSearchParams<{ clienteId: string }>();

  const [estado, setEstado] = useState<Estado>('cargando');
  const [cliente, setCliente] = useState<ClienteConsola | null>(null);
  const [detalle, setDetalle] = useState<DetalleCliente | null>(null);
  const hoy = getLocalToday();

  const cargar = useCallback(async () => {
    if (!user?.id || !clienteId) return;
    setEstado('cargando');
    const admin = await esAdminDeConsola(user.id);
    if (!admin) { setEstado('sinAcceso'); return; }
    // La lista se relee entera a proposito: es una sola consulta por tabla para
    // menos de una docena de clientes, y asi el detalle nunca ensena una cifra
    // mas vieja que la lista de la que se abrio.
    const [lista, extra] = await Promise.all([cargarClientes(user.id), cargarDetalle(clienteId)]);
    if (lista.estado === 'error' || extra.estado === 'error') { setEstado('error'); return; }
    const c = lista.datos.find((x) => x.id === clienteId) ?? null;
    if (!c) { setEstado('noEsta'); return; }
    setCliente(c);
    setDetalle(extra.datos);
    setEstado('listo');
  }, [user?.id, clienteId]);

  useEffect(() => { cargar().catch(() => setEstado('error')); }, [cargar]);

  const bloqueMensaje = (icono: keyof typeof Ionicons.glyphMap, titulo: string, texto: string, conBoton: boolean) => (
    <View style={s.centro}>
      <Ionicons name={icono} size={40} color={t.textoSecundario} />
      <EliteText variant="body" style={s.tituloCentro}>{titulo}</EliteText>
      <EliteText variant="caption" style={s.textoCentro}>{texto}</EliteText>
      {conBoton && (
        <AnimatedPressable onPress={() => { haptic.light(); cargar().catch(() => setEstado('error')); }} style={s.boton}>
          <EliteText variant="body" style={s.botonTexto}>Reintentar</EliteText>
        </AnimatedPressable>
      )}
    </View>
  );

  const cuerpo = () => {
    if (estado === 'cargando') {
      return <View style={s.centro}><ActivityIndicator size="large" color={ATP_BRAND.lime} /></View>;
    }
    if (estado === 'sinAcceso') {
      return bloqueMensaje('lock-closed-outline', 'Esta pantalla no es para tu cuenta',
        'Muestra datos de salud de otra persona y solo la abre la cuenta del coach.', false);
    }
    if (estado === 'error') {
      return bloqueMensaje('cloud-offline-outline', 'No se pudo leer',
        'No pudimos traer los datos de este cliente. No quiere decir que no tenga.', true);
    }
    if (estado === 'noEsta' || !cliente || !detalle) {
      return bloqueMensaje('person-outline', 'No está en tu lista',
        'Este cliente no está dado de alta contigo, así que el servidor no entrega sus datos.', false);
    }

    const pend = pendientesDeCliente(cliente, hoy);
    const temp = cliente.senal.estado === 'ok' ? temperatura(cliente.senal.dias) : 'frio';
    const colorTemp = temp === 'hoy' || temp === 'reciente' ? t.exito
      : temp === 'enfriando' ? t.advertencia : t.critico;

    return (
      <ScrollView contentContainerStyle={s.contenido} showsVerticalScrollIndicator={false}>
        {/* ── En que anda ── */}
        <Animated.View entering={FadeInUp.delay(40).springify()}>
          <Card variant="elevated">
            <EliteText variant="body" style={s.nombre}>{cliente.nombre}</EliteText>
            <EliteText variant="caption" style={s.correo}>{cliente.email}</EliteText>
            <View style={s.separador} />
            <Dato t={t} etiqueta="Evaluación Elite" valor={cliente.evaluacion
              ? `Versión ${cliente.evaluacion.version} · ${formatLocalDate(cliente.evaluacion.fecha, { day: 'numeric', month: 'long', year: 'numeric' })}`
              : null} vacio="Sin evaluación cargada" />
            <Dato t={t} etiqueta="Objetivos" valor={cliente.objetivos.length > 0 ? cliente.objetivos.join(', ') : null}
              vacio="No ha contestado el cuestionario" />
            <Dato t={t} etiqueta="Acceso" valor={cliente.accesoVence
              ? `Vence el ${formatLocalDate(cliente.accesoVence, { day: 'numeric', month: 'long', year: 'numeric' })}`
              : null} vacio="Sin fecha de vencimiento" />
            <Dato t={t} etiqueta="Suplementos asignados"
              valor={cliente.suplementosActivos > 0 ? `${cliente.suplementosActivos}` : null} vacio="Ninguno" />
          </Card>
        </Animated.View>

        {/* ── Si esta vivo ── */}
        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <Card variant="elevated">
            <EliteText variant="caption" style={s.tituloBloque}>Última señal</EliteText>
            {cliente.senal.estado === 'ok' ? (
              <>
                <EliteText variant="body" style={[s.cifra, { color: colorTemp }]}>
                  {etiquetaDias(cliente.senal.dias)}
                </EliteText>
                <EliteText variant="caption" style={s.nota}>
                  {formatLocalDate(cliente.senal.fecha, { day: 'numeric', month: 'long' })}, desde {cliente.senal.fuente}.
                  Es el último rastro que dejó en la app, no la hora en que la abrió.
                </EliteText>
              </>
            ) : (
              <>
                <EliteText variant="body" style={[s.cifra, { color: t.critico }]}>Sin ninguna señal</EliteText>
                <EliteText variant="caption" style={s.nota}>
                  No hay ni un registro suyo en la app. Puede que nunca haya entrado.
                </EliteText>
              </>
            )}
          </Card>
        </Animated.View>

        {/* ── Si esta cumpliendo ── */}
        <Animated.View entering={FadeInUp.delay(120).springify()}>
          <Card variant="elevated">
            <EliteText variant="caption" style={s.tituloBloque}>
              Adherencia de los últimos {VENTANA_ADHERENCIA_DIAS} días
            </EliteText>
            {cliente.adherencia.estado === 'ok' ? (
              <>
                <EliteText variant="body" style={s.cifra}>{cliente.adherencia.pct}%</EliteText>
                <EliteText variant="caption" style={s.nota}>
                  {cliente.adherencia.hechos} de {cliente.adherencia.esperados} días marcados, contando
                  desde que le activaste cada cosa.
                </EliteText>
              </>
            ) : (
              <>
                <EliteText variant="body" style={s.cifraVacia}>No hay dato</EliteText>
                <EliteText variant="caption" style={s.nota}>
                  {TEXTO_SIN_ADHERENCIA[cliente.adherencia.motivo]}
                </EliteText>
              </>
            )}

            {detalle.intervenciones.length > 0 && <View style={s.separador} />}
            {detalle.intervenciones.map((iv) => (
              <View key={iv.id} style={s.renglonIntervencion}>
                <EliteText variant="caption" style={s.intervencionNombre} numberOfLines={2}>{iv.nombre}</EliteText>
                <EliteText variant="caption" style={s.intervencionCifra}>
                  {iv.esperados > 0 ? `${iv.marcados}/${iv.esperados}` : SIN_DATO}
                </EliteText>
              </View>
            ))}
            {detalle.intervenciones.length === 0 && (
              <EliteText variant="caption" style={s.nota}>
                No tiene intervenciones activas. Es lo primero que hay que cargarle.
              </EliteText>
            )}
          </Card>
        </Animated.View>

        {/* ── Suplementos asignados ── */}
        {detalle.suplementos.length > 0 && (
          <Animated.View entering={FadeInUp.delay(160).springify()}>
            <Card variant="elevated">
              <EliteText variant="caption" style={s.tituloBloque}>Suplementos asignados</EliteText>
              {detalle.suplementos.map((sup, i) => (
                <View key={`${sup.nombre}-${i}`} style={s.renglonIntervencion}>
                  <EliteText variant="caption" style={s.intervencionNombre} numberOfLines={2}>{sup.nombre}</EliteText>
                  <EliteText variant="caption" style={s.intervencionCifra}>
                    {sup.dosis ?? SIN_DATO}
                  </EliteText>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* ── Lo nuevo suyo ── */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Card variant="elevated">
            <EliteText variant="caption" style={s.tituloBloque}>Lo nuevo suyo</EliteText>
            {cliente.novedades.length === 0 ? (
              <EliteText variant="caption" style={s.nota}>
                No ha subido nada todavía: ni laboratorios, ni síntomas, ni cuestionario.
              </EliteText>
            ) : cliente.novedades.map((n) => (
              <View key={n.tipo} style={s.renglonIntervencion}>
                <EliteText variant="caption" style={s.intervencionNombre}>{n.texto}</EliteText>
                <EliteText variant="caption" style={s.intervencionCifra}>{etiquetaDias(diasHasta(n.fecha, hoy))}</EliteText>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* ── Que le toca a Enrique ── */}
        {pend.length > 0 && (
          <Animated.View entering={FadeInUp.delay(240).springify()}>
            <Card variant="elevated">
              <EliteText variant="caption" style={s.tituloBloque}>Te toca a ti</EliteText>
              {pend.map((p) => (
                <View key={p.tipo} style={s.renglonPendiente}>
                  <View style={[s.punto, { backgroundColor: p.urgencia === 2 ? t.critico : t.advertencia }]} />
                  <EliteText variant="caption" style={[s.pendienteTexto, { color: p.urgencia === 2 ? t.critico : t.advertencia }]}>
                    {p.texto}
                  </EliteText>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    );
  };

  return (
    <ThemeReady>
      <Screen edges={[]} themed>
        <ScreenHeader title={cliente?.nombre ?? 'Cliente'} onBack={() => router.back()} sinExplicar />
        {cuerpo()}
      </Screen>
    </ThemeReady>
  );
}

/** Dias de calendario entre una fecha y hoy. Duplicado minimo para no traer el core a la vista. */
function diasHasta(fecha: string, hoy: string): number {
  const ms = Date.UTC(+hoy.slice(0, 4), +hoy.slice(5, 7) - 1, +hoy.slice(8, 10))
    - Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10));
  return Math.max(0, Math.round(ms / 86400000));
}

/** Un renglon etiqueta/valor. Sin valor pinta la frase de vacio, no un guion mudo. */
function Dato({ t, etiqueta, valor, vacio }: {
  t: AppThemeTokens; etiqueta: string; valor: string | null; vacio: string;
}) {
  return (
    <View style={{ marginTop: Spacing.sm }}>
      <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: FontSizes.xs }}>
        {etiqueta}
      </EliteText>
      <EliteText
        variant="caption"
        style={{ color: valor ? t.texto : t.textoSecundario, fontSize: FontSizes.sm, marginTop: 2 }}
      >
        {valor ?? vacio}
      </EliteText>
    </View>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  contenido: { padding: Spacing.md, paddingBottom: Spacing.xxl * 2, gap: Spacing.sm },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  tituloCentro: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md, textAlign: 'center' },
  textoCentro: { color: t.textoSecundario, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 19 },

  nombre: { color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg },
  correo: { color: t.textoSecundario, fontSize: FontSizes.xs },
  separador: { height: 1, backgroundColor: t.borde, marginVertical: Spacing.sm },

  tituloBloque: { color: t.textoSecundario, fontSize: FontSizes.xs, textTransform: 'uppercase', letterSpacing: 1 },
  cifra: { color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.xxl, marginTop: 4 },
  cifraVacia: { color: t.textoSecundario, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg, marginTop: 4 },
  nota: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 18, marginTop: 4 },

  renglonIntervencion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: Spacing.sm, paddingVertical: 6,
  },
  intervencionNombre: { color: t.texto, fontSize: FontSizes.sm, flex: 1 },
  intervencionCifra: { color: t.textoSecundario, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },

  renglonPendiente: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 5 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  pendienteTexto: { fontSize: FontSizes.sm, flex: 1 },

  boton: {
    marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, backgroundColor: ATP_BRAND.lime,
  },
  botonTexto: { color: t.textoSobreLima, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
});
