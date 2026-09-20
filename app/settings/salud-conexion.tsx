/**
 * AJUSTES › CONEXIONES › SALUD DEL TELÉFONO (NOCHE-1).
 *
 * Aquí se conecta, se ve QUÉ entra, y se desconecta. Vive colgada de
 * Conexiones y no en una pantalla nueva suelta, porque el usuario ya busca
 * ahí cuando quiere vincular algo.
 *
 * Regla de la pantalla: NUNCA queda en "Cargando..." para siempre. El estado
 * inicial es "consultando", el servicio tiene límite de tiempo en cada llamada
 * nativa, y el `finally` apaga el spinner pase lo que pase. Si la plataforma
 * no contesta, se ve el estado honesto, no un spinner eterno.
 *
 * Los tres estados incómodos se dicen con todas sus letras: permiso que
 * todavía no se pide, permiso negado, y plataforma que no soporta nada.
 */
import { useCallback, useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Switch, ActivityIndicator, Alert, DeviceEventEmitter, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteText } from '@/components/elite-text';
import { SectionLabel, Divider, ui } from '@/src/components/settings/settings-ui';
import { haptic } from '@/src/utils/haptics';
import { Fonts, Spacing, Radius, FontSizes } from '@/constants/theme';
import { ATP_BRAND, CATEGORY_COLORS } from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { useColchonOrbe } from '@/src/components/argos/useColchonOrbe';
import { paddingBottomConColchon } from '@/src/components/argos/argos-floating-core';
import { useAuth } from '@/src/contexts/auth-context';
import { formatLocalDate } from '@/src/utils/date-helpers';
import { invalidarSaludDelDia } from '@/src/hooks/useWearableToday';
import {
  DEFINICIONES,
  abrirAjustesPlataforma,
  conectar,
  desconectar,
  getSyncAutomatica,
  getUltimoSync,
  leerDias,
  leerEstado,
  puedeLeer,
  setSyncAutomatica,
  sincronizar,
  type DiaSalud,
  type EstadoSalud,
  type MetricaSalud,
} from '@/src/services/health/health-platform-service';

const SALUD = CATEGORY_COLORS.metrics;

/** Último valor conocido de una métrica en la ventana leída, ya formateado. */
function ultimoValor(dias: readonly DiaSalud[], m: MetricaSalud): string | null {
  for (let i = dias.length - 1; i >= 0; i--) {
    const v = dias[i][m];
    if (v == null) continue;
    if (m === 'pasos') return `${v.toLocaleString('es-MX')} pasos`;
    if (m === 'sueno') return `${Math.floor(v / 60)} h ${v % 60} min`;
    if (m === 'fc_reposo') return `${v} lpm`;
    if (m === 'peso') return `${v} kg`;
    return `${v.toLocaleString('es-MX')} kcal`;
  }
  return null;
}

