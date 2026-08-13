/**
 * Etiquetas de movimientos de economía (E-1 MB-12, extraído en OLA1 R-0).
 *
 * El usuario no lee claves de base de datos: se traducen, y lo que no esté en
 * el mapa se limpia (snake_case → texto con espacios). Vive aquí y no dentro
 * de una pantalla porque ahora lo usan el historial y el reporte del dominio,
 * y dos copias acabarían nombrando distinto el mismo movimiento.
 *
 * Módulo puro: sin react-native y sin supabase.
 */

export const KEY_LABELS: Record<string, string> = {
  // Tipos de movimiento H+
  action_spent: 'Uso de ARGOS',
  conversion: 'Conversión E- → H+',
  boost: 'Boost Pro',
  purchase: 'Recarga',
  grant: 'Regalo ATP',
  refund: 'Reembolso',
  // Acciones de ARGOS
  food_estimate_photo: 'Análisis de comida por foto',
  food_estimate_text: 'Comida por texto',
  recipe_generate: 'Receta ARGOS',
  chat_message: 'Chat con ARGOS',
  braverman_premium: 'Reporte Premium Braverman',
  intervention_rationale: 'Explicación de protocolo',
  // Razones E-
  checkin: 'Check-in emocional',
  checkin_emotional: 'Check-in emocional',
  strength: 'Entrenamiento de fuerza',
  cardio: 'Cardio',
  fasting: 'Ayuno',
  hydration: 'Hidratación',
  nutrition: 'Nutrición',
  meditation: 'Meditación',
  breathing: 'Respiración',
  journal: 'Journal',
  nback: 'N-Back',
  daily_bonus: 'Bono del día',
};

export function humanizeKey(key: string | null | undefined): string {
  if (!key) return 'Movimiento';
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  const clean = key.replace(/_/g, ' ').trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
