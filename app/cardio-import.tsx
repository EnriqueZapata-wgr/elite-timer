/**
 * Cardio Import (MB-3.6 Bloque 3.2) — importar entrenamientos desde la
 * plataforma de salud del sistema (Health Connect / HealthKit).
 *
 * Consentimiento PRIMERO: pantalla propia que explica qué se lee y para qué
 * antes de pedir el permiso del sistema. Solo lectura, solo entrenamientos
 * (minimización de datos). Import manual como default; auto-sync es opt-in.
 * Estados vacíos honestos: sin app conectada o binario sin el módulo, se dice
 * tal cual — sin culpar al usuario y sin prometer lo que no hay.
 */
import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Switch, Pressable, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { haptic } from '@/src/utils/haptics';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Radius, Fonts } from '@/constants/theme';
import { ATP_BRAND, SEMANTIC, withOpacity } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { formatDuration } from '@/src/services/fitness-service';
import {
  getHealthPlatform,
  solicitarPermisos,
  permisosYaConcedidos,
  abrirAjustesHealthConnect,
  leerEntrenamientos,
  importarEntrenamientos,
  getAutoSync,
  setAutoSync,
  type HealthPlatform,
  type ImportResult,
} from '@/src/services/fitness/health-import-service';
import type { NormalizedWorkout } from '@/src/services/fitness/health-import-core';

const DISCIPLINA_LABELS: Record<string, string> = {
  running: 'Correr', cycling: 'Ciclismo', swimming: 'Natación', rowing: 'Remo', other: 'Otro',
};

type Fase = 'cargando' | 'consentimiento' | 'no_disponible' | 'permiso_manual' | 'leyendo' | 'lista' | 'resultado';

