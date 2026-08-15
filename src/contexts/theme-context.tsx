/**
 * ThemeContext (MB-31A · Pieza 3) — los cuatro modos del manual 3.7b.
 *
 * claro · oscuro (default de quien no elige) · adaptativo (con TU horario:
 * el mismo despertar/dormir que ancla los hábitos desde MB-26 más
 * screen_time_cutoff — NO el atardecer genérico del sistema) · como el
 * teléfono (useColorScheme).
 *
 * La preferencia es LOCAL (AsyncStorage): el tema es del equipo, no un dato
 * compartido — sin migración.
 *
 * ── El scope de tránsito (lo usa MB-31B) ──
 * Mientras las ~66 pantallas con color a mano no migren, tematizar sus
 * superficies rompería su texto hardcodeado (blanco sobre acero). Por eso
 * hay DOS lecturas:
 *   useAppTheme()      → el tema global. Para el MARCO que posee su propia
 *                        superficie completa (tab bar, velo, ErrorBoundary).
 *   useSurfaceTokens() → tokens del scope: solo entregan claro si la
 *                        pantalla se declaró lista envolviéndose en
 *                        <ThemeReady>. Una pantalla sin migrar sigue
 *                        recibiendo el oscuro de siempre. Migrar una
 *                        pantalla en MB-31B = limpiar sus colores a mano y
 *                        envolverla en <ThemeReady>.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DeviceEventEmitter, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_DARK, THEME_LIGHT, type AppThemeTokens } from '@/src/constants/brand';
import {
  parseStoredMode,
  resolveThemeKind,
  hhmmToMinutes,
  THEME_MODE_DEFAULT,
  type ThemeKind,
  type ThemeModeSetting,
} from '@/src/services/theme/theme-mode-core';
import { NIGHT_FILTER_FALLBACK_CUTOFF } from '@/src/constants/night-curve';
import { useAuth } from '@/src/contexts/auth-context';
import { getUserSchedule, getHabitTime } from '@/src/services/hoy/habit-times-service';
import { timeToMinutes } from '@/src/services/notification-prefs-core';
import { registrarEscritores } from '@/src/services/argos-writers-bridge';

const KEY_MODE = '@atp/theme_mode';
const KEY_VEIL = '@atp/night_veil_enabled';

/** Despertar canónico si no hay dato (espejo del default de habit-times). */
const FALLBACK_DESPERTAR = 7 * 60; // 07:00

export interface ThemeContextValue {
  /** El modo elegido en Ajustes. */
  mode: ThemeModeSetting;
  setMode: (m: ThemeModeSetting) => void;
  /** El tema efectivo ahora mismo. */
  kind: ThemeKind;
  /** Los tokens del tema efectivo (para el MARCO; las pantallas usan useSurfaceTokens). */
  tokens: AppThemeTokens;
  /** El velo nocturno in-app: OTRO ajuste, independiente del tema. */
  veilEnabled: boolean;
  setVeilEnabled: (v: boolean) => void;
  /** El corte de pantallas del usuario en minutos (ancla del velo y de adaptativo). */
  corteMinutes: number;
}

