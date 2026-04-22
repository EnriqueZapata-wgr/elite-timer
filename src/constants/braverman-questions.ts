// AUTO-GENERATED from Custionario_neurotransmisores.xlsx
// Test de Braverman — Evaluación de Neurotransmisores
// Dr. Eric R. Braverman, 'The Edge Effect'
// 313 preguntas: Parte 1 Dominancia (199) + Parte 2 Deficiencias (114)

export type BravermanPart = 'dominance' | 'deficiency';
export type Neurotransmitter = 'dopamine' | 'acetylcholine' | 'gaba' | 'serotonin';
export type QuestionCategory = 'memory' | 'physical' | 'character' | 'personality';

export interface BravermanQuestion {
  id: string;
  part: BravermanPart;
  neurotransmitter: Neurotransmitter;
  category: QuestionCategory;
  text: string;
}

export const NEUROTRANSMITTER_META = {
  dopamine: {
    name: 'Dopamina',
    emoji: '⚡',
    color: '#ef4444',
    controls: 'Energía, motivación, enfoque, poder',
    dominantTraits: 'Estratega, líder natural, orientado a logros, pensamiento rápido',
    deficientSymptoms: 'Fatiga, falta de motivación, antojos de azúcar, dificultad para concentrarse',
  },
  acetylcholine: {
    name: 'Acetilcolina',
    emoji: '🧠',
    color: '#3b82f6',
    controls: 'Memoria, creatividad, velocidad mental, intuición',
    dominantTraits: 'Creativo, empático, intuitivo, excelente memoria, comunicador nato',
    deficientSymptoms: 'Olvidos, pérdida de creatividad, insomnio, pérdida de tono muscular',
  },
  gaba: {
    name: 'GABA',
    emoji: '🧘',
    color: '#22c55e',
    controls: 'Calma, estabilidad, sueño, regulación emocional',
    dominantTraits: 'Calmado, organizado, leal, paciente, confiable, metódico',
    deficientSymptoms: 'Ansiedad, nerviosismo, insomnio, tensión muscular, palpitaciones',
  },
  serotonin: {
    name: 'Serotonina',
    emoji: '☀️',
    color: '#f59e0b',
    controls: 'Humor, placer, descanso, satisfacción',
    dominantTraits: 'Espontáneo, artístico, aventurero, vive el momento, flexible',
    deficientSymptoms: 'Depresión, antojos de carbohidratos, insomnio, irritabilidad, ansiedad',
  },
} as const;

export const CATEGORY_LABELS = {
  memory: 'Memoria y atención',
  physical: 'Cuerpo físico',
  character: 'Carácter',
  personality: 'Personalidad',
} as const;

// Suplementos recomendados por nivel de deficiencia
// Fuente: Dr. Braverman, 'The Edge Effect'
export const SUPPLEMENT_RECOMMENDATIONS = {
  dopamine: {
    name: 'Aceleradores de dopamina',
    supplements: [
      { name: 'Fenilalanina', minor: '500 mg', moderate: '1000 mg', major: '1000-2000 mg' },
      { name: 'Tirosina', minor: '500 mg', moderate: '1000 mg', major: '1000-2000 mg' },
      { name: 'Metionina', minor: '250 mg', moderate: '500 mg', major: '1000 mg' },
      { name: 'Rhodiola', minor: '50 mg', moderate: '100 mg', major: '200 mg' },
      { name: 'Piridoxina (B6)', minor: '5 mg', moderate: '10 mg', major: '50 mg' },
      { name: 'Complejo B', minor: '25 mg', moderate: '50 mg', major: '100 mg' },
      { name: 'Fosfatidilserina', minor: '50 mg', moderate: '100 mg', major: '200 mg' },
      { name: 'Ginkgo Biloba', minor: '50 mg', moderate: '75 mg', major: '100 mg' },
    ],
  },
  acetylcholine: {
    name: 'Impulsores de acetilcolina',
    supplements: [
      { name: 'Colina (GPC)', minor: '100 mg', moderate: '200 mg', major: '500 mg' },
      { name: 'Fosfatidilcolina', minor: '500 mg', moderate: '1000 mg', major: '2000 mg' },
      { name: 'Fosfatidilserina', minor: '50 mg', moderate: '100 mg', major: '200 mg' },
      { name: 'Acetil-L-carnitina', minor: '250 mg', moderate: '500 mg', major: '1000 mg' },
      { name: 'DHA', minor: '200 mg', moderate: '500 mg', major: '1000 mg' },
      { name: 'Vitamina B12', minor: '100 mg', moderate: '200 mg', major: '500 mg' },
      { name: 'Huperzina-A', minor: '50 mg', moderate: '100 mg', major: '200 mg' },
    ],
  },
  gaba: {
    name: 'Impulsores de GABA',
    supplements: [
      { name: 'Inositol', minor: '500 mg', moderate: '1000 mg', major: '2000 mg' },
      { name: 'GABA', minor: '100 mg', moderate: '500 mg', major: '1000 mg' },
      { name: 'Ácido glutámico', minor: '250 mg', moderate: '500 mg', major: '1000 mg' },
      { name: 'Melatonina (noche)', minor: '1 mg', moderate: '2 mg', major: '3-6 mg' },
      { name: 'Tiamina', minor: '200 mg', moderate: '400 mg', major: '600 mg' },
      { name: 'Niacinamida', minor: '25 mg', moderate: '100 mg', major: '500 mg' },
      { name: 'Raíz de valeriana', minor: '100 mg', moderate: '200 mg', major: '500 mg' },
      { name: 'Pasionaria', minor: '200 mg', moderate: '500 mg', major: '1000 mg' },
    ],
  },
  serotonin: {
    name: 'Aceleradores de serotonina',
    supplements: [
      { name: 'Calcio', minor: '500 mg', moderate: '750 mg', major: '1000 mg' },
      { name: 'Aceite de pescado', minor: '500 mg', moderate: '1000 mg', major: '2000 mg' },
      { name: '5-HTP', minor: '100 mg', moderate: '200 mg', major: '500 mg' },
      { name: 'Magnesio', minor: '200 mg', moderate: '400 mg', major: '800 mg' },
      { name: 'Melatonina (noche)', minor: '0.3 mg', moderate: '1-2 mg', major: '1-6 mg' },
      { name: 'Hierba de San Juan', minor: '200 mg', moderate: '400 mg', major: '600 mg' },
      { name: 'Triptófano', minor: '500 mg', moderate: '1000 mg', major: '1500-2000 mg' },
      { name: 'Zinc', minor: '15 mg', moderate: '30 mg', major: '45 mg' },
    ],
  },
} as const;

