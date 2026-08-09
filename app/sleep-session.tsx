/**
 * Sesión nocturna del Sleep Cycle (MB-30A · Pieza 1).
 *
 * El modelo: la app abierta toda la noche en el buró, teléfono cargando,
 * pantalla en negro con rojo muy tenue y siempre encendida (keep-awake).
 * El micrófono ESCUCHA DESDE EL BURÓ (doctrina: cero campos junto a la
 * cabeza — por eso micrófono y no acelerómetro bajo la almohada).
 *
 * Privacidad: solo se procesan NIVELES (metering) en el dispositivo. El
 * fragmento temporal del grabador se rota y se borra sin leerse jamás
 * (mic-privacy.ts). Nada de audio se guarda ni se sube, nunca.
 *
 * La alarma NUNCA puede no sonar: dentro de la ventana busca un momento
 * en que la noche suene más ligera; si no lo encuentra, dispara al cierre
 * (invariante de evaluarAlarma, con test de mutación). Rampa de volumen:
 * empieza muy bajito y sube.
 *
 * Sin red la sesión completa funciona: el análisis es local y la noche se
 * encola si no hay internet (modo avión recomendado desde esta pantalla).
 *
 * ⚠️ Paleta nocturna (NIGHT) fuera de brand.ts a propósito: MB-31 la
 * absorbe en su sistema de temas. NO construir temas aquí.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Screen } from '@/src/components/ui/Screen';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { toLocalDateString } from '@/src/utils/date-helpers';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { NIGHT } from '@/src/services/sleep/night-palette';
import {
  actividadReciente,
  ajustarHora,
  armarNochePropia,
  etiquetaDeScore,
  evaluarAlarma,
  horaLimiteDesdeChronotipo,
  MIN_NOCHE_MINUTOS,
  resolverVentana,
  volumenRampa,
  type NivelMuestra,
  type NocheDormida,
} from '@/src/services/sleep/sleep-core';
import { guardarNochePropia } from '@/src/services/sleep/sleep-session-service';
import { CHUNK_MS, rotarFragmento, terminarYDescartar } from '@/src/services/sleep/mic-privacy';

// Lazy require (doctrina nativos): en un binario sin expo-audio la pantalla
// degrada honesta en vez de tirar la app entera al cargar la ruta.
type ExpoAudio = typeof import('expo-audio');
let audioMod: ExpoAudio | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  audioMod = require('expo-audio');
} catch {
  audioMod = null;
}

// El cuenco de meditación como sonido de alarma: amable y ya vive en el
// binario (assets/sounds) — la alarma funciona en modo avión.
const ALARM_SOUND = require('@/assets/sounds/chime.wav');

const ANCHOS_MIN = [15, 30, 45] as const;

/** 'HH:MM' → '6:30 am' legible. */
function fmt12h(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

function fmtReloj(d: Date): string {
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDuracion(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

export default function SleepSessionScreen() {
  // Binario sin módulo de audio: sin micrófono NI alarma no hay sesión que
  // prometer — se dice honesto (mismo patrón fail-soft del health import).
  if (!audioMod) return <PantallaSinAudio />;
  return <SesionNocturna audio={audioMod} />;
}

function PantallaSinAudio() {
  const router = useRouter();
  return (
    <Screen edges={[]}>
      <View style={s.centro}>
        <EliteText style={s.configKicker}>SLEEP CYCLE</EliteText>
        <EliteText style={s.avisoTexto}>
          Tu versión de la app aún no trae el módulo de audio del Sleep Cycle.
          Actualiza la app desde la tienda para usarlo.
        </EliteText>
        <AnimatedPressable style={s.ctaSecundario} onPress={() => { haptic.light(); router.back(); }}>
          <EliteText style={s.ctaSecundarioTexto}>VOLVER</EliteText>
        </AnimatedPressable>
      </View>
    </Screen>
  );
}

type Fase = 'config' | 'noche' | 'alarma' | 'fin';

function SesionNocturna({ audio }: { audio: ExpoAudio }) {
  const router = useRouter();
  const { user } = useAuth();
  useKeepAwake();

  const [fase, setFase] = useState<Fase>('config');
  const [horaLimite, setHoraLimite] = useState('06:30');
  const [anchoMin, setAnchoMin] = useState<(typeof ANCHOS_MIN)[number]>(30);
  const [micActivo, setMicActivo] = useState(false);
  const [micDenegado, setMicDenegado] = useState(false);
  const [reloj, setReloj] = useState(() => fmtReloj(new Date()));
  const [resumen, setResumen] = useState<{ noche: NocheDormida; encolada: boolean; corta: boolean } | null>(null);

  // El grabador se crea aquí (audio garantizado no-null en este componente).
  const recorder = audio.useAudioRecorder({
    ...audio.RecordingPresets.LOW_QUALITY,
    isMeteringEnabled: true,
  });

  const inicioRef = useRef(0);
  const ventanaRef = useRef<{ inicioMs: number; finMs: number } | null>(null);
  const muestrasRef = useRef<NivelMuestra[]>([]);
  const alarmaSonoRef = useRef(false);
  const alarmaDesdeRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rampaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<import('expo-audio').AudioPlayer | null>(null);
  const micActivoRef = useRef(false);
  const cerrandoRef = useRef(false);

  // Default de la ventana: la hora de despertar del cronotipo (fail-soft:
  // sin red o sin cronotipo, se queda el default — nada se rompe offline).
  useEffect(() => {
    let activo = true;
    (async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('user_chronotype')
          .select('wake_time')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!activo || error) return;
        const hora = horaLimiteDesdeChronotipo((data as { wake_time?: string } | null)?.wake_time);
        if (hora) setHoraLimite(hora);
      } catch { /* offline: default */ }
    })();
    return () => { activo = false; };
  }, [user?.id]);

  const detenerIntervalos = useCallback(() => {
    for (const ref of [tickRef, chunkRef, rampaRef]) {
      if (ref.current) { clearInterval(ref.current); ref.current = null; }
    }
  }, []);

  const apagarAlarma = useCallback(() => {
    if (rampaRef.current) { clearInterval(rampaRef.current); rampaRef.current = null; }
    const p = playerRef.current;
    playerRef.current = null;
    if (p) {
      try { p.pause(); p.remove(); } catch { /* ya liberado */ }
    }
  }, []);

  const dispararAlarma = useCallback(() => {
    if (alarmaSonoRef.current) return;
    alarmaSonoRef.current = true;
    alarmaDesdeRef.current = Date.now();
    try {
      const p = audio.createAudioPlayer(ALARM_SOUND);
      p.loop = true;
      p.volume = volumenRampa(0);
      p.play();
      playerRef.current = p;
      // Rampa: de casi nada a pleno en ~90 s.
      rampaRef.current = setInterval(() => {
        const desde = alarmaDesdeRef.current ?? Date.now();
        const pl = playerRef.current;
        if (pl) {
          try { pl.volume = volumenRampa(Date.now() - desde); } catch { /* liberado */ }
        }
      }, 2000);
    } catch { /* sin player: la pantalla y los hápticos siguen */ }
    haptic.heavy();
    setFase('alarma');
  }, [audio]);

  const iniciarSesion = useCallback(async () => {
    haptic.medium();
    const ventana = resolverVentana(new Date(), horaLimite, anchoMin);
    if (!ventana) return;
    ventanaRef.current = ventana;
    // Micrófono: si lo niegan, la sesión sigue SIN detección — horas y
    // alarma al cierre de la ventana quedan garantizadas igual.
    let conMic = false;
    try {
      const perm = await audio.requestRecordingPermissionsAsync();
      conMic = perm.granted;
    } catch { conMic = false; }
    setMicDenegado(!conMic);
    try {
      await audio.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: conMic });
    } catch { /* modo de audio: fail-soft */ }
    if (conMic) {
      try {
        await recorder.prepareToRecordAsync();
        recorder.record();
        // Rotación de privacidad: ningún fragmento vive más de CHUNK_MS.
        chunkRef.current = setInterval(() => { void rotarFragmento(recorder); }, CHUNK_MS);
      } catch { conMic = false; }
    }
    micActivoRef.current = conMic;
    setMicActivo(conMic);
    inicioRef.current = Date.now();
    muestrasRef.current = [];
    alarmaSonoRef.current = false;
    alarmaDesdeRef.current = null;
    setFase('noche');
    tickRef.current = setInterval(() => {
      const ahora = Date.now();
      setReloj(fmtReloj(new Date(ahora)));
      const muestras = muestrasRef.current;
      if (micActivoRef.current) {
        try {
          const st = recorder.getStatus();
          if (typeof st.metering === 'number' && Number.isFinite(st.metering)) {
            muestras.push({ t: ahora, db: st.metering });
          }
        } catch { /* un tick sin muestra no rompe la noche */ }
      }
      const v = ventanaRef.current;
      if (!v) return;
      const decision = evaluarAlarma({
        ahoraMs: ahora,
        inicioVentanaMs: v.inicioMs,
        finVentanaMs: v.finMs,
        yaSono: alarmaSonoRef.current,
        actividadReciente: actividadReciente(muestras, ahora),
      });
      if (decision !== 'esperar') dispararAlarma();
    }, 1000);
  }, [audio, anchoMin, dispararAlarma, horaLimite, recorder]);

  const terminarSesion = useCallback(async () => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;
    haptic.success();
    // Despertaste cuando sonó la alarma; si no sonó, cuando lo dijiste tú.
    const finMs = alarmaDesdeRef.current ?? Date.now();
    detenerIntervalos();
    apagarAlarma();
    if (micActivoRef.current) {
      micActivoRef.current = false;
      await terminarYDescartar(recorder);
    }
    try {
      await audio.setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch { /* fail-soft */ }
    const noche = armarNochePropia({
      inicioMs: inicioRef.current,
      finMs,
      muestras: muestrasRef.current,
      aFechaLocal: toLocalDateString,
    });
    // Sesión de prueba de 2 minutos ≠ una noche: no se registra basura.
    if (noche.durationMinutes < MIN_NOCHE_MINUTOS || !user?.id) {
      setResumen({ noche, encolada: false, corta: true });
      setFase('fin');
      cerrandoRef.current = false;
      return;
    }
    const res = await guardarNochePropia(user.id, noche);
    setResumen({ noche, encolada: res.encolada, corta: false });
    setFase('fin');
    cerrandoRef.current = false;
  }, [apagarAlarma, audio, detenerIntervalos, recorder, user?.id]);

  // Limpieza dura al desmontar: nada de audio queda vivo ni en disco.
  useEffect(() => {
    return () => {
      detenerIntervalos();
      apagarAlarma();
      if (micActivoRef.current) {
        micActivoRef.current = false;
        void terminarYDescartar(recorder);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ventanaTexto = (() => {
    const inicio = ajustarHora(horaLimite, -anchoMin);
    return `${fmt12h(inicio)} — ${fmt12h(horaLimite)}`;
  })();

  if (fase === 'config') {
    return (
      <Screen edges={[]}>
        <View style={s.configWrap}>
          <EliteText style={s.configKicker}>SLEEP CYCLE</EliteText>
          <EliteText style={s.configTitulo}>Esta noche</EliteText>

          <View style={s.bloque}>
            <EliteText style={s.bloqueLabel}>DESPIÉRTAME A MÁS TARDAR</EliteText>
            <View style={s.stepperRow}>
              <AnimatedPressable
                style={s.stepperBtn}
                onPress={() => { haptic.light(); setHoraLimite((h) => ajustarHora(h, -15)); }}
              >
                <EliteText style={s.stepperBtnTexto}>−15</EliteText>
              </AnimatedPressable>
              <EliteText style={s.horaGrande}>{fmt12h(horaLimite)}</EliteText>
              <AnimatedPressable
                style={s.stepperBtn}
                onPress={() => { haptic.light(); setHoraLimite((h) => ajustarHora(h, 15)); }}
              >
                <EliteText style={s.stepperBtnTexto}>+15</EliteText>
              </AnimatedPressable>
            </View>
            <View style={s.chipsRow}>
              {ANCHOS_MIN.map((a) => (
                <AnimatedPressable
                  key={a}
                  style={[s.chip, anchoMin === a && s.chipActivo]}
                  onPress={() => { haptic.light(); setAnchoMin(a); }}
                >
                  <EliteText style={[s.chipTexto, anchoMin === a && s.chipTextoActivo]}>
                    ventana {a} min
                  </EliteText>
                </AnimatedPressable>
              ))}
            </View>
            <EliteText style={s.bloqueNota}>
              Te despierto entre {ventanaTexto}: dentro de tu ventana busco un momento en que tu
              noche suene más ligera; si no aparece, sueno al cierre. Nunca me quedo callada.
              Empiezo muy bajito y subo poco a poco.
            </EliteText>
          </View>

          <View style={s.bloque}>
            <EliteText style={s.bloqueLabel}>EL BURÓ</EliteText>
            <EliteText style={s.bloqueNota}>
              Deja el teléfono en el buró, cargando y con esta pantalla abierta. Se queda
              encendida toda la noche, en negro con rojo muy tenue.
            </EliteText>
          </View>

          <View style={s.bloque}>
            <EliteText style={s.bloqueLabel}>MODO AVIÓN, RECOMENDADO</EliteText>
            <EliteText style={s.bloqueNota}>
              Todo se procesa en tu teléfono: cero señales junto a tu cabeza mientras duermes.
              La sesión funciona igual sin internet y tu noche se sube sola en la mañana.
            </EliteText>
          </View>

          <View style={s.bloque}>
            <EliteText style={s.bloqueLabel}>TU PRIVACIDAD</EliteText>
            <EliteText style={s.bloqueNota}>
              El micrófono solo mide niveles de sonido. Nada se graba, nada se guarda y nada
              sale de tu teléfono.
            </EliteText>
          </View>

          <AnimatedPressable style={s.ctaPrimario} onPress={() => { void iniciarSesion(); }}>
            <EliteText style={s.ctaPrimarioTexto}>YA ME VOY A DORMIR</EliteText>
          </AnimatedPressable>
          <AnimatedPressable style={s.ctaSecundario} onPress={() => { haptic.light(); router.back(); }}>
            <EliteText style={s.ctaSecundarioTexto}>HOY NO</EliteText>
          </AnimatedPressable>
        </View>
      </Screen>
    );
  }

  if (fase === 'noche' || fase === 'alarma') {
    return (
      <Screen edges={[]}>
        <View style={s.centro}>
          {fase === 'alarma' && <EliteText style={s.buenosDias}>Buenos días</EliteText>}
          <EliteText style={s.relojGrande}>{reloj}</EliteText>
          <EliteText style={s.relojSub}>alarma entre {ventanaTexto}</EliteText>
          <EliteText style={s.estadoMic}>
            {fase === 'alarma'
              ? 'la alarma está sonando'
              : micActivo
                ? 'midiendo niveles de sonido · nada se graba'
                : micDenegado
                  ? 'sin micrófono · la alarma suena al cierre de tu ventana'
                  : 'sesión corriendo'}
          </EliteText>
          <AnimatedPressable
            style={[s.ctaPrimario, s.ctaNoche]}
            onPress={() => { void terminarSesion(); }}
          >
            <EliteText style={s.ctaPrimarioTexto}>
              {fase === 'alarma' ? 'YA DESPERTÉ' : 'DESPERTAR AHORA'}
            </EliteText>
          </AnimatedPressable>
        </View>
      </Screen>
    );
  }

  // fase === 'fin'
  const min = resumen?.noche.durationMinutes ?? 0;
  return (
    <Screen edges={[]}>
      <View style={s.centro}>
        <EliteText style={s.configKicker}>TU NOCHE</EliteText>
        {resumen?.corta ? (
          <EliteText style={s.avisoTexto}>
            Sesión muy corta: no se registró. Una noche cuenta a partir de {MIN_NOCHE_MINUTOS} minutos.
          </EliteText>
        ) : (
          <>
            <EliteText style={s.relojGrande}>{fmtDuracion(min)}</EliteText>
            {resumen?.noche.score != null && (
              <EliteText style={s.relojSub}>
                {etiquetaDeScore(resumen.noche.score)} · score {resumen.noche.score}
              </EliteText>
            )}
            {resumen?.noche.snoreMinutes != null && resumen.noche.snoreMinutes > 0 && (
              <EliteText style={s.estadoMic}>
                ~{resumen.noche.snoreMinutes} min con sonido de ronquido
              </EliteText>
            )}
            {resumen?.encolada && (
              <EliteText style={s.estadoMic}>
                sin conexión: tu noche se sube sola cuando vuelva el internet
              </EliteText>
            )}
          </>
        )}
        <AnimatedPressable
          style={[s.ctaPrimario, s.ctaNoche]}
          onPress={() => { haptic.light(); router.replace('/sleep'); }}
        >
          <EliteText style={s.ctaPrimarioTexto}>VER MI SUEÑO</EliteText>
        </AnimatedPressable>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  configWrap: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, gap: Spacing.md },
  configKicker: { color: NIGHT.emberFaint, fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 3 },
  configTitulo: { color: NIGHT.ember, fontSize: 26, fontFamily: Fonts.extraBold },

  bloque: { gap: 6 },
  bloqueLabel: { color: NIGHT.emberFaint, fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 2 },
  bloqueNota: { color: NIGHT.emberDim, fontSize: FontSizes.sm, lineHeight: 20 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperBtn: {
    borderWidth: 1, borderColor: NIGHT.hairline, borderRadius: Radius.pill,
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: NIGHT.fill,
  },
  stepperBtnTexto: { color: NIGHT.emberDim, fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  horaGrande: { color: NIGHT.ember, fontSize: 34, fontFamily: Fonts.extraBold },

  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1, borderColor: NIGHT.hairline, borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipActivo: { backgroundColor: NIGHT.fill, borderColor: NIGHT.emberFaint },
  chipTexto: { color: NIGHT.emberFaint, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  chipTextoActivo: { color: NIGHT.emberDim },

  ctaPrimario: {
    marginTop: Spacing.md, borderWidth: 1, borderColor: NIGHT.emberFaint,
    backgroundColor: NIGHT.fill, borderRadius: Radius.pill,
    paddingVertical: 14, alignItems: 'center',
  },
  ctaNoche: { alignSelf: 'stretch', marginHorizontal: Spacing.lg },
  ctaPrimarioTexto: { color: NIGHT.ember, fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 2 },
  ctaSecundario: { alignItems: 'center', paddingVertical: 10 },
  ctaSecundarioTexto: { color: NIGHT.emberFaint, fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, letterSpacing: 1.5 },

  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: Spacing.lg },
  buenosDias: { color: NIGHT.emberDim, fontSize: FontSizes.lg, fontFamily: Fonts.semiBold },
  relojGrande: { color: NIGHT.ember, fontSize: 72, fontFamily: Fonts.extraBold, lineHeight: 80 },
  relojSub: { color: NIGHT.emberDim, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
  estadoMic: { color: NIGHT.emberFaint, fontSize: FontSizes.xs, textAlign: 'center', lineHeight: 18 },
  avisoTexto: { color: NIGHT.emberDim, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 21 },
});
