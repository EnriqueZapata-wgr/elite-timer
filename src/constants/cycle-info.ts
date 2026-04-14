/**
 * Textos explicativos para cada concepto del ciclo menstrual.
 * Usados por InfoButton para dar contexto al usuario.
 */

export const CYCLE_INFO = {
  phases: {
    menstrual: {
      title: 'Fase menstrual',
      text: 'Días 1-5 del ciclo. Tu cuerpo elimina el revestimiento uterino. Es normal sentir fatiga, cólicos y menor energía. Ideal para descanso activo, yoga suave y alimentos ricos en hierro.',
    },
    follicular: {
      title: 'Fase folicular',
      text: 'Días 6-13. Los estrógenos suben y te sientes con más energía. Buen momento para entrenamientos intensos, proyectos nuevos y socializar. Tu metabolismo es más eficiente.',
    },
    ovulation: {
      title: 'Ovulación',
      text: 'Días 13-15. Pico de estrógenos y LH. Máxima energía, libido y capacidad verbal. Mejor momento para entrenamientos de fuerza máxima.',
    },
    luteal: {
      title: 'Fase lútea',
      text: 'Días 16-28. La progesterona sube. La energía desciende gradualmente. Pueden aparecer síntomas premenstruales. Enfócate en cardio suave, flexibilidad y alimentación antiinflamatoria.',
    },
  },
  fertileWindow: {
    title: 'Ventana fértil',
    text: 'Los 5-6 días alrededor de la ovulación donde es más probable concebir. Incluye los 3-4 días antes de ovular (los espermatozoides sobreviven hasta 5 días) y 1-2 días después.',
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
