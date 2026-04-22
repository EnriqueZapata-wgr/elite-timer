// =============================================================================
// ATP QUIZZES FUNCIONALES — Preguntas de medicina funcional por dominio
// =============================================================================
// Cada pregunta detecta CAUSAS RAÍZ, no síntomas genéricos.
// Formato: Cierto/Falso (como Braverman) para consistencia de UI.
// Cada "Cierto" suma 1 punto (o weight) al dominio indicado.
// =============================================================================

export interface FunctionalQuiz {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  color: string;
  description: string;
  estimatedMinutes: number;
  domains: QuizDomain[];
  questions: FunctionalQuestion[];
  resultInsights: ResultInsight[];
}

export interface QuizDomain {
  id: string;
  name: string;
  color: string;
  maxScore: number;
}

export interface FunctionalQuestion {
  id: string;
  text: string;
  domain: string;
  rootCause: string;
  weight: number;
}

export interface ResultInsight {
  domain: string;
  threshold: number;
  title: string;
  description: string;
  recommendation: string;
  protocolId?: string;
}

// =============================================================================
// QUIZ 1: SUEÑO PROFUNDO
// =============================================================================

export const SLEEP_QUIZ: FunctionalQuiz = {
  id: 'sleep_functional',
  name: 'Sueño Profundo',
  subtitle: 'Evaluación funcional de calidad de sueño',
  emoji: '🌙',
  color: '#818cf8',
  description: 'Evalúa no solo cuánto duermes, sino la CALIDAD real de tu sueño y qué sistemas de tu cuerpo podrían estar interfiriendo.',
  estimatedMinutes: 5,
  domains: [
    { id: 'cortisol', name: 'Cortisol nocturno', color: '#ef4444', maxScore: 0 },
    { id: 'circadian', name: 'Ritmo circadiano', color: '#f59e0b', maxScore: 0 },
    { id: 'nervous', name: 'Sistema nervioso', color: '#8b5cf6', maxScore: 0 },
    { id: 'metabolic_sleep', name: 'Interferencia metabólica', color: '#3b82f6', maxScore: 0 },
    { id: 'environment', name: 'Entorno de sueño', color: '#22c55e', maxScore: 0 },
  ],
  questions: [
    // CORTISOL NOCTURNO
    { id: 'S01', text: 'Me despierto entre 1 y 3 AM sin razón aparente', domain: 'cortisol', rootCause: 'Pico de cortisol nocturno / sobrecarga hepática', weight: 2 },
    { id: 'S02', text: 'Al despertar en la noche, mi mente se activa inmediatamente con pensamientos', domain: 'cortisol', rootCause: 'Eje HPA hiperactivo', weight: 1 },
    { id: 'S03', text: 'Sudo durante la noche aunque la temperatura sea fresca', domain: 'cortisol', rootCause: 'Cortisol elevado / desbalance hormonal', weight: 1 },
    { id: 'S04', text: 'Me despierto con el corazón acelerado', domain: 'cortisol', rootCause: 'Activación simpática nocturna', weight: 2 },
    { id: 'S05', text: 'Siento más energía a las 10 PM que a las 7 AM', domain: 'cortisol', rootCause: 'Curva de cortisol invertida', weight: 1 },

    // RITMO CIRCADIANO
    { id: 'S06', text: 'No me da la luz del sol en los primeros 30 minutos del día', domain: 'circadian', rootCause: 'Falta de zeitgeber principal para resetear reloj interno', weight: 2 },
    { id: 'S07', text: 'Uso pantallas (celular, laptop, TV) en la última hora antes de dormir', domain: 'circadian', rootCause: 'Luz azul suprime melatonina', weight: 1 },
    { id: 'S08', text: 'Mi hora de dormir varía más de 1 hora entre semana y fin de semana', domain: 'circadian', rootCause: 'Jet lag social — desincroniza el reloj circadiano', weight: 1 },
    { id: 'S09', text: 'Trabajo en turnos nocturnos o con horarios rotativos', domain: 'circadian', rootCause: 'Disrupción circadiana crónica', weight: 2 },
    { id: 'S10', text: 'Ceno después de las 9 PM frecuentemente', domain: 'circadian', rootCause: 'Digestión tardía interfiere con fase de sueño profundo', weight: 1 },

    // SISTEMA NERVIOSO
    { id: 'S11', text: 'Me cuesta "apagar" mi cerebro al acostarme', domain: 'nervous', rootCause: 'Dominancia simpática / deficiencia de GABA', weight: 1 },
    { id: 'S12', text: 'Rechino los dientes o aprieto la mandíbula al dormir', domain: 'nervous', rootCause: 'Tensión del sistema nervioso / magnesio bajo', weight: 1 },
    { id: 'S13', text: 'Mis piernas se sienten inquietas cuando me acuesto', domain: 'nervous', rootCause: 'Deficiencia de hierro o magnesio / dopamina baja', weight: 1 },
    { id: 'S14', text: 'Tengo sueños muy vívidos, intensos o pesadillas frecuentes', domain: 'nervous', rootCause: 'Exceso de actividad REM / GABA insuficiente', weight: 1 },
    { id: 'S15', text: 'Ronco fuerte o me han dicho que dejo de respirar al dormir', domain: 'nervous', rootCause: 'Posible apnea del sueño — requiere evaluación', weight: 2 },

    // INTERFERENCIA METABÓLICA
    { id: 'S16', text: 'Si no como algo antes de dormir, me cuesta conciliar el sueño', domain: 'metabolic_sleep', rootCause: 'Hipoglucemia nocturna / desregulación de glucosa', weight: 1 },
    { id: 'S17', text: 'Me despierto con mucha hambre y necesito comer inmediatamente', domain: 'metabolic_sleep', rootCause: 'Reservas de glucógeno bajas / cortisol matutino elevado', weight: 1 },
    { id: 'S18', text: 'Tomo más de 2 tazas de café al día', domain: 'metabolic_sleep', rootCause: 'Cafeína tiene vida media de 5-6h — afecta sueño profundo', weight: 1 },
    { id: 'S19', text: 'Consumo alcohol 3+ veces por semana', domain: 'metabolic_sleep', rootCause: 'Alcohol fragmenta el sueño REM y reduce sueño profundo', weight: 1 },

    // ENTORNO
    { id: 'S20', text: 'Mi cuarto no está completamente oscuro cuando duermo', domain: 'environment', rootCause: 'Luz ambiental suprime melatonina', weight: 1 },
    { id: 'S21', text: 'La temperatura de mi cuarto es mayor a 20°C al dormir', domain: 'environment', rootCause: 'El cuerpo necesita bajar 1-2°C para sueño profundo', weight: 1 },
    { id: 'S22', text: 'Hay ruido constante donde duermo (tráfico, vecinos, mascota)', domain: 'environment', rootCause: 'Ruido fragmenta las fases de sueño', weight: 1 },
  ],
  resultInsights: [
    { domain: 'cortisol', threshold: 3, title: 'Cortisol nocturno elevado', description: 'Tu cuerpo está produciendo cortisol cuando debería estar en modo reparación.', recommendation: 'Ashwagandha 300mg antes de dormir, fosfatidilserina 200mg, técnicas de respiración 4-7-8.', protocolId: 'sleep_deep' },
    { domain: 'circadian', threshold: 3, title: 'Ritmo circadiano desincronizado', description: 'Tu reloj interno no recibe las señales correctas para sincronizarse.', recommendation: 'Luz solar 10 min al despertar, lentes rojos 2h antes de dormir, horario fijo ±30 min.', protocolId: 'circadian_reset' },
    { domain: 'nervous', threshold: 3, title: 'Sistema nervioso sobreactivado', description: 'Tu cuerpo no logra pasar de modo "lucha" a modo "descanso".', recommendation: 'Magnesio glicinato 400mg, respiración box breathing antes de dormir, GABA 500mg.', protocolId: 'nervous_calm' },
    { domain: 'metabolic_sleep', threshold: 2, title: 'Interferencia metabólica', description: 'Tu glucosa o hábitos están interfiriendo con la calidad de tu sueño.', recommendation: 'Última cafeína antes de mediodía, cena 3h antes de dormir, proteína + grasa en última comida.' },
    { domain: 'environment', threshold: 2, title: 'Entorno subóptimo', description: 'Tu ambiente de sueño no facilita el descanso profundo.', recommendation: 'Blackout curtains, temperatura 18-20°C, ruido blanco si hay ruido ambiental.' },
  ],
};

