/**
 * Seed data — Plantillas de protocolos y bloques de acciones iniciales.
 * Se ejecuta manualmente o desde un script de setup.
 */

const ADMIN_UID = '90a55e74-0e3d-477a-9ac5-2b339f7c40af';

// ═══ 6 BLOQUES RÁPIDOS ═══

export const ACTION_BLOCKS = [
  {
    name: 'Rutina mañana',
    description: 'Luz solar + grounding + suplementos AM',
    category: 'optimization',
    color: '#EF9F27',
    actions: [
      { name: 'Luz solar 10 min', category: 'optimization', time_offset_min: 0, duration_min: 10, instructions: 'Salir sin lentes, mirar hacia el cielo. Activa ritmo circadiano.', link_type: null },
      { name: 'Grounding 5 min', category: 'optimization', time_offset_min: 10, duration_min: 5, instructions: 'Pies descalzos en tierra/pasto.', link_type: null },
      { name: 'Hidratación AM', category: 'nutrition', time_offset_min: 15, duration_min: 2, instructions: 'Vaso de agua con limón y sal de mar. 500ml.', link_type: null },
      { name: 'Suplementos AM', category: 'optimization', time_offset_min: 17, duration_min: 2, instructions: 'Vitamina D3 5000IU + Omega 3 2g + Magnesio glicinato 400mg', link_type: null },
      { name: 'Respiración energizante', category: 'mind', time_offset_min: 20, duration_min: 5, instructions: 'Wim Hof o pranayama energizante', link_type: 'breathing' },
    ],
  },
  {
    name: 'Rutina noche',
    description: 'Meditación + suplementos PM + higiene de sueño',
    category: 'rest',
    color: '#E0E0E0',
    actions: [
      { name: 'Apagar pantallas', category: 'rest', time_offset_min: 0, duration_min: 1, instructions: 'Modo avión. Lentes blue-block si necesitas pantalla.', link_type: null },
      { name: 'Suplementos PM', category: 'optimization', time_offset_min: 5, duration_min: 2, instructions: 'Magnesio glicinato 400mg + Ashwagandha 600mg + L-teanina 200mg', link_type: null },
      { name: 'Journaling', category: 'mind', time_offset_min: 10, duration_min: 10, instructions: '3 cosas que agradeces hoy + 1 aprendizaje', link_type: null },
      { name: 'Meditación guiada', category: 'mind', time_offset_min: 20, duration_min: 10, instructions: 'Sesión de relajación para dormir', link_type: 'meditation' },
    ],
  },
  {
    name: 'Bloque entreno',
    description: 'Calentamiento + fuerza + recuperación',
    category: 'fitness',
    color: '#a8e02a',
    actions: [
      { name: 'Calentamiento dinámico', category: 'fitness', time_offset_min: 0, duration_min: 10, instructions: 'Movilidad articular + activación muscular', link_type: null },
      { name: 'Entrenamiento de fuerza', category: 'fitness', time_offset_min: 10, duration_min: 45, instructions: 'Seguir rutina asignada por el coach', link_type: 'routine' },
      { name: 'Baño frío', category: 'mind', time_offset_min: 55, duration_min: 3, instructions: '2-3 min exposición al frío. Respiración controlada.', link_type: null },
    ],
  },
  {
    name: 'Ventana nutricional',
    description: 'Comidas dentro de ventana de alimentación',
    category: 'nutrition',
    color: '#5B9BD5',
    actions: [
      { name: 'Romper ayuno — comida limpia', category: 'nutrition', time_offset_min: 0, duration_min: 30, instructions: 'Proteína + verduras + grasas saludables. Registrar con foto.', link_type: 'food_scan' },
      { name: 'Comida principal', category: 'nutrition', time_offset_min: 240, duration_min: 30, instructions: 'Proteína + verduras + carbos complejos.', link_type: 'food_scan' },
      { name: 'Cierre de ventana', category: 'nutrition', time_offset_min: 480, duration_min: 20, instructions: 'Última comida del día. Ligera.', link_type: 'food_scan' },
    ],
  },
  {
    name: 'Stack hormonal',
    description: 'Suplementos para optimización hormonal',
    category: 'optimization',
    color: '#EF9F27',
    actions: [
      { name: 'Stack hormonal AM', category: 'optimization', time_offset_min: 0, duration_min: 2, instructions: 'Zinc 30mg + Boro 6mg + Vit D3 5000IU + Ashwagandha KSM-66 600mg', link_type: null },
      { name: 'Entrenamiento compuesto', category: 'fitness', time_offset_min: 30, duration_min: 45, instructions: 'Squat, deadlift, press. Compuestos pesados.', link_type: 'routine' },
      { name: 'Proteína post-entreno', category: 'nutrition', time_offset_min: 80, duration_min: 10, instructions: '40g proteína + carbos dentro de 30 min', link_type: null },
      { name: 'Stack hormonal PM', category: 'optimization', time_offset_min: 720, duration_min: 2, instructions: 'Magnesio glicinato 400mg + Tongkat Ali 400mg', link_type: null },
    ],
  },
  {
    name: 'Check-ins diarios',
    description: 'Check-in emocional + journaling + registro',
    category: 'metrics',
    color: '#1D9E75',
    actions: [
      { name: 'Check-in emocional AM', category: 'mind', time_offset_min: 0, duration_min: 3, instructions: '¿Cómo te sientes hoy? Registra en el mapa RULER.', link_type: 'checkin' },
      { name: 'Registrar comidas', category: 'nutrition', time_offset_min: 600, duration_min: 5, instructions: 'Foto de cada comida. La IA hace el análisis.', link_type: 'food_scan' },
      { name: 'Journaling PM', category: 'mind', time_offset_min: 840, duration_min: 10, instructions: '3 gratitudes + 1 aprendizaje + intención para mañana', link_type: null },
    ],
  },
];

