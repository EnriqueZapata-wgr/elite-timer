/**
 * Biblioteca de emociones — Modelo RULER de Yale (4 cuadrantes, ~144 emociones).
 * Lenguaje inclusivo: sustantivos neutros, frases sin género, @ solo como último recurso.
 * Cada emoción tiene descripción cálida en segunda persona.
 */
import { SEMANTIC, CATEGORY_COLORS } from '../constants/brand';

export type QuadrantKey = 'high_pleasant' | 'high_unpleasant' | 'low_pleasant' | 'low_unpleasant';

export interface Emotion {
  id: string;
  label: string;
  description: string;
  quadrant: QuadrantKey;
  /** Nivel de energía 1-10 (10 = máxima energía) */
  energy: number;
  /** Nivel de intensidad 1-10 (10 = emoción más extrema del cuadrante) */
  intensity: number;
}

export const QUADRANTS = {
  high_pleasant: {
    key: 'high_pleasant' as QuadrantKey,
    label: 'Alta energía · Agradable',
    color: SEMANTIC.acceptable,
    colorLight: 'rgba(239, 213, 79, 0.15)',
    description: 'Con motivación, emoción, vitalidad',
    examples: ['Con motivación', 'Con emoción', 'Feliz', 'Con inspiración'],
  },
  high_unpleasant: {
    key: 'high_unpleasant' as QuadrantKey,
    label: 'Alta energía · Desagradable',
    color: SEMANTIC.error,
    colorLight: 'rgba(226, 75, 74, 0.15)',
    description: 'Con ansiedad, frustración, enojo',
    examples: ['Con ansiedad', 'Con frustración', 'Con estrés', 'Con enojo'],
  },
  low_pleasant: {
    key: 'low_pleasant' as QuadrantKey,
    label: 'Baja energía · Agradable',
    color: '#5DCAA5',
    colorLight: 'rgba(93, 202, 165, 0.15)',
    description: 'En calma, en paz, con relajación',
    examples: ['En calma', 'En paz', 'Con relajación', 'Content@'],
  },
  low_unpleasant: {
    key: 'low_unpleasant' as QuadrantKey,
    label: 'Baja energía · Desagradable',
    color: CATEGORY_COLORS.nutrition,
    colorLight: 'rgba(91, 155, 213, 0.15)',
    description: 'Triste, con cansancio, sin motivación',
    examples: ['Triste', 'Con cansancio', 'Sin motivación', 'En soledad'],
  },
} as const;