// =============================================================================
// QUIZ 2: ENERGÍA Y METABOLISMO
// =============================================================================

export const ENERGY_QUIZ: FunctionalQuiz = {
  id: 'energy_functional',
  name: 'Energía y Metabolismo',
  subtitle: 'Tu motor metabólico al descubierto',
  emoji: '⚡',
  color: '#f59e0b',
  description: 'Evalúa cómo tu cuerpo produce y usa energía. Detecta si tienes resistencia a insulina, fatiga adrenal o disfunción mitocondrial.',
  estimatedMinutes: 5,
  domains: [
    { id: 'insulin', name: 'Resistencia a insulina', color: '#ef4444', maxScore: 0 },
    { id: 'adrenal', name: 'Fatiga adrenal', color: '#f97316', maxScore: 0 },
    { id: 'thyroid', name: 'Función tiroidea', color: '#8b5cf6', maxScore: 0 },
    { id: 'mitochondria', name: 'Salud mitocondrial', color: '#22c55e', maxScore: 0 },
  ],
  questions: [
    // RESISTENCIA A INSULINA
    { id: 'E01', text: 'Después de comer, me da sueño intenso o necesito acostarme', domain: 'insulin', rootCause: 'Pico de glucosa → crash → somnolencia post-prandial', weight: 2 },
    { id: 'E02', text: 'Tengo antojos intensos de azúcar, pan o carbohidratos', domain: 'insulin', rootCause: 'Montaña rusa de glucosa / resistencia a insulina', weight: 2 },
    { id: 'E03', text: 'Acumulo grasa principalmente en el abdomen', domain: 'insulin', rootCause: 'Grasa visceral = marcador de resistencia a insulina', weight: 1 },
    { id: 'E04', text: 'Tengo manchas oscuras en cuello, axilas o ingles (acantosis)', domain: 'insulin', rootCause: 'Signo clínico de hiperinsulinemia', weight: 2 },
    { id: 'E05', text: 'Si no como cada 3-4 horas me siento irritable o débil', domain: 'insulin', rootCause: 'Hipoglucemia reactiva — cuerpo no usa grasa como combustible', weight: 1 },
    { id: 'E06', text: 'Tengo sed excesiva o voy mucho al baño', domain: 'insulin', rootCause: 'Glucosa elevada aumenta filtración renal', weight: 1 },

    // FATIGA ADRENAL
    { id: 'E07', text: 'Necesito café o estimulantes para funcionar en la mañana', domain: 'adrenal', rootCause: 'Cortisol matutino insuficiente', weight: 2 },
    { id: 'E08', text: 'Tengo un "bajón" de energía entre 2 y 4 PM', domain: 'adrenal', rootCause: 'Caída natural de cortisol mal compensada', weight: 1 },
    { id: 'E09', text: 'Me mareo al levantarme rápido de estar sentado o acostado', domain: 'adrenal', rootCause: 'Hipotensión ortostática — aldosterona baja', weight: 1 },
    { id: 'E10', text: 'Se me antojan los alimentos salados más de lo normal', domain: 'adrenal', rootCause: 'Aldosterona baja → pérdida de sodio', weight: 1 },
    { id: 'E11', text: 'Me recupero lentamente de enfermedades o esfuerzo físico', domain: 'adrenal', rootCause: 'Respuesta adrenal comprometida', weight: 1 },
    { id: 'E12', text: 'Tengo el segundo aire de energía después de las 6 PM', domain: 'adrenal', rootCause: 'Curva de cortisol irregular', weight: 1 },

    // TIROIDES
    { id: 'E13', text: 'Tengo las manos y pies fríos frecuentemente', domain: 'thyroid', rootCause: 'T3 baja → metabolismo periférico reducido', weight: 1 },
    { id: 'E14', text: 'Mi cabello se cae más de lo que considero normal', domain: 'thyroid', rootCause: 'Hipotiroidismo afecta ciclo de crecimiento capilar', weight: 1 },
    { id: 'E15', text: 'He ganado peso sin cambiar mis hábitos de alimentación', domain: 'thyroid', rootCause: 'Metabolismo basal reducido por T4/T3 insuficiente', weight: 1 },
    { id: 'E16', text: 'Mi piel está seca o áspera últimamente', domain: 'thyroid', rootCause: 'La tiroides regula hidratación cutánea', weight: 1 },
    { id: 'E17', text: 'Tengo estreñimiento frecuente (menos de 1 evacuación diaria)', domain: 'thyroid', rootCause: 'T3 baja reduce motilidad intestinal', weight: 1 },

    // MITOCONDRIA
    { id: 'E18', text: 'Me fatigo más rápido que antes con el mismo esfuerzo físico', domain: 'mitochondria', rootCause: 'Producción de ATP mitocondrial reducida', weight: 1 },
    { id: 'E19', text: 'Tengo dolor muscular persistente sin razón clara', domain: 'mitochondria', rootCause: 'Estrés oxidativo mitocondrial', weight: 1 },
    { id: 'E20', text: 'Mi recuperación después del ejercicio es cada vez más lenta', domain: 'mitochondria', rootCause: 'Capacidad de regeneración celular comprometida', weight: 1 },
    { id: 'E21', text: 'Siento "niebla mental" — dificultad para pensar con claridad', domain: 'mitochondria', rootCause: 'El cerebro consume 20% del ATP total — disfunción mitocondrial afecta cognición', weight: 2 },
  ],
  resultInsights: [
    { domain: 'insulin', threshold: 3, title: 'Posible resistencia a insulina', description: 'Tu cuerpo podría no estar usando la glucosa eficientemente. Esto es reversible.', recommendation: 'Caminata 15 min post-comida, reducir carbohidratos refinados, priorizar proteína + grasa en cada comida, ayuno 16h.', protocolId: 'metabolic_reset' },
    { domain: 'adrenal', threshold: 3, title: 'Patrón de fatiga adrenal', description: 'Tus glándulas adrenales podrían estar agotadas por estrés crónico.', recommendation: 'Ashwagandha 600mg, vitamina C 1000mg, sal marina en agua AM, eliminar cafeína post-mediodía.', protocolId: 'adrenal_recovery' },
    { domain: 'thyroid', threshold: 3, title: 'Función tiroidea subóptima', description: 'Tus síntomas sugieren que tu tiroides podría necesitar evaluación.', recommendation: 'Solicita labs: TSH, T4L, T3L, anticuerpos antitiroideos. Selenio 200mcg, zinc 25mg.', protocolId: 'thyroid_support' },
    { domain: 'mitochondria', threshold: 2, title: 'Salud mitocondrial comprometida', description: 'Tus centrales de energía celular podrían necesitar soporte.', recommendation: 'CoQ10 200mg, PQQ 20mg, NAD+ precursors (NMN 250mg), ejercicio de intervalos.', protocolId: 'mito_boost' },
  ],
};

