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

export const TAB_BAR_ICONS: Record<'hoy' | 'atp' | 'salud' | 'tribu', TabBarIconPair> = {
  hoy: { reposo: 'tab-hoy', activo: 'tab-hoy-fill' },
  atp: { reposo: 'tab-atp', activo: 'tab-atp-fill' },
  salud: { reposo: 'tab-salud', activo: 'tab-salud-fill' },
  tribu: { reposo: 'tab-tribu', activo: 'tab-tribu-fill' },
};
