/**
 * Tour guiado por la orbe — el guion (MB-20 Pieza 4).
 *
 * 12 pasos, uno por concepto, sobre las pantallas REALES (no un carrusel).
 * Es el copy más leído de toda la app: frases de una o dos líneas, del cuerpo
 * y de la experiencia, cero jerga. Toda sigla se explica la primera vez.
 * Sin promesas médicas. Datos puros: testeable en el harness node.
 */

export interface OrbTourStep {
  id: string;
  /** Ruta del tab donde vive el paso (el tour navega al entrar). */
  route: string;
  kicker: string;
  copy: string;
}

export const ORB_TOUR_STEPS: readonly OrbTourStep[] = [
  {
    id: 'tareas',
    route: '/',
    kicker: 'TU DÍA',
    copy: 'Esto es tu día. Todo lo que te toca, en una sola lista.',
  },
  {
    // MB-20.4: el gesto se invirtió — este paso enseña (y hace probar) el NUEVO.
    id: 'gestos',
    route: '/',
    kicker: 'LOS DOS GESTOS',
    copy: 'Tocar una fila la palomea. Mantener presionado te lleva a su función. Pruébalo aquí mismo.',
  },
  {
    id: 'inline',
    route: '/',
    kicker: 'SIN SALIR',
    copy: 'Lo simple se captura aquí mismo: el agua suma 250 ml con un toque.',
  },
  {
    id: 'orbe-card',
    route: '/',
    kicker: 'MI REPORTE',
    copy: 'En esta card te digo lo que veo cada mañana. Se colapsa, no se pierde.',
  },
  {
    id: 'agenda',
    route: '/',
    kicker: 'LA OTRA LENTE',
    copy: 'Agenda es la misma lista con horarios. Nada se captura dos veces.',
  },
  {
    id: 'sala',
    route: '/kit',
    kicker: 'TUS HERRAMIENTAS',
    copy: 'Todas tus funciones viven aquí. Búscalas o acomódalas como quieras.',
  },
  {
    id: 'instalar',
    route: '/kit',
    kicker: 'INSTALAR = ACTIVAR',
    copy: 'Instalar activa el hábito: muchas apps suman su fila a tu día y otras registran dentro de la propia app. Desinstalar nunca borra tu historia.',
  },
  {
    id: 'salud',
    route: '/salud',
    kicker: 'SALUD',
    copy: 'Cuatro puertas: cómo vienes hoy, tus datos, tu evolución y tu expediente.',
  },
  {
    id: 'edad-atp',
    route: '/salud',
    kicker: 'EDAD ATP',
    copy: 'La Edad ATP es una ventana educativa a tu estado interno. No es un diagnóstico.',
  },
  {
    id: 'electrones',
    route: '/',
    kicker: 'ELECTRONES Y PROTONES',
    copy: 'Cada hábito cumplido carga electrones (e-), la energía de tu día. Los protones (H+) llegan con la constancia y desbloquean extras.',
  },
  {
    id: 'tribu',
    route: '/tribu',
    kicker: 'TRIBU',
    copy: 'Tu gente entrena contigo: presencia, apoyo y retos compartidos.',
  },
  {
    id: 'orbe',
    route: '/',
    kicker: 'SOY ARGOS',
    copy: 'Tócame cuando quieras. Si cambio de color, tengo algo que decirte.',
  },
];

/** Llave nueva a propósito: el tour de la orbe también es para quien ya vio
 * el carrusel viejo — esta arquitectura nadie la conoce. */
export const ORB_TOUR_DONE_KEY = '@atp/tour_v2_completed';

/** Evento para relanzar el tour desde Ajustes. */
export const ORB_TOUR_RESTART_EVENT = 'orb_tour_restart';