// =============================================================================
// QUIZ 3: ESTRÉS Y SISTEMA NERVIOSO
// =============================================================================

export const STRESS_QUIZ: FunctionalQuiz = {
  id: 'stress_functional',
  name: 'Estrés y Sistema Nervioso',
  subtitle: '¿Tu cuerpo está en modo lucha o modo reparación?',
  emoji: '🧠',
  color: '#ef4444',
  description: 'Evalúa tu balance entre sistema nervioso simpático (acción) y parasimpático (descanso). El estrés crónico envejece más rápido que cualquier otra cosa.',
  estimatedMinutes: 5,
  domains: [
    { id: 'sympathetic', name: 'Sobreactivación simpática', color: '#ef4444', maxScore: 0 },
    { id: 'emotional', name: 'Carga emocional', color: '#f59e0b', maxScore: 0 },
    { id: 'cognitive', name: 'Fatiga cognitiva', color: '#8b5cf6', maxScore: 0 },
    { id: 'physical_stress', name: 'Estrés físico', color: '#3b82f6', maxScore: 0 },
  ],
  questions: [
    // SIMPÁTICO
    { id: 'ST01', text: 'Mi mandíbula está tensa o apretada durante el día sin darme cuenta', domain: 'sympathetic', rootCause: 'Tensión muscular crónica por activación simpática', weight: 1 },
    { id: 'ST02', text: 'Mi respiración es corta y superficial la mayor parte del día', domain: 'sympathetic', rootCause: 'Patrón respiratorio de estrés — no activa el diafragma', weight: 2 },
    { id: 'ST03', text: 'Tengo tensión crónica en cuello, hombros o espalda alta', domain: 'sympathetic', rootCause: 'Músculos del estrés crónicamente contraídos', weight: 1 },
    { id: 'ST04', text: 'Mi digestión empeora cuando estoy bajo presión', domain: 'sympathetic', rootCause: 'El SNS desvía sangre del digestivo al musculoesquelético', weight: 1 },
    { id: 'ST05', text: 'Me sobresalto fácilmente con ruidos inesperados', domain: 'sympathetic', rootCause: 'Reflejo de sobresalto hiperactivo — sistema en alerta permanente', weight: 1 },
    { id: 'ST06', text: 'Siento que vivo en modo "urgente" aunque no haya emergencia real', domain: 'sympathetic', rootCause: 'Eje HPA crónicamente activado', weight: 2 },

    // EMOCIONAL
    { id: 'ST07', text: 'Me cuesta decir "no" o poner límites a otros', domain: 'emotional', rootCause: 'Carga emocional acumulada por people-pleasing', weight: 1 },
    { id: 'ST08', text: 'Siento culpa cuando descanso o no estoy siendo "productivo"', domain: 'emotional', rootCause: 'Identidad atada a productividad — no hay permiso para parar', weight: 1 },
    { id: 'ST09', text: 'Me irrito con cosas pequeñas que antes no me molestaban', domain: 'emotional', rootCause: 'Reservas de tolerancia agotadas — señal de burnout', weight: 1 },
    { id: 'ST10', text: 'Siento que estoy "funcionando" pero no "viviendo"', domain: 'emotional', rootCause: 'Desconexión emocional por estrés crónico', weight: 2 },
    { id: 'ST11', text: 'Lloro o me emociono más fácilmente que antes', domain: 'emotional', rootCause: 'Serotonina/GABA bajos por estrés prolongado', weight: 1 },

    // COGNITIVO
    { id: 'ST12', text: 'Olvido cosas que acabo de hacer o decir', domain: 'cognitive', rootCause: 'Cortisol alto daña hipocampo — afecta memoria de trabajo', weight: 1 },
    { id: 'ST13', text: 'Me cuesta tomar decisiones simples', domain: 'cognitive', rootCause: 'Fatiga de decisión + cortisol afecta corteza prefrontal', weight: 1 },
    { id: 'ST14', text: 'Mi mente salta de un pensamiento a otro sin control', domain: 'cognitive', rootCause: 'Mente de mono — sistema de atención comprometido por estrés', weight: 1 },
    { id: 'ST15', text: 'Necesito releer cosas varias veces para entenderlas', domain: 'cognitive', rootCause: 'Memoria de trabajo reducida por cortisol crónico', weight: 1 },

    // FÍSICO
    { id: 'ST16', text: 'Enfermo más seguido que antes (gripas, infecciones)', domain: 'physical_stress', rootCause: 'Cortisol crónico suprime sistema inmune', weight: 1 },
    { id: 'ST17', text: 'Tengo acné, eczema o brotes de piel relacionados con estrés', domain: 'physical_stress', rootCause: 'Eje intestino-piel-estrés', weight: 1 },
    { id: 'ST18', text: 'Mi libido ha bajado significativamente', domain: 'physical_stress', rootCause: 'Cortisol alto suprime testosterona/estrógeno', weight: 1 },
    { id: 'ST19', text: 'He notado más canas o caída de cabello en período de estrés', domain: 'physical_stress', rootCause: 'Estrés oxidativo acelera envejecimiento celular', weight: 1 },
    { id: 'ST20', text: 'Retengo líquidos o me siento hinchado/a frecuentemente', domain: 'physical_stress', rootCause: 'Cortisol promueve retención de sodio y agua', weight: 1 },
  ],
  resultInsights: [
    { domain: 'sympathetic', threshold: 3, title: 'Sistema nervioso sobreactivado', description: 'Tu cuerpo pasa demasiado tiempo en modo "lucha o huida".', recommendation: 'Respiración diafragmática 5 min 3x/día, baño frío 30 seg, caminar en naturaleza, ashwagandha 600mg.', protocolId: 'nervous_reset' },
    { domain: 'emotional', threshold: 3, title: 'Carga emocional acumulada', description: 'Tus reservas emocionales están bajas. Necesitas recargar.', recommendation: 'Journaling descarga 10 min/día, establecer 1 límite claro esta semana, meditation 10 min/día.' },
    { domain: 'cognitive', threshold: 3, title: 'Fatiga cognitiva', description: 'Tu corteza prefrontal está agotada por estrés sostenido.', recommendation: 'Digital detox 1h antes de dormir, omega-3 2g/día, lion\'s mane 500mg, breaks de 5 min cada hora.' },
    { domain: 'physical_stress', threshold: 3, title: 'Estrés somatizado', description: 'Tu cuerpo está manifestando el estrés físicamente.', recommendation: 'Vitamina C 2000mg, magnesio glicinato 400mg, adaptógenos (ashwagandha, rhodiola), reduce entrenamiento de alta intensidad temporalmente.' },
  ],
};

