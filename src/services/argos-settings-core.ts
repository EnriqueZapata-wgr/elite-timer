/**
 * ARGOS Configura la app — catálogo y reglas, lógica pura (NOCHE-ARGOS Pieza 3).
 *
 * "Enciende el modo denso de SALUD", "cámbiame a tema claro", "pon en reposo lo
 * de meditar". La tercera pata del ARGOS navegador.
 *
 * LA REGLA QUE ORDENA TODO ESTE ARCHIVO: la lista es blanca, no negra. Un ajuste
 * NO es operable por ARGOS hasta que alguien lo escribe aquí a mano y decide su
 * nivel de riesgo. Una lista negra se queda corta sola: basta con que alguien
 * agregue un toggle nuevo en otro lado para que ARGOS lo pueda tocar sin que
 * nadie lo haya pensado.
 *
 * QUÉ QUEDÓ FUERA A PROPÓSITO (y no es olvido):
 *  - Eliminar cuenta y exportar datos. La primera ya exige contraseña, o sea que
 *    el diseño asume una persona presente; un asistente no pasa ni debe pasar
 *    ese gate. La segunda materializa el expediente completo en un enlace.
 *  - Todo lo que gasta dinero: comprar H+, canjear código, activar boost. Un
 *    protón gastado no se devuelve desde el cliente.
 *  - Los consentimientos. Son legales, quedan en bitácora inmutable y revocar
 *    los del core apaga la app. Que los mueva la persona, no el asistente.
 *  - Desconectar coach o cliente. Es una relación clínica y reconectar exige
 *    código nuevo.
 *  - La ficha de emergencia prelogin: apagarla BORRA la copia local, que es
 *    justo el dato que sirve cuando no hay sesión.
 *  - Silenciar TODAS las notificaciones. El modo maestro manda sobre las de
 *    agenda, y dejar a alguien sin sus avisos por una frase suelta es peor que
 *    no haberle entendido.
 * Todas esas siguen siendo alcanzables NAVEGANDO a su pantalla, que es el
 * camino correcto: ARGOS te lleva, tú decides.
 */

/** Cuánto cuesta equivocarse con este ajuste. */
export type RiesgoAjuste =
  /** Cosmético y reversible en un toque. ARGOS lo aplica y avisa. */
  | 'directo'
  /** Reversible, pero el usuario podría no esperar el efecto. Se confirma. */
  | 'confirmar';

export interface AjusteArgos {
  clave: string;
  /** Cómo lo nombra el usuario. Copy es-MX, sin em dash. */
  etiqueta: string;
  /** Qué hace, en una línea, para que ARGOS lo explique antes de aplicarlo. */
  explicacion: string;
  riesgo: RiesgoAjuste;
  /** Forma del valor que acepta. */
  tipo: 'booleano' | 'opcion';
  /** Valores válidos cuando el tipo es 'opcion'. */
  opciones?: readonly string[];
  /** Frases con las que el usuario lo pide. */
  alias: readonly string[];
  /** Pantalla donde el usuario puede verlo y cambiarlo a mano. */
  pantalla: string;
}

/**
 * El catálogo. Cada entrada corresponde a un escritor que ya existe y que ya es
 * reversible; ARGOS no inventa capacidades nuevas, expone las que hay.
 */
export const AJUSTES_ARGOS: readonly AjusteArgos[] = [
  {
    clave: 'tema',
    etiqueta: 'Tema de la app',
    explicacion: 'Cambia entre claro, oscuro, adaptativo o el del sistema.',
    riesgo: 'confirmar',
    tipo: 'opcion',
    opciones: ['claro', 'oscuro', 'adaptativo', 'sistema'],
    alias: ['tema', 'modo oscuro', 'modo claro', 'apariencia', 'color de la app'],
    pantalla: '/settings/experiencia',
  },
  {
    clave: 'salud_modo_denso',
    etiqueta: 'Modo completo de Salud',
    explicacion: 'Muestra todas las secciones de Salud en vez del resumen corto.',
    riesgo: 'directo',
    tipo: 'booleano',
    alias: ['modo denso', 'modo completo de salud', 'ver todo en salud'],
    pantalla: '/settings/salud',
  },
  {
    clave: 'velo_nocturno',
    etiqueta: 'Velo nocturno',
    explicacion: 'Entibia los colores de la app en la noche.',
    riesgo: 'directo',
    tipo: 'booleano',
    alias: ['velo nocturno', 'velo de noche'],
    pantalla: '/settings/experiencia',
  },
  {
    clave: 'sonidos',
    etiqueta: 'Sonidos',
    explicacion: 'Enciende o apaga los sonidos de la app.',
    riesgo: 'directo',
    tipo: 'booleano',
    alias: ['sonidos', 'sonido', 'audio de la app'],
    pantalla: '/settings/experiencia',
  },
  {
    clave: 'vibracion',
    etiqueta: 'Vibración',
    explicacion: 'Enciende o apaga la vibración al tocar.',
    riesgo: 'directo',
    tipo: 'booleano',
    alias: ['vibracion', 'haptics', 'que vibre'],
    pantalla: '/settings/experiencia',
  },
  {
    clave: 'mantener_pantalla_encendida',
    etiqueta: 'Mantener la pantalla encendida',
    explicacion: 'Evita que la pantalla se apague durante un entrenamiento.',
    riesgo: 'directo',
    tipo: 'booleano',
    alias: ['mantener pantalla encendida', 'que no se apague la pantalla'],
    pantalla: '/settings/experiencia',
  },
  {
    clave: 'habito_estado',
    etiqueta: 'Estado de un hábito',
    explicacion: 'Pone un hábito en activo, graduado o en reposo. No borra nada de tu historial.',
    riesgo: 'confirmar',
    tipo: 'opcion',
    opciones: ['activo', 'graduado', 'reposo'],
    alias: ['activar habito', 'poner en reposo', 'graduar habito', 'quitar del dia'],
    pantalla: '/ordenar-dia',
  },
  {
    clave: 'nutricion_modo',
    etiqueta: 'Modo de Nutrición',
    explicacion: 'Cambia entre el registro simple y el completo con macros.',
    riesgo: 'confirmar',
    tipo: 'opcion',
    opciones: ['simple', 'completo'],
    alias: ['modo de nutricion', 'modo simple', 'ver macros'],
    pantalla: '/settings/salud',
  },
  {
    clave: 'insights_nutricion',
    etiqueta: 'Comentarios de ARGOS al comer',
    explicacion: 'ARGOS comenta tus comidas al registrarlas. Cada comentario consume protones.',
    riesgo: 'confirmar',
    tipo: 'booleano',
    alias: ['insights de comida', 'comentarios al comer', 'que argos opine de mi comida'],
    pantalla: '/settings/salud',
  },
];

