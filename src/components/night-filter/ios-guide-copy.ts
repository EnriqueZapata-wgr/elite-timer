/**
 * MB-30B Pieza 1 — copy de la guía iOS del filtro nocturno. DATOS PUROS
 * (testeable en node): el barrido de honestidad (night-filter.test.ts) lee
 * este archivo y truena si el copy insinúa que ATP controla la pantalla.
 *
 * 🚨 DOCTRINA (brief MB-30B): ninguna app puede dibujar encima de otras en
 * iOS. ATP NO controla, NO activa, NO ajusta la pantalla del sistema. Lo que
 * hace la guía es enseñarte a dejar configurado UN Atajo del sistema una
 * sola vez; desde entonces lo ejecuta tu iPhone, no ATP. Cualquier frase
 * nueva aquí tiene que sobrevivir ese barrido.
 */

export const IOS_GUIDE_INTRO = {
  title: 'En iPhone lo hace el sistema',
  body:
    'Apple no permite que una app dibuje un filtro encima de otras. ' +
    'Lo que sí existe: los Atajos del sistema pueden encender los filtros ' +
    'de color a una hora programada, todos los días. Aquí te guiamos para ' +
    'dejarlo configurado una sola vez — desde entonces lo ejecuta tu ' +
    'iPhone solo, sin que ATP intervenga.',
};

export interface IosGuideStep {
  title: string;
  body: string;
}

export const IOS_GUIDE_STEPS: IosGuideStep[] = [
  {
    title: 'Abre la app Atajos',
    body: 'Viene instalada en tu iPhone. Si la borraste, está gratis en el App Store.',
  },
  {
    title: 'Crea la automatización de la noche',
    body:
      'Pestaña Automatización → botón + → "Hora del día". Elige tu hora de ' +
      'corte de pantallas, repetición Diariamente, y "Ejecutar inmediatamente" ' +
      'para que no te pregunte cada noche.',
  },
  {
    title: 'Agrega la acción de filtros de color',
    body:
      'En la automatización, busca la acción "Ajustar filtros de color" y ' +
      'déjala en Activar. Es el mismo filtro cálido de Accesibilidad, ahora ' +
      'con horario.',
  },
  {
    title: 'Crea la automatización de la mañana',
    body:
      'Repite el paso 2 con tu hora de despertar y la misma acción en ' +
      'Desactivar. Sin esto, el filtro amanece contigo.',
  },
  {
    title: 'Complemento: Night Shift',
    body:
      'En Ajustes → Pantalla y brillo → Night Shift puedes programar el tono ' +
      'cálido nativo de atardecer a amanecer. Suma, no sustituye.',
  },
];

export const IOS_GUIDE_FOOTER =
  'ATP no toca la pantalla de tu iPhone: te ayuda a configurarlo una vez y ' +
  'el sistema se encarga desde entonces.';