// =============================================================================
// QUIZ 4: DIGESTIÓN Y SALUD INTESTINAL
// =============================================================================

export const DIGESTION_QUIZ: FunctionalQuiz = {
  id: 'digestion_functional',
  name: 'Digestión e Intestino',
  subtitle: 'Tu segundo cerebro habla — ¿lo escuchas?',
  emoji: '🔬',
  color: '#22c55e',
  description: 'El intestino produce el 90% de la serotonina y el 70% del sistema inmune vive ahí. Esta evaluación detecta disbiosis, permeabilidad intestinal y sensibilidades.',
  estimatedMinutes: 4,
  domains: [
    { id: 'permeability', name: 'Permeabilidad intestinal', color: '#ef4444', maxScore: 0 },
    { id: 'dysbiosis', name: 'Disbiosis', color: '#f97316', maxScore: 0 },
    { id: 'stomach_acid', name: 'Ácido estomacal', color: '#8b5cf6', maxScore: 0 },
    { id: 'sensitivity', name: 'Sensibilidades alimentarias', color: '#3b82f6', maxScore: 0 },
  ],
  questions: [
    // PERMEABILIDAD
    { id: 'D01', text: 'Mi abdomen se ve plano en la mañana pero inflado en la noche', domain: 'permeability', rootCause: 'Inflamación intestinal progresiva — permeabilidad', weight: 2 },
    { id: 'D02', text: 'Tengo dolor articular que no se explica por lesión', domain: 'permeability', rootCause: 'Partículas alimentarias en sangre → inflamación sistémica', weight: 1 },
    { id: 'D03', text: 'Mi piel tiene acné, rosácea o eczema frecuente', domain: 'permeability', rootCause: 'Eje intestino-piel — toxinas bacterianas en circulación', weight: 1 },
    { id: 'D04', text: 'Tengo sensibilidad a alimentos que antes toleraba bien', domain: 'permeability', rootCause: 'Nuevas sensibilidades = señal de permeabilidad aumentada', weight: 2 },
    { id: 'D05', text: 'Sufro de fatiga crónica inexplicable', domain: 'permeability', rootCause: 'Endotoxinas (LPS) en circulación generan fatiga inflamatoria', weight: 1 },

    // DISBIOSIS
    { id: 'D06', text: 'Tengo gases o flatulencia excesiva', domain: 'dysbiosis', rootCause: 'Fermentación bacteriana anormal (SIBO posible)', weight: 1 },
    { id: 'D07', text: 'Alterno entre estreñimiento y diarrea', domain: 'dysbiosis', rootCause: 'Flora intestinal desbalanceada', weight: 1 },
    { id: 'D08', text: 'Tengo antojos intensos de azúcar o pan', domain: 'dysbiosis', rootCause: 'Cándida y bacterias patógenas "piden" azúcar para alimentarse', weight: 2 },
    { id: 'D09', text: 'He tomado antibióticos más de 2 veces en el último año', domain: 'dysbiosis', rootCause: 'Antibióticos eliminan flora benéfica junto con patógenos', weight: 2 },
    { id: 'D10', text: 'Tengo mal aliento que no se resuelve con higiene dental', domain: 'dysbiosis', rootCause: 'Fermentación anormal en estómago o intestino', weight: 1 },

    // ÁCIDO ESTOMACAL
    { id: 'D11', text: 'Siento pesadez o que la comida "se queda" mucho tiempo en el estómago', domain: 'stomach_acid', rootCause: 'Hipoclorhidria — ácido gástrico insuficiente para digerir', weight: 1 },
    { id: 'D12', text: 'Eructo frecuentemente después de comer', domain: 'stomach_acid', rootCause: 'Fermentación en estómago por digestión incompleta', weight: 1 },
    { id: 'D13', text: 'Tengo reflujo o acidez estomacal', domain: 'stomach_acid', rootCause: 'Paradójicamente, el reflujo suele ser por POCO ácido, no mucho', weight: 1 },
    { id: 'D14', text: 'Veo alimentos sin digerir en mis heces', domain: 'stomach_acid', rootCause: 'Enzimas digestivas insuficientes', weight: 2 },
    { id: 'D15', text: 'Mis uñas son quebradizas o tienen estrías verticales', domain: 'stomach_acid', rootCause: 'Mala absorción de minerales (zinc, hierro) por ácido bajo', weight: 1 },

    // SENSIBILIDADES
    { id: 'D16', text: 'Me siento mejor cuando elimino gluten de mi dieta', domain: 'sensitivity', rootCause: 'Sensibilidad al gluten no celíaca', weight: 1 },
    { id: 'D17', text: 'Los lácteos me causan gases, hinchazón o mucosidad', domain: 'sensitivity', rootCause: 'Intolerancia a lactosa o sensibilidad a caseína', weight: 1 },
    { id: 'D18', text: 'Después de comer ciertos alimentos, mi energía baja notablemente', domain: 'sensitivity', rootCause: 'Respuesta inflamatoria a alimentos específicos', weight: 1 },
  ],
  resultInsights: [
    { domain: 'permeability', threshold: 3, title: 'Posible intestino permeable', description: 'La barrera intestinal podría estar comprometida, permitiendo el paso de partículas a la sangre.', recommendation: 'L-glutamina 5g, colágeno 10g, zinc carnosina 75mg, eliminar gluten y lácteos 30 días de prueba.', protocolId: 'gut_repair' },
    { domain: 'dysbiosis', threshold: 3, title: 'Flora intestinal desbalanceada', description: 'Las bacterias benéficas podrían estar en minoría frente a patógenos.', recommendation: 'Probióticos multi-cepa 50B UFC, prebióticos (inulina, FOS), reducir azúcar, aumentar fibra soluble.', protocolId: 'gut_flora' },
    { domain: 'stomach_acid', threshold: 3, title: 'Ácido gástrico insuficiente', description: 'Tu estómago podría no estar produciendo suficiente ácido para digerir correctamente.', recommendation: 'Betaína HCL con pepsina con comidas proteicas, vinagre de manzana 1 cda antes de comer, no beber agua durante comidas.' },
    { domain: 'sensitivity', threshold: 2, title: 'Sensibilidades alimentarias', description: 'Tu cuerpo reacciona negativamente a ciertos alimentos.', recommendation: 'Dieta de eliminación 30 días (gluten, lácteos, soya), reintroducción gradual para identificar triggers.' },
  ],
};

