// Cada intervalo preconfigurado que aparece en el selector
export interface IntervalOption {
  id: string;          // Identificador único
  label: string;       // Texto que ve el usuario en el chip
  seconds: number;     // Duración en segundos (0 = requiere input del usuario)
  enabled: boolean;    // false = visible pero no seleccionable todavía
}

/**
 * Lista de intervalos preconfigurados.
 * El orden del array es el orden en que aparecen en pantalla.
 *
 * Tabata: 20s trabajo / 10s descanso × 8 rondas = 240s total
 * Personalizado: Abre input para que el usuario ponga sus segundos
 */
export const INTERVALS: IntervalOption[] = [
  { id: '30s',    label: '30s',          seconds: 30,   enabled: true },
  { id: '60s',    label: '60s',          seconds: 60,   enabled: true },
  { id: '90s',    label: '90s',          seconds: 90,   enabled: true },
  { id: 'tabata', label: 'Tabata',       seconds: 240,  enabled: true },
  { id: 'custom', label: 'Personalizado', seconds: 0,   enabled: true },
];

// Intervalo seleccionado por defecto al abrir la app
export const DEFAULT_INTERVAL = INTERVALS[0];
