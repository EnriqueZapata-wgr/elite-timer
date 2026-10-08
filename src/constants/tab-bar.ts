/**
 * tab-bar — el registro de iconos de las cuatro salas del tab bar.
 *
 * Igual que app-registry: declara NOMBRES lógicos, no dibujos. El layout de
 * tabs consume esto, la cobertura de iconos (app-registry.test) lo cuenta
 * como uso y el censo lo audita como registro (sin Ionicons ni emoji).
 *
 * Cada sala tiene dos glifos del set SVG: línea en reposo y '-fill' parado
 * en la sala. La orbe (ARGOS) no está aquí: no es un glifo, es ArgosOrb.
 */
import type { AppIconName } from '@/src/components/ui/app-icon-names';

export interface TabBarIconPair {
  /** Glifo con la sala en reposo. */
  reposo: AppIconName;
  /** Glifo parado en la sala (la versión '-fill'). */
  activo: AppIconName;
}

export type TabBarIconKey =
  | 'hoy' | 'atp' | 'salud' | 'tribu' | 'programa' | 'progreso' | 'tu'
  | 'plan' | 'perfil' | 'apps';

export const TAB_BAR_ICONS: Record<TabBarIconKey, TabBarIconPair> = {
  hoy: { reposo: 'tab-hoy', activo: 'tab-hoy-fill' },
  atp: { reposo: 'tab-atp', activo: 'tab-atp-fill' },
  salud: { reposo: 'tab-salud', activo: 'tab-salud-fill' },
  tribu: { reposo: 'tab-tribu', activo: 'tab-tribu-fill' },
  // App Elite DX (25-sep-2026, flags.APP_ELITE_DX).
  programa: { reposo: 'tab-programa', activo: 'tab-programa-fill' },
  progreso: { reposo: 'tab-progreso', activo: 'tab-progreso-fill' },
  tu: { reposo: 'tab-tu', activo: 'tab-tu-fill' },
  // 8-oct-2026 (v4): Hoy, Plan, Perfil y Apps. Reusan glifos que ya existen
  // (sin SVG nuevo): Plan es el de MI PROGRAMA, Perfil el de SALUD y Apps el
  // de la sala ATP, porque son esas mismas rutas.
  plan: { reposo: 'tab-programa', activo: 'tab-programa-fill' },
  perfil: { reposo: 'tab-salud', activo: 'tab-salud-fill' },
  apps: { reposo: 'tab-atp', activo: 'tab-atp-fill' },
};

/**
 * 8-oct-2026 (v4): las tres vistas del tab bar. 'atp' es la ATP completa,
 * 'elite_dx' la Elite DX clasica y 'v4' la Elite DX con Hoy, Plan, ARGOS,
 * Perfil y Apps. La v4 solo existe dentro de Elite DX.
 */
export type VistaTabs = 'atp' | 'elite_dx' | 'v4';

export function vistaDeTabs(eliteDx: boolean, v4: boolean): VistaTabs {
  if (!eliteDx) return 'atp';
  return v4 ? 'v4' : 'elite_dx';
}

/**
 * Las salas que cada vista saca del tab bar (siguen siendo rutas validas).
 * Si la vista cambia con la persona parada en una de ellas, el layout la
 * manda a HOY (RedirectPorModo). Las de 'atp' y 'elite_dx' son las mismas del
 * 26-sep-2026; las de 'v4' (8-oct-2026) son PROGRESO, TU y TRIBU: Perfil
 * lleva a ellas (Historia y tu foto).
 */
export const TABS_OCULTAS_POR_VISTA: Readonly<Record<VistaTabs, ReadonlySet<string>>> = {
  elite_dx: new Set(['/kit', '/salud', '/tribu']),
  atp: new Set(['/programa', '/progreso', '/tu']),
  v4: new Set(['/progreso', '/tu', '/tribu']),
};

/**
 * 8-oct-2026 (v4): las cinco salas visibles de la v4, en el orden de la
 * barra. Se reusan rutas (sin rutas nuevas en la fase A): Hoy = index,
 * Plan = programa, ARGOS = argos (boton elevado al centro, sin glifo),
 * Perfil = salud y Apps = kit. El layout las declara en este orden.
 */
export type RutaTab =
  | 'index' | 'programa' | 'kit' | 'argos' | 'progreso' | 'salud' | 'tribu' | 'tu'
  | 'biblioteca' | 'perfil';

export interface TabV4 {
  name: RutaTab;
  title: string;
  /** null = la orbe de ARGOS, que no es un glifo. */
  icon: TabBarIconKey | null;
}

export const TABS_V4: readonly TabV4[] = [
  { name: 'index', title: 'Hoy', icon: 'hoy' },
  { name: 'programa', title: 'Plan', icon: 'plan' },
  { name: 'argos', title: '', icon: null },
  { name: 'salud', title: 'Perfil', icon: 'perfil' },
  { name: 'kit', title: 'Apps', icon: 'apps' },
];

/** 8-oct-2026 (v4): fuera de la barra en la v4 (href: null), vivas como rutas. */
export const TABS_OCULTAS_V4: readonly RutaTab[] = ['progreso', 'tribu', 'tu', 'biblioteca', 'perfil'];

/**
 * 8-oct-2026 (v4): que pinta la ruta /salud. En la v4 es el PERFIL, pero el
 * hub clasico (SaludHub) no se pierde: quien llega con `?seccion=X` (Ajustes
 * > Salud, /health-hub, "Ir a Salud" del Perfil con `seccion=hub`, enlaces
 * viejos a una seccion) ve el hub con esa seccion. Sin `seccion` (o con
 * `marcador`, que lo abre el Perfil), Perfil. Fuera de la v4, siempre el hub.
 */
export function vistaDeSalud(v4: boolean, seccion: string | string[] | undefined | null): 'perfil' | 'hub' {
  if (!v4) return 'hub';
  const s = Array.isArray(seccion) ? seccion[0] : seccion;
  return s != null && s.trim() !== '' ? 'hub' : 'perfil';
}

/** Etiqueta de accesibilidad del boton de ARGOS en la v4. */
export const ARGOS_V4_A11Y = 'Hablar con ARGOS';
