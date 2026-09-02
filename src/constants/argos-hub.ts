/**
 * ARGOS Hub — el catálogo de la pestaña (HUB-ARGOS, 31-ago-2026).
 *
 * Pedido textual del dueño: "que ARGOS sea un hub completo, no nada más un
 * chat, y que tenga para que te explique, que te enseñe, que te lleve".
 *
 * Cada fila dice en UNA línea qué hace, y esa línea es verificable en el
 * código que se cita en el comentario de cada entrada. Aquí no hay promesas:
 * si una capacidad no existe, no hay fila. Datos puros (cero React) para que
 * el test de rutas pueda recorrerlas.
 *
 * Contrato del chat (argos-contexto-core): `/argos-chat?contexto=<clave>`.
 */
import type { AppIconName } from '@/src/components/ui/app-icon-names';

export type IconoHub =
  | { tipo: 'app'; nombre: AppIconName }
  | { tipo: 'ion'; nombre: string };

export interface DestinoHub {
  pathname: string;
  params?: Record<string, string>;
}

export interface FilaHub {
  key: string;
  titulo: string;
  /** Una línea, honesta. Sin em dashes. */
  linea: string;
  icono: IconoHub;
  destino: DestinoHub;
  /** 'nueva' rota la sesión antes de navegar (mismo camino que "nueva" del panel). */
  nueva?: boolean;
}

export interface SeccionHub {
  key: 'hablar' | 'explicar' | 'ensenar' | 'llevar' | 'voz';
  titulo: string;
  filas: FilaHub[];
}

export const SECCIONES_HUB: SeccionHub[] = [
  {
    key: 'hablar',
    titulo: 'HABLAR',
    filas: [
      // app/argos-chat.tsx: el chat de siempre. Con push, la flecha regresa aquí.
      {
        key: 'chat',
        titulo: 'Abrir el chat',
        linea: 'Retoma la conversación de esta sesión o arranca desde tus sugerencias del día.',
        icono: { tipo: 'ion', nombre: 'chatbubble-ellipses-outline' },
        destino: { pathname: '/argos-chat' },
      },
      // argos-nav.ts openArgosChat({startNew}): rota la sesión y abre en blanco.
      {
        key: 'nueva',
        titulo: 'Nueva conversación',
        linea: 'Empieza en blanco. La anterior se queda en tu historial.',
        icono: { tipo: 'ion', nombre: 'add-circle-outline' },
        destino: { pathname: '/argos-chat', params: { new: '1' } },
        nueva: true,
      },
    ],
  },
  {
    key: 'explicar',
    titulo: 'QUE TE EXPLIQUE',
    filas: [
      // El bloque de Edad ATP ya viaja en el contexto (argos-service, edad-atp).
      {
        key: 'edad_atp',
        titulo: 'Mi Edad ATP',
        linea: 'Qué significa tu número y qué área lo está moviendo.',
        icono: { tipo: 'app', nombre: 'edad-atp' },
        destino: { pathname: '/argos-chat', params: { contexto: 'edad_atp' } },
      },
      // El expediente de labs viaja completo (argos-labs-core).
      {
        key: 'labs',
        titulo: 'Mi último laboratorio',
        linea: 'Qué salió dentro de rango y qué conviene preguntarle a tu médico.',
        icono: { tipo: 'app', nombre: 'labs' },
        destino: { pathname: '/argos-chat', params: { contexto: 'labs' } },
      },
      // Concepto de la app, con tus hábitos de hoy como ejemplo (13.2).
      {
        key: 'electrones',
        titulo: 'Qué es un electrón',
        linea: 'La unidad del día en ATP, con tus hábitos de hoy como ejemplo.',
        icono: { tipo: 'ion', nombre: 'help-circle-outline' },
        destino: { pathname: '/argos-chat', params: { contexto: 'electrones' } },
      },
    ],
  },
  {
    key: 'ensenar',
    titulo: 'QUE TE ENSEÑE',
    filas: [
      // app/labs-guide.tsx: la guía completa in-app + PDF para compartir.
      {
        key: 'labs-guide',
        titulo: 'Guía de laboratorios',
        linea: 'Qué estudios pedir y por qué. Se puede mandar en PDF a tu médico.',
        icono: { tipo: 'app', nombre: 'labs' },
        destino: { pathname: '/labs-guide' },
      },
      // app/tutorial.tsx: las piezas del tutorial, repetibles, sobre la pantalla real.
      {
        key: 'tutorial',
        titulo: 'Tutorial de la app',
        linea: 'Las piezas del recorrido, para repetir la que quieras sobre su pantalla.',
        icono: { tipo: 'ion', nombre: 'school-outline' },
        destino: { pathname: '/tutorial' },
      },
      // app/protocol-explorer.tsx es alias de /salud/intervenciones (A-1, 20-ago).
      {
        key: 'protocolos',
        titulo: 'Protocolos e intervenciones',
        linea: 'Tu protocolo activo y las intervenciones sugeridas para ti.',
        icono: { tipo: 'app', nombre: 'protocolos' },
        destino: { pathname: '/salud/intervenciones' },
      },
    ],
  },
  {
    key: 'llevar',
    titulo: 'QUE LO HAGA POR TI',
    filas: [
      // src/components/nutrition/cocina/GeneradorArgos.tsx, dentro de la pestaña Recetas.
      {
        key: 'receta',
        titulo: 'Generar una receta',
        linea: 'En Cocina, pestaña Recetas, el botón "Generar receta con ARGOS".',
        icono: { tipo: 'app', nombre: 'recetas' },
        destino: { pathname: '/cocina', params: { tab: 'recetas' } },
      },
      // app/ordenar-dia.tsx: ARGOS propone con tu adherencia; tú aceptas o editas.
      {
        key: 'ordenar',
        titulo: 'Ordenar mi día',
        linea: 'Graduar, reposar o empezar de cero. ARGOS propone, tú decides. Nada se borra.',
        icono: { tipo: 'ion', nombre: 'color-wand-outline' },
        destino: { pathname: '/ordenar-dia' },
      },
      // argos-nav-intent-core: "llévame a X" se resuelve en el bundle, sin red.
      {
        key: 'llevame',
        titulo: 'Llévame a una pantalla',
        linea: 'Escribe a dónde quieres ir y te lleva. Funciona sin conexión.',
        icono: { tipo: 'ion', nombre: 'navigate-outline' },
        destino: { pathname: '/argos-chat', params: { q: 'Llévame a ' } },
      },
    ],
  },
  {
    key: 'voz',
    titulo: 'VOZ',
    filas: [
      // ArgosVoiceMode (modo voz full-screen); CB-6 pide consentimiento la primera vez.
      {
        key: 'voz',
        titulo: 'Hablar por voz',
        linea: 'Le hablas y te contesta en voz alta. La primera vez pide tu permiso.',
        icono: { tipo: 'ion', nombre: 'mic-outline' },
        destino: { pathname: '/argos-chat', params: { voz: '1' } },
      },
    ],
  },
];

/** Todas las rutas del hub, para el censo de rutas. */
export function rutasDelHub(): string[] {
  return SECCIONES_HUB.flatMap((s) => s.filas.map((f) => f.destino.pathname));
}