export default function CardioImportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // MB-31B3: la pantalla migró a tokens y sigue el tema global.
  const { kind, tokens: tk } = useAppTheme();
  const secTxt = { color: tk.textoSecundario };
  const cardTk = { backgroundColor: tk.card, borderColor: tk.borde };

  const [fase, setFase] = useState<Fase>('cargando');
  const [plataforma, setPlataforma] = useState<HealthPlatform | null>(null);
  const [workouts, setWorkouts] = useState<NormalizedWorkout[]>([]);
  // B2: selección previa al import, keyed por externalId (candado #1 del dedupe).
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [autoSync, setAutoSyncState] = useState(false);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getHealthPlatform();
      setPlataforma(p);
      setAutoSyncState(await getAutoSync());
      setFase(p.status === 'disponible' ? 'consentimiento' : 'no_disponible');
    })();
  }, []);

  async function conectarYLeer() {
    haptic.medium();
    setFase('leyendo');
    const res = await solicitarPermisos();
    // MB-5 0.3: binario 1.7.0 sin permission delegate — el diálogo nativo
    // crashearía. Ruta manual: conceder desde los ajustes de Health Connect.
    if (res === 'dialogo_no_disponible') {
      setFase('permiso_manual');
      return;
    }
    if (res !== 'ok') {
      setFase('consentimiento');
      return;
    }
    const ws = await leerEntrenamientos(14);
    setWorkouts(ws);
    setSeleccion(new Set(ws.map((x) => x.externalId)));
    setFase('lista');
  }

  /** Re-check tras conceder el permiso a mano en Health Connect (sin diálogos). */
  async function verificarPermisoManual() {
    haptic.medium();
    setFase('leyendo');
    if (await permisosYaConcedidos()) {
      const ws = await leerEntrenamientos(14);
      setWorkouts(ws);
      setSeleccion(new Set(ws.map((x) => x.externalId)));
      setFase('lista');
    } else {
      setFase('permiso_manual');
    }
  }

  function toggleSeleccion(id: string) {
    haptic.light();
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function importar() {
    if (!user || importando) return;
    haptic.medium();
    setImportando(true);
    const res = await importarEntrenamientos(user.id, workouts.filter((x) => seleccion.has(x.externalId)));
    setImportando(false);
    setResultado(res);
    if (res.ok && res.electronHoy) {
      DeviceEventEmitter.emit('electrons_changed');
      DeviceEventEmitter.emit('day_changed');
    }
    setFase('resultado');
  }

  function toggleAutoSync(v: boolean) {
    haptic.light();
    setAutoSyncState(v);
    setAutoSync(v);
  }

  const nombre = plataforma?.nombre ?? 'tu app de salud';

  return (
    <Screen themed edges={[]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader title="Importar entrenamientos" />
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {fase === 'cargando' && (
          <View style={s.center}><EliteText style={[s.metaText, secTxt]}>Revisando tu plataforma de salud…</EliteText></View>
        )}

        {/* Estado no disponible — honesto, sin culpar al usuario */}
        {fase === 'no_disponible' && plataforma && (
          <Animated.View entering={FadeInDown.duration(300)} style={[s.card, cardTk]}>
            <View style={[s.iconWrap, { backgroundColor: withOpacity(ATP_BRAND.teal, 0.12) }]}>
              <Ionicons name="cloud-offline-outline" size={26} color={ATP_BRAND.teal} />
            </View>
            {plataforma.status === 'binario_viejo' ? (
              <>
                <EliteText style={[s.cardTitle, { color: tk.texto }]}>Llega con la próxima versión</EliteText>
                <EliteText style={[s.cardBody, secTxt]}>
                  Esta versión de la app aún no trae el módulo de {nombre}. Se activa
                  con la siguiente actualización de la tienda. Tus entrenamientos no
                  se pierden: cuando conectes, se importan.
                </EliteText>
              </>
            ) : plataforma.status === 'sin_app' ? (
              <>
                <EliteText style={[s.cardTitle, { color: tk.texto }]}>Health Connect no está listo</EliteText>
                <EliteText style={[s.cardBody, secTxt]}>
                  Para importar de Strava, Garmin, Samsung Health o Google Fit, tu
                  teléfono necesita la app Health Connect de Google (gratuita, viene
                  en Android 14+ y está en Play Store para versiones anteriores).
                  Cuando esté instalada, vuelve aquí.
                </EliteText>
              </>
            ) : (
              <>
                <EliteText style={[s.cardTitle, { color: tk.texto }]}>No disponible en este dispositivo</EliteText>
                <EliteText style={[s.cardBody, secTxt]}>
                  La plataforma de salud del sistema no está disponible aquí. El
                  registro manual sigue siendo tuyo: 2 taps y listo.
                </EliteText>
              </>
            )}
            <GradientCTA label="Registrar manual" variant="quiet" icon="add-circle-outline"
              onPress={() => { haptic.light(); router.replace('/log-cardio'); }} style={{ marginTop: Spacing.sm }} />
          </Animated.View>
        )}

        {/* Consentimiento: qué se lee y para qué, ANTES del permiso del sistema */}
        {fase === 'consentimiento' && (
          <>
            <Animated.View entering={FadeInDown.duration(300)} style={[s.card, cardTk]}>
              <View style={[s.iconWrap, { backgroundColor: withOpacity(ATP_BRAND.lime, 0.12) }]}>
                <Ionicons name="fitness-outline" size={26} color={ATP_BRAND.lime} />
              </View>
              <EliteText style={[s.cardTitle, { color: tk.texto }]}>Una conexión, todas tus apps</EliteText>
              <EliteText style={[s.cardBody, secTxt]}>
                {plataforma?.os === 'ios'
                  ? `Strava, Garmin y tus demás apps de entrenamiento escriben en ${nombre} (Apple Health). ATP los lee de ahí, sin integrar cuenta por cuenta.`
                  : `Strava, Garmin, Samsung Health y Google Fit escriben sus entrenamientos en ${nombre}. ATP los lee de ahí, sin integrar cuenta por cuenta.`}
              </EliteText>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(80).springify()} style={[s.card, cardTk]}>
              <EliteText style={[s.consentLabel, secTxt]}>QUÉ LEEMOS (Y NADA MÁS)</EliteText>
              {[
                'Tipo de entrenamiento (correr, bici, nado, remo)',
                'Duración y fecha',
                'Distancia, calorías y frecuencia cardiaca media si existen',
              ].map((t) => (
                <View key={t} style={s.consentRow}>
                  <Ionicons name="checkmark-circle" size={15} color={ATP_BRAND.lime} />
                  <EliteText style={[s.consentText, { color: tk.texto }]}>{t}</EliteText>
                </View>
              ))}
              <View style={s.consentRow}>
                <Ionicons name="lock-closed-outline" size={15} color={tk.textoSecundario} />
                <EliteText style={[s.consentText, secTxt]}>
                  Solo LECTURA: no escribimos ni compartimos nada. Puedes revocar el permiso cuando quieras desde el sistema.
                </EliteText>
              </View>
            </Animated.View>

            <View style={{ marginTop: Spacing.md }}>
              <GradientCTA label="CONECTAR Y LEER" pillar="fitness" icon="link" onPress={conectarYLeer} />
            </View>
          </>
        )}

        {fase === 'leyendo' && (
          <View style={s.center}><EliteText style={[s.metaText, secTxt]}>Leyendo tus entrenamientos…</EliteText></View>
        )}

        {/* MB-5 0.3 — Ruta manual de permisos (binario sin el diálogo nativo): honesta, sin crash */}
        {fase === 'permiso_manual' && (
          <Animated.View entering={FadeInDown.duration(300)} style={[s.card, cardTk]}>
            <View style={[s.iconWrap, { backgroundColor: withOpacity(ATP_BRAND.teal, 0.12) }]}>
              <Ionicons name="key-outline" size={26} color={ATP_BRAND.teal} />
            </View>
            <EliteText style={[s.cardTitle, { color: tk.texto }]}>Un paso en Health Connect</EliteText>
            <EliteText style={[s.cardBody, secTxt]}>
              Esta versión de la app aún no puede abrir el diálogo de permisos (llega con la
              próxima actualización de la tienda). Mientras tanto puedes concederlo a mano:
              abre Health Connect → Permisos de apps → ATP → activa la lectura de ejercicio,
              y vuelve aquí.
            </EliteText>
            <GradientCTA label="ABRIR HEALTH CONNECT" pillar="fitness" icon="settings-outline"
              onPress={() => { haptic.light(); abrirAjustesHealthConnect(); }} style={{ marginTop: Spacing.sm }} />
            <GradientCTA label="Ya di el permiso: leer" variant="quiet" icon="refresh-outline"
              onPress={verificarPermisoManual} style={{ marginTop: Spacing.xs }} />
          </Animated.View>
        )}

        {/* Lista de entrenamientos leídos */}
        {fase === 'lista' && (
          <>
            {workouts.length === 0 ? (
              <Animated.View entering={FadeInDown.duration(300)} style={[s.card, cardTk]}>
                <View style={[s.iconWrap, { backgroundColor: withOpacity(ATP_BRAND.teal, 0.12) }]}>
                  <Ionicons name="file-tray-outline" size={26} color={ATP_BRAND.teal} />
                </View>
                <EliteText style={[s.cardTitle, { color: tk.texto }]}>Sin entrenamientos en 14 días</EliteText>
                {/* MB-27 P4.2: el copy promete LAS reglas reales de esImportable —
                    si cambian las reglas, cambia este texto en el mismo commit. */}
                <EliteText style={[s.cardBody, secTxt]}>
                  {nombre} no tiene entrenamientos recientes que leer. Se
                  importan sesiones de 5 minutos o más. Fuera quedan: las
                  caminatas, las actividades sin disciplina reconocida que no
                  traen una distancia real (150 m o más), y las salidas
                  cortas al aire libre cuyo GPS quedó casi en cero. Si tu
                  app (Strava, Garmin…) no sincroniza con {nombre}, actívalo en
                  la configuración de esa app: ahí es donde ATP puede leerlos.
                </EliteText>
              </Animated.View>
            ) : (
              <>
                <EliteText style={[s.sectionLabel, secTxt]}>ÚLTIMOS 14 DÍAS · {workouts.length} ENTRENAMIENTOS</EliteText>
                {workouts.map((w, i) => {
                  const marcado = seleccion.has(w.externalId);
                  return (
                    <Animated.View key={w.externalId} entering={FadeInUp.delay(40 + i * 30).springify()}>
                      <Pressable
                        onPress={() => toggleSeleccion(w.externalId)}
                        style={[s.workoutRow, cardTk, !marcado && { opacity: 0.45 }]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: marcado }}
                      >
                        <View style={[s.iconSmall, { backgroundColor: withOpacity(ATP_BRAND.teal, 0.12) }]}>
                          <Ionicons
                            name={w.discipline === 'cycling' ? 'bicycle-outline' : w.discipline === 'swimming' ? 'water-outline' : w.discipline === 'rowing' ? 'boat-outline' : 'walk-outline'}
                            size={16}
                            color={ATP_BRAND.teal}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <EliteText style={[s.workoutName, { color: tk.texto }]}>
                            {DISCIPLINA_LABELS[w.discipline]} · {formatDuration(w.durationSeconds)}
                          </EliteText>
                          <EliteText style={[s.workoutMeta, secTxt]}>
                            {w.dateLocal}
                            {w.distanceMeters ? ` · ${(w.distanceMeters / 1000).toFixed(2)} km` : ''}
                            {w.avgHeartRate ? ` · ${w.avgHeartRate} bpm` : ''}
                          </EliteText>
                        </View>
                        <Ionicons
                          name={marcado ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={marcado ? ATP_BRAND.lime : tk.sinDatos}
                        />
                      </Pressable>
                    </Animated.View>
                  );
                })}
                <View style={{ marginTop: Spacing.md }}>
                  <GradientCTA
                    label={importando ? 'IMPORTANDO…' : `IMPORTAR ${seleccion.size} ENTRENAMIENTO${seleccion.size === 1 ? '' : 'S'}`}
                    pillar="fitness"
                    icon="download-outline"
                    disabled={importando || seleccion.size === 0}
                    onPress={importar}
                  />
                  <EliteText style={[s.dedupeNote, { color: tk.textoTenue }]}>
                    Toca un entrenamiento para desmarcarlo. Los que ya registraste (a mano o en un import anterior) se detectan y NO se duplican.
                  </EliteText>
                </View>
              </>
            )}
          </>
        )}

        {/* Resultado */}
        {fase === 'resultado' && resultado && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[s.card, cardTk]}>
              <View style={[s.iconWrap, { backgroundColor: withOpacity(resultado.ok ? ATP_BRAND.lime : SEMANTIC.error, 0.12) }]}>
                <Ionicons
                  name={resultado.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                  size={26}
                  color={resultado.ok ? ATP_BRAND.lime : SEMANTIC.error}
                />
              </View>
              {resultado.ok ? (
                <>
                  <EliteText style={[s.cardTitle, { color: tk.texto }]}>
                    {resultado.importados > 0
                      ? `${resultado.importados} entrenamiento${resultado.importados === 1 ? '' : 's'} importado${resultado.importados === 1 ? '' : 's'}`
                      : 'Nada nuevo que importar'}
                  </EliteText>
                  <EliteText style={[s.cardBody, secTxt]}>
                    {resultado.duplicados > 0 ? `${resultado.duplicados} ya estaban registrados y se omitieron. ` : ''}
                    {resultado.electronHoy
                      ? 'El de hoy cuenta para tu día (mismo electrón que el registro manual: 1 al día, sin retroactivos). '
                      : resultado.importados > 0
                        ? 'Ninguno es de hoy: se guardan en tu historial sin mover la economía de hoy (sin retroactivos). '
                        : ''}
                    {/* MB-27 menor 4: las reglas se dicen TAMBIÉN aquí — quien
                        importó dos carreras y no ve sus tres caminatas merece
                        saber por qué, no solo quien vio el estado vacío. */}
                    Se importan sesiones de 5 minutos o más. Fuera quedan: las
                    caminatas, las actividades sin disciplina reconocida que no
                    traen una distancia real (150 m o más), y las salidas
                    cortas al aire libre cuyo GPS quedó casi en cero.
                  </EliteText>
                </>
              ) : (
                <>
                  <EliteText style={[s.cardTitle, { color: tk.texto }]}>No se pudo importar</EliteText>
                  <EliteText style={[s.cardBody, secTxt]}>{resultado.error}</EliteText>
                </>
              )}
            </View>
            <GradientCTA label="LISTO" pillar="fitness" onPress={() => router.back()} />
          </Animated.View>
        )}

        {/* Auto-sync opt-in (visible cuando la plataforma está disponible) */}
        {(fase === 'consentimiento' || fase === 'lista' || fase === 'resultado') && (
          <Animated.View entering={FadeInUp.delay(160).springify()} style={[s.autoSyncRow, cardTk]}>
            <View style={{ flex: 1 }}>
              <EliteText style={[s.autoSyncTitle, { color: tk.texto }]}>Sincronización automática</EliteText>
              <EliteText style={[s.autoSyncSub, secTxt]}>
                Al abrir Cardio, importar solo los últimos 3 días. Nunca sincronizamos sin que lo actives tú.
              </EliteText>
            </View>
            <Switch
              value={autoSync}
              onValueChange={toggleAutoSync}
              trackColor={{ false: tk.flotante, true: withOpacity(ATP_BRAND.lime, 0.4) }}
              thumbColor={autoSync ? ATP_BRAND.lime : tk.textoTenue}
            />
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  metaText: { fontFamily: Fonts.regular, fontSize: 14 },

  card: {
    borderWidth: 1,
    borderRadius: Radius.card, padding: Spacing.lg, marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: { fontFamily: Fonts.extraBold, fontSize: 18, lineHeight: 24 },
  cardBody: {
    fontFamily: Fonts.regular, fontSize: 13,
    lineHeight: 20, marginTop: 6,
  },

  consentLabel: {
    fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  consentText: { fontFamily: Fonts.regular, fontSize: 13, flex: 1, lineHeight: 19 },

  sectionLabel: {
    fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  workoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xs,
  },
  iconSmall: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  workoutName: { fontFamily: Fonts.semiBold, fontSize: 14 },
  workoutMeta: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 1 },
  dedupeNote: {
    fontFamily: Fonts.regular, fontSize: 11, textAlign: 'center',
    marginTop: Spacing.sm, lineHeight: 16,
  },

  autoSyncRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.card, padding: Spacing.md, marginTop: Spacing.lg,
  },
  autoSyncTitle: { fontFamily: Fonts.semiBold, fontSize: 14 },
  autoSyncSub: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2, lineHeight: 17 },
});