const DEFAULT_VALUE: ThemeContextValue = {
  mode: THEME_MODE_DEFAULT,
  setMode: () => {},
  kind: 'dark',
  tokens: THEME_DARK,
  veilEnabled: false,
  setVeilEnabled: () => {},
  corteMinutes: NIGHT_FILTER_FALLBACK_CUTOFF,
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_VALUE);

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function AtpThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeModeSetting>(THEME_MODE_DEFAULT);
  const [veilEnabled, setVeilState] = useState(false);
  const [despertarMin, setDespertarMin] = useState(FALLBACK_DESPERTAR);
  const [corteMin, setCorteMin] = useState(NIGHT_FILTER_FALLBACK_CUTOFF);
  const [minute, setMinute] = useState(nowMinutes);

  // Preferencias guardadas (sin nada guardado: oscuro, velo apagado).
  useEffect(() => {
    AsyncStorage.getItem(KEY_MODE).then((v) => setModeState(parseStoredMode(v))).catch(() => {});
    AsyncStorage.getItem(KEY_VEIL).then((v) => setVeilState(v === 'true')).catch(() => {});
  }, []);

  // El horario REAL del usuario (goals → cronotipo → default) + su corte.
  // Se recarga si edita sus horas (habit-times emite electrons_changed).
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const load = async () => {
      try {
        const [schedule, corteHHMM] = await Promise.all([
          getUserSchedule(user.id),
          getHabitTime(user.id, 'screen_time_cutoff'),
        ]);
        if (!alive) return;
        setDespertarMin(hhmmToMinutes(schedule.despertar) ?? FALLBACK_DESPERTAR);
        setCorteMin(timeToMinutes(corteHHMM) ?? NIGHT_FILTER_FALLBACK_CUTOFF);
      } catch { /* se quedan los defaults */ }
    };
    load();
    const sub = DeviceEventEmitter.addListener('electrons_changed', load);
    return () => { alive = false; sub.remove(); };
  }, [user?.id]);

  // Adaptativo cambia con el reloj: un tick por minuto solo cuando aplica.
  useEffect(() => {
    if (mode !== 'adaptativo') return;
    const id = setInterval(() => setMinute(nowMinutes()), 30_000);
    return () => clearInterval(id);
  }, [mode]);

  const setMode = useCallback((m: ThemeModeSetting) => {
    setModeState(m);
    setMinute(nowMinutes()); // resolver YA, no al próximo tick
    AsyncStorage.setItem(KEY_MODE, m).catch(() => {});
  }, []);

  const setVeilEnabled = useCallback((v: boolean) => {
    setVeilState(v);
    AsyncStorage.setItem(KEY_VEIL, v ? 'true' : 'false').catch(() => {});
  }, []);

  // NOCHE-ARGOS P7: estos dos setters son los ÚNICOS que dejan el tema
  // consistente (estado de React + storage). ARGOS los alcanza por el puente
  // porque prepareChatTurn y el servicio de ajustes viven fuera del árbol.
  // Escribir las claves de AsyncStorage por detrás cambiaría el disco sin
  // cambiar la pantalla, y un ajuste que no se ve no se aplicó.
  useEffect(() => {
    registrarEscritores({ setTema: setMode, setVelo: setVeilEnabled });
  }, [setMode, setVeilEnabled]);

  const kind = resolveThemeKind(mode, {
    nowMinutes: minute,
    despertarMinutes: despertarMin,
    corteMinutes: corteMin,
    systemScheme,
  });

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    setMode,
    kind,
    tokens: kind === 'light' ? THEME_LIGHT : THEME_DARK,
    veilEnabled,
    setVeilEnabled,
    corteMinutes: corteMin,
  }), [mode, setMode, kind, veilEnabled, setVeilEnabled, corteMin]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** El tema global. Sin provider (tests, previews) responde el oscuro canónico. */
export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ── Scope de tránsito ──

const ThemeReadyContext = createContext(false);

/** Declara que ESTA pantalla ya migró sus colores y puede recibir el claro. */
export function ThemeReady({ children }: { children: ReactNode }) {
  return <ThemeReadyContext.Provider value={true}>{children}</ThemeReadyContext.Provider>;
}

/**
 * Tokens para superficies compartidas (kit ui/, settings-ui, EliteText…):
 * claro SOLO dentro de <ThemeReady>; en pantallas sin migrar entregan el
 * oscuro de siempre, para que su texto hardcodeado no se rompa.
 */
export function useSurfaceTokens(): AppThemeTokens {
  const ready = useContext(ThemeReadyContext);
  const { tokens } = useAppTheme();
  return ready ? tokens : THEME_DARK;
}