// =============================================================================
// QUIZ 5: DOLOR, MOVILIDAD E INFLAMACIÓN
// =============================================================================

export const PAIN_QUIZ: FunctionalQuiz = {
  id: 'pain_functional',
  name: 'Dolor e Inflamación',
  subtitle: 'El dolor es un mensaje — ¿qué te está diciendo tu cuerpo?',
  emoji: '🦴',
  color: '#f97316',
  description: 'La inflamación crónica es la raíz de la mayoría de enfermedades modernas. Esta evaluación detecta patrones inflamatorios y limitaciones de movilidad.',
  estimatedMinutes: 4,
  domains: [
    { id: 'chronic_inflammation', name: 'Inflamación crónica', color: '#ef4444', maxScore: 0 },
    { id: 'joint_mobility', name: 'Movilidad articular', color: '#f59e0b', maxScore: 0 },
    { id: 'posture', name: 'Postura y patrones', color: '#8b5cf6', maxScore: 0 },
    { id: 'recovery', name: 'Capacidad de recuperación', color: '#22c55e', maxScore: 0 },
  ],
  questions: [
    // INFLAMACIÓN
    { id: 'P01', text: 'Me despierto con rigidez en articulaciones que mejora con movimiento', domain: 'chronic_inflammation', rootCause: 'Rigidez matutina >30 min = marcador de inflamación sistémica', weight: 2 },
    { id: 'P02', text: 'Tengo hinchazón visible en dedos, tobillos o rodillas', domain: 'chronic_inflammation', rootCause: 'Retención de líquido inflamatorio', weight: 1 },
    { id: 'P03', text: 'Mi PCR (proteína C reactiva) o VSG han salido elevados en labs', domain: 'chronic_inflammation', rootCause: 'Marcadores directos de inflamación sistémica', weight: 2 },
    { id: 'P04', text: 'Tengo dolor que se mueve de una articulación a otra', domain: 'chronic_inflammation', rootCause: 'Inflamación migratoria — puede ser autoinmune', weight: 2 },
    { id: 'P05', text: 'El dolor empeora con ciertos alimentos (trigo, azúcar, alcohol)', domain: 'chronic_inflammation', rootCause: 'Inflamación mediada por dieta', weight: 1 },

    // MOVILIDAD
    { id: 'P06', text: 'No puedo tocar mis pies con las piernas rectas', domain: 'joint_mobility', rootCause: 'Cadena posterior acortada — isquiotibiales y fascia', weight: 1 },
    { id: 'P07', text: 'No puedo levantar los brazos completamente sobre mi cabeza sin arquear la espalda', domain: 'joint_mobility', rootCause: 'Movilidad de hombro limitada — dorsal ancho/pectoral acortados', weight: 1 },
    { id: 'P08', text: 'No puedo hacer sentadilla profunda con talones en el piso', domain: 'joint_mobility', rootCause: 'Movilidad de tobillo y cadera limitada', weight: 1 },
    { id: 'P09', text: 'Mis rodillas crujen o truenan al subir escaleras', domain: 'joint_mobility', rootCause: 'Condromalacia o déficit de colágeno/lubricación', weight: 1 },
    { id: 'P10', text: 'Tengo un lado del cuerpo notablemente más rígido que el otro', domain: 'joint_mobility', rootCause: 'Asimetría funcional — riesgo de lesión compensatoria', weight: 1 },

    // POSTURA
    { id: 'P11', text: 'Paso más de 6 horas al día sentado', domain: 'posture', rootCause: 'Flexores de cadera acortados, glúteos inhibidos, cifosis', weight: 1 },
    { id: 'P12', text: 'Tengo dolor en zona lumbar baja recurrente', domain: 'posture', rootCause: 'Core débil + flexores acortados + glúteos inhibidos', weight: 1 },
    { id: 'P13', text: 'Mi cabeza se adelanta hacia las pantallas (postura de cuello)', domain: 'posture', rootCause: 'Forward head posture — 4.5 kg extra por cada pulgada de adelanto', weight: 1 },
    { id: 'P14', text: 'Tengo dolor entre los omóplatos o parte alta de la espalda', domain: 'posture', rootCause: 'Romboides y trapecio medio estirados por hombros encorvados', weight: 1 },

    // RECUPERACIÓN
    { id: 'P15', text: 'El dolor muscular post-ejercicio me dura más de 72 horas', domain: 'recovery', rootCause: 'Inflamación crónica retrasa limpieza de metabolitos', weight: 1 },
    { id: 'P16', text: 'Las lesiones menores (raspones, moretones) tardan mucho en sanar', domain: 'recovery', rootCause: 'Capacidad regenerativa comprometida — vitamina C, zinc, colágeno', weight: 1 },
    { id: 'P17', text: 'Siento que mi cuerpo envejece más rápido que mi edad', domain: 'recovery', rootCause: 'Estrés oxidativo acelerado + inflamación crónica = envejecimiento', weight: 2 },
    { id: 'P18', text: 'He tenido la misma lesión o dolor en el mismo lugar más de 3 veces', domain: 'recovery', rootCause: 'Patrón de movimiento compensatorio — nunca se arregló la causa raíz', weight: 1 },
  ],
  resultInsights: [
    { domain: 'chronic_inflammation', threshold: 3, title: 'Inflamación crónica sistémica', description: 'Tu cuerpo tiene un nivel de inflamación base elevado que acelera el envejecimiento.', recommendation: 'Omega-3 3g EPA/DHA, cúrcuma con pimienta negra 1g, dieta antiinflamatoria, eliminar aceites de semilla.', protocolId: 'anti_inflammatory' },
    { domain: 'joint_mobility', threshold: 3, title: 'Movilidad articular limitada', description: 'Tus articulaciones no tienen el rango de movimiento óptimo para protegerte de lesiones.', recommendation: 'Movilidad articular 10 min diarios (mañana), yoga o stretching 2x/semana, colágeno tipo II 40mg.', protocolId: 'mobility_program' },
    { domain: 'posture', threshold: 3, title: 'Patrones posturales disfuncionales', description: 'Tu postura genera compensaciones que causan dolor y limitan rendimiento.', recommendation: 'Corrección de flexores de cadera, fortalecimiento de glúteos, retracción escapular, breaks cada 45 min de estar sentado.' },
    { domain: 'recovery', threshold: 2, title: 'Recuperación comprometida', description: 'Tu cuerpo no se repara tan eficientemente como debería.', recommendation: 'Vitamina C 2g, zinc 25mg, colágeno 15g, sueño 7-8h, contraste frío-calor post-entrenamiento.' },
  ],
};

// =============================================================================
// EXPORTAR TODOS LOS QUIZZES
// =============================================================================

export const ALL_FUNCTIONAL_QUIZZES = [
  SLEEP_QUIZ,
  ENERGY_QUIZ,
  STRESS_QUIZ,
  DIGESTION_QUIZ,
  PAIN_QUIZ,
];

/** Buscar quiz por ID */
export function getQuizById(id: string): FunctionalQuiz | undefined {
  return ALL_FUNCTIONAL_QUIZZES.find(q => q.id === id);
}