export function getDeficiencyLevel(score: number): 'none' | 'minor' | 'moderate' | 'major' {
  if (score <= 0) return 'none';
  if (score <= 5) return 'minor';
  if (score <= 15) return 'moderate';
  return 'major';
}

export const DEFICIENCY_LABELS = {
  none: 'Sin deficiencia',
  minor: 'Déficit menor',
  moderate: 'Déficit moderado',
  major: 'Déficit mayor',
} as const;

export const DEFICIENCY_COLORS = {
  none: '#22c55e',
  minor: '#fbbf24',
  moderate: '#f97316',
  major: '#ef4444',
} as const;

// Perfiles detallados por neurotransmisor (para resultados expandidos)
export const NEUROTRANSMITTER_PROFILES = {
  dopamine: {
    fullDescription: 'Tienes una naturaleza dopaminérgica. Eres parte del 17% de la población que comparte esta naturaleza. Eres racional, con mucha energía, orientación a logros y voluntad fuerte. Te concentras intensamente en las tareas que te importan. Profesionales como médicos, científicos, ingenieros y arquitectos suelen tener dominancia de dopamina.',
    deficiencyDetail: 'La dopamina controla la energía del cerebro. Los primeros signos de deficiencia son: pérdida de energía, fatiga, lentitud mental y dificultad para concentrarse.',
    associatedProblems: 'Fatiga crónica, antojos de azúcar y carbohidratos, problemas de atención, ADD, dificultad para levantarse por la mañana, pérdida de motivación, metabolismo lento.',
  },
  acetylcholine: {
    fullDescription: 'Tienes una naturaleza colinérgica. Eres creativo/a, intuitivo/a y con una memoria excepcional. Procesas información rápidamente y disfrutas aprender cosas nuevas. Eres empático/a y te conectas profundamente con las personas. Artistas, comunicadores y líderes visionarios suelen tener dominancia de acetilcolina.',
    deficiencyDetail: 'La acetilcolina controla la velocidad de tu cerebro. Cuando baja, tu memoria se vuelve irregular, tu creatividad disminuye y tu capacidad de aprendizaje se ve afectada.',
    associatedProblems: 'Olvidos frecuentes, pérdida de creatividad, insomnio, pérdida de tono muscular, sequedad de boca, dislexia, problemas de lectura.',
  },
  gaba: {
    fullDescription: 'Tienes una naturaleza GABAérgica. Eres parte del 50% de la población que comparte esta naturaleza. Eres una persona estable, organizada, leal y confiable. Te gusta mantener el orden y la rutina. Eres el pilar estable de tu entorno social. Profesionales como administradores, contadores y personal médico suelen tener dominancia de GABA.',
    deficiencyDetail: 'El GABA es el principal neurotransmisor inhibidor del cerebro. Sin suficiente GABA, tu cerebro produce energía en ráfagas descontroladas, lo que causa ansiedad, nerviosismo e inestabilidad emocional.',
    associatedProblems: 'Ansiedad, nerviosismo, insomnio, tensión muscular, palpitaciones, temblores, dolor de espalda, antojos de carbohidratos, cambios de humor, trastorno obsesivo compulsivo.',
  },
  serotonin: {
    fullDescription: 'Tienes una naturaleza serotoninérgica. Eres espontáneo/a, aventurero/a, artístico/a y vives el momento. Disfrutas explorar nuevas experiencias y no te dejas intimidar por los desafíos. Tu naturaleza serotoninérgica es ideal para profesiones que requieren coordinación motora, flexibilidad y manejo de crisis.',
    deficiencyDetail: 'La serotonina mantiene el equilibrio general del cerebro. Cuando baja, tus ondas cerebrales se desincronizan, afectando tu sueño, humor y capacidad de controlar impulsos.',
    associatedProblems: 'Depresión, antojos de carbohidratos, insomnio, irritabilidad, codependencia, impulsividad, falta de placer, perfeccionismo, aislamiento social.',
  },
} as const;