export const EMOTIONS: Emotion[] = [
  // ══════ HIGH PLEASANT (amarillo) — energy 5-10, intensity 1-10 ══════
  { id: 'ecstatic', label: 'En éxtasis', description: 'Sientes una alegría tan grande que es difícil contenerla. Todo brilla.', quadrant: 'high_pleasant', energy: 10, intensity: 10 },
  { id: 'euphoric', label: 'Con euforia', description: 'Una felicidad intensa y desbordante te recorre todo el cuerpo.', quadrant: 'high_pleasant', energy: 10, intensity: 9 },
  { id: 'thrilled', label: 'Con emoción', description: 'Algo bueno está pasando o está por pasar y no puedes esperar.', quadrant: 'high_pleasant', energy: 9, intensity: 8 },
  { id: 'excited', label: 'Con entusiasmo', description: 'Tienes ganas de actuar, de crear, de hacer que las cosas pasen.', quadrant: 'high_pleasant', energy: 9, intensity: 7 },
  { id: 'energized', label: 'Con energía', description: 'Tu cuerpo y tu mente están en modo activo, con disposición para lo que venga.', quadrant: 'high_pleasant', energy: 9, intensity: 6 },
  { id: 'inspired', label: 'Con inspiración', description: 'Una idea o una experiencia encendió algo dentro de ti.', quadrant: 'high_pleasant', energy: 8, intensity: 7 },
  { id: 'motivated', label: 'Con motivación', description: 'Sabes lo que quieres y tienes las ganas para ir por ello.', quadrant: 'high_pleasant', energy: 8, intensity: 6 },
  { id: 'determined', label: 'Con determinación', description: 'Nada te va a detener. Tu propósito es claro.', quadrant: 'high_pleasant', energy: 9, intensity: 8 },
  { id: 'passionate', label: 'Con pasión', description: 'Lo que haces o sientes tiene una intensidad que te mueve profundamente.', quadrant: 'high_pleasant', energy: 9, intensity: 9 },
  { id: 'confident', label: 'Con seguridad', description: 'Confías en ti y en tus decisiones. Sabes que puedes.', quadrant: 'high_pleasant', energy: 7, intensity: 6 },
  { id: 'empowered', label: 'Con poder propio', description: 'Sientes que tienes el control de tu vida y tus circunstancias.', quadrant: 'high_pleasant', energy: 8, intensity: 8 },
  { id: 'proud', label: 'Con orgullo', description: 'Algo que hiciste o lograste merece ser reconocido. Y lo sabes.', quadrant: 'high_pleasant', energy: 7, intensity: 7 },
  { id: 'accomplished', label: 'Con logro', description: 'Completaste algo importante y sientes la satisfacción de haberlo hecho.', quadrant: 'high_pleasant', energy: 7, intensity: 7 },
  { id: 'hopeful', label: 'Con esperanza', description: 'Ves un futuro mejor y crees que es posible alcanzarlo.', quadrant: 'high_pleasant', energy: 6, intensity: 5 },
  { id: 'optimistic', label: 'Optimista', description: 'Esperas que las cosas salgan bien, y tienes razones para creerlo.', quadrant: 'high_pleasant', energy: 6, intensity: 5 },
  { id: 'grateful', label: 'Con gratitud', description: 'Reconoces lo bueno en tu vida y lo valoras profundamente.', quadrant: 'high_pleasant', energy: 5, intensity: 6 },
  { id: 'joyful', label: 'Alegre', description: 'Una ligereza te acompaña. El día se siente bueno.', quadrant: 'high_pleasant', energy: 7, intensity: 5 },
  { id: 'happy', label: 'Feliz', description: 'Estás bien. Simple y genuinamente bien.', quadrant: 'high_pleasant', energy: 6, intensity: 6 },
  { id: 'amused', label: 'Con diversión', description: 'Algo te causó gracia o te sacó una sonrisa.', quadrant: 'high_pleasant', energy: 6, intensity: 4 },
  { id: 'playful', label: 'Con ganas de jugar', description: 'Tienes ganas de reír, de jugar, de no tomarte todo tan en serio.', quadrant: 'high_pleasant', energy: 7, intensity: 4 },
  { id: 'creative', label: 'Con creatividad', description: 'Las ideas fluyen. Ves posibilidades donde antes no las veías.', quadrant: 'high_pleasant', energy: 7, intensity: 5 },
  { id: 'curious', label: 'Con curiosidad', description: 'Algo capturó tu atención y quieres saber más.', quadrant: 'high_pleasant', energy: 6, intensity: 3 },
  { id: 'amazed', label: 'Con asombro', description: 'Algo te sorprendió de una forma hermosa o inesperada.', quadrant: 'high_pleasant', energy: 8, intensity: 7 },
  { id: 'fascinated', label: 'Con fascinación', description: 'Tu atención está completamente en algo que te parece increíble.', quadrant: 'high_pleasant', energy: 7, intensity: 6 },
  { id: 'focused', label: 'Con enfoque', description: 'Tu atención está en un solo punto. El ruido desapareció.', quadrant: 'high_pleasant', energy: 6, intensity: 3 },
  { id: 'alive', label: 'Con vitalidad', description: 'Sientes cada parte de tu cuerpo. Estás completamente aquí.', quadrant: 'high_pleasant', energy: 9, intensity: 8 },
  { id: 'brave', label: 'Valiente', description: 'Tienes miedo pero vas a hacerlo de todas formas.', quadrant: 'high_pleasant', energy: 8, intensity: 7 },
  { id: 'free', label: 'Libre', description: 'Sin ataduras, sin peso. El mundo está abierto.', quadrant: 'high_pleasant', energy: 7, intensity: 6 },
  { id: 'connected', label: 'Con conexión', description: 'Sientes un vínculo profundo con alguien o con algo más grande que tú.', quadrant: 'high_pleasant', energy: 5, intensity: 5 },
  { id: 'loved', label: 'Sintiendo amor', description: 'Sabes que alguien te quiere y lo sientes en el cuerpo.', quadrant: 'high_pleasant', energy: 5, intensity: 7 },
  { id: 'loving', label: 'Con amor', description: 'Sientes cariño y ternura hacia alguien o hacia la vida.', quadrant: 'high_pleasant', energy: 5, intensity: 6 },
  { id: 'cheerful', label: 'Con ánimo', description: 'Tu ánimo está arriba. Las cosas pintan bien.', quadrant: 'high_pleasant', energy: 7, intensity: 4 },
  { id: 'radiant', label: 'Radiante', description: 'Tu energía es contagiosa. La gente lo nota.', quadrant: 'high_pleasant', energy: 9, intensity: 8 },
  { id: 'surprised_pos', label: 'Con grata sorpresa', description: 'Algo inesperado resultó ser mejor de lo que imaginabas.', quadrant: 'high_pleasant', energy: 8, intensity: 6 },
  { id: 'invigorated', label: 'Con vigor', description: 'Tu cuerpo se siente fuerte y capaz. En modo acción.', quadrant: 'high_pleasant', energy: 10, intensity: 7 },
  { id: 'triumphant', label: 'Triunfante', description: 'Ganaste una batalla. Grande o pequeña, la ganaste.', quadrant: 'high_pleasant', energy: 9, intensity: 9 },

  // ══════ HIGH UNPLEASANT (rojo) — energy 5-10, intensity 1-10 ══════
  { id: 'enraged', label: 'Con furia', description: 'La ira es intensa. Te cuesta contenerte.', quadrant: 'high_unpleasant', energy: 10, intensity: 10 },
  { id: 'angry', label: 'Con enojo', description: 'Algo no es justo o alguien cruzó un límite. Quieres reaccionar.', quadrant: 'high_unpleasant', energy: 9, intensity: 8 },
  { id: 'frustrated', label: 'Con frustración', description: 'Lo intentaste y no funcionó. El obstáculo se siente injusto.', quadrant: 'high_unpleasant', energy: 8, intensity: 7 },
  { id: 'irritated', label: 'Con irritación', description: 'Pequeñas cosas te molestan más de lo normal.', quadrant: 'high_unpleasant', energy: 6, intensity: 4 },
  { id: 'annoyed', label: 'Con fastidio', description: 'Algo o alguien te está sacando de tu centro.', quadrant: 'high_unpleasant', energy: 6, intensity: 3 },
  { id: 'anxious', label: 'Con ansiedad', description: 'Tu mente anticipa peligro o problemas que aún no pasan.', quadrant: 'high_unpleasant', energy: 8, intensity: 7 },
  { id: 'panicked', label: 'En pánico', description: 'Todo se siente urgente y fuera de control al mismo tiempo.', quadrant: 'high_unpleasant', energy: 10, intensity: 10 },
  { id: 'stressed', label: 'Con estrés', description: 'Hay más demandas que recursos. Te sientes sin espacio.', quadrant: 'high_unpleasant', energy: 7, intensity: 6 },
  { id: 'overwhelmed', label: 'Con agobio', description: 'Son demasiadas cosas al mismo tiempo. No sabes por dónde empezar.', quadrant: 'high_unpleasant', energy: 8, intensity: 8 },
  { id: 'nervous', label: 'Con nervios', description: 'Algo está por pasar y no sabes cómo va a salir.', quadrant: 'high_unpleasant', energy: 7, intensity: 5 },
  { id: 'worried', label: 'Con preocupación', description: 'Tu mente repite escenarios negativos una y otra vez.', quadrant: 'high_unpleasant', energy: 6, intensity: 5 },
  { id: 'afraid', label: 'Con miedo', description: 'Algo te amenaza, real o imaginario. Tu cuerpo reacciona.', quadrant: 'high_unpleasant', energy: 8, intensity: 7 },
  { id: 'terrified', label: 'Con terror', description: 'El miedo es paralizante. Todo parece peligroso.', quadrant: 'high_unpleasant', energy: 9, intensity: 9 },
  { id: 'tense', label: 'Con tensión', description: 'Tu cuerpo está rígido. Los hombros arriba. La mandíbula apretada.', quadrant: 'high_unpleasant', energy: 7, intensity: 5 },
  { id: 'restless', label: 'Con inquietud', description: 'No puedes estar en un solo lugar. Tu cuerpo quiere moverse pero tu mente no sabe a dónde.', quadrant: 'high_unpleasant', energy: 7, intensity: 4 },
  { id: 'agitated', label: 'Con agitación', description: 'Sientes una incomodidad interna que no puedes ubicar.', quadrant: 'high_unpleasant', energy: 8, intensity: 6 },
  { id: 'impatient', label: 'Impaciente', description: 'Quieres que las cosas pasen ya. La espera te desgasta.', quadrant: 'high_unpleasant', energy: 7, intensity: 4 },
  { id: 'resentful', label: 'Con resentimiento', description: 'Guardas algo contra alguien. No lo has soltado.', quadrant: 'high_unpleasant', energy: 6, intensity: 6 },
  { id: 'jealous', label: 'Con celos', description: 'Alguien tiene lo que quieres y eso te incomoda.', quadrant: 'high_unpleasant', energy: 6, intensity: 5 },
  { id: 'envious', label: 'Con envidia', description: 'Comparas tu vida con la de otras personas y sales perdiendo.', quadrant: 'high_unpleasant', energy: 5, intensity: 5 },
  { id: 'guilty', label: 'Culpable', description: 'Hiciste algo que va contra tus valores y te pesa.', quadrant: 'high_unpleasant', energy: 5, intensity: 6 },
  { id: 'ashamed', label: 'Con vergüenza', description: 'Quisieras esconderte. Sientes que fallaste.', quadrant: 'high_unpleasant', energy: 6, intensity: 7 },
  { id: 'humiliated', label: 'Con humillación', description: 'Te expusieron o te redujeron frente a otras personas.', quadrant: 'high_unpleasant', energy: 7, intensity: 9 },
  { id: 'defensive', label: 'A la defensiva', description: 'Te sientes bajo ataque y levantas muros para protegerte.', quadrant: 'high_unpleasant', energy: 7, intensity: 6 },
  { id: 'hostile', label: 'Hostil', description: 'No confías en nadie ahora. Todo se siente amenazante.', quadrant: 'high_unpleasant', energy: 8, intensity: 8 },
  { id: 'bitter', label: 'Con amargura', description: 'La vida no fue justa y el sabor de eso no se va.', quadrant: 'high_unpleasant', energy: 5, intensity: 7 },
  { id: 'disgusted', label: 'Con asco', description: 'Algo te repugna moral o físicamente.', quadrant: 'high_unpleasant', energy: 7, intensity: 8 },
  { id: 'shocked', label: 'En shock', description: 'Algo pasó tan rápido que tu mente aún no lo procesa.', quadrant: 'high_unpleasant', energy: 9, intensity: 8 },
  { id: 'pressured', label: 'Con presión', description: 'Hay expectativas sobre ti que no pediste cargar.', quadrant: 'high_unpleasant', energy: 7, intensity: 5 },
  { id: 'trapped', label: 'Sin salida', description: 'No ves opciones. Las puertas se sienten cerradas.', quadrant: 'high_unpleasant', energy: 6, intensity: 8 },
  { id: 'conflicted', label: 'En conflicto', description: 'Dos partes de ti quieren cosas diferentes y no hay paz.', quadrant: 'high_unpleasant', energy: 6, intensity: 5 },
  { id: 'insecure', label: 'Con inseguridad', description: 'Dudas de ti. No sabes si eres suficiente.', quadrant: 'high_unpleasant', energy: 5, intensity: 4 },
  { id: 'out_of_control', label: 'Fuera de control', description: 'Las cosas se mueven sin tu permiso. No tienes el volante.', quadrant: 'high_unpleasant', energy: 9, intensity: 9 },
  { id: 'desperate', label: 'Con desesperación', description: 'Necesitas una solución ahora y no la encuentras.', quadrant: 'high_unpleasant', energy: 9, intensity: 9 },
  { id: 'exasperated', label: 'Con exasperación', description: 'Ya intentaste todo y nada funciona. Tu paciencia se agotó.', quadrant: 'high_unpleasant', energy: 8, intensity: 7 },
  { id: 'hyper', label: 'Con exceso de energía', description: 'Tu energía está descontrolada. Tu mente salta de un tema a otro.', quadrant: 'high_unpleasant', energy: 10, intensity: 5 },

  // ══════ LOW PLEASANT (verde) — energy 1-5, intensity 1-10 ══════
  { id: 'calm', label: 'En calma', description: 'Todo está en orden. No hay urgencia. Solo paz.', quadrant: 'low_pleasant', energy: 4, intensity: 5 },
  { id: 'relaxed', label: 'Relajad@', description: 'Tu cuerpo está suelto. Tu mente también.', quadrant: 'low_pleasant', energy: 3, intensity: 5 },
  { id: 'peaceful', label: 'En paz', description: 'Nada te perturba. Aceptas el momento como es.', quadrant: 'low_pleasant', energy: 3, intensity: 7 },
  { id: 'serene', label: 'Con serenidad', description: 'Una calma profunda que viene de adentro. Todo va a estar bien.', quadrant: 'low_pleasant', energy: 2, intensity: 8 },
  { id: 'content', label: 'Content@', description: 'No necesitas más. Lo que tienes es suficiente.', quadrant: 'low_pleasant', energy: 4, intensity: 6 },
  { id: 'satisfied', label: 'Con satisfacción', description: 'Hiciste lo que tenías que hacer y fue suficiente.', quadrant: 'low_pleasant', energy: 4, intensity: 6 },
  { id: 'fulfilled', label: 'Con plenitud', description: 'Tu vida tiene sentido. Las piezas encajan.', quadrant: 'low_pleasant', energy: 3, intensity: 9 },
  { id: 'comfortable', label: 'Cómod@', description: 'Estás a gusto. No cambiarías nada de este momento.', quadrant: 'low_pleasant', energy: 3, intensity: 5 },
  { id: 'cozy', label: 'En confort', description: 'Te sientes con seguridad y arropamiento. Como en casa.', quadrant: 'low_pleasant', energy: 2, intensity: 6 },
  { id: 'safe', label: 'Con seguridad', description: 'No hay amenaza. Puedes bajar la guardia.', quadrant: 'low_pleasant', energy: 3, intensity: 5 },
  { id: 'balanced', label: 'En equilibrio', description: 'Ni mucho ni poco. Justo donde necesitas estar.', quadrant: 'low_pleasant', energy: 4, intensity: 4 },
  { id: 'centered', label: 'En tu centro', description: 'Sabes quién eres y qué quieres. No hay confusión.', quadrant: 'low_pleasant', energy: 4, intensity: 5 },
  { id: 'grounded', label: 'Con los pies en la tierra', description: 'En conexión con tu cuerpo y con el presente.', quadrant: 'low_pleasant', energy: 3, intensity: 5 },
  { id: 'present', label: 'Presente', description: 'No estás en el pasado ni en el futuro. Estás aquí.', quadrant: 'low_pleasant', energy: 4, intensity: 4 },
  { id: 'mindful', label: 'Consciente', description: 'Observas tus pensamientos y sensaciones sin reaccionar.', quadrant: 'low_pleasant', energy: 4, intensity: 4 },
  { id: 'reflective', label: 'En reflexión', description: 'Piensas con calma sobre tu vida y tus decisiones.', quadrant: 'low_pleasant', energy: 3, intensity: 3 },
  { id: 'contemplative', label: 'En contemplación', description: 'Te detienes a observar la vida sin necesidad de actuar.', quadrant: 'low_pleasant', energy: 2, intensity: 4 },
  { id: 'thoughtful', label: 'Pensativ@', description: 'Tu mente procesa algo importante, pero sin prisa.', quadrant: 'low_pleasant', energy: 3, intensity: 3 },
  { id: 'accepting', label: 'En aceptación', description: 'Las cosas son como son. Y eso está bien.', quadrant: 'low_pleasant', energy: 2, intensity: 6 },
  { id: 'forgiving', label: 'Perdonando', description: 'Sueltas algo que te pesaba. Ya no necesitas cargarlo.', quadrant: 'low_pleasant', energy: 3, intensity: 6 },
  { id: 'compassionate', label: 'Con compasión', description: 'Sientes el dolor de otra persona y quieres aliviarlo.', quadrant: 'low_pleasant', energy: 4, intensity: 5 },
  { id: 'tender', label: 'Con ternura', description: 'Un cariño suave y delicado por alguien o por la vida.', quadrant: 'low_pleasant', energy: 3, intensity: 6 },
  { id: 'warm', label: 'Con calidez', description: 'Sientes afecto. El corazón está abierto.', quadrant: 'low_pleasant', energy: 4, intensity: 5 },
  { id: 'gentle', label: 'Gentil', description: 'Tratas al mundo y a ti con suavidad.', quadrant: 'low_pleasant', energy: 3, intensity: 4 },
  { id: 'mellow', label: 'Apacible', description: 'Todo fluye suave. Sin sobresaltos.', quadrant: 'low_pleasant', energy: 2, intensity: 4 },
  { id: 'at_ease', label: 'A gusto', description: 'No hay tensión ni preocupación. Solo estar.', quadrant: 'low_pleasant', energy: 3, intensity: 4 },
  { id: 'quiet', label: 'En quietud', description: 'El ruido interno se apagó. Hay silencio adentro.', quadrant: 'low_pleasant', energy: 1, intensity: 5 },
  { id: 'still', label: 'En pausa', description: 'No necesitas moverte ni pensar. Solo existir.', quadrant: 'low_pleasant', energy: 1, intensity: 6 },
  { id: 'blessed', label: 'Con bendición', description: 'Sientes que la vida te dio más de lo esperado.', quadrant: 'low_pleasant', energy: 3, intensity: 7 },
  { id: 'nostalgic_pos', label: 'Con nostalgia', description: 'Recuerdos bonitos te visitan y te hacen sonreír.', quadrant: 'low_pleasant', energy: 2, intensity: 5 },
  { id: 'relieved', label: 'Con alivio', description: 'Una preocupación se fue. Respiras más ligero.', quadrant: 'low_pleasant', energy: 4, intensity: 6 },
  { id: 'trusting', label: 'Con confianza', description: 'Crees en el proceso. Las cosas van a salir bien.', quadrant: 'low_pleasant', energy: 4, intensity: 5 },
  { id: 'patient', label: 'Paciente', description: 'Puedes esperar sin ansiedad. El tiempo está de tu lado.', quadrant: 'low_pleasant', energy: 2, intensity: 3 },
  { id: 'sleepy_good', label: 'Con sueño', description: 'Tu cuerpo pide descanso de la mejor forma posible.', quadrant: 'low_pleasant', energy: 1, intensity: 3 },
  { id: 'lazy_good', label: 'Con pereza (a gusto)', description: 'No quieres hacer nada y está perfectamente bien.', quadrant: 'low_pleasant', energy: 1, intensity: 2 },
  { id: 'restored', label: 'Con energía renovada', description: 'Descansaste lo suficiente. Tu energía se recargó.', quadrant: 'low_pleasant', energy: 5, intensity: 6 },

  // ══════ LOW UNPLEASANT (azul) — energy 1-5, intensity 1-10 ══════
  { id: 'sad', label: 'Triste', description: 'Un peso en el pecho. Algo duele aunque no sepas qué.', quadrant: 'low_unpleasant', energy: 3, intensity: 6 },
  { id: 'depressed', label: 'Con depresión', description: 'Todo se siente gris. Nada parece tener sentido.', quadrant: 'low_unpleasant', energy: 1, intensity: 9 },
  { id: 'hopeless', label: 'Sin esperanza', description: 'No ves cómo las cosas podrían mejorar.', quadrant: 'low_unpleasant', energy: 1, intensity: 10 },
  { id: 'helpless', label: 'Sin defensa', description: 'No puedes cambiar la situación y eso te pesa.', quadrant: 'low_unpleasant', energy: 2, intensity: 8 },
  { id: 'powerless', label: 'Sin poder', description: 'Las decisiones no están en tus manos.', quadrant: 'low_unpleasant', energy: 2, intensity: 8 },
  { id: 'defeated', label: 'Con derrota', description: 'Peleaste y perdiste. No queda energía para intentar de nuevo.', quadrant: 'low_unpleasant', energy: 2, intensity: 8 },
  { id: 'disappointed', label: 'Con decepción', description: 'Esperabas algo mejor y no llegó.', quadrant: 'low_unpleasant', energy: 3, intensity: 5 },
  { id: 'let_down', label: 'Con desilusión', description: 'Alguien no cumplió lo que prometió.', quadrant: 'low_unpleasant', energy: 3, intensity: 6 },
  { id: 'lonely', label: 'En soledad', description: 'Aunque haya gente alrededor, te sientes sin compañía real.', quadrant: 'low_unpleasant', energy: 2, intensity: 7 },
  { id: 'abandoned', label: 'Con abandono', description: 'Alguien se fue y dejó un vacío.', quadrant: 'low_unpleasant', energy: 2, intensity: 9 },
  { id: 'rejected', label: 'Con rechazo', description: 'Te dijeron que no. Y eso duele.', quadrant: 'low_unpleasant', energy: 3, intensity: 7 },
  { id: 'excluded', label: 'Con exclusión', description: 'No fuiste parte. Te dejaron fuera.', quadrant: 'low_unpleasant', energy: 3, intensity: 6 },
  { id: 'misunderstood', label: 'Sin comprensión', description: 'Nadie parece entender lo que sientes o piensas.', quadrant: 'low_unpleasant', energy: 3, intensity: 6 },
  { id: 'invisible', label: 'Invisible', description: 'Nadie te nota. Es como si no estuvieras.', quadrant: 'low_unpleasant', energy: 2, intensity: 7 },
  { id: 'tired', label: 'Con cansancio', description: 'Tu cuerpo pide pausa. No tienes energía para más.', quadrant: 'low_unpleasant', energy: 2, intensity: 4 },
  { id: 'exhausted', label: 'Con agotamiento', description: 'Física y mentalmente sin reservas. No queda nada.', quadrant: 'low_unpleasant', energy: 1, intensity: 7 },
  { id: 'drained', label: 'Sin energía', description: 'Algo o alguien se llevó toda tu energía.', quadrant: 'low_unpleasant', energy: 1, intensity: 6 },
  { id: 'burned_out', label: 'Con burnout', description: 'Diste demasiado por demasiado tiempo. Tu sistema se apagó.', quadrant: 'low_unpleasant', energy: 1, intensity: 8 },
  { id: 'bored', label: 'Sin interés', description: 'Nada te llama la atención. Todo se siente repetitivo.', quadrant: 'low_unpleasant', energy: 3, intensity: 3 },
  { id: 'apathetic', label: 'Con apatía', description: 'No te importa. Ni lo bueno ni lo malo.', quadrant: 'low_unpleasant', energy: 1, intensity: 5 },
  { id: 'unmotivated', label: 'Sin motivación', description: 'Sabes lo que deberías hacer pero no encuentras el por qué.', quadrant: 'low_unpleasant', energy: 2, intensity: 4 },
  { id: 'indifferent', label: 'Indiferente', description: 'Todo te da igual. Nada mueve la aguja.', quadrant: 'low_unpleasant', energy: 2, intensity: 3 },
  { id: 'numb', label: 'Sin sentir', description: 'No sientes nada. Ni bueno ni malo. Solo vacío.', quadrant: 'low_unpleasant', energy: 1, intensity: 7 },
  { id: 'disconnected', label: 'En desconexión', description: 'Estás aquí pero no estás presente. Como en piloto automático.', quadrant: 'low_unpleasant', energy: 2, intensity: 5 },
  { id: 'empty', label: 'Vací@', description: 'Un hueco adentro que no sabes cómo llenar.', quadrant: 'low_unpleasant', energy: 1, intensity: 8 },
  { id: 'lost', label: 'Sin dirección', description: 'No sabes a dónde vas ni por qué. Falta un rumbo.', quadrant: 'low_unpleasant', energy: 2, intensity: 6 },
  { id: 'confused', label: 'Con confusión', description: 'Nada tiene sentido. Las piezas no encajan.', quadrant: 'low_unpleasant', energy: 4, intensity: 4 },
  { id: 'stuck', label: 'Sin avance', description: 'No avanzas. El mismo lugar, el mismo problema.', quadrant: 'low_unpleasant', energy: 2, intensity: 5 },
  { id: 'melancholic', label: 'Con melancolía', description: 'Una tristeza suave por algo que fue y ya no es.', quadrant: 'low_unpleasant', energy: 2, intensity: 5 },
  { id: 'homesick', label: 'Extrañando', description: 'Alguien o algún lugar te hace falta.', quadrant: 'low_unpleasant', energy: 3, intensity: 5 },
  { id: 'regretful', label: 'Con arrepentimiento', description: 'Ojalá hubieras hecho algo diferente.', quadrant: 'low_unpleasant', energy: 3, intensity: 6 },
  { id: 'vulnerable', label: 'Vulnerable', description: 'Te sientes sin protección. Sin armadura.', quadrant: 'low_unpleasant', energy: 3, intensity: 5 },
  { id: 'fragile', label: 'Frágil', description: 'Cualquier cosa podría romperte ahora.', quadrant: 'low_unpleasant', energy: 2, intensity: 6 },
  { id: 'insecure_low', label: 'Con inseguridad', description: 'No confías en que las cosas van a salir bien.', quadrant: 'low_unpleasant', energy: 3, intensity: 4 },
  { id: 'pessimistic', label: 'Pesimista', description: 'Solo ves lo que puede salir mal.', quadrant: 'low_unpleasant', energy: 3, intensity: 4 },
  { id: 'withdrawn', label: 'En repliegue', description: 'Prefieres alejarte del mundo. No quieres interactuar.', quadrant: 'low_unpleasant', energy: 1, intensity: 5 },
];

export const CONTEXT_WHERE = [
  'Casa', 'Trabajo', 'Gym', 'Calle', 'Carro', 'Restaurante',
  'Naturaleza', 'Oficina', 'Escuela', 'Cama', 'Otro',
];

export const CONTEXT_WHO = [
  'Solo', 'Pareja', 'Familia', 'Amigos', 'Compañeros',
  'Coach', 'Desconocidos', 'Mascota', 'Otro',
];

export const CONTEXT_DOING = [
  'Entrenando', 'Trabajando', 'Comiendo', 'Descansando', 'Meditando',
  'Caminando', 'Socializando', 'Estudiando', 'Manejando', 'Despertando',
  'Pre-dormir', 'Otro',
];