const PORCLAVE = new Map(AJUSTES_ARGOS.map((a) => [a.clave, a]));

export function buscarAjuste(clave: string): AjusteArgos | undefined {
  return PORCLAVE.get(clave);
}

/** ¿ARGOS puede tocar este ajuste? Lista blanca: lo que no está, no se toca. */
export function ajusteOperable(clave: string): boolean {
  return PORCLAVE.has(clave);
}

export type PlanAjuste =
  /** Se puede aplicar tal cual. */
  | { tipo: 'aplicar'; ajuste: AjusteArgos; valor: string | boolean }
  /** Hay que preguntarle al usuario antes. */
  | { tipo: 'confirmar'; ajuste: AjusteArgos; valor: string | boolean; pregunta: string }
  /** No se puede: no existe, no es operable, o el valor es inválido. */
  | { tipo: 'rechazado'; motivo: string };

/**
 * Decide qué hacer con una petición de cambio de ajuste.
 *
 * Es la única puerta: el servicio que escribe de verdad debe pasar por aquí. Si
 * alguien llama al escritor directo, se salta el veto y la confirmación, que son
 * justo lo que separa "ARGOS te configura la app" de "ARGOS te movió algo que no
 * pediste".
 */
export function planearAjuste(clave: string, valor: unknown): PlanAjuste {
  const ajuste = PORCLAVE.get(clave);
  if (!ajuste) {
    return { tipo: 'rechazado', motivo: `ARGOS no puede cambiar "${clave}" por ti.` };
  }

  if (ajuste.tipo === 'booleano') {
    if (typeof valor !== 'boolean') {
      return { tipo: 'rechazado', motivo: `"${ajuste.etiqueta}" se enciende o se apaga.` };
    }
  } else {
    if (typeof valor !== 'string' || !ajuste.opciones?.includes(valor)) {
      const lista = (ajuste.opciones ?? []).join(', ');
      return { tipo: 'rechazado', motivo: `"${ajuste.etiqueta}" solo acepta: ${lista}.` };
    }
  }

  const v = valor as string | boolean;
  if (ajuste.riesgo === 'confirmar') {
    return {
      tipo: 'confirmar',
      ajuste,
      valor: v,
      pregunta: construirPregunta(ajuste, v),
    };
  }
  return { tipo: 'aplicar', ajuste, valor: v };
}

/** Copy de confirmación. es-MX, sin em dash, sin jerga. */
export function construirPregunta(ajuste: AjusteArgos, valor: string | boolean): string {
  const destino = typeof valor === 'boolean' ? (valor ? 'encender' : 'apagar') : `cambiar a "${valor}"`;
  return `¿Quieres que ${destino} ${ajuste.etiqueta.toLowerCase()}? ${ajuste.explicacion}`;
}

/**
 * Encender un hábito tiene un contrato que no es obvio: si estaba en reposo o
 * graduado, activarlo en las preferencias NO basta, hay que reactivar su estado
 * o la card nunca aparece y el usuario ve un toggle que no hace nada.
 *
 * Esta función existe para que ese contrato viaje junto al catálogo y no se
 * pierda: quien implemente el escritor tiene que consultarlo.
 */
export function requiereReactivarHabito(clave: string, valor: string | boolean): boolean {
  if (clave !== 'habito_estado') return false;
  return valor === 'activo';
}