// ═══ 4 PROTOCOLOS TEMPLATE ═══

export const PROTOCOL_TEMPLATES = [
  {
    name: 'Protocolo anti-inflamatorio',
    description: 'Reduce inflamación sistémica en 90 días. PCR elevada, dolores articulares, fatiga.',
    tier: 1, category: 'inflammation',
    tags: ['inflamacion', 'autoinmune', 'dolor', 'pcr'],
    target_conditions: ['chronic_inflammation', 'autoimmune_general', 'joint_pain'],
    difficulty: 'intermediate', duration_weeks: 12,
    phases: [
      { name: 'Eliminación', duration_weeks: 4, description: 'Eliminar gluten, lácteos, azúcar, aceites industriales, alcohol' },
      { name: 'Reparación', duration_weeks: 4, description: 'Caldo de hueso, fermentados, omega-3' },
      { name: 'Reintroducción', duration_weeks: 4, description: 'Reintroducir alimentos uno por uno' },
    ],
    default_actions: [
      { name: 'Luz solar 10 min', category: 'optimization', default_time: '07:00', duration_min: 10, instructions: 'Regula cortisol matutino', chronotype_offsets: { lion: -60, bear: 0, wolf: 90, dolphin: 0 }, phase: null },
      { name: 'Suplementos anti-inflam AM', category: 'optimization', default_time: '07:15', duration_min: 2, instructions: 'Omega-3 3g + Curcumina 1g + Vit D3 5000IU', chronotype_offsets: { lion: -60, bear: 0, wolf: 90, dolphin: 0 }, phase: null },
      { name: 'Ayuno mínimo 16h', category: 'nutrition', default_time: '08:00', duration_min: 1, instructions: 'No comer hasta las 12:00.', chronotype_offsets: { lion: -60, bear: 0, wolf: 90, dolphin: 0 }, phase: null },
      { name: 'Entrenamiento', category: 'fitness', default_time: '07:30', duration_min: 45, instructions: 'Fuerza o zona 2. NUNCA HIIT en fase 1.', link_type: 'routine', chronotype_offsets: { lion: -60, bear: 0, wolf: 90, dolphin: 0 }, phase: null },
      { name: 'Comida 1 — anti-inflam', category: 'nutrition', default_time: '12:00', duration_min: 30, instructions: 'Proteína + crucíferas + omega-3. SIN gluten/lácteos/azúcar.', link_type: 'food_scan', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Caminata 20 min', category: 'fitness', default_time: '13:00', duration_min: 20, instructions: 'Post-comida. Regula glucosa.', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Comida 2', category: 'nutrition', default_time: '17:00', duration_min: 30, instructions: 'Salmón/sardinas + vegetales + camote.', link_type: 'food_scan', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Baño frío 2 min', category: 'mind', default_time: '08:20', duration_min: 3, instructions: 'Proteínas de choque frío — anti-inflamatorio.', chronotype_offsets: { lion: -60, bear: 0, wolf: 90, dolphin: 0 }, phase: null },
      { name: 'Meditación 10 min', category: 'mind', default_time: '22:00', duration_min: 10, instructions: 'Reduce cortisol nocturno.', link_type: 'meditation', chronotype_offsets: { lion: -30, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Suplementos PM', category: 'optimization', default_time: '22:15', duration_min: 2, instructions: 'Mg glicinato 400mg + L-glutamina 5g', chronotype_offsets: { lion: -30, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Dormir antes de 23:00', category: 'rest', default_time: '23:00', duration_min: 1, instructions: 'Sueño = anti-inflamatorio #1.', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
    ],
  },
  {
    name: 'Protocolo optimización hormonal',
    description: 'Testosterona baja o desbalance hormonal. 12 semanas.',
    tier: 2, category: 'hormonal',
    tags: ['testosterona', 'hormonas', 'energia', 'libido'],
    target_conditions: ['low_testosterone', 'hypogonadism'],
    difficulty: 'intermediate', duration_weeks: 12,
    phases: [
      { name: 'Base', duration_weeks: 4, description: 'Sueño, estrés, nutrición' },
      { name: 'Optimización', duration_weeks: 4, description: 'Suplementación y entreno específico' },
      { name: 'Potenciación', duration_weeks: 4, description: 'Biohacks avanzados' },
    ],
    default_actions: [
      { name: 'Luz solar 15 min', category: 'optimization', default_time: '07:00', duration_min: 15, instructions: 'Vitamina D = precursor hormonal.', chronotype_offsets: { lion: -60, bear: 0, wolf: 90, dolphin: 0 }, phase: null },
      { name: 'Stack hormonal AM', category: 'optimization', default_time: '07:20', duration_min: 2, instructions: 'Zinc 30mg + Boro 6mg + Vit D3 5000IU + Ashwagandha 600mg', chronotype_offsets: { lion: -60, bear: 0, wolf: 90, dolphin: 0 }, phase: null },
      { name: 'Entreno compuesto pesado', category: 'fitness', default_time: '08:00', duration_min: 50, instructions: 'Squat, Deadlift, Press. 3-5 reps. PESADO.', link_type: 'routine', chronotype_offsets: { lion: -60, bear: 0, wolf: 120, dolphin: 30 }, phase: null },
      { name: 'Proteína post-entreno', category: 'nutrition', default_time: '09:00', duration_min: 10, instructions: '40g proteína + 50g carbos.', link_type: 'food_scan', chronotype_offsets: { lion: -60, bear: 0, wolf: 120, dolphin: 30 }, phase: null },
      { name: 'Comida principal', category: 'nutrition', default_time: '13:00', duration_min: 30, instructions: 'Carne roja/huevos/mariscos + verduras.', link_type: 'food_scan', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Sin pantallas', category: 'rest', default_time: '22:00', duration_min: 1, instructions: 'Luz azul destruye melatonina → testosterona.', chronotype_offsets: { lion: -30, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Dormir 7-8 hrs', category: 'rest', default_time: '22:30', duration_min: 1, instructions: '70% de testosterona se produce en sueño profundo.', chronotype_offsets: { lion: -30, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
    ],
  },
  {
    name: 'Protocolo sueño profundo',
    description: 'Insomnio, sueño fragmentado, falta de energía. 8 semanas.',
    tier: 1, category: 'sleep',
    tags: ['sueno', 'insomnio', 'energia', 'recuperacion'],
    target_conditions: ['insomnia', 'sleep_apnea', 'fatigue_chronic'],
    difficulty: 'beginner', duration_weeks: 8,
    phases: [
      { name: 'Higiene', duration_weeks: 2, description: 'Higiene de sueño básica' },
      { name: 'Optimización', duration_weeks: 3, description: 'Suplementación y rutinas' },
      { name: 'Profundización', duration_weeks: 3, description: 'Biohacks avanzados' },
    ],
    default_actions: [
      { name: 'Luz solar al despertar', category: 'optimization', default_time: '07:00', duration_min: 10, instructions: 'Resetea reloj circadiano.', chronotype_offsets: { lion: -60, bear: 0, wolf: 90, dolphin: 0 }, phase: null },
      { name: 'Café solo antes de 14:00', category: 'nutrition', default_time: '08:00', duration_min: 1, instructions: 'Cafeína después de 14:00 = sueño destruido.', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Ejercicio (no después de 18:00)', category: 'fitness', default_time: '10:00', duration_min: 45, instructions: 'Entreno AM. Ejercicio nocturno sube cortisol.', link_type: 'routine', chronotype_offsets: { lion: -90, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Última comida 3h antes', category: 'nutrition', default_time: '19:00', duration_min: 30, instructions: 'Incluir carbos complejos (serotonina → melatonina).', link_type: 'food_scan', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Apagar pantallas', category: 'rest', default_time: '21:00', duration_min: 1, instructions: 'Blue-block si necesitas pantalla.', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Suplementos sueño', category: 'optimization', default_time: '21:30', duration_min: 2, instructions: 'Mg glicinato 400mg + L-teanina 200mg + Glycina 3g', chronotype_offsets: { lion: -30, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Respiración 4-7-8', category: 'mind', default_time: '22:00', duration_min: 5, instructions: 'Inhala 4s, retén 7s, exhala 8s. 4 ciclos.', link_type: 'breathing', chronotype_offsets: { lion: -30, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
    ],
  },
  {
    name: 'Protocolo metabólico básico',
    description: 'Resistencia a insulina, prediabetes, pérdida de grasa. 12 semanas.',
    tier: 1, category: 'metabolic',
    tags: ['metabolismo', 'insulina', 'glucosa', 'grasa'],
    target_conditions: ['insulin_resistance', 'prediabetes', 'obesity'],
    difficulty: 'beginner', duration_weeks: 12,
    phases: [
      { name: 'Reset', duration_weeks: 4, description: 'Eliminar azúcar, harinas, procesados. Ayuno 16:8.' },
      { name: 'Activación', duration_weeks: 4, description: 'Fuerza + caminatas post-comida' },
      { name: 'Optimización', duration_weeks: 4, description: 'Suplementación metabólica' },
    ],
    default_actions: [
      { name: 'Ayuno 16:8', category: 'nutrition', default_time: '07:00', duration_min: 1, instructions: 'No comer hasta 12:00. Solo agua, café negro, té.', chronotype_offsets: { lion: -60, bear: 0, wolf: 90, dolphin: 0 }, phase: null },
      { name: 'Caminata en ayunas 20 min', category: 'fitness', default_time: '07:30', duration_min: 20, instructions: 'Quema grasa en ayunas. Paso rápido.', chronotype_offsets: { lion: -60, bear: 0, wolf: 90, dolphin: 0 }, phase: null },
      { name: 'Romper ayuno — proteína primero', category: 'nutrition', default_time: '12:00', duration_min: 30, instructions: 'SIEMPRE proteína primero, después verduras, al final carbos.', link_type: 'food_scan', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Caminata post-comida 15 min', category: 'fitness', default_time: '12:45', duration_min: 15, instructions: 'Reduce pico de glucosa 30-40%.', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Entreno de fuerza', category: 'fitness', default_time: '17:00', duration_min: 45, instructions: 'Músculo = esponja de glucosa.', link_type: 'routine', chronotype_offsets: { lion: -120, bear: 0, wolf: 60, dolphin: 0 }, phase: 2 },
      { name: 'Cena — cierre ventana', category: 'nutrition', default_time: '19:30', duration_min: 20, instructions: 'Ligera. Sin carbos refinados. Ventana cierra a 20:00.', link_type: 'food_scan', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
      { name: 'Suplementos metabólicos', category: 'optimization', default_time: '19:45', duration_min: 2, instructions: 'Berberina 500mg + Cromo 200mcg + Canela Ceylon 1g', chronotype_offsets: { lion: -60, bear: 0, wolf: 60, dolphin: 0 }, phase: 2 },
      { name: 'Dormir 7+ hrs', category: 'rest', default_time: '22:30', duration_min: 1, instructions: '<6hrs sueño = +25% resistencia a insulina.', chronotype_offsets: { lion: -30, bear: 0, wolf: 60, dolphin: 0 }, phase: null },
    ],
  },
];