export const BRAVERMAN_QUESTIONS: BravermanQuestion[] = [
  {
    "id": "1.1.1.1",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Me parece sencillo procesar mis pensamientos"
  },
  {
    "id": "1.1.1.2",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Me concentro de manera efectiva"
  },
  {
    "id": "1.1.1.3",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Me caracterizo por ser alguien que piensa a fondo"
  },
  {
    "id": "1.1.1.4",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Soy alguien que piensa rápido"
  },
  {
    "id": "1.1.1.5",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Suelo distraerme debido a que hago muchas labores a la vez (multitask)"
  },
  {
    "id": "1.1.1.6",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Disfruto de un acalorado debate"
  },
  {
    "id": "1.1.1.7",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Tengo buena imaginación (facilidad de generar imágenes mentales)"
  },
  {
    "id": "1.1.1.8",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Tiendo a criticar y analizar mis pensamientos"
  },
  {
    "id": "1.1.2.1",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Gozo de mucha energía la mayor parte del tiempo"
  },
  {
    "id": "1.1.2.2",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Mi presión sanguínea es normalmente elevada"
  },
  {
    "id": "1.1.2.3",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "En algún momento de la vida he tenido episodios de extrema energía"
  },
  {
    "id": "1.1.2.4",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Sufro de insomnio"
  },
  {
    "id": "1.1.2.5",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "El ejercicio me parece energizante"
  },
  {
    "id": "1.1.2.6",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Normalmente NO necesito café para iniciar mi día con energía"
  },
  {
    "id": "1.1.2.7",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Las venas de mi cuerpo son normalmente visibles e incluso pareciera que podrían reventar en algún momento"
  },
  {
    "id": "1.1.2.8",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Suelo tener una temperatura corporal elevada"
  },
  {
    "id": "1.1.2.9",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Normalmente la comida la hago mientras trabajo"
  },
  {
    "id": "1.1.2.10",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Aprovecho cada oportunidad que se me presenta para tener relaciones sexuales"
  },
  {
    "id": "1.1.2.11",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Tengo un carácter duro e incluso explosivo"
  },
  {
    "id": "1.1.2.12",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Sólo como para Re energizar mi cuerpo"
  },
  {
    "id": "1.1.2.13",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Me encantan las películas de acción"
  },
  {
    "id": "1.1.2.14",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "El ejercicio me hace sentir poderoso"
  },
  {
    "id": "1.1.3.1",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "character",
    "text": "La gente suele verme como alguien con una mentalidad fuerte"
  },
  {
    "id": "1.1.3.2",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "character",
    "text": "La gente me describiría como alguien que se enfoca en logros"
  },
  {
    "id": "1.1.3.3",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "character",
    "text": "Algunos dirían que soy irracional"
  },
  {
    "id": "1.1.3.4",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "character",
    "text": "Haré lo que sea por lograr un objetivo"
  },
  {
    "id": "1.1.3.5",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "character",
    "text": "Encuentro valor en las filosofías religiosas"
  },
  {
    "id": "1.1.3.6",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "character",
    "text": "La incompetencia me resulta frustrante"
  },
  {
    "id": "1.1.3.7",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "character",
    "text": "Mantengo altos estándares para mí y otras personas"
  },
  {
    "id": "1.1.4.1",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Soy una persona muy dominante"
  },
  {
    "id": "1.1.4.2",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "En ocasiones no reconozco mis emociones"
  },
  {
    "id": "1.1.4.3",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Frecuentemente me cuesta trabajo escuchar las ideas de otros porque mis ideas me dominan"
  },
  {
    "id": "1.1.4.4",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Me he visto involucrado en muchas peleas"
  },
  {
    "id": "1.1.4.5",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Soy alguien que se enfoca mucho en el futuro"
  },
  {
    "id": "1.1.4.6",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Soy una persona que especula frecuentemente de acontecimientos en mi vida"
  },
  {
    "id": "1.1.4.7",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Las personas me describirían como orientado a la razón"
  },
  {
    "id": "1.1.4.8",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Frecuentemente me encuentro soñando despierto y ensimismado en mis fantasías"
  },
  {
    "id": "1.1.4.9",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Me gusta leer libros de historias y de no ficción"
  },
  {
    "id": "1.1.4.10",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Me declaro fanático del ingenio "
  },
  {
    "id": "1.1.4.11",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Puede tomarme tiempo distinguir a las personas problemáticas"
  },
  {
    "id": "1.1.4.12",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "No suelo caer en trampas de personas que dicen requerir mi ayuda"
  },
  {
    "id": "1.1.4.13",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Las personas me ven como alguien innovador"
  },
  {
    "id": "1.1.4.14",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Las personas suelen creer que tengo ideas raras o disruptivas pero generalmente soy capaz de explicarlas de manera racional"
  },
  {
    "id": "1.1.4.15",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Frecuentemente me encuentro irritable"
  },
  {
    "id": "1.1.4.16",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "A veces cosas insignificantes pueden enojarme o generarme ansiedad"
  },
  {
    "id": "1.1.4.17",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Fantaseo con poderes ilimitados"
  },
  {
    "id": "1.1.4.18",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Disfruto de gastar dinero"
  },
  {
    "id": "1.1.4.19",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Suelo ser dominante en las relaciones de pareja"
  },
  {
    "id": "1.1.4.20",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Soy muy duro conmigo mismo"
  },
  {
    "id": "1.1.4.21",
    "part": "dominance",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Cuando me critican suelo reacciones agresivamente. Me pongo a la defensiva en compañía de otros"
  },
  {
    "id": "1.2.1.1",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Mi memoria es excelente"
  },
  {
    "id": "1.2.1.2",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Soy muy bueno escuchando"
  },
  {
    "id": "1.2.1.3",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Soy bueno recordando historias"
  },
  {
    "id": "1.2.1.4",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Normalmente no olvido un rostro"
  },
  {
    "id": "1.2.1.5",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Soy muy creativo"
  },
  {
    "id": "1.2.1.6",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Tengo un excelente poder de atención, es difícil que pase algo por alto"
  },
  {
    "id": "1.2.1.7",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Tengo buenas corazonadas frecuentemente"
  },
  {
    "id": "1.2.1.8",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Percibo todo lo que sucede a mi alrededor sin perder de vista los detalles"
  },
  {
    "id": "1.2.1.9",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Tengo muy buena imaginación"
  },
  {
    "id": "1.2.2.1",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Tiendo a tener el ritmo cardíaco bajo"
  },
  {
    "id": "1.2.2.2",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Gozo de excelente tono muscular"
  },
  {
    "id": "1.2.2.3",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Tengo excelente figura física"
  },
  {
    "id": "1.2.2.4",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Tengo el colesterol muy bajo"
  },
  {
    "id": "1.2.2.5",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Cuando como, amo disfrutar de los aromas, texturas, sabores y experiencias de la comida"
  },
  {
    "id": "1.2.2.6",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Disfruto del yoga y estirar mis músculos"
  },
  {
    "id": "1.2.2.7",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Durante el sexo me caracterizo por ser alguien sensual"
  },
  {
    "id": "1.2.2.8",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "En algún momento de la vida sufrí de un trastorno de la alimentación"
  },
  {
    "id": "1.2.2.9",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Suelo utilizar remedios alternativos "
  },
  {
    "id": "1.2.3.1",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "Visualizo un futuro mejor y fructífero"
  },
  {
    "id": "1.2.3.2",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "Me siento inspirado a ayudar a otras personas"
  },
  {
    "id": "1.2.3.3",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "Creo que todo es posible para aquellos que dedican esfuerzo y disciplina"
  },
  {
    "id": "1.2.3.4",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "Soy bueno creando armonía entre las personas"
  },
  {
    "id": "1.2.3.5",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "La caridad y altruismo son características embebidas en mi corazón"
  },
  {
    "id": "1.2.3.6",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "Las personas me identifican como alguien con visión"
  },
  {
    "id": "1.2.3.7",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "Mis creencias en el aspecto religioso cambian frecuentemente"
  },
  {
    "id": "1.2.3.8",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "Soy idealista pero no perfeccionista"
  },
  {
    "id": "1.2.3.9",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "Estoy feliz con alguien que me trate bien"
  },
  {
    "id": "1.2.4.1",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Soy una persona romántica"
  },
  {
    "id": "1.2.4.2",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Estoy en sintonía con mis sentimientos"
  },
  {
    "id": "1.2.4.3",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Suelo tomar decisiones basadas en corazonadas"
  },
  {
    "id": "1.2.4.4",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Me gusta especular sobre las causas de las cosas"
  },
  {
    "id": "1.2.4.5",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "La gente diría que mi mente está soñando la mayor parte del tiempo"
  },
  {
    "id": "1.2.4.6",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Disfruto mucho de leer ficción"
  },
  {
    "id": "1.2.4.7",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Tengo una capacidad grande para desarrollar mis fantasías"
  },
  {
    "id": "1.2.4.8",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Soy bastante creativo al solucionar los problemas de las personas"
  },
  {
    "id": "1.2.4.9",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Soy muy expresivo, suelo comunicar lo que me molesta"
  },
  {
    "id": "1.2.4.10",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Soy optimista"
  },
  {
    "id": "1.2.4.11",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Soy creyente de las experiencias místicas"
  },
  {
    "id": "1.2.4.12",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "En el amor, creo en el ideal del alma gemela"
  },
  {
    "id": "1.2.4.13",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Los temas místicos o metafísicos me emocionan"
  },
  {
    "id": "1.2.4.14",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Suelo reaccionar de manera exagerada a las sensaciones de mi cuerpo"
  },
  {
    "id": "1.2.4.15",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Me resulta sencillo cambiar de hábitos. Mis creencias no están escritas en piedra"
  },
  {
    "id": "1.2.4.16",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Estoy en contacto con mis emociones"
  },
  {
    "id": "1.2.4.17",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Suelo amar a alguien un minuto y odiarlo al siguiente"
  },
  {
    "id": "1.2.4.18",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Soy generalmente coqueto"
  },
  {
    "id": "1.2.4.19",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "No me importa gastar dinero si este mejora mis relaciones"
  },
  {
    "id": "1.2.4.20",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Tiendo a fantasear mientras sostengo relaciones sexuales"
  },
  {
    "id": "1.2.4.21",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Mis relaciones tienden a estar llenas de romance"
  },
  {
    "id": "1.2.4.22",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Disfruto mucho de ver películas románticas"
  },
  {
    "id": "1.2.4.23",
    "part": "dominance",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Suelo tomar riesgos en mi vida amorosa"
  },
  {
    "id": "1.3.1.1",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Puedo sostener mi atención y seguir la idea de las personas con facilidad"
  },
  {
    "id": "1.3.1.2",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Disfruto de leer a las personas más que los libros"
  },
  {
    "id": "1.3.1.3",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Retengo la mayor parte de lo que escucho"
  },
  {
    "id": "1.3.1.4",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Suelo recordar los hechos que las personas me comparten"
  },
  {
    "id": "1.3.1.5",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Aprendo de mis experiencias"
  },
  {
    "id": "1.3.1.6",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Soy bueno recordando nombres"
  },
  {
    "id": "1.3.1.7",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Puedo enfocarme bien en tareas a realizar así como en las historias de las personas"
  },
  {
    "id": "1.3.2.1",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Me relajo fácilmente"
  },
  {
    "id": "1.3.2.2",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Soy una persona calmada"
  },
  {
    "id": "1.3.2.3",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Me resulta sencillo quedarme dormido por las noches"
  },
  {
    "id": "1.3.2.4",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Suelo tener mucha resistencia física"
  },
  {
    "id": "1.3.2.5",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Tengo la presión arterial baja"
  },
  {
    "id": "1.3.2.6",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "No tengo un historial familiar de problemas vasculares"
  },
  {
    "id": "1.3.2.7",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "En cuanto al sexo no soy alguien que experimente mucho"
  },
  {
    "id": "1.3.2.8",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Tengo poca tensión muscular"
  },
  {
    "id": "1.3.2.9",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "La cafeína me afecta muy poco"
  },
  {
    "id": "1.3.2.10",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Me tomo mi tiempo para comer mis alimentos"
  },
  {
    "id": "1.3.2.11",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Duermo super bien"
  },
  {
    "id": "1.3.2.12",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "No suelo tener antojos poco saludables como el azúcar"
  },
  {
    "id": "1.3.2.13",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "El ejercicio es un hábito de régimen para mí"
  },
  {
    "id": "1.3.3.1",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Estoy a favor de ir temprano a la cama para levantarme temprano"
  },
  {
    "id": "1.3.3.2",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Soy partidario de cumplir con fechas de entrega"
  },
  {
    "id": "1.3.3.3",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Intento complacer a los demás tanto como puedo"
  },
  {
    "id": "1.3.3.4",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Soy perfeccionista"
  },
  {
    "id": "1.3.3.5",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Soy bueno manteniendo relaciones personales largas y duraderas"
  },
  {
    "id": "1.3.3.6",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Presto mucha atención en dónde gasto el dinero"
  },
  {
    "id": "1.3.3.7",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Creo que el mundo sería un lugar mejor si las personas mejoraran su calidad moral"
  },
  {
    "id": "1.3.3.8",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Soy muy fiel y entregado a mis seres queridos"
  },
  {
    "id": "1.3.3.9",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Tengo altos estándares éticos por los cuales me manejo en la vida"
  },
  {
    "id": "1.3.3.10",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Pongo mucha atención a las leyes, principios y políticas"
  },
  {
    "id": "1.3.3.11",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Soy creyente de participar en servicios a la comunidad"
  },
  {
    "id": "1.3.4.1",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "No soy un aventurero"
  },
  {
    "id": "1.3.4.2",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "No suelo tener un carácter explosivo"
  },
  {
    "id": "1.3.4.3",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Tengo mucha paciencia "
  },
  {
    "id": "1.3.4.4",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "No disfruto de la filosofía"
  },
  {
    "id": "1.3.4.5",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Disfruto ver comedias televisivas de familias en sus vidas cotidianas"
  },
  {
    "id": "1.3.4.6",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Me desagradan las películas que traten de otros mundos y universos"
  },
  {
    "id": "1.3.4.7",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "No soy alguien que tome riesgos"
  },
  {
    "id": "1.3.4.8",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Considero mis experiencias pasadas antes de tomar una decisión"
  },
  {
    "id": "1.3.4.9",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Soy una persona realista"
  },
  {
    "id": "1.3.4.10",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Soy creyente de cerrar ciclos"
  },
  {
    "id": "1.3.4.11",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Me gustan los datos detallados al entender algo"
  },
  {
    "id": "1.3.4.12",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Cuando tomo una decisión esta es permanente"
  },
  {
    "id": "1.3.4.13",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Me gusta planear mi día, semana, mes, etc."
  },
  {
    "id": "1.3.4.14",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Suelo coleccionar cosas"
  },
  {
    "id": "1.3.4.15",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Suelo sentirme un poco triste o melancólico a veces"
  },
  {
    "id": "1.3.4.16",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Me asustan los conflictos y altercados"
  },
  {
    "id": "1.3.4.17",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Soy ahorrador en caso de haber una crisis"
  },
  {
    "id": "1.3.4.18",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Suelo crear lasos fuertes con otras personas"
  },
  {
    "id": "1.3.4.19",
    "part": "dominance",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Soy un pilar estable en la vida de quienes me rodean"
  },
  {
    "id": "1.4.1.1",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "Tengo excelente memoria visual"
  },
  {
    "id": "1.4.1.2",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "Soy muy perseptivo"
  },
  {
    "id": "1.4.1.3",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "Pienso de forma impulsiva"
  },
  {
    "id": "1.4.1.4",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "Vivo en el aquí y ahora"
  },
  {
    "id": "1.4.1.5",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "Suelo decir solicitar que se brinquen los detalles y vayan al grano"
  },
  {
    "id": "1.4.1.6",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "Suelo aprender lentamente de libros pero rápidamente de experiencias"
  },
  {
    "id": "1.4.1.7",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "Necesito experimentar algo o trabajarlo con mis propias manos para poder entenderlo"
  },
  {
    "id": "1.4.2.1",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Tiendo a dormir mucho"
  },
  {
    "id": "1.4.2.2",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Hablando del sexo, soy alguien que le gusta experimentar"
  },
  {
    "id": "1.4.2.3",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Tengo presión sanguínea baja"
  },
  {
    "id": "1.4.2.4",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Soy alguien muy orientado a la acción"
  },
  {
    "id": "1.4.2.5",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Soy \"hacendozo\" en casa"
  },
  {
    "id": "1.4.2.6",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Soy muy activo cuando salgo fuera de casa"
  },
  {
    "id": "1.4.2.7",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Me gustan los deportes de riesgo como el motociclismo y el paracaidismo"
  },
  {
    "id": "1.4.2.8",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Se me da resolver problemas de forma espontánea"
  },
  {
    "id": "1.4.2.9",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "En raras ocasiones tengo antojos por carbohidratos"
  },
  {
    "id": "1.4.2.10",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Normalmente como algo rápido, no muy elaborado para llevar."
  },
  {
    "id": "1.4.2.11",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "No soy muy consistente en mi rutina de ejercicio, puedo hacerlo 3 semanas seguidas y perderlo por un mes"
  },
  {
    "id": "1.4.3.1",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "Suelo mantener mis opciones abiertas en caso de que algo mejor surja"
  },
  {
    "id": "1.4.3.2",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "No disfruto de trabajar duro por largas horas"
  },
  {
    "id": "1.4.3.3",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "Creo que las cosas deberían tener propósito y función"
  },
  {
    "id": "1.4.3.4",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "Soy optimista"
  },
  {
    "id": "1.4.3.5",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "Vivo el momento presente"
  },
  {
    "id": "1.4.3.6",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "Normalmente sólo recurro a la oración cuando me encuentro en una necesidad espiritual"
  },
  {
    "id": "1.4.3.7",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "No tengo un set de valores y moral particular por el cuál vivo"
  },
  {
    "id": "1.4.3.8",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "Hago lo que quiero cuando quiero"
  },
  {
    "id": "1.4.3.9",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "No me preocupo de ser perfecto, sólo vivo la vida"
  },
  {
    "id": "1.4.3.10",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "Ahorrar es para tontos"
  },
  {
    "id": "1.4.4.1",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Vivo la vida en el momento inmediato"
  },
  {
    "id": "1.4.4.2",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Disfurto de entretener a las personas en público"
  },
  {
    "id": "1.4.4.3",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Tiendo a guardar datos de manera no organizada"
  },
  {
    "id": "1.4.4.4",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Soy muy flexible"
  },
  {
    "id": "1.4.4.5",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Soy excelente negociando"
  },
  {
    "id": "1.4.4.6",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Frecuentemente sólo me gusta beber, comer y ser feliz"
  },
  {
    "id": "1.4.4.7",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Soy dramático"
  },
  {
    "id": "1.4.4.8",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Soy artístico"
  },
  {
    "id": "1.4.4.9",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Soy bueno creando cosas con las manos"
  },
  {
    "id": "1.4.4.10",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Hablando de deportes, me gustan los riesgos"
  },
  {
    "id": "1.4.4.11",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Creo en las leyes de la física"
  },
  {
    "id": "1.4.4.12",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Fácilmente puedo tomar ventaja de las otras personas"
  },
  {
    "id": "1.4.4.13",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Llego a ser cínico de las filosofías de otras personas"
  },
  {
    "id": "1.4.4.14",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Me gusta divertirme"
  },
  {
    "id": "1.4.4.15",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Las de terror son mis películas favoritas"
  },
  {
    "id": "1.4.4.16",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Me fascinan las armas"
  },
  {
    "id": "1.4.4.17",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Rara vez me apego a un plan o agenda"
  },
  {
    "id": "1.4.4.18",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Tengo problemas manteniéndome fiel"
  },
  {
    "id": "1.4.4.19",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Me resulta fácil terminar una relación y seguir adelante con mi vida"
  },
  {
    "id": "1.4.4.20",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "No presto mucha atención a mis gastos "
  },
  {
    "id": "1.4.4.21",
    "part": "dominance",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Tengo varias relaciones frívolas (ligeras)"
  },
  {
    "id": "2.1.1.1",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Me cuenta poner atención y concentrarme"
  },
  {
    "id": "2.1.1.2",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Necesito cafeína para despertar"
  },
  {
    "id": "2.1.1.3",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "No puedo pensar lo suficientemente rápido"
  },
  {
    "id": "2.1.1.4",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "No logro sostener mi atención por periodos prolongados"
  },
  {
    "id": "2.1.1.5",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Me cuesta trabajo llevar a cabo una tarea aun cuando es algo que normalmente me interesa"
  },
  {
    "id": "2.1.1.6",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "memory",
    "text": "Me encuentro siendo lento aprendiendo nuevas ideas"
  },
  {
    "id": "2.1.2.1",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Tengo antojos de azúcar"
  },
  {
    "id": "2.1.2.2",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Tengo bajo líbido"
  },
  {
    "id": "2.1.2.3",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Duermo mucho"
  },
  {
    "id": "2.1.2.4",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Tengo una historia de alcoholismo o adicción"
  },
  {
    "id": "2.1.2.5",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Recientemente me he sentido cansado y gastado sin razón aparente"
  },
  {
    "id": "2.1.2.6",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "A veces siento cansancio extremo sin haber hecho mucho durante el día"
  },
  {
    "id": "2.1.2.7",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Durante la vida he luchado con el control de mi peso"
  },
  {
    "id": "2.1.2.8",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Tengo poca motivación para vivir experiencias sexuales"
  },
  {
    "id": "2.1.2.9",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "Me cuesta un poco de trabajo salir de la cama por las mañanas"
  },
  {
    "id": "2.1.2.10",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "physical",
    "text": "He tenido algún \"antojo\" por cocaína, anfetaminas o éxtasis"
  },
  {
    "id": "2.1.3.1",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "character",
    "text": "Siento que he perdido habilidad de razonamiento"
  },
  {
    "id": "2.1.3.2",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "character",
    "text": "No logro tomar buenas decisiones"
  },
  {
    "id": "2.1.4.3",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Me siento bien siguiendo a los demás"
  },
  {
    "id": "2.1.4.4",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Las personas suelen tomar ventaja de mí"
  },
  {
    "id": "2.1.4.5",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Me estoy sintiendo bajoneado o deprimido"
  },
  {
    "id": "2.1.4.6",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Las personas me han dicho que me he ablandado"
  },
  {
    "id": "2.1.4.7",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "No tengo tanto sentido de urgencia"
  },
  {
    "id": "2.1.4.8",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Permito que las personas me critiquen"
  },
  {
    "id": "2.1.4.9",
    "part": "deficiency",
    "neurotransmitter": "dopamine",
    "category": "personality",
    "text": "Normalmente busco a los demás para que me guíen"
  },
  {
    "id": "2.2.1.1",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Me falta imaginación"
  },
  {
    "id": "2.2.1.2",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Cuando conozco a alguien nuevo, me resulta difícil recordar su nombre"
  },
  {
    "id": "2.2.1.3",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "He notado que mi memoria no es la de antes"
  },
  {
    "id": "2.2.1.4",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "Mi pareja me dice que no soy tan romántico como antes"
  },
  {
    "id": "2.2.1.5",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "No puedo recordar el cumpleaños de mis amigos"
  },
  {
    "id": "2.2.1.6",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "memory",
    "text": "He perdido habilidades creativas"
  },
  {
    "id": "2.2.2.1",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Sufro de insomnio"
  },
  {
    "id": "2.2.2.2",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "He perdido tono muscular"
  },
  {
    "id": "2.2.2.3",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Ya no hago ejercicio como antes"
  },
  {
    "id": "2.2.2.4",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Tengo antojos de comida grasosa"
  },
  {
    "id": "2.2.2.5",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "He experimentado con alucinógenos u otras drogas ilegales"
  },
  {
    "id": "2.2.2.6",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Siento que mi cuerpo se cae a pedasos"
  },
  {
    "id": "2.2.2.7",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "physical",
    "text": "Siento que respirar me cuesta un poco de trabajo"
  },
  {
    "id": "2.2.3.1",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "No me importan las historias de otras personas, sólo la mía"
  },
  {
    "id": "2.2.3.2",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "No me preocupan los sentimientos de los demás"
  },
  {
    "id": "2.2.3.3",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "character",
    "text": "No me siento alguien afortunado"
  },
  {
    "id": "2.2.4.1",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "No me siento alegre seguido"
  },
  {
    "id": "2.2.4.2",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Desespero con facilidad"
  },
  {
    "id": "2.2.4.3",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Suelo protegerme a mi mismo siendo hermético con mis sentimientos. No comparto mucho de mí"
  },
  {
    "id": "2.2.4.4",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Me siento más cómodo trabajando sólo que en equipo"
  },
  {
    "id": "2.2.4.5",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Las personas se llegan a enojar conmigo por molestarlos (ser bully)"
  },
  {
    "id": "2.2.4.6",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Suelo ceder fácilmente o ser sumiso"
  },
  {
    "id": "2.2.4.7",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Rara vez siento compación por algo"
  },
  {
    "id": "2.2.4.8",
    "part": "deficiency",
    "neurotransmitter": "acetylcholine",
    "category": "personality",
    "text": "Me gusta la rutina"
  },
  {
    "id": "2.3.1.1",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Me resulta difícil consentrarme por que me encuentro nervioso o inquieto"
  },
  {
    "id": "2.3.1.2",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Me cuesta trabajo recordar números telefónicos"
  },
  {
    "id": "2.3.1.3",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Me cuesta encontrar las palabras cuando hablo"
  },
  {
    "id": "2.3.1.4",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Cuando estoy bajo estrés me cuesta trabajo recordar cosas"
  },
  {
    "id": "2.3.1.5",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Sé que soy inteligente pero me cuesta demostrarlo"
  },
  {
    "id": "2.3.1.6",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Mi habilidad de consentración va y viene"
  },
  {
    "id": "2.3.1.7",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Cuando leo a veces tengo que re leer el mismo párrafo un par de veces para quedarme con la idea"
  },
  {
    "id": "2.3.1.8",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "memory",
    "text": "Pienso rápido pero me cuesta comunicar lo que pienso"
  },
  {
    "id": "2.3.2.1",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Me siento inquieto a veces"
  },
  {
    "id": "2.3.2.2",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "A veces me noto tembloroso"
  },
  {
    "id": "2.3.2.3",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Tengo frecuentes dolores de cabeza y/o de cuello y espalda"
  },
  {
    "id": "2.3.2.4",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "A veces me quedo sin aire por cosas sencillas"
  },
  {
    "id": "2.3.2.5",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "A veces siento palpitaciones "
  },
  {
    "id": "2.3.2.6",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Tiendo a tener manos frías"
  },
  {
    "id": "2.3.2.7",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "A veces sudo mucho"
  },
  {
    "id": "2.3.2.8",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "A veces me mareo"
  },
  {
    "id": "2.3.2.9",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Suelo tener tensión muscular"
  },
  {
    "id": "2.3.2.10",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Tiendo a sentir mariposas en el estómago"
  },
  {
    "id": "2.3.2.11",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Siento antojos por cosas amargas"
  },
  {
    "id": "2.3.2.12",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "A menudo me siento nervioso"
  },
  {
    "id": "2.3.2.13",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Amo el Yoga porque me ayuda a relajarme"
  },
  {
    "id": "2.3.2.14",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "A veces me siento fatigado aunque haya dormido bien"
  },
  {
    "id": "2.3.2.15",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "physical",
    "text": "Suelo comer de más"
  },
  {
    "id": "2.3.3.16",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Ya no soy alguien que siga las reglas"
  },
  {
    "id": "2.3.3.1",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "He perdido amigos"
  },
  {
    "id": "2.3.3.2",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Me cuesta trabajo mantener relaciones amorosas"
  },
  {
    "id": "2.3.3.3",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Considero la ley como arbitraria y sin sentido"
  },
  {
    "id": "2.3.3.4",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "character",
    "text": "Reglas que antes seguía me parecen ridículas"
  },
  {
    "id": "2.3.4.1",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Tengo cambios de humor frecuentes"
  },
  {
    "id": "2.3.4.2",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Disfruto de hacer varias cosas a la vez pero me cuesta decidir cual hacer primero"
  },
  {
    "id": "2.3.4.3",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Suelo hacer cosas por el simple hecho de creer que será divertido"
  },
  {
    "id": "2.3.4.4",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Cuando la situación se torna aburrida o apática, suelo introducir algo de emoción"
  },
  {
    "id": "2.3.4.5",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Suelo ser inconstante, cambio de humor y de decisión constantemente"
  },
  {
    "id": "2.3.4.6",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Tiendo a sentirme demaciado emocionado respecto a cosas simples"
  },
  {
    "id": "2.3.4.7",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Mis impulsos suelen meterme en problemas"
  },
  {
    "id": "2.3.4.8",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Tiendo a ser melodramático y atraer la atención de los demás"
  },
  {
    "id": "2.3.4.9",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Digo lo que pienso sin importar cual será la reacción de los demás"
  },
  {
    "id": "2.3.4.10",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "A veces tengo arranques de ira que posteriormente me generan estados de culpa"
  },
  {
    "id": "2.3.4.11",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "A menudo digo mentiras para deshacerme de problemas"
  },
  {
    "id": "2.3.4.12",
    "part": "deficiency",
    "neurotransmitter": "gaba",
    "category": "personality",
    "text": "Regularmente tengo menos interes en el sexo de otras personas"
  },
  {
    "id": "2.4.1.1",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "No soy muy perseptivo"
  },
  {
    "id": "2.4.1.2",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "Me cuesta recordad cosas que he visto en el pasado"
  },
  {
    "id": "2.4.1.3",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "Mis reacciones no suelen ser muy rápidas"
  },
  {
    "id": "2.4.1.4",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "memory",
    "text": "Tengo mal sentido de la orientación"
  },
  {
    "id": "2.4.2.1",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Sudo por las noches"
  },
  {
    "id": "2.4.2.2",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Sufro de insomnio"
  },
  {
    "id": "2.4.2.3",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Suelo cambiar de posición varias veces durante la noche para sentirme cómodo"
  },
  {
    "id": "2.4.2.4",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Siempre me despierto muy temprano por la mañana"
  },
  {
    "id": "2.4.2.5",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Me cuesta trabajo relajarme"
  },
  {
    "id": "2.4.2.6",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Me despierto al menos 2 veces por la noche"
  },
  {
    "id": "2.4.2.7",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Si me despierto, me cuesta mucho trabajo volver a dormir"
  },
  {
    "id": "2.4.2.8",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Tengo antojos por cosas saladas"
  },
  {
    "id": "2.4.2.9",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Siento bajos niveles de energía para ejercitarme"
  },
  {
    "id": "2.4.2.10",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "physical",
    "text": "Me siento triste"
  },
  {
    "id": "2.4.3.1",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "No puedo dejar de cuestionarme el significado de la vida"
  },
  {
    "id": "2.4.3.2",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "Ya no me siento motivado a tomar riesgos"
  },
  {
    "id": "2.4.3.3",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "character",
    "text": "La falta de significado en mi vida me resulta doloroso o incómodo"
  },
  {
    "id": "2.4.4.1",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Sufro de ansiedad"
  },
  {
    "id": "2.4.4.2",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Me irrito con facilidad"
  },
  {
    "id": "2.4.4.3",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Tengo pensamientos de autosabotaje o dañinos para mí"
  },
  {
    "id": "2.4.4.4",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "He tenido pensamientos suicidas"
  },
  {
    "id": "2.4.4.5",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Tiendo a sobre pensar algunas ideas (rumear)"
  },
  {
    "id": "2.4.4.6",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Suelo ser tan estructurado que resulto inflexible"
  },
  {
    "id": "2.4.4.7",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "Mi imaginación suele ser tan poderosa que me pierdo en ella por un rato"
  },
  {
    "id": "2.4.4.8",
    "part": "deficiency",
    "neurotransmitter": "serotonin",
    "category": "personality",
    "text": "El miedo me paraliza"
  }
];

// Total: 313 preguntas
// Parte 1 Dominancia: 199
// Parte 2 Deficiencias: 114