export default function SaludConexionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { kind, tokens } = useAppTheme();
  // 20-sep-2026: colchón para la orbe de ARGOS (esta pantalla no usa <Screen>,
  // que lo aplicaría solo). Gana el mayor, no la suma.
  const colchonOrbe = useColchonOrbe();
  const dark = kind === 'dark';
  const acento = dark ? SALUD : tokens.tealTexto;

  const [consultando, setConsultando] = useState(true);
  const [estado, setEstado] = useState<EstadoSalud | null>(null);
  const [dias, setDias] = useState<DiaSalud[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [ultimoSync, setUltimoSync] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    setConsultando(true);
    try {
      const e = await leerEstado();
      setEstado(e);
      setAutoSync(await getSyncAutomatica());
      setUltimoSync(await getUltimoSync());
      // Solo pedimos datos si de verdad hay algo que leer: en cualquier otro
      // estado la lista de métricas se muestra vacía, que es la verdad.
      // 20-sep-2026: puedeLeer incluye 'sin_verificar' (iOS), donde leer es
      // la única forma de saber si el permiso se concedió.
      setDias(puedeLeer(e.estado) ? await leerDias(7) : []);
    } catch {
      // Que la pantalla siga siendo usable aunque todo falle.
      setEstado(null);
    } finally {
      // Pase lo que pase, el spinner se apaga.
      setConsultando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

  const alConectar = async () => {
    haptic.medium();
    setOcupado(true);
    try {
      const e = await conectar();
      setEstado(e);
      if (puedeLeer(e.estado)) setDias(await leerDias(7));
    } finally {
      setOcupado(false);
    }
  };

  const alSincronizar = async () => {
    if (!user?.id) return;
    haptic.medium();
    setOcupado(true);
    try {
      const r = await sincronizar(user.id, 7);
      setUltimoSync(await getUltimoSync());
      // 20-sep-2026: sincronizar también escribe sleep_nights (las noches
      // nuevas), y se dice: antes el cliente veía "se guardaron 7 días" y en
      // Sueño seguía sin aparecer nada.
      const noches = r.nochesImportadas > 0
        ? ` ${r.nochesImportadas === 1 ? 'Una noche nueva ya aparece' : `${r.nochesImportadas} noches nuevas ya aparecen`} en Sueño.`
        : r.nochesFallaron
          ? ' Las noches de sueño no se pudieron guardar; intenta de nuevo desde Sueño.'
          : '';
      Alert.alert(
        r.ok ? 'Listo' : 'No se pudo',
        r.ok
          ? r.diasEscritos > 0
            ? `Se guardaron ${r.diasEscritos} ${r.diasEscritos === 1 ? 'día' : 'días'} de datos.${noches}`
            : `No encontramos datos nuevos en los últimos días.${noches}`
          : (r.error ?? 'Intenta de nuevo.'),
      );
      setDias(await leerDias(7));
      // CIERRE-3: cerrar el lazo. Antes, sincronizar escribía en
      // health_os_daily y ahí moría: la persona veía "se guardaron 7 días" y
      // volvía a HOY exactamente igual que antes. Invalidar el vuelo cacheado
      // y pedir un recompile es lo que convierte el mensaje en algo visible.
      invalidarSaludDelDia();
      DeviceEventEmitter.emit('day_changed');
    } finally {
      setOcupado(false);
    }
  };

  const alDesconectar = () => {
    Alert.alert(
      'Desconectar',
      'ATP dejará de leer y de sincronizar tus datos de salud, incluido el sueño que se importa solo. Lo que ya se guardó se queda en tu expediente. El permiso del sistema se quita desde los ajustes de tu plataforma de salud, no desde aquí. Conectar de nuevo, o importar tu sueño desde Sueño, la vuelve a encender.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            await desconectar();
            haptic.light();
            refrescar();
          },
        },
      ],
    );
  };

  const alAccionar = () => {
    if (!estado) return;
    if (estado.accion === 'pedir_permiso') return alConectar();
    if (estado.accion === 'abrir_ajustes' || estado.accion === 'instalar_health_connect') {
      haptic.light();
      return abrirAjustesPlataforma();
    }
  };

  const conectado = estado?.estado === 'conectado';
  // iOS honesto (20-sep-2026): 'sin_verificar' no es "conectado", pero sí se
  // lee y se sincroniza, porque leer es la única forma de saber.
  const sinVerificar = estado?.estado === 'sin_verificar';
  const puedeLeerDatos = !!estado && puedeLeer(estado.estado);

  return (
    <ThemeReady>
    <View style={[ui.screenRoot, { backgroundColor: tokens.fondo }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScreenHeader title="Salud del teléfono" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: paddingBottomConColchon(0, colchonOrbe) }}>

        {/* ══════ ESTADO ══════ */}
        <Animated.View entering={FadeInUp.delay(80).springify()}>
          <SectionLabel color={acento}>ESTADO</SectionLabel>
          <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.borde }]}>
            {consultando ? (
              // Estado acotado: el servicio corta cada llamada nativa por
              // tiempo, así que esto dura segundos, no para siempre.
              <View style={styles.cargandoFila}>
                <ActivityIndicator size="small" color={acento} />
                <EliteText variant="caption" style={{ color: tokens.textoSecundario }}>
                  Consultando tu plataforma de salud...
                </EliteText>
              </View>
            ) : !estado ? (
              <>
                <EliteText variant="body" style={styles.titulo}>No pudimos consultar</EliteText>
                <EliteText variant="caption" style={[styles.mensaje, { color: tokens.textoSecundario }]}>
                  Tu plataforma de salud no contestó. Puedes intentar de nuevo.
                </EliteText>
                <Pressable onPress={refrescar} style={[styles.boton, { borderColor: acento }]}>
                  <EliteText variant="body" style={[styles.botonTexto, { color: acento }]}>Reintentar</EliteText>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.encabezado}>
                  {/* A8: no hay AppIcon de ayuda en app-icon-names; se queda Ionicons. */}
                  <Ionicons
                    name={conectado ? 'shield-checkmark-outline' : sinVerificar ? 'help-circle-outline' : 'pulse-outline'}
                    size={22}
                    color={acento}
                  />
                  <EliteText variant="body" style={styles.titulo}>{estado.titulo}</EliteText>
                </View>
                <EliteText variant="caption" style={[styles.mensaje, { color: tokens.textoSecundario }]}>
                  {estado.mensaje}
                </EliteText>
                {estado.etiquetaAccion ? (
                  <Pressable
                    onPress={alAccionar}
                    disabled={ocupado}
                    style={[styles.boton, { borderColor: acento }, ocupado && { opacity: 0.5 }]}
                  >
                    {ocupado ? (
                      <ActivityIndicator size="small" color={acento} />
                    ) : (
                      <EliteText variant="body" style={[styles.botonTexto, { color: acento }]}>
                        {estado.etiquetaAccion}
                      </EliteText>
                    )}
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
          <Divider />
        </Animated.View>

        {/* ══════ QUÉ SE SINCRONIZA ══════ */}
        <Animated.View entering={FadeInUp.delay(150).springify()}>
          <SectionLabel>QUÉ SE SINCRONIZA</SectionLabel>
          <View style={styles.lista}>
            {DEFINICIONES.map((d) => {
              const valor = ultimoValor(dias, d.id);
              // Evidencia real: si un valor llegó, la lectura de esa métrica
              // está concedida aunque la plataforma no lo diga (iOS).
              const concedida = (estado?.metricasConcedidas.includes(d.id) ?? false) || valor != null;
              const sinConfirmar = !concedida && sinVerificar;
              return (
                <View
                  key={d.id}
                  style={[styles.metrica, { backgroundColor: tokens.card, borderColor: tokens.borde }]}
                >
                  <View style={[styles.punto, { backgroundColor: concedida ? acento : tokens.sinDatos }]} />
                  <View style={{ flex: 1 }}>
                    <EliteText variant="body" style={styles.metricaTitulo}>{d.etiqueta}</EliteText>
                    <EliteText variant="caption" style={[styles.metricaDetalle, { color: tokens.textoSecundario }]}>
                      {valor ?? (sinConfirmar ? `${d.detalle}. Sin confirmar: no llegó ningún valor.` : d.detalle)}
                    </EliteText>
                  </View>
                  {concedida ? (
                    <Ionicons name="checkmark-circle" size={18} color={acento} />
                  ) : sinConfirmar ? (
                    <Ionicons name="help-circle-outline" size={18} color={tokens.textoTenue} />
                  ) : (
                    <Ionicons name="remove-circle-outline" size={18} color={tokens.sinDatos} />
                  )}
                </View>
              );
            })}
          </View>
          <EliteText variant="caption" style={[styles.nota, { color: tokens.textoSecundario }]}>
            Solo lectura. ATP nunca escribe en tu plataforma de salud ni comparte estos datos.
          </EliteText>
          {Platform.OS === 'android' ? (
            // 20-sep-2026: nadie explicaba esto y es la causa más común de
            // "no aparece mi sueño" con un reloj Samsung.
            <EliteText variant="caption" style={[styles.nota, { color: tokens.textoSecundario }]}>
              Si mides con un reloj Samsung: Samsung Health solo comparte tus datos (incluido el sueño)
              con Health Connect si lo activas dentro de Samsung Health (Ajustes › Health Connect).
            </EliteText>
          ) : null}
          <Divider />
        </Animated.View>

        {/* ══════ SINCRONIZACIÓN ══════ */}
        {puedeLeerDatos ? (
          <Animated.View entering={FadeInUp.delay(220).springify()}>
            <SectionLabel>SINCRONIZACIÓN</SectionLabel>
            <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.borde }]}>
              <View style={styles.filaSwitch}>
                <View style={{ flex: 1 }}>
                  <EliteText variant="body" style={styles.metricaTitulo}>Sincronizar sola</EliteText>
                  <EliteText variant="caption" style={[styles.metricaDetalle, { color: tokens.textoSecundario }]}>
                    Una vez al día, cuando abras la app. Apagado por defecto.
                  </EliteText>
                </View>
                <Switch
                  value={autoSync}
                  onValueChange={async (v) => {
                    haptic.light();
                    setAutoSync(v);
                    await setSyncAutomatica(v);
                  }}
                  trackColor={{ false: tokens.borde, true: SALUD + '60' }}
                  thumbColor={autoSync ? ATP_BRAND.lime : tokens.sinDatos}
                />
              </View>
              <Pressable
                onPress={alSincronizar}
                disabled={ocupado || !user?.id}
                style={[styles.boton, { borderColor: acento }, (ocupado || !user?.id) && { opacity: 0.5 }]}
              >
                {ocupado ? (
                  <ActivityIndicator size="small" color={acento} />
                ) : (
                  <EliteText variant="body" style={[styles.botonTexto, { color: acento }]}>
                    Sincronizar ahora
                  </EliteText>
                )}
              </Pressable>
              <EliteText variant="caption" style={[styles.nota, { color: tokens.textoSecundario }]}>
                {ultimoSync
                  ? `Última vez: ${formatLocalDate(ultimoSync.slice(0, 10))}`
                  : 'Todavía no sincronizas.'}
              </EliteText>
              <EliteText variant="caption" style={[styles.nota, { color: tokens.textoSecundario }]}>
                Al sincronizar, tus noches también entran a Sueño. Las que ya tenías no se tocan.
              </EliteText>
            </View>
            <Divider />
          </Animated.View>
        ) : null}

        {/* ══════ DESCONECTAR ══════ */}
        {estado && (estado.estado === 'conectado' || estado.estado === 'denegado' || estado.estado === 'sin_verificar') ? (
          <Animated.View entering={FadeInUp.delay(280).springify()}>
            <SectionLabel>DESCONECTAR</SectionLabel>
            <Pressable onPress={alDesconectar} style={styles.filaDesconectar}>
              <Ionicons name="unlink-outline" size={20} color={tokens.textoSecundario} />
              <EliteText variant="body" style={{ color: tokens.textoSecundario }}>
                Dejar de leer mis datos de salud
              </EliteText>
            </Pressable>
          </Animated.View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </ThemeReady>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 0.5,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cargandoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titulo: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  mensaje: {
    fontSize: FontSizes.sm,
    lineHeight: 18,
  },
  boton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.sm + 4,
    minHeight: 44,
  },
  botonTexto: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  lista: {
    gap: Spacing.xs,
  },
  metrica: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    padding: Spacing.sm + 2,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricaTitulo: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  metricaDetalle: {
    fontSize: FontSizes.sm,
    marginTop: 1,
  },
  nota: {
    fontSize: FontSizes.xs,
    lineHeight: 15,
    marginTop: Spacing.xs,
  },
  filaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  filaDesconectar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
  },
});
