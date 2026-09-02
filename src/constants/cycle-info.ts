/**
 * Textos explicativos para cada concepto del ciclo menstrual.
 * Usados por InfoButton para dar contexto al usuario.
 */

export const CYCLE_INFO = {
  // MB-7: copy BIDIRECCIONAL — folicular/ovulatoria empujan, lútea/menstrual
  // se ajustan (nunca "descanso"/limitación). El ciclo es una ventaja, no una lista de límites.
  // 31-ago-2026 (17.2): los rangos de días describen un ciclo de 28 con periodo
  // de 5 y salen de getPhase (cycle-phase-core): ovulatoria 12-14 (banda alta
  // de ventanaOvulatoria), lútea 15-28. Antes decían 6-13 / 13-15 / 16-28 y no
  // coincidían ni entre sí ni con la tarjeta. Em dashes fuera del copy (regla 2).
  phases: {
    menstrual: {
      title: 'Fase menstrual',
      text: 'En un ciclo de 28 días: del 1 al 5. Empieza tu ciclo nuevo. Tu cuerpo te da señales muy claras: es la fase para afinar, entrena con lo que tienes hoy (fuerza técnica, movilidad, hierro en el plato) y baja el ego, no la ambición.',
    },
    follicular: {
      title: 'Fase folicular',
      text: 'En un ciclo de 28 días: del 6 al 11. Los estrógenos suben: tu ventana de construir. El cuerpo responde mejor al estímulo. Mete los bloques duros, lo nuevo, la progresión. Metabolismo eficiente y energía en subida.',
    },
    ovulation: {
      title: 'Ovulación',
      text: 'En un ciclo de 28 días: del 12 al 14, los dos días previos a la ovulación estimada y el día mismo. Pico de estrógenos y LH: fuerza, potencia y confianza al máximo. Es LA ventana para ir por un récord. Aprovéchala.',
    },
    luteal: {
      title: 'Fase lútea',
      text: 'En un ciclo de 28 días: del 15 al 28. La progesterona toma el mando: fase de sostener y consolidar. Sigues fuerte, con otra marcha: ajusta el volumen si un día lo pide, no la intención. Los antojos son hormonales, no falta de carácter.',
    },
  },
  fertileWindow: {
    title: 'Ventana fértil',
    text: 'Los seis días en que es más probable concebir: los cinco previos a la ovulación estimada y el día mismo (los espermatozoides sobreviven hasta 5 días). El calendario marca con relleno los de mayor probabilidad y con punto hueco los de menor, y la banda se ensancha si tus ciclos varían. Es una estimación, no una confirmación de ovulación.',
  },
  temperature: {
    title: '¿Para qué registrar temperatura?',
    text: 'La temperatura basal sube ~0.3°C después de ovular por efecto de la progesterona. Registrarla diariamente permite confirmar ovulación y predecir mejor las fases del ciclo. Mide al despertar, antes de levantarte.',
  },
  flowLevel: {
    title: 'Nivel de flujo',
    text: 'Registrar la intensidad ayuda a identificar patrones y detectar cambios inusuales. Un flujo muy abundante o muy escaso consistentemente puede indicar desequilibrios hormonales.',
  },
  symptoms: {
    title: '¿Por qué registrar síntomas?',
    text: 'Los síntomas varían entre ciclos y personas. Registrarlos permite identificar patrones, anticipar días difíciles y ajustar tu protocolo de entrenamiento y nutrición según la fase.',
  },
  companion: {
    title: 'Modo compañero',
    text: 'Permite que tu pareja vea tu fase actual, nivel de energía y humor para entender mejor cómo te sientes. No comparte datos médicos detallados, solo un resumen empático con consejos de cómo apoyarte.',
  },
} as const;
