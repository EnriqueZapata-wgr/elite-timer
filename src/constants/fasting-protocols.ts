/**
 * Protocolos de ayuno — fuente única (MB-22 Pieza 3).
 *
 * Vivían como const local de app/fasting.tsx; la ficha de Ayuno del Centro
 * edita la misma meta (user_day_preferences.goals.fasting_hours) y tiene que
 * ofrecer LA MISMA lista, no una copia que se desincronice.
 *
 * El gate de seguridad del ayuno (embarazo/lactancia >12h, TCA/diabetes >48h,
 * atestación >48h) corre al INICIAR el ayuno en fasting.tsx — editar la meta
 * aquí o allá nunca lo brinca: la meta solo preselecciona el protocolo.
 *
 * Copy es-MX — E.3: toda sigla se explica.
 */
export interface FastingProtocol {
  id: string;
  hours: number;
  label: string;
  description: string;
  color: string;
}

export const FASTING_PROTOCOLS: FastingProtocol[] = [
  { id: '12:12', hours: 12, label: '12:12', description: 'Para empezar — 12 h de ayuno, 12 de alimentación', color: '#22c55e' },
  { id: '14:10', hours: 14, label: '14:10', description: 'Intermedio — 14 h de ayuno, 10 de alimentación', color: '#38bdf8' },
  { id: '16:8', hours: 16, label: '16:8', description: 'El clásico — 16 h de ayuno, 8 de alimentación', color: '#a8e02a' },
  { id: '18:6', hours: 18, label: '18:6', description: 'Avanzado — 18 h de ayuno, 6 de alimentación', color: '#f59e0b' },
  { id: '20:4', hours: 20, label: '20:4', description: 'Exigente — 20 h de ayuno, 4 de alimentación', color: '#f97316' },
  { id: '24:0', hours: 24, label: 'OMAD', description: 'Una comida al día — 24 h de ayuno', color: '#ef4444' },
  { id: '36:0', hours: 36, label: '36 h', description: 'Extendido — 36 horas, requiere experiencia', color: '#c084fc' },
  { id: '72:0', hours: 72, label: '72 h', description: 'Prolongado — 72 horas, con protocolo de seguridad', color: '#ec4899' },
];
